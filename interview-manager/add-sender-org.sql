-- Add sending organization ownership to existing interview sessions.
-- Run once in Supabase SQL Editor before using sender-specific logins.

alter table public.interview_sessions
  add column if not exists sender_org text not null default 'BARAEN';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'interview_sessions_sender_org_check'
  ) then
    alter table public.interview_sessions
      add constraint interview_sessions_sender_org_check
      check (sender_org in ('BARAEN', 'AKANE', 'VJC'));
  end if;
end $$;

create index if not exists interview_sessions_sender_org_idx
  on public.interview_sessions(sender_org);
