-- Drop existing policies and create simpler ones
DROP POLICY IF EXISTS "job_evidence_insert" ON storage.objects;
DROP POLICY IF EXISTS "job_evidence_select" ON storage.objects;
DROP POLICY IF EXISTS "job_evidence_delete" ON storage.objects;

-- Create simpler policies that should work
CREATE POLICY "evidence_bucket_insert" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'evidence');

CREATE POLICY "evidence_bucket_select" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'evidence');

CREATE POLICY "evidence_bucket_delete" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'evidence');