
DROP POLICY IF EXISTS "conv_select" ON public.conversations;

CREATE POLICY "conv_select" ON public.conversations
FOR SELECT USING (
  created_by = auth.uid()
  OR id IN (SELECT public.get_user_conversation_ids(auth.uid()))
);
