-- Business features: link jobs, invoices, docs, special rates

-- 1) Join table for business -> jobs
CREATE TABLE IF NOT EXISTS public.business_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  job_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id)
);

ALTER TABLE public.business_jobs ENABLE ROW LEVEL SECURITY;

-- Policies: owner or member can manage
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'biz_jobs_select_owner_or_member') THEN
    CREATE POLICY biz_jobs_select_owner_or_member ON public.business_jobs
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.business_accounts ba
        WHERE ba.id = business_id AND (ba.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.business_members bm WHERE bm.business_id = ba.id AND bm.user_id = auth.uid()
        ))
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'biz_jobs_insert_owner_or_member') THEN
    CREATE POLICY biz_jobs_insert_owner_or_member ON public.business_jobs
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.business_accounts ba
        WHERE ba.id = business_id AND (ba.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.business_members bm WHERE bm.business_id = ba.id AND bm.user_id = auth.uid()
        ))
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'biz_jobs_delete_owner_or_member') THEN
    CREATE POLICY biz_jobs_delete_owner_or_member ON public.business_jobs
    FOR DELETE USING (
      EXISTS (
        SELECT 1 FROM public.business_accounts ba
        WHERE ba.id = business_id AND (ba.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.business_members bm WHERE bm.business_id = ba.id AND bm.user_id = auth.uid()
        ))
      )
    );
  END IF;
END $$;

-- 2) Add special rate and contract url to business_accounts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'business_accounts' AND column_name = 'rate_multiplier'
  ) THEN
    ALTER TABLE public.business_accounts ADD COLUMN rate_multiplier NUMERIC NOT NULL DEFAULT 1.0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'business_accounts' AND column_name = 'contract_url'
  ) THEN
    ALTER TABLE public.business_accounts ADD COLUMN contract_url TEXT;
  END IF;
END $$;

-- 3) Invoices
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE public.invoice_status AS ENUM ('draft','sent','paid','canceled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.biz_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status public.invoice_status NOT NULL DEFAULT 'draft',
  pdf_url TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.biz_invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'biz_invoices_select_owner_or_member') THEN
    CREATE POLICY biz_invoices_select_owner_or_member ON public.biz_invoices
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.business_accounts ba
        WHERE ba.id = business_id AND (ba.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.business_members bm WHERE bm.business_id = ba.id AND bm.user_id = auth.uid()
        ))
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'biz_invoices_insert_owner') THEN
    CREATE POLICY biz_invoices_insert_owner ON public.biz_invoices
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.business_accounts ba
        WHERE ba.id = business_id AND ba.owner_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'biz_invoices_update_owner_or_admin') THEN
    CREATE POLICY biz_invoices_update_owner_or_admin ON public.biz_invoices
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.business_accounts ba
        WHERE ba.id = business_id AND (ba.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_biz_invoices') THEN
    CREATE TRIGGER set_updated_at_biz_invoices BEFORE UPDATE ON public.biz_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 4) Storage bucket for business documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('biz_docs', 'biz_docs', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage.objects
DO $$ BEGIN
  -- Read: owner or member of the business folder
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'biz_docs_read' AND schemaname = 'storage' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "biz_docs_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'biz_docs' AND EXISTS (
        SELECT 1 FROM public.business_accounts ba
        WHERE ba.id::text = (storage.foldername(name))[1]
          AND (ba.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.business_members bm WHERE bm.business_id = ba.id AND bm.user_id = auth.uid()
          ))
      )
    );
  END IF;
  -- Insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'biz_docs_insert' AND schemaname = 'storage' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "biz_docs_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'biz_docs' AND EXISTS (
        SELECT 1 FROM public.business_accounts ba
        WHERE ba.id::text = (storage.foldername(name))[1]
          AND (ba.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.business_members bm WHERE bm.business_id = ba.id AND bm.user_id = auth.uid()
          ))
      )
    );
  END IF;
  -- Update
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'biz_docs_update' AND schemaname = 'storage' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "biz_docs_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'biz_docs' AND EXISTS (
        SELECT 1 FROM public.business_accounts ba
        WHERE ba.id::text = (storage.foldername(name))[1]
          AND (ba.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.business_members bm WHERE bm.business_id = ba.id AND bm.user_id = auth.uid()
          ))
      )
    )
    WITH CHECK (
      bucket_id = 'biz_docs' AND EXISTS (
        SELECT 1 FROM public.business_accounts ba
        WHERE ba.id::text = (storage.foldername(name))[1]
          AND (ba.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.business_members bm WHERE bm.business_id = ba.id AND bm.user_id = auth.uid()
          ))
      )
    );
  END IF;
  -- Delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'biz_docs_delete' AND schemaname = 'storage' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "biz_docs_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'biz_docs' AND EXISTS (
        SELECT 1 FROM public.business_accounts ba
        WHERE ba.id::text = (storage.foldername(name))[1]
          AND (ba.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.business_members bm WHERE bm.business_id = ba.id AND bm.user_id = auth.uid()
          ))
      )
    );
  END IF;
END $$;
