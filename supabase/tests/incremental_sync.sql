-- Run as the database administrator. All test users and records roll back.
begin;
do $$
declare owner uuid:=gen_random_uuid(); other_owner uuid:=gen_random_uuid();
  before_cursor bigint; after_cursor bigint; result jsonb; first_page jsonb; v bigint; applied boolean:=false;
begin
  insert into auth.users(id,email) values(owner,'sync-test-'||owner||'@example.invalid'),(other_owner,'sync-test-'||other_owner||'@example.invalid');
  perform set_config('request.jwt.claim.sub',owner::text,true);
  execute 'set local role authenticated';
  v:=public.apply_tracker_change('food','test-meal','{"id":"test-meal","name":"Test rice","mealType":"lunch","date":"2026-10-10","timestamp":"2026-10-10T12:00:00Z","calories":100,"protein":0,"carbs":25,"fats":0}',false,0,'test-add');
  if v<>1 then raise exception 'Wrong initial version'; end if;
  perform public.apply_tracker_change('water','2026-10-10','{"date":"2026-10-10","waterMl":250}',false,0,'test-water');
  result:=public.fetch_tracker_delta(0,null,500);
  before_cursor:=(result->>'until')::bigint;
  if jsonb_array_length(result->'records')<>2 then raise exception 'Bootstrap missing records'; end if;
  first_page:=public.fetch_tracker_delta(0,null,1);
  if first_page->>'next' is null then raise exception 'Missing pagination cursor'; end if;
  result:=public.fetch_tracker_delta((first_page->>'next')::bigint,(first_page->>'until')::bigint,1);
  if jsonb_array_length(result->'records')<>1 or result->>'next' is not null then raise exception 'Bad second page'; end if;
  -- Replayed receipts must not allocate a fresh revision.
  perform public.apply_tracker_change('food','test-meal',null,true,0,'test-add');
  result:=public.fetch_tracker_delta(before_cursor,null,500);
  if jsonb_array_length(result->'records')<>0 or (result->>'until')::bigint<>before_cursor then raise exception 'Idempotent replay changed revision'; end if;
  perform public.apply_tracker_change('food','test-meal',null,true,1,'test-delete');
  result:=public.fetch_tracker_delta(before_cursor,null,500);
  after_cursor:=(result->>'until')::bigint;
  if jsonb_array_length(result->'records')<>1 or result->'records'->0->>'deleted'<>'true' then raise exception 'Deletion missing'; end if;
  -- A failed transaction rolls the head back along with the record.
  begin
    perform public.apply_tracker_change('water','2026-10-10','{"date":"2026-10-10","waterMl":500}',false,1,'test-abort');
    applied:=true;
    raise exception 'Intentional rollback';
  exception when raise_exception then null;
  end;
  if not applied then raise exception 'Rollback test failed before writing'; end if;
  result:=public.fetch_tracker_delta(after_cursor,null,500);
  if jsonb_array_length(result->'records')<>0 or (result->>'until')::bigint<>after_cursor then raise exception 'Failed transaction advanced cursor'; end if;
  perform set_config('request.jwt.claim.sub',other_owner::text,true);
  result:=public.fetch_tracker_delta(0,null,500);
  if jsonb_array_length(result->'records')<>0 or result->>'until'<>'0' then raise exception 'Other account leaked'; end if;
  if has_function_privilege('anon','public.fetch_tracker_delta(bigint,bigint,integer)','execute') then raise exception 'Anonymous delta access'; end if;
  execute 'reset role';
end $$;
rollback;
select 'Incremental sync database checks passed; test data rolled back.' as verification;
