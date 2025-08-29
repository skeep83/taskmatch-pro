-- Fix RLS policies for evidence bucket to allow job owners to upload photos
CREATE POLICY "job_evidence_insert" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'evidence' 
  AND (storage.foldername(name))[1] = 'job'
  AND EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id::text = (storage.foldername(name))[2]
    AND (jobs.client_id = auth.uid() OR jobs.pro_id = auth.uid())
  )
);

CREATE POLICY "job_evidence_select" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'evidence' 
  AND (storage.foldername(name))[1] = 'job'
  AND EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id::text = (storage.foldername(name))[2]
    AND (jobs.client_id = auth.uid() OR jobs.pro_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "job_evidence_delete" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'evidence' 
  AND (storage.foldername(name))[1] = 'job'
  AND EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id::text = (storage.foldername(name))[2]
    AND (jobs.client_id = auth.uid() OR jobs.pro_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);