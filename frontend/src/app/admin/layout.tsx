'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { getStoredUser } from '@/services/api';
import B2BNotificationBell from '@/components/B2BNotificationBell';
import { DEFAULT_OFFICIAL_HUBS, WarehouseHubDto } from '@/services/fleetDispatchApi';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Sprout,
  Handshake,
  Warehouse,
  Receipt,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Activity,
  Loader2,
  Route,
  Navigation,
  MapPin,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, authLoading, logout } = useApp();

  const [isMounted, setIsMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedHubId, setSelectedHubId] = useState<number>(2);
  const [showHubPickerModal, setShowHubPickerModal] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeUser = isMounted ? (currentUser || getStoredUser()) : null;
  const roles = activeUser?.roles || [];
  const isSuperAdmin = roles.includes('ROLE_ADMIN');
  const isWarehouseManager = !isSuperAdmin && roles.includes('ROLE_WAREHOUSE_MANAGER');
  const isAccountantOnly = !isSuperAdmin && !isWarehouseManager && roles.includes('ROLE_ACCOUNTANT');
  const basePath = pathname.startsWith('/manager') ? '/manager' : '/admin';

  useEffect(() => {
    try {
      if (isWarehouseManager && activeUser?.assignedHubId) {
        const fixedHub = Number(activeUser.assignedHubId);
        setSelectedHubId(fixedHub);
        sessionStorage.setItem('hona_admin_selected_hub_id', String(fixedHub));
        localStorage.setItem('hona_admin_selected_hub_id', String(fixedHub));
        setShowHubPickerModal(false);
        return;
      }
      if (isAccountantOnly) {
        setShowHubPickerModal(false);
        return;
      }
      const sessionHub = sessionStorage.getItem('hona_admin_selected_hub_id');
      const savedHub = localStorage.getItem('hona_admin_selected_hub_id');
      if (sessionHub) {
        setSelectedHubId(Number(sessionHub));
      } else {
        if (savedHub) setSelectedHubId(Number(savedHub));
        setShowHubPickerModal(true);
      }
    } catch {}
  }, [isWarehouseManager, isAccountantOnly, activeUser?.assignedHubId]);

  const handleSelectAdminHub = (hubId: number) => {
    setSelectedHubId(hubId);
    try {
      sessionStorage.setItem('hona_admin_selected_hub_id', String(hubId));
      localStorage.setItem('hona_admin_selected_hub_id', String(hubId));
      window.dispatchEvent(new CustomEvent('hona-admin-hub-changed', { detail: hubId }));
    } catch {}
    setShowHubPickerModal(false);
  };

  const currentAdminHub: WarehouseHubDto =
    DEFAULT_OFFICIAL_HUBS.find((h) => h.id === selectedHubId) || DEFAULT_OFFICIAL_HUBS[1];

  useEffect(() => {
    const user = currentUser || getStoredUser();
    const userRoles = user?.roles || [];
    const canAccessAdminArea =
      userRoles.includes('ROLE_ADMIN') ||
      userRoles.includes('ROLE_WAREHOUSE_MANAGER') ||
      userRoles.includes('ROLE_ACCOUNTANT');

    if (user && canAccessAdminArea) {
      if (!userRoles.includes('ROLE_ADMIN')) {
        if (userRoles.includes('ROLE_ACCOUNTANT') && !userRoles.includes('ROLE_WAREHOUSE_MANAGER')) {
          if (!pathname.startsWith('/admin/accounting')) {
            router.replace('/admin/accounting');
            return;
          }
        } else if (userRoles.includes('ROLE_WAREHOUSE_MANAGER')) {
          if (!pathname.startsWith('/manager')) {
            router.replace('/manager/dashboard');
            return;
          }
        }
      }
      setAuthChecked(true);
      return;
    }

    if (authLoading) return;

    if (!user) {
      router.replace(`/dang-nhap?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!canAccessAdminArea) {
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
  const allModules = [
    {
      id: 'dashboard',
      name: 'Tổng quan',
      href: `${basePath}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      id: 'users',
      name: 'Tài khoản & KYC',
      href: `${basePath}/users`,
      icon: Users,
    },
    {
      id: 'staff',
      name: 'Nhân viên & Tài xế',
      href: `${basePath}/staff`,
      icon: UserCog,
    },
    {
      id: 'warehouses',
      name: 'Kho hàng & Sơ đồ 3D',
      href: `${basePath}/warehouses`,
      icon: Warehouse,
    },
    {
      id: 'lots',
      name: 'Nguồn cung & danh mục',
      href: `${basePath}/harvest-lots`,
      icon: Sprout,
    },
    {
      id: 'contracts',
      name: 'Hợp đồng & ký quỹ',
      href: `${basePath}/contracts`,
      icon: Handshake,
    },
    {
      id: 'inbound-dispatch',
      name: 'Lấy hàng',
      href: `${basePath}/inbound-dispatch`,
      icon: Route,
    },
    {
      id: 'qc',
      name: 'Trạm QC & FEFO',
      href: `${basePath}/qc`,
      icon: Warehouse,
    },
    {
      id: 'outbound-dispatch',
      name: 'Giao hàng',
      href: `${basePath}/outbound-dispatch`,
      icon: Navigation,
    },
    {
      id: 'accounting',
      name: 'Kế toán & cài đặt',
      href: `${basePath}/accounting`,
      icon: Receipt,
    },
  ];

  const WAREHOUSE_MANAGER_MODULE_IDS = new Set([
    'dashboard',
    'staff',
    'warehouses',
    'contracts',
    'inbound-dispatch',
    'qc',
    'outbound-dispatch',
    'accounting',
  ]);

  const modules = isSuperAdmin
    ? allModules
    : isWarehouseManager || basePath === '/manager'
      ? allModules.filter((m) => WAREHOUSE_MANAGER_MODULE_IDS.has(m.id))
      : isAccountantOnly
        ? allModules.filter((m) => m.id === 'accounting')
        : allModules;

  const isModuleActive = (href: string) => {
    if (href === `${basePath}/dashboard`) {
      return pathname === `${basePath}/dashboard` || pathname === basePath;
    }
    if (href === `${basePath}/harvest-lots`) {
      return pathname.startsWith(`${basePath}/harvest-lots`) || pathname.startsWith(`${basePath}/categories`);
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
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/"
              className="flex-1 flex items-center justify-center py-1 transition hover:scale-[1.02]"
            >
              <img
                src="/assets/logo/Logo_full.png"
                alt="HoNa Fresh"
                className="h-14 w-auto object-contain [filter:drop-shadow(1px_0_0_#fff)_drop-shadow(-1px_0_0_#fff)_drop-shadow(0_1px_0_#fff)_drop-shadow(0_-1px_0_#fff)_drop-shadow(0_0_4px_rgba(255,255,255,0.65))]"
              />
            </Link>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              aria-label="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] font-bold tracking-wider text-emerald-300/80 uppercase mb-5 flex items-center justify-center gap-1.5 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8BC34A] shrink-0" />
            <span>{basePath === '/manager' ? 'Quản Lý Kho & Điều Hành Hub' : 'Trung Tâm Điều Hành B2B'}</span>
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
            onClick={() => {
              try { sessionStorage.removeItem('hona_admin_selected_hub_id'); } catch {}
              void logout().then(() => router.replace('/dang-nhap'));
            }}
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
                <span>{basePath === '/manager' ? 'Quản lý kho' : 'Quản trị hệ thống'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="font-bold text-[#10542C]">{currentModule.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {!isAccountantOnly && (
              <button
                type="button"
                onClick={() => {
                  if (!isWarehouseManager) setShowHubPickerModal(true);
                }}
                disabled={isWarehouseManager}
                className={`flex items-center gap-1.5 text-[11px] font-bold text-[#10542C] bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 transition ${
                  isWarehouseManager ? 'cursor-default opacity-90' : 'hover:bg-emerald-100 cursor-pointer'
                }`}
                title={isWarehouseManager ? 'Trạm được phân công quản lý' : 'Đổi kho / trạm đang quản lý'}
              >
                <Warehouse className="w-3.5 h-3.5 text-[#10542C]" />
                <span className="max-w-[180px] truncate">{currentAdminHub.hubName}</span>
              </button>
            )}

            <span className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              Sàn B2B Trực Tuyến
            </span>

            <B2BNotificationBell audience="ADMIN" tone="light" />

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#2C3E2E] hidden sm:inline">{currentUser?.fullName}</span>
              <button
                onClick={() => {
                  try { sessionStorage.removeItem('hona_admin_selected_hub_id'); } catch {}
                  void logout().then(() => router.replace('/dang-nhap'));
                }}
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

      {/* Modal Chọn Kho / Trạm Quản Lý (Bước đầu sau khi Admin đăng nhập) */}
      {authChecked && showHubPickerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#10542C] text-white flex items-center justify-center">
                  <Warehouse className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Chọn Kho / Trạm Trung Chuyển Quản Lý</h2>
                  <p className="text-xs text-slate-500">
                    Hệ thống sẽ lọc nhân sự, xe lạnh, kiểm định QC và điều phối theo đúng kho bạn chọn.
                  </p>
                </div>
              </div>
              {sessionStorage.getItem('hona_admin_selected_hub_id') && (
                <button
                  type="button"
                  onClick={() => setShowHubPickerModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEFAULT_OFFICIAL_HUBS.map((hub) => {
                const isSelected = hub.id === selectedHubId;
                return (
                  <button
                    key={hub.id}
                    type="button"
                    onClick={() => handleSelectAdminHub(hub.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'border-[#10542C] bg-emerald-50/70 ring-2 ring-[#10542C]/20'
                        : 'border-slate-200 hover:border-[#10542C]/60 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {hub.hubCode}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">{hub.region}</span>
                    </div>
                    <strong className="text-sm font-bold text-slate-900 block">{hub.hubName}</strong>
                    <p className="text-[11px] text-slate-600 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{hub.address}</span>
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
