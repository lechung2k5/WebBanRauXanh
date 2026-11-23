'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminProductsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/harvest-lots');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-[#6B7280] gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#10542C]" />
      <p className="text-xs font-medium">Hệ thống đã chuyển đổi sang mô hình Lô Nông Sản B2B. Đang chuyển hướng...</p>
    </div>
  );
}
