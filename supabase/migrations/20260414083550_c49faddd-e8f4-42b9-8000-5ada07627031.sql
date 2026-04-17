
-- Create a security definer function to get user's conversation IDs without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_conversation_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id FROM public.conversation_participants WHERE user_id = _user_id
$$;

-- Drop all existing policies on conversation_participants and conversations
DROP POLICY IF EXISTS "cp_select" ON public.conversation_participants;
DROP POLICY IF EXISTS "cp_insert" ON public.conversation_participants;
DROP POLICY IF EXISTS "cp_update" ON public.conversation_participants;
DROP POLICY IF EXISTS "conv_select" ON public.conversations;
DROP POLICY IF EXISTS "conv_insert" ON public.conversations;
DROP POLICY IF EXISTS "conv_update" ON public.conversations;

-- conversation_participants: SELECT using the security definer function
CREATE POLICY "cp_select" ON public.conversation_participants
FOR SELECT USING (
  conversation_id IN (SELECT public.get_user_conversation_ids(auth.uid()))
);

-- conversation_participants: INSERT (anyone authenticated can add participants)
CREATE POLICY "cp_insert" ON public.conversation_participants
FOR INSERT WITH CHECK (true);

-- conversation_participants: UPDATE own rows only
CREATE POLICY "cp_update" ON public.conversation_participants
FOR UPDATE USING (auth.uid() = user_id);

-- conversations: SELECT using the security definer function
CREATE POLICY "conv_select" ON public.conversations
FOR SELECT USING (
  id IN (SELECT public.get_user_conversation_ids(auth.uid()))
);

-- conversations: INSERT (authenticated users can create)
CREATE POLICY "conv_insert" ON public.conversations
FOR INSERT WITH CHECK (true);

-- conversations: UPDATE if user is a participant
CREATE POLICY "conv_update" ON public.conversations
FOR UPDATE USING (
  id IN (SELECT public.get_user_conversation_ids(auth.uid()))
);
