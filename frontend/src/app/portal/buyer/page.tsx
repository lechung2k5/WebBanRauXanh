'use client';

import React, { Suspense } from 'react';
import BuyerManagementConsole from '@/components/buyer/BuyerManagementConsole';

export default function BuyerPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F4F5F1] text-sm font-semibold text-[#10542C]">
          Đang tải không gian làm việc Thương lái...
        </div>
      }
    >
      <BuyerManagementConsole />
    </Suspense>
  );
}
