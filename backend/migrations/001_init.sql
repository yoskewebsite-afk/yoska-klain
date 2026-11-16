-- Run once in the Supabase SQL editor (or: supabase db push). Re-running is safe.
-- One generic document table: content (draft/published/revisions), leads, users, sessions, events, media records, audit, backups.
create table if not exists public.kv (
  col text not null,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (col, id)
);
create index if not exists kv_col_created on public.kv (col, created_at desc);

-- The site talks to this table only through the service-role key, on the server.
-- Lock it for every other role (anon / authenticated): no policies = no access.
alter table public.kv enable row level security;

-- Storage buckets (create in the dashboard, or with the statements below):
--   media    public read  (uploaded pictures are public site content)
--   backups  private      (backup files contain leads and password hashes)
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('backups', 'backups', false) on conflict (id) do nothing;
