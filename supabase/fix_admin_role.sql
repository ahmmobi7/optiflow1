-- Run this in Supabase SQL Editor to fix admin/technician roles
-- Replace the email addresses with your actual user emails

-- Grant admin role (run once after creating your admin account)
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your-admin@email.com';

-- Grant technician role
-- UPDATE public.profiles 
-- SET role = 'technician' 
-- WHERE email = 'your-tech@email.com';

-- Verify roles
SELECT id, email, role, created_at FROM public.profiles ORDER BY created_at;
