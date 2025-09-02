-- Create notify_user function for sending notifications
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_type TEXT,
  p_title_ru TEXT,
  p_message_ru TEXT,
  p_data JSONB DEFAULT NULL,
  p_title_ro TEXT DEFAULT NULL,
  p_message_ro TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    title_ro,
    message,
    message_ro,
    data,
    is_read,
    push_sent,
    email_sent,
    sms_sent
  ) VALUES (
    p_user_id,
    p_type,
    p_title_ru,
    COALESCE(p_title_ro, p_title_ru),
    p_message_ru,
    COALESCE(p_message_ro, p_message_ru),
    p_data,
    false,
    false,
    false,
    false
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;