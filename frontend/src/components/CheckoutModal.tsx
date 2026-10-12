'use client';

import React, { useState } from 'react';
import { CartItem, OrderRequest, OrderResponse } from '@/types';
import { createOrder } from '@/services/api';
import {
  X,
  Truck,
  CreditCard,
  Banknote,
  QrCode,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onOrderSuccess: (order: OrderResponse) => void;
  voucherDiscount?: number;
}

const DELIVERY_SLOTS = [
  { id: 'NOW_2H', label: 'Giao siêu tốc 2 giờ', desc: 'Nhận rau tươi giòn ngay trong ngày' },
  { id: 'TOMORROW_MORNING', label: 'Khung 8h - 10h sáng mai', desc: 'Rau mới hái sáng sớm' },
  { id: 'TOMORROW_AFTERNOON', label: 'Khung 16h - 18h chiều mai', desc: 'Kịp chuẩn bị bữa cơm tối' },
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onOrderSuccess,
  voucherDiscount = 0,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('NOW_2H');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const rawAmount = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const totalAmount = Math.max(0, rawAmount - voucherDiscount);

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError('Vui lòng điền đầy đủ tên, số điện thoại và địa chỉ nhận hàng.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedSlotObj = DELIVERY_SLOTS.find((s) => s.id === deliverySlot);
      const combinedNote = `[Khung giờ: ${selectedSlotObj?.label || 'Siêu tốc 2h'}] ${note.trim()}`.trim();

      const orderReq: OrderRequest = {
        recipientName: name.trim(),
        recipientPhone: phone.trim(),
        shippingAddress: address.trim(),
        note: combinedNote || undefined,
        paymentMethod: paymentMethod,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const result = await createOrder(orderReq);
      onOrderSuccess(result);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi tạo đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-2xl max-w-xl w-full p-5 sm:p-7 shadow-2xl z-10 max-h-[92vh] overflow-y-auto border border-[#EAECE8]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#6B7280] hover:text-[#2C3E2E] rounded-full hover:bg-[#F4F5F1] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#10542C]/10 text-[#10542C] flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-bold text-[#10542C]">Đặt Hàng Nhanh</h3>
            <p className="text-xs text-[#6B7280]">HoNa Fresh giao tận nơi nông sản sạch thu hoạch trong ngày</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#E53935]/10 border border-[#E53935]/20 text-[#E53935] text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. THÔNG TIN NHẬN HÀNG */}
          <div className="p-4 bg-[#F9F9F5] rounded-xl border border-[#EAECE8] space-y-3">
            <span className="text-xs font-bold text-[#10542C] uppercase tracking-wider block">
              1. Thông Tin Nhận Hàng
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#2C3E2E] mb-1">
                  Họ tên người nhận *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#EAECE8] rounded-lg text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2C3E2E] mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="VD: 0987654321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#EAECE8] rounded-lg text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#2C3E2E] mb-1">
                Địa chỉ chi tiết *
              </label>
              <input
                type="text"
                required
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#EAECE8] rounded-lg text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
              />
            </div>

            {/* Khung giờ nhận hàng linh hoạt (RuleLayout D.2) */}
            <div>
              <label className="block text-[11px] font-bold text-[#2C3E2E] mb-1.5">
                Khung giờ nhận hàng mong muốn:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DELIVERY_SLOTS.map((slot) => (
                  <div
                    key={slot.id}
                    onClick={() => setDeliverySlot(slot.id)}
                    className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      deliverySlot === slot.id
                        ? 'border-[#10542C] bg-[#10542C]/10 text-[#10542C] font-bold'
                        : 'border-[#EAECE8] bg-white text-[#2C3E2E] hover:border-[#10542C]/30'
                    }`}
                  >
                    <div className="font-bold">{slot.label}</div>
                    <div className="text-[10px] text-[#6B7280]">{slot.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. PHƯƠNG THỨC THANH TOÁN */}
          <div className="p-4 bg-[#F9F9F5] rounded-xl border border-[#EAECE8] space-y-3">
            <span className="text-xs font-bold text-[#10542C] uppercase tracking-wider block">
              2. Phương Thức Thanh Toán
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-[#10542C] bg-white text-[#10542C] font-bold shadow-2xs'
                    : 'border-[#EAECE8] bg-white hover:border-[#10542C]/30 text-[#2C3E2E]'
                }`}
              >
                <input
                  type="radio"
                  name="pm"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="accent-[#10542C]"
                />
                <Banknote className="w-4 h-4 text-[#10542C]" />
                <span className="text-xs">Tiền mặt khi nhận (COD)</span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'border-[#10542C] bg-white text-[#10542C] font-bold shadow-2xs'
                    : 'border-[#EAECE8] bg-white hover:border-[#10542C]/30 text-[#2C3E2E]'
                }`}
              >
                <input
                  type="radio"
                  name="pm"
                  value="BANK_TRANSFER"
                  checked={paymentMethod === 'BANK_TRANSFER'}
                  onChange={() => setPaymentMethod('BANK_TRANSFER')}
                  className="accent-[#10542C]"
                />
                <QrCode className="w-4 h-4 text-[#10542C]" />
                <span className="text-xs">Chuyển khoản VietQR</span>
              </label>
            </div>

            {/* Mở rộng hiển thị mã VietQR động nếu chọn chuyển khoản */}
            {paymentMethod === 'BANK_TRANSFER' && (
              <div className="mt-3 p-3.5 bg-white rounded-xl border border-[#EAECE8] text-center space-y-2">
                <span className="text-[11px] font-bold text-[#10542C] block">
                  Quét mã VietQR chuyển khoản nhanh:
                </span>
                <div className="relative w-40 h-40 mx-auto bg-gray-50 rounded-lg p-2 border border-[#EAECE8] flex items-center justify-center">
                  <img
                    src={`https://api.vietqr.io/image/970422-0987654321-compact2.jpg?amount=${totalAmount}&addInfo=HONAFRESH%20${phone || 'DONHANG'}`}
                    alt="VietQR code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-[11px] text-[#6B7280]">
                  STK: <strong>0987654321</strong> - MB Bank (HoNa Fresh)
                </div>
              </div>
            )}
          </div>

          {/* 3. GHI CHÚ ĐƠN HÀNG */}
          <div>
            <label className="block text-[11px] font-bold text-[#2C3E2E] mb-1">
              3. Ghi chú cho người giao hàng (Tùy chọn)
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Giao rau tươi sáng sớm, bấm chuông khi đến, để trước cửa..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9F9F5] border border-[#EAECE8] rounded-xl text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
            />
          </div>

          {/* Tóm tắt thanh toán */}
          <div className="p-3.5 bg-[#F9F9F5] rounded-xl border border-[#EAECE8] space-y-1 text-xs">
            <div className="flex justify-between text-[#6B7280]">
              <span>Tạm tính ({cartItems.reduce((a, b) => a + b.quantity, 0)} phần rau)</span>
              <span>{formatVND(rawAmount)}</span>
            </div>
            {voucherDiscount > 0 && (
              <div className="flex justify-between text-[#E53935] font-semibold">
                <span>Giảm giá Voucher</span>
                <span>-{formatVND(voucherDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#6B7280]">
              <span>Phí vận chuyển 2h</span>
              <span className="text-[#10542C] font-bold">Miễn phí</span>
            </div>
            <div className="flex justify-between font-heading font-black text-sm pt-2 border-t border-[#EAECE8] text-[#E53935]">
              <span className="text-[#2C3E2E]">Tổng thanh toán:</span>
              <span>{formatVND(totalAmount)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs font-bold"
          >
            {loading ? 'Đang gửi đơn hàng...' : 'Tiến hành Đặt Hàng'}
          </button>
        </form>
      </div>
    </div>
  );
};
