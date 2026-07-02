create or replace function public.delete_client_job(_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _owner uuid;
  _paths text[];
begin
  select client_id into _owner
  from public.jobs
  where id = _job_id;

  if _owner is null then
    raise exception 'Job not found';
  end if;

  if auth.uid() is distinct from _owner and not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Not authorized to delete this job';
  end if;

  if exists (
    select 1
    from public.jobs
    where id = _job_id
      and not public.can_client_edit_job_status(status_new)
  ) then
    raise exception 'Job can no longer be deleted in its current state';
  end if;

  select coalesce(array_agg(file_url), '{}') into _paths
  from public.job_photos
  where job_id = _job_id;

  delete from public.job_photos where job_id = _job_id;
  delete from public.job_applications where job_id = _job_id;
  delete from public.job_price_proposals where job_id = _job_id;
  delete from public.job_responses where job_id = _job_id;
  delete from public.jobs where id = _job_id;

  if array_length(_paths, 1) is not null then
    delete from storage.objects
    where bucket_id = 'evidence'
      and name = any(_paths);
  end if;
end;
$$;

grant execute on function public.delete_client_job(uuid) to authenticated;
