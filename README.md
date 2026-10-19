# FitTrack

Mobile-first calorie, protein and cardio tracker for friends. Next.js (App Router, TypeScript), Tailwind, Supabase (Postgres, Auth, Row Level Security), deployable on Vercel. Installable on iPhone as a PWA.

## What's built

- Sign up, log in, log out, password reset, persistent sessions (Supabase Auth, cookie sessions via middleware)
- 4-step onboarding: profile (name, unique username, optional picture, age), maintenance calories, daily targets, goal and target date
- Home dashboard: separate Food and Net rings, protein bar, full calorie breakdown, quick actions, date navigation, goal countdown
- Food logging with saved-food search, servings and live totals; saved foods (create, edit, delete)
- Saved meals built from saved foods; logging a meal stores a snapshot of every ingredient
- Cardio logging with presets, manual calories and the source of the estimate
- Diary by date with edit and delete; totals recalculate from the database
- Settings: targets, goal, account, email, password, privacy toggles, theme, data export, account deletion
- Friends: search by username, send / accept / decline / cancel requests, remove friends, a request badge on the Friends tab
- Friends screen with a card per friend (food vs their max, protein vs goal, exercise, net, goal and days left) and friend profiles with 7/30-day comparison charts against your own data
- Privacy toggles (daily summary, exercise, history, goal) that are enforced in the database, not the UI
- Calendar: tap the date at the top of Home or Diary to open a month calendar (month and year arrows, jump to Today)
- Game-style moments: a full-screen "chud" game-over screen when you pass your food limit, and confetti when you hit your protein goal, stay within your limit for the day (checked from 9pm and again the next morning) or reach your goal date. Each shows once per day per device, and can be turned off in Profile → Preferences
- More nutrients: carbs, sugar, fat, saturated fat, fiber and salt on foods, meals and entries, with daily totals
- Ingredients: add ingredients to any food while logging (protein powder in yoghurt). It is stored as a combined entry that can be expanded and edited
- Manage friends: remove friends and choose, per friend, what they can see (daily nutrition, exercise, history, goal). Your Privacy settings are the default for everyone else
- One date bar on Home, Diary, Add and Friends. The date you pick stays when you switch tabs, and Friends shows that date too
- Fast, app-like feel: your data is loaded onto the phone, tabs switch without waiting, and saves show up instantly (and roll back with a message if they fail). Saving is refused while offline so nothing is silently lost
- iPhone launch screen, shown instantly when opened from the Home Screen
- Supermarket catalog: search Mercadona (and Carrefour, Dia, Lidl, Alcampo, Eroski, Aldi, Consum, or all of Spain) by name or barcode, pick an amount in g or ml, and fill a food or an ingredient. Data comes from Open Food Facts (ODbL), searched through the app's server with caching
- Database schema, indexes and RLS policies for every table
- All calculations live in `lib/calc.ts` with unit tests (`npm test`)

Not yet built: your own history charts and statistics, offline/service worker, polish (phases 5–6).

## Setup

### 1. Supabase
1. Create a project at supabase.com.
2. SQL editor: open each file, copy its contents, paste and run, in order: `0001_schema.sql`, `0002_rls.sql`, `0003_friends.sql`, `0004_nutrients_and_friend_permissions.sql`. (Or use the Supabase CLI: `supabase link` then `supabase db push`.)
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
npm test                     # calculation tests + database privacy tests
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

## How friends and privacy work
- Friends never get direct access to another user's tables. Reads go through four database functions (`my_friendships`, `friend_cards`, `friend_history`, `is_friend`) that check that a friendship is accepted **and** that the owner switched on the matching toggle. Anything not shared comes back as null.
- Never exposed to friends: email, maintenance calories, notes, individual log entries, authentication details.
- Visiting `/friends/<id>` for someone who isn't an accepted friend returns a 404, so changing the URL gives nothing.
- Friend requests are rate-limited in the database (15 per hour, 50 pending), and the counter survives deleting and re-sending requests. A declined request can't be re-sent by the same person for 7 days.
- `db-tests/privacy.test.ts` runs the real migrations in an in-memory Postgres and checks account isolation, request rules, each privacy toggle, stranger access, removal of access, search and rate limiting.

## Security notes
- RLS is enabled on every table. Users can only read and write their own rows; friend data is reachable only through the functions above.
- The service-role key is only imported in `lib/supabase/admin.ts` (`server-only`).
- All inputs are validated on the server with zod; the browser never supplies user ids.
- Avatar uploads are limited to your own storage folder, 2 MB, JPG/PNG/WebP.
- Supabase Auth applies its own rate limits to sign-up and login. Friend requests are limited in the database.

## Health note
Calorie targets and maintenance numbers are estimates. The app warns on very low or aggressive targets and never claims to measure body fat.

## Supermarket catalog
- Source: [Open Food Facts](https://world.openfoodfacts.org), an open database filled in by volunteers. Coverage of Mercadona is good but not complete, and individual values can be wrong. The app warns when values look inconsistent.
- Searches go through `/api/catalog/search` (signed-in users only). Results are cached for a day and each person is limited to 8 searches a minute, to stay inside Open Food Facts' limit of 10 searches a minute.
- Optional: set `OFF_CONTACT_EMAIL` in Vercel so Open Food Facts can contact you. Without it your site URL is used.
- Foods you pick are copied into your own entries and saved foods. Attribution to Open Food Facts is shown in the catalog.

## How the app stays fast
- The server only checks you are signed in and finished onboarding. Everything else is fetched by the browser straight from Supabase and kept in a cache (TanStack Query), saved on the device in IndexedDB so the app opens with your last data.
- Your own data is cached per user and wiped on log out and on the login screen. Friends' data and one-off lookups are never saved on the device.
- Reads and writes go straight to Supabase from the browser. Row Level Security and the database's check constraints protect and validate the data; friend data is only reachable through the permission-checked functions. Account deletion and data export still run on the server.
- Saving needs a connection. Offline, you can still read cached data, but saves are refused with a message.

## Known limitations
- Offline saving (a queue that syncs later) is not built; saves are refused while offline.
- Existing foods and entries have 0 for the new nutrients (shown as not recorded).
- Friend cards show net calories rather than deficit, because maintenance calories are never shared.
- Launch images cover current iPhone sizes; other devices fall back to a plain screen.
- Units are fixed to kcal and grams; the default diary date is always today.
- Friend comparisons use your viewing date for "today", so a friend in a very different timezone may show a slightly different "today".
- This code was type-checked, unit-tested and production-built, but the database logic is tested in an in-memory Postgres but it has not been run against a live Supabase project or tested on a physical iPhone. Do a first pass through sign-up → onboarding → log food/meal/cardio → edit/delete before sharing it.
