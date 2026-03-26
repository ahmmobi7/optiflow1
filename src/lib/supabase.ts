// Client-side Supabase client (safe to import in Client Components)
export { createClient } from './supabase-client';

// NOTE: For Server Components, import createServerClient directly from
// '@/lib/supabase-server' — never from this file — to avoid next/headers
// being bundled into the client build.
