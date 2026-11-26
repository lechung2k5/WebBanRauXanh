'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManagerIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/manager/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-6 h-6 border-2 border-[#10542C] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
