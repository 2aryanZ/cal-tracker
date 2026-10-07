# Launch branding and Meal Ideas review

Reviewed on October 7, 2026. The selected hybrid Meal Ideas route is now implemented; see [Hybrid Meal Ideas](HYBRID-MEAL-IDEAS.md) for behavior, deployment status and verification.

## Branding changes

The old launch image contained a solid green square, which was visibly clipped by Android's launch-screen mask. The replacement is a flat plate-and-leaf mark in the existing Tempo ink (`#152B30`) and lime (`#D1FA7A`) colors. The original vector is `assets/brand/mark.svg`.

- Launcher/iOS icon: square, opaque background; the operating system applies its own corners.
- Android foreground and monochrome layer: transparent, centered, inside the adaptive-icon safe circle.
- Splash: transparent mark on the configured ink background, at 160 dp.
- Notifications: separate white-on-transparent glyph.
- Favicon: matching small icon.

PNG exports are reproducible with `scripts/generate-brand-assets.cjs`. Sharp is an authoring tool, not an app dependency. When using an external installation, run `CAL_TRACKER_SHARP_MODULE=/absolute/path/to/sharp node scripts/generate-brand-assets.cjs`.

The icon search provided no verified matching catalog entry; this is an original SVG mark. Preview: `docs/previews/cal-tracker-brand.png`.

## Verification

- All 98 regression tests, TypeScript, strict ESLint, and production web export passed.
- Android prebuild succeeded in an isolated temporary directory.
- Exported alpha bounds and generated Android foreground/monochrome assets are centered and inside the adaptive safe circle. The generated native splash fits its safe circle.
- The main icon is opaque; splash/foreground are transparent; the notification glyph is white.
- The seven branding exports total approximately 130 KB, versus roughly 3 MB for the previous six files.

Native branding requires a new app binary; the published v1.1.5 APK still contains the old logo. Actual cold-launch appearance on a phone remains to be checked after rebuilding. See the [Expo splash-screen documentation](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/).

## Confirmed Meal Ideas failure

`MealPlanModal` calls `generateDailyMealPlan`, which sends `{ kind: 'plan', targets, preference }` through `requestNutrition` to the `nutrition-analysis` Edge Function. At the initial review, the configured Cal Tracker Supabase project was healthy but listed no deployed Edge Functions. An OPTIONS request to that endpoint returned HTTP 404 with `Requested function was not found`.

The previous client handled only an `error` field from failed responses. This gateway response uses `message`, so the user sees the generic nutrition-analysis fallback. That wording is also inappropriate for a meal-planning failure.

## Selected solution

The owner selected option 3: local ideas immediately, optional AI personalization, and account-separated caching. The implementation retains current suggestions when AI fails, uses meal-specific feedback, labels estimates, and logs only an individually confirmed eaten meal. The missing Edge Function has been deployed with JWT verification enabled. Server-secret names, live authenticated balanced-plan generation, and saved-plan restoration after a browser reload were verified on October 7, 2026; see [Hybrid Meal Ideas](HYBRID-MEAL-IDEAS.md) for evidence and remaining checks.
