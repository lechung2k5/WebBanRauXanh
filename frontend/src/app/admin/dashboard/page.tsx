'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getUsersApi,
  getAdminLotStatsApi,
} from '@/services/api';
import { api } from '@/services/auth';
import {
  LayoutDashboard,
  Package,
  Layers,
  Handshake,
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
    contractsCount: 0,
    usersCount: 0,
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const [userRes, lotRes, contractsRes] = await Promise.all([
        getUsersApi().catch(() => []),
        getAdminLotStatsApi().catch(() => ({ totalLots: 0, openLots: 0, pendingLots: 0, suspendedLots: 0 })),
        api<any[]>('admin/contracts').catch(() => []),
      ]);

      setStats({
        totalLots: lotRes.totalLots || 0,
        openLots: lotRes.openLots || 0,
        pendingLots: lotRes.pendingLots || 0,
        suspendedLots: lotRes.suspendedLots || 0,
        contractsCount: Array.isArray(contractsRes) ? contractsRes.length : 0,
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
            Trung tâm giám sát tổng quan lô nông sản vụ mùa B2B, tiến độ kiểm định, hợp đồng ký quỹ và tài khoản đối tác theo thời gian thực.
          </p>
        </div>
      </div>

      {/* 5 Cards Thống Kê Tổng Quan B2B */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
          href="/admin/contracts"
          className="bg-white rounded-2xl p-5 border border-[#EAECE8] shadow-xs hover:border-purple-600 hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-bold group-hover:text-purple-700 transition-colors">
              Hợp Đồng B2B
            </span>
            <Handshake className="w-4 h-4 text-purple-600" />
          </div>
          <p className="font-heading font-black text-2xl text-[#2C3E2E]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : `${stats.contractsCount} HĐ`}
          </p>
          <span className="text-[10px] text-purple-600 font-bold mt-1 block">
            Tiến trình ký quỹ & thực hiện
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : stats.usersCount}
          </p>
          <span className="text-[10px] text-[#4CAF50] font-bold mt-1 block">
            Tài khoản HTX & thương lái
          </span>
        </Link>
      </div>

      {/* Lối Tắt Quản Trị Các Phân Hệ B2B */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
        <h3 className="font-heading font-bold text-base text-[#2C3E2E] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#8BC34A]" /> Lối Tắt Quản Trị Nhanh 7 Khối Nghiệp Vụ B2B
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="p-5 rounded-2xl border border-[#EAECE8] bg-[#F9F9F5] hover:bg-[#EAF5E9]/50 hover:border-[#10542C] transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#EAF5E9] text-[#10542C] flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#2C3E2E] group-hover:text-[#10542C] transition-colors">
                Module 1: Tài Khoản & KYC Đối Tác
              </h4>
              <p className="text-xs text-[#6B7280] mt-1">
                Quản lý hồ sơ pháp lý HTX nông dân, thương lái và cấp tài khoản nhân sự nội bộ (QC, Tài xế, Kế toán).
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#10542C] mt-4">
              <span>Đến trang Tài Khoản & KYC</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/harvest-lots"
            className="p-5 rounded-2xl border border-[#EAECE8] bg-[#F9F9F5] hover:bg-[#EAF5E9]/50 hover:border-[#10542C] transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#EAF5E9] text-[#10542C] flex items-center justify-center mb-3">
                <Package className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#2C3E2E] group-hover:text-[#10542C] transition-colors">
                Module 2: Nguồn Cung Lô Nông Sản & Danh Mục
              </h4>
              <p className="text-xs text-[#6B7280] mt-1">
                Kiểm duyệt mã vùng trồng PUC, tiêu chuẩn VietGAP, bảng giá sỉ phân tầng và phân loại ngành hàng.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#10542C] mt-4">
              <span>Đến trang Lô Nông Sản</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/contracts"
            className="p-5 rounded-2xl border border-[#EAECE8] bg-[#F9F9F5] hover:bg-[#EAF5E9]/50 hover:border-[#10542C] transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#2C3E2E] group-hover:text-[#10542C] transition-colors">
                Module 3: Hợp Đồng B2B & Ký Quỹ Escrow
              </h4>
              <p className="text-xs text-[#6B7280] mt-1">
                Theo dõi tiến trình hợp đồng 7 bước, giám sát quỹ cọc 30% bảo chứng (TK 3388) và phán quyết tranh chấp.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 mt-4">
              <span>Đến trang Hợp Đồng & Ký Quỹ</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/qc"
            className="p-5 rounded-2xl border border-[#EAECE8] bg-[#F9F9F5] hover:bg-[#EAF5E9]/50 hover:border-[#10542C] transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
                <Leaf className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#2C3E2E] group-hover:text-[#10542C] transition-colors">
                Module 4: Trạm Kiểm Định QC & Kho Lạnh FEFO
              </h4>
              <p className="text-xs text-[#6B7280] mt-1">
                Giám sát buồng bảo quản tại trạm trung chuyển, nhật ký nghiệm thu Brix/độ ẩm và xuất kho FEFO.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 mt-4">
              <span>Đến trang Trạm QC & FEFO</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/iot"
            className="p-5 rounded-2xl border border-[#EAECE8] bg-[#F9F9F5] hover:bg-[#EAF5E9]/50 hover:border-[#10542C] transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#2C3E2E] group-hover:text-red-700 transition-colors">
                Module 5: Giám Sát IoT Chuỗi Lạnh & Sự Cố
              </h4>
              <p className="text-xs text-[#6B7280] mt-1">
                Biểu đồ nhiệt độ thời gian thực (2°C - 6°C), còi báo động và bảng giả lập sự cố phục vụ báo cáo.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 mt-4">
              <span>Đến trang Giám Sát IoT</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/shipments"
            className="p-5 rounded-2xl border border-[#EAECE8] bg-[#F9F9F5] hover:bg-[#EAF5E9]/50 hover:border-[#10542C] transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-3">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#2C3E2E] group-hover:text-sky-800 transition-colors">
                Module 6: Điều Phối Vận Tải Lạnh TMS & ePOD
              </h4>
              <p className="text-xs text-[#6B7280] mt-1">
                Quản lý đội xe thùng lạnh, lịch trình giao nhận và biên bản giao hàng điện tử ePOD có chữ ký số.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 mt-4">
              <span>Đến trang Vận Tải TMS</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/accounting"
            className="p-5 rounded-2xl border border-[#EAECE8] bg-[#F9F9F5] hover:bg-[#EAF5E9]/50 hover:border-[#10542C] transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#2C3E2E] group-hover:text-amber-800 transition-colors">
                Module 7: Báo Cáo Kế Toán VAS & Tham Số Sàn
              </h4>
              <p className="text-xs text-[#6B7280] mt-1">
                Xuất bảng kê thu mua 01/TNDN, hóa đơn sàn, sổ nhật ký chung và cấu hình tỷ lệ phí sàn.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 mt-4">
              <span>Đến trang Kế Toán VAS</span>
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
