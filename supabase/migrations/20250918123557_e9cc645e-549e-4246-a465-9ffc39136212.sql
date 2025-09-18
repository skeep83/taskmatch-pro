-- Create job_applications table with proper structure
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  pro_id UUID NOT NULL,
  price_cents INTEGER NOT NULL,
  eta_slot TEXT,
  note TEXT,
  warranty_days INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on job_applications
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for job_applications
CREATE POLICY "job_applications_insert_pro_only" 
ON public.job_applications 
FOR INSERT 
WITH CHECK (pro_id = auth.uid());

CREATE POLICY "job_applications_select_pro_or_job_owner_or_admin" 
ON public.job_applications 
FOR SELECT 
USING (
  (pro_id = auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  (EXISTS (
    SELECT 1 FROM jobs j 
    WHERE j.id = job_applications.job_id AND j.client_id = auth.uid()
  ))
);

CREATE POLICY "job_applications_update_pro_or_admin" 
ON public.job_applications 
FOR UPDATE 
USING (
  (pro_id = auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_job_applications_updated_at
BEFORE UPDATE ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();