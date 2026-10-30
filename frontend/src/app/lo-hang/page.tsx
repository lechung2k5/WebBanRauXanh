'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/auth';
import { useApp } from '@/context/AppContext';
import { FormDialog, type Row, type Field } from '@/components/admin/AdminConsole';

export default function LotsPage() {
  const [lots, setLots] = useState<Row[]>([]); const [error, setError] = useState(''); const [selected, setSelected] = useState<Row | null>(null); const [message, setMessage] = useState(''); const { currentUser } = useApp(); const router = useRouter();
  useEffect(() => {
    api<any>('harvest-lots').then(res => {
      const list: Row[] = Array.isArray(res) ? res : (res?.content || []);
      setLots(list.map(l => ({ ...l, lot_code: l.lot_code || l.lotCode, product_name: l.product_name || l.productName, farmer_name: l.farmer_name || l.farmerName, puc_code: l.puc_code || l.pucCode, base_price_per_kg: l.base_price_per_kg ?? l.basePricePerKg, available_weight_kg: l.available_weight_kg ?? l.availableWeightKg, expiry_date: l.expiry_date || l.expiryDate, req_temp_min: l.req_temp_min ?? l.reqTempMin, req_temp_max: l.req_temp_max ?? l.reqTempMax, tier_pricing_json: l.tier_pricing_json || l.tierPricingJson })));
    }).catch(e => setError(String(e)));
  }, []);
  const rfq = (lot: Row) => {
    if (!currentUser) { router.push('/dang-nhap?redirect=/lo-hang'); return; }
    if (!currentUser.roles.includes('ROLE_BUYER')) { setError('Chỉ tài khoản BUYER được gửi RFQ.'); return; }
    if (!currentUser.profileComplete || currentUser.kycStatus !== 'VERIFIED') { router.push('/portal/buyer'); return; }
    setSelected(lot);
  };
  const fields: Field[] = [{ name: 'weightKg', label: 'Sản lượng đề nghị (kg), tối thiểu 100', type: 'number', value: 500 }, { name: 'pricePerKg', label: 'Đơn giá đề nghị (đ/kg)', type: 'number', value: Number(selected?.base_price_per_kg || 0) }, { name: 'deliveryAddress', label: 'Kho tiếp nhận', value: currentUser?.warehouseAddress || '' }];
  return <main className="min-h-screen bg-[#F5F6F2] p-5 sm:p-10"><div className="max-w-6xl mx-auto space-y-6"><Link href="/" className="font-bold text-green-900">← HoNa Fresh</Link><h1 className="text-3xl font-bold text-green-950">Lô nông sản đang chào bán</h1><p className="text-gray-500">Giao dịch từ 100 kg. Khối lượng và giá được chốt qua RFQ.</p>{error && <p role="alert" className="bg-red-50 text-red-800 p-3 rounded-xl">{error}</p>}{message && <p className="bg-green-50 p-3 rounded-xl">{message}</p>}<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{lots.map(lot => <article key={String(lot.id)} className="bg-white border rounded-2xl p-5 space-y-3"><p className="text-xs text-gray-500">{String(lot.lot_code)}</p><h2 className="text-xl font-bold">{String(lot.product_name)}</h2><p className="text-sm">{String(lot.farmer_name)} · {String(lot.certification)}</p><p className="text-sm">Mã vùng trồng: {String(lot.puc_code)}</p><p className="text-2xl font-bold text-green-900">{Number(lot.base_price_per_kg).toLocaleString('vi-VN')} đ/kg</p><p className="text-sm">Còn {Number(lot.available_weight_kg).toLocaleString('vi-VN')} kg · Hạn {String(lot.expiry_date)}</p><p className="text-sm">Bảo quản {String(lot.req_temp_min)} – {String(lot.req_temp_max)}°C</p><div className="text-xs bg-green-50 rounded-xl p-3">{typeof lot.tier_pricing_json === 'string' ? (JSON.parse(lot.tier_pricing_json) as {minKg:number;price:number}[]).map(t => <p key={t.minKg}>Từ {t.minKg} kg: {t.price.toLocaleString('vi-VN')} đ/kg</p>) : 'Liên hệ để thỏa thuận giá theo sản lượng'}</div><button className="bg-green-900 text-white rounded-xl px-4 py-3 w-full" onClick={() => rfq(lot)}>Gửi yêu cầu báo giá</button></article>)}</div>{lots.length === 0 && !error && <p className="p-12 bg-white rounded-2xl text-center">Chưa có lô được duyệt mở bán.</p>}{selected && <FormDialog value={{ title: `RFQ · ${selected.product_name}`, fields, submit: values => api('buyer/contracts', 'POST', { ...values, lotId: selected.id, logisticsFee: 0 }) }} onClose={() => setSelected(null)} onDone={() => { setSelected(null); setMessage('Đã gửi RFQ. Theo dõi trong Portal Thương lái.'); }} />}</div></main>;
}
