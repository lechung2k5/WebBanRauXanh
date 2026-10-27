'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { getStoredUser } from '@/services/api';
import {
  LayoutDashboard,
  Users,
  Sprout,
  Handshake,
  Warehouse,
  Thermometer,
  Truck,
  Receipt,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Activity,
  Loader2,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, authLoading, logout } = useApp();

  const [authChecked, setAuthChecked] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    const user = currentUser || getStoredUser();
    if (!user) {
      router.replace(`/dang-nhap?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!user.roles?.includes('ROLE_ADMIN')) {
      router.replace('/');
      return;
    }
    setAuthChecked(true);
  }, [currentUser, authLoading, pathname, router]);

  // Đóng menu mobile khi chuyển trang
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // 8 Modules chuẩn hóa theo B2B Console Sidebar
  const modules = [
    {
      id: 'dashboard',
      name: 'Tổng quan',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'users',
      name: 'Tài khoản & KYC',
      href: '/admin/users',
      icon: Users,
    },
    {
      id: 'lots',
      name: 'Nguồn cung & danh mục',
      href: '/admin/harvest-lots',
      icon: Sprout,
    },
    {
      id: 'contracts',
      name: 'Hợp đồng & ký quỹ',
      href: '/admin/contracts',
      icon: Handshake,
    },
    {
      id: 'qc',
      name: 'Trạm QC & FEFO',
      href: '/admin/qc',
      icon: Warehouse,
    },
    {
      id: 'iot',
      name: 'Giám sát chuỗi lạnh',
      href: '/admin/iot',
      icon: Thermometer,
    },
    {
      id: 'shipments',
      name: 'Vận tải & ePOD',
      href: '/admin/shipments',
      icon: Truck,
    },
    {
      id: 'accounting',
      name: 'Kế toán & cài đặt',
      href: '/admin/accounting',
      icon: Receipt,
    },
  ];

  const isModuleActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard' || pathname === '/admin';
    }
    if (href === '/admin/harvest-lots') {
      return pathname.startsWith('/admin/harvest-lots') || pathname.startsWith('/admin/categories');
    }
    return pathname.startsWith(href);
  };

  const currentModule = modules.find((m) => isModuleActive(m.href)) || modules[0];

  return (
    <div className="min-h-screen bg-[#F5F6F2] text-[#243A2A] flex flex-col lg:flex-row">
      {/* Backdrop trên Mobile khi mở menu */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Dọc Bên Trái Chuẩn B2B Console */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-[#123E2B] text-white p-5 z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo & Header Sidebar */}
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="font-heading font-black text-2xl tracking-tight text-white flex items-center gap-1.5">
              <span>HoNa</span>
              <span className="text-[#8BC34A]">Fresh</span>
            </Link>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              aria-label="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] font-bold tracking-wider text-emerald-300/80 uppercase mb-6 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8BC34A]" />
            <span>Trung Tâm Điều Hành B2B</span>
          </p>

          {/* Danh Sách 8 Modules Dọc (Chuẩn B2B Console) */}
          <nav className="space-y-1">
            {modules.map((item) => {
              const active = isModuleActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-white/15 text-white shadow-xs border-l-4 border-[#8BC34A]'
                      : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#8BC34A]' : 'text-emerald-300/70'}`} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar: Chỉ giữ nút Đăng xuất */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-emerald-200/80 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
          >
            <span>← Xem sàn giao dịch</span>
          </Link>

          <button
            type="button"
            onClick={() => void logout().then(() => router.replace('/dang-nhap'))}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-rose-500/20 text-emerald-100 hover:text-rose-300 text-xs font-bold transition-all cursor-pointer border border-white/5 hover:border-rose-500/30"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Vùng Nội Dung Chính Bên Phải */}
      <div className="lg:ml-64 flex-1 flex flex-col min-w-0">
        {/* Top Header Thanh Tiêu Đề Admin */}
        <header className="bg-white border-b border-[#EAECE8] px-4 sm:px-8 py-3.5 flex justify-between items-center sticky top-0 z-30 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100"
              aria-label="Mở menu quản trị"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                <span>Quản trị hệ thống</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="font-bold text-[#10542C]">{currentModule.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              Sàn B2B Trực Tuyến
            </span>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#2C3E2E] hidden sm:inline">{currentUser?.fullName}</span>
              <button
                onClick={() => void logout().then(() => router.replace('/dang-nhap'))}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </header>

        {/* Nội dung Module Đang Chọn */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          {!authChecked ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 bg-white/70 rounded-3xl border border-[#EAECE8]">
              <Loader2 className="w-8 h-8 text-[#10542C] animate-spin" />
              <p className="text-xs text-[#6B7280] font-medium">Đang kiểm tra quyền truy cập hệ thống...</p>
              <div className="hidden" aria-hidden="true">
                {children}
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
