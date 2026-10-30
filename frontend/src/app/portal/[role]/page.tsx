import { notFound } from 'next/navigation';
import PartnerPortal from '@/components/PartnerPortal';
export function generateStaticParams() {
  return ['farmer', 'buyer', 'warehouse-qc', 'driver', 'accountant'].map(role => ({ role }));
}
export default async function Page({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!['farmer', 'buyer', 'warehouse-qc', 'driver', 'accountant'].includes(role)) notFound();
  return <PartnerPortal role={role} />;
}
