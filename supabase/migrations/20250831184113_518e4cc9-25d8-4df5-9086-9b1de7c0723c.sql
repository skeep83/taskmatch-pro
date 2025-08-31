-- Add DELETE policies for chats table
CREATE POLICY "chats_delete_participants_or_admin" 
ON public.chats 
FOR DELETE 
USING ((client_id = auth.uid()) OR (professional_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for chat_messages table
CREATE POLICY "chat_messages_delete_participants_or_admin" 
ON public.chat_messages 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1
  FROM chats c
  WHERE c.id = chat_messages.chat_id 
  AND ((c.client_id = auth.uid()) OR (c.professional_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
));