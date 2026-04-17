
-- Remove duplicate notify_new_message triggers (these handle receiver_id/group_id which are no longer used)
DROP TRIGGER IF EXISTS notify_new_message_trigger ON messages;
DROP TRIGGER IF EXISTS on_new_message ON messages;

-- Also remove duplicate triggers that were created twice
DROP TRIGGER IF EXISTS on_conversation_message_insert ON messages;

-- Ensure notification INSERT policy allows SECURITY DEFINER trigger inserts
-- The current policy requires user_id = auth.uid() which blocks trigger inserts for other users
-- We need to allow service-level inserts
DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);
