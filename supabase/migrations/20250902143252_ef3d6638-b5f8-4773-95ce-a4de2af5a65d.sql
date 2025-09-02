-- Enable RLS and create policies for missing tables
DO $$ 
BEGIN
  -- Job applications RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications' LIMIT 1) THEN
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallets' LIMIT 1) THEN
    ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "wallets_own_select" ON public.wallets
    FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
    
    CREATE POLICY "wallets_admin_modify" ON public.wallets
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  -- Notifications RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' LIMIT 1) THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "notifications_own_select" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());
    
    CREATE POLICY "notifications_own_update" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());
    
    CREATE POLICY "notifications_service_insert" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Fix function search_path issues
CREATE OR REPLACE FUNCTION public.set_updated_at_notifications()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Update existing functions to include search_path
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