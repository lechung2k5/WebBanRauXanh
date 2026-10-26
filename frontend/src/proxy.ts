import { NextRequest, NextResponse } from 'next/server';

const ACCESS_COOKIE = 'hona_access';
const REFRESH_COOKIE = 'hona_refresh';

function parseJwt(token: string): { roles?: string[]; sub?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getPortalRoute(roles: string[] = []): string {
  if (roles.includes('ROLE_ADMIN')) return '/admin';
  if (roles.includes('ROLE_FARMER')) return '/portal/farmer';
  if (roles.includes('ROLE_BUYER')) return '/portal/buyer';
  if (roles.includes('ROLE_WAREHOUSE_QC')) return '/portal/warehouse-qc';
  if (roles.includes('ROLE_DRIVER')) return '/portal/driver';
  if (roles.includes('ROLE_ACCOUNTANT')) return '/portal/accountant';
  return '/';
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  const hasSession = !!access || !!refresh;
  const payload = access ? parseJwt(access) : null;
  const roles = payload?.roles || [];

  // 1. Chuyển hướng người dùng đã đăng nhập khi vào /dang-nhap hoặc /dang-ky
  if ((pathname === '/dang-nhap' || pathname === '/dang-ky') && hasSession && roles.length > 0) {
    const redirectUrl = request.nextUrl.searchParams.get('redirect');
    if (redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('/dang-')) {
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.redirect(new URL(getPortalRoute(roles), request.url));
  }

  // 2. Bảo vệ các Route Quản trị & Portal theo RBAC
  const isProtectedPortal = pathname.startsWith('/portal') || pathname.startsWith('/admin');
  if (isProtectedPortal) {
    if (!hasSession) {
      const loginUrl = new URL('/dang-nhap', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Kiểm tra chi tiết quyền truy cập theo từng Portal
    if (roles.length > 0) {
      if (pathname.startsWith('/admin') && !roles.includes('ROLE_ADMIN')) {
        return NextResponse.redirect(new URL(getPortalRoute(roles), request.url));
      }
      if (pathname.startsWith('/portal/farmer') && !roles.includes('ROLE_FARMER') && !roles.includes('ROLE_ADMIN')) {
        return NextResponse.redirect(new URL(getPortalRoute(roles), request.url));
      }
      if (pathname.startsWith('/portal/buyer') && !roles.includes('ROLE_BUYER') && !roles.includes('ROLE_ADMIN')) {
        return NextResponse.redirect(new URL(getPortalRoute(roles), request.url));
      }
      if (pathname.startsWith('/portal/warehouse-qc') && !roles.includes('ROLE_WAREHOUSE_QC') && !roles.includes('ROLE_ADMIN')) {
        return NextResponse.redirect(new URL(getPortalRoute(roles), request.url));
      }
      if (pathname.startsWith('/portal/driver') && !roles.includes('ROLE_DRIVER') && !roles.includes('ROLE_ADMIN')) {
        return NextResponse.redirect(new URL(getPortalRoute(roles), request.url));
      }
      if (pathname.startsWith('/portal/accountant') && !roles.includes('ROLE_ACCOUNTANT') && !roles.includes('ROLE_ADMIN')) {
        return NextResponse.redirect(new URL(getPortalRoute(roles), request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/portal/:path*',
    '/admin/:path*',
    '/dang-nhap',
    '/dang-ky',
  ],
};
