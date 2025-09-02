-- Create table for professional upgrade requests
CREATE TABLE public.pro_upgrade_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  profile_data JSONB NOT NULL DEFAULT '{}',
  kyc_documents JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pro_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for pro_upgrade_requests
CREATE POLICY "Users can insert their own requests" 
ON public.pro_upgrade_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests" 
ON public.pro_upgrade_requests 
FOR SELECT 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all requests" 
ON public.pro_upgrade_requests 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_pro_upgrade_requests_updated_at
  BEFORE UPDATE ON public.pro_upgrade_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Function to approve pro upgrade request
CREATE OR REPLACE FUNCTION public.approve_pro_upgrade_request(_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _user_id UUID;
  _current_status TEXT;
BEGIN
  -- Check if user has admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN FALSE;
  END IF;
  
  -- Get request details
  SELECT user_id, status INTO _user_id, _current_status
  FROM public.pro_upgrade_requests
  WHERE id = _request_id;
  
  -- Check if request exists and is pending
  IF _user_id IS NULL OR _current_status != 'pending' THEN
    RETURN FALSE;
  END IF;
  
  -- Upgrade user role
  INSERT INTO public.user_roles (user_id, role, upgraded_at)
  VALUES (_user_id, 'pro'::app_role, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = 'pro'::app_role,
    upgraded_at = now(),
    updated_at = now();
  
  -- Update request status
  UPDATE public.pro_upgrade_requests 
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now()
  WHERE id = _request_id;
  
  -- Log admin action
  PERFORM public.log_admin_action(
    'approve_pro_upgrade',
    'pro_upgrade_requests',
    _request_id::text,
    NULL,
    jsonb_build_object('user_id', _user_id, 'approved_by', auth.uid())
  );
  
  RETURN TRUE;
END;
$$;

-- Function to reject pro upgrade request
CREATE OR REPLACE FUNCTION public.reject_pro_upgrade_request(_request_id UUID, _reason TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _user_id UUID;
  _current_status TEXT;
BEGIN
  -- Check if user has admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN FALSE;
  END IF;
  
  -- Get request details
  SELECT user_id, status INTO _user_id, _current_status
  FROM public.pro_upgrade_requests
  WHERE id = _request_id;
  
  -- Check if request exists and is pending
  IF _user_id IS NULL OR _current_status != 'pending' THEN
    RETURN FALSE;
  END IF;
  
  -- Update request status
  UPDATE public.pro_upgrade_requests 
  SET 
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    rejection_reason = _reason,
    updated_at = now()
  WHERE id = _request_id;
  
  -- Log admin action
  PERFORM public.log_admin_action(
    'reject_pro_upgrade',
    'pro_upgrade_requests',
    _request_id::text,
    NULL,
    jsonb_build_object('user_id', _user_id, 'rejected_by', auth.uid(), 'reason', _reason)
  );
  
  RETURN TRUE;
END;
$$;