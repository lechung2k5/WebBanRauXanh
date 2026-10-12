'use client';

import React, { useState } from 'react';
import { CartItem } from '@/types';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Tag, Check } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: number | string, newQty: number) => void;
  onRemoveItem: (productId: number | string) => void;
  onOpenCheckout: (voucherDiscount: number) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onOpenCheckout,
}) => {
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  if (!isOpen) return null;

  const rawAmount = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const totalAmount = Math.max(0, rawAmount - appliedDiscount);

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    setVoucherError(null);
    const code = voucherCode.trim().toUpperCase();
    if (code === 'HONAFRESH10' || code === 'HONA10') {
      const discount = Math.round(rawAmount * 0.1);
      setAppliedDiscount(discount);
    } else if (code === 'ORGANIC20' || code === 'VEG20') {
      setAppliedDiscount(20000);
    } else if (code === 'FREESHIP') {
      setAppliedDiscount(0); // freeship is already 0
      alert('Đơn hàng của bạn đã được hưởng Miễn phí giao hàng 2h!');
    } else {
      setVoucherError('Mã không hợp lệ hoặc đã hết hạn.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#F9F9F5] shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-[#EAECE8] flex items-center justify-between bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#10542C]/10 text-[#10542C] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-[#10542C]">Giỏ hàng nông sản</h2>
                <span className="text-xs text-[#6B7280]">
                  {cartItems.reduce((acc, i) => acc + i.quantity, 0)} phần rau củ tươi sạch
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#6B7280] hover:text-[#2C3E2E] rounded-full hover:bg-[#F4F5F1] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#6B7280]">
                <div className="w-20 h-20 rounded-full bg-[#10542C]/10 flex items-center justify-center text-[#10542C] mb-4">
                  <ShoppingBag className="w-10 h-10 opacity-70" />
                </div>
                <h3 className="font-heading text-base font-bold text-[#2C3E2E]">Giỏ hàng đang trống</h3>
                <p className="text-xs mt-1.5 text-[#6B7280] max-w-xs leading-relaxed">
                  Hãy bổ sung các loại rau củ hữu cơ tươi non từ HoNa Fresh vào bữa cơm hôm nay nhé!
                </p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-3.5 p-3.5 bg-white rounded-2xl border border-[#EAECE8] shadow-2xs"
                >
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded-xl bg-[#F9F9F5] border border-[#EAECE8]"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('unsplash')) {
                        target.src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80';
                      }
                    }}
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-heading text-xs sm:text-sm font-bold text-[#2C3E2E] line-clamp-1">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="text-[#6B7280] hover:text-[#E53935] p-1 transition-colors"
                          title="Xóa món"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-0.5">
                        {formatVND(item.product.price)} / {item.product.unit || '500g'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center border border-[#EAECE8] bg-[#F9F9F5] rounded-lg px-2 py-0.5 gap-2">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="p-0.5 text-[#6B7280] hover:text-[#10542C] disabled:opacity-30 cursor-pointer"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-[#2C3E2E] w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            if (item.product.stockQuantity && item.quantity >= item.product.stockQuantity) {
                              alert(`Chỉ còn ${item.product.stockQuantity} sản phẩm trong kho!`);
                              return;
                            }
                            onUpdateQuantity(item.product.id, item.quantity + 1);
                          }}
                          className="p-0.5 text-[#6B7280] hover:text-[#10542C] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="font-heading text-xs sm:text-sm font-black text-[#10542C]">
                        {formatVND(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Khung Tóm Tắt & Voucher (RuleLayout D.1) */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-[#EAECE8] bg-white space-y-3">
              {/* Ô nhập Voucher */}
              <form onSubmit={handleApplyVoucher} className="space-y-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Nhập mã voucher (VD: HONAFRESH10)..."
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-[#F9F9F5] border border-[#EAECE8] rounded-xl text-xs text-[#2C3E2E] uppercase focus:outline-none focus:border-[#10542C]"
                    />
                    <Tag className="w-3.5 h-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-[#10542C] text-white text-xs font-bold rounded-xl hover:bg-[#0C3E20] cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </div>
                {voucherError && (
                  <span className="text-[10px] text-[#E53935] font-semibold">{voucherError}</span>
                )}
                {appliedDiscount > 0 && (
                  <span className="text-[10px] text-[#4CAF50] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Đã áp dụng giảm {formatVND(appliedDiscount)}!
                  </span>
                )}
              </form>

              {/* Tạm tính & Phí ship */}
              <div className="space-y-1 pt-1 text-xs text-[#6B7280]">
                <div className="flex justify-between items-center">
                  <span>Tạm tính</span>
                  <span className="font-bold text-[#2C3E2E]">{formatVND(rawAmount)}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between items-center text-[#E53935] font-semibold">
                    <span>Voucher giảm giá</span>
                    <span>-{formatVND(appliedDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span>Phí vận chuyển 2h</span>
                  <span className="text-[11px] text-[#10542C] font-bold bg-[#8BC34A]/20 px-2 py-0.5 rounded-full">
                    Miễn phí
                  </span>
                </div>
                {/* Tổng thanh toán cỡ chữ to, màu #E53935 theo RuleLayout D.1 */}
                <div className="border-t border-[#EAECE8] pt-2 flex justify-between items-center">
                  <span className="font-heading text-sm font-bold text-[#2C3E2E]">Tổng thanh toán:</span>
                  <span className="font-heading text-xl font-black text-[#E53935]">
                    {formatVND(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Nút chính "Tiến hành đặt hàng" (Nền #10542C, toàn bộ chiều rộng) */}
              <button
                onClick={() => onOpenCheckout(appliedDiscount)}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 cursor-pointer text-xs font-bold"
              >
                <span>Tiến hành Đặt Hàng</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
