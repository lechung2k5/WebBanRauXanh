'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Timer } from 'lucide-react';
import { getRfqExpiresAt } from '@/utils/rfqStatus';

export default function RfqCountdown({ expiresAt, createdAt }: { expiresAt?: string; createdAt?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = useMemo(() => getRfqExpiresAt(expiresAt, createdAt) - now, [expiresAt, createdAt, now]);
  if (remaining <= 0) {
    return <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700"><Timer className="h-3.5 w-3.5" /> Đã hết hạn</span>;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const label = days > 0 ? `${days} ngày ${hours} giờ` : `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;

  return <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"><Timer className="h-3.5 w-3.5" /> Còn {label}</span>;
}
