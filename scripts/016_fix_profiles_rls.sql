-- Fix profiles RLS policy to allow superadmins to update other users' profiles
-- Run this in Supabase SQL Editor

-- Drop the restrictive policy that only allows users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a new policy that allows users to update their own profile OR superadmins to update any profile
CREATE POLICY "Users can update own profile or superadmins can update any profile" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    )
  );
