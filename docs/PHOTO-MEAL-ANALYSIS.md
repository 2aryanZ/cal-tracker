# Photo to Meal

Implemented October 7, 2026. No APK was built or published for this update.

## User flow

Today’s camera button opens **Photo to meal**. Signed-in users can take a meal photo or choose one from the system image picker. AI opens **Add a meal** with the food name, portion, calories, protein, carbohydrates, fat, attached photo and ingredient notes filled in. All fields remain editable; nothing is logged until the user taps **Save meal**. Breakfast/lunch/dinner/snack can be changed before saving.

Nutrition applies to the whole pictured portion. It is an estimate: size, cooking oil and hidden ingredients cannot be measured from a photograph. Low-confidence results show an additional review warning. Editing the portion description or changing the attachment does not recalculate nutrition; scan again for a different meal.

The scanner shows preparation and analysis progress, supports cancellation, and offers retry, retake and manual entry on failure. Guests can sign in or enter values manually. Barcode and nutrition-label modes remain available.

## Implementation and optimization

`mealPhotoService.ts` normalizes camera/library images to JPEG at 75% quality, downscales food photos to a maximum 1280-pixel edge (1600 for labels), preserves aspect ratio, never upscales and rejects missing or oversized base64 output. Native image resources are released. Retry reuses the prepared image rather than encoding it again. Raw capture/picker results do not request a second base64 copy.

`scanSession.ts` permits only one capture/picker/request at a time. Cancellation, tab changes and account changes invalidate old results. Form state remounts across account IDs, and requests verify the expected authenticated owner. Rapid Save taps cannot duplicate a submission. No background AI calls or automatic retries were added.

Gemini remains behind the authenticated Supabase `nutrition-analysis` function. JWT verification, server-side credentials and the existing shared 30-request daily quota are preserved. The food prompt requires the same pictured portion for all nutrition fields and permits nonfood/unusable-photo errors. No schema migration was needed.

## Verification

- 106 Node regression tests pass, including JPEG preparation, dimension/size validation, resource cleanup, cancellation, overlap prevention, authenticated owner forwarding, all nutrition fields and nonfood rejection.
- TypeScript, strict ESLint, Deno Edge Function checking, production web export and Android bundle export pass. An Android bundle export is not an installed APK test.
- The updated function was deployed with JWT verification enabled (version 3). A live signed-in food-photo request returned HTTP 200 and opened Add a meal with name, portion and all four nutrition values, plus ingredient notes. The photo showed avocado toast with a fried egg.
- Web checks at 375×812 and 667×375 confirm editable calorie/portion values and reachable form controls, including Save. Drafts were discarded; no test meals or favorites were added to the user’s journal.
- Phone camera capture, device permission handling, maximum system font size and the rebuilt binary still need an actual-device check. The new Expo image-manipulator native dependency requires a fresh development/release build when testing an existing custom binary. Expo Go includes the SDK-compatible module. The installed v1.1.5 release is unchanged.

Images are sent to Supabase and Gemini for analysis only when the user initiates it. Never put Gemini secrets in client configuration or Git.
