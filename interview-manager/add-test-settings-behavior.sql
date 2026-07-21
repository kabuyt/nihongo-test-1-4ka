-- Enterprise-specific test settings and behavior-test integration.
-- Run once in the shared Supabase project before publishing the paired sites.

begin;

alter table public.interview_sessions
  add column if not exists test_settings jsonb not null default '{
    "kraepelin": true,
    "math": true,
    "vietnamese": true,
    "japanese": true,
    "pinboard": true,
    "behavior": true
  }'::jsonb;

alter table public.behavior_test_results
  add column if not exists interview_id uuid references public.interview_sessions(id) on delete cascade,
  add column if not exists candidate_id uuid references public.interview_candidates(id) on delete cascade;

create index if not exists behavior_test_results_interview_id_idx
  on public.behavior_test_results(interview_id);

create index if not exists behavior_test_results_candidate_id_idx
  on public.behavior_test_results(candidate_id);

-- Remove the old public read/delete policies. Standalone tests can still be
-- submitted anonymously, but results are visible only inside the authenticated
-- pre-test manager.
do $$
declare
  item record;
begin
  for item in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'behavior_test_results'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      item.policyname,
      item.schemaname,
      item.tablename
    );
  end loop;
end $$;

alter table public.behavior_test_results enable row level security;

create policy "anonymous can create standalone behavior results"
  on public.behavior_test_results for insert
  to anon
  with check (interview_id is null and candidate_id is null);

create policy "manager can read allowed behavior results"
  on public.behavior_test_results for select
  to authenticated
  using (
    (interview_id is null and public.is_manager_admin())
    or (interview_id is not null and public.can_access_interview(interview_id))
  );

create policy "admin can delete behavior results"
  on public.behavior_test_results for delete
  to authenticated
  using (public.is_manager_admin());

create or replace function public.get_interview_candidate_for_test(
  p_interview_id uuid,
  p_candidate_no text,
  p_test_key text
)
returns table(candidate_name text, company_name text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select c.name, s.company
  from public.interview_candidates c
  join public.interview_sessions s on s.id = c.interview_id
  where c.interview_id = p_interview_id
    and c.candidate_no = btrim(p_candidate_no)
    and coalesce((s.test_settings ->> p_test_key)::boolean, false)
  limit 1;
$$;

create or replace function public.submit_interview_behavior_result(
  p_interview_id uuid,
  p_candidate_no text,
  p_q1 smallint,
  p_q2 smallint,
  p_q3 smallint,
  p_q4 smallint,
  p_q5 smallint,
  p_q6 smallint,
  p_duration_seconds integer,
  p_user_agent text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_candidate public.interview_candidates%rowtype;
  selected_company text;
  inserted_id uuid;
begin
  if p_candidate_no is null or btrim(p_candidate_no) = '' then
    raise exception 'Invalid candidate';
  end if;

  if p_duration_seconds is null or p_duration_seconds < 0 or p_duration_seconds > 900 then
    raise exception 'Invalid duration';
  end if;

  if exists (
    select 1
    from unnest(array[p_q1, p_q2, p_q3, p_q4, p_q5, p_q6]) as answers(answer)
    where answer is not null and (answer < 1 or answer > 4)
  ) then
    raise exception 'Invalid answer';
  end if;

  select c.*
  into selected_candidate
  from public.interview_candidates c
  join public.interview_sessions s on s.id = c.interview_id
  where c.interview_id = p_interview_id
    and c.candidate_no = btrim(p_candidate_no)
    and coalesce((s.test_settings ->> 'behavior')::boolean, false)
  limit 1;

  if selected_candidate.id is null then
    raise exception 'Candidate or test setting not found';
  end if;

  select company into selected_company
  from public.interview_sessions
  where id = p_interview_id;

  insert into public.behavior_test_results (
    company_name,
    candidate_name,
    candidate_number,
    job_type,
    q1, q2, q3, q4, q5, q6,
    duration_seconds,
    user_agent,
    notes,
    interview_id,
    candidate_id
  ) values (
    selected_company,
    coalesce(nullif(selected_candidate.name, ''), 'No.' || selected_candidate.candidate_no),
    selected_candidate.candidate_no,
    '特定技能',
    p_q1, p_q2, p_q3, p_q4, p_q5, p_q6,
    p_duration_seconds,
    p_user_agent,
    p_notes,
    p_interview_id,
    selected_candidate.id
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

revoke all on function public.get_interview_candidate_for_test(uuid, text, text) from public;
revoke all on function public.submit_interview_behavior_result(
  uuid, text, smallint, smallint, smallint, smallint, smallint, smallint,
  integer, text, text
) from public;

grant execute on function public.get_interview_candidate_for_test(uuid, text, text)
  to anon, authenticated;
grant execute on function public.submit_interview_behavior_result(
  uuid, text, smallint, smallint, smallint, smallint, smallint, smallint,
  integer, text, text
) to anon, authenticated;

commit;
