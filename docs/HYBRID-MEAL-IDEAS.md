# Hybrid Meal Ideas

Implemented October 7, 2026. No new APK was built or published for this update.

## Everyday ideas

Opening Meal Ideas immediately shows breakfast, lunch, dinner and snack ideas, without a network request or account requirement. `src/data/mealRecipes.ts` contains 36 recipes and representative, manually maintained protein/carbohydrate/fat estimates per 100 g. Ingredient labels specify dry, cooked, drained or raw basis where applicable. These are starter estimates, not measured recipe nutrition or a live food database lookup.

`localMealPlanService.ts` filters explicit ingredient metadata for vegan, vegetarian and paleo recipes; keto recipes must keep carbohydrate energy within 10%. Mediterranean selection excludes paneer, and high-protein ranking weights protein matching more strongly. Intermittent fasting supplies meal ideas without prescribing a schedule. Allergies are not automatically checked; ingredients remain visible for review.

The planner ranks meals against calorie and macro targets, rotates among suitable candidates, and scales each base recipe only within 0.75–1.5. Weights are rounded to whole grams, macros recalculated, and calories estimated as 4P + 4C + 9F. Suggested totals are shown separately from daily targets, with explicit text for a calorie mismatch over 10%.

## Optional AI and saved plans

Personalize sends only nutrition targets and dietary preference, with the authenticated session, to the Supabase function. Opening, switching filters and choosing other everyday ideas never automatically request AI. Current ideas remain available on errors; requests support cancellation, timeout and stale-response protection. Rapid taps cannot start overlapping generation or meal saves.

Successful AI plans are validated for four distinct meals, ingredient quantities, dietary exclusions, finite nutrition, coherent energy and total calories within 10% of target. AI ingredient recognition is a text filter, not an allergy guarantee or a comprehensive ingredient ontology. AI results remain estimates.

The local cache separates account IDs and keys plans by recipe version, preference and calorie/protein/carbohydrate/fat targets. It keeps at most eight plans per account in a document bounded to 200,000 characters, expires at local midnight or 24 hours, ignores future/corrupt/inconsistent entries, and preserves plan IDs and timestamps. Guest accounts do not cache AI plans. Clearing journal data clears that account's cache; concurrent account changes cannot clear another account's records.

Review expands quantities and preparation instructions before the eaten-meal action. Local ideas retain manual provenance; fresh and cached AI ideas retain AI provenance. No plan is automatically logged.

## Deployment and verification

The `nutrition-analysis` Edge Function is deployed to project `vzsbjffwhjikeeanrzdb` with JWT verification enabled. Its own session check precedes quota reservation and Gemini calls. The existing quota RPC permits 30 requests per account per database day, shared across image, label, text and plan analysis. No database migration or new application dependency was needed.

- Live endpoint: OPTIONS 200; unauthenticated POST 401.
- 98 regression tests pass, including dietary filtering, bounded portions, cache isolation/expiry/corruption, concurrent writes/reset, cancellation, quota/configuration failures and no automatic retries.
- TypeScript, strict ESLint, Deno function checking, production web export and Android bundle export pass.
- Browser checks: instant guest ideas, preference changes, local variety, ingredient review, sign-in routing, and one saved manual meal after a rapid double-tap. Checked at 375×812 and 667×375, with reachable logging and a persistent Close control. Test logging used a separate local origin.
- A 2,000-run Node benchmark averaged approximately 0.06 ms per local plan on this Mac; this is not a phone performance measurement.

Live authenticated Gemini meal generation was verified on October 7, 2026:

- Supabase's custom-secrets list confirms `GEMINI_API_KEY` and `GEMINI_MODEL` exist; secret values were not revealed.
- A fresh balanced-plan request returned four meals and passed the application's nutrition and plan validation. The function log records POST 200 at `2026-10-07T09:46:12.972Z`.
- The app displayed **PERSONALIZED AI IDEAS** and **Saved on this device for today**. Ingredient review included quantities, preparation basis and instructions.
- After a full browser reload, the same four meals returned under **SAVED AI IDEAS · FROM TODAY**, without pressing Refresh.
- Switching to everyday ideas displayed local recipes immediately; closing and reopening restored the saved AI plan. The journal remained empty throughout verification; no test meal was logged.

This verifies the authenticated web flow for the balanced preference. Other dietary preferences, label and text analysis still require their own live checks. Photo analysis was subsequently verified; see [Photo to Meal](PHOTO-MEAL-ANALYSIS.md). Use a model supported by the Google project; never place a Gemini key in client environment variables or Git.

Native phone layout, maximum system font size and cold-launch branding must be checked on the next installed build. The existing released v1.1.5 binary is unchanged. Profile now reads its version from Expo configuration instead of a hard-coded older version.

## Performance choices

The recipe library is approximately 11 KB of source data and adds no images or UI packages. Planning is memoized by targets/preference/revision; a cache hit avoids a provider request. Cache documents and ingredient lists are bounded. There are no background AI requests or automatic retries. Shared plan validation is independent of the API client so local recipes and cache validation do not initialize it.

Preview: [Meal Ideas on a small phone](previews/hybrid-meal-ideas.png).
