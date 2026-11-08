'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, MapPin, Package, RefreshCw, Truck, XCircle } from 'lucide-react';
import { getBuyerOrdersApi } from '@/services/api';
import type { OrderResponse } from '@/types';

const STEPS = [
  { key: 'PENDING', label: 'Đã tiếp nhận', icon: Clock3 },
  { key: 'CONFIRMED', label: 'Đang chuẩn bị', icon: Package },
  { key: 'SHIPPING', label: 'Đang giao', icon: Truck },
  { key: 'DELIVERED', label: 'Đã giao', icon: CheckCircle2 },
];

const statusLabel: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
};

const formatVnd = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Chưa cập nhật';

export default function BuyerOrdersPanel({ mode = 'purchases' }: { mode?: 'purchases' | 'tracking' }) {
  const isTracking = mode === 'tracking';
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getBuyerOrdersApi(0, 50);
      setOrders(response.data || []);
      setSelectedId((current) => current ?? response.data?.[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải sản phẩm đã mua');
      try {
        const local = JSON.parse(localStorage.getItem('hona_my_orders') || '[]') as OrderResponse[];
        setOrders(local);
        setSelectedId((current) => current ?? local[0]?.id ?? null);
      } catch {
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadOrders(); }, []);

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedId) || orders[0] || null, [orders, selectedId]);
  const selectedStep = selectedOrder?.status === 'CANCELLED' ? -1 : STEPS.findIndex((step) => step.key === selectedOrder?.status);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-600">LỊCH SỬ MUA HÀNG</p>
          <h2 className="text-2xl font-black text-slate-800 mt-1">{isTracking ? 'Theo dõi đơn hàng' : 'Sản phẩm đã mua'}</h2>
          <p className="text-sm text-slate-500 mt-1">{isTracking ? 'Theo dõi trạng thái xử lý và giao hàng của từng đơn.' : 'Xem lại các sản phẩm bạn đã đặt và chi tiết từng đơn hàng.'}</p>
        </div>
        <button type="button" onClick={() => void loadOrders()} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-sky-200 text-sky-700 text-sm font-bold hover:bg-sky-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 p-4 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error} Dữ liệu hiển thị thêm từ trình duyệt nếu có.</div>}

      {loading ? (
        <div className="bg-white rounded-3xl border border-sky-100 p-12 text-center text-slate-500">Đang tải lịch sử mua hàng...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-sky-200 p-12 text-center text-slate-500">
          <Package className="w-10 h-10 mx-auto mb-3 text-sky-300" />
          <p className="font-bold text-slate-700">Chưa có sản phẩm đã mua</p>
          <p className="text-sm mt-1">Các đơn hàng sau khi đặt thành công sẽ xuất hiện ở đây.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.6fr)] gap-5 items-start">
          <div className="space-y-3">
            {orders.map((order) => (
              <button key={order.id} type="button" onClick={() => setSelectedId(order.id)} className={`w-full text-left bg-white rounded-2xl border p-4 transition-all ${selectedOrder?.id === order.id ? 'border-sky-500 ring-2 ring-sky-100 shadow-sm' : 'border-slate-200 hover:border-sky-300'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-slate-800">{order.orderCode}</span>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${order.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700' : order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>{statusLabel[order.status] || order.status}</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">{formatDate(order.createdAt)} · {order.items?.length || 0} sản phẩm</p>
                <p className="font-black text-sky-700 mt-2">{formatVnd(order.totalAmount)}</p>
              </button>
            ))}
          </div>

          {selectedOrder && (
            <div className="bg-white rounded-3xl border border-sky-100 shadow-sm p-5 sm:p-7 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div><p className="text-xs text-slate-500">Chi tiết đơn hàng</p><h3 className="text-xl font-black text-slate-800">{selectedOrder.orderCode}</h3></div>
                <span className="text-sm font-bold text-sky-700">{statusLabel[selectedOrder.status] || selectedOrder.status}</span>
              </div>

              {selectedOrder.status === 'CANCELLED' ? (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 p-4 flex items-center gap-2 text-sm font-bold"><XCircle className="w-5 h-5" />Đơn hàng đã được hủy.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {STEPS.map((step, index) => { const Icon = step.icon; const done = index <= selectedStep; return <div key={step.key} className="text-center"><div className={`w-11 h-11 mx-auto rounded-2xl flex items-center justify-center ${done ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Icon className="w-5 h-5" /></div><p className={`text-xs font-bold mt-2 ${done ? 'text-sky-700' : 'text-slate-400'}`}>{step.label}</p></div>; })}
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <h4 className="font-black text-slate-800">Sản phẩm trong đơn ({selectedOrder.items?.length || 0})</h4>
                {selectedOrder.items?.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3"><div className="flex items-center gap-3 min-w-0"><img src={item.productImageUrl || '/placeholder-product.png'} alt={item.productName} className="w-12 h-12 rounded-xl object-cover bg-white border border-slate-200" /><div className="min-w-0"><p className="font-bold text-sm text-slate-800 truncate">{item.productName}</p><p className="text-xs text-slate-500">{item.quantity} × {formatVnd(item.unitPrice)} / {item.unit || 'sản phẩm'}</p></div></div><b className="text-sm text-sky-700 whitespace-nowrap">{formatVnd(item.totalPrice)}</b></div>)}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm"><div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs text-slate-500 mb-1">Người nhận</p><b>{selectedOrder.recipientName}</b><p className="text-slate-600 mt-1">{selectedOrder.recipientPhone}</p></div><div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Địa chỉ giao hàng</p><p className="text-slate-700">{selectedOrder.shippingAddress}</p></div></div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-4"><span className="font-bold text-slate-600">Tổng thanh toán</span><b className="text-xl text-sky-700">{formatVnd(selectedOrder.totalAmount)}</b></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
