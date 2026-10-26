'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CheckoutRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F9F9F5] flex flex-col items-center justify-center text-[#6B7280] gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#10542C]" />
      <p className="text-xs font-medium">Giao dịch thu mua nông sản theo lô B2B thực hiện qua Hợp đồng & Đàm phán RFQ. Đang chuyển về trang chủ...</p>
    </div>
  );
}
