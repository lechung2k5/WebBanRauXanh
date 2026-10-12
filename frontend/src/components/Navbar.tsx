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
      {/* 1. TOP BAR (36px, Nền #10542C, chữ trắng, font 13px) - Thu gọn khi lướt xuống */}
      <div
        className={`bg-[#10542C] text-white text-[13px] border-b border-[#0C3E20] transition-all duration-300 overflow-hidden ${
          isScrolled ? 'h-0 max-h-0 opacity-0 border-b-0' : 'h-9 max-h-9 opacity-100'
        }`}
      >
        <div className="max-w-[1240px] mx-auto px-4 h-full flex items-center justify-between">
          {/* Trái: Slogan kèm icon lá mầm */}
          <div className="flex items-center gap-2 font-medium">
            <Sprout className="w-4 h-4 text-[#8BC34A]" />
            <span className="hidden sm:inline">Rau sạch từ nông trại đến bàn ăn</span>
            <span className="text-white/60 hidden md:inline">• Giao siêu tốc 2 giờ</span>
          </div>

          {/* Phải: Bộ chọn vị trí giao hàng */}
          <div
            onClick={onOpenLocation}
            className="flex items-center gap-1.5 cursor-pointer hover:text-[#8BC34A] transition-colors py-1 group select-none"
            title="Đổi địa chỉ giao hàng"
          >
            <MapPin className="w-3.5 h-3.5 text-[#8BC34A] shrink-0" />
            <span className="text-white/80">Giao đến:</span>
            <span className="font-bold underline decoration-[#8BC34A] decoration-1 underline-offset-2 max-w-[200px] truncate">
              {currentLocation || 'TP. Hồ Chí Minh'}
            </span>
            <ChevronDown className="w-3 h-3 text-white/70 group-hover:translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (76px, tự động thu gọn còn 64px khi lướt xuống) */}
      <div className="border-b border-[#EAECE8] bg-white transition-all duration-300">
        <div className="max-w-[1240px] mx-auto px-4">
          <div
            className={`flex items-center justify-between transition-all duration-300 gap-4 ${
              isScrolled ? 'h-16' : 'h-[76px]'
            }`}
          >
            {/* Logo Thương hiệu (~20%) */}
            <div
              onClick={() => {
                onSelectCategory(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center cursor-pointer select-none group shrink-0"
            >
              <div className="relative h-12 w-44">
                <Image
                  src="/assets/logo/Logo_full.png"
                  alt="HoNa Fresh"
                  fill
                  priority
                  className="object-contain object-left group-hover:scale-102 transition-transform duration-200"
                />
              </div>
            </div>

            {/* Thanh Tìm kiếm Trung tâm (~50%) */}
            <div className="hidden md:flex flex-col flex-1 max-w-xl mx-4">
              <form onSubmit={onSearchSubmit} className="relative w-full">
                <input
                  type="text"
                  placeholder="Tìm rau củ quả tươi sạch cho bữa cơm hôm nay..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-[#F9F9F5] hover:bg-white border-[1.5px] border-[#E5E7EB] rounded-full pl-11 pr-5 h-11 text-xs text-[#2C3E2E] placeholder-[#6B7280] focus:outline-none focus:border-[#10542C] focus:bg-white transition-all shadow-2xs"
                />
                <Search className="w-4 h-4 text-[#4CAF50] absolute left-4 top-1/2 -translate-y-1/2" />
              </form>

              {/* Pill Tabs lọc nhanh ngay dưới thanh tìm kiếm (RuleLayout A.2) - Tự động ẩn khi lướt xuống */}
              <div
                className={`flex items-center gap-1.5 transition-all duration-300 overflow-hidden ${
                  isScrolled
                    ? 'max-h-0 opacity-0 mt-0 pointer-events-none'
                    : 'max-h-8 opacity-100 mt-1.5'
                }`}
              >
                {[
                  { label: 'Tất cả', id: null },
                  { label: 'Rau ăn lá', id: 1 },
                  { label: 'Củ quả', id: 2 },
                  { label: 'Nấm tươi', id: 3 },
                  { label: 'Combo ưu đãi', id: 4 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onSelectCategory(item.id)}
                    className={`text-[11px] px-2.5 py-0.5 rounded-full transition-all cursor-pointer font-bold ${
                      selectedCategory === item.id
                        ? 'bg-[#10542C] text-white shadow-2xs'
                        : 'text-[#6B7280] hover:text-[#10542C] hover:bg-[#F4F5F1]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Khối Tiện Ích & Tài Khoản (~30%) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Nút Khuyến Mãi (Hộp quà + "Ưu đãi", hover #4CAF50) */}
              <button
                type="button"
                onClick={onOpenPromo}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#2C3E2E] hover:text-[#4CAF50] hover:bg-[#F4F5F1] rounded-xl transition-colors cursor-pointer border border-[#EAECE8]"
              >
                <Gift className="w-4 h-4 text-[#FB8C00]" />
                <span className="hidden sm:inline">Ưu đãi</span>
              </button>

              {/* Nút Theo dõi đơn */}
              <button
                type="button"
                onClick={onOpenTracking}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#10542C] bg-[#F4F5F1] hover:bg-[#EAECE8] rounded-xl transition-colors cursor-pointer border border-[#EAECE8]"
              >
                <Clock className="w-4 h-4 text-[#4CAF50]" />
                <span>Tra cứu</span>
              </button>

              {/* Giỏ Hàng với Badge Tomato Red #E53935 18x18px */}
              <button
                type="button"
                onClick={onOpenCart}
                className="relative p-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer"
                aria-label="Giỏ hàng"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#E53935] text-white text-[10px] font-black w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white animate-pulse">
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
          <form onSubmit={onSearchSubmit} className="md:hidden pb-3 relative">
            <input
              type="text"
              placeholder="Tìm rau củ quả tươi sạch..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#F9F9F5] border-[1.5px] border-[#E5E7EB] rounded-full pl-10 pr-4 h-10 text-xs text-[#2C3E2E] placeholder-[#6B7280] focus:outline-none focus:border-[#10542C]"
            />
            <Search className="w-4 h-4 text-[#4CAF50] absolute left-3.5 top-1/2 -translate-y-1/2 -mt-1.5" />
          </form>
        </div>
      </div>
    </header>
  );
};
