create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  note text default '',
  created_at timestamptz default now()
);
alter table public.waitlist enable row level security;
create policy "anon insert waitlist" on public.waitlist for insert to anon with check (true);
