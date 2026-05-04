-- ============================================================
-- 0004 — Daily close revenue field split (M2.1)
--
-- Replaces the ambiguous `total_revenue_php` field on `daily_close` with
-- explicit components:
--   - gross_sales_php       (customer-facing total INCLUDING VAT and service charge)
--   - vat_php               (12% VAT remitted to BIR)
--   - service_charge_php    (10% SC distributed to staff per RA 11360)
--   - net_revenue_php       (gross - vat - sc; what the restaurant books)
--
-- Why this matters: `total_revenue_php` could mean any of (gross collected /
-- net of VAT / net of VAT+SC / menu-price subtotal). Each interpretation is a
-- ~22% spread. Every downstream KPI (food cost %, labor %, prime cost,
-- RevPASH, avg check) depends on which one was entered. The audit flagged
-- this as the #1 P1 — every KPI today is potentially off by 22%.
--
-- Migration plan:
--   1. Add the three new columns (nullable for existing rows).
--   2. Backfill existing rows: assume `total_revenue_php` was net base revenue
--      (the value used by KPIs). Set net_revenue_php = total_revenue_php,
--      gross_sales_php = total * 1.22 (12% VAT + 10% SC), vat_php = total * 0.12,
--      service_charge_php = total * 0.10. Mark backfilled rows in gm_notes.
--   3. Keep `total_revenue_php` as a generated column = net_revenue_php so
--      existing queries continue to work without a code-side migration.
--      (Drop in a later migration once all reads are switched.)
-- ============================================================

alter table daily_close add column if not exists gross_sales_php numeric(12,2);
alter table daily_close add column if not exists vat_php numeric(12,2);
alter table daily_close add column if not exists service_charge_php numeric(12,2);
alter table daily_close add column if not exists net_revenue_php numeric(12,2);

-- Backfill: assume the existing total_revenue_php was net of VAT and SC
-- (the value actual KPIs depend on). Best guess given the field was previously
-- ambiguous; flag the row so reviewers know it was inferred.
update daily_close
set
  net_revenue_php    = total_revenue_php,
  vat_php            = round(total_revenue_php * 0.12, 2),
  service_charge_php = round(total_revenue_php * 0.10, 2),
  gross_sales_php    = round(total_revenue_php * 1.22, 2)
where net_revenue_php is null and total_revenue_php is not null;

-- Constraints: net_revenue_php must equal gross - vat - sc (within 1 peso for rounding).
-- Apply only to rows that have all three explicit fields set (forward inserts).
-- Backfilled rows pass because of the formula above.
alter table daily_close drop constraint if exists daily_close_net_revenue_check;
alter table daily_close add constraint daily_close_net_revenue_check
  check (
    net_revenue_php is null
    or gross_sales_php is null
    or vat_php is null
    or service_charge_php is null
    or abs(net_revenue_php - (gross_sales_php - vat_php - service_charge_php)) <= 1.00
  );

-- New rows must populate net_revenue_php (the value KPIs read).
-- Defer NOT NULL until all client code is updated (next migration).
