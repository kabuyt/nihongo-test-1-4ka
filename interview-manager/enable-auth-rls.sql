-- Supabase Auth + sender-specific RLS migration for the interview manager.
--
-- Before running:
-- 1. In Authentication > Users, create the four users listed in AUTH-SETUP.md.
-- 2. Run add-sender-org.sql if sender_org has not been added yet.
-- 3. Run this entire file in the Supabase SQL Editor.

begin;

create table if not exists public.manager_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('admin', 'sender')),
  sender_org text check (sender_org in ('BARAEN', 'AKANE', 'VJC')),
  created_at timestamptz not null default now(),
  constraint manager_accounts_role_sender_check check (
    (role = 'admin' and sender_org is null)
    or (role = 'sender' and sender_org is not null)
  )
);

alter table public.manager_accounts enable row level security;

create or replace function public.is_manager_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.manager_accounts
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.current_sender_org()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select sender_org
  from public.manager_accounts
  where user_id = auth.uid()
    and role = 'sender';
$$;

create or replace function public.can_access_interview(p_interview_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_manager_admin()
    or exists (
      select 1
      from public.interview_sessions
      where id = p_interview_id
        and sender_org = public.current_sender_org()
    );
$$;

create or replace function public.can_access_kraepelin_name(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  session_text text;
begin
  if public.is_manager_admin() then
    return true;
  end if;
  if p_name is null or p_name !~* '^session:' then
    return false;
  end if;
  session_text := split_part(substring(p_name from 9), ' / ', 1);
  return public.can_access_interview(session_text::uuid);
exception
  when invalid_text_representation then
    return false;
end;
$$;

revoke all on function public.is_manager_admin() from public;
revoke all on function public.current_sender_org() from public;
revoke all on function public.can_access_interview(uuid) from public;
revoke all on function public.can_access_kraepelin_name(text) from public;
grant execute on function public.is_manager_admin() to authenticated;
grant execute on function public.current_sender_org() to authenticated;
grant execute on function public.can_access_interview(uuid) to authenticated;
grant execute on function public.can_access_kraepelin_name(text) to authenticated;

-- Remove every old policy from the protected tables, including the previous
-- "public can ..." policies. This avoids accidentally leaving an open path.
do $$
declare
  item record;
begin
  for item in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'manager_accounts',
        'interview_sessions',
        'interview_candidates',
        'kraepelin_results'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      item.policyname,
      item.schemaname,
      item.tablename
    );
  end loop;
end $$;

alter table public.interview_sessions enable row level security;
alter table public.interview_candidates enable row level security;
alter table public.kraepelin_results enable row level security;

create policy "account can read itself"
  on public.manager_accounts for select
  to authenticated
  using (user_id = auth.uid());

create policy "manager can read allowed sessions"
  on public.interview_sessions for select
  to authenticated
  using (
    public.is_manager_admin()
    or sender_org = public.current_sender_org()
  );

create policy "admin can create sessions"
  on public.interview_sessions for insert
  to authenticated
  with check (public.is_manager_admin());

create policy "admin can update sessions"
  on public.interview_sessions for update
  to authenticated
  using (public.is_manager_admin())
  with check (public.is_manager_admin());

create policy "admin can delete sessions"
  on public.interview_sessions for delete
  to authenticated
  using (public.is_manager_admin());

create policy "manager can read allowed candidates"
  on public.interview_candidates for select
  to authenticated
  using (public.can_access_interview(interview_id));

create policy "manager can create allowed candidates"
  on public.interview_candidates for insert
  to authenticated
  with check (public.can_access_interview(interview_id));

create policy "manager can update allowed candidates"
  on public.interview_candidates for update
  to authenticated
  using (public.can_access_interview(interview_id))
  with check (public.can_access_interview(interview_id));

create policy "manager can delete allowed candidates"
  on public.interview_candidates for delete
  to authenticated
  using (public.can_access_interview(interview_id));

create policy "manager can read allowed kraepelin results"
  on public.kraepelin_results for select
  to authenticated
  using (public.can_access_kraepelin_name(name));

create policy "manager can update allowed kraepelin results"
  on public.kraepelin_results for update
  to authenticated
  using (public.can_access_kraepelin_name(name))
  with check (public.can_access_kraepelin_name(name));

create policy "manager can delete allowed kraepelin results"
  on public.kraepelin_results for delete
  to authenticated
  using (public.can_access_kraepelin_name(name));

-- Keep the standalone, non-interview Kraepelin test able to save anonymously.
-- Interview submissions must use the restricted RPC below.
create policy "anonymous can create non-interview kraepelin results"
  on public.kraepelin_results for insert
  to anon
  with check (name is null or name !~* '^session:');

create policy "manager can create kraepelin results"
  on public.kraepelin_results for insert
  to authenticated
  with check (true);

create or replace function public.submit_vietnamese_score(
  p_interview_id uuid,
  p_candidate_no text,
  p_score numeric
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected integer;
begin
  if p_candidate_no is null
    or btrim(p_candidate_no) = ''
    or p_score is null
    or p_score < 0
    or p_score > 100 then
    raise exception 'Invalid test result';
  end if;

  update public.interview_candidates
  set vietnamese_score = p_score,
      updated_at = now()
  where interview_id = p_interview_id
    and candidate_no = btrim(p_candidate_no);

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function public.submit_interview_kraepelin_result(
  p_interview_id uuid,
  p_candidate_no text,
  p_started_at timestamptz,
  p_rows_per_half integer,
  p_results jsonb,
  p_judgment_type text,
  p_judgment_score numeric,
  p_avg_correct numeric,
  p_error_rate numeric
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_candidate_no is null
    or btrim(p_candidate_no) = ''
    or p_results is null
    or not exists (
      select 1
      from public.interview_candidates
      where interview_id = p_interview_id
        and candidate_no = btrim(p_candidate_no)
    ) then
    return false;
  end if;

  insert into public.kraepelin_results (
    name,
    started_at,
    rows_per_half,
    results,
    judgment_type,
    judgment_score,
    avg_correct,
    error_rate
  )
  values (
    'session:' || p_interview_id::text || ' / No.' || btrim(p_candidate_no),
    p_started_at,
    p_rows_per_half,
    p_results,
    p_judgment_type,
    p_judgment_score,
    p_avg_correct,
    p_error_rate
  );

  return true;
end;
$$;

revoke all on function public.submit_vietnamese_score(uuid, text, numeric) from public;
revoke all on function public.submit_interview_kraepelin_result(
  uuid, text, timestamptz, integer, jsonb, text, numeric, numeric, numeric
) from public;
grant execute on function public.submit_vietnamese_score(uuid, text, numeric)
  to anon, authenticated;
grant execute on function public.submit_interview_kraepelin_result(
  uuid, text, timestamptz, integer, jsonb, text, numeric, numeric, numeric
) to anon, authenticated;

-- Link the four Auth users to their application permissions.
-- Missing users are simply skipped; create them and rerun this file if needed.
insert into public.manager_accounts (user_id, display_name, role, sender_org)
select id, 'GROP管理者', 'admin', null
from auth.users
where lower(email) = 'grop-admin@nihongo-test.local'
on conflict (user_id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  sender_org = excluded.sender_org;

insert into public.manager_accounts (user_id, display_name, role, sender_org)
select id, 'BARAEN', 'sender', 'BARAEN'
from auth.users
where lower(email) = 'baraen@nihongo-test.local'
on conflict (user_id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  sender_org = excluded.sender_org;

insert into public.manager_accounts (user_id, display_name, role, sender_org)
select id, 'AKANE', 'sender', 'AKANE'
from auth.users
where lower(email) = 'akane@nihongo-test.local'
on conflict (user_id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  sender_org = excluded.sender_org;

insert into public.manager_accounts (user_id, display_name, role, sender_org)
select id, 'VJC', 'sender', 'VJC'
from auth.users
where lower(email) = 'vjc@nihongo-test.local'
on conflict (user_id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  sender_org = excluded.sender_org;

commit;

select display_name, role, sender_org
from public.manager_accounts
order by role, display_name;
