-- Add missing columns to service_categories if they don't exist
ALTER TABLE public.service_categories 
ADD COLUMN IF NOT EXISTS name_ru TEXT;

ALTER TABLE public.service_categories 
ADD COLUMN IF NOT EXISTS name_ro TEXT;

ALTER TABLE public.service_categories 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing data to copy name to name_ru if name_ru is empty
UPDATE public.service_categories 
SET name_ru = name 
WHERE name_ru IS NULL AND name IS NOT NULL;

-- Enable RLS for service_categories if not already enabled
DO $$ 
BEGIN
  -- Enable RLS if not already enabled
  BEGIN
    ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN duplicate_object THEN
      NULL; -- RLS already enabled
  END;
  
  -- Create policies if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_categories' AND policyname = 'service_categories_public_select') THEN
    CREATE POLICY "service_categories_public_select" ON public.service_categories
    FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_categories' AND policyname = 'service_categories_admin_insert') THEN
    CREATE POLICY "service_categories_admin_insert" ON public.service_categories
    FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_categories' AND policyname = 'service_categories_admin_update') THEN
    CREATE POLICY "service_categories_admin_update" ON public.service_categories
    FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_categories' AND policyname = 'service_categories_admin_delete') THEN
    CREATE POLICY "service_categories_admin_delete" ON public.service_categories
    FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Create admin role for skeep83@gmail.com
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'skeep83@gmail.com';
  
  IF user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES
    (user_id, 'client'::app_role),
    (user_id, 'pro'::app_role), 
    (user_id, 'business'::app_role),
    (user_id, 'admin'::app_role),
    (user_id, 'superadmin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- Create missing tables
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  pro_id UUID NOT NULL,
  price_cents INTEGER NOT NULL,
  eta_slot TEXT,
  note TEXT,
  warranty_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, pro_id)
);

CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ro TEXT,
  message TEXT NOT NULL,
  message_ro TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create any missing posts table for feed functionality
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  city TEXT,
  category_id UUID,
  is_published BOOLEAN DEFAULT true,
  visibility TEXT DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create any missing disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID,
  claimant_id UUID NOT NULL,
  respondent_id UUID,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tenders table if missing
CREATE TABLE IF NOT EXISTS public.tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID,
  status TEXT DEFAULT 'open',
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create portfolio items table if missing
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and policies for all tables
DO $$ 
BEGIN
  -- Job applications RLS
  BEGIN
    ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
  END;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications' AND policyname = 'job_applications_pro_insert') THEN
    CREATE POLICY "job_applications_pro_insert" ON public.job_applications
    FOR INSERT WITH CHECK (pro_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications' AND policyname = 'job_applications_view_parties_or_admin') THEN
    CREATE POLICY "job_applications_view_parties_or_admin" ON public.job_applications
    FOR SELECT USING (
      pro_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_applications.job_id AND j.client_id = auth.uid()) OR
      has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;

  -- Wallets RLS
  BEGIN
    ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
  END;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallets' AND policyname = 'wallets_own_select') THEN
    CREATE POLICY "wallets_own_select" ON public.wallets
    FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallets' AND policyname = 'wallets_admin_modify') THEN
    CREATE POLICY "wallets_admin_modify" ON public.wallets
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  -- Notifications RLS
  BEGIN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
  END;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_own_select') THEN
    CREATE POLICY "notifications_own_select" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_own_update') THEN
    CREATE POLICY "notifications_own_update" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_service_insert') THEN
    CREATE POLICY "notifications_service_insert" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  -- Posts RLS
  BEGIN
    ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
  END;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'posts_public_select') THEN
    CREATE POLICY "posts_public_select" ON public.posts
    FOR SELECT USING (visibility = 'public' OR author_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'posts_author_insert') THEN
    CREATE POLICY "posts_author_insert" ON public.posts
    FOR INSERT WITH CHECK (author_id = auth.uid());
  END IF;
  
  -- Post photos RLS
  BEGIN
    ALTER TABLE public.post_photos ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
  END;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_photos' AND policyname = 'post_photos_public_select') THEN
    CREATE POLICY "post_photos_public_select" ON public.post_photos
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_photos.post_id AND (p.visibility = 'public' OR p.author_id = auth.uid()))
    );
  END IF;
  
  -- Disputes RLS
  BEGIN
    ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
  END;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'disputes' AND policyname = 'disputes_parties_or_admin') THEN
    CREATE POLICY "disputes_parties_or_admin" ON public.disputes
    FOR SELECT USING (
      claimant_id = auth.uid() OR 
      respondent_id = auth.uid() OR 
      has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
  
  -- Tenders RLS
  BEGIN
    ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
  END;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenders' AND policyname = 'tenders_public_select') THEN
    CREATE POLICY "tenders_public_select" ON public.tenders
    FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenders' AND policyname = 'tenders_client_insert') THEN
    CREATE POLICY "tenders_client_insert" ON public.tenders
    FOR INSERT WITH CHECK (client_id = auth.uid());
  END IF;
  
  -- Portfolio items RLS
  BEGIN
    ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
  END;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_items' AND policyname = 'portfolio_items_public_select') THEN
    CREATE POLICY "portfolio_items_public_select" ON public.portfolio_items
    FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_items' AND policyname = 'portfolio_items_pro_insert') THEN
    CREATE POLICY "portfolio_items_pro_insert" ON public.portfolio_items
    FOR INSERT WITH CHECK (pro_id = auth.uid());
  END IF;
END $$;