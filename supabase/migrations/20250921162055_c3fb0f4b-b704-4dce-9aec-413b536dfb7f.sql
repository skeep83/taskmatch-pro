-- Create job_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.job_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for job_photos
CREATE POLICY IF NOT EXISTS "job_photos_select_job_participants" 
ON public.job_photos 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM jobs j 
  WHERE j.id = job_photos.job_id 
  AND (j.client_id = auth.uid() OR j.pro_id = auth.uid() OR j.status = 'new')
));

CREATE POLICY IF NOT EXISTS "job_photos_insert_client_only" 
ON public.job_photos 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM jobs j 
  WHERE j.id = job_photos.job_id 
  AND j.client_id = auth.uid()
));

CREATE POLICY IF NOT EXISTS "job_photos_admin_all" 
ON public.job_photos 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_job_photos_job_id ON public.job_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_display_order ON public.job_photos(job_id, display_order);