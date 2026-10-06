# Cal Tracker

A calorie, meal, water and weight journal built with Expo SDK 57, React Native 0.86, React 19.2 and TypeScript. Guest data stays on the device; each authenticated Supabase account uses a separate local store.

## Run and verify

Use Node 24, then `npm ci`. Copy `.env.example` to `.env` and set the Supabase URL and publishable key. Run `npm start` or `npm run web`.

To test Google sign-in on a phone, install a development build with Cal Tracker's `caltracker` URL scheme. The Android `development` profile creates an installable APK; the iPhone `development-device` profile creates an internal build for registered devices and requires an Apple Developer team. Run `npx eas-cli@23.1.0 build --profile development --platform android` or register the iPhone with `npx eas-cli@23.1.0 device:create` and run `npx eas-cli@23.1.0 build --profile development-device --platform ios`. Install the resulting app from its EAS build page, then use `npx expo start --dev-client --lan` on the same Wi-Fi. Expo Go supports email/password but cannot complete the app-specific OAuth redirect.

```sh
npm test
npm run typecheck
npx eslint src --no-cache --max-warnings 0
npx expo export --platform web
deno check supabase/functions/nutrition-analysis/index.ts
```

The regression tests use isolated storage and mocked networks; they do not modify a hosted database. CI runs application checks and Deno type checking on pushes and pull requests. EAS CLI is invoked through the pinned `npx eas-cli@23.1.0` command rather than installed in the app. The Xcode UUID override remains; recheck it when upgrading the SDK.

## Tempo interface

Today, History, Progress and Profile implement the approved Tempo direction: Manrope type, off-white surfaces, deep ink cards and lime primary actions. Shared tokens live in `src/constants/theme.ts`; headers, the calorie dial and settings sheets live in `src/components/Tempo.tsx`. The three bundled font weights include their OFL license.

Individual Lucide imports avoid bundling the entire icon library. Journal totals use a date index, saved meal search renders in batches, and long weight charts retain endpoints and extrema while the complete weigh-in list stays available. No additional UI library is needed.

See `docs/TEMPO-IMPLEMENTATION.md` for verification results and the remaining device checks.

## Database setup

1. For a new project, run `supabase/schema.sql` in the Supabase SQL editor.
2. Run `supabase/migrations/202609290001_reliable_sync.sql`. It preserves the five original tables, backfills versioned records, adds owner-protected photo storage, validates writes, and uses versions and tombstones for syncing. SQL and policies are rerunnable.
3. Deploy `supabase/functions/nutrition-analysis/index.ts` as the `nutrition-analysis` Edge Function with JWT verification enabled. Set `GEMINI_API_KEY` and `GEMINI_MODEL` in function secrets. Choose a model your Google project actually supports. Never add a Gemini key to the mobile environment.
4. In Supabase Auth, enable the OAuth providers you intend to support and allow the exact native redirect `caltracker:///` (already configured on the current project). Add the production web URL when it exists. Native OAuth needs a development or production build with the registered scheme.
5. Test sign-in, confirmation emails, RLS isolation, conflict resolution, photo uploads and syncing with two real test accounts and two devices before release.

### Sign-in troubleshooting

- If every sign-in method reports an unreachable server, check that the Supabase project is active and that its Project URL matches `EXPO_PUBLIC_SUPABASE_URL` in `.env`. Restore a paused project from the Supabase dashboard, or update both the URL and publishable key for its replacement. Restart Expo after changing `.env`.
- Google and Apple OAuth need a development or production build. Use email/password in Expo Go; the configured Supabase project must still be available.
- “Invalid login credentials” means the server rejected the supplied credentials. Confirm the email when required; signing in does not create an account automatically.

If a Gemini key was previously included in an app bundle, revoke that key in Google Cloud and replace it with a server-only key. Removing it from source does not revoke already shipped credentials.

## Behavior and limits

- New installs start with empty logs and no invented streaks.
- One serialized local snapshot commits data and pending cloud changes together. Failed writes reject; network failures leave a durable retry queue. Guest records are never automatically imported into an account.
- Old `@cal_ai_*_v1` storage keys are retained for recovery. Identifiable demo meal IDs are excluded from the guest migration. Dates alone never identify records as test data.
- Auth requires a real session. Email signup requiring confirmation stays signed out. Google and Apple use provider OAuth.
- Image, label, text and plan analysis requires the configured server function and a signed-in account. Service errors do not return fabricated nutrition. Results remain estimates for the user to review.
- Barcode lookup supports five local product examples and Open Food Facts. Unknown products or incomplete nutrition return no result. All nutrient values use one serving basis.
- The manual search contains 13 example meals with approximate nutrition, not a comprehensive food database. Ingredient notes do not automatically compute macro totals.
- Meal ideas are logged individually after eating. There is no automatic full-plan consumption.
- Weight and calorie statistics use recorded history. Days without meal logs count as zero in period averages.
- Reminders schedule the next seven days when the app is opened or settings/logs change. Already logged meals are skipped for today. Permission denial is reported.
- JSON backup downloads on web and shares JSON text on native. Clearing records is an explicit UI action; signed-in deletes stay queued until cloud acknowledgement.
- Community groups and health integrations are unavailable in this build; simulated members, rankings and health-sync success are not shown.
- The app uses the Everyday food journal design: warm paper, olive accents, serif headings and four tabs (Today, History, Progress, Profile). Recent meals and favorites lead the add-food flow; estimates are labeled for review. Weight history uses a virtualized list. Store submission requires real Apple/Google account configuration; placeholder submission credentials have been removed.

The database migration is deployed to the configured Supabase project. The Edge Function still needs deployment and its server-side Gemini secret before food analysis can be verified end to end.
