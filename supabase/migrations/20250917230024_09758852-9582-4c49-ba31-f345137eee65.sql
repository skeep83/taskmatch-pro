-- Drop existing policies for kyc bucket
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own KYC documents" ON storage.objects;

-- Recreate RLS policies for kyc bucket
-- Users can view their own KYC documents
CREATE POLICY "Users can view their own KYC documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'kyc' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR
   EXISTS (
     SELECT 1 FROM public.user_roles 
     WHERE user_id = auth.uid() 
     AND role IN ('admin', 'kyc', 'superadmin')
   ))
);

-- Users can upload their own KYC documents
CREATE POLICY "Users can upload their own KYC documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'kyc' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own KYC documents
CREATE POLICY "Users can update their own KYC documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'kyc' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR
   EXISTS (
     SELECT 1 FROM public.user_roles 
     WHERE user_id = auth.uid() 
     AND role IN ('admin', 'kyc', 'superadmin')
   ))
);

-- Users can delete their own KYC documents (admin can delete any)
CREATE POLICY "Users can delete their own KYC documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'kyc' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR
   EXISTS (
     SELECT 1 FROM public.user_roles 
     WHERE user_id = auth.uid() 
     AND role IN ('admin', 'kyc', 'superadmin')
   ))
);