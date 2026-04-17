
-- Drop broken policies
DROP POLICY IF EXISTS "conv_select" ON public.conversations;
DROP POLICY IF EXISTS "conv_update" ON public.conversations;
DROP POLICY IF EXISTS "cp_select" ON public.conversation_participants;

-- Fix conversations SELECT: user must be a participant
CREATE POLICY "conv_select" ON public.conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
  )
);

-- Fix conversations UPDATE: user must be a participant
CREATE POLICY "conv_update" ON public.conversations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
  )
);

-- Fix conversation_participants SELECT: user can see own rows + rows of conversations they belong to
CREATE POLICY "cp_select" ON public.conversation_participants
FOR SELECT USING (
  auth.uid() = user_id
  OR conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants
    WHERE user_id = auth.uid()
  )
);
