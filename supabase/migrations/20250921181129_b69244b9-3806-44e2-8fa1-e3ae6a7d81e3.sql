-- Drop and recreate function with correct permissions
DROP FUNCTION IF EXISTS clear_all_error_logs();

CREATE OR REPLACE FUNCTION clear_all_error_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.error_logs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION clear_all_error_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION clear_all_error_logs() TO service_role;