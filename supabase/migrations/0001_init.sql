-- Japonesa Dashboard — initial schema
-- Single-user (Jon) for v1; no RLS yet.

create extension if not exists "pgcrypto";

-- ============================================================
-- MENU + RECIPES
-- ============================================================

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  pos_id text,
  name text not null,
  category text not null,                 -- appetizers, omakase, sushi, sashimi, signature_maki, maki, mains, kushiyaki, roast_chicken, donburi, desserts, drinks
  subcategory text,                       -- e.g. "tiradito", "ceviche_tacos"
  variant text,                           -- e.g. "8pc", "4pc", "sushi_2pc", "sashimi_3pc", "whole", "half"
  description text,
  price_php numeric(10,2) not null,
  theoretical_cost_php numeric(10,2),     -- nullable until recipes captured
  is_chefs_rec boolean default false,
  is_vegan boolean default false,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists menu_items_category_idx on menu_items(category);
create index if not exists menu_items_active_idx on menu_items(active);

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  category text not null,                 -- dry, protein, produce, dairy, alcohol, import
  unit text not null,                     -- kg, g, l, ml, pc
  current_unit_cost numeric(10,4),
  currency text default 'PHP',
  supplier_id uuid,
  created_at timestamptz default now()
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id),
  qty numeric(10,4) not null,
  unit text not null,
  notes text,
  unique (menu_item_id, ingredient_id)
);

-- ============================================================
-- SUPPLIERS + PURCHASING + INVENTORY
-- ============================================================

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class text not null check (class in ('spot', 'contract')),
  category text,
  contact text,
  lead_time_days int,
  payment_terms text,
  created_at timestamptz default now()
);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id),
  ordered_at timestamptz not null,
  expected_at timestamptz,
  received_at timestamptz,
  line_items jsonb not null default '[]',
  total numeric(12,2) not null,
  currency text default 'PHP',
  fx_rate numeric(10,6),
  status text default 'open',
  notes text
);

create table if not exists inventory_counts (
  id uuid primary key default gen_random_uuid(),
  counted_at timestamptz not null default now(),
  counted_by text,
  ingredient_id uuid references ingredients(id),
  qty_on_hand numeric(12,4) not null,
  unit_cost numeric(10,4)
);

create table if not exists waste_log (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null default current_date,
  ingredient_id uuid references ingredients(id),
  menu_item_id uuid references menu_items(id),
  qty numeric(12,4) not null,
  reason text
);

-- ============================================================
-- SALES (POS feed)
-- ============================================================

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  sold_at timestamptz not null,
  daypart text,                           -- lunch, dinner, late_night
  menu_item_id uuid references menu_items(id),
  pos_item_id text,
  qty int not null,
  gross_php numeric(12,2) not null,
  discount_php numeric(12,2) default 0,
  payment_method text,                    -- cash, card, gcash, maya, bank_transfer
  pos_order_id text,
  ingested_at timestamptz default now()
);

create index if not exists sales_sold_at_idx on sales(sold_at);
create index if not exists sales_menu_item_idx on sales(menu_item_id);

-- ============================================================
-- STAFF + SHIFTS
-- ============================================================

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,                              -- gm, chef, sous_chef, line_cook, server, bartender, runner, dishwasher
  hire_date date,
  base_rate_php numeric(10,2),            -- hourly or daily
  rate_unit text default 'monthly',       -- hourly | daily | monthly
  employment_type text,                   -- regular, probationary, contractual
  statutory_loaded_rate_php numeric(10,2),
  active boolean default true
);

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id),
  shift_date date not null,
  daypart text,
  scheduled_in timestamptz,
  scheduled_out timestamptz,
  actual_in timestamptz,
  actual_out timestamptz,
  notes text
);

-- ============================================================
-- FOH (reservations, incidents, feedback)
-- ============================================================

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  reserved_for timestamptz not null,
  party_size int not null,
  status text not null,                   -- booked, seated, no_show, walk_in, cancelled
  source text,                            -- direct, instagram, viber, walkin
  guest_name text,
  notes text
);

create table if not exists service_incidents (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  type text not null,                     -- comp, refund, complaint, breakage
  amount_php numeric(10,2),
  staff_id uuid references staff(id),
  notes text
);

create table if not exists guest_feedback (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null default current_date,
  source text not null,                   -- google, qr, manual
  rating int,
  text text,
  sentiment text
);

-- ============================================================
-- DAILY CLOSE + P&L
-- ============================================================

create table if not exists daily_close (
  id uuid primary key default gen_random_uuid(),
  close_date date unique not null,
  total_revenue_php numeric(12,2) not null,
  covers int not null,
  cash_collected_php numeric(12,2),
  cash_variance_php numeric(12,2),
  deposit_amount_php numeric(12,2),
  tip_pool_php numeric(12,2),
  gm_notes text,
  submitted_by text,
  submitted_at timestamptz default now()
);

create table if not exists pnl_lines (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null,
  category text not null,                 -- revenue, cogs, labor, rent, utilities, marketing, other
  subcategory text,
  amount_php numeric(12,2) not null,
  source text default 'manual',           -- manual, pos, payroll
  notes text
);

create index if not exists pnl_date_idx on pnl_lines(occurred_on);
