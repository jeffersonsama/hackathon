ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_emails_ok boolean DEFAULT false;