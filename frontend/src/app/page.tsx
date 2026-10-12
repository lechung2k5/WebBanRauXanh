'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Category, Product, CartItem, OrderResponse, AuthResponse } from '@/types';
import { getCategories, getProducts, getStoredUser, logoutApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { OrderSuccessModal } from '@/components/OrderSuccessModal';
import { OrderTrackingModal } from '@/components/OrderTrackingModal';
import { AuthModal } from '@/components/AuthModal';
import { LocationModal } from '@/components/LocationModal';
import { PromotionModal } from '@/components/PromotionModal';
import { ProductDetailModal } from '@/components/ProductDetailModal';
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
  Utensils,
  Soup,
  Salad,
  Flame,
  ChefHat,
  Filter,
  RotateCcw,
  Sparkles,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Filters State (RuleLayout C.1)
  const [selectedCert, setSelectedCert] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number>(150000);
  const [selectedCookingPurpose, setSelectedCookingPurpose] = useState<string | null>(null);

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

  const handleAddToCart = (product: Product, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setIsCartOpen(true);
  };

  const handleBuyNow = (product: Product, quantity = 1) => {
    handleAddToCart(product, quantity);
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

  // Re-order past order products (RuleLayout E: UC04)
  const handleReorder = (items: OrderResponse['items']) => {
    if (!items || items.length === 0) return;
    const reorderCartItems: CartItem[] = items.map((it) => ({
      product: {
        id: it.productId,
        name: it.productName,
        slug: it.productName.toLowerCase().replace(/\s+/g, '-'),
        description: 'Nông sản sạch thu hoạch trong ngày',
        price: it.unitPrice,
        stockQuantity: 50,
        unit: it.unit || '500g',
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

  // Menu suggestions data (RuleLayout B.2: Hôm Nay Ăn Gì?)
  const MENU_COMBOS = {
    soup: {
      name: 'Canh Rau Ngót & Mồng Tơi Nấu Tôm Thịt',
      desc: 'Thanh mát giải nhiệt, giàu vitamin và chất xơ tự nhiên cho cả nhà.',
      price: 45000,
      origPrice: 60000,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      items: ['Rau ngót hữu cơ (300g)', 'Mồng tơi VietGAP (300g)', 'Hành hoa & ngò rí'],
    },
    meat: {
      name: 'Thịt Kho Tiêu Ăn Kèm Dưa Leo & Cà Chua Bi',
      desc: 'Món mặn đậm đà cân bằng vị tươi giòn của dưa leo Đà Lạt và cà chua hữu cơ.',
      price: 55000,
      origPrice: 70000,
      image: 'https://images.unsplash.com/photo-1592417817098-8f3d69109853?w=600&auto=format&fit=crop&q=80',
      items: ['Dưa leo baby Đà Lạt (500g)', 'Cà chua bi ngọt (300g)', 'Xà lách mỡ'],
    },
    stirfry: {
      name: 'Rau Muống Xào Tỏi & Bông Cải Xanh Luộc',
      desc: 'Giòn ngọt tự nhiên, dễ chế biến chỉ trong 10 phút, đầy đủ vi chất.',
      price: 48000,
      origPrice: 62000,
      image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600&auto=format&fit=crop&q=80',
      items: ['Rau muống nước sạch (500g)', 'Bông cải xanh Đà Lạt (400g)', 'Tỏi ta Lý Sơn'],
    },
    salad: {
      name: 'Salad Xà Lách Thủy Canh Trộn Sốt Dầu Giấm',
      desc: 'Tươi non 100%, bổ sung chất chống oxy hóa, lý tưởng cho chế độ ăn lành mạnh.',
      price: 52000,
      origPrice: 68000,
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80',
      items: ['Xà lách Lolo xanh & đỏ (400g)', 'Ớt chuông đỏ Đà Lạt (1 quả)', 'Dưa chuột'],
    },
  };

  const activeCombo = MENU_COMBOS[menuTab];

  // Flash sale sample products (RuleLayout B.1)
  const flashSaleProduct: Product = products[0] || {
    id: 999,
    name: 'Cà Rốt Hữu Cơ Đà Lạt Chuẩn VietGAP',
    slug: 'ca-rot-huu-co',
    description: 'Củ đều ngọt đậm, thu hoạch sáng sớm tại nông trại Đà Lạt.',
    price: 18000,
    originalPrice: 30000,
    stockQuantity: 30,
    unit: '500g / túi',
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=500&auto=format&fit=crop&q=80',
    origin: 'Đà Lạt',
    isOrganic: true,
    isFeatured: true,
    isActive: true,
    categoryId: 2,
    categoryName: 'Củ quả tươi',
  };

  const handleBuyFlashSale = () => {
    handleAddToCart(flashSaleProduct, 1);
  };

  const handleBuyCombo = () => {
    const comboProduct: Product = {
      id: 9999 + (menuTab === 'soup' ? 1 : menuTab === 'meat' ? 2 : menuTab === 'stirfry' ? 3 : 4),
      name: `Combo ${activeCombo.name}`,
      slug: `combo-${menuTab}`,
      description: activeCombo.desc,
      price: activeCombo.price,
      originalPrice: activeCombo.origPrice,
      stockQuantity: 20,
      unit: 'Combo trọn gói',
      imageUrl: activeCombo.image,
      origin: 'Đà Lạt',
      isOrganic: true,
      isFeatured: true,
      isActive: true,
      categoryId: 4,
      categoryName: 'Combo tiết kiệm',
    };
    handleAddToCart(comboProduct, 1);
  };

  // Filter products by sidebar criteria (RuleLayout C.1)
  const filteredProducts = products.filter((prod) => {
    if (selectedCert === 'ORGANIC' && !prod.isOrganic) return false;
    if (selectedCert === 'VIETGAP' && prod.isOrganic) return false;
    if (maxPrice < 150000 && prod.price > maxPrice) return false;
    return true;
  });

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
        {/* B.1: HERO BANNER & FLASH SALE (8:4 Desktop Grid, Xếp dọc Mobile) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Cột trái (8 cột): Hero Banner 16:9 bo góc 16px */}
          <div className="lg:col-span-8 bg-gradient-to-r from-[#10542C] via-[#0E4926] to-[#176637] rounded-2xl overflow-hidden p-6 sm:p-8 text-white relative shadow-sm flex flex-col justify-between min-h-[300px] sm:min-h-[360px]">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#8BC34A]/20 blur-3xl pointer-events-none" />

            {/* Content */}
            <div className="space-y-4 relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#8BC34A] text-xs font-bold border border-white/20">
                <Leaf className="w-3.5 h-3.5" /> 100% Nông Sản Chuẩn VietGAP & Hữu Cơ
              </span>

              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Rau Sạch Tươi Ngon <br />
                <span className="text-[#8BC34A]">Từ Nông Trại Đến Bàn Ăn</span>
              </h1>

              <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed font-normal">
                Thu hoạch lúc 4h sáng mỗi ngày từ Đà Lạt & Mộc Châu. Đóng gói bảo quản nghiêm ngặt, giao nhanh tận bếp trong 2 giờ.
              </p>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap items-center gap-3 pt-4 relative z-10">
              <a
                href="#catalog-section"
                className="px-6 py-2.5 bg-[#4CAF50] hover:bg-[#3d9140] text-white font-heading font-bold text-xs rounded-full shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Mua sắm ngay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setIsPromoOpen(true)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-heading font-bold text-xs rounded-full backdrop-blur-md transition-all cursor-pointer"
              >
                Xem ưu đãi hôm nay
              </button>
            </div>
          </div>

          {/* Cột phải (4 cột): Khối Flash Sale Giờ Vàng Giá Sốc */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EAECE8] overflow-hidden shadow-xs flex flex-col justify-between">
            {/* Header Flash Sale: Nền Tomato Red #E53935 */}
            <div className="bg-[#E53935] text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 fill-white text-white animate-bounce" />
                <span className="font-heading font-black text-sm tracking-wide">GIỜ VÀNG GIÁ SỐC</span>
              </div>

              {/* Countdown Timer: [Giờ] : [Phút] : [Giây] */}
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold">
                <span className="bg-[#B71C1C] px-1.5 py-0.5 rounded-[6px]">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span>:</span>
                <span className="bg-[#B71C1C] px-1.5 py-0.5 rounded-[6px]">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span>:</span>
                <span className="bg-[#B71C1C] px-1.5 py-0.5 rounded-[6px]">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Mini Card Sản phẩm Giá sốc (RuleLayout B.1) */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div className="flex gap-3 items-center">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#F9F9F5] border border-[#EAECE8] shrink-0">
                  <img
                    src={flashSaleProduct.imageUrl}
                    alt={flashSaleProduct.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 bg-[#E53935] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    -40%
                  </span>
                </div>

                <div className="space-y-1 flex-1">
                  <h4 className="font-heading text-xs sm:text-sm font-bold text-[#2C3E2E] line-clamp-2 leading-tight">
                    {flashSaleProduct.name}
                  </h4>
                  <div className="text-[11px] text-[#6B7280]">
                    Quy cách: {flashSaleProduct.unit || '500g / túi'}
                  </div>
                  <div className="flex items-baseline gap-2 pt-0.5">
                    <span className="font-heading text-base font-black text-[#E53935]">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(flashSaleProduct.price)}
                    </span>
                    <span className="text-[11px] text-[#6B7280] line-through">
                      30.000 đ
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar "Đã bán 24/30" */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-[#FB8C00]">
                  <span>Đã bán 24/30</span>
                  <span>Sắp cháy hàng</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#FB8C00] to-[#E53935] rounded-full w-[80%]" />
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleBuyFlashSale}
                className="w-full py-2.5 bg-[#FB8C00] hover:bg-[#E67E00] text-white font-heading font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Mua ngay giá sốc</span>
              </button>
            </div>
          </div>
        </section>

        {/* B.2: KHỐI GỢI Ý "HÔM NAY ĂN GÌ?" */}
        <section className="bg-white rounded-2xl border border-[#EAECE8] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAECE8]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#10542C]/10 text-[#10542C] flex items-center justify-center">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-[#10542C]">Hôm Nay Ăn Gì?</h2>
                <p className="text-xs text-[#6B7280]">Gợi ý thực đơn tươi ngon chuẩn vị nông trại cho cả gia đình</p>
              </div>
            </div>

            {/* Menu Tabs: [Nấu canh thanh mát], [Món mặn đậm đà], [Xào & Luộc], [Trộn salad tươi] */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'soup', label: 'Nấu canh thanh mát', icon: Soup },
                { id: 'meat', label: 'Món mặn đậm đà', icon: Flame },
                { id: 'stirfry', label: 'Xào & Luộc', icon: ChefHat },
                { id: 'salad', label: 'Trộn salad tươi', icon: Salad },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMenuTab(t.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      menuTab === t.id
                        ? 'bg-[#10542C] text-white shadow-2xs'
                        : 'bg-[#F9F9F5] text-[#6B7280] hover:text-[#10542C] hover:bg-[#F4F5F1]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Combo Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center p-3 sm:p-4 bg-[#F9F9F5] rounded-xl border border-[#EAECE8]">
            <div className="md:col-span-4 relative aspect-16/10 rounded-xl overflow-hidden bg-white border border-[#EAECE8]">
              <img
                src={activeCombo.image}
                alt={activeCombo.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="md:col-span-5 space-y-2">
              <h3 className="font-heading text-base font-bold text-[#2C3E2E] leading-snug">
                {activeCombo.name}
              </h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                {activeCombo.desc}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeCombo.items.map((it) => (
                  <span
                    key={it}
                    className="text-[11px] bg-white px-2 py-0.5 rounded-md border border-[#EAECE8] text-[#10542C] font-medium"
                  >
                    ✓ {it}
                  </span>
                ))}
              </div>
            </div>

            <div className="md:col-span-3 flex md:flex-col items-center justify-between gap-3 text-right">
              <div>
                <span className="text-[11px] text-[#6B7280] block">Giá trọn combo:</span>
                <div className="font-heading text-lg font-black text-[#10542C]">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(activeCombo.price)}
                </div>
                <div className="text-[11px] text-[#6B7280] line-through">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(activeCombo.origPrice)}
                </div>
              </div>

              {/* Nút CTA "Mua trọn combo" nền Fresh Green #4CAF50 theo RuleLayout B.2 */}
              <button
                type="button"
                onClick={handleBuyCombo}
                className="px-5 py-2.5 bg-[#4CAF50] hover:bg-[#3d9140] text-white font-heading font-bold text-xs rounded-full shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Mua trọn combo</span>
              </button>
            </div>
          </div>
        </section>

        {/* B.3: DANH MỤC NỔI BẬT (Quick Access 4 nhóm chính) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-[#10542C]">
              Danh Mục Sản Phẩm Nổi Bật
            </h2>
            <span className="text-xs text-[#6B7280]">Khám phá các nhóm nông sản hữu cơ</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                id: 1,
                name: 'Rau Ăn Lá',
                desc: 'Cải, mồng tơi, xà lách thủy canh',
                icon: '🥬',
                bg: 'bg-emerald-50/80 border-emerald-100',
              },
              {
                id: 2,
                name: 'Củ, Quả Tươi',
                desc: 'Cà rốt, cà chua, bí đỏ, khoai tây',
                icon: '🥕',
                bg: 'bg-amber-50/80 border-amber-100',
              },
              {
                id: 3,
                name: 'Nấm Các Loại',
                desc: 'Nấm kim châm, đùi gà, linh chi',
                icon: '🍄',
                bg: 'bg-stone-50/80 border-stone-200',
              },
              {
                id: 4,
                name: 'Combo Tiết Kiệm',
                desc: 'Gói rau nấu canh, rau lẩu gia đình',
                icon: '🥗',
                bg: 'bg-green-50/80 border-green-100',
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
          <div className="flex items-center justify-between border-b border-[#EAECE8] pb-3">
            <h2 className="font-heading text-xl font-bold text-[#10542C]">
              {selectedCategory
                ? categories.find((c) => c.id === selectedCategory)?.name || 'Danh Mục Nông Sản'
                : 'Tất Cả Nông Sản Tươi Sạch'}
            </h2>
            <span className="text-xs text-[#6B7280]">
              Hiển thị {filteredProducts.length} sản phẩm
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar Bộ Lọc (25% ~ 3 cols) - RuleLayout C.1 */}
            <aside className="lg:col-span-3 bg-white p-4 rounded-2xl border border-[#EAECE8] shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAECE8]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#10542C]">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Bộ Lọc Nâng Cao</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedCert(null);
                    setMaxPrice(150000);
                    setSelectedCookingPurpose(null);
                  }}
                  className="text-[10px] text-[#E53935] hover:underline cursor-pointer"
                >
                  Thiết lập lại
                </button>
              </div>

              {/* 1. Phân loại rau */}
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-[#2C3E2E] block">Phân loại rau:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="catRadio"
                    checked={selectedCategory === null}
                    onChange={() => setSelectedCategory(null)}
                    className="accent-[#10542C]"
                  />
                  <span>Tất cả nông sản</span>
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

              {/* 2. Chứng nhận chất lượng */}
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
                  <span>VietGAP</span>
                </label>
              </div>

              {/* 3. Khoảng giá: Thanh trượt kéo (Price Slider) theo RuleLayout */}
              <div className="space-y-2 pt-2 border-t border-[#EAECE8]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#2C3E2E] block">Khoảng giá tối đa:</span>
                  <span className="font-mono text-[11px] font-black text-[#10542C] bg-[#10542C]/10 px-2 py-0.5 rounded-lg border border-[#10542C]/20">
                    {maxPrice >= 150000 ? 'Tất cả' : `${new Intl.NumberFormat('vi-VN').format(maxPrice)} đ`}
                  </span>
                </div>

                {/* Thanh kéo Range Slider */}
                <div className="pt-1">
                  <input
                    type="range"
                    min={15000}
                    max={150000}
                    step={5000}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#10542C]"
                  />
                  <div className="flex justify-between text-[10px] text-[#6B7280] mt-1 font-semibold">
                    <span>15.000 đ</span>
                    <span>80.000 đ</span>
                    <span>150.000 đ+</span>
                  </div>
                </div>

                {/* Nút bấm nhanh các mốc giá phổ biến */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {[
                    { label: 'Tất cả', val: 150000 },
                    { label: '≤ 30k', val: 30000 },
                    { label: '≤ 50k', val: 50000 },
                    { label: '≤ 80k', val: 80000 },
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

              {/* 4. Mục đích nấu nướng */}
              <div className="space-y-1.5 text-xs pt-2 border-t border-[#EAECE8]">
                <span className="font-bold text-[#2C3E2E] block">Mục đích nấu nướng:</span>
                {['Ăn kiêng & Salad', 'Nấu canh gia đình', 'Ăn lẩu cuối tuần'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedCookingPurpose(selectedCookingPurpose === p ? null : p)}
                    className={`block w-full text-left px-2 py-1 rounded text-[11px] cursor-pointer ${
                      selectedCookingPurpose === p
                        ? 'bg-[#10542C] text-white font-bold'
                        : 'text-[#6B7280] hover:bg-[#F9F9F5]'
                    }`}
                  >
                    • {p}
                  </button>
                ))}
              </div>
            </aside>

            {/* Lưới sản phẩm (75% ~ 9 cols) - RuleLayout B.4 (4 cột Desktop, 3 cột Tablet, 2 cột Mobile) */}
            <div className="lg:col-span-9">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-3 border border-[#EAECE8] space-y-3 animate-pulse">
                      <div className="aspect-square bg-gray-100 rounded-xl" />
                      <div className="h-4 bg-gray-100 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-5 bg-gray-100 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-[#EAECE8] space-y-3">
                  <div className="w-14 h-14 bg-[#10542C]/10 rounded-full flex items-center justify-center text-[#10542C] mx-auto">
                    <Leaf className="w-7 h-7 opacity-70" />
                  </div>
                  <h4 className="font-heading text-base font-bold text-[#10542C]">Không tìm thấy nông sản phù hợp</h4>
                  <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                    Vui lòng thử điều chỉnh lại bộ lọc hoặc tìm kiếm bằng từ khóa khác.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedCert(null);
                      setMaxPrice(150000);
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 bg-[#10542C] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Xem tất cả sản phẩm
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={(p) => handleAddToCart(p, 1)}
                      onViewDetail={(p) => setSelectedProductForDetail(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Footer (RuleLayout & RuleUI) */}
      <footer className="bg-[#10542C] text-emerald-100/80 border-t border-[#0C3E20] pt-12 pb-10 mt-12">
        <div className="max-w-[1240px] mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-8 text-xs">
          <div className="md:col-span-5 space-y-3">
            <div className="relative h-12 w-44">
              <Image
                src="/assets/logo/Logo_full.png"
                alt="HoNa Fresh"
                fill
                className="object-contain object-left brightness-110"
              />
            </div>
            <p className="leading-relaxed text-emerald-100/75 max-w-sm">
              <strong className="text-white">HoNa Fresh</strong> — Slogan: <em>Rau sạch từ nông trại đến bàn ăn</em>. Cung cấp nông sản hữu cơ đạt chuẩn VietGAP tươi ngon, thu hoạch hàng ngày tại Đà Lạt & Mộc Châu.
            </p>
            <div className="flex items-center gap-2 text-emerald-200">
              <MapPin className="w-3.5 h-3.5 text-[#8BC34A] shrink-0" />
              <span>Nông trại liên kết: Đà Lạt (Lâm Đồng) & Mộc Châu (Sơn La)</span>
            </div>
          </div>

          <div className="md:col-span-3 space-y-2">
            <h5 className="font-heading font-bold text-white text-sm">Tiêu Chuẩn Nông Sản</h5>
            <ul className="space-y-1.5 text-emerald-100/75">
              <li>✓ 100% Chuẩn VietGAP & Organic</li>
              <li>✓ Không thuốc trừ sâu hóa học</li>
              <li>✓ Thu hoạch 4h sáng, giao siêu tốc 2h</li>
              <li>✓ Đổi trả miễn phí 1-1 nếu không ưng ý</li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-2">
            <h5 className="font-heading font-bold text-white text-sm">Dự Án BTL Web Bán Rau</h5>
            <p className="leading-relaxed text-emerald-100/75">
              Hệ thống bán lẻ rau củ trực tuyến hiện đại tương tự Bách Hóa Xanh:
            </p>
            <ul className="space-y-1 text-emerald-100/75">
              <li>• Frontend: Next.js 16 (App Router, Turbopack, TypeScript)</li>
              <li>• Backend: Spring Boot 3.3, JPA, PostgreSQL Docker</li>
              <li>• Tài liệu API: <code>/api/v1/swagger-ui.html</code></li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1240px] mx-auto px-4 mt-8 pt-4 border-t border-white/10 text-center text-[11px] text-emerald-200/50">
          © 2026 HoNa Fresh. Rau sạch từ nông trại đến bàn ăn. All rights reserved.
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (RuleLayout) */}
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
          <span className="text-[10px] font-bold">Danh mục</span>
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
          <span className="text-[10px] font-bold">Giỏ hàng</span>
        </button>

        <button
          onClick={() => setIsAuthOpen(true)}
          className="flex flex-col items-center gap-1 text-[#6B7280] hover:text-[#10542C] p-1 cursor-pointer"
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold max-w-[60px] truncate">
            {currentUser ? (currentUser.fullName || currentUser.username) : 'Tài khoản'}
          </span>
        </button>
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
