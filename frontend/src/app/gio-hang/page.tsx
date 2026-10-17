'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useApp } from '@/context/AppContext';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ChevronRight,
  Tag,
  Check,
  ShieldCheck,
  Truck,
  Leaf,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { cartItems, updateQuantity, removeFromCart, clearCart, cartTotal } = useApp();

  const [voucherCode, setVoucherCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [voucherMessage, setVoucherMessage] = useState<string | null>(null);

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const code = voucherCode.trim().toUpperCase();
    if (code === 'XANH10') {
      setDiscountPercent(10);
      setVoucherMessage('Áp dụng mã XANH10 thành công: Giảm 10%!');
    } else if (code === 'VEGGIE20') {
      setDiscountPercent(20);
      setVoucherMessage('Áp dụng mã VEGGIE20 thành công: Giảm 20%!');
    } else if (code === 'FREESHIP') {
      setDiscountPercent(0);
      setVoucherMessage('Áp dụng mã FREESHIP thành công: Miễn phí vận chuyển!');
    } else {
      setVoucherMessage('Mã giảm giá không hợp lệ. Thử XANH10 hoặc VEGGIE20');
    }
  };

  const shippingFee = cartTotal > 150000 || voucherCode.trim().toUpperCase() === 'FREESHIP' ? 0 : 20000;
  const discountAmount = Math.round((cartTotal * discountPercent) / 100);
  const finalTotal = Math.max(0, cartTotal - discountAmount + shippingFee);

  return (
    <div className="min-h-screen bg-[#F9F9F5] flex flex-col justify-between">
      <Header />

      <main className="max-w-[1240px] mx-auto px-4 py-8 w-full flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-6">
          <Link href="/" className="hover:text-[#10542C]">Trang chủ</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#10542C] font-bold">Giỏ hàng của bạn</span>
        </div>

        <h1 className="font-heading text-2xl sm:text-3xl font-black text-[#10542C] mb-8 flex items-center gap-3">
          <ShoppingBag className="w-7 h-7 text-[#8BC34A]" /> Giỏ Hàng Nông Sản ({cartItems.length} món)
        </h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#EAECE8] max-w-lg mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#D7EED6] flex items-center justify-center mx-auto mb-4 text-[#10542C]">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="font-heading text-lg font-bold text-[#2C3E2E] mb-2">Giỏ hàng của bạn đang trống!</h2>
            <p className="text-xs text-[#6B7280] mb-6">Hãy dạo một vòng cửa hàng và chọn những bó rau củ tươi ngon nhé.</p>
            <Link
              href="/san-pham"
              className="px-6 py-3 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all shadow-md"
            >
              <Leaf className="w-4 h-4 text-[#8BC34A]" /> Tiếp Tục Mua Sắm
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Cột Danh Sách Món (2 cột) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-[#F0F2ED] pb-4">
                <span className="font-heading text-sm font-bold text-[#2C3E2E]">Sản phẩm</span>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-[#E53935] hover:underline cursor-pointer font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
                </button>
              </div>

              <div className="divide-y divide-[#F0F2ED]">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="py-4 flex gap-4 items-center">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-18 h-18 sm:w-20 sm:h-20 object-cover rounded-2xl bg-[#F9F9F5] border border-[#EAECE8] shrink-0"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const fallbackApi = `/api/product-image?name=${encodeURIComponent(item.product.name)}`;
                        if (!target.src.includes('/api/product-image')) {
                          target.src = fallbackApi;
                        }
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/san-pham/${item.product.slug}`}
                        className="font-heading font-bold text-sm text-[#2C3E2E] hover:text-[#10542C] transition-colors line-clamp-1"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {formatVND(item.product.price)} / {item.product.unit || 'gói'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] bg-[#D7EED6] text-[#10542C] font-bold px-2 py-0.5 rounded-full">
                          {item.product.origin || 'Việt Nam'}
                        </span>
                      </div>
                    </div>

                    {/* Bộ tăng giảm số lượng */}
                    <div className="flex items-center border border-[#EAECE8] bg-[#F9F9F5] rounded-xl px-2.5 py-1 gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="text-[#6B7280] hover:text-[#10542C] p-0.5 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-[#2C3E2E] w-5 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="text-[#6B7280] hover:text-[#10542C] p-0.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Tổng tiền món */}
                    <div className="text-right shrink-0">
                      <p className="font-heading font-black text-sm text-[#10542C]">
                        {formatVND(item.product.price * item.quantity)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-[11px] text-[#6B7280] hover:text-[#E53935] mt-1 p-1 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#F0F2ED] flex justify-between items-center">
                <Link
                  href="/san-pham"
                  className="text-xs text-[#10542C] font-bold hover:underline flex items-center gap-1.5"
                >
                  <Leaf className="w-3.5 h-3.5" /> Mua thêm nông sản khác
                </Link>
              </div>
            </div>

            {/* Cột Tóm Tắt & Thanh Toán (1 cột) */}
            <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-6 lg:sticky lg:top-24">
              <h2 className="font-heading font-bold text-base text-[#2C3E2E] border-b border-[#F0F2ED] pb-3">
                Tóm Tắt Đơn Hàng
              </h2>

              {/* Nhập voucher */}
              <form onSubmit={handleApplyVoucher} className="space-y-2">
                <label className="text-xs font-bold text-[#2C3E2E] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#10542C]" /> Mã ưu đãi / Voucher
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập mã (XANH10, VEGGIE20...)"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    className="flex-1 bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs uppercase font-bold text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#10542C] text-white rounded-xl text-xs font-bold hover:bg-[#0C3E20] transition-colors shrink-0"
                  >
                    Áp dụng
                  </button>
                </div>
                {voucherMessage && (
                  <p className={`text-[11px] font-bold ${discountPercent > 0 || voucherCode.toUpperCase() === 'FREESHIP' ? 'text-[#4CAF50]' : 'text-[#E53935]'}`}>
                    {voucherMessage}
                  </p>
                )}
              </form>

              {/* Chi tiết tính tiền */}
              <div className="space-y-2.5 text-xs text-[#2C3E2E] border-t border-b border-[#F0F2ED] py-4">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Tạm tính:</span>
                  <span className="font-bold">{formatVND(cartTotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#E53935]">
                    <span>Giảm giá ({discountPercent}%):</span>
                    <span className="font-bold">-{formatVND(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Phí giao hàng:</span>
                  <span className="font-bold">
                    {shippingFee === 0 ? (
                      <span className="text-[#4CAF50]">Miễn phí</span>
                    ) : (
                      formatVND(shippingFee)
                    )}
                  </span>
                </div>

                {shippingFee > 0 && (
                  <p className="text-[10px] text-[#6B7280] italic">
                    (Mua thêm {formatVND(150000 - cartTotal)} để được Miễn phí ship)
                  </p>
                )}
              </div>

              {/* Tổng thanh toán */}
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-[#2C3E2E]">Tổng cộng:</span>
                <span className="font-heading font-black text-2xl text-[#10542C]">
                  {formatVND(finalTotal)}
                </span>
              </div>

              {/* Nút Thanh toán */}
              <button
                type="button"
                onClick={() => router.push('/thanh-toan')}
                className="w-full py-4 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Tiến Hành Đặt Hàng <ArrowRight className="w-4 h-4 text-[#8BC34A]" />
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
