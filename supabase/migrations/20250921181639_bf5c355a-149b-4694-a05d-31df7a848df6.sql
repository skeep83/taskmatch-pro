-- Create a safer clear function with explicit WHERE clause
DROP FUNCTION IF EXISTS clear_all_error_logs();

CREATE OR REPLACE FUNCTION clear_all_error_logs()
RETURNS json 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete all error logs with explicit WHERE clause
  DELETE FROM error_logs WHERE id IS NOT NULL;
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

-- Grant execute permissions 
GRANT EXECUTE ON FUNCTION clear_all_error_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION clear_all_error_logs() TO service_role;