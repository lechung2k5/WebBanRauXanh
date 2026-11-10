export type RfqStatus =
  | 'WAITING_FARMER'
  | 'WAITING_BUYER'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'PENDING'
  | 'COUNTER_OFFER';

export type NormalizedRfqStatus = Exclude<RfqStatus, 'PENDING' | 'COUNTER_OFFER'>;

export function normalizeRfqStatus(status?: string): NormalizedRfqStatus | string {
  if (status === 'PENDING') return 'WAITING_FARMER';
  if (status === 'COUNTER_OFFER') return 'WAITING_BUYER';
  return status || 'WAITING_FARMER';
}

export function isRfqWaitingForFarmer(status?: string) {
  return normalizeRfqStatus(status) === 'WAITING_FARMER';
}

export function isRfqWaitingForBuyer(status?: string) {
  return normalizeRfqStatus(status) === 'WAITING_BUYER';
}

export function getRfqExpiresAt(expiresAt?: string, createdAt?: string) {
  if (expiresAt) return new Date(expiresAt).getTime();
  if (createdAt) return new Date(createdAt).getTime() + 24 * 60 * 60 * 1000;
  return 0;
}

export function isRfqExpiredAt(expiresAt?: string, createdAt?: string, status?: string) {
  return normalizeRfqStatus(status) === 'EXPIRED' || (getRfqExpiresAt(expiresAt, createdAt) > 0 && getRfqExpiresAt(expiresAt, createdAt) <= Date.now());
}

export function getRfqStatusMeta(status?: string, viewer?: 'BUYER' | 'FARMER') {
  const normalized = normalizeRfqStatus(status);
  const meta: Record<string, { label: string; className: string; nextActor?: 'BUYER' | 'FARMER' }> = {
    WAITING_FARMER: { label: 'Chờ người bán phản hồi', className: 'bg-amber-100 text-amber-800', nextActor: 'FARMER' },
    WAITING_BUYER: { label: 'Chờ người mua phản hồi', className: 'bg-sky-100 text-sky-800', nextActor: 'BUYER' },
    ACCEPTED: { label: 'Đã chốt đàm phán', className: 'bg-emerald-100 text-emerald-800' },
    REJECTED: { label: 'Đã từ chối', className: 'bg-rose-100 text-rose-800' },
    EXPIRED: { label: 'Đã hết hạn', className: 'bg-slate-200 text-slate-700' },
  };
  const result = meta[normalized] || { label: normalized, className: 'bg-slate-100 text-slate-700' };
  if (viewer === 'FARMER' && normalized === 'WAITING_FARMER') return { ...result, label: 'Chờ bạn phản hồi' };
  if (viewer === 'BUYER' && normalized === 'WAITING_BUYER') return { ...result, label: 'Chờ bạn phản hồi' };
  return result;
}
