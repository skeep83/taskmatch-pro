-- Create foreign key constraint between jobs and categories
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.categories(id);

-- Create RLS policies for evidence storage bucket
INSERT INTO storage.objects (name, bucket_id) VALUES ('evidence', 'evidence') ON CONFLICT DO NOTHING;

-- Allow authenticated users to upload files to evidence bucket
CREATE POLICY "Users can upload evidence files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'evidence' AND 
  auth.role() = 'authenticated'
);

-- Allow users to view evidence files for their own jobs
CREATE POLICY "Users can view evidence for their jobs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'evidence' AND 
  auth.role() = 'authenticated'
);