import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Server-side Supabase client (for use in Server Components only)
export const createServerClient = () =>
  createServerComponentClient({ cookies });
