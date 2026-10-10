-- Optional batch endpoint; older apps continue using apply_tracker_change.
create function public.apply_tracker_changes(p_changes jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare owner uuid:=auth.uid(); item jsonb; v bigint; receipts jsonb:='[]'::jsonb;
begin
  if owner is null then raise exception 'Authentication required'; end if;
  if p_changes is null or jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes) not between 1 and 25 then
    raise exception 'Invalid sync batch';
  end if;
  if (select count(distinct value->>'id') from jsonb_array_elements(p_changes))<>jsonb_array_length(p_changes)
    or (select count(distinct (value->>'entity',value->>'key')) from jsonb_array_elements(p_changes))<>jsonb_array_length(p_changes) then
    raise exception 'Duplicate batch change';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('tracker-sync:'||owner::text,0));
  for item in select value from jsonb_array_elements(p_changes) loop
    if item->>'action' is null or item->>'action' not in ('upsert','delete') then raise exception 'Invalid change action'; end if;
    v:=public.apply_tracker_change(item->>'entity',item->>'key',item->'payload',item->>'action'='delete',(item->>'expectedVersion')::bigint,item->>'id');
    receipts:=receipts||jsonb_build_array(jsonb_build_object('changeId',item->>'id','entity',item->>'entity','key',item->>'key','version',v::text));
  end loop;
  -- Any error aborts every mutation and receipt in this transaction.
  return receipts;
end $$;
revoke all on function public.apply_tracker_changes(jsonb) from public,anon;
grant execute on function public.apply_tracker_changes(jsonb) to authenticated;
