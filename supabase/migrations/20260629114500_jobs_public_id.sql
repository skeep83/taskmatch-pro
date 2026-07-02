-- Add human-friendly public identifier for jobs/orders

CREATE SEQUENCE IF NOT EXISTS public.job_public_id_seq START WITH 1000;

CREATE OR REPLACE FUNCTION public.generate_job_public_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num bigint;
BEGIN
  next_num := nextval('public.job_public_id_seq');
  RETURN 'JOB-' || lpad(next_num::text, 6, '0');
END;
$$;

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS public_id text;

SELECT setval(
  'public.job_public_id_seq',
  GREATEST(
    COALESCE(
      (
        SELECT max(
          CASE
            WHEN public_id ~ '^JOB-[0-9]+$' THEN substring(public_id FROM '[0-9]+$')::bigint
            ELSE NULL
          END
        )
        FROM public.jobs
      ),
      999
    ),
    999
  ),
  true
);

ALTER TABLE public.jobs
ALTER COLUMN public_id SET DEFAULT public.generate_job_public_id();

UPDATE public.jobs
SET public_id = public.generate_job_public_id()
WHERE public_id IS NULL;

ALTER TABLE public.jobs
ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS jobs_public_id_uidx
  ON public.jobs(public_id);
