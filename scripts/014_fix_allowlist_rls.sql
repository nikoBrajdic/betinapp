-- Fix allowlist RLS policy to allow auth callback to read it
-- Run this in Supabase SQL Editor

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Superadmins can view allowlist" ON public.allowlist;

-- Allow anyone to read allowlist (needed for auth callback)
CREATE POLICY "Anyone can view allowlist" ON public.allowlist
  FOR SELECT USING (true);

-- Keep the restrictive policy for INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Superadmins can manage allowlist" ON public.allowlist;
CREATE POLICY "Superadmins can manage allowlist" ON public.allowlist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    )
  );

-- Update join_requests RLS to allow auth callback to create/read
DROP POLICY IF EXISTS "Superadmins can view join requests" ON public.join_requests;
CREATE POLICY "Anyone can view join requests" ON public.join_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allowlisted users can create join requests" ON public.join_requests;
CREATE POLICY "Allowlisted users can create join requests" ON public.join_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.allowlist 
      WHERE allowlist.email = auth.jwt() ->> 'email'
    )
  );
