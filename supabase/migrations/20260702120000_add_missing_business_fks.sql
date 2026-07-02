-- Add missing foreign keys so PostgREST embedded joins
-- (business_jobs -> jobs, business_members -> profiles) work.
-- Without these constraints the Business dashboard queries fail at runtime.

-- Clean up orphan rows first so the constraints can be applied safely
DELETE FROM public.business_jobs bj
WHERE NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = bj.job_id);

DELETE FROM public.business_jobs bj
WHERE NOT EXISTS (SELECT 1 FROM public.business_accounts b WHERE b.id = bj.business_id);

DELETE FROM public.business_members bm
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = bm.user_id);

DELETE FROM public.business_members bm
WHERE NOT EXISTS (SELECT 1 FROM public.business_accounts b WHERE b.id = bm.business_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_jobs_job_id_fkey') THEN
    ALTER TABLE public.business_jobs
      ADD CONSTRAINT business_jobs_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_jobs_business_id_fkey') THEN
    ALTER TABLE public.business_jobs
      ADD CONSTRAINT business_jobs_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES public.business_accounts(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_members_user_id_fkey') THEN
    ALTER TABLE public.business_members
      ADD CONSTRAINT business_members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_members_business_id_fkey') THEN
    ALTER TABLE public.business_members
      ADD CONSTRAINT business_members_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES public.business_accounts(id) ON DELETE CASCADE;
  END IF;
END $$;
