-- Allow users to delete their own KYC documents only if they are pending or rejected
DROP POLICY IF EXISTS "kyc_delete_admin" ON public.kyc_documents;

CREATE POLICY "kyc_delete_own_pending_or_admin" 
ON public.kyc_documents 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (user_id = auth.uid() AND status IN ('pending', 'rejected'))
);