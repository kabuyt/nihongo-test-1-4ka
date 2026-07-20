-- Restrict candidate deletion to the GROP administrator.
-- Run once when upgrading an existing Auth + RLS installation.

begin;

drop policy if exists "manager can delete allowed candidates"
  on public.interview_candidates;
drop policy if exists "admin can delete candidates"
  on public.interview_candidates;

create policy "admin can delete candidates"
  on public.interview_candidates for delete
  to authenticated
  using (public.is_manager_admin());

commit;
