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

-- Method 1: Try to update existing profile (if you've logged in before)
UPDATE profiles
SET role = 'superadmin'
WHERE email = 'brajdic.niko@gmail.com';  -- CHANGE THIS TO YOUR EMAIL

-- Method 2: Create superadmin directly in auth.users and profiles
-- This creates both the auth user and profile without requiring OAuth

-- First, let's check if we can access auth.users and see what's there
SELECT 'Checking auth.users access...' as status;

-- Try to create the user in auth.users first
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'brajdic.niko@gmail.com',  -- CHANGE THIS TO YOUR EMAIL
    crypt('temp_password', gen_salt('bf')),  -- Temporary password
    NOW(),
    NULL,
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Niko Brajdić"}',  -- CHANGE THIS TO YOUR NAME
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Get the user ID we just created
SELECT id as created_user_id FROM auth.users WHERE email = 'brajdic.niko@gmail.com';

-- Now create or update the profile using the user ID
INSERT INTO profiles (id, email, role, full_name)
SELECT 
    id,
    'brajdic.niko@gmail.com',  -- CHANGE THIS TO YOUR EMAIL
    'superadmin',
    'Niko Brajdić'  -- CHANGE THIS TO YOUR NAME
FROM auth.users 
WHERE email = 'brajdic.niko@gmail.com'
ON CONFLICT (id) DO UPDATE SET 
    role = 'superadmin',
    full_name = 'Niko Brajdić',  -- CHANGE THIS TO YOUR NAME
    email = EXCLUDED.email;

-- Verify the update/insert worked (optional - check the result)
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
