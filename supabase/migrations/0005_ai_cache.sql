-- ============================================================
-- 0005 — AI response cache (M3.3)
--
-- Caches Claude responses keyed on (endpoint, period_start, period_end, concept).
-- Cuts cost when the user clicks "Generate" multiple times in quick succession,
-- and makes the dashboard snappier. 15-min TTL is enforced application-side;
-- a periodic cleanup of stale rows is fine to defer.
-- ============================================================

create table if not exists ai_response_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null,             -- e.g. "weekly-review:2026-04-25:2026-05-02:japonesa"
  endpoint text not null,              -- "weekly-review" | "anomalies" | "monday-digest"
  period_start date not null,
  period_end date not null,
  concept text not null,
  response_json jsonb not null,
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id)
);

create unique index if not exists ai_response_cache_key_uniq on ai_response_cache(cache_key);
create index if not exists ai_response_cache_generated_idx on ai_response_cache(generated_at desc);

-- RLS: owner-only (matches the AI endpoints' ownerOnly gate).
alter table ai_response_cache enable row level security;
drop policy if exists "ai_cache_owner_only" on ai_response_cache;
create policy "ai_cache_owner_only" on ai_response_cache for all
  using (auth_role() = 'owner')
  with check (auth_role() = 'owner');
