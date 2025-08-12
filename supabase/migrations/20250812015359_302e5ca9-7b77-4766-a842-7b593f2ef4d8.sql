-- Relax SELECT policy to allow pros to see photos of NEW jobs
DO $$ BEGIN
  EXECUTE 'drop policy job_photos_select_by_job_access on public.job_photos';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

create policy job_photos_select_for_new_or_parties_or_admin
on public.job_photos
for select
using (
  exists (
    select 1 from public.jobs j
    where j.id = job_photos.job_id
      and (
        j.status = 'new'::job_status
        or j.client_id = auth.uid()
        or j.pro_id = auth.uid()
        or has_role(auth.uid(), 'admin'::app_role)
      )
  )
);
