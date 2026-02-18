import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, verifyToken } from './lib/auth-edge';
import { checkRateLimit } from './lib/rate-limiter';

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup'];
const publicApiRoutes = ['/api/auth/login', '/api/auth/signup'];

/**
 * Get client IP address from request headers or connection info.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.ip ?? '127.0.0.1';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // Rate limit auth endpoints BEFORE auth check (to block brute force)
  if (pathname === '/api/auth/login' || pathname === '/api/auth/signup') {
    const { allowed, remaining } = checkRateLimit(`auth:${ip}`, 10, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': String(remaining),
          },
        }
      );
    }
  }

  // Allow public routes
  if (publicRoutes.includes(pathname) || publicApiRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    // Redirect to login for page requests
    if (!pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Return 401 for API requests
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the token
  const payload = await verifyToken(token);

  if (!payload) {
    // Clear invalid cookie and redirect/return error
    if (!pathname.startsWith('/api/')) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit API routes AFTER auth check
  if (pathname.startsWith('/api/')) {
    // Strict limits for AI endpoints (20 req/min)
    if (pathname.startsWith('/api/ai/')) {
      const { allowed, remaining } = checkRateLimit(`ai:${ip}`, 20, 60_000);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Remaining': String(remaining),
            },
          }
        );
      }
    } else {
      // General API rate limit (100 req/min)
      const { allowed, remaining } = checkRateLimit(`api:${ip}`, 100, 60_000);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Remaining': String(remaining),
            },
          }
        );
      }
    }
  }

  // If authenticated user tries to access login/signup, redirect to dashboard
  if (publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
    '/api/:path*',
  ],
};
