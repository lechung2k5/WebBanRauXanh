import type { AuthResponse } from '@/types';

export type OtpChallenge = { email: string; requireOtp: true; otpType: string; otpExpirySeconds: number; resendAfterSeconds: number };
export type AuthResult = AuthResponse | OtpChallenge;
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('xanhfarm_user') || sessionStorage.getItem('xanhfarm_user');
  if (!raw) return null;
  try { return (JSON.parse(raw) as AuthResponse).accessToken || null; } catch { return null; }
}
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAccessToken();
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
export function isChallenge(value: AuthResult): value is OtpChallenge { return 'requireOtp' in value && value.requireOtp; }
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = authHeaders({ 'X-HoNa-Request': '1' });
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`/api/backend/${path}`, {
    method,
    cache: 'no-store',
    headers,
    ...(body === undefined ? {} : { body: isFormData ? body : JSON.stringify(body) })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('; ') : data.message || 'Yêu cầu thất bại');
  return data.result as T;
}
export const portalFor = (roles: string[]) => {
  const routes: Record<string, string> = { ROLE_ADMIN: '/admin', ROLE_FARMER: '/portal/farmer', ROLE_BUYER: '/portal/buyer', ROLE_WAREHOUSE_QC: '/portal/warehouse-qc', ROLE_DRIVER: '/portal/driver', ROLE_ACCOUNTANT: '/portal/accountant' };
  return Object.entries(routes).find(([role]) => roles.includes(role))?.[1] || '/';
};
