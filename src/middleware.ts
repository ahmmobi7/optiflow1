import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session cookie — required for Server Components to read auth state
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Not logged in → redirect to login (except public routes)
  if (!session && !PUBLIC_ROUTES.includes(pathname)) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in → don't let them sit on login/register
  if (session && PUBLIC_ROUTES.includes(pathname)) {
    // Let the root page.tsx handle the role-based redirect
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api|public).*)',
  ],
};
