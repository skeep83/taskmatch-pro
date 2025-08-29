-- Simple migration just for chat tables without complex triggers
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  file_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_job_id ON public.messages(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Simple function to notify about new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_profile RECORD;
  notification_data JSONB;
  job_title TEXT;
BEGIN
  -- Get sender profile
  SELECT first_name, last_name, full_name 
  INTO sender_profile 
  FROM public.profiles 
  WHERE id = NEW.sender_id;
  
  -- Get job title if available
  IF NEW.job_id IS NOT NULL THEN
    SELECT title INTO job_title FROM public.jobs WHERE id = NEW.job_id;
  END IF;
  
  -- Prepare notification data
  notification_data := jsonb_build_object(
    'message_id', NEW.id,
    'sender_id', NEW.sender_id,
    'sender_name', COALESCE(sender_profile.full_name, sender_profile.first_name || ' ' || sender_profile.last_name, 'Пользователь'),
    'job_id', NEW.job_id,
    'job_title', job_title,
    'message_preview', LEFT(NEW.content, 100)
  );
  
  -- Send notification to receiver
  PERFORM public.notify_user(
    NEW.receiver_id,
    'message',
    'Новое сообщение',
    format('Сообщение от %s: %s', 
           COALESCE(sender_profile.full_name, sender_profile.first_name || ' ' || sender_profile.last_name, 'Пользователь'),
           LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END),
    notification_data,
    'Mesaj nou',
    format('Mesaj de la %s: %s',
           COALESCE(sender_profile.full_name, sender_profile.first_name || ' ' || sender_profile.last_name, 'Utilizator'),
           LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new message notifications
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.message_type != 'system')
  EXECUTE FUNCTION public.notify_new_message();