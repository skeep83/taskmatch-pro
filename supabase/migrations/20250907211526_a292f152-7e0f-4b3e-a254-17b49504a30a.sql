-- First, let's check if tenders table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS public.tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget_max_cents INTEGER NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  category_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  winner_bid_id UUID,
  business_id UUID REFERENCES public.business_accounts(id) ON DELETE CASCADE
);

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