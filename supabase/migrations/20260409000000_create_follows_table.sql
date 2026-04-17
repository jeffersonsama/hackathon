-- Create follows table for user subscriptions
CREATE TABLE IF NOT EXISTS follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Policy: users can see their own follows
CREATE POLICY "Users can view their own follows" ON follows
  FOR SELECT USING (follower_id = auth.uid());

-- Policy: users can insert their own follows
CREATE POLICY "Users can create follows" ON follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

-- Policy: users can delete their own follows
CREATE POLICY "Users can delete follows" ON follows
  FOR DELETE USING (follower_id = auth.uid());

-- Helper function to check if following
CREATE OR REPLACE FUNCTION is_following(target_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM follows
    WHERE follower_id = auth.uid() AND following_id = target_user_id
  );
$$ LANGUAGE SQL SECURITY DEFINER;