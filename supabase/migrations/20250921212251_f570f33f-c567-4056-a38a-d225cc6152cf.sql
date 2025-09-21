-- Check and fix KYC bucket configuration
-- Drop existing conflicting policies first if they exist
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view KYC documents" ON storage.objects;

-- Recreate policies with proper permissions
CREATE POLICY "Admins can view all KYC documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'kyc' AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin', 'kyc')
  )
);

CREATE POLICY "Users can upload KYC documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'kyc' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own KYC documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'kyc' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);