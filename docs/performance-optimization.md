# Performance optimization

## Stage 1: cloud merging, photos, scheduling

- Cloud overlays use maps keyed by meal ID and weight date, preserving tombstones and sorting once.
- Private photo links are signed in batches of 100, deduplicated across meals/favorites, and reused until five minutes before expiry. The memory cache holds at most 2,000 links and clears on account changes.
- Local edits debounce automatic sync for 1.5 seconds. Foreground polling runs at most every five minutes; failures back off from 30 seconds to five minutes. Manual sync remains immediate. Startup no longer pulls twice.
- Verification: 110 regression tests, TypeScript, strict ESLint, and production web export passed.

These are controlled service checks, not phone frame-rate measurements. A 150-photo test needs two signing calls initially and zero on the next refresh; previously each refresh signed each photo separately. Phone profiling should use an installed release build with representative journal histories.

## Stage 2: incremental cloud sync

- Deployed `incremental_tracker_sync` and `tracker_sync_policy_initplan` to the hosted project. `tracker_records` is canonical after a non-destructive legacy backfill.
- The write RPC and trigger serialize revisions per account. Keyset pages carry a fixed upper boundary; changed rows that move beyond it arrive on the next pull. Tombstones remain readable indefinitely.
- Local data, revisions, cursor, and pending edits still commit as one document. A failed page or disk write leaves the cursor unchanged. Empty polls perform no local write. Missing RPC deployments fall back to the legacy reader.
- Unchanged private photos still renew before their signed links expire, without queueing another upload.
- Controlled check: each unchanged sync uses one delta RPC and zero legacy table reads, compared with at least six reads previously.
- Verification: 116 tests, type checking, strict lint, web export, and the rollback-only database checks in `supabase/tests/incremental_sync.sql` passed. Those checks cover pagination, deletion, replayed receipts, transaction rollback, account isolation, and anonymous access.
- Advisors: active sync policies now evaluate the owner once. Remaining notices concern existing legacy policies, intentionally privileged authenticated write/quota RPCs, the pre-existing RLS auto-enable event trigger, and Auth password protection. No tables, users, or historical data were removed.

## Stage 3: local reads and state stability

- Cache only the latest account snapshot. Published snapshots are immutable; mutations work on drafts and publish after the atomic disk write succeeds. Repeated reads no longer parse the complete document.
- Preserve unchanged meal, weight, and favorite arrays. Water-only deltas skip meal/weight indexing and sorting. No-op badge/celebration updates skip writes.
- Feedback has its own context and component; the navigator no longer subscribes to toast or reward state. Retain the existing nutrition API for journal screens and Expo's React Compiler rather than scattering speculative memoization.
- `npm run benchmark:storage` measures synthetic JavaScript work with an in-memory disk: median water save/refresh was 0.708 ms at 1,000 meals, 3.057 ms at 5,000, and 6.465 ms at 10,000. All warm reads made zero disk calls and retained the meal array. Actual native storage latency and phone render times are not included.
- Full-document writes remain: these sample documents were 234 KB, 1.17 MB, and 2.35 MB. A transactional store remains a future option for very large histories; do not infer that 10,000-meal native storage has been validated from this benchmark.
- Verification: 119 tests, type checking, strict lint, production export, and browser smoke checks for Today (water save and toast), History, Progress, and Profile. The production browser reported no console warnings or errors.
