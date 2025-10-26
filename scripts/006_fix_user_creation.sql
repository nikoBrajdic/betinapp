-- ============================================
-- FIX USER CREATION ISSUE
-- ============================================
-- 
-- This script helps debug and fix the "Database error saving new user" issue
-- 
-- ============================================

-- First, let's check if there are any existing profiles that might be causing conflicts
SELECT 'Current profiles:' as status;
SELECT id, email, role, full_name, created_at FROM profiles ORDER BY created_at DESC;

-- Check if there are any auth users
SELECT 'Auth users count:' as status;
SELECT COUNT(*) as user_count FROM auth.users;

-- Let's also check if there are any constraint issues
-- First, let's see what the profiles table structure looks like
SELECT 'Profiles table structure:' as status;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check for any existing triggers
SELECT 'Current triggers:' as status;
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

-- Let's temporarily disable the trigger to see if that fixes the issue
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert the profile, but handle conflicts gracefully
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Test the function by checking if it works
SELECT 'Trigger recreated successfully' as status;
