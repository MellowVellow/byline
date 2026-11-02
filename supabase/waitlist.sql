-- Waitlist storage for Landing "Join waitlist".
-- The FastAPI backend writes with SUPABASE_SERVICE_KEY (service role),
-- which bypasses RLS. Browsers never talk to this table directly.

create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- No anon/authenticated policies: direct client writes are not allowed.
drop policy if exists "anon insert waitlist" on public.waitlist;

alter table public.waitlist drop constraint if exists waitlist_email_len;
alter table public.waitlist add constraint waitlist_email_len
  check (char_length(email) between 3 and 320);

alter table public.waitlist drop constraint if exists waitlist_note_len;
alter table public.waitlist add constraint waitlist_note_len
  check (char_length(note) <= 500);

-- The server-side service role performs inserts; browsers have no access.
grant select, insert on public.waitlist to service_role;
grant usage, select on sequence public.waitlist_id_seq to service_role;
revoke all on public.waitlist from anon, authenticated;
