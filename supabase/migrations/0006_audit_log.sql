-- ============================================================
-- 0006 — Audit log (v1.1, A2)
--
-- Captures who edited what across financial / operational tables.
-- Generic trigger writes (table, op, row_id, before, after, user) on every
-- mutation. Owner-only RLS — managers shouldn't see audit history of others.
--
-- Tables under audit (chosen for financial / operational sensitivity):
--   daily_close, pnl_lines, purchase_orders, staff, menu_items,
--   inventory_counts, waste_log
--
-- We deliberately do NOT audit suppliers/ingredients/reservations for v1 —
-- those are reference data with low forensic value, and the trigger overhead
-- on bulk inserts (CSV upload via sales) would be measurable.
-- ============================================================

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  user_id uuid references auth.users(id),    -- null for system / direct-SQL writes
  table_name text not null,
  op text not null check (op in ('insert', 'update', 'delete')),
  row_id uuid,
  before_json jsonb,
  after_json jsonb,
  concept text                                -- denormalized for fast filter
);

create index if not exists audit_log_table_occurred_idx on audit_log(table_name, occurred_at desc);
create index if not exists audit_log_user_occurred_idx on audit_log(user_id, occurred_at desc);
create index if not exists audit_log_concept_occurred_idx on audit_log(concept, occurred_at desc);

alter table audit_log enable row level security;
drop policy if exists "audit_log_owner_only" on audit_log;
create policy "audit_log_owner_only" on audit_log for select
  using (auth_role() = 'owner');
-- No INSERT policy — only the SECURITY DEFINER trigger function writes.

-- ----- Trigger function -----
-- Captures the auth.uid() of the request that triggered the change. Falls back
-- to NULL when triggered outside an authenticated context (cron, direct SQL).
create or replace function record_audit() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_concept text;
  v_row_id uuid;
begin
  -- auth.uid() returns NULL outside of a request scope, which is fine
  v_user := auth.uid();

  -- Most rows have a row.id; fall back to NULL otherwise
  if (TG_OP = 'DELETE') then
    v_row_id := (OLD).id;
    v_concept := case when (OLD) ? 'concept' then (to_jsonb(OLD)->>'concept') else null end;
  else
    v_row_id := (NEW).id;
    v_concept := case when (NEW) ? 'concept' then (to_jsonb(NEW)->>'concept') else null end;
  end if;

  insert into audit_log (
    user_id, table_name, op, row_id,
    before_json, after_json, concept
  ) values (
    v_user,
    TG_TABLE_NAME,
    lower(TG_OP),
    v_row_id,
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('UPDATE','INSERT') then to_jsonb(NEW) else null end,
    v_concept
  );

  if (TG_OP = 'DELETE') then
    return OLD;
  end if;
  return NEW;
end;
$$;

-- ----- Attach trigger to audited tables -----
do $$
declare
  t text;
  audited_tables text[] := array[
    'daily_close', 'pnl_lines', 'purchase_orders', 'staff',
    'menu_items', 'inventory_counts', 'waste_log'
  ];
begin
  foreach t in array audited_tables loop
    execute format('drop trigger if exists %I on %I', t || '_audit_trg', t);
    execute format(
      'create trigger %I after insert or update or delete on %I
        for each row execute function record_audit()',
      t || '_audit_trg', t
    );
  end loop;
end $$;
