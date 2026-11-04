-- Usage rollup tables for creator dashboard + multi-instance accounting.
-- The FastAPI backend (or usage_sync.py cron) writes with SUPABASE_SERVICE_KEY
-- (service role), which bypasses RLS. Browsers never talk to these tables directly.
-- Raw IPs are never stored here: per-IP rows key on sha256(ip) so long-term
-- retention stays privacy-safe. Raw per-IP view remains GET /api/metrics/usage
-- (ADMIN_TOKEN gated, SQLite hot path).

-- Time-bucketed traffic: one row per (hour, endpoint, provider).
create table if not exists public.usage_hourly (
  hour timestamptz not null,
  endpoint text not null default '',
  provider text not null default '',
  requests bigint not null default 0,
  tok_in bigint not null default 0,
  tok_out bigint not null default 0,
  tok_reasoning bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (hour, endpoint, provider)
);

-- Per-IP daily rollup (hashed): one row per (day, ip_hash, endpoint, provider).
create table if not exists public.usage_daily (
  day date not null,
  ip_hash text not null,
  endpoint text not null default '',
  provider text not null default '',
  requests bigint not null default 0,
  tok_in bigint not null default 0,
  tok_out bigint not null default 0,
  tok_reasoning bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, ip_hash, endpoint, provider)
);

alter table public.usage_hourly enable row level security;
alter table public.usage_daily enable row level security;

-- No anon/authenticated policies: direct client writes/reads are not allowed.
drop policy if exists "anon read usage_hourly" on public.usage_hourly;
drop policy if exists "anon read usage_daily" on public.usage_daily;

-- Server-side service role performs upserts + reads; browsers have no access.
grant select, insert, update on public.usage_hourly to service_role;
grant select, insert, update on public.usage_daily to service_role;
revoke all on public.usage_hourly from anon, authenticated;
revoke all on public.usage_daily from anon, authenticated;

-- Creator queries (run with service role):
--   total traffic: SELECT sum(requests), sum(tok_in+tok_out+tok_reasoning) FROM usage_hourly WHERE hour >= now() - interval '24 hours';
--   distinct IPs:  SELECT count(DISTINCT ip_hash) FROM usage_daily WHERE day >= current_date - 30;
--   by endpoint:   SELECT endpoint, sum(requests), sum(tok_in+tok_out+tok_reasoning) FROM usage_hourly GROUP BY 1 ORDER BY 2 DESC;
