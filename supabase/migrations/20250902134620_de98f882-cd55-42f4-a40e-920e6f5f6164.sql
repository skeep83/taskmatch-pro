-- Create storage bucket for KYC documents if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kyc', 'kyc', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for KYC storage
CREATE POLICY "Users can upload their own KYC documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'kyc' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own KYC documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'kyc' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can view all KYC documents" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'kyc' AND has_role(auth.uid(), 'admin'::app_role));