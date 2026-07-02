-- Ensure realtime works for chat and notifications:
-- tables must be in the supabase_realtime publication and have
-- REPLICA IDENTITY FULL so UPDATE payloads contain full rows.

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chats') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- Receivers must be able to mark incoming messages as read.
-- (UPDATE limited to participants of the chat; senders keep their rights via existing policies)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_messages_participant_update_read') THEN
    CREATE POLICY chat_messages_participant_update_read ON public.chat_messages
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.chats c
          WHERE c.id = chat_id
            AND (c.client_id = auth.uid() OR c.professional_id = auth.uid())
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created ON public.chat_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON public.chat_messages(chat_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
