-- Create missing service_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ru TEXT NOT NULL,
  name_ro TEXT NOT NULL,
  icon TEXT,
  parent_id UUID REFERENCES public.service_categories(id),
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS only if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_categories' AND policyname = 'service_categories_public_select') THEN
    ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "service_categories_public_select" ON public.service_categories
    FOR SELECT USING (true);
    
    CREATE POLICY "service_categories_admin_insert" ON public.service_categories
    FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
    
    CREATE POLICY "service_categories_admin_update" ON public.service_categories
    FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
    
    CREATE POLICY "service_categories_admin_delete" ON public.service_categories
    FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Insert default service categories
INSERT INTO public.service_categories (id, name_ru, name_ro, icon, sort_order) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Сантехника', 'Instalații sanitare', 'wrench', 1),
('b2c3d4e5-f6g7-8901-bcde-f23456789012', 'Электрика', 'Electricitate', 'zap', 2),
('c3d4e5f6-g7h8-9012-cdef-345678901234', 'Уборка', 'Curățenie', 'brush', 3),
('d4e5f6g7-h8i9-0123-def0-456789012345', 'Ремонт техники', 'Reparații aparate', 'settings', 4),
('e5f6g7h8-i9j0-1234-ef01-567890123456', 'Строительство', 'Construcții', 'hammer', 5)
ON CONFLICT (id) DO NOTHING;

-- Create missing pro_rating_stats table if it doesn't exist  
CREATE TABLE IF NOT EXISTS public.pro_rating_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  avg_score NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create admin role if user doesn't have one already
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

-- Create job applications table if missing
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_cents INTEGER NOT NULL,
  eta_slot TEXT,
  note TEXT,
  warranty_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, pro_id)
);

-- Enable RLS and create policies for job_applications if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications' AND policyname = 'job_applications_pro_insert') THEN
    ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "job_applications_pro_insert" ON public.job_applications
    FOR INSERT WITH CHECK (pro_id = auth.uid());
    
    CREATE POLICY "job_applications_view_parties_or_admin" ON public.job_applications
    FOR SELECT USING (
      pro_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_applications.job_id AND j.client_id = auth.uid()) OR
      has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END $$;

-- Create wallets table for financial operations
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency)
);

-- Enable RLS and create policies for wallets if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallets' AND policyname = 'wallets_own_select') THEN
    ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "wallets_own_select" ON public.wallets
    FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
    
    CREATE POLICY "wallets_admin_modify" ON public.wallets
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Create notifications table for proper notification system
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Enable RLS and create policies for notifications if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_own_select') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "notifications_own_select" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());
    
    CREATE POLICY "notifications_own_update" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());
    
    CREATE POLICY "notifications_service_insert" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;