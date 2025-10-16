-- Create app settings table for storing configuration
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Removed is_active check since admin_users table doesn't have that column
-- Only admins can read/write settings
CREATE POLICY "Admins can manage settings"
  ON app_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Insert default Telegram settings
INSERT INTO app_settings (key, value, description) VALUES
  ('telegram_bot_token', '', 'Telegram Bot Token from @BotFather'),
  ('telegram_chat_id', '', 'Your Telegram Chat ID from @userinfobot')
ON CONFLICT (key) DO NOTHING;
