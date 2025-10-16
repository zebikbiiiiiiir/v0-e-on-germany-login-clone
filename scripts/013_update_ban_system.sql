-- Update user_activity_log to support IP/device-based banning
ALTER TABLE user_activity_log ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Create banned_entities table for IP/device/session banning
CREATE TABLE IF NOT EXISTS banned_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ban_type TEXT NOT NULL CHECK (ban_type IN ('ip', 'device', 'session', 'user')),
  ban_value TEXT NOT NULL,
  reason TEXT,
  banned_by UUID REFERENCES admin_users(id),
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(ban_type, ban_value)
);

-- Disable RLS on banned_entities (accessed via service role only)
ALTER TABLE banned_entities DISABLE ROW LEVEL SECURITY;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_banned_entities_lookup ON banned_entities(ban_type, ban_value, is_active);
CREATE INDEX IF NOT EXISTS idx_banned_entities_expiry ON banned_entities(expires_at) WHERE is_active = true;
