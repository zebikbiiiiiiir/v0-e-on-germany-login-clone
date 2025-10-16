-- Drop the complex banned_entities table if it exists
DROP TABLE IF EXISTS banned_entities CASCADE;

-- Create simple banned_ips table
CREATE TABLE IF NOT EXISTS banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Disable RLS (accessed via anon key with simple queries)
ALTER TABLE banned_ips DISABLE ROW LEVEL SECURITY;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_banned_ips_lookup ON banned_ips(ip_address, is_active);
