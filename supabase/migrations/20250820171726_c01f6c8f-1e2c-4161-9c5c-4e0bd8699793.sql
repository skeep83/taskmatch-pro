-- Fix missing tenders table
CREATE TABLE public.tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  budget_min_cents INTEGER,
  budget_max_cents INTEGER,
  deadline_at TIMESTAMP WITH TIME ZONE,
  window_from TIMESTAMP WITH TIME ZONE NOT NULL,
  window_to TIMESTAMP WITH TIME ZONE NOT NULL,
  status tender_status DEFAULT 'open'::tender_status,
  winner_id UUID,
  final_price_cents INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tender status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE tender_status AS ENUM ('draft', 'open', 'closed', 'awarded', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enable RLS
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenders
CREATE POLICY "Tenders select for authenticated users" 
ON public.tenders FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Tenders insert for clients only" 
ON public.tenders FOR INSERT 
TO authenticated 
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Tenders update for owner or admin" 
ON public.tenders FOR UPDATE 
TO authenticated 
USING (client_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER set_tenders_updated_at
  BEFORE UPDATE ON public.tenders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();