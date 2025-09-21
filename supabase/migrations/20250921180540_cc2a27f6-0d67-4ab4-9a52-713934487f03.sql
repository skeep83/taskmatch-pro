-- Fix the clear_all_error_logs function to use proper WHERE clause
CREATE OR REPLACE FUNCTION public.clear_all_error_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user has admin access
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Delete all error logs with explicit WHERE clause to avoid safety restriction
  DELETE FROM public.error_logs WHERE id IS NOT NULL;
  
  -- Log the action
  PERFORM public.log_admin_action(
    'clear_all_logs',
    'error_logs',
    NULL,
    NULL,
    jsonb_build_object('cleared_by', auth.uid(), 'timestamp', now())
  );
END;
$$;