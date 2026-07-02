create policy "jobs_select_open_for_public"
on public.jobs
for select
to anon
using (status = 'new'::job_status);
