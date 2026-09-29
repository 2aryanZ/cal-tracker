# Repository Guidelines

## Project Structure & Module Organization

Cal Tracker uses Expo SDK 57, React Native, TypeScript, and Expo Router. Routes live in `src/app/`, with main screens in `src/app/(tabs)/`. Reusable UI belongs in `src/components/`; `src/context/NutritionContext.tsx` coordinates nutrition state. Keep storage, authentication, calculations, and API integrations in `src/services/`. Shared types, theme tokens, and hooks live in `src/types/`, `src/constants/`, and `src/hooks/`. Images and audio belong in `assets/`.

Database definitions and migrations live in `supabase/schema.sql` and `supabase/migrations/`. Server-side analysis lives in `supabase/functions/nutrition-analysis/`; regression tests live in `tests/`.

## Build, Test, and Development Commands

Use Node.js 24 and install dependencies with `npm ci`.

- `npm start`: start the Expo development server.
- `npm run android`, `npm run ios`, or `npm run web`: launch a platform preview.
- `npm test`: run Node's built-in regression test runner.
- `npm run typecheck`: check TypeScript without emitting files.
- `npm run lint`: run Expo ESLint checks.
- `npx eslint src --no-cache --max-warnings 0`: enforce the CI lint requirement.
- `npx expo export --platform web`: build the production web export.

## Coding Style & Naming Conventions

Use strict TypeScript, `.tsx` for JSX, and `.ts` for services. Match surrounding indentation; prefer two spaces in new handwritten code. Use PascalCase for components and types, camelCase for functions and variables, and `@/` imports for shared source modules. Reuse theme tokens and nutrition types. Follow Expo ESLint; no separate Prettier configuration is present.

## Testing Guidelines

Name tests `tests/*.test.cjs`; reuse `tests/helpers.cjs` for TypeScript loading and storage mocks. Cover changed validation, persistence, synchronization, and authentication behavior, including failure paths. Mock external services; default tests must not require a live database. No coverage percentage is configured. Run tests, type checking, lint, and web export before submission.

## Commit & Pull Request Guidelines

Follow existing prefixes: `feat(scope):`, `fix(scope):`, and `chore(release):`. Explain the problem, resulting behavior, and verification in PR descriptions. Link relevant issues, include screenshots for UI changes, and document backend migration or deployment steps.

## Security & Agent Instructions

Use `.env.example` as the configuration template. Keep credentials out of Git; `EXPO_PUBLIC_*` values are bundled into clients. Keep Gemini secrets server-side and preserve account isolation.

Before writing code, read the exact [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/). Preserve unrelated working changes.
