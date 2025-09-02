-- Create email queue table for tracking email templates
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  template_data JSONB,
  language TEXT DEFAULT 'ru',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SMS queue table for tracking SMS messages
CREATE TABLE IF NOT EXISTS public.sms_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  language TEXT DEFAULT 'ru',
  provider_response JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  external_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price estimations table for AI learning
CREATE TABLE IF NOT EXISTS public.price_estimations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT,
  urgency TEXT DEFAULT 'normal',
  estimated_price INTEGER NOT NULL,
  estimated_hours INTEGER NOT NULL,
  actual_price INTEGER,
  actual_hours INTEGER,
  image_analysis TEXT,
  accuracy_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create integration logs table for API tracking
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  status TEXT NOT NULL,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_estimations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_queue (admin access only)
CREATE POLICY "email_queue_admin_access" ON public.email_queue
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for sms_queue (admin access only)
CREATE POLICY "sms_queue_admin_access" ON public.sms_queue
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for price_estimations (admin access only)
CREATE POLICY "price_estimations_admin_access" ON public.price_estimations
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for integration_logs (admin access only)
CREATE POLICY "integration_logs_admin_access" ON public.integration_logs
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_email_queue_updated_at
  BEFORE UPDATE ON public.email_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_sms_queue_updated_at
  BEFORE UPDATE ON public.sms_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_price_estimations_updated_at
  BEFORE UPDATE ON public.price_estimations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_template ON public.email_queue(template);
CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON public.sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_phone ON public.sms_queue(phone);
CREATE INDEX IF NOT EXISTS idx_price_estimations_category ON public.price_estimations(category);
CREATE INDEX IF NOT EXISTS idx_integration_logs_provider ON public.integration_logs(provider);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON public.integration_logs(created_at);

-- Insert default app settings for new features
INSERT INTO public.app_settings (key, value, description, category) VALUES
('sms_provider_moldcell_enabled', '{"enabled": true}', 'Enable Moldcell SMS provider', 'sms'),
('sms_provider_orange_enabled', '{"enabled": true}', 'Enable Orange SMS provider', 'sms'),
('ai_price_estimation_enabled', '{"enabled": true}', 'Enable AI price estimation', 'ai'),
('facebook_integration_enabled', '{"enabled": false}', 'Enable Facebook integration', 'integrations'),
('google_business_enabled', '{"enabled": false}', 'Enable Google Business integration', 'integrations'),
('maib_payment_enabled', '{"enabled": false}', 'Enable MAIB payment provider', 'payments'),
('mdl_pay_enabled', '{"enabled": false}', 'Enable MDL Pay provider', 'payments')
ON CONFLICT (key) DO NOTHING;