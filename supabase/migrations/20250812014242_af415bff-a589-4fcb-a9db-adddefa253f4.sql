-- Create table for job applications (offers from pros for jobs)
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  job_id uuid not null,
  pro_id uuid not null,
  price_cents integer not null,
  eta_slot text,
  warranty_days integer,
  note text,
  is_final boolean not null default false,
  unique(job_id, pro_id)
);

-- Enable RLS
alter table public.job_applications enable row level security;

-- Policies (recreate safely)
DO $$ BEGIN
  execute 'drop policy job_applications_insert_pro on public.job_applications';
EXCEPTION WHEN undefined_object THEN null; END $$;
create policy job_applications_insert_pro
on public.job_applications
for insert
with check (pro_id = auth.uid());

DO $$ BEGIN
  execute 'drop policy job_applications_select_pro_or_job_owner_or_admin on public.job_applications';
EXCEPTION WHEN undefined_object THEN null; END $$;
create policy job_applications_select_pro_or_job_owner_or_admin
on public.job_applications
for select
using (
  pro_id = auth.uid()
  or exists (
    select 1 from public.jobs j
    where j.id = job_applications.job_id and j.client_id = auth.uid()
  )
  or has_role(auth.uid(), 'admin'::app_role)
);

DO $$ BEGIN
  execute 'drop policy job_applications_update_pro_or_admin on public.job_applications';
EXCEPTION WHEN undefined_object THEN null; END $$;
create policy job_applications_update_pro_or_admin
on public.job_applications
for update
using (pro_id = auth.uid() or has_role(auth.uid(), 'admin'::app_role))
with check (pro_id = auth.uid() or has_role(auth.uid(), 'admin'::app_role));

DO $$ BEGIN
  execute 'drop policy job_applications_delete_pro_or_admin on public.job_applications';
EXCEPTION WHEN undefined_object THEN null; END $$;
create policy job_applications_delete_pro_or_admin
on public.job_applications
for delete
using (pro_id = auth.uid() or has_role(auth.uid(), 'admin'::app_role));

-- Helpful indexes
create index if not exists idx_job_applications_job on public.job_applications(job_id);
create index if not exists idx_job_applications_pro on public.job_applications(pro_id);
