-- Quick fix for join_requests RLS policy
-- Run this in Supabase SQL Editor to fix the 42501 error

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Superadmins can manage join requests" ON public.join_requests;

-- Only allow users in allowlist to create join requests
DROP POLICY IF EXISTS "Allowlisted users can create join requests" ON public.join_requests;
CREATE POLICY "Allowlisted users can create join requests" ON public.join_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.allowlist 
      WHERE allowlist.email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Superadmins can update join requests" ON public.join_requests;
CREATE POLICY "Superadmins can update join requests" ON public.join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmins can delete join requests" ON public.join_requests;
CREATE POLICY "Superadmins can delete join requests" ON public.join_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    )
  );
