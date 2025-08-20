-- Create tables for geolocation and smart matching system

-- Categories for services
CREATE TABLE public.service_categories (
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

-- Professional services and coverage areas
CREATE TABLE public.pro_services (
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

-- Jobs/orders with location-based matching
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pro_id UUID REFERENCES auth.users(id),
  category_id UUID NOT NULL REFERENCES public.service_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'matched', 'in_progress', 'completed', 'cancelled', 'disputed')),
  budget_min_cents INTEGER,
  budget_max_cents INTEGER,
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  location_address TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'same_day')),
  scheduled_for TIMESTAMPTZ,
  escrow_amount_cents INTEGER,
  commission_cents INTEGER,
  otp_code TEXT,
  completion_photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Real-time notifications system
CREATE TABLE public.notifications (
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

-- User device tokens for push notifications
CREATE TABLE public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('web', 'ios', 'android')),
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_token)
);

-- Job applications/matches
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_price_cents INTEGER,
  estimated_duration_minutes INTEGER,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  distance_km DECIMAL(5, 2),
  response_time_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, pro_id)
);

-- Enable RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service categories - public read
CREATE POLICY "service_categories_select" ON public.service_categories FOR SELECT USING (is_active = true);

-- Pro services - pros can manage their own
CREATE POLICY "pro_services_select" ON public.pro_services FOR SELECT USING (true);
CREATE POLICY "pro_services_insert" ON public.pro_services FOR INSERT WITH CHECK (auth.uid() = pro_id);
CREATE POLICY "pro_services_update" ON public.pro_services FOR UPDATE USING (auth.uid() = pro_id);
CREATE POLICY "pro_services_delete" ON public.pro_services FOR DELETE USING (auth.uid() = pro_id);

-- Jobs - clients see their own, pros see open jobs in their area
CREATE POLICY "jobs_select_client" ON public.jobs FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "jobs_select_pro" ON public.jobs FOR SELECT USING (
  status = 'open' OR auth.uid() = pro_id OR 
  EXISTS (SELECT 1 FROM public.job_applications ja WHERE ja.job_id = id AND ja.pro_id = auth.uid())
);
CREATE POLICY "jobs_insert" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "jobs_update_client" ON public.jobs FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "jobs_update_pro" ON public.jobs FOR UPDATE USING (auth.uid() = pro_id);

-- Notifications - users see their own
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- User devices - users manage their own
CREATE POLICY "user_devices_select" ON public.user_devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_devices_insert" ON public.user_devices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_devices_update" ON public.user_devices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_devices_delete" ON public.user_devices FOR DELETE USING (auth.uid() = user_id);

-- Job applications - pros can apply, clients can see applications to their jobs
CREATE POLICY "job_applications_select_pro" ON public.job_applications FOR SELECT USING (auth.uid() = pro_id);
CREATE POLICY "job_applications_select_client" ON public.job_applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = auth.uid())
);
CREATE POLICY "job_applications_insert" ON public.job_applications FOR INSERT WITH CHECK (auth.uid() = pro_id);
CREATE POLICY "job_applications_update_pro" ON public.job_applications FOR UPDATE USING (auth.uid() = pro_id);

-- Indexes for performance
CREATE INDEX idx_pro_services_location ON public.pro_services USING GIST (
  POINT(location_lng, location_lat)
);
CREATE INDEX idx_jobs_location ON public.jobs USING GIST (
  POINT(location_lng, location_lat)
);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_category ON public.jobs(category_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at);
CREATE INDEX idx_job_applications_job ON public.job_applications(job_id);
CREATE INDEX idx_job_applications_pro ON public.job_applications(pro_id);

-- Add triggers for updated_at
CREATE TRIGGER set_updated_at_service_categories
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_pro_services
  BEFORE UPDATE ON public.pro_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_jobs
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_job_applications
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed some basic service categories
INSERT INTO public.service_categories (name, name_ro, description, description_ro, icon) VALUES
('Сантехника', 'Instalații sanitare', 'Ремонт труб, установка смесителей', 'Reparații țevi, instalare robinete', '🔧'),
('Электрика', 'Electricitate', 'Электромонтаж, ремонт проводки', 'Instalații electrice, reparații', '⚡'),
('Уборка', 'Curățenie', 'Генеральная уборка помещений', 'Curățenie generală încăperi', '🧹'),
('Курьер', 'Curier', 'Доставка документов и посылок', 'Livrare documente și colete', '📦'),
('Ремонт техники', 'Reparații electronice', 'Ремонт бытовой техники', 'Reparații electrocasnice', '🔨');

-- Enable realtime for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for jobs (for live updates)
ALTER TABLE public.jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;

-- Enable realtime for job applications
ALTER TABLE public.job_applications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_applications;