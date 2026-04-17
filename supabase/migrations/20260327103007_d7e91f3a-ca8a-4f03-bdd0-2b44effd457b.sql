
-- Drop the old msg_target constraint that requires receiver_id or group_id
-- The new messaging system uses conversation_id instead
ALTER TABLE messages DROP CONSTRAINT IF EXISTS msg_target;

-- Add a new constraint that allows conversation_id OR receiver_id OR group_id
ALTER TABLE messages ADD CONSTRAINT msg_target_v2
  CHECK (conversation_id IS NOT NULL OR receiver_id IS NOT NULL OR group_id IS NOT NULL);
