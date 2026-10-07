-- ============================================================
-- ACOUSTIC — Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Users (extends auth.users)
create table if not exists public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  plan            text not null default 'free',
  -- legacy onboarding fields (kept for backwards compat)
  platform        text,
  content_type    text,
  goal            text,
  -- new onboarding v2 fields
  persona         text,
  username        text unique,
  full_name       text,
  avatar_url      text,
  birthdate       date,
  genres          text[]   default '{}',
  initial_prompt  text,
  created_at      timestamptz default now()
);

-- Migration: add new columns to existing deployments
alter table public.users add column if not exists persona        text;
alter table public.users add column if not exists username       text unique;
alter table public.users add column if not exists full_name      text;
alter table public.users add column if not exists avatar_url     text;
alter table public.users add column if not exists birthdate      date;
alter table public.users add column if not exists genres         text[] default '{}';
alter table public.users add column if not exists initial_prompt text;
alter table public.users add column if not exists use_cases       text[] default '{}';

-- Generations
create table if not exists public.generations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.users(id) on delete cascade,
  prompt        text,
  preset        text,
  provider      text default 'suno',   -- "suno" | "elevenlabs" | "stable-audio"
  mode          text default 'music',  -- "music" | "sfx" | "tts" | "s2s" | "stt" | "isolation"
  model         text,
  duration      int,
  input_text    text,                  -- raw text input for TTS
  transcript    text,                  -- output text for STT
  audio_url     text,
  watermarked   boolean default true,
  suno_task_id  text,
  suno_track_id text,
  metadata      jsonb,                 -- flexible per-mode data (voiceId, language, etc.)
  created_at    timestamptz default now()
);

-- Migration: add new columns to existing deployments
alter table public.generations add column if not exists provider      text default 'suno';
alter table public.generations add column if not exists suno_task_id  text;
alter table public.generations add column if not exists suno_track_id text;
alter table public.generations add column if not exists mode          text default 'music';
alter table public.generations add column if not exists input_text    text;    -- raw text input (TTS)
alter table public.generations add column if not exists transcript    text;    -- STT output
alter table public.generations add column if not exists metadata      jsonb;   -- flexible per-mode data
create index if not exists idx_generations_user_date
  on public.generations (user_id, created_at);

-- Subscriptions
create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.users(id) on delete cascade,
  stripe_sub_id       text unique,
  plan                text not null,
  status              text not null default 'active',
  current_period_end  timestamptz,
  created_at          timestamptz default now()
);

-- Token balances
create table if not exists public.tokens (
  user_id    uuid primary key references public.users(id) on delete cascade,
  balance    int not null default 0,
  updated_at timestamptz default now()
);

-- ── RLS ─────────────────────────────────────────────────────
alter table public.users         enable row level security;
alter table public.generations   enable row level security;
alter table public.subscriptions enable row level security;
alter table public.tokens        enable row level security;

-- Users can only read/update their own row
create policy "users_self" on public.users
  for all using (auth.uid() = id);

-- Users can only see their own generations
create policy "generations_self" on public.generations
  for all using (auth.uid() = user_id);

-- Users can read their own subscription
create policy "subscriptions_self" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Users can read their own token balance
create policy "tokens_self" on public.tokens
  for select using (auth.uid() = user_id);

-- Service role bypasses RLS for webhook handler (automatic with service role key)

-- ── Helper function for token top-ups ───────────────────────
create or replace function increment_tokens(p_user_id uuid, p_amount int)
returns void language plpgsql security definer as $$
begin
  insert into public.tokens (user_id, balance)
  values (p_user_id, p_amount)
  on conflict (user_id)
  do update set balance = tokens.balance + p_amount,
                updated_at = now();
end;
$$;

-- ── Trigger: auto-create user row on signup ──────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, plan)
  values (new.id, new.email, 'free')
  on conflict (id) do nothing;

  insert into public.tokens (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ── Editor: edited audio outputs ─────────────────────────────────────────────

create table if not exists public.edited_audio (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users(id) on delete cascade,
  source_type  text not null,                       -- "generated" | "uploaded"
  source_id    uuid references public.generations(id) on delete set null,
  output_url   text not null,
  config_json  jsonb,                               -- editor state (trim, effects, overlays)
  created_at   timestamptz default now()
);

alter table public.edited_audio enable row level security;

create policy "Users manage their edits" on public.edited_audio
  for all using (auth.uid() = user_id);

-- Migration for existing deployments
alter table public.generations add column if not exists mode          text default 'music';
alter table public.generations add column if not exists input_text    text;
alter table public.generations add column if not exists transcript    text;
alter table public.generations add column if not exists metadata      jsonb;

-- ── Video jobs (auto-edit + sync) ─────────────────────────────────────────────
--
-- Tracks async video processing jobs; processing itself runs client-side
-- (FFmpeg WASM), so status transitions are:
--   pending → processing (immediately on creation) → done | error
--
create table if not exists public.video_jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users(id) on delete cascade,
  type         text not null check (type in ('auto_edit', 'sync')),
  status       text not null default 'processing'
                 check (status in ('pending', 'processing', 'done', 'error')),
  input_data   jsonb,                        -- style, duration, config snapshot
  output_url   text,                         -- R2 URL of processed video
  error_msg    text,                         -- set when status = 'error'
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.video_jobs enable row level security;

create policy "Users manage their video jobs" on public.video_jobs
  for all using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists video_jobs_updated_at on public.video_jobs;
create trigger video_jobs_updated_at
  before update on public.video_jobs
  for each row execute procedure public.touch_updated_at();

-- Useful index for job list queries
create index if not exists video_jobs_user_created
  on public.video_jobs (user_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
