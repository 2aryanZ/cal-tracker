# Performance optimization

## Stage 1: cloud merging, photos, scheduling

- Cloud overlays use maps keyed by meal ID and weight date, preserving tombstones and sorting once.
- Private photo links are signed in batches of 100, deduplicated across meals/favorites, and reused until five minutes before expiry. The memory cache holds at most 2,000 links and clears on account changes.
- Local edits debounce automatic sync for 1.5 seconds. Foreground polling runs at most every five minutes; failures back off from 30 seconds to five minutes. Manual sync remains immediate. Startup no longer pulls twice.
- Verification: 110 regression tests, TypeScript, strict ESLint, and production web export passed.

These are controlled service checks, not phone frame-rate measurements. A 150-photo test needs two signing calls initially and zero on the next refresh; previously each refresh signed each photo separately. Phone profiling should use an installed release build with representative journal histories.
