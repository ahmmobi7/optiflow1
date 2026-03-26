import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Client-side Supabase client (for use in Client Components only)
export const createClient = () => createClientComponentClient();
