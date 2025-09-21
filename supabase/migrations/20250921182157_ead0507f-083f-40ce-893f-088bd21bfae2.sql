-- Fix error_logs level constraint to allow all necessary log levels
ALTER TABLE error_logs DROP CONSTRAINT IF EXISTS error_logs_level_check;

-- Add updated constraint that allows all necessary log levels
ALTER TABLE error_logs ADD CONSTRAINT error_logs_level_check 
CHECK (level IN ('critical', 'error', 'warning', 'info', 'debug', 'performance', 'trace', 'access', 'security', 'audit', 'system'));

-- Ensure the level field has a proper default
ALTER TABLE error_logs ALTER COLUMN level SET DEFAULT 'info';

-- Add helpful comment
COMMENT ON TABLE error_logs IS 'System error and event logs with expanded level support';