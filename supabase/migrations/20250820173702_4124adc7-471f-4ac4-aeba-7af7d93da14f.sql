-- Update existing tables to match geolocation requirements

-- First check if we have location columns in profiles table and add them if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'latitude') THEN
        ALTER TABLE public.profiles ADD COLUMN latitude DECIMAL(10, 8);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'longitude') THEN
        ALTER TABLE public.profiles ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'city') THEN
        ALTER TABLE public.profiles ADD COLUMN city TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'country') THEN
        ALTER TABLE public.profiles ADD COLUMN country TEXT DEFAULT 'RO';
    END IF;
END $$;

-- Add location data to jobs table if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'location_lat') THEN
        ALTER TABLE public.jobs ADD COLUMN location_lat DECIMAL(10, 8);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'location_lng') THEN
        ALTER TABLE public.jobs ADD COLUMN location_lng DECIMAL(11, 8);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'location_address') THEN
        ALTER TABLE public.jobs ADD COLUMN location_address TEXT;
    END IF;
END $$;

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('job_match', 'job_update', 'payment', 'message', 'rating', 'system')),
  title TEXT NOT NULL,
  title_ro TEXT,
  message TEXT NOT NULL,
  message_ro TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user devices table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('web', 'ios', 'android')),
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_token)
);

-- Create service categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ro TEXT NOT NULL,
  description TEXT,
  description_ro TEXT,
  icon TEXT,
  parent_id UUID REFERENCES public.service_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create pro services table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.pro_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.service_categories(id),
  base_price_cents INTEGER,
  hourly_rate_cents INTEGER,
  coverage_radius_km INTEGER DEFAULT 10,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT true,
  response_time_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
DO $$
BEGIN
    -- Enable RLS on notifications if not already enabled
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notifications' AND rowsecurity = true) THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on user_devices if not already enabled
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_devices' AND rowsecurity = true) THEN
        ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on service_categories if not already enabled
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'service_categories' AND rowsecurity = true) THEN
        ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on pro_services if not already enabled
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'pro_services' AND rowsecurity = true) THEN
        ALTER TABLE public.pro_services ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies for new tables
-- Notifications - users see their own
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- User devices - users manage their own
DROP POLICY IF EXISTS "user_devices_select" ON public.user_devices;
CREATE POLICY "user_devices_select" ON public.user_devices FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_devices_insert" ON public.user_devices;
CREATE POLICY "user_devices_insert" ON public.user_devices FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_devices_update" ON public.user_devices;
CREATE POLICY "user_devices_update" ON public.user_devices FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_devices_delete" ON public.user_devices;
CREATE POLICY "user_devices_delete" ON public.user_devices FOR DELETE USING (auth.uid() = user_id);

-- Service categories - public read
DROP POLICY IF EXISTS "service_categories_select" ON public.service_categories;
CREATE POLICY "service_categories_select" ON public.service_categories FOR SELECT USING (is_active = true);

-- Pro services - pros can manage their own
DROP POLICY IF EXISTS "pro_services_select" ON public.pro_services;
CREATE POLICY "pro_services_select" ON public.pro_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "pro_services_insert" ON public.pro_services;
CREATE POLICY "pro_services_insert" ON public.pro_services FOR INSERT WITH CHECK (auth.uid() = pro_id);

DROP POLICY IF EXISTS "pro_services_update" ON public.pro_services;
CREATE POLICY "pro_services_update" ON public.pro_services FOR UPDATE USING (auth.uid() = pro_id);

DROP POLICY IF EXISTS "pro_services_delete" ON public.pro_services;
CREATE POLICY "pro_services_delete" ON public.pro_services FOR DELETE USING (auth.uid() = pro_id);

-- Create indexes for geolocation performance
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles USING GIST (
  POINT(longitude, latitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_location_new ON public.jobs USING GIST (
  POINT(location_lng, location_lat)
) WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pro_services_location ON public.pro_services USING GIST (
  POINT(location_lng, location_lat)
) WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at);

-- Seed service categories if empty
INSERT INTO public.service_categories (name, name_ro, description, description_ro, icon) 
SELECT * FROM (VALUES
('Сантехника', 'Instalații sanitare', 'Ремонт труб, установка смесителей', 'Reparații țevi, instalare robinete', '🔧'),
('Электрика', 'Electricitate', 'Электромонтаж, ремонт проводки', 'Instalații electrice, reparații', '⚡'),
('Уборка', 'Curățenie', 'Генеральная уборка помещений', 'Curățenie generală încăperi', '🧹'),
('Курьер', 'Curier', 'Доставка документов и посылок', 'Livrare documente și colete', '📦'),
('Ремонт техники', 'Reparații electronice', 'Ремонт бытовой техники', 'Reparații electrocasnice', '🔨'),
('Строительство', 'Construcții', 'Общестроительные работы', 'Lucrări generale de construcții', '🏗️'),
('Автосервис', 'Service auto', 'Ремонт и обслуживание авто', 'Reparații și întreținere auto', '🚗'),
('Красота', 'Frumusețe', 'Парикмахерские услуги на дому', 'Servicii de coafură la domiciliu', '💄')
) AS new_categories(name, name_ro, description, description_ro, icon)
WHERE NOT EXISTS (SELECT 1 FROM public.service_categories LIMIT 1);

-- Enable realtime for notifications
DO $$
BEGIN
    -- Check if table already has replica identity
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        WHERE c.relname = 'notifications' 
        AND c.relreplident = 'f'
    ) THEN
        ALTER TABLE public.notifications REPLICA IDENTITY FULL;
    END IF;
END $$;

-- Add to realtime publication
DO $$
BEGIN
    -- Add notifications table to realtime publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
    
    -- Add jobs table to realtime publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'jobs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
    END IF;
END $$;