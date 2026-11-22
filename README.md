# Turrera

Government surplus auctions, all in one searchable site.

**Phase 1:** GSA Auctions collector (official API) → Supabase database → search website on Vercel, refreshed every 4 hours by GitHub Actions.

## How it fits together

```
GitHub Actions (every 4 h) ──> collectors/gsa.mjs ──> Supabase "lots" table <── Next.js site on Vercel (turrera.com)
```

## One-time setup

1. **Supabase** (database)
   - Create a free project at supabase.com.
   - SQL Editor → New query → paste `supabase/schema.sql` → Run.
   - Project Settings → API: copy the **Project URL**, the **anon public** key and the **service_role** key.
2. **GSA API key**: sign up at https://api.data.gov/signup/ (free, emailed to you).
3. **GitHub secrets** (repo → Settings → Secrets and variables → Actions → New repository secret):
   - `GSA_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   Then Actions tab → "Collect auction lots" → **Run workflow** to fill the database right away.
4. **Vercel** (website): Add New → Project → import this repo. Under Environment Variables add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SITE_PASSWORD` (optional; password-protects the site — delete it to go public)
   Deploy, then Settings → Domains → add `turrera.com` and `www.turrera.com`.

Never put the **service_role** key in Vercel or in the code — it can write to the database.

## Local development

```
npm install
cp .env.example .env.local   # fill in values
npm run dev                  # website at http://localhost:3000
npm run collect:gsa          # run the collector once
npm test                     # collector tests
```

## What runs every 4 hours

`.github/workflows/collect.yml`: GSA Auctions and Public Surplus collectors, Public Surplus item descriptions,
eBay vehicle values (needs `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`), and Claude condition summaries plus market value
and ease-of-sale estimates (needs `ANTHROPIC_API_KEY`).

Database changes go in `supabase/schema.sql` (safe to re-run). Pushing a change to that file runs
`.github/workflows/migrate.yml`, which applies it using the `SUPABASE_DB_URL` secret.

Not collected: CWS Marketing blocks automated access (CAPTCHA on its site, 403 on its bidding site).

## Adding a new auction source

Create `collectors/<source>.mjs` that maps listings to the `lots` columns (see `toLot` in `gsa.mjs`), saves them with `upsertLots`, and add a step to `.github/workflows/collect.yml`.
