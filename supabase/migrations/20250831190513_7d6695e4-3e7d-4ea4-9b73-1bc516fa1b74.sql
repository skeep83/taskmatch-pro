-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for logo bucket
CREATE POLICY "Admins can upload logos"
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'logos' AND public.verify_admin_access('admin'));

CREATE POLICY "Admins can update logos"
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'logos' AND public.verify_admin_access('admin'));

CREATE POLICY "Admins can delete logos"
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'logos' AND public.verify_admin_access('admin'));

CREATE POLICY "Everyone can view logos"
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'logos');

-- Create table for app settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for app_settings
CREATE POLICY "Admins can view app settings"
ON public.app_settings 
FOR SELECT 
USING (public.verify_admin_access('admin'));

CREATE POLICY "Admins can insert app settings"
ON public.app_settings 
FOR INSERT 
WITH CHECK (public.verify_admin_access('admin'));

CREATE POLICY "Admins can update app settings"
ON public.app_settings 
FOR UPDATE 
USING (public.verify_admin_access('admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();