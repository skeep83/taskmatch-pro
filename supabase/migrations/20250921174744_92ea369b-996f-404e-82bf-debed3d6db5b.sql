-- Create the app_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('client', 'pro', 'business', 'admin', 'superadmin', 'ops', 'kyc', 'finance', 'dispute_manager', 'content', 'risk', 'city_manager', 'tender');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure you have admin access
INSERT INTO user_roles (user_id, role) 
VALUES ('d3117828-1618-4c73-aee1-5968538d95d0', 'admin'), ('d3117828-1618-4c73-aee1-5968538d95d0', 'superadmin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Add test error logs
INSERT INTO error_logs (level, source, message, metadata) 
VALUES 
  ('error', 'test', 'Test error log entry', '{"test": true}'),
  ('critical', 'system', 'Critical system error', '{"component": "auth"}'),
  ('warning', 'ui', 'UI component warning', '{"component": "button"}'),
  ('info', 'app', 'Info message', '{"action": "user_login"}');