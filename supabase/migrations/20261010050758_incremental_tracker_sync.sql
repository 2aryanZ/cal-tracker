-- Commit-ordered account revisions. Keep legacy tables and the existing write RPC.
create schema if not exists private;
create table if not exists public.tracker_sync_heads (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check(revision >= 0)
);
alter table public.tracker_sync_heads enable row level security;
create policy "Read own sync head" on public.tracker_sync_heads for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.tracker_sync_heads from public, anon, authenticated;
grant select on public.tracker_sync_heads to authenticated;
alter table public.tracker_records add column sync_revision bigint not null default 0;

create function private.assign_tracker_revision() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('tracker-sync:'||new.user_id::text,0));
  insert into public.tracker_sync_heads(user_id,revision) values(new.user_id,1)
  on conflict(user_id) do update set revision=public.tracker_sync_heads.revision+1
  returning revision into new.sync_revision;
  return new;
end $$;
revoke all on function private.assign_tracker_revision() from public, anon, authenticated;
create trigger tracker_revision before insert or update on public.tracker_records
  for each row execute function private.assign_tracker_revision();
-- Missing legacy rows are imported once; versioned values and tombstones win.
-- Backfill without altering or deleting old records. Existing versioned records win.
insert into public.tracker_records(user_id,entity,record_key,payload)
select user_id,'food',id,jsonb_build_object('id',id,'name',name,'mealType',meal_type,'calories',calories,'protein',protein,'carbs',carbs,'fats',fats,'portionSize',portion_size,'date',date_str,'timestamp',created_at,'imageUri',case when image_uri like 'https://%' then image_uri else null end,'isAiGenerated',false)
from public.food_entries where user_id is not null on conflict do nothing;
insert into public.tracker_records(user_id,entity,record_key,payload)
select distinct on (user_id,date_str) user_id,'weight',date_str,jsonb_build_object('id',id,'weightKg',weight,'weightLbs',round(weight*2.20462,1),'date',date_str,'timestamp',created_at)
from public.weight_logs where user_id is not null order by user_id,date_str,created_at desc,id desc on conflict do nothing;
insert into public.tracker_records(user_id,entity,record_key,payload)
select user_id,'water',date_str,jsonb_build_object('date',date_str,'waterMl',water_ml) from public.water_logs where user_id is not null on conflict do nothing;
insert into public.tracker_records(user_id,entity,record_key,payload)
select user_id,'goals','singleton',jsonb_build_object('calories',calories,'protein',protein,'carbs',carbs,'fats',fats,'waterMl',water_ml) from public.macro_targets on conflict do nothing;
insert into public.tracker_records(user_id,entity,record_key,payload)
select id,'profile','singleton',jsonb_build_object('gender',gender,'age',age,'heightCm',height_cm,'weightKg',weight_kg,'targetWeightKg',target_weight_kg,'activityLevel',activity_level,'goal',case when goal='maintain' then 'maintenance' else goal end,'dailySteps',8500,'unitSystem','metric') from public.user_profiles on conflict do nothing;


update public.tracker_records set sync_revision=0 where sync_revision=0;
create unique index tracker_owner_revision_idx on public.tracker_records(user_id,sync_revision);

create or replace function public.apply_tracker_change(p_entity text,p_key text,p_payload jsonb,p_deleted boolean,p_expected_version bigint,p_change_id text)
returns bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare owner uuid:=auth.uid(); existing_version bigint; next_version bigint; acknowledged bigint; metric text;
begin
  if owner is null then raise exception 'Authentication required'; end if;
  if p_expected_version is null or p_expected_version<0 or p_deleted is null then raise exception 'Invalid revision'; end if;
  if p_entity is null or p_key is null or p_change_id is null or p_entity not in ('food','weight','water','goals','profile','preferences') or length(p_key) not between 1 and 200 or length(p_change_id) not between 1 and 200 then raise exception 'Invalid record'; end if;
  if p_entity in ('goals','profile','preferences') and p_key<>'singleton' then raise exception 'Invalid singleton key'; end if;
  if p_deleted and p_entity not in ('food','weight') then raise exception 'Invalid deletion'; end if;
  -- Serialize an account before any record lock; revisions commit in order.
  perform pg_advisory_xact_lock(hashtextextended('tracker-sync:'||owner::text,0));
  -- A lock serializes creation too, when no row yet exists.
  perform pg_advisory_xact_lock(hashtextextended(owner::text||':'||p_entity||':'||p_key,0));
  select version into acknowledged from public.tracker_mutations where user_id=owner and change_id=p_change_id;
  if found then return acknowledged; end if;
  select version into existing_version from public.tracker_records where user_id=owner and entity=p_entity and record_key=p_key for update;
  if coalesce(existing_version,0)<>p_expected_version then raise exception 'sync conflict: record changed on another device'; end if;
  if not p_deleted then
    if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid payload'; end if;
    if p_entity in ('food','goals') then
      foreach metric in array array['calories','protein','carbs','fats'] loop
        if jsonb_typeof(p_payload->metric)<>'number' or p_payload->metric is null or (p_payload->>metric)::numeric<0 or (p_payload->>metric)::numeric>(case when metric='calories' then 10000 else 2000 end) then raise exception 'Invalid nutrition value'; end if;
      end loop;
      if p_entity='food' and (p_payload->>'id' is distinct from p_key or coalesce(length(trim(p_payload->>'name')),0)=0 or coalesce(p_payload->>'mealType','') not in ('breakfast','lunch','dinner','snack')) then raise exception 'Invalid meal'; end if;
      if p_entity='goals' and (jsonb_typeof(p_payload->'waterMl') is distinct from 'number' or (p_payload->>'calories')::numeric<=0 or (p_payload->>'waterMl')::numeric<=0 or (p_payload->>'waterMl')::numeric>20000) then raise exception 'Invalid target'; end if;
      if p_entity='goals' and ((p_payload->>'protein')::numeric*4+(p_payload->>'carbs')::numeric*4+(p_payload->>'fats')::numeric*9)>(p_payload->>'calories')::numeric*1.2 then raise exception 'Invalid target energy'; end if;
    end if;
    if p_entity in ('food','weight','water') then
      if coalesce(p_payload->>'date','')!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date'; end if;
      perform (p_payload->>'date')::date;
      if p_entity in ('weight','water') and p_payload->>'date' is distinct from p_key then raise exception 'Invalid date key'; end if;
    end if;
    if p_entity='weight' and (jsonb_typeof(p_payload->'weightKg') is distinct from 'number' or (p_payload->>'weightKg')::numeric not between 30 and 400) then raise exception 'Invalid weight'; end if;
    if p_entity='water' and (jsonb_typeof(p_payload->'waterMl') is distinct from 'number' or (p_payload->>'waterMl')::numeric not between 0 and 20000) then raise exception 'Invalid water'; end if;
    if p_entity='profile' and (jsonb_typeof(p_payload->'age') is distinct from 'number' or (p_payload->>'age')::numeric not between 18 and 120 or jsonb_typeof(p_payload->'heightCm') is distinct from 'number' or (p_payload->>'heightCm')::numeric not between 100 and 250 or jsonb_typeof(p_payload->'weightKg') is distinct from 'number' or (p_payload->>'weightKg')::numeric not between 30 and 400 or jsonb_typeof(p_payload->'targetWeightKg') is distinct from 'number' or (p_payload->>'targetWeightKg')::numeric not between 30 and 400) then raise exception 'Invalid profile'; end if;
    if p_entity='profile' and (jsonb_typeof(p_payload->'dailySteps') is distinct from 'number' or (p_payload->>'dailySteps')::numeric not between 0 and 100000 or coalesce(p_payload->>'gender','') not in ('male','female') or coalesce(p_payload->>'activityLevel','') not in ('sedentary','light','moderate','very_active') or coalesce(p_payload->>'goal','') not in ('fat_loss','muscle_gain','maintenance','recomposition') or coalesce(p_payload->>'unitSystem','') not in ('metric','imperial')) then raise exception 'Invalid profile options'; end if;
    if p_entity='preferences' and (jsonb_typeof(p_payload->'favorites') is distinct from 'array' or coalesce(p_payload->>'preference','') not in ('balanced','high_protein','keto','vegan','vegetarian','mediterranean','paleo','intermittent_fasting')) then raise exception 'Invalid preferences'; end if;
    if p_payload->>'imageUri' is not null and p_payload->>'imageUri' !~ '^https://' then raise exception 'Device photo URI cannot be synced'; end if;
    if p_payload->>'imagePath' is not null and split_part(p_payload->>'imagePath','/',1)<>owner::text then raise exception 'Photo belongs to another owner'; end if;
  end if;
  next_version:=coalesce(existing_version,0)+1;
  insert into public.tracker_records(user_id,entity,record_key,payload,deleted,version) values(owner,p_entity,p_key,p_payload,p_deleted,next_version)
  on conflict(user_id,entity,record_key) do update set payload=excluded.payload,deleted=excluded.deleted,version=excluded.version,updated_at=now();
  insert into public.tracker_mutations(user_id,change_id,version) values(owner,p_change_id,next_version);
  return next_version;
end $$;
revoke all on function public.apply_tracker_change(text,text,jsonb,boolean,bigint,text) from public;
revoke all on function public.apply_tracker_change(text,text,jsonb,boolean,bigint,text) from anon;
grant execute on function public.apply_tracker_change(text,text,jsonb,boolean,bigint,text) to authenticated;


-- Keyset reads use a fixed upper revision for the complete paginated pull.
-- If a row moves beyond that boundary during paging, the following pull gets it.
create function public.fetch_tracker_delta(p_after bigint default 0, p_until bigint default null, p_limit integer default 500)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare owner uuid:=auth.uid(); head bigint; boundary bigint; result jsonb;
begin
  if owner is null then raise exception 'Authentication required'; end if;
  select coalesce(revision,0) into head from public.tracker_sync_heads where user_id=owner;
  head:=coalesce(head,0);
  boundary:=coalesce(p_until,head);
  if p_after is null or p_after<0 or boundary<p_after or boundary>head or p_limit is null or p_limit not between 1 and 500 then
    raise exception 'Invalid sync cursor';
  end if;
  with candidates as materialized (
    select entity,record_key,payload,deleted,version,sync_revision from public.tracker_records
    where user_id=owner and sync_revision>p_after and sync_revision<=boundary
    order by sync_revision limit p_limit+1
  ), page as (select * from candidates order by sync_revision limit p_limit)
  select jsonb_build_object(
    'until',boundary::text,
    'records',coalesce((select jsonb_agg(to_jsonb(page) order by sync_revision) from page),'[]'::jsonb),
    'next',case when (select count(*) from candidates)>p_limit then (select max(sync_revision)::text from page) else null end
  ) into result;
  return result;
end $$;
revoke all on function public.fetch_tracker_delta(bigint,bigint,integer) from public,anon;
grant execute on function public.fetch_tracker_delta(bigint,bigint,integer) to authenticated;
