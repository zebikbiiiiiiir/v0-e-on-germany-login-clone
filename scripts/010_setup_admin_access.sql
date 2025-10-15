-- This script sets up admin access for users
-- Run this script to make a user an admin

-- Option 1: Make ALL existing users admins (for development/testing)
INSERT INTO admin_users (id, user_id, role, permissions, created_at)
SELECT 
  gen_random_uuid(),
  id,
  'super_admin',
  '{"manage_users": true, "approve_verifications": true, "export_data": true, "manage_features": true}'::jsonb,
  NOW()
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Option 2: Make a specific user admin (replace 'your-email@example.com' with actual email)
-- Uncomment and modify the email below:
/*
INSERT INTO admin_users (id, user_id, role, permissions, created_at)
SELECT 
  gen_random_uuid(),
  au.id,
  'super_admin',
  '{"manage_users": true, "approve_verifications": true, "export_data": true, "manage_features": true}'::jsonb,
  NOW()
FROM auth.users au
WHERE au.email = 'your-email@example.com'
ON CONFLICT (user_id) DO NOTHING;
*/

-- Create a function to easily add admins
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT, admin_role TEXT DEFAULT 'admin')
RETURNS void AS $$
BEGIN
  INSERT INTO admin_users (id, user_id, role, permissions, created_at)
  SELECT 
    gen_random_uuid(),
    au.id,
    admin_role,
    CASE 
      WHEN admin_role = 'super_admin' THEN '{"manage_users": true, "approve_verifications": true, "export_data": true, "manage_features": true}'::jsonb
      ELSE '{"approve_verifications": true, "export_data": true}'::jsonb
    END,
    NOW()
  FROM auth.users au
  WHERE au.email = user_email
  ON CONFLICT (user_id) DO UPDATE SET role = admin_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage example (uncomment to use):
-- SELECT make_user_admin('your-email@example.com', 'super_admin');
