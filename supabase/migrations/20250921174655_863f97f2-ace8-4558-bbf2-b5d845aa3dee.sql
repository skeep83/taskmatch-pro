-- Add test error logs directly without using functions
INSERT INTO error_logs (level, source, message, metadata) VALUES 
  ('error', 'test', 'Test error log entry', '{"test": true}'),
  ('critical', 'system', 'Critical system error', '{"component": "auth"}'),
  ('warning', 'ui', 'UI component warning', '{"component": "button"}'),
  ('info', 'app', 'Info message', '{"action": "user_login"}');