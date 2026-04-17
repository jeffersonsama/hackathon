
-- Fix conversation_participants INSERT policy
-- Allow inserting participants if:
-- 1. You're adding yourself (user_id = auth.uid())
-- 2. You created the conversation (conversations.created_by = auth.uid() or user1_id/user2_id)
-- 3. You're an admin of the conversation
DROP POLICY IF EXISTS "cp_insert" ON conversation_participants;
CREATE POLICY "cp_insert" ON conversation_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR is_conversation_admin(conversation_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );
