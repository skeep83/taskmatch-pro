-- Fix clear_all_error_logs function permissions
DROP FUNCTION IF EXISTS clear_all_error_logs();

CREATE OR REPLACE FUNCTION clear_all_error_logs()
RETURNS void 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM error_logs;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION clear_all_error_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION clear_all_error_logs() TO service_role;