'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { Product } from '@/types';
import { getProductBySlug, getProducts } from '@/services/api';
import { useApp } from '@/context/AppContext';
import {
  ChevronRight,
  ShieldCheck,
  Leaf,
  Star,
  MapPin,
  Clock,
  Truck,
  Plus,
  Minus,
  ShoppingCart,
  Zap,
  CheckCircle2,
  Calendar,
  RotateCcw,
} from 'lucide-react';

function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const { addToCart, setIsCartOpen } = useApp();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'origin' | 'nutrition' | 'storage'>('origin');

  useEffect(() => {
    if (!slug) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const item = await getProductBySlug(slug);
        setProduct(item);

        if (item) {
          const related = await getProducts({
            categorySlug: item.categorySlug,
            size: 4,
          });
          setRelatedProducts(related.products.filter((p) => p.slug !== slug).slice(0, 4));
        }
      } catch (err) {
        console.error('Error fetching product detail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F5] flex flex-col justify-between">
        <Header />
        <div className="max-w-[1240px] mx-auto px-4 py-16 text-center text-[#6B7280]">
          Đang tải thông tin sản phẩm...
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F9F9F5] flex flex-col justify-between">
        <Header />
        <div className="max-w-[1240px] mx-auto px-4 py-16 text-center">
          <h2 className="font-heading text-xl font-bold text-[#2C3E2E] mb-2">Không tìm thấy sản phẩm!</h2>
          <p className="text-xs text-[#6B7280] mb-4">Sản phẩm này có thể đã hết hàng hoặc đổi đường dẫn.</p>
          <Link href="/san-pham" className="px-5 py-2.5 bg-[#10542C] text-white rounded-xl text-xs font-bold inline-block">
            Xem sản phẩm khác
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const discount =
    product.discountPercent ||
    (product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setIsCartOpen(true);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    router.push('/thanh-toan');
  };

  return (
    <div className="min-h-screen bg-[#F9F9F5] flex flex-col justify-between">
      <Header />

      <main className="max-w-[1240px] mx-auto px-4 py-6 w-full flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-6">
          <Link href="/" className="hover:text-[#10542C]">Trang chủ</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/san-pham" className="hover:text-[#10542C]">Nông sản sạch</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#10542C] font-bold line-clamp-1">{product.name}</span>
        </div>

        {/* Khối Thông Tin Chính 2 Cột */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAECE8] shadow-xs grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Cột Trái: Ảnh Sản Phẩm */}
          <div className="space-y-4">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#F9F9F5] border border-[#EAECE8]">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('unsplash')) {
                    target.src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80';
                  }
                }}
              />

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                {product.isOrganic ? (
                  <span className="inline-flex items-center gap-1 bg-[#10542C] text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                    <Leaf className="w-3 h-3 text-[#8BC34A]" /> Hữu cơ 100%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-[#4CAF50] text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                    <ShieldCheck className="w-3 h-3" /> Chuẩn VietGAP
                  </span>
                )}
                <span className="bg-white/90 backdrop-blur-xs text-[#10542C] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#D7EED6]">
                  {product.brand || 'Bách Hóa XANH'}
                </span>
              </div>

              {discount && (
                <div className="absolute top-3 right-3">
                  <span className="bg-[#E53935] text-white text-xs font-black px-2.5 py-1 rounded-full shadow-xs">
                    -{discount}%
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#F9F9F5] border border-[#EAECE8] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#10542C]" />
                <div className="text-[11px]">
                  <p className="font-bold text-[#2C3E2E]">Giao siêu tốc</p>
                  <p className="text-[#6B7280]">Nhận sau 2 giờ</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F9F9F5] border border-[#EAECE8] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#10542C]" />
                <div className="text-[11px]">
                  <p className="font-bold text-[#2C3E2E]">Tươi hái sáng</p>
                  <p className="text-[#6B7280]">Thu hoạch 4h</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F9F9F5] border border-[#EAECE8] flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#10542C]" />
                <div className="text-[11px]">
                  <p className="font-bold text-[#2C3E2E]">Đổi trả 24h</p>
                  <p className="text-[#6B7280]">Miễn phí 100%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cột Phải: Thông Tin & Đặt Mua */}
          <div className="flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-2">
                <span className="flex items-center gap-1 text-[#FB8C00] font-bold">
                  <Star className="w-3.5 h-3.5 fill-[#FB8C00]" /> {product.rating || 4.8}
                </span>
                <span>•</span>
                <span>{product.reviewCount || 120} đánh giá</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#10542C]">
                  <MapPin className="w-3.5 h-3.5" /> Xuất xứ: {product.origin || 'Việt Nam'}
                </span>
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl font-black text-[#2C3E2E] leading-snug">
                {product.name}
              </h1>

              <p className="text-xs text-[#6B7280] mt-3 leading-relaxed">
                {product.description}
              </p>

              {/* Khối Giá */}
              <div className="mt-5 p-4 rounded-2xl bg-[#F9F9F5] border border-[#EAECE8] flex items-baseline gap-3">
                <span className="font-heading text-3xl font-black text-[#10542C]">
                  {formatVND(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm text-[#6B7280] line-through">
                    {formatVND(product.originalPrice)}
                  </span>
                )}
                <span className="text-xs font-bold text-[#6B7280]">
                  / {product.unit || 'gói'}
                </span>
              </div>

              {/* Tình trạng kho */}
              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4CAF50] animate-ping" />
                <span className="text-[#4CAF50] font-bold">Còn hàng trong kho</span>
                <span className="text-[#6B7280]">({product.stockQuantity || 150} {product.unit || 'gói'} sẵn có)</span>
              </div>
            </div>

            {/* Bộ chọn số lượng & Nút Mua */}
            <div className="space-y-4 pt-4 border-t border-[#F0F2ED]">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-[#2C3E2E]">Số lượng:</span>
                <div className="flex items-center border border-[#EAECE8] bg-[#F9F9F5] rounded-xl px-3 py-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="text-[#6B7280] hover:text-[#10542C] p-1 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-sm text-[#2C3E2E] w-6 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="text-[#6B7280] hover:text-[#10542C] p-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-xs text-[#6B7280]">
                  Tổng: <strong className="text-[#10542C]">{formatVND(product.price * quantity)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full py-3.5 px-4 rounded-xl border-2 border-[#10542C] text-[#10542C] font-bold text-xs hover:bg-[#D7EED6]/50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" /> Thêm Vào Giỏ
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-[#8BC34A]" /> Mua Ngay Bây Giờ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Khối Tabs Thông Tin Chi Tiết */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAECE8] shadow-xs mb-12">
          <div className="flex border-b border-[#EAECE8] gap-6 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('origin')}
              className={`pb-3 text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
                activeTab === 'origin' ? 'text-[#10542C] border-b-2 border-[#10542C]' : 'text-[#6B7280]'
              }`}
            >
              Nguồn Gốc & Quy Trình
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('nutrition')}
              className={`pb-3 text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
                activeTab === 'nutrition' ? 'text-[#10542C] border-b-2 border-[#10542C]' : 'text-[#6B7280]'
              }`}
            >
              Dinh Dưỡng & Sức Khỏe
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('storage')}
              className={`pb-3 text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
                activeTab === 'storage' ? 'text-[#10542C] border-b-2 border-[#10542C]' : 'text-[#6B7280]'
              }`}
            >
              Hướng Dẫn Bảo Quản & Chế Biến
            </button>
          </div>

          <div className="text-xs sm:text-sm text-[#2C3E2E] leading-relaxed">
            {activeTab === 'origin' && (
              <div className="space-y-4">
                <p>
                  Sản phẩm <strong>{product.name}</strong> được cung cấp chính ngạch bởi thương hiệu <strong>{product.brand || 'Bách Hóa XANH'}</strong>, xuất xứ từ <strong>{product.origin || 'Việt Nam'}</strong>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 rounded-2xl bg-[#F9F9F5] border border-[#EAECE8]">
                    <h4 className="font-bold text-[#10542C] mb-1 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#4CAF50]" /> Tiêu chuẩn chất lượng
                    </h4>
                    <p className="text-xs text-[#6B7280]">
                      Không dư lượng thuốc trừ sâu, không chất kích thích tăng trưởng, kiểm tra chỉ tiêu vi sinh định kỳ.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#F9F9F5] border border-[#EAECE8]">
                    <h4 className="font-bold text-[#10542C] mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#4CAF50]" /> Thời gian thu hoạch
                    </h4>
                    <p className="text-xs text-[#6B7280]">
                      Thu hoạch vào sáng sớm mỗi ngày, chuyển lạnh trực tiếp về kho phân phối nhằm bảo tồn độ tươi giòn.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'nutrition' && (
              <div className="space-y-3">
                <p>
                  Giàu vitamin (A, C, K), khoáng chất vi lượng (sắt, kẽm, canxi) và chất xơ tự nhiên hỗ trợ hệ tiêu hóa và tăng cường miễn dịch.
                </p>
                <p className="text-[#6B7280]">
                  Thích hợp cho cả chế độ ăn Eat Clean, ăn chay thanh tịnh hoặc bữa cơm thường nhật cho gia đình.
                </p>
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="space-y-3">
                <p>
                  • <strong>Bảo quản:</strong> Giữ trong ngăn mát tủ lạnh (nhiệt độ từ 4°C - 8°C). Không nên rửa ướt trước khi cho vào tủ lạnh.
                </p>
                <p>
                  • <strong>Hạn sử dụng:</strong> Khuyên dùng ngon nhất trong vòng 3 - 5 ngày kể từ ngày giao hàng.
                </p>
                <p>
                  • <strong>Chế biến:</strong> Rửa sạch nhẹ nhàng dưới vòi nước trước khi nấu canh, xào tỏi, luộc chấm kho quẹt hoặc nhúng lẩu.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sản phẩm cùng loại */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="font-heading text-xl font-bold text-[#10542C] mb-5 flex items-center gap-2">
              <Leaf className="w-5 h-5 text-[#8BC34A]" /> Sản phẩm liên quan cùng danh mục
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAddToCart={(item) => {
                    addToCart(item, 1);
                    setIsCartOpen(true);
                  }}
                  onViewDetail={(item) => {
                    router.push(`/san-pham/${item.slug}`);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9F9F5] flex items-center justify-center">Đang tải sản phẩm...</div>}>
      <ProductDetailContent />
    </Suspense>
  );
}
