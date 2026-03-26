import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register', '/'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // If not logged in and trying to access protected route
  if (!session && !PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If logged in, check role-based access
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const role = profile?.role;

    // Redirect from login/register to appropriate dashboard
    if (pathname === '/login' || pathname === '/register' || pathname === '/') {
      if (role === 'admin') return NextResponse.redirect(new URL('/admin', req.url));
      if (role === 'technician') return NextResponse.redirect(new URL('/technician', req.url));
      if (role === 'optician') return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Protect admin routes
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Protect technician routes
    if (pathname.startsWith('/technician') && role !== 'technician' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
