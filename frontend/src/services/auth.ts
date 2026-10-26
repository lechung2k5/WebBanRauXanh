import type { AuthResponse } from '@/types';

export type OtpChallenge = { email: string; requireOtp: true; otpType: string; otpExpirySeconds: number; resendAfterSeconds: number };
export type AuthResult = AuthResponse | OtpChallenge;
export function isChallenge(value: AuthResult): value is OtpChallenge { return 'requireOtp' in value && value.requireOtp; }
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/backend/${path}`, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-HoNa-Request': '1' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('; ') : data.message || 'Yêu cầu thất bại');
  return data.result as T;
}
export const portalFor = (roles: string[]) => {
  const routes: Record<string, string> = { ROLE_ADMIN: '/admin', ROLE_FARMER: '/portal/farmer', ROLE_BUYER: '/portal/buyer', ROLE_WAREHOUSE_QC: '/portal/warehouse-qc', ROLE_DRIVER: '/portal/driver', ROLE_ACCOUNTANT: '/portal/accountant' };
  return Object.entries(routes).find(([role]) => roles.includes(role))?.[1] || '/';
};
