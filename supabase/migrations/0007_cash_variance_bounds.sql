-- ============================================================
-- 0007 — Cash variance DB-level bounds (v1.1, C2)
--
-- The application validates `cash_variance_php` via Zod, but a service-role
-- script or direct SQL write can bypass that. Add a CHECK so even SQL-level
-- writes can't record absurd values that would mask cash theft or trigger
-- false anomaly alerts.
-- ============================================================

alter table daily_close drop constraint if exists daily_close_cash_variance_bounds;
alter table daily_close add constraint daily_close_cash_variance_bounds
  check (cash_variance_php between -1000000 and 1000000);
