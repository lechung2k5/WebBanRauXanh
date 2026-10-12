'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getOrderByCode } from '@/services/api';
import { OrderResponse } from '@/types';
import {
  Clock,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Calendar,
  MapPin,
  ChevronRight,
  ReceiptText,
  AlertCircle,
  Phone,
} from 'lucide-react';

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [orderCode, setOrderCode] = useState(initialCode);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [localHistory, setLocalHistory] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load local history
    try {
      const history = JSON.parse(localStorage.getItem('xanhfarm_orders') || '[]');
      setLocalHistory(history);
      if (initialCode) {
        handleSearchCode(initialCode, history);
      } else if (history.length > 0) {
        setOrder(history[0]);
        setOrderCode(history[0].orderCode);
      }
    } catch {}
  }, [initialCode]);

  const handleSearchCode = async (codeToSearch: string, fallbackHistory?: OrderResponse[]) => {
    const code = codeToSearch.trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    setError(null);

    try {
      const res = await getOrderByCode(code);
      setOrder(res);
    } catch (err) {
      // Find in local history
      const list = fallbackHistory || localHistory;
      const found = list.find((o) => o.orderCode?.toUpperCase() === code);
      if (found) {
        setOrder(found);
      } else {
        setError(`Không tìm thấy đơn hàng với mã "${code}". Vui lòng kiểm tra lại.`);
        setOrder(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchCode(orderCode);
  };

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const statusSteps = [
    { key: 'PENDING', label: 'Tiếp nhận đơn', icon: Clock, desc: 'Hệ thống đã nhận đơn hàng' },
    { key: 'CONFIRMED', label: 'Đang đóng gói', icon: Package, desc: 'Rau tươi được đóng gói cẩn thận' },
    { key: 'SHIPPING', label: 'Đang giao 2h', icon: Truck, desc: 'Shipper đang trên đường giao' },
    { key: 'DELIVERED', label: 'Đã giao hàng', icon: CheckCircle2, desc: 'Giao hàng thành công' },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'PENDING': return 0;
      case 'CONFIRMED': return 1;
      case 'SHIPPING': return 2;
      case 'DELIVERED': return 3;
      default: return 1;
    }
  };

  const currentStep = order ? getStepIndex(order.status) : 0;

  return (
    <div className="min-h-screen bg-[#F9F9F5] flex flex-col justify-between">
      <Header />

      <main className="max-w-[1240px] mx-auto px-4 py-8 w-full flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-6">
          <Link href="/" className="hover:text-[#10542C]">Trang chủ</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#10542C] font-bold">Tra cứu đơn hàng</span>
        </div>

        {/* Thanh tìm kiếm mã đơn */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAECE8] shadow-xs mb-8">
          <h1 className="font-heading text-2xl font-black text-[#10542C] mb-2 flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-[#8BC34A]" /> Tra Cứu Tiến Trình Giao Hàng
          </h1>
          <p className="text-xs text-[#6B7280] mb-6">
            Nhập mã đơn hàng (ví dụ: HF100123) để kiểm tra trạng thái nông sản đang được đóng gói và giao đến bạn.
          </p>

          <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Nhập mã đơn hàng..."
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-2xl pl-11 pr-4 py-3.5 text-xs uppercase font-bold text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
              />
              <Search className="w-4 h-4 text-[#6B7280] absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0"
            >
              {loading ? 'Đang Tra Cứu...' : 'Tra Cứu Đơn'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-[#E53935] text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2 max-w-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Lịch sử đơn hàng gần đây (nếu có) */}
        {localHistory.length > 0 && !order && (
          <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs mb-8">
            <h2 className="font-heading font-bold text-sm text-[#2C3E2E] mb-4">Các đơn hàng đã đặt gần đây:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {localHistory.map((h) => (
                <button
                  key={h.orderCode}
                  type="button"
                  onClick={() => {
                    setOrderCode(h.orderCode);
                    setOrder(h);
                  }}
                  className="p-4 rounded-2xl bg-[#F9F9F5] border border-[#EAECE8] hover:border-[#10542C] text-left transition-all cursor-pointer"
                >
                  <p className="font-bold text-xs text-[#10542C]">{h.orderCode}</p>
                  <p className="text-[11px] text-[#6B7280] mt-1">{formatVND(h.totalAmount)} • {h.items?.length || 0} món</p>
                  <p className="text-[10px] text-[#2C3E2E] mt-2 font-semibold">Giao: {h.shippingAddress}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chi tiết đơn hàng */}
        {order && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Cột 1 & 2: Timeline Tiến Trình & Danh Sách Món */}
            <div className="lg:col-span-2 space-y-6">
              {/* Timeline Trạng Thái */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAECE8] shadow-xs">
                <div className="flex justify-between items-center border-b border-[#F0F2ED] pb-4 mb-6">
                  <div>
                    <span className="text-xs text-[#6B7280]">Mã vận đơn:</span>
                    <h2 className="font-heading font-black text-xl text-[#10542C]">{order.orderCode}</h2>
                  </div>
                  <span className="bg-[#D7EED6] text-[#10542C] text-xs font-bold px-3 py-1 rounded-full">
                    {order.status === 'DELIVERED' ? 'Giao thành công' : 'Đang xử lý giao hàng'}
                  </span>
                </div>

                {/* Stepper Progress */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
                  {statusSteps.map((step, idx) => {
                    const isDone = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex flex-col items-center text-center">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-all ${
                            isDone
                              ? 'bg-[#10542C] text-white shadow-md'
                              : 'bg-[#F4F5F1] text-[#6B7280]'
                          } ${isCurrent ? 'ring-4 ring-[#8BC34A]/30' : ''}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <h4 className={`text-xs font-bold ${isDone ? 'text-[#10542C]' : 'text-[#6B7280]'}`}>
                          {step.label}
                        </h4>
                        <p className="text-[10px] text-[#6B7280] mt-0.5 max-w-[120px]">{step.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Danh sách sản phẩm trong đơn */}
              <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
                <h3 className="font-heading font-bold text-base text-[#2C3E2E] border-b border-[#F0F2ED] pb-3">
                  Danh Sách Nông Sản Trong Đơn ({order.items?.length || 0} món)
                </h3>

                <div className="divide-y divide-[#F0F2ED]">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.productImageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300'}
                          alt={item.productName}
                          className="w-12 h-12 object-cover rounded-xl bg-[#F9F9F5] border border-[#EAECE8]"
                        />
                        <div>
                          <p className="font-bold text-[#2C3E2E]">{item.productName}</p>
                          <p className="text-[11px] text-[#6B7280]">
                            {item.quantity} x {formatVND(item.unitPrice)} / {item.unit || 'gói'}
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-[#10542C]">{formatVND(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cột 3: Thông Tin Giao Hàng & Hỗ Trợ */}
            <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-6">
              <h3 className="font-heading font-bold text-base text-[#2C3E2E] border-b border-[#F0F2ED] pb-3">
                Thông Tin Nhận Hàng
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#10542C] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#6B7280]">Địa chỉ giao:</span>
                    <p className="font-bold text-[#2C3E2E] mt-0.5">{order.shippingAddress}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-[#10542C] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#6B7280]">Người nhận:</span>
                    <p className="font-bold text-[#2C3E2E] mt-0.5">{order.recipientName} - {order.recipientPhone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <ReceiptText className="w-4 h-4 text-[#10542C] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#6B7280]">Thanh toán:</span>
                    <p className="font-bold text-[#10542C] mt-0.5">
                      {order.paymentMethod === 'COD' ? 'Tiền mặt (COD)' : 'Chuyển khoản VietQR'} • {order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#F0F2ED] pt-4 flex justify-between items-baseline">
                <span className="text-xs text-[#6B7280]">Tổng giá trị đơn:</span>
                <span className="font-heading font-black text-2xl text-[#10542C]">
                  {formatVND(order.totalAmount)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#D7EED6]/40 border border-[#D7EED6] text-xs text-[#10542C]">
                <p className="font-bold mb-1">Cần hỗ trợ đơn hàng?</p>
                <p className="text-[11px] text-[#2C3E2E]">Gọi ngay hotline 1900 6868 kèm mã <strong>{order.orderCode}</strong> để được hỗ trợ nhanh nhất.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9F9F5] flex items-center justify-center">Đang tải...</div>}>
      <OrderTrackingContent />
    </Suspense>
  );
}
