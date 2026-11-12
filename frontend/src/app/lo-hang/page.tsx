'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/auth';
import { getPublicHarvestLotsApi } from '@/services/api';
import { subscribeB2bSyncEvents } from '@/services/b2bSyncService';
import { HarvestLot } from '@/types';
import { useApp } from '@/context/AppContext';
import { FormDialog, type Row, type Field } from '@/components/admin/AdminConsole';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 10;

function parseTiers(value: unknown): { minKg: number; price: number }[] {
  if (Array.isArray(value)) return value as { minKg: number; price: number }[];
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function LotsPage() {
  const [lots, setLots] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [message, setMessage] = useState('');
  const { currentUser } = useApp();
  const router = useRouter();

  const fetchLots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPublicHarvestLotsApi({ page: page - 1, size: PAGE_SIZE, status: 'OPEN' });
      const list: HarvestLot[] = res?.data || [];
      setLots(
        list.map((lot) => ({
          ...lot,
          id: lot.id,
          lot_code: lot.lotCode,
          product_name: lot.productName,
          farmer_name: lot.farmerName,
          puc_code: lot.pucCode,
          base_price_per_kg: lot.basePricePerKg,
          available_weight_kg: lot.availableWeightKg,
          expiry_date: lot.expiryDate,
          req_temp_min: lot.reqTempMin,
          req_temp_max: lot.reqTempMax,
          tier_pricing_json: lot.tierPricingJson,
          image_url: lot.imageUrl,
          status: lot.status,
        }))
      );
      const count = Number(res?.totalElements ?? list.length);
      setTotalElements(count);
      setTotalPages(Math.max(1, Number(res?.totalPages ?? Math.ceil(count / PAGE_SIZE))));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchLots();
  }, [fetchLots]);

  // Lắng nghe sự kiện đồng bộ thời gian thực từ Admin (Duyệt lô mới, cập nhật trạng thái)
  useEffect(() => {
    const unsubscribe = subscribeB2bSyncEvents((event) => {
      if (
        event.type === 'LOT_STATUS_UPDATED' ||
        event.type === 'LOT_CREATED' ||
        event.type === 'LOT_UPDATED'
      ) {
        void fetchLots();
      }
    });
    const handleStorage = () => void fetchLots();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('b2b_sync_event', handleStorage);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('b2b_sync_event', handleStorage);
    };
  }, [fetchLots]);

  const rfq = (lot: Row) => {
    if (!currentUser) { router.push('/dang-nhap?redirect=/lo-hang'); return; }
    if (!currentUser.roles.includes('ROLE_BUYER')) { setError('Chỉ tài khoản Thương lái mới có quyền gửi yêu cầu đàm phán giá.'); return; }
    if (!currentUser.profileComplete || currentUser.kycStatus !== 'VERIFIED') { router.push('/portal/buyer'); return; }
    setSelected(lot);
  };

  const fields: Field[] = [
    { name: 'weightKg', label: 'Sản lượng đề nghị (kg), tối thiểu 100', type: 'number', value: 500 },
    { name: 'pricePerKg', label: 'Đơn giá đề nghị (đ/kg)', type: 'number', value: Number(selected?.base_price_per_kg || 0) },
    { name: 'deliveryAddress', label: 'Kho tiếp nhận', value: currentUser?.warehouseAddress || '' },
  ];

  return (
    <main className="min-h-screen bg-[#F5F6F2] p-5 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link href="/" className="font-bold text-green-900">← HoNa Fresh</Link>
        <div className="bg-white rounded-3xl border border-green-100 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wider font-bold text-green-700">SÀN GIAO DỊCH B2B</p>
          <h1 className="text-3xl font-black text-green-950 mt-1">Lô nông sản đang chào bán</h1>
          <p className="text-gray-500 mt-2">Tối đa {PAGE_SIZE} lô mỗi trang · Giao dịch từ 100 kg · Khối lượng và giá được chốt qua thương lượng giá sỉ trực tiếp.</p>
        </div>

        {error && <p role="alert" className="bg-red-50 text-red-800 p-3 rounded-xl">{error}</p>}
        {message && <p className="bg-green-50 p-3 rounded-xl">{message}</p>}

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500">Đang tải danh sách lô nông sản...</div>
        ) : lots.length === 0 ? (
          <p className="p-12 bg-white rounded-2xl text-center">Chưa có lô được duyệt mở bán.</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-5" id="lots-grid">
              {lots.map((lot) => {
                const tiers = parseTiers(lot.tier_pricing_json);
                return (
                  <article key={String(lot.id)} className="bg-white border border-green-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="relative h-48 bg-green-50">
                      <img src={String(lot.image_url || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800')} alt={String(lot.product_name)} className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute top-3 left-3 rounded-full bg-green-950/85 text-white text-[11px] font-bold px-3 py-1">{String(lot.lot_code)}</span>
                    </div>
                    <div className="p-5 space-y-3 flex-1">
                      <div><p className="text-xs text-gray-500">{String(lot.farmer_name)} · {String(lot.certification || 'VietGAP')}</p><h2 className="text-xl font-black text-green-950 mt-1">{String(lot.product_name)}</h2></div>
                      <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-green-50 text-green-800 px-2.5 py-1 font-bold">PUC: {String(lot.puc_code)}</span><span className="rounded-lg bg-sky-50 text-sky-800 px-2.5 py-1">Bảo quản {String(lot.req_temp_min)}–{String(lot.req_temp_max)}°C</span></div>
                      <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl p-3 text-xs"><div><span className="text-gray-500">Còn sẵn sàng</span><p className="font-black text-green-900 mt-1">{Number(lot.available_weight_kg).toLocaleString('vi-VN')} kg</p></div><div><span className="text-gray-500">Hạn lô</span><p className="font-bold text-gray-800 mt-1">{String(lot.expiry_date)}</p></div></div>
                      <div><p className="text-xs text-gray-500">Giá sỉ xuất vườn</p><p className="text-2xl font-black text-green-900">{Number(lot.base_price_per_kg).toLocaleString('vi-VN')} đ/kg</p></div>
                      <div className="text-xs bg-green-50 rounded-xl p-3 space-y-1">{tiers.length ? tiers.map((tier) => <p key={`${tier.minKg}-${tier.price}`}>Từ {Number(tier.minKg).toLocaleString('vi-VN')} kg: <b>{Number(tier.price ?? (tier as any).pricePerKg).toLocaleString('vi-VN')} đ/kg</b></p>) : 'Liên hệ để thỏa thuận giá theo sản lượng'}</div>
                    </div>
                    <div className="p-5 pt-0"><button className="bg-green-900 hover:bg-green-800 text-white rounded-xl px-4 py-3 w-full font-bold" onClick={() => rfq(lot)}>Thương lượng giá mua sỉ</button></div>
                  </article>
                );
              })}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={totalElements} pageSize={PAGE_SIZE} onPageChange={setPage} scrollTargetId="lots-grid" />
          </>
        )}

        {selected && <FormDialog value={{ title: `Thương lượng giá sỉ · ${selected.product_name}`, fields, submit: (values) => api('buyer/contracts', 'POST', { ...values, lotId: selected.id, logisticsFee: 0 }) }} onClose={() => setSelected(null)} onDone={() => { setSelected(null); setMessage('Đã gửi đề xuất giá mua sỉ. Theo dõi trong Cổng Thương lái.'); }} />}
      </div>
    </main>
  );
}
