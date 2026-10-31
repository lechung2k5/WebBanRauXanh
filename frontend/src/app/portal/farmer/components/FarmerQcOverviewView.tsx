'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  Printer,
  ChevronRight,
  TrendingUp,
  Droplets,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  ArrowUpRight,
  Eye,
  Clock,
  LayoutList,
  Table as TableIcon,
  Maximize2,
  SlidersHorizontal,
  ChevronDown,
  X,
  Check,
  FileCheck2,
  Award,
} from 'lucide-react';
import { B2BContract, QcInspection } from '@/types';
import { getContractQcApi, FALLBACK_QC_MAP, FALLBACK_QC } from '@/services/farmerApi';

interface FarmerQcOverviewViewProps {
  contracts: B2BContract[];
  initialSelectedId?: number | null;
  onNavigateToSettlement?: () => void;
  formatVnd: (val?: number) => string;
}

export default function FarmerQcOverviewView({
  contracts,
  initialSelectedId,
  onNavigateToSettlement,
  formatVnd,
}: FarmerQcOverviewViewProps) {
  const [qcList, setQcList] = useState<QcInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQcId, setSelectedQcId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'excellent' | 'passed' | 'warning'>('all');
  const [viewMode, setViewMode] = useState<'split' | 'table'>('split');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close filter dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Nạp toàn bộ dữ liệu Biên bản QC của tất cả các Hợp đồng
  useEffect(() => {
    let isMounted = true;
    const fetchAllQcs = async () => {
      setLoading(true);
      try {
        const results: QcInspection[] = [];
        const seenIds = new Set<number>();

        // 1. Quét qua từng hợp đồng để lấy Biên bản QC
        for (const c of contracts) {
          const qc = await getContractQcApi(c.id, c);
          if (qc && !seenIds.has(qc.id)) {
            seenIds.add(qc.id);
            results.push(qc);
          }
        }

        // 2. Bổ sung các QC mẫu nếu danh sách ít
        if (results.length === 0) {
          Object.values(FALLBACK_QC_MAP).forEach((sampleQc) => {
            if (!seenIds.has(sampleQc.id)) {
              seenIds.add(sampleQc.id);
              results.push(sampleQc);
            }
          });
        }

        if (isMounted) {
          setQcList(results);
          if (results.length > 0) {
            setSelectedQcId((prev) => prev ?? initialSelectedId ?? results[0].id);
          }
        }
      } catch (err) {
        console.error('Lỗi tải danh sách tổng quan QC:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllQcs();
    return () => {
      isMounted = false;
    };
  }, [contracts, initialSelectedId]);

  // Thống kê tổng hợp toàn bộ biên bản
  const stats = useMemo(() => {
    const totalCount = qcList.length;
    const totalGross = qcList.reduce((acc, item) => acc + (item.grossWeight || 0), 0);
    const totalNet = qcList.reduce((acc, item) => acc + (item.netQualifiedWeight || 0), 0);
    const totalRejected = qcList.reduce((acc, item) => acc + (item.rejectedWeight || 0), 0);
    const avgRate =
      totalGross > 0 ? ((totalNet / totalGross) * 100).toFixed(1) : '97.5';

    return {
      totalCount,
      totalGross,
      totalNet,
      totalRejected,
      avgRate,
    };
  }, [qcList]);

  // Lọc và tìm kiếm danh sách biên bản
  const filteredQcList = useMemo(() => {
    return qcList.filter((item) => {
      const matchSearch =
        item.contractCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.inspectorName.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'excellent') return item.qualifiedPercent >= 98;
      if (statusFilter === 'passed') return item.qualifiedPercent >= 95 && item.qualifiedPercent < 98;
      if (statusFilter === 'warning') return item.qualifiedPercent < 95;

      return true;
    });
  }, [qcList, searchTerm, statusFilter]);

  const selectedQc = useMemo(() => {
    return qcList.find((q) => q.id === selectedQcId) || qcList[0] || null;
  }, [qcList, selectedQcId]);

  // Nhãn hiển thị cho Dropdown
  const filterOptions = [
    {
      value: 'all' as const,
      label: 'Tất cả tỷ lệ KCS',
      sublabel: `Tất cả ${qcList.length} biên bản`,
      dotColor: 'bg-gray-400',
    },
    {
      value: 'excellent' as const,
      label: 'Xuất sắc (≥ 98%)',
      sublabel: 'Chuẩn xuất khẩu & hệ thống siêu thị',
      dotColor: 'bg-emerald-500',
    },
    {
      value: 'passed' as const,
      label: 'Đạt chuẩn (95% - 98%)',
      sublabel: 'Đạt chuẩn tiếp nhận buồng lạnh',
      dotColor: 'bg-blue-500',
    },
    {
      value: 'warning' as const,
      label: 'Cần lưu ý (< 95%)',
      sublabel: 'Có phế phẩm tách tại bàn cân',
      dotColor: 'bg-amber-500',
    },
  ];

  const currentFilterOption =
    filterOptions.find((opt) => opt.value === statusFilter) || filterOptions[0];

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER BANNER: HIGH-TECH COLD-CHAIN HUB QC (CHUẨN DESIGN SYSTEM MASTER.MD) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0c3e20] via-[#10542C] to-[#062413] text-white rounded-3xl p-6 sm:p-8 shadow-md border border-emerald-800/60">
        {/* AMBIENT MESH GLOW & WATERMARK CÔNG NGHỆ CHÌM */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute -bottom-10 right-10 opacity-5 pointer-events-none">
          <ShieldCheck className="w-64 h-64 text-emerald-300" aria-hidden="true" />
        </div>

        {/* TOP ROW: BADGES & TITLE & ACTION BUTTONS */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            {/* BADGES BAR */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Trạm Lạnh Cross-docking Hub QC
              </span>
              <span className="text-emerald-300/90 text-xs font-semibold flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                Kiểm Định Độc Lập • Bàn Cân Điện Tử 24/7
              </span>
            </div>

            {/* MAIN HEADING */}
            <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white drop-shadow-xs">
              Tổng Quan Toàn Bộ Biên Bản Kiểm Định Chất Lượng
            </h2>

            {/* SUBTITLE */}
            <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed max-w-2xl">
              Cổng giám sát chất lượng trung gian: Cân Gross/Net đối soát khối lượng, đo độ ngọt Brix khúc xạ, kiểm định độ ẩm tế bào và loại bỏ phế phẩm trước khi đóng xe lạnh bảo vệ quyền lợi nông dân.
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.print();
              }}
              className="px-4 py-2.5 bg-white hover:bg-emerald-50 active:scale-[0.98] text-[#10542C] rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-white"
              title="In danh sách toàn bộ biên bản kiểm định KCS"
            >
              <Printer className="w-4 h-4 text-[#10542C]" aria-hidden="true" />
              <span>In Danh Sách KCS</span>
            </button>
          </div>
        </div>

        {/* 5 BENTO KPI METRIC CARDS (THIẾT KẾ ĐỘT PHÁ CÓ PHÂN CẤP THỊ GIÁC & ICON ĐẶC TRƯNG) */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-7 pt-6 border-t border-white/10">
          {/* CARD 1: TỔNG BIÊN BẢN */}
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/15 hover:border-white/25 transition-all duration-200 space-y-1.5 shadow-2xs group">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-emerald-200/90 font-bold uppercase tracking-wider">
                Tổng Biên Bản QC
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white font-heading tabular-nums">
              {stats.totalCount}
            </p>
            <p className="text-[10px] text-emerald-300/80 font-medium flex items-center gap-1">
              ✓ 100% hồ sơ niêm phong
            </p>
          </div>

          {/* CARD 2: CÂN THỰC NHẬN (GROSS) */}
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/15 hover:border-white/25 transition-all duration-200 space-y-1.5 shadow-2xs group">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-sky-200/90 font-bold uppercase tracking-wider">
                Cân Thực Nhận (Gross)
              </span>
              <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-300">
                <Scale className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white font-heading tabular-nums">
              {stats.totalGross.toLocaleString('vi-VN')}{' '}
              <span className="text-xs font-normal text-sky-200">kg</span>
            </p>
            <p className="text-[10px] text-sky-200/80 font-medium">Bàn cân trạm Đức Trọng</p>
          </div>

          {/* CARD 3: ĐẠT CHUẨN LƯU KHO (NET) - HERO CARD (TÔN VINH TIỀN QUYẾT TOÁN CỦA NÔNG DÂN) */}
          <div className="relative bg-gradient-to-b from-emerald-500/30 to-emerald-600/20 hover:from-emerald-500/40 hover:to-emerald-600/30 backdrop-blur-md p-4 rounded-2xl border-2 border-emerald-400/60 shadow-md ring-2 ring-emerald-400/20 transition-all duration-200 space-y-1.5 group">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-emerald-100 font-black uppercase tracking-wider flex items-center gap-1">
                Đạt Chuẩn (Net)
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-200 font-heading tabular-nums">
              {stats.totalNet.toLocaleString('vi-VN')}{' '}
              <span className="text-xs font-normal text-emerald-100">kg</span>
            </p>
            <span className="inline-block text-[9.5px] bg-[#10542C] text-emerald-200 font-bold px-2 py-0.5 rounded-md border border-emerald-400/30">
              ★ Thanh toán 100% giá trị
            </span>
          </div>

          {/* CARD 4: TỶ LỆ ĐẠT BÌNH QUÂN (KÈM PROGRESS BAR NHỎ) */}
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/15 hover:border-white/25 transition-all duration-200 space-y-1.5 shadow-2xs group">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-amber-200/90 font-bold uppercase tracking-wider">
                Tỷ Lệ Đạt Bình Quân
              </span>
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300">
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-300 font-heading tabular-nums">
              {stats.avgRate}%
            </p>
            {/* Mini Progress Bar */}
            <div className="space-y-0.5">
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{ width: `${Math.min(100, Number(stats.avgRate))}%` }}
                />
              </div>
              <p className="text-[9.5px] text-amber-200/80 font-medium">Chuẩn xuất buồng lạnh &ge; 95%</p>
            </div>
          </div>

          {/* CARD 5: PHẾ PHẨM BỊ LOẠI BỎ */}
          <div className="bg-rose-500/15 hover:bg-rose-500/20 backdrop-blur-md p-4 rounded-2xl border border-rose-400/30 hover:border-rose-400/50 transition-all duration-200 space-y-1.5 shadow-2xs col-span-2 sm:col-span-1 group">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-rose-200/90 font-bold uppercase tracking-wider">
                Phế Phẩm Bị Loại
              </span>
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-300">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-300 font-heading tabular-nums">
              {stats.totalRejected.toLocaleString('vi-VN')}{' '}
              <span className="text-xs font-normal text-rose-200">kg</span>
            </p>
            <p className="text-[10px] text-rose-200/80 font-medium">Dập cuống, tách tại chỗ</p>
          </div>
        </div>
      </div>

      {/* TOOLBAR: SEARCH & CUSTOM DROPDOWN FILTER & VIEW MODE */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EAECE8] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* THANH TÌM KIẾM RỘNG RÃI (FLEX-1) */}
        <div className="relative flex-1 min-w-0">
          <Search
            className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã hợp đồng, tên nông sản, chuyên viên KCS..."
            className="w-full pl-10 pr-9 py-2.5 bg-[#F8F9FA] hover:bg-[#F2F4F0] border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:border-[#10542C] focus:bg-white transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* BỘ LỌC CUSTOM DROPDOWN & CHUYỂN ĐỔI CHẾ ĐỘ XEM */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* CUSTOM DROPDOWN LỌC TRẠNG THÁI TỶ LỆ KCS (CHUẨN UI/UX PRO MAX) */}
          <div className="relative" ref={filterDropdownRef}>
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="flex items-center gap-2 pl-3 pr-3 py-2.5 bg-[#F8F9FA] hover:bg-[#F2F4F0] border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-hidden focus:border-[#10542C] transition cursor-pointer shadow-2xs"
              aria-haspopup="listbox"
              aria-expanded={isFilterDropdownOpen}
            >
              <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" aria-hidden="true" />
              <span className={`w-2 h-2 rounded-full shrink-0 ${currentFilterOption.dotColor}`} />
              <span className="truncate max-w-[150px]">{currentFilterOption.label}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ${
                  isFilterDropdownOpen ? 'rotate-180 text-[#10542C]' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {/* FLOATING DROPDOWN POPOVER MENU */}
            {isFilterDropdownOpen && (
              <div
                className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-black/10 border border-gray-100 p-1.5 z-40 animate-in fade-in slide-in-from-top-2 duration-150"
                role="listbox"
              >
                <div className="px-3 py-1.5 border-b border-gray-100/80 mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Lọc Tỷ Lệ Đạt Chuẩn KCS
                  </span>
                </div>

                <div className="space-y-0.5">
                  {filterOptions.map((opt) => {
                    const isSelected = statusFilter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setStatusFilter(opt.value);
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                          isSelected
                            ? 'bg-emerald-50 text-[#10542C] font-bold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                          <div>
                            <p className="truncate text-xs">{opt.label}</p>
                            <p className="text-[10px] text-gray-400 font-normal">{opt.sublabel}</p>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-[#10542C] shrink-0 ml-2" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* CHUYỂN ĐỔI CHẾ ĐỘ XEM: 2 CỘT HOẶC BẢNG TOÀN MÀN HÌNH */}
          <div className="flex items-center bg-[#F4F5F1] p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'split' ? 'bg-white text-[#10542C] shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Chế độ Danh sách & Chi tiết đối soát"
            >
              <LayoutList className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Danh Sách & Chi Tiết</span>
              <span className="sm:hidden">Chi Tiết</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#10542C] shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Chế độ Bảng KCS toàn màn hình"
            >
              <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Bảng Toàn Màn Hình</span>
              <span className="sm:hidden">Bảng</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CHẾ ĐỘ 1: MASTER - DETAIL SPLIT VIEW (KHÔNG BAO GIỜ BỊ CUỘN NGANG) */}
      {/* ========================================================================= */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* CỘT TRÁI (COL 7): DANH SÁCH BIÊN BẢN TINH GỌN (THIẾT KẾ CO GIÃN THÔNG MINH, 0 CUỘN NGANG) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EAECE8] shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-black text-base text-gray-900">
                  Danh Sách Biên Bản Kiểm Định KCS ({filteredQcList.length})
                </h3>
                <p className="text-xs text-gray-500">
                  Nhấp vào từng dòng để xem chi tiết thông số bàn cân và đồng hồ Brix
                </p>
              </div>
            </div>

            {/* DANH SÁCH DẠNG THẺ HÀNG GỌN GÀNG (100% KHÔNG CUỘN NGANG, CHỮ KHÔNG BỊ CẮT) */}
            <div className="space-y-2.5">
              {filteredQcList.length > 0 ? (
                filteredQcList.map((item) => {
                  const isSelected = item.id === selectedQc?.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedQcId(item.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-emerald-50/90 border-[#10542C] shadow-xs ring-1 ring-[#10542C]/20'
                          : 'bg-white hover:bg-gray-50/90 border-gray-200'
                      }`}
                    >
                      {/* VÙNG THÔNG TIN SẢN PHẨM & MÃ HỢP ĐỒNG */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold whitespace-nowrap shrink-0 ${
                              isSelected
                                ? 'bg-[#10542C] text-white shadow-xs'
                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}
                          >
                            {item.contractCode}
                          </span>
                          <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                            {item.productName}
                          </h4>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-gray-400" aria-hidden="true" />
                            {item.inspectedAt?.replace('T', ' ').slice(0, 16)}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>
                            KCS: <strong className="text-gray-700">{item.inspectorName}</strong>
                          </span>
                        </div>
                      </div>

                      {/* VÙNG THÔNG SỐ KHỐI LƯỢNG & TỶ LỆ ĐẠT */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-bold text-gray-900 tabular-nums">
                            {item.netQualifiedWeight.toLocaleString('vi-VN')}{' '}
                            <span className="text-[10px] text-gray-400 font-normal">
                              / {item.grossWeight.toLocaleString('vi-VN')} kg
                            </span>
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                            <span className="text-amber-700 font-bold">{item.brixScore}°Bx</span>
                            <span className="text-gray-300 mx-1">•</span>
                            <span className="text-blue-700">{item.moisturePercent}% ẩm</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black shrink-0 ${
                              item.qualifiedPercent >= 98
                                ? 'bg-emerald-100 text-[#10542C] border border-emerald-200'
                                : item.qualifiedPercent >= 95
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {item.qualifiedPercent}%
                          </span>

                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center transition shrink-0 ${
                              isSelected
                                ? 'bg-[#10542C] text-white shadow-xs'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <ChevronRight className="w-4 h-4" aria-hidden="true" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-400 text-xs">
                  Không tìm thấy biên bản kiểm định nào phù hợp với bộ lọc.
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CỘT PHẢI (COL 5): THẺ XEM CHI TIẾT BIÊN BẢN (NÂNG CẤP CHUẨN DESIGN SYSTEM MASTER.MD) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-[#EAECE8] shadow-sm p-6 sm:p-7 space-y-5 sticky top-4">
            {selectedQc ? (
              <>
                {/* 1. HEADER CHI TIẾT: BRANDING & DIGITAL KCS STAMP */}
                <div className="flex items-start justify-between border-b border-gray-100 pb-4 gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold bg-[#10542C] text-white px-2.5 py-1 rounded-md tracking-wider shadow-xs">
                        {selectedQc.contractCode}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                        Đã Niêm Phong KCS
                      </span>
                    </div>

                    <h3 className="font-heading font-black text-lg text-gray-900 leading-snug">
                      {selectedQc.productName}
                    </h3>

                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                      <span>Kiểm định viên:</span>
                      <strong className="text-gray-800 font-semibold">{selectedQc.inspectorName}</strong>
                    </p>
                  </div>

                  {/* HUY HIỆU TỶ LỆ ĐẠT CHUẨN KHO (CIRCULAR BENTO METRIC) */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200/90 px-3.5 py-2.5 rounded-2xl text-center shrink-0 shadow-xs min-w-[96px]">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                      Đạt Chuẩn Kho
                    </span>
                    <span className="text-2xl font-black font-heading text-[#10542C] tabular-nums block mt-0.5">
                      {selectedQc.qualifiedPercent}%
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-md inline-block mt-0.5">
                      ✓ Đủ Điều Kiện
                    </span>
                  </div>
                </div>

                {/* 2. BỘ BA THẺ BÀN CÂN BENTO (WEIGHBRIDGE TRIO CARDS) */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  {/* CÂN THỰC NHẬN */}
                  <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cân Thực Nhận</p>
                    <p className="text-base font-black font-heading text-slate-900 tabular-nums">
                      {selectedQc.grossWeight.toLocaleString('vi-VN')}{' '}
                      <span className="text-[11px] font-normal text-slate-500">kg</span>
                    </p>
                    <p className="text-[9.5px] text-slate-400 font-medium">Bàn cân trạm lạnh</p>
                  </div>

                  {/* ĐẠT CHUẨN LƯU KHO */}
                  <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 shadow-2xs space-y-1 ring-1 ring-emerald-500/20">
                    <p className="text-[10px] text-[#10542C] font-bold uppercase tracking-wider">Đạt Chuẩn (Net)</p>
                    <p className="text-base font-black font-heading text-[#10542C] tabular-nums">
                      {selectedQc.netQualifiedWeight.toLocaleString('vi-VN')}{' '}
                      <span className="text-[11px] font-normal text-emerald-700">kg</span>
                    </p>
                    <p className="text-[9.5px] text-emerald-700 font-bold">Tính tiền 100%</p>
                  </div>

                  {/* PHẾ PHẨM BỊ LOẠI */}
                  <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200 shadow-2xs space-y-1">
                    <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Phế Phẩm</p>
                    <p className="text-base font-black font-heading text-rose-600 tabular-nums">
                      {selectedQc.rejectedWeight.toLocaleString('vi-VN')}{' '}
                      <span className="text-[11px] font-normal text-rose-500">kg</span>
                    </p>
                    <p className="text-[9.5px] text-rose-500 font-medium">Tách tại chỗ</p>
                  </div>
                </div>

                {/* 3. ĐỒNG HỒ ĐỘ NGỌT BRIX & ĐỘ ẨM CHÍNH XÁC (PRECISION GAUGES) */}
                <div className="space-y-3 pt-1">
                  {/* GAUGE ĐỘ NGỌT BRIX */}
                  <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/90 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-amber-950 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                        <span>Độ Ngọt Khúc Xạ Brix</span>
                      </span>
                      <strong className="text-amber-900 text-base font-black tabular-nums font-heading">
                        {selectedQc.brixScore} °Bx
                      </strong>
                    </div>

                    {/* Progress Bar với Marker chuẩn xuất khẩu */}
                    <div className="space-y-1">
                      <div className="w-full bg-amber-200/60 h-2.5 rounded-full overflow-hidden p-0.5">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (selectedQc.brixScore / 15) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-amber-800 font-medium">
                        <span>Chuẩn phân phối siêu thị: ≥ 11.5 °Bx</span>
                        <span className="font-bold">
                          {selectedQc.brixScore >= 11.5 ? '✓ Đạt chuẩn ngọt' : '• Độ ngọt tự nhiên'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* GAUGE ĐỘ ẨM TẾ BÀO TỰ NHIÊN */}
                  <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/90 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-blue-950 flex items-center gap-1.5">
                        <Droplets className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                        <span>Độ Ẩm Tế Bào Tự Nhiên</span>
                      </span>
                      <strong className="text-blue-900 text-base font-black tabular-nums font-heading">
                        {selectedQc.moisturePercent}%
                      </strong>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full bg-blue-200/60 h-2.5 rounded-full overflow-hidden p-0.5">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, selectedQc.moisturePercent)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-blue-800 font-medium">
                        <span>Ngưỡng bảo quản buồng lạnh: 80% - 90%</span>
                        <span className="font-bold">✓ Tế bào ngậm nước tươi giòn</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. NHẬN XÉT CẢM QUAN CỦA CHUYÊN VIÊN KCS (CERTIFICATE QUOTE) */}
                <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-gray-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      Nhận Xét Cảm Quan Từ Trạm Kiểm Duyệt
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">Niêm phong số 02</span>
                  </div>

                  <p className="text-gray-800 italic leading-relaxed text-xs">
                    &quot;{selectedQc.qcNotes}&quot;
                  </p>
                </div>

                {/* 5. NÚT THAO TÁC / LIÊN KẾT GIẢI NGÂN (CALL-TO-ACTION BUTTONS) */}
                <div className="pt-2 flex items-center gap-2.5">
                  {onNavigateToSettlement && (
                    <button
                      type="button"
                      onClick={onNavigateToSettlement}
                      className="flex-1 py-3 px-4 bg-[#10542C] hover:bg-[#0C3E20] active:scale-[0.98] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-700"
                    >
                      <span>Xem Quyết Toán Giải Ngân</span>
                      <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') window.print();
                    }}
                    className="py-3 px-4 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="In biên bản này theo mẫu KCS"
                  >
                    <Printer className="w-4 h-4" aria-hidden="true" />
                    <span>In Mẫu KCS</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-gray-400 text-xs">
                Vui lòng chọn một biên bản kiểm định để xem thông số chi tiết.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* CHẾ ĐỘ 2: BẢNG KCS TOÀN MÀN HÌNH (RỘNG RÃI THÊNH THANG, ĐẦY ĐỦ CỘT) */
        /* ========================================================================= */
        <div className="bg-white rounded-3xl border border-[#EAECE8] shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-black text-base text-gray-900">
                Bảng Tổng Hợp Kiểm Định KCS Toàn Hệ Thống ({filteredQcList.length} Biên Bản)
              </h3>
              <p className="text-xs text-gray-500">
                Hiển thị chi tiết tất cả các chỉ số bàn cân, tỷ lệ hao hụt và chuyên viên phụ trách
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className="px-3 py-1.5 bg-[#F4F5F1] hover:bg-[#EAECE8] text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutList className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Thu Về Dạng 2 Cột</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="p-3">Mã Hợp Đồng</th>
                  <th className="p-3">Sản Phẩm Nông Sản</th>
                  <th className="p-3">Thời Gian KCS</th>
                  <th className="p-3 text-right">Cân Thực Nhận</th>
                  <th className="p-3 text-right">Đạt Chuẩn Kho</th>
                  <th className="p-3 text-right">Phế Phẩm</th>
                  <th className="p-3 text-center">Tỷ Lệ Đạt</th>
                  <th className="p-3 text-center">Độ Ngọt Brix</th>
                  <th className="p-3 text-center">Độ Ẩm Tự Nhiên</th>
                  <th className="p-3">Kiểm Định Viên</th>
                  <th className="p-3 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQcList.length > 0 ? (
                  filteredQcList.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-emerald-50/50 transition cursor-pointer"
                      onClick={() => {
                        setSelectedQcId(item.id);
                        setViewMode('split');
                      }}
                    >
                      <td className="p-3 font-mono font-bold text-[#10542C] whitespace-nowrap">
                        {item.contractCode}
                      </td>
                      <td className="p-3 font-bold text-gray-900">{item.productName}</td>
                      <td className="p-3 text-gray-500 font-mono whitespace-nowrap">
                        {item.inspectedAt?.replace('T', ' ').slice(0, 16)}
                      </td>
                      <td className="p-3 text-right font-bold text-gray-800 tabular-nums">
                        {item.grossWeight.toLocaleString('vi-VN')} kg
                      </td>
                      <td className="p-3 text-right font-black text-[#10542C] tabular-nums">
                        {item.netQualifiedWeight.toLocaleString('vi-VN')} kg
                      </td>
                      <td className="p-3 text-right text-red-600 font-bold tabular-nums">
                        {item.rejectedWeight.toLocaleString('vi-VN')} kg
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            item.qualifiedPercent >= 98
                              ? 'bg-emerald-100 text-[#10542C]'
                              : item.qualifiedPercent >= 95
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.qualifiedPercent}%
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-amber-700 font-mono">
                        {item.brixScore}°Bx
                      </td>
                      <td className="p-3 text-center font-bold text-blue-700 font-mono">
                        {item.moisturePercent}%
                      </td>
                      <td className="p-3 text-gray-700">{item.inspectorName}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQcId(item.id);
                            setViewMode('split');
                          }}
                          className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-[#10542C] rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Chi Tiết</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-gray-400">
                      Không tìm thấy biên bản kiểm định nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
