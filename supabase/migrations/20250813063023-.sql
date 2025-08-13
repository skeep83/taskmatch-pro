-- Security hardening migration

-- 1) Helper functions to avoid RLS recursion and centralize business ownership checks
CREATE OR REPLACE FUNCTION public.is_business_owner(_biz uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_accounts ba
    WHERE ba.id = _biz AND ba.owner_id = _user
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(_biz uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = _biz AND bm.user_id = _user
  );
$$;

-- 2) Tighten subscriptions table (remove permissive policies)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_update_trusted'
  ) THEN
    EXECUTE 'DROP POLICY "subscriptions_update_trusted" ON public.subscriptions';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_upsert_any_trusted'
  ) THEN
    EXECUTE 'DROP POLICY "subscriptions_upsert_any_trusted" ON public.subscriptions';
  END IF;
END $$;

CREATE POLICY "subscriptions_update_admin_or_service"
ON public.subscriptions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR auth.role() = 'service_role');

CREATE POLICY "subscriptions_insert_admin_or_service"
ON public.subscriptions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR auth.role() = 'service_role');

-- 3) Fix business_* policies to use helper functions and correct logic
-- business_accounts
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_accounts' AND policyname='biz_accounts_select_owner_or_member_or_admin'
  ) THEN
    EXECUTE 'DROP POLICY "biz_accounts_select_owner_or_member_or_admin" ON public.business_accounts';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_accounts' AND policyname='biz_accounts_update_owner_or_admin'
  ) THEN
    EXECUTE 'DROP POLICY "biz_accounts_update_owner_or_admin" ON public.business_accounts';
  END IF;
END $$;

CREATE POLICY "biz_accounts_select_owner_or_member_or_admin"
ON public.business_accounts
FOR SELECT
USING (
  public.is_business_owner(id, auth.uid())
  OR public.is_business_member(id, auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "biz_accounts_update_owner_or_admin"
ON public.business_accounts
FOR UPDATE
USING (
  public.is_business_owner(id, auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- business_members
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_members' AND policyname='biz_members_insert_owner_only'
  ) THEN
    EXECUTE 'DROP POLICY "biz_members_insert_owner_only" ON public.business_members';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_members' AND policyname='biz_members_select_self_or_admin'
  ) THEN
    EXECUTE 'DROP POLICY "biz_members_select_self_or_admin" ON public.business_members';
  END IF;
END $$;

CREATE POLICY "biz_members_insert_owner_only"
ON public.business_members
FOR INSERT
WITH CHECK (public.is_business_owner(business_id, auth.uid()));

CREATE POLICY "biz_members_select_self_or_admin"
ON public.business_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR public.is_business_owner(business_id, auth.uid())
);

-- biz_invoices
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='biz_invoices' AND policyname='biz_invoices_insert_owner'
  ) THEN
    EXECUTE 'DROP POLICY "biz_invoices_insert_owner" ON public.biz_invoices';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='biz_invoices' AND policyname='biz_invoices_select_owner_or_member'
  ) THEN
    EXECUTE 'DROP POLICY "biz_invoices_select_owner_or_member" ON public.biz_invoices';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='biz_invoices' AND policyname='biz_invoices_update_owner_or_admin'
  ) THEN
    EXECUTE 'DROP POLICY "biz_invoices_update_owner_or_admin" ON public.biz_invoices';
  END IF;
END $$;

CREATE POLICY "biz_invoices_insert_owner"
ON public.biz_invoices
FOR INSERT
WITH CHECK (public.is_business_owner(business_id, auth.uid()));

CREATE POLICY "biz_invoices_select_owner_or_member"
ON public.biz_invoices
FOR SELECT
USING (
  public.is_business_owner(business_id, auth.uid())
  OR public.is_business_member(business_id, auth.uid())
);

CREATE POLICY "biz_invoices_update_owner_or_admin"
ON public.biz_invoices
FOR UPDATE
USING (
  public.is_business_owner(business_id, auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- business_jobs
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_jobs' AND policyname='biz_jobs_insert_owner_or_member'
  ) THEN
    EXECUTE 'DROP POLICY "biz_jobs_insert_owner_or_member" ON public.business_jobs';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_jobs' AND policyname='biz_jobs_select_owner_or_member'
  ) THEN
    EXECUTE 'DROP POLICY "biz_jobs_select_owner_or_member" ON public.business_jobs';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_jobs' AND policyname='biz_jobs_delete_owner_or_member'
  ) THEN
    EXECUTE 'DROP POLICY "biz_jobs_delete_owner_or_member" ON public.business_jobs';
  END IF;
END $$;

CREATE POLICY "biz_jobs_insert_owner_or_member"
ON public.business_jobs
FOR INSERT
WITH CHECK (
  public.is_business_owner(business_id, auth.uid())
  OR public.is_business_member(business_id, auth.uid())
);

CREATE POLICY "biz_jobs_select_owner_or_member"
ON public.business_jobs
FOR SELECT
USING (
  public.is_business_owner(business_id, auth.uid())
  OR public.is_business_member(business_id, auth.uid())
);

CREATE POLICY "biz_jobs_delete_owner_or_member"
ON public.business_jobs
FOR DELETE
USING (
  public.is_business_owner(business_id, auth.uid())
  OR public.is_business_member(business_id, auth.uid())
);

-- 4) Restrict job claiming to pros and job_photos visibility
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='jobs' AND policyname='jobs_pro_claim'
  ) THEN
    EXECUTE 'DROP POLICY "jobs_pro_claim" ON public.jobs';
  END IF;
END $$;

CREATE POLICY "jobs_pro_claim"
ON public.jobs
FOR UPDATE
USING ((status = 'new'::job_status) AND (pro_id IS NULL) AND has_role(auth.uid(), 'pro'::app_role))
WITH CHECK ((pro_id = auth.uid()) AND (status = ANY (ARRAY['accepted'::job_status, 'in_progress'::job_status])) AND has_role(auth.uid(), 'pro'::app_role));

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='job_photos' AND policyname='job_photos_select_for_new_or_parties_or_admin'
  ) THEN
    EXECUTE 'DROP POLICY "job_photos_select_for_new_or_parties_or_admin" ON public.job_photos';
  END IF;
END $$;

CREATE POLICY "job_photos_select_for_new_or_parties_or_admin"
ON public.job_photos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_photos.job_id
      AND (
        j.client_id = auth.uid()
        OR j.pro_id = auth.uid()
        OR (j.status = 'new'::job_status AND has_role(auth.uid(), 'pro'::app_role))
        OR has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

-- 5) Storage policies for private buckets (kyc, biz_docs)
-- KYC: only the owner (first path segment is user_id)
CREATE POLICY IF NOT EXISTS "storage_kyc_owner_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kyc'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "storage_kyc_owner_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kyc'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "storage_kyc_owner_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'kyc'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "storage_kyc_owner_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'kyc'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- biz_docs: business owner or member; folder root is business_id (uuid)
CREATE POLICY IF NOT EXISTS "storage_biz_docs_member_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'biz_docs'
  AND (
    public.is_business_owner(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_business_member(((storage.foldername(name))[1])::uuid, auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY IF NOT EXISTS "storage_biz_docs_member_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'biz_docs'
  AND (
    public.is_business_owner(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_business_member(((storage.foldername(name))[1])::uuid, auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY IF NOT EXISTS "storage_biz_docs_member_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'biz_docs'
  AND (
    public.is_business_owner(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_business_member(((storage.foldername(name))[1])::uuid, auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY IF NOT EXISTS "storage_biz_docs_member_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'biz_docs'
  AND (
    public.is_business_owner(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_business_member(((storage.foldername(name))[1])::uuid, auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
