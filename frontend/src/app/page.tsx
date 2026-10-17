'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Category, Product, CartItem, OrderResponse, AuthResponse } from '@/types';
import { getCategories, getProducts, getStoredUser, logoutApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import B2BNegotiationModal from '@/components/B2BNegotiationModal';
import CreateProcurementModal from '@/components/CreateProcurementModal';
import ProcurementBoardSection from '@/components/ProcurementBoardSection';
import FarmCooperativesSection from '@/components/FarmCooperativesSection';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { OrderSuccessModal } from '@/components/OrderSuccessModal';
import { OrderTrackingModal } from '@/components/OrderTrackingModal';
import { AuthModal } from '@/components/AuthModal';
import { LocationModal } from '@/components/LocationModal';
import { PromotionModal } from '@/components/PromotionModal';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import Pagination from '@/components/Pagination';
import RecommendationSection from '@/components/RecommendationSection';
import { trackProductView, trackAddToCart } from '@/services/recommendationService';
import {
  ShieldCheck,
  Truck,
  Leaf,
  Clock,
  HeartHandshake,
  ArrowRight,
  Home,
  LayoutGrid,
  ShoppingBag,
  User as UserIcon,
  Zap,
  Filter,
  RotateCcw,
  Sparkles,
  MapPin,
  CheckCircle2,
  Calendar,
  Building2,
  PhoneCall,
  Scale,
  ThermometerSnowflake,
  FileCheck2,
  TrendingUp,
  Boxes,
  PlusCircle,
  Award,
  ChevronRight,
} from 'lucide-react';

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Filters State for B2B Agri
  const [selectedCert, setSelectedCert] = useState<string | null>(null);
  const [selectedHarvestStage, setSelectedHarvestStage] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number>(150000);

  // B2B Modals State
  const [negotiatingProduct, setNegotiatingProduct] = useState<Product | null>(null);
  const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);

  // Pagination for Home Catalog
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogPageSize = 16;

  // Today's Menu suggestion Tab (RuleLayout B.2)
  const [menuTab, setMenuTab] = useState<'soup' | 'meat' | 'stirfry' | 'salad'>('soup');

  // Flash sale countdown timer state (RuleLayout B.1)
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 45 });

  // Modals
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('Phường Bến Nghé, Quận 1, TP.HCM');
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<AuthResponse | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderResponse | null>(null);

  // Countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load User & Catalog on mount
  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catData, prodData] = await Promise.all([
          getCategories(),
          getProducts({ categoryId: selectedCategory || undefined, keyword: searchQuery || undefined }),
        ]);
        setCategories(catData);
        setProducts(prodData.products);
      } catch (err) {
        console.error('Error loading catalog:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCategory]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const prodData = await getProducts({
        categoryId: selectedCategory || undefined,
        keyword: searchQuery.trim() || undefined,
      });
      setProducts(prodData.products);
    } catch (err) {
      console.error('Error searching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product, quantity?: number) => {
    const qty = quantity || product.moq || 1;
    trackAddToCart(product);
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
    setIsCartOpen(true);
  };

  const handleBuyNow = (product: Product, quantity?: number) => {
    const qty = quantity || product.moq || 1;
    handleAddToCart(product, qty);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleUpdateQuantity = (productId: number | string, newQty: number) => {
    if (newQty <= 0) return;
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveCartItem = (productId: number | string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleOrderSuccess = (order: OrderResponse) => {
    setCartItems([]);
    setIsCheckoutOpen(false);
    setCompletedOrder(order);
  };

  const handleLogout = async () => {
    await logoutApi();
    setCurrentUser(null);
  };

  // Re-order past order products
  const handleReorder = (items: OrderResponse['items']) => {
    if (!items || items.length === 0) return;
    const reorderCartItems: CartItem[] = items.map((it) => ({
      product: {
        id: it.productId,
        name: it.productName,
        slug: it.productName.toLowerCase().replace(/\s+/g, '-'),
        description: 'Lô nông sản thu hoạch xuất vườn',
        price: it.unitPrice,
        stockQuantity: 50,
        unit: it.unit || '1000kg',
        imageUrl: it.productImageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500',
        origin: 'Đà Lạt',
        isOrganic: true,
        isFeatured: true,
        isActive: true,
        categoryId: 1,
      },
      quantity: it.quantity,
    }));

    setCartItems((prev) => [...prev, ...reorderCartItems]);
    setIsCartOpen(true);
  };

  // Lô nông sản xuất sắc thu hái rộ nổi bật
  const featuredHarvestLot: Product = products.find((p) => p.harvestStage === 'Đang thu hoạch') || products[0] || {
    id: 999,
    name: 'Bí Giống Mỹ Xuất Vườn (Lô 15 Tấn)',
    slug: 'bi-giong-my-xuat-vuon',
    description: 'Bí giống Mỹ quả đều, ruột vàng đặc, độ ngọt cao, thu hái rộ tại vườn HTX Đơn Dương.',
    price: 8500,
    originalPrice: 12000,
    stockQuantity: 15000,
    unit: '1 kg',
    wholesaleUnit: 'Tấn',
    moq: 500,
    totalLotVolume: 15,
    availableVolume: 9.5,
    farmName: 'HTX Nông Nghiệp Đơn Dương',
    farmLocation: 'Huyện Đơn Dương, Tỉnh Lâm Đồng',
    pucCode: 'VN-LD-74401-2026',
    certification: 'VietGAP',
    harvestStage: 'Đang thu hoạch',
    harvestDate: '14/10/2026 - 22/10/2026',
    imageUrl: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=600&auto=format&fit=crop&q=80',
    origin: 'Đà Lạt',
    isOrganic: true,
    isFeatured: true,
    isActive: true,
    categoryId: 2,
    categoryName: 'Củ quả tươi',
  };

  // Filter products by B2B criteria
  const filteredProducts = products.filter((prod) => {
    if (selectedCert === 'ORGANIC' && !prod.isOrganic) return false;
    if (selectedCert === 'VIETGAP' && prod.isOrganic) return false;
    if (selectedHarvestStage && prod.harvestStage !== selectedHarvestStage) return false;
    if (maxPrice < 150000 && prod.price > maxPrice) return false;
    return true;
  });

  // Reset catalog pagination when filters change
  useEffect(() => {
    setCatalogPage(1);
  }, [selectedCategory, selectedCert, selectedHarvestStage, maxPrice, searchQuery]);

  const totalCatalogPages = Math.ceil(filteredProducts.length / catalogPageSize);
  const paginatedCatalogProducts = filteredProducts.slice(
    (catalogPage - 1) * catalogPageSize,
    catalogPage * catalogPageSize
  );

  const cartTotalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F9F9F5] text-[#2C3E2E] flex flex-col selection:bg-[#4CAF50] selection:text-white pb-20 md:pb-0">
      {/* 2-Tier Header (Top Bar 36px + Main Header 76px) */}
      <Navbar
        cartCount={cartTotalCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => setIsTrackingOpen(true)}
        onOpenPromo={() => setIsPromoOpen(true)}
        onOpenLocation={() => setIsLocationOpen(true)}
        currentLocation={currentLocation}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container width 1240px according to RuleLayout Section 0 */}
      <div className="max-w-[1240px] mx-auto px-4 w-full py-6 space-y-8 flex-1">
        {/* B2B HERO BANNER & LÔ THU HÁI RỘ NỔI BẬT */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Cột trái (8 cột): Hero Banner B2B */}
          <div className="lg:col-span-8 bg-gradient-to-r from-[#10542C] via-[#0E4926] to-[#176637] rounded-3xl overflow-hidden p-6 sm:p-8 text-white relative shadow-sm flex flex-col justify-between min-h-[380px]">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#8BC34A]/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 rounded-full bg-[#4CAF50]/15 blur-2xl pointer-events-none" />

            {/* Content */}
            <div className="space-y-4 relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#8BC34A] text-xs font-bold border border-white/20 backdrop-blur-md">
                <Boxes className="w-3.5 h-3.5 text-[#8BC34A]" />
                <span>NỀN TẢNG THƯƠNG MẠI ĐIỆN TỬ NÔNG SẢN B2B VIỆT NAM</span>
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Cầu Nối Số Trực Tiếp <br />
                <span className="text-[#8BC34A]">Nông Trại & Thương Lái</span>
              </h1>

              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
                Giải quyết bài toán phụ thuộc tầng nấc trung gian. Chào bán nông sản theo lô/vụ thu hoạch với giá xuất vườn minh bạch, đàm phán giá sỉ trực tuyến, truy xuất mã số vùng trồng PUC và kiểm soát chất lượng chuỗi lạnh.
              </p>
            </div>

            {/* Live B2B Key Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 my-2 border-y border-white/15 relative z-10">
              <div>
                <span className="block font-heading text-xl font-black text-white">12.500+</span>
                <span className="text-[11px] text-emerald-200/80 font-medium">Tấn giao dịch/tháng</span>
              </div>
              <div>
                <span className="block font-heading text-xl font-black text-[#8BC34A]">520+</span>
                <span className="text-[11px] text-emerald-200/80 font-medium">Hợp tác xã liên kết</span>
              </div>
              <div>
                <span className="block font-heading text-xl font-black text-white">2.800+</span>
                <span className="text-[11px] text-emerald-200/80 font-medium">Thương lái & Đơn vị mua</span>
              </div>
              <div>
                <span className="block font-heading text-xl font-black text-[#8BC34A]">100%</span>
                <span className="text-[11px] text-emerald-200/80 font-medium">Mã PUC & VietGAP</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2 relative z-10">
              <a
                href="#catalog-section"
                className="px-6 py-3 bg-[#4CAF50] hover:bg-[#3d9140] text-white font-heading font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Xem lô hàng đang thu hoạch</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={() => setIsProcurementModalOpen(true)}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-heading font-bold text-xs rounded-xl backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#8BC34A]" />
                <span>Đăng tin tìm nguồn cung sỉ</span>
              </button>
            </div>
          </div>

          {/* Cột phải (4 cột): Lô Thu Hái Rộ Tiêu Biểu */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-[#EAECE8] overflow-hidden shadow-xs flex flex-col justify-between">
            {/* Header Lô Thu Hái */}
            <div className="bg-[#10542C] text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8BC34A] animate-ping" />
                <span className="font-heading font-black text-xs uppercase tracking-wider text-[#8BC34A]">
                  LÔ ĐANG THU HÁI RỘ
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold bg-white/15 px-2 py-0.5 rounded text-emerald-100">
                {featuredHarvestLot.pucCode || 'VN-LD-74401'}
              </span>
            </div>

            {/* Content Lô Tiêu Biểu */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div className="flex gap-3 items-center">
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-[#F9F9F5] border border-[#EAECE8] shrink-0">
                  <img
                    src={featuredHarvestLot.imageUrl}
                    alt={featuredHarvestLot.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('unsplash')) {
                        target.src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80';
                      }
                    }}
                  />
                  <span className="absolute top-1 left-1 bg-[#10542C] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {featuredHarvestLot.certification || 'VietGAP'}
                  </span>
                </div>

                <div className="space-y-1 flex-1">
                  <h4 className="font-heading text-xs sm:text-sm font-bold text-[#2C3E2E] line-clamp-2 leading-tight">
                    {featuredHarvestLot.name}
                  </h4>
                  <div className="text-[11px] text-[#6B7280] flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#10542C]" />
                    <span className="truncate">{featuredHarvestLot.farmName || 'HTX Đơn Dương'}</span>
                  </div>
                  <div className="text-[11px] text-[#6B7280]">
                    MOQ: <strong className="text-[#10542C]">{featuredHarvestLot.moq || 500} kg</strong>
                  </div>
                  <div className="flex items-baseline gap-1.5 pt-0.5">
                    <span className="font-heading text-base font-black text-[#10542C]">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(featuredHarvestLot.price)}
                    </span>
                    <span className="text-[10px] text-[#6B7280]">/ kg</span>
                  </div>
                </div>
              </div>

              {/* Tiến độ sản lượng lô */}
              <div className="p-3 bg-[#F9F9F5] rounded-xl border border-[#EAECE8] space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-[#2C3E2E]">
                  <span>Tổng lô: {featuredHarvestLot.totalLotVolume || 15} Tấn</span>
                  <span className="text-[#4CAF50]">Còn: {featuredHarvestLot.availableVolume || 9.5} Tấn</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#4CAF50] to-[#10542C] rounded-full w-[45%]" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
                  <span>Thu hái: {featuredHarvestLot.harvestDate || 'Hôm nay'}</span>
                  <span className="text-[#FB8C00] font-semibold">Đã cọc 45%</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setNegotiatingProduct(featuredHarvestLot)}
                  className="w-full py-2.5 bg-white hover:bg-[#F4F5F1] text-[#10542C] border border-[#10542C] font-heading font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Đàm phán giá</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddToCart(featuredHarvestLot, featuredHarvestLot.moq || 500)}
                  className="w-full py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white font-heading font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#8BC34A]" />
                  <span>Đặt cọc lô</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4 TRỤ CỘT NỀN TẢNG B2B AGRI-TRADE */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-[#EAECE8] shadow-2xs flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#10542C] flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-xs sm:text-sm text-[#10542C]">Minh Bạch Giá Sỉ</h4>
              <p className="text-[11px] text-[#6B7280] leading-relaxed mt-0.5">
                Bỏ qua 2-3 tầng trung gian, kết nối báo giá trực tiếp từ HTX.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#EAECE8] shadow-2xs flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#10542C] flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-xs sm:text-sm text-[#10542C]">Hợp Đồng & Cọc Lô 30%</h4>
              <p className="text-[11px] text-[#6B7280] leading-relaxed mt-0.5">
                Ký quỹ giao dịch bảo chứng, bảo vệ quyền lợi nông dân & thương lái.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#EAECE8] shadow-2xs flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#10542C] flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-xs sm:text-sm text-[#10542C]">Kiểm Định Mã PUC</h4>
              <p className="text-[11px] text-[#6B7280] leading-relaxed mt-0.5">
                100% nông sản có mã số vùng trồng, đạt chuẩn VietGAP & GlobalGAP.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#EAECE8] shadow-2xs flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#10542C] flex items-center justify-center shrink-0">
              <ThermometerSnowflake className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-xs sm:text-sm text-[#10542C]">Logistics Chuỗi Lạnh</h4>
              <p className="text-[11px] text-[#6B7280] leading-relaxed mt-0.5">
                Kiểm soát bảo quản 2-8°C từ kho nhà vườn tới chợ đầu mối.
              </p>
            </div>
          </div>
        </section>

        {/* SÀN CHÀO MUA B2B: THƯƠNG LÁI TÌM NGUỒN CUNG SỐ LƯỢNG LỚN */}
        <div id="san-chao-mua">
          <ProcurementBoardSection onOpenCreate={() => setIsProcurementModalOpen(true)} />
        </div>

        {/* MẠNG LƯỚI VÙNG TRỒNG & HỢP TÁC XÃ TIÊU BIỂU */}
        <div id="vung-trong-htx">
          <FarmCooperativesSection />
        </div>

        {/* SECTION GỢI Ý CHO BẠN (AI / ML RECOMMENDATION) */}
        <RecommendationSection
          products={products}
          onAddToCart={(p, qty) => handleAddToCart(p, qty || p.moq || 1)}
          onViewDetail={(p) => {
            trackProductView(p);
            setSelectedProductForDetail(p);
          }}
        />

        {/* QUY CÁCH NÔNG SẢN XUẤT VƯỜN (B2B Categories) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-[#10542C]">
                Quy Cách Nông Sản Xuất Vườn
              </h2>
              <p className="text-xs text-[#6B7280]">Các nhóm hàng nông sản thu hái theo lô số lượng lớn</p>
            </div>
            <a href="#catalog-section" className="text-xs font-bold text-[#4CAF50] hover:underline flex items-center gap-1">
              Xem toàn bộ lô hàng <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                id: 1,
                name: 'Rau Ăn Lá Xuất Vườn',
                desc: 'Bắp cải, xà lách, cải thảo (Lô từ 500kg)',
                icon: '🥬',
                bg: 'bg-emerald-50/80 border-emerald-100',
              },
              {
                id: 2,
                name: 'Củ Quả Vụ Mùa',
                desc: 'Cà rốt, cà chua beef, khoai tây, bí giống Mỹ (Lô từ 1 Tấn)',
                icon: '🥕',
                bg: 'bg-amber-50/80 border-amber-100',
              },
              {
                id: 3,
                name: 'Nấm & Dược Liệu Tươi',
                desc: 'Nấm kim châm, nấm rơm, nấm linh chi hữu cơ',
                icon: '🍄',
                bg: 'bg-stone-50/80 border-stone-200',
              },
              {
                id: 4,
                name: 'Nông Sản Sơ Chế Lạnh',
                desc: 'Đóng khay hút chân không, cấp đông nhanh IQF',
                icon: '❄️',
                bg: 'bg-blue-50/80 border-blue-100',
              },
            ].map((cat) => (
              <div
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-3.5 rounded-2xl border ${cat.bg} hover:shadow-md transition-all cursor-pointer flex items-center gap-3 group`}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                <div>
                  <h4 className="font-heading text-xs sm:text-sm font-bold text-[#2C3E2E] group-hover:text-[#10542C]">
                    {cat.name}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-[#6B7280] line-clamp-1">{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* C.1 & B.4: CATALOG & PRODUCT GRID (Sidebar lọc 25% + Lưới sản phẩm 75%) */}
        <section id="catalog-section" className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAECE8] pb-3">
            <div>
              <h2 className="font-heading text-xl font-bold text-[#10542C]">
                {selectedCategory
                  ? categories.find((c) => c.id === selectedCategory)?.name || 'Lô Nông Sản Xuất Vườn'
                  : 'Sàn Chào Bán Nông Sản Theo Lô / Vụ Thu Hoạch'}
              </h2>
              <p className="text-xs text-[#6B7280]">Nguồn hàng tận gốc từ các Hợp tác xã & Vùng trồng liên kết toàn quốc</p>
            </div>
            <span className="text-xs text-[#6B7280] font-medium">
              {filteredProducts.length > 0
                ? `Hiển thị ${(catalogPage - 1) * catalogPageSize + 1} - ${Math.min(catalogPage * catalogPageSize, filteredProducts.length)} trong ${filteredProducts.length} lô chào bán`
                : '0 lô hàng'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar Bộ Lọc B2B (25% ~ 3 cols) */}
            <aside className="lg:col-span-3 bg-white p-4 rounded-2xl border border-[#EAECE8] shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAECE8]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#10542C]">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Bộ Lọc Thu Mua B2B</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedCert(null);
                    setSelectedHarvestStage(null);
                    setMaxPrice(150000);
                    setSearchQuery('');
                  }}
                  className="text-[10px] text-[#E53935] hover:underline cursor-pointer font-bold"
                >
                  Thiết lập lại
                </button>
              </div>

              {/* 1. Ngành hàng nông sản */}
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-[#2C3E2E] block">Ngành hàng nông sản:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="catRadio"
                    checked={selectedCategory === null}
                    onChange={() => setSelectedCategory(null)}
                    className="accent-[#10542C]"
                  />
                  <span>Tất cả lô hàng</span>
                </label>
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="catRadio"
                      checked={selectedCategory === c.id}
                      onChange={() => setSelectedCategory(c.id)}
                      className="accent-[#10542C]"
                    />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>

              {/* 2. Tiến độ thu hái vụ mùa */}
              <div className="space-y-1.5 text-xs pt-2 border-t border-[#EAECE8]">
                <span className="font-bold text-[#2C3E2E] block">Tiến độ thu hái:</span>
                {[
                  { label: 'Tất cả vụ mùa', val: null },
                  { label: 'Đang thu hoạch rộ', val: 'Đang thu hoạch' },
                  { label: 'Sắp thu hoạch (Đặt trước)', val: 'Sắp thu hoạch' },
                  { label: 'Chào bán trước vụ', val: 'Chào bán trước vụ' },
                ].map((st) => (
                  <label key={st.label} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <input
                      type="radio"
                      name="stageFilterHome"
                      checked={selectedHarvestStage === st.val}
                      onChange={() => setSelectedHarvestStage(st.val)}
                      className="accent-[#10542C]"
                    />
                    <span className={selectedHarvestStage === st.val ? 'font-bold text-[#10542C]' : 'text-[#6B7280]'}>
                      {st.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* 3. Chứng nhận chất lượng */}
              <div className="space-y-1.5 text-xs pt-2 border-t border-[#EAECE8]">
                <span className="font-bold text-[#2C3E2E] block">Chứng nhận chất lượng:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCert === 'ORGANIC'}
                    onChange={(e) => setSelectedCert(e.target.checked ? 'ORGANIC' : null)}
                    className="accent-[#10542C] rounded"
                  />
                  <span>Hữu cơ / Organic</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCert === 'VIETGAP'}
                    onChange={(e) => setSelectedCert(e.target.checked ? 'VIETGAP' : null)}
                    className="accent-[#10542C] rounded"
                  />
                  <span>VietGAP / GlobalGAP</span>
                </label>
              </div>

              {/* 4. Khoảng giá sỉ */}
              <div className="space-y-2 pt-2 border-t border-[#EAECE8]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#2C3E2E] block">Giá sỉ tối đa (đ/kg):</span>
                  <span className="font-mono text-[11px] font-black text-[#10542C] bg-[#10542C]/10 px-2 py-0.5 rounded-lg border border-[#10542C]/20">
                    {maxPrice >= 150000 ? 'Tất cả' : `${new Intl.NumberFormat('vi-VN').format(maxPrice)} đ/kg`}
                  </span>
                </div>

                {/* Thanh kéo Range Slider */}
                <div className="pt-1">
                  <input
                    type="range"
                    min={5000}
                    max={150000}
                    step={5000}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#10542C]"
                  />
                  <div className="flex justify-between text-[10px] text-[#6B7280] mt-1 font-semibold">
                    <span>5.000 đ</span>
                    <span>75.000 đ</span>
                    <span>150.000 đ+</span>
                  </div>
                </div>

                {/* Nút bấm nhanh các mốc giá */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {[
                    { label: 'Tất cả', val: 150000 },
                    { label: '≤ 15k/kg', val: 15000 },
                    { label: '≤ 30k/kg', val: 30000 },
                    { label: '≤ 50k/kg', val: 50000 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => setMaxPrice(btn.val)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        maxPrice === btn.val
                          ? 'bg-[#10542C] text-white shadow-2xs'
                          : 'bg-[#F4F5F1] text-[#6B7280] hover:text-[#10542C] hover:bg-[#EAECE8]'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Danh sách lô hàng nông sản: 1 hàng 1 card trải rộng chiều ngang */}
            <div className="lg:col-span-9">
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
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-[#EAECE8] space-y-3">
                  <div className="w-14 h-14 bg-[#10542C]/10 rounded-full flex items-center justify-center text-[#10542C] mx-auto">
                    <Leaf className="w-7 h-7 opacity-70" />
                  </div>
                  <h4 className="font-heading text-base font-bold text-[#10542C]">Không tìm thấy lô hàng phù hợp</h4>
                  <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                    Vui lòng thử điều chỉnh lại bộ lọc tiến độ vụ mùa hoặc tìm kiếm bằng từ khóa khác.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedCert(null);
                      setSelectedHarvestStage(null);
                      setMaxPrice(150000);
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 bg-[#10542C] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Xem tất cả lô hàng
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Layout 1 hàng 1 sản phẩm - card chiều ngang to ra */}
                  <div className="flex flex-col gap-4">
                    {paginatedCatalogProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={(p) => handleAddToCart(p, p.moq || 1)}
                        onViewDetail={(p) => {
                          trackProductView(p);
                          setSelectedProductForDetail(p);
                        }}
                        onNegotiate={(p) => setNegotiatingProduct(p)}
                      />
                    ))}
                  </div>

                  {/* Phân trang cho danh mục & tất cả sản phẩm trang chủ */}
                  <Pagination
                    currentPage={catalogPage}
                    totalPages={totalCatalogPages}
                    totalItems={filteredProducts.length}
                    pageSize={catalogPageSize}
                    onPageChange={(page) => setCatalogPage(page)}
                    scrollTargetId="catalog-section"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Footer B2B Marketplace */}
      <footer className="bg-[#10542C] text-emerald-100/80 border-t border-[#0C3E20] pt-12 pb-10 mt-12">
        <div className="max-w-[1240px] mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-8 text-xs">
          <div className="md:col-span-5 space-y-3">
            <div className="relative h-12 w-44">
              <Image
                src="/assets/logo/Logo_full.png"
                alt="HoNa Fresh B2B"
                fill
                className="object-contain object-left brightness-110"
              />
            </div>
            <p className="leading-relaxed text-emerald-100/75 max-w-sm">
              <strong className="text-white">HoNa Fresh B2B Marketplace</strong> — Sàn giao dịch thương mại điện tử nông sản số lượng lớn, kết nối trực tiếp Nông trại / Hợp tác xã với Thương lái và Đơn vị thu mua sỉ toàn quốc.
            </p>
            <div className="flex items-center gap-2 text-emerald-200">
              <MapPin className="w-3.5 h-3.5 text-[#8BC34A] shrink-0" />
              <span>Trung tâm liên kết: Lâm Đồng, Sơn La, Tiền Giang, Gia Lai, Đắk Lắk</span>
            </div>
          </div>

          <div className="md:col-span-3 space-y-2">
            <h5 className="font-heading font-bold text-white text-sm">Tiêu Chuẩn Nông Sản B2B</h5>
            <ul className="space-y-1.5 text-emerald-100/75">
              <li>✓ 100% Mã số vùng trồng PUC kiểm định</li>
              <li>✓ Chuẩn VietGAP, GlobalGAP & Hữu cơ PGS</li>
              <li>✓ Báo giá sỉ theo lô, đàm phán trực tiếp (RFQ)</li>
              <li>✓ Hợp đồng đặt cọc 30% bảo chứng minh bạch</li>
              <li>✓ Logistics xe lạnh chuyên dụng từ vườn tới kho</li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-2">
            <h5 className="font-heading font-bold text-white text-sm">Hệ Thống Sàn Nông Sản B2B</h5>
            <p className="leading-relaxed text-emerald-100/75">
              Nền tảng công nghệ số giải quyết tầng nấc trung gian, hỗ trợ bà con nông dân và thương lái:
            </p>
            <ul className="space-y-1 text-emerald-100/75">
              <li>• Frontend: Next.js 16 (Turbopack, TypeScript, Tailwind)</li>
              <li>• Sàn Chào Mua B2B & Quản lý Hợp đồng Lô cọc</li>
              <li>• Tài liệu kỹ thuật: <code>/api/v1/swagger-ui.html</code></li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1240px] mx-auto px-4 mt-8 pt-4 border-t border-white/10 text-center text-[11px] text-emerald-200/50">
          © 2026 HoNa Fresh B2B Agri Marketplace. Cầu nối số trực tiếp Nông trại & Thương lái. All rights reserved.
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EAECE8] py-2 px-6 flex justify-around items-center md:hidden shadow-lg">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex flex-col items-center gap-1 text-[#10542C] p-1 cursor-pointer"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">Trang chủ</span>
        </button>

        <a
          href="#catalog-section"
          className="flex flex-col items-center gap-1 text-[#6B7280] hover:text-[#10542C] p-1 cursor-pointer"
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-bold">Lô hàng</span>
        </a>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center gap-1 text-[#6B7280] hover:text-[#10542C] p-1 cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {cartTotalCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#E53935] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cartTotalCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">Lô cọc</span>
        </button>

        <Link
          href={currentUser ? "/admin" : "/dang-nhap"}
          className="flex flex-col items-center gap-1 text-[#6B7280] hover:text-[#10542C] p-1 cursor-pointer"
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold max-w-[60px] truncate">
            {currentUser ? (currentUser.fullName || currentUser.username) : 'Tài khoản'}
          </span>
        </Link>
      </nav>

      {/* Modals & Drawers */}
      <LocationModal
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
        currentLocation={currentLocation}
        onSelectLocation={(loc) => setCurrentLocation(loc)}
      />

      <PromotionModal
        isOpen={isPromoOpen}
        onClose={() => setIsPromoOpen(false)}
        onApplyCode={(code) => {
          if (code === 'HONAFRESH10') setVoucherDiscount(20000);
        }}
      />

      <ProductDetailModal
        product={selectedProductForDetail}
        isOpen={selectedProductForDetail !== null}
        onClose={() => setSelectedProductForDetail(null)}
        onAddToCart={(p, q) => handleAddToCart(p, q)}
        onBuyNow={(p, q) => handleBuyNow(p, q)}
        onOpenNegotiation={(p: Product) => setNegotiatingProduct(p)}
      />

      {/* B2B RFQ Negotiation Modal */}
      <B2BNegotiationModal
        product={negotiatingProduct}
        isOpen={!!negotiatingProduct}
        onClose={() => setNegotiatingProduct(null)}
      />

      {/* B2B Create Procurement Modal */}
      <CreateProcurementModal
        isOpen={isProcurementModalOpen}
        onClose={() => setIsProcurementModalOpen(false)}
        onSubmitSuccess={() => {
          // Procurement post submitted
        }}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveCartItem}
        onOpenCheckout={(discount) => {
          setVoucherDiscount(discount);
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        onOrderSuccess={handleOrderSuccess}
        voucherDiscount={voucherDiscount}
      />

      <OrderSuccessModal order={completedOrder} onClose={() => setCompletedOrder(null)} />

      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        onReorder={handleReorder}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
}
