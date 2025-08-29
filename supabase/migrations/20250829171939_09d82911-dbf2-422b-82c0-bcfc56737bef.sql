-- Create table for chat sessions/conversations (if not exists)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, client_id, pro_id)
);

-- Create table for chat messages (if not exists)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  file_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_job_id ON public.chat_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_participants ON public.chat_sessions(client_id, pro_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_created_at ON public.chat_messages(chat_session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view chat sessions they participate in" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can create chat sessions for their jobs" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update chat sessions they participate in" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their chats" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;

-- RLS policies for chat sessions
CREATE POLICY "Users can view chat sessions they participate in" ON public.chat_sessions
  FOR SELECT USING (auth.uid() = client_id OR auth.uid() = pro_id);

CREATE POLICY "Users can create chat sessions for their jobs" ON public.chat_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = client_id OR auth.uid() = pro_id OR
    EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND (client_id = auth.uid() OR pro_id = auth.uid()))
  );

CREATE POLICY "Users can update chat sessions they participate in" ON public.chat_sessions
  FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = pro_id);

-- RLS policies for chat messages
CREATE POLICY "Users can view messages in their chats" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs 
      WHERE cs.id = chat_messages.chat_session_id 
      AND (cs.client_id = auth.uid() OR cs.pro_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their chats" ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs 
      WHERE cs.id = chat_messages.chat_session_id 
      AND (cs.client_id = auth.uid() OR cs.pro_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages" ON public.chat_messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Function to notify about new chat messages
CREATE OR REPLACE FUNCTION public.notify_about_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chat_session RECORD;
  sender_profile RECORD;
  recipient_id UUID;
  notification_data JSONB;
  job_title TEXT;
BEGIN
  -- Get chat session details
  SELECT * INTO chat_session 
  FROM public.chat_sessions 
  WHERE id = NEW.chat_session_id;
  
  -- Get sender profile
  SELECT first_name, last_name, full_name 
  INTO sender_profile 
  FROM public.profiles 
  WHERE id = NEW.sender_id;
  
  -- Get job title if available
  IF chat_session.job_id IS NOT NULL THEN
    SELECT title INTO job_title FROM public.jobs WHERE id = chat_session.job_id;
  END IF;
  
  -- Determine recipient (the other person in the chat)
  IF NEW.sender_id = chat_session.client_id THEN
    recipient_id := chat_session.pro_id;
  ELSE
    recipient_id := chat_session.client_id;
  END IF;
  
  -- Prepare notification data
  notification_data := jsonb_build_object(
    'chat_session_id', NEW.chat_session_id,
    'message_id', NEW.id,
    'sender_id', NEW.sender_id,
    'sender_name', COALESCE(sender_profile.full_name, sender_profile.first_name || ' ' || sender_profile.last_name, 'Пользователь'),
    'job_id', chat_session.job_id,
    'job_title', job_title,
    'message_preview', LEFT(NEW.message, 100)
  );
  
  -- Send notification to recipient
  PERFORM public.notify_user(
    recipient_id,
    'message',
    'Новое сообщение',
    format('Сообщение от %s: %s', 
           COALESCE(sender_profile.full_name, sender_profile.first_name || ' ' || sender_profile.last_name, 'Пользователь'),
           LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END),
    notification_data,
    'Mesaj nou',
    format('Mesaj de la %s: %s',
           COALESCE(sender_profile.full_name, sender_profile.first_name || ' ' || sender_profile.last_name, 'Utilizator'),
           LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END)
  );
  
  -- Update last message timestamp in chat session
  UPDATE public.chat_sessions 
  SET last_message_at = NOW() 
  WHERE id = NEW.chat_session_id;
  
  RETURN NEW;
END;
$$;

-- Function to auto-create chat sessions when needed
CREATE OR REPLACE FUNCTION public.get_or_create_chat_session(
  p_job_id UUID,
  p_client_id UUID,
  p_pro_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_id UUID;
BEGIN
  -- Try to find existing session
  SELECT id INTO session_id
  FROM public.chat_sessions
  WHERE job_id = p_job_id 
    AND client_id = p_client_id 
    AND pro_id = p_pro_id;
  
  -- Create new session if not found
  IF session_id IS NULL THEN
    INSERT INTO public.chat_sessions (job_id, client_id, pro_id)
    VALUES (p_job_id, p_client_id, p_pro_id)
    RETURNING id INTO session_id;
  END IF;
  
  RETURN session_id;
END;
$$;

-- Create trigger for new message notifications (only after tables exist)
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.chat_messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  WHEN (NEW.message_type != 'system')
  EXECUTE FUNCTION public.notify_about_new_message();