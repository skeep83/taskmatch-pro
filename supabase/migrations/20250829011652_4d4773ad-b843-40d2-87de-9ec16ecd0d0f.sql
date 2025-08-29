-- Check and fix job_photos RLS policies
-- Allow job owners to delete photos  
DROP POLICY IF EXISTS "job_photos_delete" ON job_photos;

CREATE POLICY "job_photos_delete_by_owner" 
ON job_photos 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_photos.job_id 
    AND (j.client_id = auth.uid() OR j.pro_id = auth.uid())
  )
);