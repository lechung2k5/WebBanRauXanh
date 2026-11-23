'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminOrdersRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/contracts');
  }, [router]);

  return (
    <div className="p-8 text-center text-sm text-[#6B7280]">
      Đang chuyển tiếp sang trang Quản lý Hợp Đồng B2B...
    </div>
  );
}
