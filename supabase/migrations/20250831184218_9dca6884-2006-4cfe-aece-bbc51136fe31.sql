-- Enable RLS on chat_sessions table
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for chat_sessions
CREATE POLICY "chat_sessions_select_participants_or_admin" 
ON public.chat_sessions 
FOR SELECT 
USING ((client_id = auth.uid()) OR (pro_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "chat_sessions_insert_participants_or_admin" 
ON public.chat_sessions 
FOR INSERT 
WITH CHECK ((client_id = auth.uid()) OR (pro_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "chat_sessions_update_participants_or_admin" 
ON public.chat_sessions 
FOR UPDATE 
USING ((client_id = auth.uid()) OR (pro_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "chat_sessions_delete_participants_or_admin" 
ON public.chat_sessions 
FOR DELETE 
USING ((client_id = auth.uid()) OR (pro_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));