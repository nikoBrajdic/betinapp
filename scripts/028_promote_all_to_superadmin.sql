-- Make every admin a superadmin so everyone has full access.
-- Promotes all existing users and the allowlist; future signups are handled in code.

UPDATE public.profiles
SET role = 'superadmin'
WHERE role IS DISTINCT FROM 'superadmin';

UPDATE public.allowlist
SET role = 'superadmin'
WHERE role IS DISTINCT FROM 'superadmin';
