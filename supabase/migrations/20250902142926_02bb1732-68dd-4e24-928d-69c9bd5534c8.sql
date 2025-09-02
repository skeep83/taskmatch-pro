-- Add name_ru column to service_categories if it doesn't exist
ALTER TABLE public.service_categories 
ADD COLUMN IF NOT EXISTS name_ru TEXT;

-- Update existing data to copy name to name_ru if name_ru is empty
UPDATE public.service_categories 
SET name_ru = name 
WHERE name_ru IS NULL AND name IS NOT NULL;

-- Make name_ru NOT NULL after updating
ALTER TABLE public.service_categories 
ALTER COLUMN name_ru SET NOT NULL;

-- Enable RLS for service_categories if not already enabled
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

-- Insert or update default service categories
INSERT INTO public.service_categories (id, name, name_ru, name_ro, icon, is_active) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Сантехника', 'Сантехника', 'Instalații sanitare', 'wrench', true),
('b2c3d4e5-f6g7-8901-bcde-f23456789012', 'Электрика', 'Электрика', 'Electricitate', 'zap', true),
('c3d4e5f6-g7h8-9012-cdef-345678901234', 'Уборка', 'Уборка', 'Curățenie', 'brush', true),
('d4e5f6g7-h8i9-0123-def0-456789012345', 'Ремонт техники', 'Ремонт техники', 'Reparații aparate', 'settings', true),
('e5f6g7h8-i9j0-1234-ef01-567890123456', 'Строительство', 'Строительство', 'Construcții', 'hammer', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ru = EXCLUDED.name_ru,
  name_ro = EXCLUDED.name_ro,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active;

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

-- Create missing tables with RLS policies
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

CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency)
);

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

-- Enable RLS and policies for missing tables
DO $$ 
BEGIN
  -- Job applications RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications') THEN
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

  -- Wallets RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallets') THEN
    ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "wallets_own_select" ON public.wallets
    FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
    
    CREATE POLICY "wallets_admin_modify" ON public.wallets
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  -- Notifications RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "notifications_own_select" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());
    
    CREATE POLICY "notifications_own_update" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());
    
    CREATE POLICY "notifications_service_insert" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;