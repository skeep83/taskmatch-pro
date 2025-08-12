-- Allow authenticated users to discover open jobs (read-only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='jobs_select_open_for_auth') THEN
    CREATE POLICY jobs_select_open_for_auth ON public.jobs
    FOR SELECT
    TO authenticated
    USING (status = 'new');
  END IF;
END $$;