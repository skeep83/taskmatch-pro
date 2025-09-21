-- First drop the function to allow changing return type
DROP FUNCTION IF EXISTS clear_all_error_logs();

-- Create new function with proper security and return type
CREATE OR REPLACE FUNCTION clear_all_error_logs()
RETURNS json 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete all error logs and get count
  DELETE FROM error_logs;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'message', 'All error logs cleared successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permissions to admin roles
GRANT EXECUTE ON FUNCTION clear_all_error_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION clear_all_error_logs() TO service_role;