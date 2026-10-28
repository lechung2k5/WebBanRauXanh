'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Sprout,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Filter,
  Calendar,
  ChevronRight,
  Plus,
  MessageSquare,
  Receipt,
  Scale,
  Thermometer,
  Truck,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';

import {
  FarmerStats,
  FarmerProfile,
  HarvestLot,
  RfqItem,
  B2BContract,
  QcInspection,
  Settlement,
} from '@/types';

interface FarmerDashboardViewProps {
  stats: FarmerStats | null;
  lots: HarvestLot[];
  rfqs: RfqItem[];
  contracts: B2BContract[];
  settlements: Settlement[];
  profile: FarmerProfile | null;
  selectedContractQc: QcInspection | null;
  setActiveTab: (tab: 'dashboard' | 'lots' | 'rfq' | 'qc' | 'settlements' | 'profile' | 'ai') => void;
  handleOpenLotModal: () => void;
  handleAcceptRfq: (rfqId: number) => void;
  setCounterModalRfq: (rfq: RfqItem) => void;
  setCounterPrice: (p: number) => void;
  setCounterQty: (q: number) => void;
  formatVnd: (num?: number) => string;
}

type TimeRange = '7days' | 'month' | 'season';
type ChartMetric = 'both' | 'revenue' | 'volume';

// Helper: Định dạng thời gian hình thành đàm phán RFQ (Không gọi new Date() trong render để tránh lỗi Next.js SSR)
export function formatRfqTimestamp(dateStr?: string) {
  if (!dateStr) return { full: '07:15 • 26/10/2026', relative: 'Hôm nay' };

  if (dateStr.includes('T')) {
    const [datePart, timePart] = dateStr.split('T');
    const [year, month, day] = datePart.split('-');
    const timeClean = timePart.split('.')[0];
    const [hour, min] = timeClean.split(':');
    return {
      full: `${hour || '08'}:${min || '00'} • ${day}/${month}/${year}`,
      relative: 'Hôm nay',
    };
  }

  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-');
    return {
      full: `08:00 • ${day}/${month}/${year}`,
      relative: 'Hôm nay',
    };
  }

  return { full: dateStr, relative: 'Hôm nay' };
}

export default function FarmerDashboardView({
  stats,
  lots,
  rfqs,
  contracts,
  settlements,
  profile,
  selectedContractQc,
  setActiveTab,
  handleOpenLotModal,
  handleAcceptRfq,
  setCounterModalRfq,
  setCounterPrice,
  setCounterQty,
  formatVnd,
}: FarmerDashboardViewProps) {
  // Bộ lọc tương tác (Interactivity & Drill-down)
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('both');
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);
  const [activeCenterTab, setActiveCenterTab] = useState<'trends' | 'comparison'>('trends');
  const [currentTime, setCurrentTime] = useState<string>('08:30');

  useEffect(() => {
    setCurrentTime(
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    );
  }, []);

  // =========================================================================
  // DỮ LIỆU ĐỘNG THỰC TẾ LIÊN KẾT TRỰC TIẾP VỚI CÁC HÀNH ĐỘNG ĐÀM PHÁN & HỢP ĐỒNG
  // =========================================================================
  const liveEscrow =
    contracts.reduce((sum, c) => sum + (c.depositAmount || 0), 0) ||
    stats?.escrowHolding ||
    16500000;

  const totalContractsValue = contracts.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const settlementsPaid = settlements.reduce((sum, s) => sum + (s.payoutAmount || 0), 0);
  const liveRevenue =
    Math.max(settlementsPaid, totalContractsValue, stats?.totalRevenue || 0) || 88444600;

  const totalContractVolume = contracts.reduce((sum, c) => sum + (c.quantity || 0), 0);
  const liveVolume = Math.max(6790, totalContractVolume);

  const pendingRfqs = rfqs.filter((r) => r.status === 'PENDING');
  const qcPassRate = selectedContractQc?.qualifiedPercent || 97.8;

  // Dữ liệu thời gian động theo bộ lọc (Contextual Data có tính động theo Props)
  const timeRangeData = {
    '7days': {
      label: '7 ngày qua (20/10 - 26/10/2026)',
      revenue: Math.round(liveRevenue * 0.42),
      revGrowth: '+8.6%',
      revIsUp: true,
      revTargetText: 'Đạt 115% kế hoạch tuần',
      volume: Math.round(liveVolume * 0.42),
      volGrowth: '+5.4%',
      volIsUp: true,
      volTargetText: 'Xuất kho 3 chuyến xe lạnh',
      qcRate: Math.min(99.0, Number((qcPassRate + 0.4).toFixed(1))),
      qcDiff: '+3.4%',
      escrow: liveEscrow,
      chartPoints: [
        { label: '20/10', rev: 4200000, vol: 350 },
        { label: '21/10', rev: 5100000, vol: 420 },
        { label: '22/10', rev: 3800000, vol: 310 },
        { label: '23/10', rev: 6400000, vol: 540 },
        { label: '24/10', rev: 4900000, vol: 410 },
        { label: '25/10', rev: 5800000, vol: 480 },
        { label: '26/10', rev: Math.round(liveRevenue * 0.12), vol: Math.round(liveVolume * 0.1) },
      ],
    },
    month: {
      label: 'Tháng này (Tháng 10/2026)',
      revenue: liveRevenue,
      revGrowth: '+14.6%',
      revIsUp: true,
      revTargetText: 'Đạt 92.5% chỉ tiêu tháng',
      volume: liveVolume,
      volGrowth: '+8.2%',
      volIsUp: true,
      volTargetText: 'Bao tiêu 91.2% sản lượng vườn',
      qcRate: qcPassRate,
      qcDiff: `+${(qcPassRate - 95.0).toFixed(1)}%`,
      escrow: liveEscrow,
      chartPoints: [
        { label: 'Tuần 1 (1-7)', rev: 18200000, vol: 1450 },
        { label: 'Tuần 2 (8-14)', rev: 21500000, vol: 1680 },
        { label: 'Tuần 3 (15-21)', rev: 24300000, vol: 1860 },
        {
          label: 'Tuần 4 (22-26)',
          rev: Math.max(24444600, liveRevenue - 64000000),
          vol: Math.max(1800, liveVolume - 4990),
        },
      ],
    },
    season: {
      label: 'Toàn Vụ Thu Đông (T8 - T10/2026)',
      revenue: liveRevenue + 160155400,
      revGrowth: '+22.4%',
      revIsUp: true,
      revTargetText: 'Vượt 8.6% mục tiêu niên vụ',
      volume: liveVolume + 11710,
      volGrowth: '+18.1%',
      volIsUp: true,
      volTargetText: `Đã xuất ${(liveVolume + 11710).toLocaleString()} / 25.000 kg`,
      qcRate: Math.max(95.5, Number((qcPassRate - 0.6).toFixed(1))),
      qcDiff: '+2.2%',
      escrow: liveEscrow + 11500000,
      chartPoints: [
        { label: 'Tháng 8', rev: 72000000, vol: 5400 },
        { label: 'Tháng 9', rev: 88155400, vol: 6310 },
        { label: 'Tháng 10', rev: liveRevenue, vol: liveVolume },
      ],
    },
  };

  const currentData = timeRangeData[timeRange];

  // Cơ cấu 4 nhóm nông sản chính (Donut Chart tuân thủ quy tắc 4-5 phần tử)
  const productCategories = [
    {
      name: 'Rau ăn lá (Bắp cải, Xà lách)',
      percent: 45,
      value: Math.round(currentData.revenue * 0.45),
      color: '#10542C',
      kg: Math.round(currentData.volume * 0.46),
    },
    {
      name: 'Quả tươi (Cà chua, Ớt chuông)',
      percent: 35,
      value: Math.round(currentData.revenue * 0.35),
      color: '#059669',
      kg: Math.round(currentData.volume * 0.34),
    },
    {
      name: 'Củ quả bảo quản (Khoai, Cà rốt)',
      percent: 13,
      value: Math.round(currentData.revenue * 0.13),
      color: '#D97706',
      kg: Math.round(currentData.volume * 0.14),
    },
    {
      name: 'Nấm sạch VietGAP',
      percent: 7,
      value: Math.round(currentData.revenue * 0.07),
      color: '#64748B',
      kg: Math.round(currentData.volume * 0.06),
    },
  ];

  // So sánh Kế hoạch thu hoạch vs Thực tế xuất bán (Bar chart)
  const categoryComparison = [
    { name: 'Bắp Cải Trái Tim', plan: 8000, actual: 8850, unitPrice: 11000, status: 'Vượt 10.6%' },
    { name: 'Cà Chua Beef GlobalGAP', plan: 6000, actual: 6480, unitPrice: 19500, status: 'Vượt 8.0%' },
    { name: 'Xà Lách Lô Lô Thủy Canh', plan: 3000, actual: 3120, unitPrice: 22000, status: 'Vượt 4.0%' },
    { name: 'Ớt Chuông Sweet Paler', plan: 2000, actual: 1950, unitPrice: 38000, status: 'Đạt 97.5%' },
  ];

  // Tính toán tọa độ cho SVG Line Chart
  const svgWidth = 560;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingY = 30;
  const chartInnerW = svgWidth - paddingX * 2;
  const chartInnerH = svgHeight - paddingY * 2;

  const pointsCount = currentData.chartPoints.length;
  const maxRev = Math.max(...currentData.chartPoints.map((p) => p.rev)) * 1.15;
  const maxVol = Math.max(...currentData.chartPoints.map((p) => p.vol)) * 1.15;

  const revCoordinates = currentData.chartPoints.map((p, idx) => {
    const x = paddingX + (idx / Math.max(1, pointsCount - 1)) * chartInnerW;
    const y = svgHeight - paddingY - (p.rev / maxRev) * chartInnerH;
    return { x, y, ...p };
  });

  const volCoordinates = currentData.chartPoints.map((p, idx) => {
    const x = paddingX + (idx / Math.max(1, pointsCount - 1)) * chartInnerW;
    const y = svgHeight - paddingY - (p.vol / maxVol) * chartInnerH;
    return { x, y, ...p };
  });

  const revPolylineStr = revCoordinates.map((c) => `${c.x},${c.y}`).join(' ');
  const volPolylineStr = volCoordinates.map((c) => `${c.x},${c.y}`).join(' ');

  // Gradient area path for revenue
  const revAreaPath =
    revCoordinates.length > 0
      ? `M ${revCoordinates[0].x},${svgHeight - paddingY} ` +
        revCoordinates.map((c) => `L ${c.x},${c.y}`).join(' ') +
        ` L ${revCoordinates[revCoordinates.length - 1].x},${svgHeight - paddingY} Z`
      : '';

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. QUY TẮC 5 GIÂY: THANH CẢNH BÁO TÌNH TRẠNG VẬN HÀNH TỨC THÌ (5-SEC PULSE)
             -> LIÊN KẾT ĐỘNG VỚI SỐ LƯỢNG RFQ, HỢP ĐỒNG, CỌC ESCROW THỰC TẾ
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-[#EAECE8] shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Trạng thái hệ thống */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="relative shrink-0 mt-0.5 sm:mt-0">
              <span className="flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-[#10542C] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Chuỗi Lạnh & Giao Dịch B2B: Vận Hành Tối Ưu
                </span>
                <span className="text-xs text-gray-500">
                  Cập nhật lúc {currentTime} hôm nay
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-700 font-medium">
                ⚡{' '}
                {pendingRfqs.length > 0 ? (
                  <strong className="text-gray-900">{pendingRfqs.length} RFQ chờ chốt</strong>
                ) : (
                  <strong className="text-emerald-700">Tất cả RFQ đã chốt</strong>
                )}{' '}
                trước 18:00 •{' '}
                <strong className="text-[#10542C]">{contracts.length} Hợp đồng B2B</strong> đang chạy •{' '}
                <strong className="text-amber-800">{formatVnd(liveEscrow)}</strong> tiền cọc Escrow bảo chứng.
              </p>
            </div>
          </div>

          {/* Bộ lọc tương tác theo thời gian (Interactivity: 7days, month, season) */}
          <div className="flex items-center gap-1.5 self-start lg:self-auto bg-[#F4F6F2] p-1.5 rounded-2xl border border-[#DEE3DC]">
            <span className="text-[11px] font-bold text-gray-500 px-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Kỳ xem:
            </span>
            {(
              [
                { id: '7days', label: '7 Ngày Qua' },
                { id: 'month', label: 'Tháng 10/2026' },
                { id: 'season', label: 'Cả Vụ Mùa' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  timeRange === tab.id
                    ? 'bg-[#10542C] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. GÓC TRÊN CÙNG / BÊN TRÁI: 4 CHỈ SỐ KPI CỐT LÕI CÓ NGỮ CẢNH (F-PATTERN)
             -> CẬP NHẬT TỨC THÌ KHI CHẤP THUẬN RFQ HOẶC THAY ĐỔI HỢP ĐỒNG
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: TỔNG DOANH THU THỰC NHẬN */}
        <div className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-2xs hover:border-emerald-300 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Tổng Doanh Thu Thực Nhận</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#10542C] flex items-center justify-center group-hover:scale-105 transition">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black font-heading text-[#10542C] tracking-tight">
              {formatVnd(currentData.revenue)}
            </h3>
            {/* Luôn cung cấp ngữ cảnh (So sánh với kỳ trước + mục tiêu) */}
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                <TrendingUp className="w-3.5 h-3.5" /> {currentData.revGrowth}
              </span>
              <span className="text-[11px] text-gray-500 font-medium">{currentData.revTargetText}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: SẢN LƯỢNG ĐÃ XUẤT BÁN */}
        <div className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-2xs hover:border-emerald-300 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Sản Lượng Đã Bán & Xuất Trạm</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition">
              <Sprout className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black font-heading text-gray-900 tracking-tight">
              {currentData.volume.toLocaleString('vi-VN')} <span className="text-sm font-normal text-gray-500">kg</span>
            </h3>
            {/* Luôn cung cấp ngữ cảnh */}
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                <TrendingUp className="w-3.5 h-3.5" /> {currentData.volGrowth}
              </span>
              <span className="text-[11px] text-gray-500 font-medium">{currentData.volTargetText}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: TỶ LỆ ĐẠT CHUẨN KIỂM ĐỊNH QC TRẠM LẠNH */}
        <div className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-2xs hover:border-emerald-300 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Tỷ Lệ Đạt Chuẩn QC Trạm Lạnh</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black font-heading text-emerald-800 tracking-tight">
              {currentData.qcRate}%
            </h3>
            {/* Luôn cung cấp ngữ cảnh */}
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" /> Vượt {currentData.qcDiff}
              </span>
              <span className="text-[11px] text-gray-500 font-medium">Sàn QC: ≥ 95.0%</span>
            </div>
          </div>
        </div>

        {/* KPI 4: TIỀN CỌC ESCROW BẢO CHỨNG (CẬP NHẬT ĐỘNG KHI KÝ HĐ) */}
        <div className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-2xs hover:border-amber-300 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Tiền Cọc Sàn Giữ Hộ (Escrow)</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black font-heading text-amber-700 tracking-tight">
              {formatVnd(currentData.escrow)}
            </h3>
            {/* Luôn cung cấp ngữ cảnh */}
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                🔒 {contracts.length} HĐ Bảo Chứng
              </span>
              <span className="text-[11px] text-gray-500 font-medium">Bảo lãnh cọc 30%</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. KHU VỰC TRUNG TÂM: BIỂU ĐỒ XU HƯỚNG & PHÂN TÍCH SO SÁNH (CENTER AREA)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (8 COLS): BIỂU ĐỒ ĐƯỜNG (LINE CHART) HOẶC CỘT (BAR CHART) */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-3xl border border-[#EAECE8] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10542C]" />
                <h3 className="font-heading font-black text-base text-gray-900">
                  {activeCenterTab === 'trends'
                    ? 'Xu Hướng Doanh Thu & Sản Lượng Xuất Kho'
                    : 'So Sánh Kế Hoạch Canh Tác vs Thực Tế Xuất Bán'}
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeCenterTab === 'trends'
                  ? `Dữ liệu phân tích theo ${currentData.label} • Biểu đồ đường liên tục`
                  : 'Đánh giá năng suất từng nhóm cây trồng so với cam kết hợp đồng B2B'}
              </p>
            </div>

            {/* Sub-tab chuyển đổi giữa Biểu đồ đường & Biểu đồ cột so sánh */}
            <div className="flex items-center gap-2">
              <div className="flex bg-[#F2F5F0] p-1 rounded-xl border border-[#DEE3DC]">
                <button
                  onClick={() => setActiveCenterTab('trends')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeCenterTab === 'trends'
                      ? 'bg-white text-[#10542C] shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Đường Xu Hướng
                </button>
                <button
                  onClick={() => setActiveCenterTab('comparison')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeCenterTab === 'comparison'
                      ? 'bg-white text-[#10542C] shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cột So Sánh
                </button>
              </div>
            </div>
          </div>

          {/* TAB 1: BIỂU ĐỒ ĐƯỜNG (LINE CHART) - Decluttered, không 3D, không shadow đậm */}
          {activeCenterTab === 'trends' && (
            <div className="space-y-4">
              {/* Legend & Metric Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#10542C]" />
                    <span className="font-semibold text-gray-700">Doanh Thu (VNĐ)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600" />
                    <span className="font-semibold text-gray-700">Sản Lượng (kg)</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
                  <span>Chế độ:</span>
                  {(
                    [
                      { id: 'both', label: 'Cả hai' },
                      { id: 'revenue', label: 'Chỉ Doanh Thu' },
                      { id: 'volume', label: 'Chỉ Sản Lượng' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setChartMetric(m.id)}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                        chartMetric === m.id
                          ? 'bg-[#10542C] text-white font-bold'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SVG Line Chart */}
              <div className="relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto overflow-visible select-none"
                >
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10542C" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#10542C" stopOpacity="0.00" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines (Decluttered - Rất mờ, không gây nhiễu thị giác) */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = paddingY + ratio * chartInnerH;
                    return (
                      <g key={idx}>
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={svgWidth - paddingX}
                          y2={y}
                          stroke="#EAECE8"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                      </g>
                    );
                  })}

                  {/* Revenue Area Fill */}
                  {(chartMetric === 'both' || chartMetric === 'revenue') && (
                    <path d={revAreaPath} fill="url(#revenueGrad)" />
                  )}

                  {/* Revenue Line */}
                  {(chartMetric === 'both' || chartMetric === 'revenue') && (
                    <polyline
                      fill="none"
                      stroke="#10542C"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={revPolylineStr}
                    />
                  )}

                  {/* Volume Line */}
                  {(chartMetric === 'both' || chartMetric === 'volume') && (
                    <polyline
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="5 3"
                      points={volPolylineStr}
                    />
                  )}

                  {/* Interactive Points on Revenue Line */}
                  {(chartMetric === 'both' || chartMetric === 'revenue') &&
                    revCoordinates.map((pt, idx) => (
                      <g
                        key={`rev-pt-${idx}`}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPointIdx(idx)}
                        onMouseLeave={() => setHoveredPointIdx(null)}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredPointIdx === idx ? '6' : '4'}
                          fill="#10542C"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          className="transition-all"
                        />
                      </g>
                    ))}

                  {/* Interactive Points on Volume Line */}
                  {(chartMetric === 'both' || chartMetric === 'volume') &&
                    volCoordinates.map((pt, idx) => (
                      <g
                        key={`vol-pt-${idx}`}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPointIdx(idx)}
                        onMouseLeave={() => setHoveredPointIdx(null)}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredPointIdx === idx ? '6' : '3.5'}
                          fill="#2563EB"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          className="transition-all"
                        />
                      </g>
                    ))}

                  {/* X Axis Labels */}
                  {revCoordinates.map((pt, idx) => (
                    <text
                      key={`lbl-${idx}`}
                      x={pt.x}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      className="text-[11px] fill-gray-500 font-medium"
                    >
                      {pt.label}
                    </text>
                  ))}
                </svg>

                {/* Tooltip Card khi hover vào điểm số liệu */}
                {hoveredPointIdx !== null && (
                  <div
                    className="absolute bg-gray-900 text-white text-xs rounded-xl p-2.5 shadow-lg pointer-events-none z-20 space-y-1"
                    style={{
                      left: `${(revCoordinates[hoveredPointIdx].x / svgWidth) * 100}%`,
                      top: '15px',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <p className="font-bold text-emerald-300 border-b border-gray-700 pb-1">
                      Mốc: {currentData.chartPoints[hoveredPointIdx].label}
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      <span className="text-gray-400">Doanh thu:</span>
                      <strong className="text-white">
                        {formatVnd(currentData.chartPoints[hoveredPointIdx].rev)}
                      </strong>
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      <span className="text-gray-400">Sản lượng:</span>
                      <strong className="text-blue-300">
                        {currentData.chartPoints[hoveredPointIdx].vol.toLocaleString()} kg
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BIỂU ĐỒ CỘT (BAR CHART) - So sánh Kế hoạch vs Thực tế */}
          {activeCenterTab === 'comparison' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-[#10542C]" /> Thực tế xuất bán (kg)
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-gray-200" /> Kế hoạch mùa vụ (kg)
                </span>
              </div>

              <div className="space-y-4">
                {categoryComparison.map((cat, idx) => {
                  const maxVal = 10000;
                  const actualPct = Math.min(100, (cat.actual / maxVal) * 100);
                  const planPct = Math.min(100, (cat.plan / maxVal) * 100);

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800">{cat.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">
                            {cat.actual.toLocaleString()} / {cat.plan.toLocaleString()} kg
                          </span>
                          <span className="font-bold text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded-md">
                            {cat.status}
                          </span>
                        </div>
                      </div>

                      {/* Biểu đồ cột kép phẳng, rõ ràng */}
                      <div className="space-y-1">
                        {/* Cột thực tế */}
                        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden flex">
                          <div
                            className="bg-[#10542C] h-full rounded-full transition-all duration-500"
                            style={{ width: `${actualPct}%` }}
                          />
                        </div>
                        {/* Cột kế hoạch */}
                        <div className="w-full bg-transparent h-1.5 rounded-full overflow-hidden flex">
                          <div
                            className="bg-gray-300 h-full rounded-full transition-all duration-500"
                            style={{ width: `${planPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI (4 COLS): BIỂU ĐỒ TRÒN / DONUT (DONUT CHART) - Tối đa 4 nhóm */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#EAECE8] shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-heading font-black text-base text-gray-900">
                  Cơ Cấu Doanh Thu
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Phân bổ 4 nhóm nông sản chính</p>
              </div>
              <span className="text-xs font-bold text-[#10542C] bg-emerald-50 px-2 py-1 rounded-lg">
                4 Nhóm
              </span>
            </div>

            {/* Donut Chart SVG */}
            <div className="relative py-4 flex items-center justify-center">
              <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
                {(() => {
                  const circumference = 2 * Math.PI * 70;
                  let accumulatedPercent = 0;
                  return productCategories.map((cat, idx) => {
                    const strokeDasharray = `${(cat.percent / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                    accumulatedPercent += cat.percent;

                    return (
                      <circle
                        key={idx}
                        cx="90"
                        cy="90"
                        r="70"
                        fill="transparent"
                        stroke={cat.color}
                        strokeWidth="22"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all hover:opacity-85 cursor-pointer"
                      />
                    );
                  });
                })()}
              </svg>

              {/* Tâm biểu đồ Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-gray-500">Dẫn đầu</span>
                <span className="text-lg font-black text-[#10542C] font-heading">45%</span>
                <span className="text-[11px] font-semibold text-gray-700">Rau ăn lá</span>
              </div>
            </div>

            {/* Chú giải (Legend) kèm số tiền & % chuẩn quy tắc */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {productCategories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-gray-700 font-medium truncate max-w-[150px]">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{cat.percent}%</span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      ({formatVnd(cat.value)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={() => setActiveTab('lots')}
              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-[#10542C] font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Xem Quản Lý Lô Nông Sản</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. DƯỚI CÙNG / BÊN PHẢI: BẢNG BIỂU DỮ LIỆU CHI TIẾT & HÀNH ĐỘNG VẬN HÀNH
             -> HIỂN THỊ RÕ THỜI GIAN HÌNH THÀNH ĐÀM PHÁN (CREATED AT)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (7 COLS): BẢNG HÀNH ĐỘNG VẬN HÀNH & RFQ CHỜ CHỐT */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-[#EAECE8] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#10542C] flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-black text-sm text-gray-900">
                  Yêu Cầu Báo Giá (RFQ) & Tiến Độ Đàm Phán
                </h3>
                <p className="text-[11px] text-gray-500">
                  Các đề xuất sỉ từ thương lái kèm thời gian khởi tạo & hẹn giao hàng
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('rfq')}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer"
            >
              Xem tất cả ({rfqs.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {rfqs.slice(0, 3).map((rfq) => {
              const rfqTime = formatRfqTimestamp(rfq.createdAt);
              return (
                <div
                  key={rfq.id}
                  className="p-3.5 rounded-2xl border border-gray-100 hover:border-emerald-300 bg-[#F9FAF8] flex flex-col gap-2.5 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {rfq.rfqCode}
                        </span>
                        <span className="text-xs font-bold text-gray-900">
                          {rfq.buyerCompany || rfq.buyerName}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700">
                        Cần mua: <strong className="text-gray-900">{rfq.requestedQuantity.toLocaleString()} kg</strong>{' '}
                        {rfq.productName}
                      </p>
                    </div>

                    {rfq.status === 'PENDING' ? (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => handleAcceptRfq(rfq.id)}
                          className="px-3.5 py-1.5 bg-[#10542C] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
                        >
                          Chấp Thuận
                        </button>
                        <button
                          onClick={() => {
                            setCounterModalRfq(rfq);
                            setCounterPrice(rfq.targetPrice);
                            setCounterQty(rfq.requestedQuantity);
                          }}
                          className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-xs font-bold rounded-xl text-gray-700 transition cursor-pointer"
                        >
                          Thương Lượng
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-xl self-end sm:self-auto ${
                          rfq.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {rfq.status === 'ACCEPTED' ? '✓ Đã Ký Hợp Đồng' : rfq.status}
                      </span>
                    )}
                  </div>

                  {/* THỜI GIAN HÌNH THÀNH ĐÀM PHÁN & ĐỀ XUẤT */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200/70 text-[11px] text-gray-600">
                    <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                      <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>
                        Thời gian gửi đàm phán: <strong className="text-gray-900">{rfqTime.full}</strong> ({rfqTime.relative})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-semibold">
                      <span className="text-[#10542C]">Đề xuất: {formatVnd(rfq.targetPrice)}/kg</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-700">Giao: {rfq.deliveryDate}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Banner hỗ trợ đăng lô thu hoạch nhanh */}
          <div className="pt-2 flex items-center justify-between p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <Sprout className="w-5 h-5 text-[#10542C]" />
              <div className="text-xs">
                <p className="font-bold text-[#10542C]">Vườn sắp có đợt thu hoạch mới?</p>
                <p className="text-[11px] text-emerald-800">
                  Đăng lô hàng để mở biểu giá theo bậc (Tier Pricing) tiếp cận 50+ thương lái B2B
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenLotModal}
              className="px-3.5 py-2 bg-[#10542C] hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Đăng Lô Mới</span>
            </button>
          </div>
        </div>

        {/* CỘT PHẢI (5 COLS): HỢP ĐỒNG B2B, BẢO CHỨNG ESCROW & BẢNG KÊ THUẾ */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-[#EAECE8] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-black text-sm text-gray-900">
                  Hợp Đồng Đang Chạy ({contracts.length})
                </h3>
                <p className="text-[11px] text-gray-500">Quản lý dòng tiền bảo lãnh 30%</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('settlements')}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer"
            >
              Ví thanh toán <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {contracts.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-2 hover:border-emerald-300 transition"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[#10542C]">{c.contractCode}</span>
                  <span className="text-[11px] bg-emerald-600 text-white px-2 py-0.5 rounded-md font-bold">
                    ✓ Đã Ký Quỹ Escrow
                  </span>
                </div>
                <p className="text-xs text-gray-800 font-bold">
                  {c.productName} ({c.quantity.toLocaleString()} kg)
                </p>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-100 text-gray-600">
                  <span>Tiền cọc bảo chứng:</span>
                  <strong className="text-amber-800 font-black">{formatVnd(c.depositAmount)}</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Trạm tiếp nhận:</span>
                  <span className="font-medium text-gray-800 truncate max-w-[170px]">{c.hubName}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Chứng từ Bảng kê 01/TNDN hợp pháp */}
          <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs text-blue-950 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-blue-900">
                <FileText className="w-4 h-4 text-blue-700" />
                Bảng Kê Mẫu 01/TNDN (Miễn Thuế)
              </span>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                Tự động
              </span>
            </div>
            <p className="text-[11px] text-blue-900/80 leading-relaxed">
              Các lô hàng đã qua kiểm định QC được hệ thống tự động xuất bảng kê thu mua nông sản trực tiếp từ nông dân, hợp thức hóa chi phí cho doanh nghiệp thu mua.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
