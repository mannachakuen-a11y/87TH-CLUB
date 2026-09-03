-- ==================================================================
-- THE 87TH CLUB — Supabase (PostgreSQL) schema.
-- Run this in the Supabase SQL editor on a fresh project, then set
-- DRIVER=supabase + SUPABASE_URL / SUPABASE_ANON_KEY (and the service
-- role key on the server) in server/.env. The app switches to Postgres
-- with no code changes — the same repository methods are used.
-- ==================================================================

-- ---------- users + sessions ----------
create table if not exists public.users (
  id text primary key,
  name text not null,
  email text unique not null,
  role text default 'Brand Owner',
  created_at timestamptz default now()
);

create table if not exists public.sessions (
  token text primary key,
  user_id text references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- ---------- projects (project document stored as JSONB) ----------
create table if not exists public.projects (
  id text primary key,
  user_id text references public.users(id) on delete cascade,
  brand_name text,
  industry text,
  market text,
  status text default 'active',
  current_outcome int default 1,
  progress int default 0,
  docs jsonb,       -- the full Project document (framework, findings, brain, etc.)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists projects_user on public.projects(user_id);

-- ---------- integrations + tokens ----------
create table if not exists public.integrations (
  id text primary key,
  provider text,
  name text,
  state text default 'available',
  capabilities jsonb default '[]',
  permissions jsonb default '[]',
  error text,
  last_sync timestamptz
);
create table if not exists public.integration_tokens (
  id text primary key,
  provider text unique,
  encrypted_token text,
  scopes jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- AI usage (private monitoring, no credits) ----------
create table if not exists public.ai_runs (
  id text primary key,
  user_id text references public.users(id) on delete cascade,
  project_id text references public.projects(id) on delete cascade,
  provider text,
  model text,
  task text,
  tokens int default 0,
  cost real default 0,
  ok boolean default false,
  detail jsonb default '{}',
  created_at timestamptz default now()
);

-- ---------- activity + assets + exports ----------
create table if not exists public.activity_logs (
  id text primary key,
  user_id text,
  project_id text,
  actor text,
  type text,
  text text,
  created_at timestamptz default now()
);
create table if not exists public.assets (
  id text primary key,
  user_id text,
  project_id text,
  name text,
  kind text,
  scope text default 'project',
  tags jsonb default '[]',
  favorite boolean default false,
  approved boolean default false,
  path text,
  created_at timestamptz default now()
);
create table if not exists public.exports (
  id text primary key,
  user_id text,
  project_id text,
  kind text,
  format text,
  path text,
  created_at timestamptz default now()
);

-- ---------- Row Level Security ----------
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.ai_runs enable row level security;

-- Users may read/update their own profile.
create policy "own user" on public.users
  for all using (auth.uid()::text = id);

-- Projects: owners can read/write their own. The service role (server)
-- bypasses RLS for admin operations.
create policy "own projects" on public.projects
  for all using (auth.uid()::text = user_id);

-- AI usage visible to owner only.
create policy "own ai_runs" on public.ai_runs
  for all using (auth.uid()::text = user_id);

-- Storage bucket for assets (run in Storage UI, or via SQL below).
insert into storage.buckets (id, name, public) values ('assets', 'assets', true)
  on conflict (id) do nothing;

-- Enable the pgvector extension for semantic retrieval over brand brain /
-- references in production (optional but recommended).
create extension if not exists vector;
