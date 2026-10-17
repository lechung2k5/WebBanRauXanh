'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { AuthResponse } from '@/types';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenTracking: () => void;
  onOpenPromo: () => void;
  onOpenLocation: () => void;
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
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
            className={`flex items-center justify-between transition-all duration-300 gap-4 sm:gap-6 ${
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

            {/* Thanh Tìm kiếm Lô Nông Sản B2B (Đơn giản, Rộng rãi, Tích hợp nút Tìm sỉ) */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-2">
              <form onSubmit={onSearchSubmit} className="relative w-full flex items-center">
                <Search className="w-4 h-4 text-[#4CAF50] absolute left-4 z-10" />
                <input
                  type="text"
                  placeholder="Tìm nguồn hàng sỉ: Bắp cải Đà Lạt, Cà rốt Lâm Đồng, Nấm tươi..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-[#F9F9F5] hover:bg-white focus:bg-white border-[1.5px] border-[#E5E7EB] focus:border-[#10542C] rounded-full pl-11 pr-24 h-11 text-xs text-[#2C3E2E] placeholder-[#6B7280] focus:outline-none transition-all shadow-2xs"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 h-8 px-4 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>Tìm sỉ</span>
                </button>
              </form>
            </div>

            {/* Khối Tiện Ích B2B & Tài Khoản */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Nút Kho Lô Nông Sản */}
              <Link
                href="/san-pham"
                className="hidden xl:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#10542C] bg-[#F4F7F4] hover:bg-[#EAF1EA] rounded-xl transition-colors border border-[#D7EED6]"
              >
                <span>Kho Lô Nông Sản</span>
              </Link>

              {/* Nút Theo dõi Hợp Đồng / Lô Đặt Cọc */}
              <button
                type="button"
                onClick={onOpenTracking}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#10542C] bg-[#F4F5F1] hover:bg-[#EAECE8] rounded-xl transition-colors cursor-pointer border border-[#EAECE8]"
              >
                <Clock className="w-4 h-4 text-[#4CAF50]" />
                <span className="hidden lg:inline">Hợp đồng & Lô cọc</span>
                <span className="lg:hidden">Hợp đồng</span>
              </button>

              {/* Giỏ Lô Hàng Đặt Cọc */}
              <button
                type="button"
                onClick={onOpenCart}
                className="relative px-3 py-2 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
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
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 pl-2 bg-[#F4F5F1] hover:bg-[#EAECE8] rounded-xl border border-[#EAECE8] transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#10542C] text-white flex items-center justify-center text-xs font-bold">
                      {currentUser.fullName?.charAt(0) || currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-[#2C3E2E] max-w-[80px] truncate hidden sm:inline">
                      {currentUser.fullName || currentUser.username}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
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
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#10542C] border border-[#10542C]/40 hover:bg-[#10542C]/5 rounded-[8px] transition-colors cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-[#10542C]" />
                  <span className="hidden sm:inline">Đăng ký / Đăng nhập</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Search Input */}
          <form onSubmit={onSearchSubmit} className="md:hidden pb-3 relative flex items-center">
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
    </header>
  );
};
