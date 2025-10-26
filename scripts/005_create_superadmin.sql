-- ============================================
-- CREATE SUPERADMIN USER
-- ============================================
-- 
-- IMPORTANT: Follow these steps in order:
-- 
-- 1. First, sign in to the app at /auth/login using Google OAuth
-- 2. This will create your user account in Supabase Auth
-- 3. Then, update the email below to YOUR Google email address
-- 4. Run this script in Supabase SQL Editor
-- 5. Refresh the app - you should now see "Manage Admins" in the sidebar
-- 
-- ============================================

-- Replace this email with your actual Google account email
UPDATE profiles
SET role = 'superadmin'
WHERE email = 'your-email@gmail.com';  -- CHANGE THIS TO YOUR EMAIL

-- Verify the update worked (optional - check the result)
SELECT id, email, role, created_at 
FROM profiles 
WHERE role = 'superadmin';

-- ============================================
-- TROUBLESHOOTING
-- ============================================
-- 
-- If the UPDATE returns 0 rows, it means your profile wasn't created yet.
-- This can happen if you haven't signed in with Google yet.
-- 
-- Solution: Sign in with Google first, then run this script again.
-- 
-- If you still have issues, you can manually create the profile:
-- (Uncomment the lines below and replace the email)
-- 
-- INSERT INTO profiles (id, email, role, full_name)
-- SELECT id, email, 'superadmin', raw_user_meta_data->>'full_name'
-- FROM auth.users
-- WHERE email = 'your-email@gmail.com'  -- CHANGE THIS TO YOUR EMAIL
-- ON CONFLICT (id) DO UPDATE SET role = 'superadmin';
