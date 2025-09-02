-- Add name_ru column to service_categories if it doesn't exist
ALTER TABLE public.service_categories 
ADD COLUMN IF NOT EXISTS name_ru TEXT;

-- Update existing data to copy name to name_ru if name_ru is empty
UPDATE public.service_categories 
SET name_ru = name 
WHERE name_ru IS NULL AND name IS NOT NULL;

-- Create admin role for skeep83@gmail.com if not exists
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

-- Insert default service categories with new UUIDs
INSERT INTO public.service_categories (name, name_ru, name_ro, icon, is_active) VALUES
('Сантехника', 'Сантехника', 'Instalații sanitare', 'wrench', true),
('Электрика', 'Электрика', 'Electricitate', 'zap', true),
('Уборка', 'Уборка', 'Curățenie', 'brush', true),
('Ремонт техники', 'Ремонт техники', 'Reparații aparate', 'settings', true),
('Строительство', 'Строительство', 'Construcții', 'hammer', true)
ON CONFLICT (name) DO UPDATE SET
  name_ru = EXCLUDED.name_ru,
  name_ro = EXCLUDED.name_ro,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active;

-- Create missing tables
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

-- Create missing triggers
CREATE OR REPLACE FUNCTION public.set_updated_at_notifications()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add missing triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_notifications') THEN
    CREATE TRIGGER set_updated_at_notifications 
      BEFORE UPDATE ON public.notifications 
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_notifications();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_wallets') THEN
    CREATE TRIGGER set_updated_at_wallets 
      BEFORE UPDATE ON public.wallets 
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;