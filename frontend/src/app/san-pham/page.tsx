'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import B2BNegotiationModal from '@/components/B2BNegotiationModal';
import Pagination from '@/components/Pagination';
import { Product } from '@/types';
import { getProducts } from '@/services/api';
import { trackProductView, trackAddToCart } from '@/services/recommendationService';
import { useApp } from '@/context/AppContext';
import {
  Filter,
  SlidersHorizontal,
  ChevronRight,
  Leaf,
  Sparkles,
  RotateCcw,
  Search,
  ArrowUpDown,
  Building2,
  Calendar,
} from 'lucide-react';

const normalizeCategory = (cat: string | null): string | null => {
  if (!cat) return null;
  if (cat === '1' || cat === 'rau-sach' || cat === 'rau-an-la') return 'rau-sach';
  if (cat === '2' || cat === 'cu' || cat === 'cu-qua-tuoi') return 'cu';
  if (cat === '3' || cat === 'nam-tuoi' || cat === 'nam-tuoi-huu-co') return 'nam-tuoi';
  if (cat === '4' || cat === 'combo' || cat === 'rau-gia-vi') return 'rau-gia-vi';
  return cat;
};

function ProductListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = normalizeCategory(searchParams.get('category'));
  const initialSearch = searchParams.get('search') || '';

  const { addToCart, setIsCartOpen } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSemanticResult, setIsSemanticResult] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(initialCategory);
  const [priceRange, setPriceRange] = useState<number>(100000);
  const [selectedCert, setSelectedCert] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'discount'>('default');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [negotiatingProduct, setNegotiatingProduct] = useState<Product | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 16;

  useEffect(() => {
    setSelectedCategorySlug(normalizeCategory(searchParams.get('category')));
    if (searchParams.get('search')) {
      setSearchQuery(searchParams.get('search') || '');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      try {
        const res = await getProducts({
          keyword: searchQuery || undefined,
          categorySlug: selectedCategorySlug || undefined,
          maxPrice: priceRange < 100000 ? priceRange : undefined,
          isOrganic: selectedCert === 'organic' ? true : undefined,
        });
        setProducts(res.products);
        setIsSemanticResult(Boolean(res.isSemanticSearch));
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [searchQuery, selectedCategorySlug, priceRange, selectedCert]);

  // Apply sorting
  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'discount') return (b.discountPercent || 0) - (a.discountPercent || 0);
    return 0;
  });

  const totalPages = Math.ceil(sortedProducts.length / pageSize) || 1;
  const paginatedProducts = sortedProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleCategoryClick = (slug: string | null) => {
    setSelectedCategorySlug(slug);
    setCurrentPage(1);
    if (slug) {
      router.push(`/san-pham?category=${slug}`);
    } else {
      router.push('/san-pham');
    }
  };

  const handleResetFilters = () => {
    setSelectedCategorySlug(null);
    setSearchQuery('');
    setPriceRange(100000);
    setSelectedCert(null);
    setSortBy('default');
    setCurrentPage(1);
    router.push('/san-pham');
  };

  return (
    <div className="min-h-screen bg-[#F9F9F5] flex flex-col justify-between">
      <Header />

      <main className="max-w-[1240px] mx-auto px-4 py-6 w-full flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-6">
          <Link href="/" className="hover:text-[#10542C]">Trang chủ</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#10542C] font-bold">Sàn lô nông sản xuất vườn (B2B)</span>
        </div>

        {/* Header Title & Sắp Xếp */}
        <div className="bg-white rounded-2xl p-6 border border-[#EAECE8] mb-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-black text-[#10542C] flex items-center gap-2.5">
              <Leaf className="w-6 h-6 text-[#8BC34A]" />
              Sàn Giao Dịch Lô Nông Sản Số Lượng Lớn
            </h1>
            <p className="text-xs text-[#6B7280] mt-1">
              Tìm thấy <strong className="text-[#10542C]">{products.length}</strong> lô nông sản tận vườn từ các Hợp tác xã đạt chuẩn VietGAP & GlobalGAP
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#6B7280] flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sắp xếp:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-bold text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
            >
              <option value="default">Mới nhất theo vụ mùa</option>
              <option value="price-asc">Giá sỉ: Thấp đến Cao</option>
              <option value="price-desc">Giá sỉ: Cao đến Thấp</option>
              <option value="discount">Chiết khấu lô cao nhất</option>
            </select>
          </div>
        </div>

        {/* Layout 2 cột: Sidebar Bộ Lọc (280px) & Grid Sản phẩm */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Cột Bộ Lọc (Trái) */}
          <aside className="bg-white rounded-2xl p-5 border border-[#EAECE8] shadow-xs space-y-6 lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-[#F0F2ED] pb-3">
              <span className="font-heading font-bold text-sm text-[#10542C] flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-[#8BC34A]" /> Bộ Lọc Thu Mua B2B
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-[#E53935] hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <RotateCcw className="w-3 h-3" /> Đặt lại
              </button>
            </div>

            {/* Tìm kiếm nhanh */}
            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] mb-2">Tìm kiếm lô hàng / Vùng trồng</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ví dụ: bắp cải Đà Lạt, HTX Mộc Châu..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />
                <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Danh Mục */}
            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] mb-2">Ngành hàng nông sản</label>
              <div className="space-y-1.5">
                {[
                  { name: 'Tất cả lô hàng xuất vườn', slug: null },
                  { name: 'Rau ăn lá số lượng lớn', slug: 'rau-sach' },
                  { name: 'Củ quả vụ mùa thu hái', slug: 'cu' },
                  { name: 'Nấm & Dược liệu tươi', slug: 'nam-tuoi' },
                ].map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => handleCategoryClick(cat.slug)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                      selectedCategorySlug === cat.slug
                        ? 'bg-[#10542C] text-white shadow-2xs'
                        : 'text-[#6B7280] hover:bg-[#F4F5F1] hover:text-[#10542C]'
                    }`}
                  >
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tiến độ vụ mùa */}
            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] mb-2">Tiến độ thu hái</label>
              <div className="space-y-1 text-xs">
                {[
                  { label: 'Tất cả vụ mùa', val: null },
                  { label: 'Đang thu hoạch rộ', val: 'Đang thu hoạch' },
                  { label: 'Sắp thu hoạch (Đặt trước)', val: 'Sắp thu hoạch' },
                  { label: 'Chào bán trước vụ', val: 'Chào bán trước vụ' },
                ].map((st) => (
                  <label key={st.label} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <input
                      type="radio"
                      name="stageFilter"
                      checked={selectedStage === st.val}
                      onChange={() => setSelectedStage(st.val)}
                      className="accent-[#10542C]"
                    />
                    <span className={selectedStage === st.val ? 'font-bold text-[#10542C]' : 'text-[#6B7280]'}>
                      {st.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Khoảng giá sỉ */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-[#2C3E2E]">Giá sỉ tối đa (đ/kg)</label>
                <span className="text-xs font-black text-[#10542C]">{formatVND(priceRange)}</span>
              </div>
              <input
                type="range"
                min={5000}
                max={100000}
                step={5000}
                value={priceRange}
                onChange={(e) => {
                  setPriceRange(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full h-1.5 bg-[#E5E7EB] rounded-lg appearance-none cursor-pointer accent-[#10542C]"
              />
              <div className="flex justify-between text-[10px] text-[#6B7280] mt-1 font-semibold">
                <span>5.000đ/kg</span>
                <span>100.000đ+/kg</span>
              </div>
            </div>

            {/* Chứng nhận */}
            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] mb-2">Tiêu chuẩn kiểm định</label>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Hữu cơ (Organic / PGS)', val: 'organic' },
                  { label: 'Chuẩn VietGAP / GlobalGAP', val: 'vietgap' },
                ].map((cert) => (
                  <label
                    key={cert.val}
                    className="flex items-center gap-2 text-xs text-[#2C3E2E] cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="cert"
                      checked={selectedCert === cert.val}
                      onChange={() => {
                        setSelectedCert(selectedCert === cert.val ? null : cert.val);
                        setCurrentPage(1);
                      }}
                      className="accent-[#10542C]"
                    />
                    <span>{cert.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Cột Danh Sách Sản Phẩm (Phải - 3 cột): 1 hàng 1 card trải rộng chiều ngang */}
          <div className="lg:col-span-3 space-y-6">
            {isSemanticResult && !loading && products.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                      Gợi ý nguồn hàng phù hợp: Đã tìm thấy {products.length} lô nông sản cho &quot;{searchQuery}&quot;
                    </h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Hệ thống tự động kết nối các nông trại &amp; HTX có nguồn cung đáp ứng từ khóa tìm kiếm của bạn.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-[#EAECE8] flex flex-col md:flex-row gap-4 animate-pulse">
                    <div className="w-full md:w-64 h-48 bg-gray-100 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-3 py-2">
                      <div className="h-4 bg-gray-100 rounded w-1/3" />
                      <div className="h-6 bg-gray-100 rounded w-2/3" />
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                    </div>
                    <div className="w-full md:w-60 bg-gray-50 rounded-xl p-3 space-y-3 shrink-0" />
                  </div>
                ))}
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-[#EAECE8]">
                <Leaf className="w-12 h-12 text-[#6B7280]/40 mx-auto mb-3" />
                <h3 className="font-heading font-bold text-base text-[#2C3E2E]">Không tìm thấy lô hàng phù hợp</h3>
                <p className="text-xs text-[#6B7280] mt-1">Hãy thử xóa bớt bộ lọc hoặc tìm với từ khóa khác</p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 bg-[#10542C] text-white rounded-xl text-xs font-bold hover:bg-[#0C3E20] transition-colors"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <>
                {/* Layout 1 hàng 1 lô nông sản - card chiều ngang to ra */}
                <div id="product-list-container" className="flex flex-col gap-4">
                  {paginatedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={(p) => {
                        trackAddToCart(p);
                        addToCart(p, p.moq || 1);
                        setIsCartOpen(true);
                      }}
                      onViewDetail={(p) => {
                        trackProductView(p);
                        setSelectedProduct(p);
                      }}
                      onNegotiate={(p) => setNegotiatingProduct(p)}
                    />
                  ))}
                </div>

                {/* Phân trang thông minh */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={sortedProducts.length}
                  pageSize={pageSize}
                  onPageChange={(page) => setCurrentPage(page)}
                  scrollTargetId="product-list-container"
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(p, qty) => {
          addToCart(p, qty);
          setIsCartOpen(true);
        }}
        onBuyNow={(p, qty) => {
          addToCart(p, qty);
          window.location.href = '/thanh-toan';
        }}
      />

      {/* B2B RFQ Negotiation Modal */}
      <B2BNegotiationModal
        product={negotiatingProduct}
        isOpen={!!negotiatingProduct}
        onClose={() => setNegotiatingProduct(null)}
      />

      <Footer />
    </div>
  );
}

export default function ProductListPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9F9F5] flex items-center justify-center">Đang tải...</div>}>
      <ProductListContent />
    </Suspense>
  );
}
