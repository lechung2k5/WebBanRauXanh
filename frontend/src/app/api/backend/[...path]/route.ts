import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';

const BACKEND = process.env.BACKEND_API_URL || 'http://localhost:8080/api/v1';
const ACCESS = 'hona_access';
const REFRESH = 'hona_refresh';
type Session = { accessToken: string; refreshToken: string; expiresInSeconds: number; refreshExpiresInSeconds: number };
const refreshing = new Map<string, Promise<Session | null>>();

async function rotate(raw: string): Promise<Session | null> {
  const key = createHash('sha256').update(raw).digest('hex');
  const pending = refreshing.get(key);
  if (pending) return pending;
  const task = (async () => {
    const response = await fetch(`${BACKEND}/auth/refresh-token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: raw }), cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) return null;
    return (await response.json()).result as Session;
  })();
  refreshing.set(key, task);
  try { return await task; } finally { setTimeout(() => refreshing.delete(key), 3000); }
}

function sessionCookies(response: NextResponse, session: Session) {
  const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
  response.cookies.set(ACCESS, session.accessToken, { ...options, maxAge: session.expiresInSeconds });
  response.cookies.set(REFRESH, session.refreshToken, { ...options, maxAge: session.refreshExpiresInSeconds });
}
function clear(response: NextResponse) { response.cookies.delete(ACCESS); response.cookies.delete(REFRESH); }

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.some(p => !p || p === '.' || p === '..' || /[\\/]/.test(p))) return NextResponse.json({ message: 'Đường dẫn không hợp lệ' }, { status: 400 });
  const route = path.join('/');
  const mutating = !['GET', 'HEAD'].includes(request.method);
  const origin = process.env.APP_ORIGIN || request.nextUrl.origin;
  const reqOrigin = request.headers.get('origin');
  const validOrigin = !reqOrigin || reqOrigin === origin || reqOrigin === request.nextUrl.origin;
  if (mutating && (!validOrigin || request.headers.get('x-hona-request') !== '1' || !request.headers.get('content-type')?.startsWith('application/json'))) {
    return NextResponse.json({ code: 403, message: 'Yêu cầu không cùng nguồn hoặc thiếu CSRF header' }, { status: 403 });
  }
  let access = request.cookies.get(ACCESS)?.value;
  const refresh = request.cookies.get(REFRESH)?.value;
  let session: Session | null = null;
  try {
    if (Number(request.headers.get('content-length') || 0) > 4_000_000) return NextResponse.json({ message: 'Dữ liệu quá lớn' }, { status: 413 });
    let body = mutating ? await request.text() : undefined;
    if (body && body.length > 4_000_000) return NextResponse.json({ message: 'Dữ liệu quá lớn' }, { status: 413 });
    if (route === 'auth/refresh-token' || route === 'auth/logout') {
      if (!refresh) {
        const response = NextResponse.json({ code: route.endsWith('logout') ? 200 : 401, message: 'Không có phiên' }, { status: route.endsWith('logout') ? 200 : 401 }); clear(response); return response;
      }
      if (route === 'auth/refresh-token') {
        session = await rotate(refresh);
        const response = NextResponse.json({ code: session ? 200 : 401, message: session ? 'Đã làm mới phiên' : 'Phiên đã hết hạn' }, { status: session ? 200 : 401 });
        if (session) sessionCookies(response, session); else clear(response);
        return response;
      }
      body = JSON.stringify({ refreshToken: refresh }); access = undefined;
    }
    const publicAuth = route.startsWith('auth/') && !['auth/me', 'auth/profile', 'auth/logout-all', 'auth/google-link'].includes(route);
    if (!access && refresh && !publicAuth) { session = await rotate(refresh); access = session?.accessToken; }
    const url = `${BACKEND}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;
    const upstream = () => fetch(url, { method: request.method, headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) }, body, cache: 'no-store', signal: AbortSignal.timeout(route.endsWith('iot/events') ? 65000 : 20000) });
    let result = await upstream();
    if (result.status === 401 && refresh && !publicAuth && !session) { session = await rotate(refresh); if (session) { access = session.accessToken; result = await upstream(); } }
    if (result.ok && result.headers.get('content-type')?.includes('text/event-stream')) {
      const response = new NextResponse(result.body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
      if (session) sessionCookies(response, session); return response;
    }
    const data = await result.json();
    if (result.ok && data.result?.accessToken && data.result?.refreshToken) {
      session = { ...data.result } as Session;
      delete data.result.accessToken; delete data.result.refreshToken;
    }
    const response = NextResponse.json(data, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
    // Capture token values before stripping the payload (session may reference data.result).
    if (session?.accessToken) sessionCookies(response, session);
    if (route === 'auth/logout' || route === 'auth/logout-all' || (result.status === 401 && !publicAuth)) clear(response);
    return response;
  } catch {
    return NextResponse.json({ code: 503, message: 'Không kết nối được máy chủ. Vui lòng thử lại.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
