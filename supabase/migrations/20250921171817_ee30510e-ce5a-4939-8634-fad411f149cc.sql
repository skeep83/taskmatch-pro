-- Create error_logs table for centralized error logging
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  level TEXT NOT NULL CHECK (level IN ('critical', 'error', 'warning', 'info')),
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB,
  stack_trace TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for error_logs - only admins can access
CREATE POLICY "Admins can view error logs" 
ON public.error_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'superadmin', 'ops')
  )
);

CREATE POLICY "Admins can insert error logs" 
ON public.error_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'superadmin', 'ops')
  )
);

CREATE POLICY "Admins can update error logs" 
ON public.error_logs 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'superadmin', 'ops')
  )
);

-- Create indexes for better performance
CREATE INDEX idx_error_logs_timestamp ON public.error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_level ON public.error_logs(level);
CREATE INDEX idx_error_logs_source ON public.error_logs(source);
CREATE INDEX idx_error_logs_resolved ON public.error_logs(resolved);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_error_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = COALESCE(NEW.created_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_error_logs_timestamps
  BEFORE INSERT ON public.error_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_error_logs_updated_at();