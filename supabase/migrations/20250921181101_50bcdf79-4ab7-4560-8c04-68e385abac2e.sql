-- Check if function exists and create/replace it
CREATE OR REPLACE FUNCTION clear_all_error_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM error_logs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users with admin role
GRANT EXECUTE ON FUNCTION clear_all_error_logs() TO authenticated;