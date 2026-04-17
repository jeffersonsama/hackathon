
-- ═══════════════════════════════════════════════════
-- FIX ALL MISSING RLS POLICIES
-- ═══════════════════════════════════════════════════

-- ── CONVERSATIONS: missing UPDATE ──
CREATE POLICY "participants update conversations"
ON conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

-- ── MESSAGES: missing DELETE ──
CREATE POLICY "sender deletes own message"
ON messages FOR DELETE
USING (
  sender_id = auth.uid()
);

-- ── CALL_SESSIONS: missing DELETE ──
CREATE POLICY "participants delete calls"
ON call_sessions FOR DELETE
USING (
  is_conversation_participant(conversation_id, auth.uid())
);

-- ── CLASS_MESSAGES: missing UPDATE ──
CREATE POLICY "sender updates class message"
ON class_messages FOR UPDATE
USING (sender_id = auth.uid());

-- ── CLASSROOM_MEMBERS: missing UPDATE ──
CREATE POLICY "owner updates classroom member"
ON classroom_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM classrooms c
    WHERE c.id = classroom_members.classroom_id
    AND c.created_by = auth.uid()
  )
);

-- ── GROUP_MEMBERS: missing UPDATE ──
CREATE POLICY "group admins update members"
ON group_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
  )
);

-- ── GROUP_MESSAGES: missing UPDATE ──
CREATE POLICY "sender updates group message"
ON group_messages FOR UPDATE
USING (sender_id = auth.uid());

-- ── MESSAGE_REACTIONS: missing UPDATE ──
-- Reactions are toggle-only (insert/delete), but add for completeness
CREATE POLICY "users update own reaction"
ON message_reactions FOR UPDATE
USING (user_id = auth.uid());

-- ── POST_REACTIONS: missing UPDATE ──
CREATE POLICY "users update own post reaction"
ON post_reactions FOR UPDATE
USING (user_id = auth.uid());

-- ── REPORTS: missing DELETE ──
CREATE POLICY "admins delete reports"
ON reports FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'global_admin'::app_role)
);

-- ── RESOURCES: missing UPDATE ──
CREATE POLICY "owner updates resources"
ON resources FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM sections s
    JOIN courses c ON c.id = s.course_id
    WHERE s.id = resources.section_id
    AND c.created_by = auth.uid()
  )
);

-- ── SKILL_ENDORSEMENTS: missing UPDATE ──
-- Endorsements don't really need update, but add for completeness
CREATE POLICY "users update own endorsement"
ON skill_endorsements FOR UPDATE
USING (endorsed_by = auth.uid());

-- ── USER_PRESENCE: missing DELETE ──
CREATE POLICY "users delete own presence"
ON user_presence FOR DELETE
USING (user_id = auth.uid());

-- ── EVENT_SCOPES: missing UPDATE ──
CREATE POLICY "creators update event scopes"
ON event_scopes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_scopes.event_id
    AND e.created_by = auth.uid()
  )
);
