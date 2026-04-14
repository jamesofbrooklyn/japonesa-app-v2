# Japonesa — Executive Dashboard

Carbone-style ops command center for **Japonesa Poblacion** (Makati). Tracks prime cost, menu engineering, supplier scorecards, staff productivity, inventory variance, and weekly P&L for a 36-staff Japanese restaurant.

## Quick start (CEO machine)

You need [Node.js 20+](https://nodejs.org/) installed. That's it.

```bash
git clone <this-repo-url>
cd japonesa-dashboard
npm install
npm run dev
```

Then open **http://localhost:3031** in your browser.

The dashboard runs entirely on mock data right now — no Supabase or API keys required to view it. Click around all 6 tabs (Pulse, Menu Eng, Inventory, Operations, Team, Money) to see how it works.

## What you're looking at

| Tab | What it shows |
|---|---|
| **Pulse** | 60-second view: revenue, prime cost, food/labor cost bands, 30-day trend, red flags, pre-shift brief |
| **Menu Engineering** | All 95 menu items classified into Stars / Puzzles / Plowhorses / Dogs by margin × velocity |
| **Inventory** | Delivery-vs-purchase-summary reconciliation (the Alamat / Japonesa shared sourcing workflow), variance hunting, incoming deliveries |
| **Operations** | Inventory health, supplier scorecards, reservation density heatmap |
| **Team** | 36-staff roster split FOH / BOH with statutory-loaded rates, hours, productivity, ratings |
| **Money** | Revenue waterfall (gross → discounts → VAT → service charge), MTD P&L, AP aging, FX exposure |

## Project layout

```
src/
  app/             Next.js routes — 6 tabs + /m mobile + /api/*
  components/      Sidebar, KpiCard, SectionHeader, Sparkline
  lib/             supabase, kpis math, mock data, mock-inventory, anthropic, categories
  data/            menu-seed.json (95 items), inventory-seed.json (23 produce items)
supabase/
  migrations/      0001_init.sql — full Postgres schema (16 tables)
scripts/
  seed-menu.ts     Upsert menu_items from menu-seed.json (run after Supabase setup)
```

## Stack

- Next.js 16 + React 19 + Tailwind 3
- Supabase (Postgres) — schema ready, not yet connected
- recharts — charts
- Anthropic SDK — for the Phase 4 Claude weekly review

## Phases

- ✅ **Phase 0 (current):** scaffold, schema, menu seed, 6-tab UI, full mock data
- ⏳ **Phase 1:** daily-close form, manual P&L entry, 36-staff roster entry
- ⏳ **Phase 2:** POS adapter (Foodics / Loyverse / Toast), 90-day backfill, menu quadrant goes live on real sales
- ⏳ **Phase 3:** real inventory counts, supplier PO entry, waste log, pre-shift brief push
- ⏳ **Phase 4:** Claude weekly review, anomaly detection, Monday digest push

## Wiring up real data (Phase 1+)

1. Create a Supabase project ([supabase.com](https://supabase.com), Singapore region for PH latency)
2. In the SQL editor, run `supabase/migrations/0001_init.sql`
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Run `npm run seed:menu` to push the 95 menu items into Supabase
5. Replace mock imports (`@/lib/mock`, `@/lib/mock-inventory`) with Supabase queries tab-by-tab

## Menu data

`src/data/menu-seed.json` — **95 items** ingested from the Japonesa Menu 2025 PDF. Drinks menu is **not** in this file and will need a separate ingest pass.

## Inventory data

`src/data/inventory-seed.json` — **23 produce/greens items** ingested from the shared Alamat / Japonesa Google Sheet. The variance reconciliation workflow (delivery form qty vs purchase summary qty) is modeled in `src/lib/mock-inventory.ts`.

## Deploy

Not yet deployed. When ready, push to Vercel (`vercel deploy`) — it auto-detects Next.js. Make sure to set the env vars in the Vercel dashboard.
