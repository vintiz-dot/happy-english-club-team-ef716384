create table public.schedule_runner (
  id int primary key default 1,
  token text not null,
  updated_at timestamptz not null default now()
);
alter table public.schedule_runner enable row level security;
revoke all on public.schedule_runner from anon, authenticated, public;
insert into public.schedule_runner (id, token) values (1, encode(gen_random_bytes(32), 'hex'));