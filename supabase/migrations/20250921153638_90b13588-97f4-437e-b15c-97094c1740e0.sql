-- Create job_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.job_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for job_photos
ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view job photos for public jobs
CREATE POLICY "job_photos_select_for_public_jobs" 
ON public.job_photos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j 
    WHERE j.id = job_photos.job_id 
    AND j.status = 'new'
  )
);

-- Allow job owner to manage their job photos
CREATE POLICY "job_photos_manage_by_owner" 
ON public.job_photos 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j 
    WHERE j.id = job_photos.job_id 
    AND j.client_id = auth.uid()
  )
);

-- Allow admins to manage all job photos
CREATE POLICY "job_photos_admin_all" 
ON public.job_photos 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Make sure the evidence storage bucket is public for job photos
UPDATE storage.buckets 
SET public = true 
WHERE id = 'evidence';