import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

// Simple runtime configuration to use nodejs instead of edge
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token and role from cookies
  const token = request.cookies.get('token')?.value;
  const userRoleCookie = request.cookies.get('userRole')?.value;

  console.log('Middleware - Path:', pathname);
  console.log('Middleware - Token exists:', !!token);
  console.log('Middleware - UserRole cookie:', userRoleCookie);

  // Protected routes
  const isAdminRoute = pathname.startsWith('/admin');
  const isAgentRoute = pathname.startsWith('/agent');
  const isProtectedRoute = isAdminRoute || isAgentRoute;

  // If accessing protected route without token, redirect to signin
  if (isProtectedRoute && !token) {
    console.log('Middleware - No token, redirecting to signin');
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(url);
  }

  // If token exists, verify JWT and derive role from payload
  if (token && isProtectedRoute) {
    const decoded = verifyToken(token);

    if (!decoded) {
      console.log('Middleware - Invalid or expired token');
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'invalid_token');

      const response = NextResponse.redirect(url);
      response.cookies.delete('token');
      response.cookies.delete('userRole');
      return response;
    }

    const role = decoded.role || userRoleCookie; // fallback to cookie if token lacks role

    // Check if user is trying to access admin routes without admin role
    if (isAdminRoute && role !== 'admin') {
      console.log('Middleware - Access denied: Not an admin');
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }

    // Check if user is trying to access agent routes without agent role
    if (isAgentRoute && role !== 'agent') {
      console.log('Middleware - Access denied: Not an agent');
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }

    console.log('Middleware - Access granted');
    // Add role to response headers for use in pages
    const response = NextResponse.next();
    response.headers.set('x-user-role', role ?? '');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/agent/:path*'],
};
