import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import PartnerPortal from '@/components/PartnerPortal';
import BuyerManagementConsole from '@/components/buyer/BuyerManagementConsole';
import DriverInboundPickupConsole from '@/components/driver/DriverInboundPickupConsole';
import WarehouseReceivingConsole from '@/components/warehouse/WarehouseReceivingConsole';

export function generateStaticParams() {
  return ['farmer', 'buyer', 'warehouse-qc', 'driver', 'accountant'].map((role) => ({ role }));
}

async function PortalRoleContent({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!['farmer', 'buyer', 'warehouse-qc', 'driver', 'accountant'].includes(role)) notFound();
  if (role === 'buyer') {
    return <BuyerManagementConsole />;
  }
  if (role === 'driver') {
    return <DriverInboundPickupConsole />;
  }
  if (role === 'warehouse-qc') {
    return <WarehouseReceivingConsole />;
  }
  return <PartnerPortal role={role} />;
}

export default function Page({ params }: { params: Promise<{ role: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F6F2] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#10542C] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PortalRoleContent params={params} />
    </Suspense>
  );
}
