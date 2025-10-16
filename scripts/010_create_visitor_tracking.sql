-- Create visitor tracking table
CREATE TABLE IF NOT EXISTS visitor_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone TEXT,
  isp TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  device_type TEXT,
  user_agent TEXT,
  page_url TEXT NOT NULL,
  referrer TEXT,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visit_duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_ip ON visitor_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_country ON visitor_tracking(country);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_created_at ON visitor_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_user_id ON visitor_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_session_id ON visitor_tracking(session_id);

-- Enable Row Level Security
ALTER TABLE visitor_tracking ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts from anyone
CREATE POLICY "Allow public insert" ON visitor_tracking
  FOR INSERT
  WITH CHECK (true);

-- Fixed column reference from profiles.user_id to profiles.id
-- Create policy to allow admins to view all data
CREATE POLICY "Allow admin select" ON visitor_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'admin@eon.de'
    )
  );
