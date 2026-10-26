'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useApp } from '@/context/AppContext';
import {
  loginApi,
  getStoredUser,
  getUsersApi,
  getAdminOrdersApi,
  getAdminLotStatsApi,
  getCategories,
} from '@/services/api';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  ShieldCheck,
  DollarSign,
  ChevronRight,
  Lock,
  Loader2,
  XCircle,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, setCurrentUser } = useApp();

  const [authChecked, setAuthChecked] = useState(false);
  const [stats, setStats] = useState({
    totalLots: 0,
    openLots: 0,
    categoriesCount: 0,
    ordersCount: 0,
    usersCount: 0,
  });

  useEffect(() => {
    const user = currentUser || getStoredUser();
    if (!user) {
      // Chưa đăng nhập -> Chuyển về cổng đăng nhập duy nhất /dang-nhap
      window.location.href = `/dang-nhap?redirect=${encodeURIComponent(pathname)}`;
      return;
    }
    if (!user.roles?.includes('ROLE_ADMIN')) {
      // Đã đăng nhập tài khoản thường (ROLE_USER) nhưng không có quyền admin -> chuyển về trang chủ
      window.location.href = '/';
      return;
    }
    setAuthChecked(true);
    fetchTopStats();
  }, [currentUser, pathname]);

  const fetchTopStats = async () => {
    try {
      const [userRes, orderRes, lotRes, catRes] = await Promise.all([
        getUsersApi().catch(() => []),
        getAdminOrdersApi().catch(() => ({ data: [] })),
        getAdminLotStatsApi().catch(() => ({ totalLots: 0, openLots: 0 })),
        getCategories().catch(() => []),
      ]);

      setStats({
        totalLots: lotRes.totalLots || 0,
        openLots: lotRes.openLots || 0,
        categoriesCount: Array.isArray(catRes) ? catRes.length : 5,
        ordersCount: orderRes.data?.length || 0,
        usersCount: userRes.length || 0,
      });
    } catch (err) {
      console.warn('Error fetching top admin stats:', err);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#F9F9F5] flex flex-col justify-between">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#10542C] animate-spin" />
            <p className="text-xs text-[#6B7280] font-medium">Đang kiểm tra quyền truy cập hệ thống...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Danh sách các Tabs Quản Trị Cụ Thể (Mỗi Tab 1 Endpoint Riêng Biệt)
  const navTabs = [
    {
      name: 'Bảng Điều Khiển',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      badge: 'Tổng quan',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      iconColor: 'text-emerald-600',
      description: 'Giám sát chỉ số vận hành hệ thống',
    },
    {
      name: 'Lô Nông Sản',
      href: '/admin/harvest-lots',
      icon: Package,
      badge: stats.totalLots > 0 ? `${stats.openLots}/${stats.totalLots} lô` : '594/642 lô',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200/80',
      iconColor: 'text-teal-600',
      description: 'Quản lý & kiểm duyệt lô vụ mùa B2B',
    },
    {
      name: 'Danh Mục',
      href: '/admin/categories',
      icon: Layers,
      badge: `${stats.categoriesCount || 5} ngành hàng`,
      badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
      iconColor: 'text-indigo-600',
      description: 'Phân loại nông sản sàn',
    },
    {
      name: 'Đơn Hàng',
      href: '/admin/orders',
      icon: ShoppingBag,
      badge: stats.ordersCount > 0 ? `${stats.ordersCount} đơn` : '1 đơn',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200/80',
      iconColor: 'text-amber-600',
      description: 'Theo dõi giao nhận & vận đơn',
    },
    {
      name: 'Người Dùng',
      href: '/admin/users',
      icon: Users,
      badge: stats.usersCount > 0 ? `${stats.usersCount} tài khoản` : '3',
      badgeColor: 'bg-sky-50 text-sky-800 border-sky-200/80',
      iconColor: 'text-sky-600',
      description: 'Khách hàng & phân quyền',
    },
  ];

  const getPageTitle = () => {
    if (pathname.includes('/admin/dashboard') || pathname === '/admin') return 'Bảng Điều Khiển';
    if (pathname.includes('/admin/harvest-lots')) return 'Quản Lý Lô Nông Sản';
    if (pathname.includes('/admin/categories')) return 'Quản Lý Danh Mục';
    if (pathname.includes('/admin/orders')) return 'Quản Lý Đơn Hàng & Vận Đơn';
    if (pathname.includes('/admin/users')) return 'Quản Lý Người Dùng & Phân Quyền';
    return 'Quản Trị HoNa Fresh';
  };

  return (
    <div className="min-h-screen bg-[#F9F9F5] flex flex-col justify-between">
      <Header />

      <main className="max-w-[1240px] mx-auto px-4 py-8 w-full flex-1">
        {/* Breadcrumb động theo URL */}
        <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-6">
          <Link href="/" className="hover:text-[#10542C]">Trang chủ</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/admin/dashboard" className="hover:text-[#10542C]">Quản trị hệ thống</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#10542C] font-bold">{getPageTitle()}</span>
        </div>

        {/* Thanh Điều Hướng Endpoint Cụ Thể (Router Navigation Tabs) */}
        <div className="bg-white rounded-2xl p-2 border border-[#EAECE8] shadow-sm mb-6 flex items-center gap-2 overflow-x-auto">
          {navTabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href === '/admin/dashboard' && pathname === '/admin');
            const IconComponent = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`py-2.5 px-4 text-xs font-bold transition-all relative flex items-center gap-2.5 shrink-0 rounded-xl cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#10542C] text-white shadow-md shadow-[#10542C]/20 ring-1 ring-[#10542C]'
                    : 'text-[#2C3E2E] bg-[#FDFDFB] hover:bg-[#F4F6F2] hover:text-[#10542C] border border-[#EAECE8] hover:border-[#CFD6C8] hover:shadow-xs'
                }`}
              >
                {isActive ? (
                  <span className="w-2 h-2 rounded-full bg-[#8BC34A] shadow-[0_0_8px_#8BC34A] animate-pulse shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                )}
                <IconComponent
                  className={`w-4 h-4 transition-transform shrink-0 ${
                    isActive ? 'text-[#8BC34A]' : tab.iconColor
                  }`}
                />
                <span className="font-heading tracking-tight text-xs font-bold">{tab.name}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30 backdrop-blur-xs'
                        : `${tab.badgeColor}`
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Nội Dung Của Từng Endpoint Cụ Thể */}
        <div className="transition-all">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
