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
  const [expandedQcIds, setExpandedQcIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'excellent' | 'passed' | 'warning'>('all');
  const [viewMode, setViewMode] = useState<'split' | 'table'>('split');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Mặc định mở rộng biên bản đầu tiên khi nạp danh sách
  useEffect(() => {
    if (qcList.length > 0) {
      const defaultId = initialSelectedId ?? qcList[0].id;
      setExpandedQcIds((prev) => (prev.size > 0 ? prev : new Set([defaultId])));
    }
  }, [qcList, initialSelectedId]);

  const toggleExpand = (id: number) => {
    setSelectedQcId(id);
    setExpandedQcIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
              Cổng giám sát chất lượng trung gian: Cân đối soát khối lượng thực tế, đo độ ngọt tự nhiên (°Bx), kiểm định độ tươi ngon và loại bỏ phế phẩm trước khi chuyển lên xe lạnh nhằm bảo vệ tối đa quyền lợi nhà vườn.
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
      {/* GỘP THÀNH 1 VÙNG DUY NHẤT: FORM HÀNG NGANG CHO TỪNG HÓA ĐƠN BIÊN BẢN KIỂM ĐỊNH */}
      {/* 1 BÊN LÀ THÔNG TIN TÓM TẮT HÀNG NGANG, CLICK VÀO MỞ RỘNG NỘI DUNG CHI TIẾT TRONG CÙNG FORM */}
      {/* ========================================================================= */}
      {viewMode === 'split' ? (
        <div className="space-y-4">
          {filteredQcList.length > 0 ? (
            filteredQcList.map((item) => {
              const isExpanded = expandedQcIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? 'border-[#10542C]/40 shadow-md ring-1 ring-[#10542C]/20'
                      : 'border-[#EAECE8] shadow-xs hover:border-emerald-300 hover:shadow-sm'
                  }`}
                >
                  {/* ============================================================ */}
                  {/* PHẦN 1: THÔNG TIN HÓA ĐƠN BIÊN BẢN HÀNG NGANG (CLICK ĐỂ MỞ/ĐÓNG) */}
                  {/* ============================================================ */}
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className="p-5 sm:p-6 cursor-pointer select-none transition bg-white hover:bg-emerald-50/20"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Nhóm thông tin cơ bản: Mã HĐ, Tên sản phẩm, KCS, Thời gian */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#10542C] text-white shadow-2xs shrink-0">
                            {item.contractCode}
                          </span>
                          <h4 className="font-heading font-black text-base sm:text-lg text-gray-900 truncate">
                            {item.productName}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                            Đã Niêm Phong KCS
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                            {item.inspectedAt?.replace('T', ' ').slice(0, 16)}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                            KCS: <strong className="text-gray-700 font-semibold">{item.inspectorName}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Nhóm thông số nhanh: Khối lượng, Độ ngọt Brix, Độ ẩm, % Đạt chuẩn & Nút Xem */}
                      <div className="flex items-center gap-4 sm:gap-6 flex-wrap lg:flex-nowrap border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100">
                        {/* Khối lượng đạt / Tổng */}
                        <div className="space-y-0.5 min-w-[130px]">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                            Khối Lượng Bàn Cân
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-gray-700">
                            Đạt: <strong className="text-gray-900 font-black text-sm sm:text-base font-heading">{item.netQualifiedWeight.toLocaleString('vi-VN')}</strong> / {item.grossWeight.toLocaleString('vi-VN')} kg
                          </span>
                        </div>

                        {/* Brix & Độ ẩm */}
                        <div className="space-y-0.5 font-mono text-xs min-w-[120px]">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                            Chỉ Số Tự Nhiên
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-amber-800 font-black bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {item.brixScore}°Bx
                            </span>
                            <span className="text-blue-800 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {item.moisturePercent}% ẩm
                            </span>
                          </div>
                        </div>

                        {/* Huy hiệu % đạt chuẩn kho */}
                        <div className="text-center shrink-0 min-w-[85px]">
                          <span
                            className={`px-3 py-1.5 rounded-2xl text-xs sm:text-sm font-black font-heading inline-flex items-center gap-1 shadow-2xs ${
                              item.qualifiedPercent >= 98
                                ? 'bg-emerald-100 text-[#10542C] border border-emerald-300'
                                : item.qualifiedPercent >= 95
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {item.qualifiedPercent}%
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                            ✓ Đủ Điều Kiện
                          </span>
                        </div>

                        {/* Nút mũi tên mở rộng / thu gọn */}
                        <div className="shrink-0 flex items-center gap-2 pl-2 text-xs font-bold text-gray-500">
                          <span className="hidden xl:inline text-[11px] text-[#10542C]">
                            {isExpanded ? 'Đóng chi tiết' : 'Xem nội dung'}
                          </span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            isExpanded ? 'bg-[#10542C] text-white rotate-180' : 'bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-[#10542C]'
                          }`}>
                            <ChevronDown className="w-4 h-4" aria-hidden="true" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ============================================================ */}
                  {/* PHẦN 2: NỘI DUNG CHI TIẾT BIÊN BẢN (XỔ XUỐNG TRONG CÙNG 1 FORM) */}
                  {/* ============================================================ */}
                  {isExpanded && (
                    <div className="p-6 sm:p-7 bg-[#FAFBF9]/90 border-t border-gray-100 space-y-5 animate-in fade-in-50 duration-200">
                      {/* Tiêu đề & Tỷ lệ chi tiết */}
                      <div className="flex items-start justify-between border-b border-gray-200/80 pb-4 gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-mono font-bold bg-[#10542C] text-white px-2.5 py-1 rounded-md tracking-wider shadow-xs">
                              {item.contractCode}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                              Đã Niêm Phong KCS
                            </span>
                          </div>

                          <h3 className="font-heading font-black text-xl text-gray-900 leading-snug">
                            {item.productName}
                          </h3>

                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                            <span>Kiểm định viên:</span>
                            <strong className="text-gray-800 font-semibold">{item.inspectorName}</strong>
                          </p>
                        </div>

                        {/* Huy hiệu tỷ lệ đạt chuẩn kho */}
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200/90 px-4 py-3 rounded-2xl text-center shrink-0 shadow-xs min-w-[120px]">
                          <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                            Đạt Chuẩn Kho
                          </span>
                          <span className="text-3xl font-black font-heading text-[#10542C] tabular-nums block mt-0.5">
                            {item.qualifiedPercent}%
                          </span>
                          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md inline-block mt-1">
                            ✓ Đủ Điều Kiện
                          </span>
                        </div>
                      </div>

                      {/* 1. BỘ BA THẺ BÀN CÂN BENTO */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                          <p className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider">Cân Thực Nhận</p>
                          <p className="text-xl font-black font-heading text-slate-900 tabular-nums">
                            {item.grossWeight.toLocaleString('vi-VN')}{' '}
                            <span className="text-xs font-normal text-slate-500">kg</span>
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">Bàn cân trạm lạnh</p>
                        </div>

                        <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-300 shadow-2xs space-y-1 ring-1 ring-emerald-500/20">
                          <p className="text-[10.5px] text-[#10542C] font-bold uppercase tracking-wider">Đạt Chuẩn (Net)</p>
                          <p className="text-xl font-black font-heading text-[#10542C] tabular-nums">
                            {item.netQualifiedWeight.toLocaleString('vi-VN')}{' '}
                            <span className="text-xs font-normal text-emerald-700">kg</span>
                          </p>
                          <p className="text-[10px] text-emerald-700 font-bold">Tính tiền 100%</p>
                        </div>

                        <div className="p-4 bg-rose-50/80 rounded-2xl border border-rose-200 shadow-2xs space-y-1">
                          <p className="text-[10.5px] text-rose-600 font-bold uppercase tracking-wider">Phế Phẩm</p>
                          <p className="text-xl font-black font-heading text-rose-600 tabular-nums">
                            {item.rejectedWeight.toLocaleString('vi-VN')}{' '}
                            <span className="text-xs font-normal text-rose-500">kg</span>
                          </p>
                          <p className="text-[10px] text-rose-500 font-medium">Tách tại chỗ</p>
                        </div>
                      </div>

                      {/* 2. ĐỒNG HỒ ĐỘ NGỌT BRIX & ĐỘ ẨM */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                        {/* ĐỘ NGỌT BRIX */}
                        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/90 shadow-2xs space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-amber-950 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                              <span>Chỉ Số Độ Ngọt Tự Nhiên</span>
                            </span>
                            <strong className="text-amber-900 text-lg font-black tabular-nums font-heading">
                              {item.brixScore} °Bx
                            </strong>
                          </div>
                          <div className="space-y-1">
                            <div className="w-full bg-amber-200/60 h-2.5 rounded-full overflow-hidden p-0.5">
                              <div
                                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (item.brixScore / 15) * 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10.5px] text-amber-800 font-medium">
                              <span>Chuẩn siêu thị: ≥ 11.5 °Bx</span>
                              <span className="font-bold">
                                {item.brixScore >= 11.5 ? '✓ Đạt chuẩn ngọt' : '• Tự nhiên'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ĐỘ ẨM TẾ BÀO */}
                        <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/90 shadow-2xs space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-blue-950 flex items-center gap-1.5">
                              <Droplets className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                              <span>Độ Ẩm Tế Bào Tự Nhiên</span>
                            </span>
                            <strong className="text-blue-900 text-lg font-black tabular-nums font-heading">
                              {item.moisturePercent}%
                            </strong>
                          </div>
                          <div className="space-y-1">
                            <div className="w-full bg-blue-200/60 h-2.5 rounded-full overflow-hidden p-0.5">
                              <div
                                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, item.moisturePercent)}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10.5px] text-blue-800 font-medium">
                              <span>Chuẩn buồng lạnh: 80% - 90%</span>
                              <span className="font-bold">✓ Tươi giòn</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. NHẬN XÉT CẢM QUAN */}
                      <div className="p-4 bg-white rounded-2xl border border-gray-200/80 space-y-1.5 text-xs shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                            Nhận Xét Cảm Quan Từ Trạm Kiểm Duyệt
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">Niêm phong số 02</span>
                        </div>
                        <p className="text-gray-800 italic leading-relaxed text-xs">
                          &quot;{item.qcNotes}&quot;
                        </p>
                      </div>

                      {/* 4. NÚT THAO TÁC / LIÊN KẾT GIẢI NGÂN */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                        {onNavigateToSettlement && (
                          <button
                            type="button"
                            onClick={onNavigateToSettlement}
                            className="w-full sm:flex-1 py-3 px-4 bg-[#10542C] hover:bg-[#0C3E20] active:scale-[0.98] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
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
                          className="w-full sm:w-auto py-3 px-5 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] text-gray-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          title="In biên bản này theo mẫu KCS"
                        >
                          <Printer className="w-4 h-4" aria-hidden="true" />
                          <span>In Mẫu KCS</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-3xl border border-[#EAECE8] p-12 text-center text-gray-400 text-xs">
              Không tìm thấy biên bản kiểm định nào phù hợp với bộ lọc tìm kiếm.
            </div>
          )}
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
              <span>Thu Về Dạng Form Danh Sách</span>
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
                  <th className="p-3 text-center">Độ Ngọt (°Bx)</th>
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
