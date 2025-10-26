-- Create profiles for existing users who are in allowlist but don't have profiles
-- Run this in Supabase SQL Editor

-- First, let's see what users exist without profiles
SELECT 
  au.email,
  au.id as user_id,
  al.role as allowlist_role,
  p.id as profile_id
FROM auth.users au
LEFT JOIN public.allowlist al ON LOWER(au.email) = LOWER(al.email)
LEFT JOIN public.profiles p ON au.id = p.id
WHERE al.email IS NOT NULL 
  AND p.id IS NULL
ORDER BY au.created_at;

-- Create profiles for users in allowlist who don't have profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)) as full_name,
  al.role
FROM auth.users au
INNER JOIN public.allowlist al ON LOWER(au.email) = LOWER(al.email)
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Update any pending join requests to approved for users who now have profiles
UPDATE public.join_requests 
SET status = 'approved'
WHERE email IN (
  SELECT au.email 
  FROM auth.users au
  INNER JOIN public.profiles p ON au.id = p.id
  WHERE au.email = join_requests.email
);
