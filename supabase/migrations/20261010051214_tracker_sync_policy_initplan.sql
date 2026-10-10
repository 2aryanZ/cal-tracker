-- Evaluate the authenticated owner once per query on the active sync tables.
alter policy "Read own tracker records" on public.tracker_records using ((select auth.uid())=user_id);
alter policy "Read own mutation acknowledgements" on public.tracker_mutations using ((select auth.uid())=user_id);
