create or replace function public.is_job_locked_state(
  _status public.job_status,
  _pro_id uuid,
  _job_id uuid
)
returns boolean
language sql
stable
as $$
  select public.is_job_locked_state(_status::text, _pro_id, _job_id);
$$;
