'use client';

import React, { useState } from 'react';
import { OrderResponse } from '@/types';
import { getOrderByCode } from '@/services/api';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  Package,
  AlertCircle,
  RotateCcw,
  Receipt,
  UserCheck,
} from 'lucide-react';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReorder?: (items: OrderResponse['items']) => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  onReorder,
}) => {
  const [orderCode, setOrderCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [searched, setSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCode.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const result = await getOrderByCode(orderCode.trim());
      setOrder(result);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // 4 Timeline Stepper Stages (RuleLayout Section E)
  const STEPS = [
    { key: 'PENDING', label: 'Chờ xác nhận', icon: Clock },
    { key: 'CONFIRMED', label: 'Đang đóng gói', icon: Package },
    { key: 'SHIPPING', label: 'Đang giao 2h', icon: Truck },
    { key: 'DELIVERED', label: 'Hoàn tất', icon: CheckCircle2 },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
        return 1;
      case 'SHIPPING':
        return 2;
      case 'DELIVERED':
        return 3;
      case 'CANCELLED':
        return -1;
      default:
        return 0;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl z-10 max-h-[92vh] overflow-y-auto border border-[#EAECE8]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#6B7280] hover:text-[#2C3E2E] rounded-full hover:bg-[#F4F5F1] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#10542C]/10 text-[#10542C] flex items-center justify-center">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-bold text-[#10542C]">Theo Dõi Đơn Hàng</h3>
            <p className="text-xs text-[#6B7280]">Kiểm tra lộ trình giao nhanh 2 giờ của HoNa Fresh</p>
          </div>
        </div>

        {/* Form tìm kiếm */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Nhập mã đơn hàng (VD: ORD-...)"
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-[#F9F9F5] border border-[#EAECE8] rounded-xl text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-5 py-2.5 text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Đang tìm...' : 'Tra cứu'}</span>
          </button>
        </form>

        {searched && !loading && (
          <div>
            {order ? (
              <div className="space-y-5 bg-[#F9F9F5] p-5 rounded-2xl border border-[#EAECE8]">
                {/* Header đơn hàng + Nút Mua Lại (RuleLayout E) */}
                <div className="flex justify-between items-center pb-3 border-b border-[#EAECE8]">
                  <div>
                    <span className="text-[11px] text-[#6B7280] block">Mã đơn hàng</span>
                    <span className="font-mono font-bold text-[#10542C] text-sm">{order.orderCode}</span>
                  </div>

                  {/* Nút "Mua lại đơn này" (UC04 - Quick Re-order) */}
                  {onReorder && order.items && order.items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onReorder(order.items);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-[#FB8C00] hover:bg-[#E67E00] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Mua lại đơn này</span>
                    </button>
                  )}
                </div>

                {/* Timeline Stepper 4 nấc (RuleLayout Section E) */}
                {order.status !== 'CANCELLED' ? (
                  <div className="py-2">
                    <span className="text-[11px] font-bold text-[#2C3E2E] block mb-3">
                      Tiến trình vận chuyển:
                    </span>
                    <div className="grid grid-cols-4 gap-2 relative">
                      {STEPS.map((step, idx) => {
                        const currentIdx = getStepIndex(order.status);
                        const isCompleted = idx <= currentIdx;
                        const isCurrent = idx === currentIdx;
                        const StepIcon = step.icon;

                        return (
                          <div key={step.key} className="flex flex-col items-center text-center">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                isCurrent
                                  ? 'bg-[#10542C] text-white ring-4 ring-[#8BC34A]/40 animate-pulse'
                                  : isCompleted
                                  ? 'bg-[#4CAF50] text-white'
                                  : 'bg-white border-2 border-[#EAECE8] text-[#6B7280]'
                              }`}
                            >
                              <StepIcon className="w-4 h-4" />
                            </div>
                            <span
                              className={`text-[10px] mt-1.5 leading-tight ${
                                isCurrent
                                  ? 'font-bold text-[#10542C]'
                                  : isCompleted
                                  ? 'font-medium text-[#2C3E2E]'
                                  : 'text-[#6B7280]'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#E53935]/10 rounded-xl text-xs text-[#E53935] font-bold">
                    Đơn hàng đã được hủy.
                  </div>
                )}

                {/* Thông tin giao hàng */}
                <div className="text-xs space-y-1.5 text-[#2C3E2E] bg-white p-3.5 rounded-xl border border-[#EAECE8]">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-[#4CAF50]" />
                    <span><strong>Người nhận:</strong> {order.recipientName} ({order.recipientPhone})</span>
                  </div>
                  <div><strong>Địa chỉ:</strong> {order.shippingAddress}</div>
                  <div><strong>Hình thức:</strong> {order.paymentMethod === 'COD' ? 'Tiền mặt khi nhận' : 'Chuyển khoản VietQR'}</div>
                  <div className="pt-1 border-t border-[#EAECE8] flex justify-between items-center">
                    <span>Tổng tiền:</span>
                    <span className="font-heading font-black text-[#10542C] text-sm">{formatVND(order.totalAmount)}</span>
                  </div>
                </div>

                {/* Danh mục sản phẩm */}
                {order.items && order.items.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#10542C] block">Nông sản trong đơn:</span>
                    <div className="space-y-1.5">
                      {order.items.map((it) => (
                        <div key={it.id} className="flex justify-between items-center text-xs text-[#6B7280] bg-white p-2 rounded-lg border border-[#EAECE8]">
                          <span className="text-[#2C3E2E] font-medium">{it.productName} × {it.quantity} {it.unit}</span>
                          <span className="font-bold text-[#10542C]">{formatVND(it.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-[#E53935]/5 border border-[#E53935]/20 rounded-2xl text-center text-[#E53935]">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold">Không tìm thấy đơn hàng</p>
                <p className="text-[11px] text-[#6B7280] mt-1">Vui lòng kiểm tra lại mã đơn hàng chính xác.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
