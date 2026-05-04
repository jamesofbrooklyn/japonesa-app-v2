-- ============================================================
-- 0003 — Data integrity fixes (Milestone 0)
--
-- Addresses audit P0 findings:
--  1. daily_close.close_date global UNIQUE → composite (close_date, concept)
--  2. reservations.vip column missing (referenced by pre-shift)
--  3. concept enum has no CHECK constraint (typos become phantom tenants)
--  4. Missing concept indexes on hot-path tables
--  5. Sales dedupe constraint (re-uploading CSV currently doubles data)
--  6. Inventory counts duplicate guard (one count per ingredient per day)
-- ============================================================

-- 1. Daily close: replace global unique with composite (close_date, concept)
alter table daily_close drop constraint if exists daily_close_close_date_key;
create unique index if not exists daily_close_date_concept_uniq
  on daily_close(close_date, concept);

-- 2. Reservations: add vip flag
alter table reservations add column if not exists vip boolean not null default false;

-- 3. Concept CHECK constraint on every concept-scoped table.
-- (ingredients, suppliers, recipes etc. are shared reference tables and don't have
-- a concept column — see migration 0002 lines 22-34 for the canonical list.)
do $$
declare
  t text;
  concept_scoped_tables text[] := array[
    'menu_items', 'sales', 'inventory_counts', 'purchase_orders', 'waste_log',
    'daily_close', 'pnl_lines', 'staff', 'shifts', 'reservations',
    'service_incidents', 'guest_feedback'
  ];
begin
  foreach t in array concept_scoped_tables loop
    execute format(
      'alter table %I drop constraint if exists %I',
      t, t || '_concept_check'
    );
    execute format(
      'alter table %I add constraint %I check (concept in (''japonesa'', ''alamat'', ''tryst''))',
      t, t || '_concept_check'
    );
  end loop;
end $$;

-- 4. Missing concept indexes on hot-path tables
create index if not exists daily_close_concept_date_idx
  on daily_close(concept, close_date desc);
create index if not exists pnl_lines_concept_date_idx
  on pnl_lines(concept, occurred_on desc);
create index if not exists waste_log_concept_date_idx
  on waste_log(concept, occurred_on desc);
create index if not exists reservations_concept_idx
  on reservations(concept, reserved_for);
create index if not exists service_incidents_concept_idx
  on service_incidents(concept, occurred_at desc);
create index if not exists guest_feedback_concept_idx
  on guest_feedback(concept, occurred_on desc);
create index if not exists shifts_concept_idx
  on shifts(concept, shift_date desc);

-- Composite for menu engineering (sales filtered by sold_at, grouped by menu_item_id)
create index if not exists sales_menu_item_sold_at_idx
  on sales(menu_item_id, sold_at desc);

-- Composite for fetchLatestCounts dedup query
create index if not exists inventory_counts_ingredient_counted_idx
  on inventory_counts(ingredient_id, counted_at desc);

-- 5. Sales dedupe — prevent double-ingest of the same CSV
-- Partial unique: only enforce when pos_order_id is present (POS-sourced rows)
create unique index if not exists sales_dedupe_uniq
  on sales(pos_order_id, pos_item_id, sold_at)
  where pos_order_id is not null and pos_item_id is not null;

-- 6. Inventory counts: re-counts same day are legitimate observations;
-- deduplication is handled on read (latest per ingredient). No constraint needed.

-- 7. Tighten search_path on security-definer functions (prevents search_path hijacking)
alter function auth_role() set search_path = public, pg_temp;
alter function auth_concept() set search_path = public, pg_temp;
alter function assign_po_number() set search_path = public, pg_temp;

-- 8. Add WITH CHECK to RLS write policies that only had USING.
-- Without WITH CHECK, a manager could UPDATE a row to set concept != their own,
-- silently moving it out of their scope.

drop policy if exists "inventory_counts_write" on inventory_counts;
create policy "inventory_counts_write" on inventory_counts for all
  using (auth_role() = 'owner' or concept = auth_concept())
  with check (auth_role() = 'owner' or concept = auth_concept());

drop policy if exists "waste_log_write" on waste_log;
create policy "waste_log_write" on waste_log for all
  using (auth_role() = 'owner' or concept = auth_concept())
  with check (auth_role() = 'owner' or concept = auth_concept());

drop policy if exists "daily_close_write" on daily_close;
create policy "daily_close_write" on daily_close for all
  using (auth_role() = 'owner' or concept = auth_concept())
  with check (auth_role() = 'owner' or concept = auth_concept());

drop policy if exists "reservations_write" on reservations;
create policy "reservations_write" on reservations for all
  using (auth_role() = 'owner' or concept = auth_concept())
  with check (auth_role() = 'owner' or concept = auth_concept());

drop policy if exists "service_incidents_write" on service_incidents;
create policy "service_incidents_write" on service_incidents for all
  using (auth_role() = 'owner' or concept = auth_concept())
  with check (auth_role() = 'owner' or concept = auth_concept());

drop policy if exists "guest_feedback_write" on guest_feedback;
create policy "guest_feedback_write" on guest_feedback for all
  using (auth_role() = 'owner' or concept = auth_concept())
  with check (auth_role() = 'owner' or concept = auth_concept());

drop policy if exists "purchase_orders_write" on purchase_orders;
create policy "purchase_orders_write" on purchase_orders for all
  using (auth_role() = 'owner' or concept = auth_concept())
  with check (auth_role() = 'owner' or concept = auth_concept());

drop policy if exists "sales_write" on sales;
create policy "sales_write" on sales for all
  using (auth_role() = 'owner' or concept = auth_concept())
  with check (auth_role() = 'owner' or concept = auth_concept());

drop policy if exists "menu_items_write" on menu_items;
create policy "menu_items_write" on menu_items for all
  using (auth_role() = 'owner' or concept = auth_concept())
  with check (auth_role() = 'owner' or concept = auth_concept());
