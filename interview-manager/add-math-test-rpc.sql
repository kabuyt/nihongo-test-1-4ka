-- Supabase SQL Editor で1回実行する。
-- math-test/ からのオンライン受験結果を interview_candidates.math_score に自動反映するための RPC。
-- submit_vietnamese_score と同型（interview-manager/enable-auth-rls.sql 209-303行あたりを参照）。

create or replace function public.submit_math_score(
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
  set math_score = p_score,
      updated_at = now()
  where interview_id = p_interview_id
    and candidate_no = btrim(p_candidate_no);

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.submit_math_score(uuid, text, numeric) from public;
grant execute on function public.submit_math_score(uuid, text, numeric)
  to anon, authenticated;
