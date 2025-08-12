-- Allow PROs to claim new jobs by setting themselves as pro_id and moving status to accepted
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='jobs_pro_claim') THEN
    CREATE POLICY jobs_pro_claim ON public.jobs
    FOR UPDATE
    USING (status = 'new' AND pro_id IS NULL)
    WITH CHECK (pro_id = auth.uid() AND status IN ('accepted','in_progress'));
  END IF;
END $$;