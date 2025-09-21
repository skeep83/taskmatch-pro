-- Add DELETE policy for KYC documents for admins
CREATE POLICY "kyc_delete_admin" 
ON public.kyc_documents 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for pro_upgrade_requests for admins  
CREATE POLICY "pro_upgrade_requests_delete_admin"
ON public.pro_upgrade_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));