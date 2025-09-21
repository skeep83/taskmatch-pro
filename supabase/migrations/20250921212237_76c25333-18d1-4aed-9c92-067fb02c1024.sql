-- Fix KYC storage bucket policies
-- Create policies for KYC bucket to allow admins to view documents

-- Policy for admins to view KYC documents
CREATE POLICY "Admins can view KYC documents" 
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

-- Policy for users to upload their own KYC documents  
CREATE POLICY "Users can upload their own KYC documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'kyc' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for users to view their own KYC documents
CREATE POLICY "Users can view their own KYC documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'kyc' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);