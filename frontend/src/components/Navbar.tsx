'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  Search,
  MapPin,
  Gift,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Clock,
  Sprout,
  ReceiptText,
  Sparkles,
} from 'lucide-react';
import { AuthResponse, Product } from '@/types';
import { getProducts, hybridSearchApi } from '@/services/api';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenTracking: () => void;
  onOpenPromo: () => void;
  onOpenLocation: () => void;
  onOpenAi?: () => void;
  currentLocation: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  selectedCategory: number | null;
  onSelectCategory: (catId: number | null) => void;
  currentUser?: AuthResponse | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  onOpenTracking,
  onOpenPromo,
  onOpenLocation,
  currentLocation,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  selectedCategory,
  onSelectCategory,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenAi,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [navbarSuggestions, setNavbarSuggestions] = useState<Product[]>([]);
  const [navMatchedRegion, setNavMatchedRegion] = useState<string | null>(null);
  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const contractBtnRef = useRef<HTMLButtonElement>(null);
  const [expandedWidth, setExpandedWidth] = useState<number | null>(null);

  // Tính toán chiều rộng giãn nở của ô tìm kiếm: Chỉ giãn đến hết mép phải của ô "Hợp đồng & Lô cọc"
  const updateExpandedWidth = () => {
    if (searchContainerRef.current && contractBtnRef.current) {
      const searchRect = searchContainerRef.current.getBoundingClientRect();
      const contractRect = contractBtnRef.current.getBoundingClientRect();
      const calculated = contractRect.right - searchRect.left;
      if (calculated > 0) {
        setExpandedWidth(Math.round(calculated));
      }
    }
  };

  useEffect(() => {
    updateExpandedWidth();
    window.addEventListener('resize', updateExpandedWidth);
    return () => window.removeEventListener('resize', updateExpandedWidth);
  }, []);

  const handleSearchFocus = () => {
    updateExpandedWidth();
    setIsSearchFocused(true);
    if (navbarSuggestions.length > 0 || searchQuery.trim().length >= 2) {
      setIsNavDropdownOpen(true);
    }
  };

  // Xử lý submit tìm kiếm: Đóng popup gợi ý, gọi submit và reset ô tìm kiếm về trống
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsNavDropdownOpen(false);
    setIsSearchFocused(false);
    onSearchSubmit(e);
    onSearchChange('');
  };

  // Xử lý Click Outside: Bấm ra ngoài thì đóng gợi ý, click vào ô tìm kiếm thì mở lại
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsNavDropdownOpen(false);
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) {
      setNavbarSuggestions([]);
      setNavMatchedRegion(null);
      setIsNavDropdownOpen(false);
      return;
    }

    const REGION_MAP: { [key: string]: string } = {
      'đồng nai': 'Đồng Nai',
      'dong nai': 'Đồng Nai',
      'long khánh': 'Long Khánh',
      'đắk lắk': 'Đắk Lắk',
      'dak lak': 'Đắk Lắk',
      'buôn hồ': 'Buôn Hồ',
      'đà lạt': 'Đà Lạt',
      'lâm đồng': 'Lâm Đồng',
      'đơn dương': 'Đơn Dương',
      'đức trọng': 'Đức Trọng',
      'gia lai': 'Gia Lai',
      'chư prông': 'Chư Prông',
      'mộc châu': 'Mộc Châu',
      'hải dương': 'Hải Dương',
      'quảng ninh': 'Quảng Ninh',
      'ba vì': 'Ba Vì',
      'hà nội': 'Hà Nội',
      'cần thơ': 'Cần Thơ',
      'vĩnh long': 'Vĩnh Long',
      'tiền giang': 'Tiền Giang',
      'bến tre': 'Bến Tre',
    };

    let matched: string | null = null;
    for (const [k, v] of Object.entries(REGION_MAP)) {
      if (trimmed.includes(k)) {
        matched = v;
        break;
      }
    }
    setNavMatchedRegion(matched);

    const timer = setTimeout(async () => {
      try {
        if (!matched && searchQuery.trim().length >= 2) {
          try {
            const hybridRes = await hybridSearchApi(searchQuery.trim(), 5);
            if (hybridRes && hybridRes.items && hybridRes.items.length > 0) {
              setNavbarSuggestions(hybridRes.items.map(item => item.product));
              setIsNavDropdownOpen(true);
              return;
            }
          } catch {
            // fallback to getProducts below
          }
        }
        const res = await getProducts({ keyword: matched || searchQuery.trim(), size: 5 });
        if (res && res.products && res.products.length > 0) {
          setNavbarSuggestions(res.products);
          setIsNavDropdownOpen(true);
        } else {
          setNavbarSuggestions([]);
          setIsNavDropdownOpen(false);
        }
      } catch {
        setNavbarSuggestions([]);
        setIsNavDropdownOpen(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-xs transition-all">
      {/* 1. TOP BAR (36px, Nền #10542C, chữ trắng, font 13px) */}
      <div
        className={`bg-[#10542C] text-white text-[13px] border-b border-[#0C3E20] transition-all duration-300 overflow-hidden ${
          isScrolled ? 'h-0 max-h-0 opacity-0 border-b-0' : 'h-9 max-h-9 opacity-100'
        }`}
      >
        <div className="max-w-[1240px] mx-auto px-4 h-full flex items-center justify-between">
          {/* Trái: Slogan B2B Nông Sản */}
          <div className="flex items-center gap-2 font-medium">
            <Sprout className="w-4 h-4 text-[#8BC34A]" />
            <span className="hidden sm:inline font-bold">Sàn Thương Mại Nông Sản B2B Việt Nam</span>
            <span className="text-white/70 hidden md:inline">• Cầu nối số trực tiếp Nông Trại & Thương Lái • 0% Phí Trung Gian</span>
          </div>

          {/* Phải: Chuyển đổi đối tượng giao dịch & Điểm nhận hàng */}
          <div className="flex items-center gap-4 text-xs">
            <div className="hidden lg:flex items-center gap-1.5 text-emerald-200">
              <span className="bg-emerald-800/80 px-2 py-0.5 rounded text-[11px] font-bold">500+ HTX & Vựa Nông Sản</span>
            </div>

            <div
              onClick={onOpenLocation}
              className="flex items-center gap-1.5 cursor-pointer hover:text-[#8BC34A] transition-colors py-1 group select-none"
              title="Đổi địa chỉ giao kho / chợ đầu mối"
            >
              <MapPin className="w-3.5 h-3.5 text-[#8BC34A] shrink-0" />
              <span className="text-white/80">Kho nhận hàng:</span>
              <span className="font-bold underline decoration-[#8BC34A] decoration-1 underline-offset-2 max-w-[180px] truncate">
                {currentLocation || 'Chợ Đầu Mối Thủ Đức'}
              </span>
              <ChevronDown className="w-3 h-3 text-white/70 group-hover:translate-y-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (Chiều cao sạch sẽ, không bị đè hay tràn) */}
      <div className="border-b border-[#EAECE8] bg-white transition-all duration-300">
        <div className="max-w-[1240px] mx-auto px-4">
          <div
            className={`flex items-center justify-between transition-all duration-300 gap-2 sm:gap-3 lg:gap-4 ${
              isScrolled ? 'h-16' : 'h-[72px]'
            }`}
          >
            {/* Logo Thương hiệu B2B */}
            <div
              onClick={() => {
                onSelectCategory(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
            >
              <div className="relative h-11 w-36 sm:w-44">
                <Image
                  src="/assets/logo/Logo_full.png"
                  alt="HoNa Fresh B2B"
                  fill
                  priority
                  className="object-contain object-left group-hover:scale-102 transition-transform duration-200"
                />
              </div>
              <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider bg-[#10542C] text-white px-2 py-0.5 rounded-md shadow-2xs">
                SÀN B2B SỈ
              </span>
            </div>

            {/* Khung Giữ Chỗ Cho Thanh Tìm Kiếm (Tự co giãn thông minh flex-1, không bao giờ ép tràn các nút bên phải) */}
            <div ref={searchContainerRef} className="hidden md:block relative flex-1 max-w-[240px] min-w-[130px] h-10 mx-1">
              {/* Lớp Thanh Tìm Kiếm Nổi (LUÔN LUÔN là absolute để co giãn CSS mượt mà, NỞ RỘNG ĐÈ LÊN ĐẾN HẾT Ô HỢP ĐỒNG & LÔ CỌC) */}
              <div
                className={`absolute left-0 top-0 transition-all duration-300 ease-out z-50 ${
                  isSearchFocused || isNavDropdownOpen ? 'shadow-2xl' : 'w-full'
                }`}
                style={
                  isSearchFocused || isNavDropdownOpen
                    ? { width: expandedWidth ? `${expandedWidth}px` : 'calc(100% + 160px)' }
                    : { width: '100%' }
                }
              >
                <form 
                  onSubmit={handleFormSubmit} 
                  className={`relative w-full flex items-center transition-all duration-300 rounded-full h-10 ${
                    isSearchFocused || isNavDropdownOpen
                      ? 'bg-white border-2 border-[#10542C] shadow-2xl ring-4 ring-emerald-500/20'
                      : 'bg-[#F9F9F5] hover:bg-white border-[1.5px] border-[#E5E7EB] hover:border-[#10542C]/50 shadow-2xs'
                  }`}
                >
                  <Search className={`w-4 h-4 transition-colors absolute left-3.5 z-10 ${
                    isSearchFocused || isNavDropdownOpen ? 'text-[#10542C]' : 'text-[#4CAF50]'
                  }`} />
                  <input
                    type="text"
                    placeholder={
                      isSearchFocused || isNavDropdownOpen
                        ? 'Tìm nguồn hàng sỉ: Bắp cải Đà Lạt, Cà rốt Lâm Đồng...'
                        : 'Tìm nguồn hàng sỉ...'
                    }
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={handleSearchFocus}
                    onClick={handleSearchFocus}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsNavDropdownOpen(false);
                        setIsSearchFocused(false);
                      }
                    }}
                    className="w-full h-full bg-transparent pl-10 pr-28 text-xs text-[#2C3E2E] placeholder-[#6B7280] focus:outline-none rounded-full"
                  />

                  {/* Nút Xóa nhanh khi có chữ */}
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        onSearchChange('');
                        setIsNavDropdownOpen(false);
                      }}
                      className="absolute right-20 text-gray-400 hover:text-gray-600 text-xs px-1.5 py-0.5 rounded-full hover:bg-gray-100 cursor-pointer"
                      title="Xóa nội dung"
                    >
                      ✕
                    </button>
                  )}

                  <button
                    type="submit"
                    className="absolute right-1.5 h-7.5 px-4 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <span>Tìm sỉ</span>
                  </button>
                </form>

                {/* DROPDOWN GỢI Ý TỨC THÌ: VỪA VẶN CHIỀU RỘNG Ô TÌM KIẾM ĐANG NỞ RỘNG */}
                {isNavDropdownOpen && navbarSuggestions.length > 0 && (
                  <div className="mt-2 w-full bg-white rounded-2xl shadow-2xl border border-emerald-100 p-3.5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1 mb-2">
                      <span className="text-xs font-bold text-[#10542C] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        {navMatchedRegion 
                          ? `Gợi ý nông sản tại ${navMatchedRegion}:`
                          : `Gợi ý nông sản thông minh:`}
                      </span>
                      <button
                        onClick={() => {
                            setIsNavDropdownOpen(false);
                            setIsSearchFocused(false);
                            onSearchChange('');
                          }}
                        className="text-xs text-slate-400 hover:text-slate-700 font-bold px-2 py-0.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      >
                        ✕ Đóng
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-80 overflow-y-auto overflow-x-hidden pr-1">
                      {navbarSuggestions.map((item) => (
                        <Link
                          key={item.id}
                          href={`/san-pham/${item.slug}`}
                          onClick={() => {
                            setIsNavDropdownOpen(false);
                            setIsSearchFocused(false);
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-emerald-50/80 transition-colors group cursor-pointer border border-transparent hover:border-emerald-100"
                        >
                          <img
                            src={item.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=100'}
                            alt={item.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#2C3E2E] group-hover:text-[#10542C] truncate">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-emerald-700 font-medium truncate mt-0.5">
                              📍 {item.origin || item.farmLocation || 'Đà Lạt, Lâm Đồng'}
                            </p>
                          </div>
                          <div className="text-right shrink-0 pl-3">
                            <p className="text-sm font-black text-[#10542C]">
                              {Number(item.price).toLocaleString('vi-VN')} đ/kg
                            </p>
                            <p className="text-[10px] text-slate-500 font-semibold">MOQ: {item.moq || 200} kg</p>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs px-1">
                      {onOpenAi && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsNavDropdownOpen(false);
                            setIsSearchFocused(false);
                            onSearchChange('');
                            onOpenAi();
                          }}
                          className="text-[11px] font-bold text-[#10542C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Hỏi Trợ lý AI về vùng này
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          handleFormSubmit(e);
                        }}
                        className="ml-auto text-[11px] font-bold text-slate-500 hover:text-[#10542C] cursor-pointer"
                      >
                        Xem tất cả kết quả →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Khối Tiện Ích B2B & Tài Khoản */}
            <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
              {/* Nút Kho Lô Nông Sản */}
              <Link
                href="/san-pham"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#10542C] bg-[#F4F7F4] hover:bg-[#EAF1EA] rounded-xl transition-colors border border-[#D7EED6] shrink-0"
              >
                <span>Kho Lô Nông Sản</span>
              </Link>

              {/* Nút Theo dõi Hợp Đồng / Lô Đặt Cọc - Điểm dừng mép phải của ô tìm kiếm co giãn */}
              <button
                ref={contractBtnRef}
                type="button"
                onClick={onOpenTracking}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#10542C] bg-[#F4F5F1] hover:bg-[#EAECE8] rounded-xl transition-colors cursor-pointer border border-[#EAECE8] shrink-0"
              >
                <Clock className="w-4 h-4 text-[#4CAF50]" />
                <span className="hidden lg:inline">Hợp đồng & Lô cọc</span>
                <span className="lg:hidden">Hợp đồng</span>
              </button>

              {/* Cổng Nông Trại & HTX */}
              <Link
                href="/portal/farmer"
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#10542C] bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200"
                title="Cổng quản lý lô vụ mùa dành cho Nông dân & Hợp tác xã"
              >
                <Sprout className="w-4 h-4 text-emerald-600" />
                <span className="hidden lg:inline">Cổng Nông Trại</span>
              </Link>

              {/* Giỏ Lô Hàng Đặt Cọc */}
              <button
                type="button"
                onClick={onOpenCart}
                className="relative px-2.5 py-1.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                aria-label="Lô hàng đặt cọc"
                title="Danh sách lô hàng chuẩn bị đặt cọc"
              >
                <ShoppingBag className="w-4 h-4 text-[#8BC34A]" />
                <span className="text-xs font-bold hidden sm:inline">Lô đã chọn</span>
                {cartCount > 0 && (
                  <span className="bg-[#E53935] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border-2 border-white animate-pulse">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Khối Tài Khoản */}
              {currentUser ? (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 pl-2 bg-[#F4F5F1] hover:bg-[#EAECE8] rounded-xl border border-[#EAECE8] transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#10542C] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {currentUser.fullName?.charAt(0) || currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-[#2C3E2E] max-w-[80px] truncate hidden sm:inline">
                      {currentUser.fullName || currentUser.username}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                  </button>

                  {/* Dropdown Menu khách hàng */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-[#EAECE8] py-1.5 z-50 text-xs">
                      <div className="px-3 py-2 border-b border-[#EAECE8]">
                        <p className="font-bold text-[#2C3E2E] truncate">
                          {currentUser.fullName || currentUser.username}
                        </p>
                        <p className="text-[11px] text-[#6B7280] truncate">{currentUser.email}</p>
                      </div>
                      <Link
                        href="/portal/farmer"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full text-left px-3 py-2 text-[#10542C] hover:bg-emerald-50 flex items-center gap-2 font-bold cursor-pointer"
                      >
                        <Sprout className="w-4 h-4 text-emerald-600" />
                        <span>Cổng Nông Trại & HTX</span>
                      </Link>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenTracking();
                        }}
                        className="w-full text-left px-3 py-2 text-[#2C3E2E] hover:bg-[#F4F5F1] flex items-center gap-2 cursor-pointer"
                      >
                        <ReceiptText className="w-4 h-4 text-[#4CAF50]" />
                        <span>Lịch sử & Theo dõi đơn</span>
                      </button>
                      {onLogout && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full text-left px-3 py-2 text-[#E53935] hover:bg-[#E53935]/10 flex items-center gap-2 cursor-pointer border-t border-[#EAECE8]"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Đăng xuất</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Dành cho Khách (Guest): Nút "Đăng ký / Đăng nhập" liên kết trực tiếp tới /dang-nhap */
                <Link
                  href="/dang-nhap"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#10542C] border border-[#10542C]/40 hover:bg-[#10542C]/5 rounded-[8px] transition-colors cursor-pointer shrink-0"
                >
                  <UserIcon className="w-4 h-4 text-[#10542C]" />
                  <span className="hidden sm:inline">Đăng ký / Đăng nhập</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Search Input */}
          <form onSubmit={handleFormSubmit} className="md:hidden pb-3 relative flex items-center">
            <Search className="w-4 h-4 text-[#4CAF50] absolute left-3.5 z-10" />
            <input
              type="text"
              placeholder="Tìm nguồn hàng sỉ: Bắp cải, Cà rốt..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#F9F9F5] border-[1.5px] border-[#E5E7EB] rounded-full pl-10 pr-20 h-10 text-xs text-[#2C3E2E] placeholder-[#6B7280] focus:outline-none focus:border-[#10542C]"
            />
            <button
              type="submit"
              className="absolute right-1 h-8 px-3 bg-[#10542C] text-white rounded-full text-[11px] font-bold"
            >
              Tìm sỉ
            </button>
          </form>
        </div>
      </div>

      {/* 3. TẦNG SUB-NAV: ĐIỀU HƯỚNG NGÀNH HÀNG NÔNG SẢN B2B (Riêng biệt, sạch sẽ, không bao giờ bị cắt chữ) */}
      <div className="bg-[#FAFBF9] border-b border-[#EAECE8] py-2 transition-all">
        <div className="max-w-[1240px] mx-auto px-4 flex items-center justify-between gap-4">
          {/* Nhóm Tabs danh mục ngành hàng */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 flex-nowrap">
            {[
              { label: 'Tất cả lô xuất vườn', id: null },
              { label: 'Rau ăn lá (≥ 500kg)', id: 1 },
              { label: 'Củ & Quả theo tấn', id: 2 },
              { label: 'Nấm tươi xuất xưởng', id: 3 },
              { label: 'Rau gia vị & Khác', id: 4 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onSelectCategory(item.id)}
                className={`text-xs px-3.5 py-1.5 rounded-full transition-all cursor-pointer font-bold shrink-0 whitespace-nowrap ${
                  selectedCategory === item.id
                    ? 'bg-[#10542C] text-white shadow-2xs'
                    : 'text-[#4B5563] hover:text-[#10542C] hover:bg-[#EAECE8]/70 bg-white border border-[#EAECE8]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Hotline & Liên kết nhanh cho Thương lái */}
          <div className="hidden lg:flex items-center gap-3 text-xs font-semibold text-[#10542C] shrink-0">
            <Link
              href="/san-pham"
              className="hover:underline flex items-center gap-1.5 text-[#10542C] hover:text-[#0C3E20]"
            >
              <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
              <span>Sàn Chào Mua B2B</span>
            </Link>
            <span className="text-[#D1D5DB]">•</span>
            <span className="text-[#6B7280]">
              Hotline sỉ: <strong className="text-[#10542C] font-bold">1900 6868</strong>
            </span>
          </div>
        </div>
      </div>
          {/* Lớp Nền Mờ Nhẹ Khi Đang Tìm Kiếm (Click ra ngoài là đóng lại êm ái) */}
      {(isSearchFocused || isNavDropdownOpen) && (
        <div
          onClick={() => {
            setIsNavDropdownOpen(false);
            setIsSearchFocused(false);
          }}
          className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[0.5px] transition-opacity"
        />
      )}
    </header>
  );
};
