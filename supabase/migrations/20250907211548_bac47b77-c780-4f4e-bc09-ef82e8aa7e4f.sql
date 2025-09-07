-- Add business_id column to tenders table if it doesn't exist
ALTER TABLE public.tenders 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.business_accounts(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tenders_business_only_insert" ON public.tenders;
DROP POLICY IF EXISTS "tenders_select_public" ON public.tenders;
DROP POLICY IF EXISTS "tenders_update_business_owner" ON public.tenders;

-- Create RLS policies - Only business accounts can create tenders
CREATE POLICY "tenders_business_only_insert" 
ON public.tenders 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'business'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.business_accounts ba 
    WHERE ba.owner_id = auth.uid() AND ba.id = business_id
  )
);

-- Anyone can view open tenders
CREATE POLICY "tenders_select_public" 
ON public.tenders 
FOR SELECT 
USING (status = 'open' OR has_role(auth.uid(), 'admin'::app_role));

-- Only business owner can update their tenders
CREATE POLICY "tenders_update_business_owner" 
ON public.tenders 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'business'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.business_accounts ba 
    WHERE ba.owner_id = auth.uid() AND ba.id = business_id
  )
);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_tenders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tenders_updated_at ON public.tenders;
CREATE TRIGGER update_tenders_updated_at
  BEFORE UPDATE ON public.tenders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenders_updated_at();