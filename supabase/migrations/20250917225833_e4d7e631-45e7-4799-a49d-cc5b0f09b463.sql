-- Create kyc storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc', 
  'kyc', 
  false, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create RLS policies for kyc bucket
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