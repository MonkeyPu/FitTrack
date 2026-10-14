# FitTrack

Mobile-first calorie, protein and cardio tracker for friends. Next.js (App Router, TypeScript), Tailwind, Supabase (Postgres, Auth, Row Level Security), deployable on Vercel. Installable on iPhone as a PWA.

## What's built (phases 1–3)

- Sign up, log in, log out, password reset, persistent sessions (Supabase Auth, cookie sessions via middleware)
- 4-step onboarding: profile (name, unique username, optional picture, age), maintenance calories, daily targets, goal and target date
- Home dashboard: separate Food and Net rings, protein bar, full calorie breakdown, quick actions, date navigation, goal countdown
- Food logging with saved-food search, servings and live totals; saved foods (create, edit, delete)
- Saved meals built from saved foods; logging a meal stores a snapshot of every ingredient
- Cardio logging with presets, manual calories and the source of the estimate
- Diary by date with edit and delete; totals recalculate from the database
- Settings: targets, goal, account, email, password, privacy toggles, theme, data export, account deletion
- Database schema, indexes and RLS policies for every table (friends tables included)
- All calculations live in `lib/calc.ts` with unit tests (`npm test`)

Not yet built: friend requests and friend screens (phase 4), charts, offline/service worker (phases 5–6). The `friendships` table, its RLS and username search function already exist.

## Setup

### 1. Supabase
1. Create a project at supabase.com.
2. SQL editor: run `supabase/migrations/0001_schema.sql`, then `0002_rls.sql`. (Or use the Supabase CLI: `supabase link` then `supabase db push`.)
3. Authentication → URL Configuration: set **Site URL** to your production URL and add these **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-APP.vercel.app/auth/callback`
4. Authentication → Providers → Email: keep email confirmation on for production. For quick local testing you may turn it off.
5. Project settings → API: copy the project URL, `anon` key and `service_role` key.

### 2. Local development
```bash
cp .env.example .env.local   # fill in the three Supabase values
npm install
npm run dev                  # http://localhost:3000
npm test                     # calculation tests
npm run typecheck
```

### 3. Deploy to Vercel
1. Push this folder to a Git repository and import it in Vercel (framework: Next.js, defaults are fine).
2. Add environment variables (Settings → Environment Variables):

| Name | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | project URL | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | public; safe because RLS is on |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key | **secret**, server only, used for account deletion |
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR-APP.vercel.app` | optional, used in email links |

3. Deploy, then add the production URL to Supabase redirect URLs (step 1.3).

### 4. Install on iPhone
Open the site in Safari → Share → **Add to Home Screen**.

## How the numbers work
- Food calories = sum of food and meal log totals for the day.
- Net calories = food calories − logged exercise calories (subtracted once).
- Exercise never raises the food maximum.
- Remaining values can go negative; percentages can exceed 100%; a target of 0 or none is treated as "not set".
- Log totals are generated columns in Postgres (`servings × per-serving value`), so they cannot drift.
- Every entry stores its own `log_date`, built from the date picked in the form, so entries cannot slip into a neighbouring day. "Today" uses the browser timezone (saved in a `tz` cookie).
- Changing targets only updates the profile; a trigger records each change in `target_changes` for future charts.

## Security notes
- RLS is enabled on every table. Users can only read and write their own rows. Friend access to other people's data is deliberately not granted yet; phase 4 adds it with explicit policies tied to accepted friendships and the owner's privacy settings.
- The service-role key is only imported in `lib/supabase/admin.ts` (`server-only`).
- All inputs are validated on the server with zod; the browser never supplies user ids.
- Avatar uploads are limited to your own storage folder, 2 MB, JPG/PNG/WebP.
- Supabase Auth applies its own rate limits to sign-up and login. Friend-request limits come with phase 4.

## Health note
Calorie targets and maintenance numbers are estimates. The app warns on very low or aggressive targets and never claims to measure body fat.

## Known limitations
- Mutations use server actions with pending states and duplicate-submit protection; full optimistic UI and offline queuing are planned for phase 5.
- Units are fixed to kcal and grams; the default diary date is always today.
- Rejected friend requests currently block a new request between the same two people (to be relaxed in phase 4).
- This code was type-checked, unit-tested and production-built, but it has not been run against a live Supabase project or tested on a physical iPhone. Do a first pass through sign-up → onboarding → log food/meal/cardio → edit/delete before sharing it.
