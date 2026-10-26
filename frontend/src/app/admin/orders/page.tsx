'use client';

import React, { useState, useEffect } from 'react';
import { OrderResponse } from '@/types';
import { getAdminOrdersApi, updateOrderStatusApi } from '@/services/api';
import {
  ShoppingBag,
  Eye,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
} from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const orderStatusLabels: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    PROCESSING: 'Đang đóng gói',
    SHIPPING: 'Đang giao hàng',
    DELIVERED: 'Đã giao thành công',
    CANCELLED: 'Đã hủy',
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Khóa cuộn trang nền khi modal chi tiết đơn hàng mở
  useEffect(() => {
    if (selectedOrder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedOrder]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getAdminOrdersApi();
      setOrders(res.data || []);
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderStatusChange = async (order: OrderResponse, status: string) => {
    if (status === order.status) return;
    setUpdatingOrderId(order.id);
    try {
      const updated = await updateOrderStatusApi(order.id, status);
      setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedOrder((current) => (current?.id === updated.id ? updated : current));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái đơn hàng.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const formatOrderDate = (date?: string) => (date ? new Date(date).toLocaleString('vi-VN') : '—');

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Banner Tiêu Đề Đơn Hàng - Đồng bộ chuẩn thiết kế */}
      <div className="bg-gradient-to-r from-[#10542C] via-[#1B6D3D] to-[#0A4020] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-[#8BC34A]" /> Quản Lý Đơn Hàng & Vận Đơn
          </h2>
          <p className="text-xs text-white/80 mt-1">
            Theo dõi tiến trình giao nhận, cập nhật trạng thái hợp đồng nguyên tắc và điều phối xe lạnh theo thời gian thực.
          </p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#6B7280] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-[#10542C] animate-spin" />
            <span>Đang tải danh sách đơn hàng sàn...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#6B7280] space-y-2">
            <AlertCircle className="w-8 h-8 text-[#9CA3AF] mx-auto" />
            <p className="font-bold">Chưa có đơn hàng nào được ghi nhận.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F5] text-[#2C3E2E] uppercase font-bold text-[11px] border-b border-[#EAECE8]">
                <tr>
                  <th className="py-3 px-3">Mã đơn</th>
                  <th className="py-3 px-3">Khách hàng</th>
                  <th className="py-3 px-3">Ngày đặt</th>
                  <th className="py-3 px-3">Tổng tiền</th>
                  <th className="py-3 px-3">Thanh toán</th>
                  <th className="py-3 px-3">Trạng thái vận chuyển</th>
                  <th className="py-3 px-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2ED]">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F9F9F5]/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#10542C]">
                      {order.orderCode}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-[#2C3E2E]">{order.recipientName}</p>
                      <p className="text-[10px] text-[#6B7280]">{order.recipientPhone}</p>
                    </td>
                    <td className="py-3 px-3 text-[#6B7280] whitespace-nowrap">
                      {formatOrderDate(order.createdAt)}
                    </td>
                    <td className="py-3 px-3 font-bold text-[#10542C]">
                      {formatVND(order.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-[#6B7280]">
                      <span className="font-medium text-[#2C3E2E]">
                        {order.paymentMethod === 'COD' ? 'COD (Tiền mặt)' : 'Chuyển khoản'}
                      </span>
                      <br />
                      <span className={`text-[10px] font-bold ${order.isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {order.isPaid ? '✓ Đã thanh toán' : '⏳ Chưa thanh toán'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={order.status}
                          disabled={updatingOrderId === order.id}
                          onChange={(e) => handleOrderStatusChange(order, e.target.value)}
                          className="bg-white border border-[#EAECE8] rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-[#10542C] focus:outline-none focus:border-[#10542C] disabled:opacity-50 cursor-pointer"
                        >
                          {Object.entries(orderStatusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        {updatingOrderId === order.id && (
                          <Loader2 className="w-3.5 h-3.5 text-[#10542C] animate-spin shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1 text-[#10542C] font-bold hover:underline cursor-pointer bg-[#EAF5E9] px-2.5 py-1 rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5" /> Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Chi Tiết Đơn Hàng (Cuộn Độc Lập) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="relative z-10 bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#EAECE8] flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Cố Định */}
            <div className="p-5 sm:p-6 border-b border-[#F0F2ED] bg-[#FDFDFB] flex items-start justify-between gap-4 shrink-0">
              <div>
                <p className="text-xs text-[#6B7280]">Chi tiết đơn hàng</p>
                <h3 className="font-heading text-xl font-black text-[#10542C] font-mono">
                  {selectedOrder.orderCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-[#6B7280] hover:text-[#2C3E2E] text-2xl cursor-pointer p-1 rounded-full hover:bg-slate-100 w-8 h-8 flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>

            {/* Thân Modal Cuộn Độc Lập */}
            <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 text-xs">
              <div className="space-y-2 bg-[#F9F9F5] p-4 rounded-2xl border border-[#EAECE8] text-[#2C3E2E]">
                <p>
                  <strong>Người nhận:</strong> {selectedOrder.recipientName} - {selectedOrder.recipientPhone}
                </p>
                <p>
                  <strong>Địa chỉ giao:</strong> {selectedOrder.shippingAddress}
                </p>
                <p>
                  <strong>Ghi chú đơn hàng:</strong> {selectedOrder.note || 'Không có ghi chú'}
                </p>
                <p>
                  <strong>Hình thức thanh toán:</strong>{' '}
                  {selectedOrder.paymentMethod === 'COD' ? 'Thanh toán tiền mặt khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#2C3E2E] mb-2">Danh sách mặt hàng</h4>
                <div className="border border-[#F0F2ED] rounded-2xl divide-y divide-[#F0F2ED] overflow-hidden">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="p-3 flex justify-between gap-3 text-xs bg-white">
                      <span>
                        {item.productName} × {item.quantity}
                      </span>
                      <strong className="text-[#10542C]">{formatVND(item.totalPrice)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between border-t border-[#F0F2ED] pt-3 font-black text-sm text-[#10542C]">
                <span>Tổng cộng đơn hàng</span>
                <span>{formatVND(selectedOrder.totalAmount)}</span>
              </div>
            </div>

            {/* Footer Cố Định */}
            <div className="p-4 border-t border-[#F0F2ED] bg-[#FDFDFB] shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-[#10542C] text-white rounded-xl text-xs font-bold hover:bg-[#0C3E20] cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
