import { notFound } from 'next/navigation';
import PartnerPortal from '@/components/PartnerPortal';
import BuyerManagementConsole from '@/components/buyer/BuyerManagementConsole';
import DriverInboundPickupConsole from '@/components/driver/DriverInboundPickupConsole';
import WarehouseReceivingConsole from '@/components/warehouse/WarehouseReceivingConsole';

export function generateStaticParams() {
  return ['farmer', 'buyer', 'warehouse-qc', 'driver', 'accountant'].map((role) => ({ role }));
}

export default async function Page({ params }: { params: Promise<{ role: string }> }) {
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
