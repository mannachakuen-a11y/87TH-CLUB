import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/** First line of defence for the admin area. Every admin page/action also re-checks the session against the database. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();
  const token = req.cookies.get('club_admin')?.value;
  let ok = false;
  if (token && process.env.AUTH_SECRET) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      ok = payload.typ === 'admin';
    } catch {
      ok = false;
    }
  }
  if (ok) {
    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
  if (pathname.startsWith('/api/admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = pathname !== '/admin' ? `?next=${encodeURIComponent(pathname)}` : '';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
