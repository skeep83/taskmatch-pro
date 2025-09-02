-- Create RLS policies for admin_audit_log table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_log' AND policyname = 'admin_audit_log_admin_select') THEN
    CREATE POLICY "admin_audit_log_admin_select" ON public.admin_audit_log
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_log' AND policyname = 'admin_audit_log_service_insert') THEN
    CREATE POLICY "admin_audit_log_service_insert" ON public.admin_audit_log
    FOR INSERT WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Create app_settings table if it doesn't exist and add policies
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for app_settings
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
  END;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'app_settings_admin_select') THEN
    CREATE POLICY "app_settings_admin_select" ON public.app_settings
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'app_settings_admin_modify') THEN
    CREATE POLICY "app_settings_admin_modify" ON public.app_settings
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Insert default app settings
INSERT INTO public.app_settings (key, value, description, category) VALUES
('platform_commission', '{"percentage": 10}', 'Platform commission percentage', 'finance'),
('max_payout_amount', '{"cents": 100000}', 'Maximum instant payout amount in cents', 'finance'),
('otp_expiry_minutes', '{"minutes": 15}', 'OTP code expiry time in minutes', 'security'),
('minimum_rating', '{"rating": 1}', 'Minimum rating allowed', 'quality'),
('emergency_multiplier', '{"multiplier": 1.5}', 'Emergency job price multiplier', 'pricing')
ON CONFLICT (key) DO NOTHING;