# Japonesa — Executive Dashboard

Operations command center for **Japonesa Poblacion** (Makati). Tracks daily close, prime cost, menu engineering, supplier POs, staff productivity, inventory counts, waste log, and Claude-powered weekly insights for a 36-staff Japanese restaurant.

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind 3
- Supabase (Postgres + Auth + RLS) — production project linked
- Anthropic SDK — Claude AI weekly review, anomaly detection, Monday digest
- Recharts — Sparklines on Pulse
- Deployed on Vercel

## Quick start

You need [Node.js 20+](https://nodejs.org/).

```bash
git clone <this-repo-url>
cd japonesa-app-main
npm install
cp .env.example .env.local   # fill in Supabase + Anthropic keys
npm run dev                  # http://localhost:3031
```

The dashboard is fully wired to Supabase — there is no mock data. With an empty database, every page shows "no data yet" prompts. Submit a daily close on the Pulse page to see numbers populate.

## Required environment variables

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase client/server code |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All Supabase client/server code |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/admin/invite`, `/admin/users` (server-only — never exposed to browser) |
| `ANTHROPIC_API_KEY` | `/api/ai/*` endpoints, `/insights` page |

## Roles

- **Owner** — full access across all concepts. Can edit/delete daily closes and PNL lines, approve POs, manage users, run AI insights.
- **Manager** — concept-scoped (`japonesa` / `alamat` / `tryst`). Can submit daily close, log waste, record inventory counts, create POs (but not approve), view team and ops pages for their concept only.

## Pages

| Route | Purpose | Access |
|---|---|---|
| `/` (Pulse) | 60-second KPI view, daily close form, AI red flags | All |
| `/money` | Month-to-date P&L, P&L line entry | All read · owner edit |
| `/menu` | Menu engineering quadrant (after sales upload) | All |
| `/team` | Staff roster | Owner only |
| `/ops` | Suppliers + reservation density | All |
| `/inventory` | Counts, active POs, waste log, count/waste forms | All |
| `/purchase-orders` | PO creation + lifecycle | All read · owner approves |
| `/upload` | CSV sales import (per-day or summary mode) | Owner only |
| `/insights` | AI weekly review, anomalies, Monday digest | Owner only |
| `/m` | Mobile quick-glance dashboard | All |
| `/admin/users` | Invite users, manage roles | Owner only |

## Deploying schema changes (Supabase)

The schema lives in `supabase/migrations/`. Migrations are run **in order** against the Supabase project. Two ways to apply:

**Option A — Supabase CLI (preferred):**
```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Option B — SQL editor (manual):**
Open the Supabase dashboard → SQL editor → paste each migration file in order:
1. `0001_init.sql` — base schema (16 tables)
2. `0002_access_control_and_po.sql` — RLS policies, PO numbering trigger, user_profiles
3. `0003_data_integrity_fixes.sql` — concept enum CHECK, missing indexes, sales dedup, RLS WITH CHECK clauses

After running 0003, verify with:
```sql
select column_name from information_schema.columns
  where table_name = 'reservations' and column_name = 'vip';
-- should return one row
```

## Local Supabase (optional, for development)

If you don't want to develop against production:
```bash
npx supabase start         # spins up a local Postgres + Studio at :54321
npx supabase db reset      # applies all migrations
```
Then point `.env.local` at the local URLs printed by `start`.

## Timezone

All date math is anchored to **Asia/Manila** via `src/lib/dates.ts`. Vercel servers run in UTC; PH does not observe DST so the offset is a stable +08:00. Always use the `manilaToday()` / `manilaDaysAgo()` helpers — never `new Date().toISOString().slice(0, 10)` — for any date that represents "in the restaurant's day."

## Project layout

```
src/
  app/(dashboard)/   pages: pulse, money, menu, team, ops, inventory,
                    purchase-orders, upload, insights, m, admin
  app/api/          POST/GET/PATCH/DELETE for every resource
                    + /api/ai/{weekly-review,anomalies,monday-digest}
  components/       Forms (DailyClose, PnlLine, Staff, PO, Waste, InventoryCount,
                    CSVUpload, Invite) and AI cards
  lib/              auth, supabase-server, queries, kpis, dates, csv-parser,
                    pre-shift, ai-data-collector, ai-prompts, anthropic
  data/             menu-seed.json, inventory-seed.json (used by scripts/seed-menu.ts)
supabase/
  migrations/       0001 schema · 0002 RLS+PO · 0003 integrity fixes
scripts/
  seed-menu.ts     One-time bulk import of menu items from menu-seed.json
```

## Status

- ✅ Auth + RLS (cookie sessions, owner/manager roles, concept scoping)
- ✅ All data entry forms wired to Supabase
- ✅ CSV sales upload with per-day or date-range summary mode
- ✅ Claude AI insights (weekly review, anomaly detection, Monday digest)
- ⏳ Supplier admin UI (currently must be added in Supabase SQL editor)
- ⏳ Menu items admin UI (same)
- ⏳ Production data population

See `/Users/jamesthomas/.claude/plans/` (or ask the AI) for the active completion roadmap.
