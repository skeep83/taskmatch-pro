-- Ensure you have admin access
SELECT make_user_admin('skeep83@gmail.com');

-- Add a test error log
INSERT INTO error_logs (level, source, message, metadata) 
VALUES ('error', 'test', 'Test error log entry', '{"test": true}');

-- Add more test logs
INSERT INTO error_logs (level, source, message, metadata) 
VALUES 
  ('critical', 'system', 'Critical system error', '{"component": "auth"}'),
  ('warning', 'ui', 'UI component warning', '{"component": "button"}'),
  ('info', 'app', 'Info message', '{"action": "user_login"}');