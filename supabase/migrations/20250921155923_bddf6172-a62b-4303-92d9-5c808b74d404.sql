-- Create job_photos table for storing job images
CREATE TABLE public.job_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for job photos
CREATE POLICY "job_photos_select_open_jobs" 
ON public.job_photos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM jobs j 
    WHERE j.id = job_photos.job_id 
    AND j.status = 'new'
  )
);

CREATE POLICY "job_photos_select_job_parties" 
ON public.job_photos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM jobs j 
    WHERE j.id = job_photos.job_id 
    AND (j.client_id = auth.uid() OR j.pro_id = auth.uid())
  )
);

CREATE POLICY "job_photos_insert_job_owner" 
ON public.job_photos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs j 
    WHERE j.id = job_photos.job_id 
    AND j.client_id = auth.uid()
  )
);

CREATE POLICY "job_photos_update_job_owner" 
ON public.job_photos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM jobs j 
    WHERE j.id = job_photos.job_id 
    AND j.client_id = auth.uid()
  )
);

CREATE POLICY "job_photos_delete_job_owner" 
ON public.job_photos 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM jobs j 
    WHERE j.id = job_photos.job_id 
    AND j.client_id = auth.uid()
  )
);

CREATE POLICY "job_photos_admin_all" 
ON public.job_photos 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for better performance
CREATE INDEX idx_job_photos_job_id ON public.job_photos(job_id);
CREATE INDEX idx_job_photos_display_order ON public.job_photos(job_id, display_order);