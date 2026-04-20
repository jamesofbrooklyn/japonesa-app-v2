-- ============================================================
-- MIGRATION 0002 — Access control, concept scoping, PO system
-- ============================================================
-- Adds:
--   • concept column to all data tables (extensible for Alamat / Tryst)
--   • department label to ingredients + purchase_orders (for COGS categorisation)
--   • email to suppliers (for PDF delivery)
--   • user_profiles — role + concept assignment per user
--   • ingredient_par_levels — par + reorder qty per ingredient per concept
--   • supplier_items — which supplier provides which ingredient at what price
--   • po_templates — recurring order config for scheduled suppliers
--   • Supabase RLS enabled on all tables with owner / manager policies
-- ============================================================


-- ============================================================
-- 1. CONCEPT COLUMN — add to all data-bearing tables
--    Default 'japonesa' for all existing rows.
--    NULL is reserved for reference/config tables (ingredients,
--    suppliers) that are shared across concepts.
-- ============================================================

alter table menu_items       add column if not exists concept text not null default 'japonesa';
alter table sales             add column if not exists concept text not null default 'japonesa';
alter table inventory_counts  add column if not exists concept text not null default 'japonesa';
alter table purchase_orders   add column if not exists concept text not null default 'japonesa';
alter table waste_log         add column if not exists concept text not null default 'japonesa';
alter table daily_close       add column if not exists concept text not null default 'japonesa';
alter table pnl_lines         add column if not exists concept text not null default 'japonesa';
alter table staff             add column if not exists concept text not null default 'japonesa';
alter table shifts            add column if not exists concept text not null default 'japonesa';
alter table reservations      add column if not exists concept text not null default 'japonesa';
alter table service_incidents add column if not exists concept text not null default 'japonesa';
alter table guest_feedback    add column if not exists concept text not null default 'japonesa';


-- ============================================================
-- 2. DEPARTMENT LABEL — on ingredients and purchase_orders
--    Used for COGS-by-category reporting, NOT for access control.
--    kitchen | bar | foh | admin
-- ============================================================

alter table ingredients     add column if not exists department text;
alter table purchase_orders add column if not exists department text;


-- ============================================================
-- 3. SUPPLIER EMAIL — for PDF delivery
--    The existing `contact` field stays (Viber / phone).
--    A separate email column avoids splitting "contact" string.
-- ============================================================

alter table suppliers add column if not exists email text;


-- ============================================================
-- 4. USER PROFILES
--    Extends Supabase auth.users with role + concept scope.
--    role:    'owner' → all concepts / all data
--             'manager' → concept-scoped, no financials
--    concept: NULL for owners (unrestricted)
--             'japonesa' | 'alamat' | 'tryst' for managers
-- ============================================================

create table if not exists user_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  role         text not null check (role in ('owner', 'manager')),
  concept      text check (concept in ('japonesa', 'alamat', 'tryst')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),

  -- owners must have concept = NULL; managers must have a concept
  constraint role_concept_check check (
    (role = 'owner' and concept is null) or
    (role = 'manager' and concept is not null)
  )
);


-- ============================================================
-- 5. INGREDIENT PAR LEVELS
--    Par qty = minimum acceptable stock before reorder is triggered.
--    Reorder qty = how much to order when par is breached.
--    Scoped per concept so Japonesa and Alamat can have
--    different par levels for shared ingredients.
-- ============================================================

create table if not exists ingredient_par_levels (
  id            uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  concept       text not null default 'japonesa',
  par_qty       numeric(12,4) not null,   -- trigger reorder below this
  reorder_qty   numeric(12,4) not null,   -- default qty to put on the PO
  unit          text not null,            -- must match ingredients.unit
  updated_at    timestamptz default now(),
  unique (ingredient_id, concept)
);


-- ============================================================
-- 6. SUPPLIER ITEMS
--    Maps which supplier provides which ingredient,
--    at what price, with what minimum order and lead time.
--    Replaces the generic ingredients.supplier_id FK.
-- ============================================================

create table if not exists supplier_items (
  id              uuid primary key default gen_random_uuid(),
  supplier_id     uuid not null references suppliers(id) on delete cascade,
  ingredient_id   uuid not null references ingredients(id) on delete cascade,
  unit_price      numeric(10,4) not null,
  currency        text not null default 'PHP',
  min_order_qty   numeric(12,4),
  lead_time_days  int,                    -- overrides supplier-level lead time
  active          boolean default true,
  updated_at      timestamptz default now(),
  unique (supplier_id, ingredient_id)
);


-- ============================================================
-- 7. PO TEMPLATES — recurring / scheduled orders
--    Stores a reusable order config per supplier per concept.
--    schedule_days: array of ISO weekday numbers (1=Mon … 7=Sun)
--    line_items: [{ingredient_id, qty, unit, note}]
-- ============================================================

create table if not exists po_templates (
  id             uuid primary key default gen_random_uuid(),
  supplier_id    uuid not null references suppliers(id) on delete cascade,
  concept        text not null default 'japonesa',
  label          text not null,            -- e.g. "Cartimar Monday/Thursday fish run"
  schedule_days  int[] not null default '{}',  -- e.g. {1,4} = Mon + Thu
  line_items     jsonb not null default '[]',  -- [{ingredient_id, qty, unit, note}]
  active         boolean default true,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);


-- ============================================================
-- 8. PURCHASE ORDER STATUS COLUMN
--    Extend existing purchase_orders with an explicit status
--    enum covering the full PO lifecycle.
--    Existing rows default to 'draft'.
-- ============================================================

-- Replace the generic status text with a constrained column
alter table purchase_orders
  add column if not exists po_number text,          -- human-readable e.g. PO-2026-0042
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists sent_at timestamptz,
  add column if not exists template_id uuid references po_templates(id);

-- Rename existing `status` to use a check constraint if possible;
-- add new status values gracefully
alter table purchase_orders
  drop constraint if exists purchase_orders_status_check;

alter table purchase_orders
  add constraint purchase_orders_status_check
  check (status in ('draft', 'approved', 'sent', 'received', 'logged', 'cancelled'));

-- Sequence for PO numbers
create sequence if not exists po_number_seq start 1;

-- Auto-assign PO number on insert when none provided
create or replace function assign_po_number()
returns trigger language plpgsql as $$
begin
  if new.po_number is null then
    new.po_number := 'PO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('po_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_po_number on purchase_orders;
create trigger trg_assign_po_number
  before insert on purchase_orders
  for each row execute function assign_po_number();


-- ============================================================
-- 9. HELPER FUNCTIONS FOR RLS
--    Called inside policies — stable, no side effects.
-- ============================================================

create or replace function auth_role() returns text
  language sql stable security definer as $$
    select role from user_profiles where user_id = auth.uid()
$$;

create or replace function auth_concept() returns text
  language sql stable security definer as $$
    select concept from user_profiles where user_id = auth.uid()
$$;


-- ============================================================
-- 10. ENABLE RLS ON ALL TABLES
-- ============================================================

alter table menu_items         enable row level security;
alter table ingredients        enable row level security;
alter table recipes            enable row level security;
alter table suppliers          enable row level security;
alter table supplier_items     enable row level security;
alter table purchase_orders    enable row level security;
alter table po_templates       enable row level security;
alter table inventory_counts   enable row level security;
alter table ingredient_par_levels enable row level security;
alter table waste_log          enable row level security;
alter table sales              enable row level security;
alter table staff              enable row level security;
alter table shifts             enable row level security;
alter table reservations       enable row level security;
alter table service_incidents  enable row level security;
alter table guest_feedback     enable row level security;
alter table daily_close        enable row level security;
alter table pnl_lines          enable row level security;
alter table user_profiles      enable row level security;


-- ============================================================
-- 11. RLS POLICIES
--
--  Pattern A — concept-scoped tables (sales, inventory, POs…)
--    Owners see all rows.
--    Managers see only rows where concept = their concept.
--
--  Pattern B — shared reference tables (ingredients, suppliers…)
--    All authenticated users can read.
--    Only owners can write.
--
--  Pattern C — owner-only tables (pnl_lines, staff salary, user mgmt)
--    Only owners can read or write.
--
--  Pattern D — user_profiles
--    Users can read their own row; owners can read/write all rows.
-- ============================================================

-- ── Pattern A helpers ────────────────────────────────────────

-- menu_items
create policy "menu_items_select" on menu_items for select using (
  auth_role() = 'owner' or concept = auth_concept()
);
create policy "menu_items_write" on menu_items for all using (
  auth_role() = 'owner'
);

-- sales
create policy "sales_select" on sales for select using (
  auth_role() = 'owner' or concept = auth_concept()
);
create policy "sales_write" on sales for all using (
  auth_role() = 'owner'
);

-- inventory_counts
create policy "inventory_counts_select" on inventory_counts for select using (
  auth_role() = 'owner' or concept = auth_concept()
);
create policy "inventory_counts_write" on inventory_counts for all using (
  auth_role() = 'owner' or concept = auth_concept()
);

-- purchase_orders — managers can draft + approve for their concept
create policy "purchase_orders_select" on purchase_orders for select using (
  auth_role() = 'owner' or concept = auth_concept()
);
create policy "purchase_orders_write" on purchase_orders for all using (
  auth_role() = 'owner' or concept = auth_concept()
);

-- po_templates
create policy "po_templates_select" on po_templates for select using (
  auth_role() = 'owner' or concept = auth_concept()
);
create policy "po_templates_write" on po_templates for all using (
  auth_role() = 'owner'
);

-- waste_log
create policy "waste_log_select" on waste_log for select using (
  auth_role() = 'owner' or concept = auth_concept()
);
create policy "waste_log_write" on waste_log for all using (
  auth_role() = 'owner' or concept = auth_concept()
);

-- daily_close
create policy "daily_close_select" on daily_close for select using (
  auth_role() = 'owner' or concept = auth_concept()
);
create policy "daily_close_write" on daily_close for all using (
  auth_role() = 'owner' or concept = auth_concept()
);

-- reservations
create policy "reservations_select" on reservations for select using (
  auth_role() = 'owner' or concept = auth_concept()
);
create policy "reservations_write" on reservations for all using (
  auth_role() = 'owner' or concept = auth_concept()
);

-- service_incidents
create policy "service_incidents_select" on service_incidents for select using (
  auth_role() = 'owner' or concept = auth_concept()
);
create policy "service_incidents_write" on service_incidents for all using (
  auth_role() = 'owner' or concept = auth_concept()
);

-- guest_feedback
create policy "guest_feedback_select" on guest_feedback for select using (
  auth_role() = 'owner' or concept = auth_concept()
);
create policy "guest_feedback_write" on guest_feedback for all using (
  auth_role() = 'owner' or concept = auth_concept()
);

-- ── Pattern B — shared reference tables (read all, write owner only) ──

-- ingredients
create policy "ingredients_select" on ingredients for select using (
  auth.uid() is not null
);
create policy "ingredients_write" on ingredients for all using (
  auth_role() = 'owner'
);

-- recipes
create policy "recipes_select" on recipes for select using (
  auth.uid() is not null
);
create policy "recipes_write" on recipes for all using (
  auth_role() = 'owner'
);

-- suppliers
create policy "suppliers_select" on suppliers for select using (
  auth.uid() is not null
);
create policy "suppliers_write" on suppliers for all using (
  auth_role() = 'owner'
);

-- supplier_items
create policy "supplier_items_select" on supplier_items for select using (
  auth.uid() is not null
);
create policy "supplier_items_write" on supplier_items for all using (
  auth_role() = 'owner'
);

-- ingredient_par_levels — managers can read their concept's pars
create policy "par_levels_select" on ingredient_par_levels for select using (
  auth_role() = 'owner' or concept = auth_concept()
);
create policy "par_levels_write" on ingredient_par_levels for all using (
  auth_role() = 'owner'
);

-- ── Pattern C — owner-only (financials + staff salary data) ──

-- pnl_lines
create policy "pnl_lines_owner_only" on pnl_lines for all using (
  auth_role() = 'owner'
);

-- staff (contains salary data)
create policy "staff_owner_only" on staff for all using (
  auth_role() = 'owner'
);

-- shifts
create policy "shifts_owner_only" on shifts for all using (
  auth_role() = 'owner'
);

-- ── Pattern D — user_profiles ────────────────────────────────

create policy "user_profiles_self" on user_profiles for select using (
  user_id = auth.uid()
);
create policy "user_profiles_owner" on user_profiles for all using (
  auth_role() = 'owner'
);


-- ============================================================
-- 12. INDEXES for new columns
-- ============================================================

create index if not exists sales_concept_idx             on sales(concept);
create index if not exists inventory_counts_concept_idx  on inventory_counts(concept);
create index if not exists purchase_orders_concept_idx   on purchase_orders(concept);
create index if not exists purchase_orders_status_idx    on purchase_orders(status);
create index if not exists purchase_orders_po_number_idx on purchase_orders(po_number);
create index if not exists pnl_lines_concept_idx         on pnl_lines(concept);
create index if not exists menu_items_concept_idx        on menu_items(concept);
create index if not exists staff_concept_idx             on staff(concept);
create index if not exists supplier_items_supplier_idx   on supplier_items(supplier_id);
create index if not exists supplier_items_ingredient_idx on supplier_items(ingredient_id);
create index if not exists par_levels_ingredient_idx     on ingredient_par_levels(ingredient_id);
