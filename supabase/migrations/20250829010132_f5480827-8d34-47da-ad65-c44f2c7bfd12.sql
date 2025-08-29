-- Update evidence bucket to be public for easier access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'evidence';

-- Ensure proper RLS policies for job photos viewing
DROP POLICY IF EXISTS "job_photos_select_for_new_or_parties_or_admin" ON public.job_photos;

CREATE POLICY "job_photos_view_for_authenticated"
ON public.job_photos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j 
    WHERE j.id = job_photos.job_id 
    AND (
      j.client_id = auth.uid() 
      OR j.pro_id = auth.uid() 
      OR j.status = 'new'
      OR auth.uid() IN (
        SELECT user_id FROM public.user_roles 
        WHERE role IN ('admin', 'superadmin')
      )
    )
  )
);