-- Run this AFTER schema.sql to fix existing user roles
-- Replace emails with your actual admin/technician emails

-- Step 1: Check current roles
SELECT id, email, role FROM public.profiles ORDER BY created_at;

-- Step 2: Set admin role (uncomment and edit)
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@yourlabs.com';

-- Step 3: Set technician role (uncomment and edit)
-- UPDATE public.profiles SET role = 'technician' WHERE email = 'tech@yourlabs.com';

-- Step 4: Verify
-- SELECT email, role FROM public.profiles;
