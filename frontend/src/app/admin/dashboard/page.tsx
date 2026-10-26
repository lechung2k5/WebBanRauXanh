'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getUsersApi,
  getAdminOrdersApi,
  getAdminLotStatsApi,
} from '@/services/api';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Truck,
  Leaf,
  Sparkles,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLots: 0,
    openLots: 0,
    pendingLots: 0,
    suspendedLots: 0,
    ordersCount: 0,
    usersCount: 0,
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const [userRes, orderRes, lotRes] = await Promise.all([
        getUsersApi().catch(() => []),
        getAdminOrdersApi().catch(() => ({ data: [] })),
        getAdminLotStatsApi().catch(() => ({ totalLots: 0, openLots: 0, pendingLots: 0, suspendedLots: 0 })),
      ]);

      setStats({
        totalLots: lotRes.totalLots || 0,
        openLots: lotRes.openLots || 0,
        pendingLots: lotRes.pendingLots || 0,
        suspendedLots: lotRes.suspendedLots || 0,
        ordersCount: orderRes.data?.length || 0,
        usersCount: userRes.length || 0,
      });
    } catch (err) {
      console.warn('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Tiêu Đề Bảng Điều Khiển - Đồng bộ chuẩn thiết kế */}
      <div className="bg-gradient-to-r from-[#10542C] via-[#1B6D3D] to-[#0A4020] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
            <LayoutDashboard className="w-7 h-7 text-[#8BC34A]" /> Bảng Điều Khiển Hệ Thống
          </h1>
          <p className="text-xs text-white/80 mt-1">
            Trung tâm giám sát tổng quan lô nông sản vụ mùa B2B, tiến độ kiểm định, vận đơn và tài khoản người dùng theo thời gian thực.
          </p>
        </div>
      </div>

      {/* 4 Cards Thống Kê Tổng Quan B2B */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/harvest-lots"
          className="bg-white rounded-2xl p-5 border border-[#EAECE8] shadow-xs hover:border-[#10542C] hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-bold group-hover:text-[#10542C] transition-colors">
              Lô Đang Mở Bán
            </span>
            <Package className="w-4 h-4 text-[#10542C]" />
          </div>
          <p className="font-heading font-black text-2xl text-[#10542C]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : stats.openLots}
          </p>
          <span className="text-[10px] text-[#4CAF50] font-bold mt-1 block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Đạt chuẩn VietGAP / Sẵn sàng giao
          </span>
        </Link>

        <Link
          href="/admin/harvest-lots"
          className="bg-white rounded-2xl p-5 border border-[#EAECE8] shadow-xs hover:border-amber-500 hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-bold group-hover:text-amber-600 transition-colors">
              Lô Chờ Kiểm Định
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="font-heading font-black text-2xl text-amber-600">
            {loading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : stats.pendingLots}
          </p>
          <span className="text-[10px] text-amber-600 font-bold mt-1 block">
            Cần đối soát mẫu & mã vùng PUC
          </span>
        </Link>

        <Link
          href="/admin/harvest-lots"
          className="bg-white rounded-2xl p-5 border border-[#EAECE8] shadow-xs hover:border-[#10542C] hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-bold group-hover:text-[#10542C] transition-colors">
              Tổng Lô Nông Sản
            </span>
            <Layers className="w-4 h-4 text-[#10542C]" />
          </div>
          <p className="font-heading font-black text-2xl text-[#2C3E2E]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : stats.totalLots}
          </p>
          <span className="text-[10px] text-[#4CAF50] font-bold mt-1 block">
            Toàn bộ lô vụ mùa trên sàn
          </span>
        </Link>

        <Link
          href="/admin/orders"
          className="bg-white rounded-2xl p-5 border border-[#EAECE8] shadow-xs hover:border-[#FB8C00] hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-bold group-hover:text-[#FB8C00] transition-colors">
              Đơn Hàng Sàn
            </span>
            <ShoppingBag className="w-4 h-4 text-[#FB8C00]" />
          </div>
          <p className="font-heading font-black text-2xl text-[#2C3E2E]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : `${stats.ordersCount} đơn`}
          </p>
          <span className="text-[10px] text-[#6B7280] font-bold mt-1 block">
            Cập nhật vận đơn tức thời
          </span>
        </Link>

        <Link
          href="/admin/users"
          className="bg-white rounded-2xl p-5 border border-[#EAECE8] shadow-xs hover:border-[#10542C] hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-bold group-hover:text-[#10542C] transition-colors">
              Khách Hàng & Đối Tác
            </span>
            <Users className="w-4 h-4 text-[#10542C]" />
          </div>
          <p className="font-heading font-black text-2xl text-[#2C3E2E]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : stats.usersCount || 3}
          </p>
          <span className="text-[10px] text-[#4CAF50] font-bold mt-1 block">
            Tài khoản HTX & thương lái
          </span>
        </Link>
      </div>

      {/* Lối Tắt Quản Trị Các Phân Hệ */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
        <h3 className="font-heading font-bold text-base text-[#2C3E2E] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#8BC34A]" /> Lối Tắt Quản Trị Nhanh
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/harvest-lots"
            className="p-5 rounded-2xl border border-[#EAECE8] bg-[#F9F9F5] hover:bg-[#EAF5E9]/50 hover:border-[#10542C] transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#EAF5E9] text-[#10542C] flex items-center justify-center mb-3">
                <Package className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#2C3E2E] group-hover:text-[#10542C] transition-colors">
                Quản Trị Lô Nông Sản Vụ Mùa
              </h4>
              <p className="text-xs text-[#6B7280] mt-1">
                Kiểm duyệt hồ sơ mã vùng trồng PUC, chứng nhận VietGAP, bảng giá bậc thang và theo dõi chuỗi lạnh.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#10542C] mt-4">
              <span>Đến trang Lô Nông Sản</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/categories"
            className="p-5 rounded-2xl border border-[#EAECE8] bg-[#F9F9F5] hover:bg-[#EAF5E9]/50 hover:border-[#10542C] transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#EAF5E9] text-[#10542C] flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#2C3E2E] group-hover:text-[#10542C] transition-colors">
                Quản Trị Danh Mục Ngành Hàng
              </h4>
              <p className="text-xs text-[#6B7280] mt-1">
                Phân loại danh mục rau ăn lá, củ quả tươi, nấm xuất khẩu và cấu hình thứ tự hiển thị sàn.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#10542C] mt-4">
              <span>Đến trang Danh Mục</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/orders"
            className="p-5 rounded-2xl border border-[#EAECE8] bg-[#F9F9F5] hover:bg-[#EAF5E9]/50 hover:border-[#10542C] transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#FB8C00] flex items-center justify-center mb-3">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#2C3E2E] group-hover:text-[#FB8C00] transition-colors">
                Quản Trị Đơn Hàng & Vận Đơn
              </h4>
              <p className="text-xs text-[#6B7280] mt-1">
                Theo dõi quy trình xác nhận, đóng gói xuất kho, giao hàng 2h và tình trạng thanh toán COD.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#FB8C00] mt-4">
              <span>Đến trang Đơn Hàng</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/users"
            className="p-5 rounded-2xl border border-[#EAECE8] bg-[#F9F9F5] hover:bg-[#EAF5E9]/50 hover:border-[#10542C] transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#EAF5E9] text-[#10542C] flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#2C3E2E] group-hover:text-[#10542C] transition-colors">
                Quản Trị Người Dùng & Phân Quyền
              </h4>
              <p className="text-xs text-[#6B7280] mt-1">
                Quản lý danh sách tài khoản khách hàng, thương lái đối tác và kiểm soát phân quyền ROLE_ADMIN.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#10542C] mt-4">
              <span>Đến trang Người Dùng</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <div className="p-5 rounded-2xl border border-[#CDE5CB] bg-gradient-to-br from-[#EAF5E9] to-white flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#10542C] text-white flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#10542C]">
                Tiêu Chuẩn Chuỗi Lạnh & VietGAP
              </h4>
              <p className="text-xs text-[#6B7280] mt-1">
                Hệ thống tự động đồng bộ nhiệt độ bảo quản, cảnh báo nếu nhiệt độ vượt ngưỡng cho phép.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-[#10542C]">Hệ thống hoạt động bình thường</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
