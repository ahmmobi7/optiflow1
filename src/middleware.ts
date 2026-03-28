import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * The ONLY job of this middleware is to refresh the Supabase auth cookie
 * so that Server Components can read the session via createServerClient().
 * All auth redirects are handled inside the Server Component pages themselves.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  // Refreshes expired Access Token using the Refresh Token cookie
  await supabase.auth.getSession();
  return res;
}

export const config = {
  // Run on every route except static files and image optimisation
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|public).*)'],
};
