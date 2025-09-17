-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own KYC documents" ON storage.objects;

-- Recreate kyc storage bucket if it doesn't exist
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

-- Create new RLS policies for kyc bucket
CREATE POLICY "kyc_view_own_or_admin" 
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

CREATE POLICY "kyc_upload_own" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'kyc' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "kyc_update_own_or_admin" 
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

CREATE POLICY "kyc_delete_own_or_admin" 
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