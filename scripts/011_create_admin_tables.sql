-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_super_admin BOOLEAN DEFAULT false
);

-- Create user_activity_log table
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  isp TEXT,
  browser TEXT,
  device TEXT,
  os TEXT,
  is_proxy BOOLEAN DEFAULT false,
  is_hosting BOOLEAN DEFAULT false,
  is_mobile BOOLEAN DEFAULT false,
  risk_score INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method_id UUID,
  verification_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'expired')),
  ip_address TEXT,
  browser TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '40 seconds'),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES admin_users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_expires_at ON verification_requests(expires_at);

-- Disable RLS on admin tables since they're accessed via service role
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests DISABLE ROW LEVEL SECURITY;
