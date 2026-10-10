-- Rollback-only transactional batch checks; do not use real journal IDs.
begin;
do $$
declare owner uuid:=gen_random_uuid(); result jsonb; head bigint; rejected boolean:=false;
begin
  insert into auth.users(id,email) values(owner,'batch-test-'||owner||'@example.invalid');
  perform set_config('request.jwt.claim.sub',owner::text,true);
  execute 'set local role authenticated';
  result:=public.apply_tracker_changes('[{"id":"one","entity":"water","key":"2026-10-09","action":"upsert","expectedVersion":0,"payload":{"date":"2026-10-09","waterMl":250}},{"id":"two","entity":"water","key":"2026-10-10","action":"upsert","expectedVersion":0,"payload":{"date":"2026-10-10","waterMl":500}}]');
  if jsonb_array_length(result)<>2 or result->0->>'version'<>'1' then raise exception 'Bad receipts'; end if;
  select revision into head from public.tracker_sync_heads where user_id=owner;
  -- Retry has the same receipts and does not advance the head.
  perform public.apply_tracker_changes('[{"id":"one","entity":"water","key":"2026-10-09","action":"upsert","expectedVersion":0,"payload":{"date":"2026-10-09","waterMl":250}},{"id":"two","entity":"water","key":"2026-10-10","action":"upsert","expectedVersion":0,"payload":{"date":"2026-10-10","waterMl":500}}]');
  if (select revision from public.tracker_sync_heads where user_id=owner)<>head then raise exception 'Replay advanced head'; end if;
  -- The first change is valid; a later conflict must roll it back too.
  begin
    perform public.apply_tracker_changes('[{"id":"new","entity":"water","key":"2026-10-08","action":"upsert","expectedVersion":0,"payload":{"date":"2026-10-08","waterMl":250}},{"id":"conflict","entity":"water","key":"2026-10-10","action":"upsert","expectedVersion":0,"payload":{"date":"2026-10-10","waterMl":750}}]');
  exception when raise_exception then
    if sqlerrm not like 'sync conflict:%' then raise; end if;
    rejected:=true;
  end;
  if not rejected then raise exception 'Conflict was accepted'; end if;
  if exists(select 1 from public.tracker_records where user_id=owner and record_key='2026-10-08')
    or exists(select 1 from public.tracker_mutations where user_id=owner and change_id='new')
    or (select revision from public.tracker_sync_heads where user_id=owner)<>head then raise exception 'Batch did not roll back atomically'; end if;
  if has_function_privilege('anon','public.apply_tracker_changes(jsonb)','execute') then raise exception 'Anonymous batch access'; end if;
  execute 'reset role';
end $$;
rollback;
select 'Batched sync database checks passed; test data rolled back.' as verification;
