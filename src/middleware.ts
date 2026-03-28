import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // IMPORTANT: always call getSession so the middleware refreshes
  // the auth cookie and passes it to Server Components correctly.
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Allow all API routes through
  if (pathname.startsWith('/api/')) return res;

  const isAuthPage = pathname === '/login' || pathname === '/register';

  // Not logged in → send to login (except auth pages themselves)
  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Logged in + on an auth page → send to role dispatcher
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/auth/redirect', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|public).*)',
  ],
};
