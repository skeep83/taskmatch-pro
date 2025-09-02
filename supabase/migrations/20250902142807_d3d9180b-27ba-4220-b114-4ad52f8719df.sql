-- Fix missing RLS policies for pro_rating_stats
ALTER TABLE public.pro_rating_stats ENABLE ROW LEVEL SECURITY;

-- Everyone can view rating stats (needed for public profiles)
CREATE POLICY "pro_rating_stats_public_select" ON public.pro_rating_stats
FOR SELECT
USING (true);

-- Only service role and admins can update rating stats
CREATE POLICY "pro_rating_stats_service_update" ON public.pro_rating_stats
FOR UPDATE
USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

-- Only service role and admins can insert rating stats
CREATE POLICY "pro_rating_stats_service_insert" ON public.pro_rating_stats
FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

-- Fix missing RLS policies for service_categories
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view categories (needed for public catalog)
CREATE POLICY "service_categories_public_select" ON public.service_categories
FOR SELECT
USING (true);

-- Only admins can modify categories
CREATE POLICY "service_categories_admin_insert" ON public.service_categories
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "service_categories_admin_update" ON public.service_categories
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "service_categories_admin_delete" ON public.service_categories
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix security for functions - update existing functions to use search_path
CREATE OR REPLACE FUNCTION public.log_admin_action(p_action text, p_resource_type text, p_resource_id text DEFAULT NULL::text, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log if we have an authenticated admin user
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action,
      resource_type,
      resource_id,
      old_values,
      new_values,
      ip_address,
      user_agent
    ) VALUES (
      auth.uid(),
      p_action,
      p_resource_type,
      p_resource_id,
      p_old_values,
      p_new_values,
      p_ip_address::inet,
      p_user_agent
    );
  END IF;
END;
$function$;

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

-- Fix OTP security - ensure OTP codes are properly managed
ALTER TABLE public.jobs ALTER COLUMN otp_code SET DEFAULT NULL;

-- Add trigger to automatically clear OTP after 24 hours
CREATE OR REPLACE FUNCTION public.clear_expired_otp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.jobs 
  SET otp_code = NULL 
  WHERE otp_code IS NOT NULL 
    AND updated_at < now() - interval '24 hours';
END;
$$;

-- Create admin role if user doesn't have one already
DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Get user ID for skeep83@gmail.com
  SELECT id INTO user_id FROM auth.users WHERE email = 'skeep83@gmail.com';
  
  IF user_id IS NOT NULL THEN
    -- Add all roles for this user
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

-- Fix job applications table RLS if missing
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

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Job applications policies
CREATE POLICY "job_applications_pro_insert" ON public.job_applications
FOR INSERT
WITH CHECK (pro_id = auth.uid());

CREATE POLICY "job_applications_view_parties_or_admin" ON public.job_applications
FOR SELECT
USING (
  pro_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_applications.job_id AND j.client_id = auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role)
);

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

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_own_select" ON public.wallets
FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "wallets_admin_modify" ON public.wallets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

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

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own_select" ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "notifications_own_update" ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "notifications_service_insert" ON public.notifications
FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

-- Add missing triggers for updated_at
CREATE TRIGGER set_updated_at_notifications 
  BEFORE UPDATE ON public.notifications 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_notifications();

CREATE TRIGGER set_updated_at_wallets 
  BEFORE UPDATE ON public.wallets 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_service_categories 
  BEFORE UPDATE ON public.service_categories 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();