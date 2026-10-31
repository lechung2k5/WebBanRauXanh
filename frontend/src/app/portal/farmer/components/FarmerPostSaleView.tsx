'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  Thermometer,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  FileCheck2,
  ExternalLink,
  Printer,
  ChevronRight,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  User,
  Phone,
  Scale,
  Camera,
  FileText,
  Layers,
  Activity,
  Maximize2,
  Eye,
  Info,
  X,
  Zap,
  Sparkles,
  Radio,
  SlidersHorizontal,
  Award,
  ChevronDown,
  Sprout,
  Package,
  UserCheck,
  RotateCcw,
  Timer,
  DollarSign,
  Check,
} from 'lucide-react';
import {
  HarvestLot,
  B2BContract,
  HarvestLotAllocation,
  ColdChainTelemetry,
  DeliveryProof,
  LotTrace,
} from '@/types';
import {
  getLotAllocationApi,
  getColdChainTelemetryApi,
  getDeliveryProofApi,
  getLotTraceApi,
} from '@/services/farmerApi';

interface FarmerPostSaleViewProps {
  lots: HarvestLot[];
  contracts: B2BContract[];
  formatVnd: (val?: number) => string;
}

export default function FarmerPostSaleView({
  lots,
  contracts,
  formatVnd,
}: FarmerPostSaleViewProps) {
  const [subTab, setSubTab] = useState<'allocation' | 'coldchain' | 'epod' | 'trace'>('allocation');

  // 1. ALLOCATION STATE
  const [selectedLotId, setSelectedLotId] = useState<number>(lots[0]?.id || 1);
  const [isLotDropdownOpen, setIsLotDropdownOpen] = useState(false);
  const lotDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close lot dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (lotDropdownRef.current && !lotDropdownRef.current.contains(event.target as Node)) {
        setIsLotDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentSelectedLot = lots.find((l) => l.id === selectedLotId) || lots[0];
  // State quản lý Dropdown Hợp đồng / Chuyến xe (Subtab 2)
  const [isContractDropdownOpen, setIsContractDropdownOpen] = useState(false);
  const contractDropdownRef = useRef<HTMLDivElement>(null);

  // State quản lý Dropdown ePOD (Subtab 3)
  const [isEpodDropdownOpen, setIsEpodDropdownOpen] = useState(false);
  const epodDropdownRef = useRef<HTMLDivElement>(null);

  // State quản lý Dropdown Trace QR (Subtab 4)
  const [isTraceDropdownOpen, setIsTraceDropdownOpen] = useState(false);
  const traceDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside cho các dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contractDropdownRef.current && !contractDropdownRef.current.contains(event.target as Node)) {
        setIsContractDropdownOpen(false);
      }
      if (epodDropdownRef.current && !epodDropdownRef.current.contains(event.target as Node)) {
        setIsEpodDropdownOpen(false);
      }
      if (traceDropdownRef.current && !traceDropdownRef.current.contains(event.target as Node)) {
        setIsTraceDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const [allocation, setAllocation] = useState<HarvestLotAllocation | null>(null);
  const [loadingAllocation, setLoadingAllocation] = useState(false);
  const [allocationFilter, setAllocationFilter] = useState<'ALL' | 'PAID' | 'TRANSIT' | 'COMPLETED'>('ALL');

  // 2. COLD-CHAIN & ORDER FULFILLMENT TIMELINE STATE
  const [selectedContractId, setSelectedContractId] = useState<number>(contracts[0]?.id || 1);
  const [telemetry, setTelemetry] = useState<ColdChainTelemetry | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [isSimulatingBreach, setIsSimulatingBreach] = useState(false);
  
  // 6 MỐC GIAO NHẬN THỰC TẾ & CƠ CHẾ AUTO-SETTLEMENT (48H):
  // 1: Đã Tiếp Nhận -> 2: Đã Đóng Gói -> 3: Đến Khu Vận Chuyển -> 4: Đã Giao & Thu Tiền -> 5: Khách Xác Nhận -> 6: Hoàn Tất Đơn
  const [fulfillmentStep, setFulfillmentStep] = useState<number>(4);
  const [autoCompleteType, setAutoCompleteType] = useState<'MANUAL' | 'AUTO_48H' | 'IN_PROGRESS'>('IN_PROGRESS');
  const [hoursRemaining, setHoursRemaining] = useState<number>(38);

  // 3. EPOD STATE
  const [epodContractId, setEpodContractId] = useState<number>(contracts[0]?.id || 1);
  const [deliveryProof, setDeliveryProof] = useState<DeliveryProof | null>(null);
  const [loadingEpod, setLoadingEpod] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // 4. TRACE STATE
  const [traceLotCode, setTraceLotCode] = useState<string>(lots[0]?.lotCode || 'LOT-2026-DL-001');
  const [lotTrace, setLotTrace] = useState<LotTrace | null>(null);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [copiedTraceUrl, setCopiedTraceUrl] = useState(false);
  const [labelSize, setLabelSize] = useState<'DECAL_100X75' | 'A4_SHEET'>('DECAL_100X75');

  const currentSelectedContract = contracts.find((c) => c.id === selectedContractId) || contracts[0];
  const currentEpodContract = contracts.find((c) => c.id === epodContractId) || contracts[0];
  const currentTraceLot = lots.find((l) => l.lotCode === traceLotCode) || lots[0];

  // Fetch Allocation when selectedLotId changes
  useEffect(() => {
    let isMounted = true;
    const fetchAlloc = async () => {
      setLoadingAllocation(true);
      try {
        const data = await getLotAllocationApi(selectedLotId);
        if (isMounted) {
          if (data) {
            setAllocation(data);
          } else {
            // Mock fallback if API returns null
            const lot = lots.find((l) => l.id === selectedLotId) || lots[0];
            const allocatedKg = (lot?.totalQuantity || 10000) - (lot?.remainingQuantity || 4000);
            const totalKg = lot?.totalQuantity || 10000;
            const pct = Math.round((allocatedKg / totalKg) * 100);
            setAllocation({
              lotId: selectedLotId,
              lotCode: lot?.lotCode || 'LOT-2026-DL-001',
              productName: lot?.productName || 'Bắp Cải Trái Tim Đà Lạt VietGAP',
              totalWeightKg: totalKg,
              allocatedWeightKg: allocatedKg,
              availableWeightKg: lot?.remainingQuantity || 4000,
              soldPercentage: pct,
              status: lot?.status || 'ACTIVE',
              allocations: contracts.map((c) => ({
                contractId: c.id,
                contractCode: c.contractCode,
                buyerName: c.buyerName,
                buyerPhone: '0908.765.432',
                quantityKg: c.quantity || 3000,
                unitPrice: c.unitPrice || 14000,
                totalAmount: c.totalAmount || 42000000,
                depositStatus: c.depositStatus,
                fulfillmentStatus: c.fulfillmentStatus,
                destinationWarehouse: c.hubName || 'Kho Phân Phối Thủ Đức, TP.HCM',
                deliveryDate: c.hubDeliveryDate || '2026-10-29',
                shipmentCode: `SHP-2026-00${c.id}`,
                shipmentStatus:
                  c.fulfillmentStatus === 'COMPLETED' || c.fulfillmentStatus === 'HUB_DELIVERED'
                    ? 'COMPLETED'
                    : 'IN_TRANSIT',
              })),
            });
          }
        }
      } catch (err) {
        console.error('Error fetching lot allocation:', err);
      } finally {
        if (isMounted) setLoadingAllocation(false);
      }
    };
    fetchAlloc();
    return () => {
      isMounted = false;
    };
  }, [selectedLotId, lots, contracts]);

  // Fetch Telemetry when selectedContractId changes
  useEffect(() => {
    let isMounted = true;
    const fetchTelem = async () => {
      setLoadingTelemetry(true);
      try {
        const data = await getColdChainTelemetryApi(selectedContractId);
        if (isMounted) {
          if (data) {
            setTelemetry(data);
          } else {
            // Fallback mock
            const c = contracts.find((x) => x.id === selectedContractId) || contracts[0];
            setTelemetry({
              contractId: selectedContractId,
              contractCode: c?.contractCode || 'HD-2026-DL-001',
              shipmentCode: `SHP-2026-00${selectedContractId}`,
              truckPlate: '49C-188.42 (Xe lạnh 5 tấn)',
              driverName: 'Trần Văn Mạnh',
              driverPhone: '0918.234.567',
              currentTemp: 3.8,
              currentHumidity: 94.2,
              targetTempMin: 2.0,
              targetTempMax: 6.0,
              isBreachAlert: false,
              shipmentStatus: 'IN_TRANSIT',
              logs: [
                {
                  time: '14:30',
                  temperature: 3.8,
                  humidity: 94.2,
                  isAlert: false,
                  note: 'Xe đang qua Đèo Bảo Lộc, máy lạnh chạy ổn định',
                },
                {
                  time: '13:00',
                  temperature: 4.1,
                  humidity: 93.5,
                  isAlert: false,
                  note: 'Dừng kiểm tra trạm thu phí Định Quán',
                },
                {
                  time: '11:30',
                  temperature: 3.5,
                  humidity: 95.0,
                  isAlert: false,
                  note: 'Xuất phát từ Trạm Lạnh Đức Trọng',
                },
                {
                  time: '10:00',
                  temperature: 2.8,
                  humidity: 96.0,
                  isAlert: false,
                  note: 'Bốc hàng xong, Pre-cooling đạt chuẩn 2.8°C',
                },
              ],
            });
          }
        }
      } catch (err) {
        console.error('Error fetching telemetry:', err);
      } finally {
        if (isMounted) setLoadingTelemetry(false);
      }
    };
    fetchTelem();
    return () => {
      isMounted = false;
    };
  }, [selectedContractId, contracts]);

  // Fetch ePOD when epodContractId changes
  useEffect(() => {
    let isMounted = true;
    const fetchEpod = async () => {
      setLoadingEpod(true);
      try {
        const data = await getDeliveryProofApi(epodContractId);
        if (isMounted) {
          if (data) {
            setDeliveryProof(data);
          } else {
            const c = contracts.find((x) => x.id === epodContractId) || contracts[0];
            const loaded = c?.quantity || 5000;
            const shrinkage = Math.round(loaded * 0.012); // 1.2%
            const delivered = loaded - shrinkage;
            setDeliveryProof({
              contractId: epodContractId,
              contractCode: c?.contractCode || 'HD-2026-DL-001',
              shipmentCode: `SHP-2026-00${epodContractId}`,
              departedAt: '28/10/2026 11:30',
              deliveredAt: '28/10/2026 17:45',
              epodPhotoUrl:
                'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
              epodSignatureName: 'Nguyễn Hải Đăng (KCS Kho Bách Hóa Xanh)',
              epodSignatureData: 'ĐÃ XÁC NHẬN KÝ ĐIỆN TỬ QUA OTP - BIÊN BẢN SỐ KCS-08491',
              loadedWeightKg: loaded,
              deliveredWeightKg: delivered,
              naturalShrinkageKg: shrinkage,
              shrinkagePercent: 1.2,
              damagedWeightKg: 0,
              status: 'VERIFIED',
              spoilageClaim: undefined,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching epod:', err);
      } finally {
        if (isMounted) setLoadingEpod(false);
      }
    };
    fetchEpod();
    return () => {
      isMounted = false;
    };
  }, [epodContractId, contracts]);

  // Fetch Trace when traceLotCode changes
  useEffect(() => {
    let isMounted = true;
    const fetchTrace = async () => {
      setLoadingTrace(true);
      try {
        const data = await getLotTraceApi(traceLotCode);
        if (isMounted) {
          if (data) {
            setLotTrace(data);
          } else {
            const lot = lots.find((l) => l.lotCode === traceLotCode) || lots[0];
            setLotTrace({
              lotCode: traceLotCode,
              productName: lot?.productName || 'Bắp Cải Trái Tim Đà Lạt VietGAP',
              farmName: lot?.farmerName || 'HTX Nông Nghiệp Đà Lạt GAP',
              farmerType: 'Hợp tác xã nông nghiệp',
              pucCode: lot?.pucCode || 'VN-LDO-PUC-0849',
              farmAddress: 'Tiểu khu 158, Phường 8, TP. Đà Lạt, Tỉnh Lâm Đồng',
              certifications: 'VietGAP, GlobalGAP, OCOP 4 Sao',
              harvestDate: lot?.harvestDate || '2026-10-28',
              expiryDate: lot?.expiryDate || '2026-11-12',
              brixScore: 6.8,
              moisturePercent: 92.5,
              inspectionNotes:
                'Lô hàng đồng đều, búp cuốn chặt, không dư lượng thuốc BVTV, đủ chuẩn xuất siêu thị.',
              inspectorName: 'KS. Hoàng Minh Tuấn (Chi Cục Trồng Trọt & BVTV Lâm Đồng)',
              status: 'CERTIFIED_PASSED',
              imageUrl: lot?.imageUrl,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching trace:', err);
      } finally {
        if (isMounted) setLoadingTrace(false);
      }
    };
    fetchTrace();
    return () => {
      isMounted = false;
    };
  }, [traceLotCode, lots]);

  const handleCopyTraceLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/api/v1/farmer/trace/lot/${traceLotCode}`;
    navigator.clipboard?.writeText(url);
    setCopiedTraceUrl(true);
    setTimeout(() => setCopiedTraceUrl(false), 3000);
  };

  // Toggle simulate temperature breach
  const effectiveTelemetry: ColdChainTelemetry | null = telemetry
    ? {
        ...telemetry,
        currentTemp: isSimulatingBreach ? 9.2 : telemetry.currentTemp,
        isBreachAlert: isSimulatingBreach ? true : telemetry.isBreachAlert,
      }
    : null;

  // Filter allocations in tab 1
  const filteredAllocations =
    allocation?.allocations.filter((alloc) => {
      if (allocationFilter === 'PAID') return alloc.depositStatus === 'PAID';
      if (allocationFilter === 'TRANSIT') return alloc.shipmentStatus === 'IN_TRANSIT';
      if (allocationFilter === 'COMPLETED') return alloc.shipmentStatus === 'COMPLETED';
      return true;
    }) || [];

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER BANNER: ECO-FRESH & COLD-CHAIN TELEMETRY */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0C3E20] via-[#10542C] to-[#082B16] text-white p-6 sm:p-7 shadow-sm border border-emerald-900/50">
        {/* Ambient Mesh Glow & Watermark */}
        <div
          className="absolute -right-10 -bottom-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute right-6 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none hidden lg:block"
          aria-hidden="true"
        >
          <Truck className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Farmer Portal v2.0 • Post-Sale Supply Chain
              </span>
              <span className="text-emerald-300 text-xs flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                IoT Telemetry Bất Biến & Minh Bạch
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-white">
              Theo Dõi Lô Hàng Sau Bán & Chuỗi Lạnh Xe Lạnh
            </h2>

            <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
              Minh bạch hóa toàn bộ dòng lưu chuyển nông sản sau khi xuất vườn: Phân bổ sản lượng theo hợp đồng B2B, giám sát nhiệt độ xe lạnh bảo vệ quyền lợi nông dân, lưu trữ biên bản giao nhận điện tử ePOD và tem QR truy xuất.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (subTab === 'allocation') setSelectedLotId((prev) => prev);
                if (subTab === 'coldchain') setSelectedContractId((prev) => prev);
                if (subTab === 'epod') setEpodContractId((prev) => prev);
                if (subTab === 'trace') setTraceLotCode((prev) => prev);
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-white/60 active:scale-[0.98]"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Làm mới dữ liệu</span>
            </button>
          </div>
        </div>

        {/* SUBTAB NAVIGATION PILLS: GLASSMORPHISM PREMIUM */}
        <div className="relative z-10 flex items-center gap-2 mt-6 pt-5 border-t border-white/15 overflow-x-auto scrollbar-none flex-nowrap bg-black/10 p-2 rounded-2xl backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setSubTab('allocation')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-white/80 ${
              subTab === 'allocation'
                ? 'bg-white text-[#10542C] shadow-md font-black scale-[1.01]'
                : 'text-emerald-100/90 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-4 h-4" aria-hidden="true" />
            <span>1. Cây Phân Bổ Sản Lượng</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('coldchain')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-white/80 ${
              subTab === 'coldchain'
                ? 'bg-white text-[#10542C] shadow-md font-black scale-[1.01]'
                : 'text-emerald-100/90 hover:text-white hover:bg-white/10'
            }`}
          >
            <Truck className="w-4 h-4" aria-hidden="true" />
            <span>2. Tiến Trình Giao Nhận & Chuỗi Lạnh</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('epod')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-white/80 ${
              subTab === 'epod'
                ? 'bg-white text-[#10542C] shadow-md font-black scale-[1.01]'
                : 'text-emerald-100/90 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileCheck2 className="w-4 h-4" aria-hidden="true" />
            <span>3. Bằng Chứng ePOD & Hao Hụt</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('trace')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-white/80 ${
              subTab === 'trace'
                ? 'bg-white text-[#10542C] shadow-md font-black scale-[1.01]'
                : 'text-emerald-100/90 hover:text-white hover:bg-white/10'
            }`}
          >
            <QrCode className="w-4 h-4" aria-hidden="true" />
            <span>4. Tem QR Truy Xuất Nguồn Gốc</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUBTAB: CÂY PHÂN BỔ SẢN LƯỢNG (LOT ALLOCATION TREE) */}
      {/* ========================================================================= */}
      {subTab === 'allocation' && (
        <div className="space-y-5">
          {/* LỰA CHỌN LÔ HÀNG VỤ MÙA */}
          <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-2xl">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Chọn Lô Vụ Mùa Cần Xem Phân Bổ:
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {/* CUSTOM SELECT DROPDOWN POPOVER CHUẨN DESIGN SYSTEM UI/UX PRO MAX */}
                <div className="relative" ref={lotDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsLotDropdownOpen(!isLotDropdownOpen)}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white hover:bg-emerald-50/40 border border-[#DEE3DC] hover:border-[#10542C]/50 rounded-2xl text-xs font-bold text-gray-800 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs group min-w-[280px] sm:min-w-[400px] text-left"
                    aria-haspopup="listbox"
                    aria-expanded={isLotDropdownOpen}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#10542C] border border-emerald-200/70 flex items-center justify-center shrink-0 group-hover:bg-[#10542C] group-hover:text-white transition-colors duration-200">
                        <Sprout className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-xs text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                            {currentSelectedLot?.lotCode || 'LOT-2026-DL-001'}
                          </span>
                          <span className="font-extrabold text-xs text-gray-900 truncate">
                            {currentSelectedLot?.productName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                        {currentSelectedLot?.totalQuantity?.toLocaleString('vi-VN')} kg
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 group-hover:text-[#10542C] transition-transform duration-300 ${
                          isLotDropdownOpen ? 'rotate-180 text-[#10542C]' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </button>

                  {/* POPOVER MENU LIST */}
                  {isLotDropdownOpen && (
                    <div
                      className="absolute left-0 mt-2.5 w-full sm:w-[480px] bg-white/98 backdrop-blur-xl rounded-2xl shadow-xl shadow-emerald-950/15 border border-[#DEE3DC] p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                      role="listbox"
                    >
                      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <Layers className="w-3 h-3 text-[#10542C]" />
                          Danh Sách Lô Vụ Mùa Thu Hoạch
                        </span>
                        <span className="text-[10.5px] font-bold text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          {lots.length} Lô Vụ Mùa
                        </span>
                      </div>

                      <div className="space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                        {lots.map((lot) => {
                          const isSelected = lot.id === selectedLotId;

                          return (
                            <button
                              key={lot.id}
                              type="button"
                              onClick={() => {
                                setSelectedLotId(lot.id);
                                setIsLotDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left border ${
                                isSelected
                                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50/70 border-emerald-300 text-[#10542C] shadow-2xs font-bold'
                                  : 'bg-transparent border-transparent hover:bg-gray-50/80 hover:border-gray-100 text-gray-700'
                              }`}
                              role="option"
                              aria-selected={isSelected}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'bg-emerald-100 text-[#10542C]'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  <Sprout className="w-3.5 h-3.5" aria-hidden="true" />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-xs text-[#10542C]">
                                      {lot.lotCode}
                                    </span>
                                    <p className="truncate text-xs font-bold text-gray-900">
                                      {lot.productName}
                                    </p>
                                  </div>
                                  <p className="text-[10.5px] text-gray-500 font-normal mt-0.5">
                                    Thu hoạch: {lot.harvestDate || '28/10/2026'} &bull; Tiêu chuẩn VietGAP
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                <span className="font-mono font-bold text-xs text-gray-800 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-2xs">
                                  {lot.totalQuantity?.toLocaleString('vi-VN')} kg
                                </span>
                                {isSelected && (
                                  <div className="w-4 h-4 rounded-full bg-[#10542C] text-white flex items-center justify-center shrink-0 shadow-2xs">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {loadingAllocation && (
                  <span className="text-xs text-gray-400 flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#10542C]" aria-hidden="true" /> 
                    <span>Đang tải phân bổ...</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Mã PUC Nông Trại:</span>
              <span className="font-mono font-bold text-xs bg-emerald-50 text-[#10542C] px-3 py-1 rounded-lg border border-emerald-200">
                {allocation?.lotCode || 'VN-LDO-PUC-0849'}
              </span>
            </div>
          </div>

          {/* TIẾN ĐỘ PHÂN BỔ TỔNG THỂ */}
          {allocation && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-2xs space-y-2">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                  Tổng Sản Lượng Lô Thu Hoạch
                </span>
                <p className="text-2xl font-black text-gray-900 font-heading tabular-nums">
                  {allocation.totalWeightKg?.toLocaleString('vi-VN')}{' '}
                  <span className="text-sm font-normal text-gray-500">kg</span>
                </p>
                <p className="text-[11px] text-gray-500">
                  Sản lượng dự kiến thu hoạch theo quy chuẩn VietGAP / GlobalGAP
                </p>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider">
                    Đã Chốt Bán Qua HĐ B2B
                  </span>
                  <span className="text-xs font-black bg-emerald-100 text-[#10542C] px-2 py-0.5 rounded-full tabular-nums">
                    {allocation.soldPercentage}%
                  </span>
                </div>
                <p className="text-2xl font-black text-[#10542C] font-heading tabular-nums">
                  {allocation.allocatedWeightKg?.toLocaleString('vi-VN')}{' '}
                  <span className="text-sm font-normal text-gray-500">kg</span>
                </p>
                {/* Progress bar */}
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#10542C] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, allocation.soldPercentage)}%` }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-2xs space-y-2">
                <span className="text-xs text-blue-700 font-bold uppercase tracking-wider">
                  Khối Lượng Khả Dụng (Tồn Sẵn Sàng)
                </span>
                <p className="text-2xl font-black text-blue-900 font-heading tabular-nums">
                  {allocation.availableWeightKg?.toLocaleString('vi-VN')}{' '}
                  <span className="text-sm font-normal text-gray-500">kg</span>
                </p>
                <p className="text-[11px] text-gray-500">
                  Sẵn sàng tiếp nhận thêm đơn RFQ & cọc từ các hệ thống siêu thị / chợ đầu mối
                </p>
              </div>
            </div>
          )}

          {/* DANH SÁCH HỢP ĐỒNG TIÊU THỤ LÔ NÀY */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECE8] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-gray-900 font-heading">
                  Cây Phân Bổ Hợp Đồng B2B ({allocation?.allocations?.length || 0} Hợp đồng)
                </h3>
                <p className="text-xs text-gray-500">
                  Chi tiết từng đối tác thương lái và hệ thống phân phối đang nhận hàng từ lô này
                </p>
              </div>

              {/* FILTER PILLS */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(
                  [
                    { key: 'ALL', label: 'Tất cả' },
                    { key: 'PAID', label: 'Đã Cọc 20%' },
                    { key: 'TRANSIT', label: 'Đang Vận Chuyển' },
                    { key: 'COMPLETED', label: 'Đã Giao Xong' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setAllocationFilter(f.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                      allocationFilter === f.key
                        ? 'bg-[#10542C] text-white shadow-xs'
                        : 'bg-[#F4F5F1] text-gray-600 hover:bg-[#EAECE8]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px] tracking-wider">
                    <th className="p-3">Mã Hợp Đồng</th>
                    <th className="p-3">Bên Mua (Doanh Nghiệp / Thương Lái)</th>
                    <th className="p-3 text-right">Khối Lượng</th>
                    <th className="p-3 text-right">Đơn Giá</th>
                    <th className="p-3 text-right">Thành Tiền</th>
                    <th className="p-3 text-center">Bảo Chứng Cọc</th>
                    <th className="p-3 text-center">Vận Chuyển</th>
                    <th className="p-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAllocations.length > 0 ? (
                    filteredAllocations.map((alloc) => (
                      <tr key={alloc.contractId} className="hover:bg-emerald-50/40 transition">
                        <td className="p-3 font-mono font-bold text-[#10542C]">
                          {alloc.contractCode}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-gray-900">{alloc.buyerName}</p>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-400" aria-hidden="true" />
                            {alloc.destinationWarehouse}
                          </p>
                        </td>
                        <td className="p-3 text-right font-bold text-gray-900 tabular-nums">
                          {alloc.quantityKg?.toLocaleString('vi-VN')} kg
                        </td>
                        <td className="p-3 text-right text-gray-600 tabular-nums">
                          {formatVnd(alloc.unitPrice)}/kg
                        </td>
                        <td className="p-3 text-right font-black text-[#10542C] tabular-nums">
                          {formatVnd(alloc.totalAmount)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              alloc.depositStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {alloc.depositStatus === 'PAID' ? '✓ Đã Đặt Cọc' : 'Chờ Đặt Cọc'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                              alloc.shipmentStatus === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {alloc.shipmentStatus === 'COMPLETED'
                              ? '✓ Giao Thành Công'
                              : '🚚 Đang Vận Chuyển'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedContractId(alloc.contractId);
                                setSubTab('coldchain');
                              }}
                              className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-[#10542C] rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                              title="Xem giám sát nhiệt độ xe lạnh"
                            >
                              <Thermometer className="w-3 h-3" aria-hidden="true" />
                              <span>IoT Lạnh</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEpodContractId(alloc.contractId);
                                setSubTab('epod');
                              }}
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                              title="Xem biên bản giao nhận điện tử ePOD"
                            >
                              <FileCheck2 className="w-3 h-3" aria-hidden="true" />
                              <span>ePOD</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        Không tìm thấy hợp đồng nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUBTAB: GIÁM SÁT CHUỖI LẠNH IOT (COLD-CHAIN TELEMETRY) */}
      {/* ========================================================================= */}
      {subTab === 'coldchain' && (
        <div className="space-y-5">
          {/* LỰA CHỌN CHUYẾN XE & MÔ PHỎNG VI PHẠM */}
          <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-2xl">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Chọn Hợp Đồng / Chuyến Xe Vận Chuyển Cần Theo Dõi:
              </label>
              <div className="relative" ref={contractDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsContractDropdownOpen(!isContractDropdownOpen)}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white hover:bg-emerald-50/40 border border-[#DEE3DC] hover:border-[#10542C]/50 rounded-2xl text-xs font-bold text-gray-800 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs group min-w-[280px] sm:min-w-[420px] text-left"
                  aria-haspopup="listbox"
                  aria-expanded={isContractDropdownOpen}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#10542C] border border-emerald-200/70 flex items-center justify-center shrink-0 group-hover:bg-[#10542C] group-hover:text-white transition-colors duration-200">
                      <Truck className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-xs text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                          {currentSelectedContract?.contractCode || 'HD-2026-B2B-001'}
                        </span>
                        <span className="font-extrabold text-xs text-gray-900 truncate">
                          {currentSelectedContract?.buyerName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                      {currentSelectedContract?.quantity?.toLocaleString('vi-VN')} kg
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 group-hover:text-[#10542C] transition-transform duration-300 ${
                        isContractDropdownOpen ? 'rotate-180 text-[#10542C]' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {/* POPOVER MENU LIST CHO HỢP ĐỒNG / CHUYẾN XE */}
                {isContractDropdownOpen && (
                  <div
                    className="absolute left-0 mt-2.5 w-full sm:w-[500px] bg-white/98 backdrop-blur-xl rounded-2xl shadow-xl shadow-emerald-950/15 border border-[#DEE3DC] p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                    role="listbox"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Truck className="w-3 h-3 text-[#10542C]" />
                        Danh Sách Hợp Đồng & Chuyến Xe Giao Vận
                      </span>
                      <span className="text-[10.5px] font-bold text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {contracts.length} Chuyến Xe
                      </span>
                    </div>

                    <div className="space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                      {contracts.map((c) => {
                        const isSelected = c.id === selectedContractId;

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedContractId(c.id);
                              setIsContractDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left border ${
                              isSelected
                                ? 'bg-gradient-to-r from-emerald-50 to-teal-50/70 border-emerald-300 text-[#10542C] shadow-2xs font-bold'
                                : 'bg-transparent border-transparent hover:bg-gray-50/80 hover:border-gray-100 text-gray-700'
                            }`}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-emerald-100 text-[#10542C]'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-[#10542C]">
                                    {c.contractCode}
                                  </span>
                                  <p className="truncate text-xs font-bold text-gray-900">
                                    {c.buyerName}
                                  </p>
                                </div>
                                <p className="text-[10.5px] text-gray-500 font-normal mt-0.5">
                                  Kho nhận: {c.hubName || 'Kho Phân Phối Thủ Đức'} &bull; Hẹn giao: {c.hubDeliveryDate || '29/10/2026'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 ml-2">
                              <span className="font-mono font-bold text-xs text-gray-800 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-2xs">
                                {c.quantity?.toLocaleString('vi-VN')} kg
                              </span>
                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-[#10542C] text-white flex items-center justify-center shrink-0 shadow-2xs">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>Mã Vận Đơn:</span>
                <span className="font-mono font-bold text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded-lg border border-gray-200">
                  {effectiveTelemetry?.shipmentCode || 'SHP-2026-001'}
                </span>
              </div>

              {/* NÚT MÔ PHỎNG TEST VI PHẠM NHIỆT ĐỘ */}
              <button
                type="button"
                onClick={() => setIsSimulatingBreach(!isSimulatingBreach)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  isSimulatingBreach
                    ? 'bg-red-600 text-white border-red-700 shadow-sm animate-pulse'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                }`}
                title="Thử nghiệm phản ứng hệ thống khi nhiệt độ thùng xe vượt ngưỡng an toàn"
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {isSimulatingBreach
                    ? 'Tắt Mô Phỏng (Về Bình Thường)'
                    : '⚡ Test Cảnh Báo Đứt Gãy Chuỗi Lạnh'}
                </span>
              </button>
            </div>
          </div>

          {/* CẢNH BÁO VI PHẠM ĐỨT GÃY CHUỖI LẠNH HOẶC CHỨNG CHỈ ĐẠT CHUẨN */}
          {effectiveTelemetry?.isBreachAlert ? (
            <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 text-red-950 flex items-start gap-4 shadow-sm">
              <ShieldAlert className="w-7 h-7 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-heading font-black text-sm text-red-900 uppercase tracking-wide">
                    ⚠️ Cảnh Báo Vi Phạm Chuỗi Lạnh IoT — Bảo Vệ Quyền Lợi Nông Dân
                  </h4>
                  <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    Đã Khóa Bằng Chứng Bất Biến
                  </span>
                </div>
                <p className="text-xs text-red-800 leading-relaxed">
                  Cảm biến viễn trắc xe lạnh phát hiện nhiệt độ thùng đạt{' '}
                  <strong className="font-black text-red-900 underline">
                    {effectiveTelemetry.currentTemp}°C
                  </strong>
                  , vượt ngưỡng cam kết an toàn ({effectiveTelemetry.targetTempMin}°C -{' '}
                  {effectiveTelemetry.targetTempMax}°C). Hệ thống HoNa Fresh đã tự động ghi nhận mã băm
                  thời gian thực làm bằng chứng pháp lý xác định lỗi thuộc về đơn vị logistics (máy lạnh
                  hỏng hoặc tài xế tắt máy).
                </p>
                <div className="p-2.5 bg-red-100/80 rounded-xl text-[11px] font-bold text-red-900 flex items-center gap-2 border border-red-200">
                  <ShieldCheck className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                  <span>
                    Chính Sách HoNa Fresh: Hợp tác xã/Nông dân được miễn trừ 100% phạt hao hụt chất lượng,
                    được thanh toán đủ 100% tiền hàng từ quỹ ký quỹ logistics!
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-3xl p-4.5 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="text-xs">
                  <p className="font-black text-emerald-900 font-heading text-sm">
                    Chuỗi Lạnh Xe Lạnh Vận Hành Hoàn Hảo (100% Đạt Chuẩn)
                  </p>
                  <p className="text-emerald-800 mt-0.5">
                    Nhiệt độ thùng xe duy trì tối ưu ở mức{' '}
                    <strong className="text-[#10542C]">{effectiveTelemetry?.currentTemp}°C</strong> (chuẩn
                    2°C - 6°C), độ ẩm 94.2% giữ nguyên độ tươi giòn và lớp phấn tự nhiên của rau củ.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-black bg-[#10542C] text-white px-3 py-1 rounded-full shrink-0 shadow-xs text-center">
                LÔ HÀNG ĐƯỢC BẢO VỆ
              </span>
            </div>
          )}

          {/* THẺ ĐO LƯỜNG XE LẠNH REALTIME (4 METRIC CARDS) */}
          {effectiveTelemetry && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-2xs space-y-1.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Nhiệt Độ Thùng Lạnh
                </span>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-black font-heading tabular-nums ${
                      effectiveTelemetry.isBreachAlert ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {effectiveTelemetry.currentTemp}°C
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">
                    (Chuẩn: {effectiveTelemetry.targetTempMin}° - {effectiveTelemetry.targetTempMax}°C)
                  </span>
                </div>
                <p
                  className={`text-[11px] font-semibold ${
                    effectiveTelemetry.isBreachAlert ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {effectiveTelemetry.isBreachAlert
                    ? '⚠️ Cảm biến báo động vượt ngưỡng'
                    : '✓ Cảm biến IoT Calibrated ±0.1°C'}
                </p>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-2xs space-y-1.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Độ Ẩm Tương Đối Trong Thùng
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-blue-700 font-heading tabular-nums">
                    {effectiveTelemetry.currentHumidity}%
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">(Chuẩn &gt; 90%)</span>
                </div>
                <p className="text-[11px] text-blue-600 font-semibold">
                  ✓ Không làm héo lá non & mất nước tế bào
                </p>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-2xs space-y-1.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Phương Tiện & Xe Lạnh
                </span>
                <p className="text-base font-black text-gray-900 truncate">
                  {effectiveTelemetry.truckPlate}
                </p>
                <p className="text-[11px] text-gray-500">Thùng bảo ôn cách nhiệt kép Composite</p>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-2xs space-y-1.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Tài Xế Phụ Trách Hành Trình
                </span>
                <p className="text-base font-black text-gray-900 truncate">
                  {effectiveTelemetry.driverName}
                </p>
                <p className="text-[11px] text-gray-500 flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-emerald-600" aria-hidden="true" />{' '}
                  {effectiveTelemetry.driverPhone}
                </p>
              </div>
            </div>
          )}

          {/* DẢI ĐO NHIỆT ĐỘ AN TOÀN TRỰC QUAN (THERMAL SAFE ZONE GAUGE) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECE8] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-gray-900 font-heading flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  Dải Đo Nhiệt Độ Chuỗi Lạnh Rau Củ Quả Tươi
                </h3>
                <p className="text-xs text-gray-500">
                  Quy chuẩn kỹ thuật bảo quản sau thu hoạch: Vùng xanh lá là nhiệt độ tối ưu nhất để giữ trọn chất lượng
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-800 rounded-xl font-mono">
                Máy Lạnh: Thermo King T-1000R (ON)
              </span>
            </div>

            {/* DẢI MÀU NHIỆT ĐỘ */}
            <div className="space-y-2 pt-2">
              <div className="relative h-6 rounded-full overflow-hidden bg-gray-100 flex shadow-inner border border-gray-200">
                {/* Vùng quá lạnh: -2°C to 1.9°C (khoảng 25%) */}
                <div
                  style={{ width: '25%' }}
                  className="bg-blue-300 flex items-center justify-center text-[10px] font-bold text-blue-900"
                  title="Quá lạnh (Nguy cơ dập lá do đóng băng)"
                >
                  &lt; 2°C (Lạnh sâu)
                </div>
                {/* Vùng lý tưởng: 2°C to 6°C (khoảng 35%) */}
                <div
                  style={{ width: '35%' }}
                  className="bg-emerald-600 flex items-center justify-center text-[10px] font-black text-white"
                  title="VÙNG LÝ TƯỞNG NHẤT: Rau củ tươi giòn, không hô hấp mạnh"
                >
                  ✓ 2.0°C - 6.0°C (VÙNG AN TOÀN LÝ TƯỞNG)
                </div>
                {/* Vùng cảnh báo: 6°C to 8°C (khoảng 20%) */}
                <div
                  style={{ width: '20%' }}
                  className="bg-amber-400 flex items-center justify-center text-[10px] font-bold text-amber-950"
                  title="Cảnh báo: Rau bắt đầu thoát hơi nước"
                >
                  6.1°C - 8°C
                </div>
                {/* Vùng vi phạm: > 8°C (khoảng 20%) */}
                <div
                  style={{ width: '20%' }}
                  className="bg-red-500 flex items-center justify-center text-[10px] font-black text-white"
                  title="Nguy hiểm: Vi phạm chuỗi lạnh"
                >
                  &gt; 8°C (Vi Phạm)
                </div>
              </div>

              {/* KIM CHỈ NHIỆT ĐỘ HIỆN TẠI */}
              <div className="flex justify-between items-center text-[11px] text-gray-500 px-1 font-mono">
                <span>-2°C</span>
                <span className="text-emerald-700 font-bold font-sans">
                  Nhiệt độ hiện tại trong xe:{' '}
                  <strong className="text-base text-gray-900 tabular-nums font-heading">
                    {effectiveTelemetry?.currentTemp}°C
                  </strong>
                </span>
                <span>+12°C</span>
              </div>
            </div>
          </div>

          {/* TIẾN TRÌNH GIAO NHẬN & QUYẾT TOÁN ĐƠN HÀNG (ORDER FULFILLMENT & AUTO-SETTLEMENT TIMELINE) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECE8] shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-gray-900 font-heading flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#10542C]" aria-hidden="true" />
                  Tiến Trình Giao Nhận & Quyết Toán Đơn Hàng B2B
                </h3>
                <p className="text-xs text-gray-500">
                  Quy trình 6 mốc vận hành minh bạch • Kèm cơ chế tự động chuyển thành Hoàn Tất sau 48h nếu người mua quên xác nhận
                </p>
              </div>

              <div className="flex items-center gap-2">
                {fulfillmentStep === 4 ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 shadow-2xs">
                    <Timer className="w-3.5 h-3.5 text-amber-600 animate-pulse" aria-hidden="true" />
                    Đã Thu Tiền • Chờ xác nhận (Còn {hoursRemaining}h)
                  </span>
                ) : fulfillmentStep === 5 ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 shadow-2xs">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                    Khách Hàng Đã Xác Nhận Nghiệm Thu
                  </span>
                ) : fulfillmentStep === 6 ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-[#10542C] font-bold text-xs rounded-xl border border-emerald-200 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    Đơn Hoàn Tất • Quyết Toán Thành Công
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-800 font-bold text-xs rounded-xl border border-gray-200">
                    <Package className="w-3.5 h-3.5 text-gray-600" aria-hidden="true" />
                    Đang chuẩn bị & xuất kho
                  </span>
                )}
              </div>
            </div>

            {/* ROUTE STEPPER TIMELINE (6 BƯỚC CHUẨN THỰC TẾ) */}
            <div className="relative py-4 px-2">
              {/* Line connector background */}
              <div className="absolute top-9 left-8 right-8 h-1 bg-gray-200 hidden lg:block -z-0" />
              {/* Active line connector */}
              <div
                className="absolute top-9 left-8 h-1 bg-[#10542C] transition-all duration-500 hidden lg:block -z-0"
                style={{
                  width:
                    fulfillmentStep === 1
                      ? '10%'
                      : fulfillmentStep === 2
                      ? '26%'
                      : fulfillmentStep === 3
                      ? '45%'
                      : fulfillmentStep === 4
                      ? '65%'
                      : fulfillmentStep === 5
                      ? '83%'
                      : '94%',
                }}
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 relative z-10">
                {/* MỐC 1: ĐÃ TIẾP NHẬN */}
                <div
                  onClick={() => setFulfillmentStep(1)}
                  className="flex flex-col items-center text-center gap-2 cursor-pointer group p-2 rounded-2xl hover:bg-emerald-50/50 transition"
                  title="Nhấn để xem trạng thái Bước 1"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ring-4 ring-white transition-all ${
                      fulfillmentStep >= 1
                        ? 'bg-[#10542C] text-white shadow-emerald-900/20'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {fulfillmentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
                  </div>
                  <div>
                    <p className={`font-bold text-xs ${fulfillmentStep >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                      1. Đã Tiếp Nhận
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">10:00 • 28/10</p>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      Cọc Escrow 30%
                    </span>
                  </div>
                </div>

                {/* MỐC 2: ĐÃ ĐÓNG GÓI */}
                <div
                  onClick={() => setFulfillmentStep(2)}
                  className="flex flex-col items-center text-center gap-2 cursor-pointer group p-2 rounded-2xl hover:bg-emerald-50/50 transition"
                  title="Nhấn để xem trạng thái Bước 2"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ring-4 ring-white transition-all ${
                      fulfillmentStep >= 2
                        ? 'bg-[#10542C] text-white shadow-emerald-900/20'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {fulfillmentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
                  </div>
                  <div>
                    <p className={`font-bold text-xs ${fulfillmentStep >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                      2. Đã Đóng Gói
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">11:30 • 28/10</p>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      KCS & Tem QR
                    </span>
                  </div>
                </div>

                {/* MỐC 3: ĐẾN KHU VẬN CHUYỂN */}
                <div
                  onClick={() => setFulfillmentStep(3)}
                  className="flex flex-col items-center text-center gap-2 cursor-pointer group p-2 rounded-2xl hover:bg-emerald-50/50 transition"
                  title="Nhấn để xem trạng thái Bước 3"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ring-4 ring-white transition-all ${
                      fulfillmentStep >= 3
                        ? 'bg-[#10542C] text-white shadow-emerald-900/20'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {fulfillmentStep > 3 ? <Check className="w-4 h-4" /> : '3'}
                  </div>
                  <div>
                    <p className={`font-bold text-xs ${fulfillmentStep >= 3 ? 'text-gray-900' : 'text-gray-400'}`}>
                      3. Đến Khu Vận Chuyển
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">13:00 • 28/10</p>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      Bàn giao xe tải
                    </span>
                  </div>
                </div>

                {/* MỐC 4: ĐÃ GIAO & THU TIỀN */}
                <div
                  onClick={() => setFulfillmentStep(4)}
                  className="flex flex-col items-center text-center gap-2 cursor-pointer group p-2 rounded-2xl hover:bg-amber-50/50 transition"
                  title="Nhấn để xem trạng thái Bước 4 (Đã giao & thu tiền)"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ring-4 ring-white transition-all ${
                      fulfillmentStep >= 4
                        ? 'bg-[#10542C] text-white shadow-md'
                        : 'bg-gray-200 text-gray-500'
                    } ${fulfillmentStep === 4 ? 'animate-pulse ring-4 ring-amber-300' : ''}`}
                  >
                    {fulfillmentStep > 4 ? <Check className="w-4 h-4" /> : '4'}
                  </div>
                  <div>
                    <p className={`font-bold text-xs ${fulfillmentStep >= 4 ? 'text-gray-900' : 'text-gray-400'}`}>
                      4. Đã Giao & Thu Tiền
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">17:45 • 28/10</p>
                    <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Đã ký ePOD & Thu 100%
                    </span>
                  </div>
                </div>

                {/* MỐC 5: KHÁCH XÁC NHẬN */}
                <div
                  onClick={() => setFulfillmentStep(5)}
                  className="flex flex-col items-center text-center gap-2 cursor-pointer group p-2 rounded-2xl hover:bg-blue-50/50 transition"
                  title="Nhấn để xem trạng thái Bước 5 (Khách xác nhận)"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ring-4 ring-white transition-all ${
                      fulfillmentStep >= 5
                        ? 'bg-[#10542C] text-white shadow-emerald-900/20'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {fulfillmentStep > 5 ? <Check className="w-4 h-4" /> : '5'}
                  </div>
                  <div>
                    <p className={`font-bold text-xs ${fulfillmentStep >= 5 ? 'text-gray-900' : 'text-gray-400'}`}>
                      5. Khách Xác Nhận
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      {fulfillmentStep >= 5 ? '18:15 • 28/10' : 'Chờ xác nhận'}
                    </p>
                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      Nghiệm thu nông sản
                    </span>
                  </div>
                </div>

                {/* MỐC 6: HOÀN TẤT ĐƠN */}
                <div
                  onClick={() => setFulfillmentStep(6)}
                  className="flex flex-col items-center text-center gap-2 cursor-pointer group p-2 rounded-2xl hover:bg-emerald-50/50 transition"
                  title="Nhấn để xem trạng thái Bước 6 (Đơn Hoàn Tất)"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ring-4 ring-white transition-all ${
                      fulfillmentStep === 6
                        ? 'bg-emerald-600 text-white shadow-md ring-4 ring-emerald-200'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {fulfillmentStep === 6 ? <Award className="w-4 h-4" /> : '6'}
                  </div>
                  <div>
                    <p className={`font-bold text-xs ${fulfillmentStep === 6 ? 'text-[#10542C] font-black' : 'text-gray-400'}`}>
                      6. Hoàn Tất Đơn
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      {fulfillmentStep === 6 ? 'Tất toán thành công' : 'Giải ngân ví'}
                    </p>
                    <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Tiền về STK
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* KHỐI QUY ĐỊNH BẢO HỘ 48H & BẢNG ĐIỀU KHIỂN MÔ PHỎNG NGHIỆP VỤ */}
            <div className="bg-gradient-to-r from-emerald-50/70 via-[#F8FAF7] to-amber-50/50 rounded-2xl p-4 sm:p-5 border border-emerald-200/80 space-y-3.5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100/80 text-[#10542C] rounded-xl shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                      Quy Định Khiếu Nại Đổi Trả & Cơ Chế Tự Động Hoàn Tất (Auto-Settlement)
                    </h4>
                    <p className="text-[11px] sm:text-xs text-gray-600 leading-relaxed mt-1">
                      Kể từ khi giao hàng thành công & đã thu tiền (<strong>Mốc 4</strong>), người mua có <strong>48 giờ</strong> để kiểm tra nông sản. Nếu khách hàng hài lòng bấm xác nhận hoặc <strong>quên bấm xác nhận sau 48 giờ</strong> (không phát sinh khiếu nại đổi trả), hệ thống sàn sẽ <strong>tự động chuyển thành Hoàn Tất (Mốc 6)</strong> và giải ngân ngay về ví tiền người bán.
                    </p>
                  </div>
                </div>
              </div>

              {/* TRẠNG THÁI HIỆN TẠI & NÚT MÔ PHỎNG CHO NHÓM ĐỒ ÁN DEMO */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-emerald-200/60">
                <div className="flex items-center gap-2">
                  {fulfillmentStep === 4 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-100/70 px-3 py-1.5 rounded-xl border border-amber-300">
                      <Clock className="w-4 h-4 text-amber-700 animate-spin" />
                      <span>
                        Đồng hồ bảo hộ: Còn <strong>{hoursRemaining} giờ</strong> &bull; Tự động kích hoạt Hoàn Tất nếu người mua quên bấm
                      </span>
                    </div>
                  )}
                  {fulfillmentStep === 5 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 bg-blue-100/70 px-3 py-1.5 rounded-xl border border-blue-300">
                      <UserCheck className="w-4 h-4 text-blue-700" />
                      <span>
                        Người mua đã kiểm tra thực tế và bấm <strong>&quot;Xác nhận nhận hàng đạt chuẩn&quot;</strong>
                      </span>
                    </div>
                  )}
                  {fulfillmentStep === 6 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-300">
                      <Award className="w-4 h-4 text-emerald-700" />
                      <span>
                        {autoCompleteType === 'AUTO_48H'
                          ? 'Đã tự động chuyển Hoàn Tất do quá hạn 48 giờ quy định (Người mua không khiếu nại)'
                          : 'Đã hoàn tất hợp đồng thành công theo xác nhận của bên mua'} &bull; Doanh thu đã vào ví
                      </span>
                    </div>
                  )}
                  {fulfillmentStep < 4 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-300">
                      <Truck className="w-4 h-4 text-gray-600" />
                      <span>Đơn hàng đang trong tiến trình chuẩn bị nông sản và xuất kho vận chuyển</span>
                    </div>
                  )}
                </div>

                {/* CÁC NÚT MÔ PHỎNG DEMO TRÌNH BÀY ĐỒ ÁN */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:inline">
                    Mô phỏng đồ án:
                  </span>
                  
                  {fulfillmentStep !== 5 && fulfillmentStep !== 6 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFulfillmentStep(5);
                        setAutoCompleteType('MANUAL');
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Khách bấm nhận ngay
                    </button>
                  )}

                  {fulfillmentStep !== 6 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFulfillmentStep(6);
                        setAutoCompleteType('AUTO_48H');
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                    >
                      <Timer className="w-3.5 h-3.5" />
                      Quá hạn 48h (Tự Động Hoàn Tất)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setFulfillmentStep(4);
                      setAutoCompleteType('IN_PROGRESS');
                      setHoursRemaining(38);
                    }}
                    className="p-1.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-600 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                    title="Đặt lại về Bước 4 (Đang chờ 48h)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* WIDGET THÔNG SỐ NGHIỆP VỤ BENTO CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#F8F9FA] rounded-2xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-500 font-semibold flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Hình Thức Thu Tiền:
                </span>
                <p className="font-bold text-gray-900 mt-0.5 tabular-nums">
                  Đã thu đủ 100% (30% Cọc Escrow + 70% Thu Tiền/Chuyển Khoản)
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Biên bản ePOD số: KCS-08491</p>
              </div>
              <div>
                <span className="text-gray-500 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Thời Hạn Đổi Trả Khiếu Nại:
                </span>
                <p className="font-bold text-amber-800 mt-0.5 tabular-nums">
                  48 Giờ Quy Định (Bảo Hộ Nông Dân)
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Hết 48h tự động quyết toán nếu khách quên bấm</p>
              </div>
              <div>
                <span className="text-gray-500 font-semibold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[#10542C]" />
                  Quyết Toán Về Ví Tiền:
                </span>
                <p className="font-bold text-[#10542C] mt-0.5 tabular-nums">
                  {formatVnd ? formatVnd(58425000) : '58.425.000 đ'} &bull; Sẵn Sàng Rút
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Tự động cộng vào Số Dư Khả Dụng</p>
              </div>
            </div>
          </div>

          {/* BẢNG LOG VIỄN TRẮC IOT (TIME-SERIES SENSOR LOG) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECE8] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 font-heading">
                Nhật Ký Viễn Trắc Cảm Biến IoT Theo Thời Gian Thực
              </h3>
              <span className="text-[11px] text-gray-500 font-mono">Tần suất ghi nhận: 15 phút / lần</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px] tracking-wider">
                    <th className="p-3">Thời Gian Ghi Nhận</th>
                    <th className="p-3 text-right">Nhiệt Độ Thùng (°C)</th>
                    <th className="p-3 text-right">Độ Ẩm (%)</th>
                    <th className="p-3 text-center">Đánh Giá Ngưỡng</th>
                    <th className="p-3">Ghi Chú Hành Trình</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {effectiveTelemetry?.logs && effectiveTelemetry.logs.length > 0 ? (
                    effectiveTelemetry.logs.map((log, idx) => (
                      <tr
                        key={idx}
                        className={
                          log.isAlert || (isSimulatingBreach && idx === 0)
                            ? 'bg-red-50/60'
                            : 'hover:bg-gray-50 transition'
                        }
                      >
                        <td className="p-3 font-mono font-bold text-gray-800 flex items-center gap-1.5 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
                          {log.time}
                        </td>
                        <td
                          className={`p-3 text-right font-black tabular-nums ${
                            log.isAlert || (isSimulatingBreach && idx === 0)
                              ? 'text-red-700 font-heading text-sm'
                              : 'text-emerald-800'
                          }`}
                        >
                          {isSimulatingBreach && idx === 0 ? '9.2' : log.temperature.toFixed(1)}°C
                        </td>
                        <td className="p-3 text-right font-bold text-blue-700 tabular-nums">
                          {log.humidity.toFixed(1)}%
                        </td>
                        <td className="p-3 text-center">
                          {log.isAlert || (isSimulatingBreach && idx === 0) ? (
                            <span className="bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                              ⚠️ Vi Phạm
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                              ✓ Đạt Chuẩn
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-700 text-[11px]">
                          {isSimulatingBreach && idx === 0
                            ? 'Máy phát xe lạnh sụt điện áp tạm thời, hệ thống tự kích hoạt bảo vệ nông dân'
                            : log.note}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-400">
                        Chưa có dữ liệu cảm biến cho chuyến xe này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUBTAB: BẰNG CHỨNG EPOD & GIÁM ĐỊNH HAO HỤT */}
      {/* ========================================================================= */}
      {subTab === 'epod' && (
        <div className="space-y-5">
          {/* LỰA CHỌN HỢP ĐỒNG */}
          <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-2xl">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Chọn Hợp Đồng B2B Cần Xem Biên Bản Giao Hàng ePOD:
              </label>
              <div className="relative" ref={epodDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsEpodDropdownOpen(!isEpodDropdownOpen)}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white hover:bg-emerald-50/40 border border-[#DEE3DC] hover:border-[#10542C]/50 rounded-2xl text-xs font-bold text-gray-800 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs group min-w-[280px] sm:min-w-[420px] text-left"
                  aria-haspopup="listbox"
                  aria-expanded={isEpodDropdownOpen}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#10542C] border border-emerald-200/70 flex items-center justify-center shrink-0 group-hover:bg-[#10542C] group-hover:text-white transition-colors duration-200">
                      <FileCheck2 className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-xs text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                          {currentEpodContract?.contractCode || 'HD-2026-B2B-001'}
                        </span>
                        <span className="font-extrabold text-xs text-gray-900 truncate">
                          {currentEpodContract?.buyerName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                      {currentEpodContract?.hubDeliveryDate || '29/10/2026'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 group-hover:text-[#10542C] transition-transform duration-300 ${
                        isEpodDropdownOpen ? 'rotate-180 text-[#10542C]' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {/* POPOVER MENU LIST CHO EPOD */}
                {isEpodDropdownOpen && (
                  <div
                    className="absolute left-0 mt-2.5 w-full sm:w-[500px] bg-white/98 backdrop-blur-xl rounded-2xl shadow-xl shadow-emerald-950/15 border border-[#DEE3DC] p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                    role="listbox"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <FileCheck2 className="w-3 h-3 text-[#10542C]" />
                        Danh Sách Hợp Đồng Có Biên Bản Ký ePOD
                      </span>
                      <span className="text-[10.5px] font-bold text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {contracts.length} Hồ Sơ
                      </span>
                    </div>

                    <div className="space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                      {contracts.map((c) => {
                        const isSelected = c.id === epodContractId;

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setEpodContractId(c.id);
                              setIsEpodDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left border ${
                              isSelected
                                ? 'bg-gradient-to-r from-emerald-50 to-teal-50/70 border-emerald-300 text-[#10542C] shadow-2xs font-bold'
                                : 'bg-transparent border-transparent hover:bg-gray-50/80 hover:border-gray-100 text-gray-700'
                            }`}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-emerald-100 text-[#10542C]'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-[#10542C]">
                                    {c.contractCode}
                                  </span>
                                  <p className="truncate text-xs font-bold text-gray-900">
                                    {c.buyerName}
                                  </p>
                                </div>
                                <p className="text-[10.5px] text-gray-500 font-normal mt-0.5">
                                  Ngày giao: {c.hubDeliveryDate || '29/10/2026'} &bull; Sản lượng: {c.quantity?.toLocaleString('vi-VN')} kg
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 ml-2">
                              <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                                Đã ký ePOD
                              </span>
                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-[#10542C] text-white flex items-center justify-center shrink-0 shadow-2xs">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Trạng Thái Biên Bản:</span>
              <span className="font-bold text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                ✓ Đã Ký Nhận KCS Điện Tử
              </span>
            </div>
          </div>

          {/* NỘI DUNG BIÊN BẢN EPOD */}
          {deliveryProof && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* CỘT TRÁI: THÔNG SỐ CÂN ĐỐI TRỌNG LƯỢNG & HAO HỤT */}
              <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-2xs space-y-5">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-black text-base text-[#10542C] flex items-center gap-2">
                      <Scale className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                      Biên Bản Đối Soát Trọng Lượng & Hao Hụt
                    </h3>
                    <p className="text-xs text-gray-500">Mã vận đơn: {deliveryProof.shipmentCode}</p>
                  </div>
                  <span className="font-mono font-bold text-[11px] bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200">
                    Mẫu KCS-01/B2B
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Khối lượng cân xuất vườn (Loaded):</span>
                    <strong className="text-gray-900 tabular-nums">
                      {deliveryProof.loadedWeightKg?.toLocaleString('vi-VN')} kg
                    </strong>
                  </div>

                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Khối lượng thực nhận tại kho đích:</span>
                    <strong className="text-[#10542C] font-black tabular-nums">
                      {deliveryProof.deliveredWeightKg?.toLocaleString('vi-VN')} kg
                    </strong>
                  </div>

                  <div className="flex justify-between py-2 border-b border-gray-100 bg-amber-50/70 p-2.5 rounded-xl">
                    <span className="text-amber-900 font-bold">Hao hụt tự nhiên (Thoát hơi nước):</span>
                    <strong className="text-amber-900 font-black tabular-nums">
                      {deliveryProof.naturalShrinkageKg} kg ({deliveryProof.shrinkagePercent}%)
                    </strong>
                  </div>

                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Khối lượng dập nát / hư hỏng (QC loại):</span>
                    <strong className="text-emerald-700 font-bold tabular-nums">
                      {deliveryProof.damagedWeightKg} kg (0%)
                    </strong>
                  </div>

                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Thời gian dỡ hàng và nghiệm thu:</span>
                    <strong className="text-gray-800 font-mono">{deliveryProof.deliveredAt}</strong>
                  </div>
                </div>

                {/* THƯỚC ĐO HAO HỤT TỰ NHIÊN TRỰC QUAN */}
                <div className="space-y-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-950">Thước Đo Hao Hụt Tự Nhiên:</span>
                    <span className="font-black text-[#10542C] tabular-nums">
                      {deliveryProof.shrinkagePercent}% / Tối đa cho phép 2.0%
                    </span>
                  </div>

                  <div className="w-full bg-emerald-200/60 h-3 rounded-full overflow-hidden p-0.5">
                    <div
                      className="bg-[#10542C] h-full rounded-full transition-all duration-500"
                      style={{ width: `${(deliveryProof.shrinkagePercent / 2.0) * 100}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    ✓ <strong>Đạt chuẩn nghiệm thu B2B:</strong> Mức hao hụt {deliveryProof.shrinkagePercent}% nằm
                    dưới ngưỡng định mức tự nhiên cho phép (≤ 2.0%). Nông dân được thanh toán toàn bộ 100% giá
                    trị hợp đồng không bị khấu trừ bất kỳ khoản phạt nào.
                  </p>
                </div>
              </div>

              {/* CỘT PHẢI: ẢNH HIỆN TRƯỜNG DỠ HÀNG & CHỮ KÝ KCS */}
              <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-2xs space-y-5">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-black text-base text-gray-900 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-gray-600" aria-hidden="true" />
                      Bằng Chứng Hình Ảnh & Ký Nhận Điện Tử
                    </h3>
                    <p className="text-xs text-gray-500">Chụp thực tế tại cầu dỡ hàng kho phân phối</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Phóng To Ảnh</span>
                  </button>
                </div>

                {/* ẢNH HIỆN TRƯỜNG */}
                <div
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="relative rounded-2xl overflow-hidden border border-gray-200 h-48 bg-gray-100 cursor-pointer group"
                >
                  <img
                    src={deliveryProof.epodPhotoUrl}
                    alt="ePOD hiện trường dỡ hàng sọt rau củ tại kho"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                    <Eye className="w-4 h-4" aria-hidden="true" /> Nhấp để xem chi tiết ảnh
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-xs">
                    Ảnh chụp đối soát KCS lúc {deliveryProof.deliveredAt}
                  </div>
                </div>

                {/* CHỮ KÝ SỐ KCS */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Xác Nhận Ký Số Điện Tử Của Bên Nhận
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ✓ OTP Verified
                    </span>
                  </div>
                  <p className="font-bold text-xs text-gray-900">{deliveryProof.epodSignatureName}</p>
                  <p className="font-mono text-[10px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-100 break-all">
                    {deliveryProof.epodSignatureData}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* LIGHTBOX MODAL PHÓNG TO ẢNH */}
          {isPhotoModalOpen && deliveryProof && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-200 space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-black text-base text-gray-900">
                    Ảnh Hiện Trường Cầu Dỡ Hàng • Vận Đơn {deliveryProof.shipmentCode}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(false)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="rounded-2xl overflow-hidden border border-gray-200 max-h-[60vh]">
                  <img
                    src={deliveryProof.epodPhotoUrl}
                    alt="ePOD chi tiết dỡ hàng"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Chụp lúc: {deliveryProof.deliveredAt}</span>
                  <span className="font-bold text-emerald-800">Người ký nhận: {deliveryProof.epodSignatureName}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUBTAB: TEM QR TRUY XUẤT NGUỒN GỐC CÔNG KHAI (LOT TRACE) */}
      {/* ========================================================================= */}
      {subTab === 'trace' && (
        <div className="space-y-5">
          {/* LỰA CHỌN LÔ HÀNG & NÚT IN TEM */}
          <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-2xl">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Chọn Lô Vụ Mùa Cần Tạo / In Tem QR:
              </label>
              <div className="relative" ref={traceDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsTraceDropdownOpen(!isTraceDropdownOpen)}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white hover:bg-emerald-50/40 border border-[#DEE3DC] hover:border-[#10542C]/50 rounded-2xl text-xs font-bold text-gray-800 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs group min-w-[280px] sm:min-w-[420px] text-left"
                  aria-haspopup="listbox"
                  aria-expanded={isTraceDropdownOpen}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#10542C] border border-emerald-200/70 flex items-center justify-center shrink-0 group-hover:bg-[#10542C] group-hover:text-white transition-colors duration-200">
                      <QrCode className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-xs text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                          {currentTraceLot?.lotCode || 'LOT-2026-DL-001'}
                        </span>
                        <span className="font-extrabold text-xs text-gray-900 truncate">
                          {currentTraceLot?.productName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                      {currentTraceLot?.totalQuantity?.toLocaleString('vi-VN')} kg
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 group-hover:text-[#10542C] transition-transform duration-300 ${
                        isTraceDropdownOpen ? 'rotate-180 text-[#10542C]' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {/* POPOVER MENU LIST CHO TRACE QR */}
                {isTraceDropdownOpen && (
                  <div
                    className="absolute left-0 mt-2.5 w-full sm:w-[500px] bg-white/98 backdrop-blur-xl rounded-2xl shadow-xl shadow-emerald-950/15 border border-[#DEE3DC] p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                    role="listbox"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <QrCode className="w-3 h-3 text-[#10542C]" />
                        Danh Sách Lô Hàng Tạo Tem QR
                      </span>
                      <span className="text-[10.5px] font-bold text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {lots.length} Lô Vụ Mùa
                      </span>
                    </div>

                    <div className="space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                      {lots.map((l) => {
                        const isSelected = l.lotCode === traceLotCode;

                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => {
                              setTraceLotCode(l.lotCode);
                              setIsTraceDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left border ${
                              isSelected
                                ? 'bg-gradient-to-r from-emerald-50 to-teal-50/70 border-emerald-300 text-[#10542C] shadow-2xs font-bold'
                                : 'bg-transparent border-transparent hover:bg-gray-50/80 hover:border-gray-100 text-gray-700'
                            }`}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-emerald-100 text-[#10542C]'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-[#10542C]">
                                    {l.lotCode}
                                  </span>
                                  <p className="truncate text-xs font-bold text-gray-900">
                                    {l.productName}
                                  </p>
                                </div>
                                <p className="text-[10.5px] text-gray-500 font-normal mt-0.5">
                                  PUC: {l.pucCode || 'VN-LDO-PUC-0849'} &bull; Tiêu chuẩn VietGAP
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 ml-2">
                              <span className="font-mono font-bold text-xs text-gray-800 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-2xs">
                                {l.totalQuantity?.toLocaleString('vi-VN')} kg
                              </span>
                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-[#10542C] text-white flex items-center justify-center shrink-0 shadow-2xs">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* CHỌN KHỔ TEM */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLabelSize('DECAL_100X75')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    labelSize === 'DECAL_100X75' ? 'bg-white text-[#10542C] shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Decal 100x75mm
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize('A4_SHEET')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    labelSize === 'A4_SHEET' ? 'bg-white text-[#10542C] shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Khổ Giấy A4
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyTraceLink}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#10542C] border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{copiedTraceUrl ? '✓ Đã Sao Chép Link' : 'Sao Chép Link Tra Cứu'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                className="px-3.5 py-2 bg-[#10542C] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                <span>In Tem Dán Sọt ({labelSize === 'DECAL_100X75' ? 'Decal' : 'A4'})</span>
              </button>
            </div>
          </div>

          {/* KHUNG TEM QR TRUY XUẤT NGUỒN GỐC CHUẨN DECAL IN ẤN */}
          {lotTrace && (
            <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-600 shadow-xl space-y-6 relative">
              {/* WATERMARK HUY HIỆU NÔNG SẢN */}
              <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                <Award className="w-32 h-32 text-emerald-800" aria-hidden="true" />
              </div>

              {/* TEM HEADER */}
              <div className="text-center border-b-2 border-emerald-600 pb-4 space-y-1">
                <div className="flex items-center justify-center gap-2 text-[#10542C]">
                  <span className="font-heading font-black text-lg tracking-wider uppercase">
                    TEM TRUY XUẤT NGUỒN GỐC NÔNG SẢN VIỆT NAM
                  </span>
                </div>
                <p className="text-[11px] text-gray-600">
                  Chuẩn hóa theo Quyết định số 100/QĐ-TTg & Hệ thống Giám sát Chuỗi Lạnh HoNa Fresh
                </p>
              </div>

              {/* THÔNG TIN CHÍNH + MÃ QR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                {/* QR CODE BOX */}
                <div className="flex flex-col items-center justify-center p-4 bg-[#F8F9FA] rounded-2xl border border-gray-200 text-center space-y-2">
                  <div className="w-36 h-36 bg-white p-2 rounded-xl shadow-xs border border-gray-200 flex items-center justify-center relative">
                    {/* SVG QR Code Simulation with Center Logo */}
                    <div className="relative w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-lg p-2">
                      <QrCode className="w-24 h-24 text-gray-900" aria-hidden="true" />
                      <span className="text-[8px] font-mono text-gray-500 mt-1">QUÉT ĐỂ XÁC MINH</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[11px] text-[#10542C]">
                    {lotTrace.lotCode}
                  </span>
                </div>

                {/* THÔNG TIN VÙNG TRỒNG & SẢN PHẨM */}
                <div className="sm:col-span-2 space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Tên Nông Sản:</span>
                    <p className="font-heading font-black text-base text-[#10542C]">{lotTrace.productName}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Đơn Vị Sản Xuất:</span>
                    <p className="font-bold text-gray-900">{lotTrace.farmName}</p>
                    <p className="text-[11px] text-gray-500">{lotTrace.farmAddress}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Mã Vùng Trồng PUC:</span>
                      <p className="font-mono font-bold text-emerald-800">{lotTrace.pucCode}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Tiêu Chuẩn:</span>
                      <p className="font-bold text-emerald-700">{lotTrace.certifications}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Ngày Thu Hoạch:</span>
                      <p className="font-bold text-gray-800 tabular-nums">{lotTrace.harvestDate}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Hạn Bảo Quản (FEFO):</span>
                      <p className="font-bold text-gray-800 tabular-nums">{lotTrace.expiryDate}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER CHỨNG NHẬN QC */}
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-[11px] text-emerald-950 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold tabular-nums">
                    Độ ngọt Brix: {lotTrace.brixScore}°Bx • Độ ẩm: {lotTrace.moisturePercent}%
                  </span>
                  <span className="bg-[#10542C] text-white font-bold text-[9px] px-2 py-0.5 rounded-full">
                    KCS PASSED
                  </span>
                </div>
                <p className="text-gray-600 text-[10px]">
                  Kiểm định viên: <strong>{lotTrace.inspectorName}</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}