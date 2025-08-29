-- Create job_price_proposals table
CREATE TABLE IF NOT EXISTS public.job_price_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  eta_slot TEXT,
  note TEXT,
  warranty_days INTEGER DEFAULT 30 CHECK (warranty_days >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraint to prevent duplicate proposals
ALTER TABLE public.job_price_proposals ADD CONSTRAINT unique_job_pro_proposal UNIQUE (job_id, pro_id);

-- Enable RLS
ALTER TABLE public.job_price_proposals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Price proposals select for job owner and pro" ON public.job_price_proposals
  FOR SELECT
  USING (
    pro_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM jobs j 
      WHERE j.id = job_price_proposals.job_id 
      AND j.client_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Price proposals insert for pro only" ON public.job_price_proposals
  FOR INSERT
  WITH CHECK (pro_id = auth.uid());

CREATE POLICY "Price proposals update for job owner and admin" ON public.job_price_proposals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM jobs j 
      WHERE j.id = job_price_proposals.job_id 
      AND j.client_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Create index for performance
CREATE INDEX idx_job_price_proposals_job_id ON public.job_price_proposals(job_id);
CREATE INDEX idx_job_price_proposals_pro_id ON public.job_price_proposals(pro_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_job_price_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_price_proposals_updated_at
  BEFORE UPDATE ON public.job_price_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_job_price_proposals_updated_at();