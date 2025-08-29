-- Insert a test notification with proper JSONB syntax
INSERT INTO public.notifications (
  user_id,
  type,
  title,
  title_ro,
  message,
  message_ro,
  data,
  is_read
) VALUES (
  'd3117828-1618-4c73-aee1-5968538d95d0',
  'job_application',
  'Тест нового отклика',
  'Test aplicație nouă',
  'Тестовое уведомление для проверки работы системы',
  'Notificare de test pentru verificarea sistemului',
  '{"test": true, "timestamp": "' || now()::text || '"}',
  false
);