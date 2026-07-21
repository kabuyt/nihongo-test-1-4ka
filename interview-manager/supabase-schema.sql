-- Interview manager tables for pre-interview test aggregation.
-- Run this in Supabase SQL Editor before using the shared management site.

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  interview_date date not null,
  company text not null,
  sender_org text not null default 'BARAEN' check (sender_org in ('BARAEN', 'AKANE', 'VJC')),
  test_settings jsonb not null default '{"kraepelin":true,"math":true,"vietnamese":true,"japanese":true,"pinboard":true,"behavior":true}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interview_candidates (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interview_sessions(id) on delete cascade,
  candidate_no text not null,
  name text,
  math_score numeric,
  vietnamese_score numeric,
  japanese_score numeric,
  pin1_ok integer,
  pin1_time numeric,
  pin2_ok integer,
  pin2_time numeric,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (interview_id, candidate_no)
);

create index if not exists interview_candidates_interview_id_idx
  on public.interview_candidates(interview_id);

create index if not exists interview_sessions_sender_org_idx
  on public.interview_sessions(sender_org);

alter table public.interview_sessions enable row level security;
alter table public.interview_candidates enable row level security;

-- RLS is intentionally default-deny here. After creating the Auth users,
-- run enable-auth-rls.sql to install the manager and anonymous-test policies.
