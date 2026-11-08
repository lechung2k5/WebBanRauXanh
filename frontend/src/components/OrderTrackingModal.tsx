'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  Package,
  AlertCircle,
  RotateCcw,
  Receipt,
  UserCheck,
  ShieldCheck,
  FileText,
  ChevronRight,
  Filter,
  RefreshCw,
  Thermometer,
  Droplets,
  Scale,
  MapPin,
  Phone,
  User,
  Calendar,
  ExternalLink,
  Printer,
  Star,
  ThumbsUp,
  AlertTriangle,
  BadgeCheck,
  Layers,
  Sparkles,
  ArrowUpRight,
  ChevronDown,
} from 'lucide-react';
import {
  OrderResponse,
  B2BContract,
  QcInspection,
  ColdChainTelemetry,
  DeliveryProof,
} from '@/types';
import { getOrderByCode, getUserOrdersApi } from '@/services/api';
import {
  getFarmerContractsApi,
  getContractQcApi,
  getColdChainTelemetryApi,
  getDeliveryProofApi,
  getContractPrintUrl,
  saveLocalContract,
  FALLBACK_CONTRACTS,
  FALLBACK_QC_MAP,
} from '@/services/farmerApi';
import { useApp } from '@/context/AppContext';

export interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReorder?: (items: OrderResponse['items']) => void;
  initialTab?: 'b2b' | 'retail';
  defaultQuery?: string;
}

const DEFAULT_TELEMETRY: ColdChainTelemetry = {
  contractId: 1,
  contractCode: 'HD-2026-B2B-0104',
  shipmentCode: 'SHIP-COLD-2026-009',
  truckPlate: '49C-289.45 (Xe Lạnh Isuzu 3.5T)',
  driverName: 'Trần Văn Mạnh',
  driverPhone: '0978 123 456',
  currentTemp: 3.2,
  currentHumidity: 88,
  targetTempMin: 2.0,
  targetTempMax: 6.0,
  isBreachAlert: false,
  shipmentStatus: 'IN_TRANSIT',
  logs: [
    { time: '06:00', temperature: 3.0, humidity: 89, isAlert: false, note: 'Rời kho lạnh Đà Lạt' },
    { time: '07:30', temperature: 3.2, humidity: 88, isAlert: false, note: 'Đèo Bảo Lộc an toàn' },
    { time: '09:00', temperature: 3.4, humidity: 87, isAlert: false, note: 'Dầu Giây' },
    { time: '10:15', temperature: 3.2, humidity: 88, isAlert: false, note: 'Cập trạm trung chuyển TP.HCM' },
  ],
};

const DEFAULT_DELIVERY_PROOF: DeliveryProof = {
  contractId: 1,
  contractCode: 'HD-2026-B2B-0104',
  shipmentCode: 'SHIP-COLD-2026-009',
  departedAt: '2026-10-31T06:00:00Z',
  deliveredAt: '2026-10-31T10:30:00Z',
  loadedWeightKg: 5000,
  deliveredWeightKg: 4945,
  naturalShrinkageKg: 55,
  shrinkagePercent: 1.1,
  damagedWeightKg: 0,
  epodSignatureName: 'Đại diện Kho Bách Hóa Xanh (Nguyễn Hoàng Long)',
  status: 'DELIVERED',
};

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  onReorder,
  initialTab = 'b2b',
  defaultQuery = '',
}) => {
  const { currentUser } = useApp();

  // Tab State
  const [activeTab, setActiveTab] = useState<'b2b' | 'retail'>(initialTab);
  const [searchQuery, setSearchQuery] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // B2B Contracts State
  const [contracts, setContracts] = useState<B2BContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [b2bFilter, setB2bFilter] = useState<'ALL' | 'WAITING_HARVEST' | 'HUB_DELIVERED' | 'IN_TRANSIT' | 'COMPLETED'>('ALL');

  // Sub-detail Modals for B2B
  const [activeDetailModal, setActiveDetailModal] = useState<'NONE' | 'QC' | 'TELEMETRY' | 'EPOD' | 'CONFIRM_RECEIVE'>('NONE');
  const [selectedQc, setSelectedQc] = useState<QcInspection | null>(null);
  const [selectedTelemetry, setSelectedTelemetry] = useState<ColdChainTelemetry | null>(null);
  const [selectedProof, setSelectedProof] = useState<DeliveryProof | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [buyerFeedback, setBuyerFeedback] = useState('Nông sản tươi ngon, độ ngọt đạt chuẩn, nhiệt độ lạnh bảo quản rất tốt.');

  // Retail Orders State
  const [retailOrders, setRetailOrders] = useState<OrderResponse[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [retailFilter, setRetailFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED'>('ALL');
  const [searchedSingleOrder, setSearchedSingleOrder] = useState<OrderResponse | null>(null);
  const [hasSearchedDirect, setHasSearchedDirect] = useState(false);

  // Sync initial tab if requested
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (defaultQuery) setSearchQuery(defaultQuery);
    }
  }, [isOpen, initialTab, defaultQuery]);

  // Format tiền tệ VNĐ
  const formatVnd = (amount?: number) => {
    if (amount === undefined || amount === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Nạp toàn bộ dữ liệu Hợp Đồng & Đơn Hàng khi mở Modal
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Nạp B2B Contracts
      const contractList = await getFarmerContractsApi();
      setContracts(contractList);
      if (contractList.length > 0 && selectedContractId === null) {
        setSelectedContractId(contractList[0].id);
      }

      // 2. Nạp Retail Orders (kết hợp LocalStorage + API)
      let ordersFromStorage: OrderResponse[] = [];
      if (typeof window !== 'undefined') {
        try {
          ordersFromStorage = JSON.parse(localStorage.getItem('hona_my_orders') || '[]');
        } catch {}
      }

      let ordersFromServer: OrderResponse[] = [];
      if (currentUser?.id) {
        try {
          const res = await getUserOrdersApi(currentUser.id, 0, 50);
          ordersFromServer = res.data || [];
        } catch {}
      }

      // Đơn hàng mẫu dự phòng chuẩn hóa TMĐT
      const fallbackRetailOrders: OrderResponse[] = [
        {
          id: 991,
          orderCode: 'ORD-2026-HN092',
          recipientName: currentUser?.fullName || 'Nguyễn Minh Quân',
          recipientPhone: currentUser?.phone || '0912 345 678',
          shippingAddress: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, P.22, Bình Thạnh, TP.HCM',
          note: 'Giao giờ hành chính, gọi trước 10 phút để nhận hàng.',
          totalAmount: 185000,
          paymentMethod: 'VIETQR',
          isPaid: true,
          status: 'SHIPPING',
          items: [
            {
              id: 1,
              productId: 1,
              productName: 'Cà Chua Beef Đà Lạt VietGAP',
              productImageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500',
              unit: 'kg',
              quantity: 2,
              unitPrice: 45000,
              totalPrice: 90000,
            },
            {
              id: 2,
              productId: 2,
              productName: 'Xà Lách Lô Lô Xanh Thủy Canh',
              productImageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=500',
              unit: 'gói 500g',
              quantity: 2,
              unitPrice: 35000,
              totalPrice: 70000,
            },
            {
              id: 3,
              productId: 3,
              productName: 'Bắp Cải Trái Tim Hữu Cơ',
              productImageUrl: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=500',
              unit: 'bắp',
              quantity: 1,
              unitPrice: 25000,
              totalPrice: 25000,
            },
          ],
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: 992,
          orderCode: 'ORD-2026-HN088',
          recipientName: currentUser?.fullName || 'Nguyễn Minh Quân',
          recipientPhone: currentUser?.phone || '0912 345 678',
          shippingAddress: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM',
          note: 'Để ở quầy lễ tân tầng 1',
          totalAmount: 240000,
          paymentMethod: 'COD',
          isPaid: true,
          status: 'DELIVERED',
          items: [
            {
              id: 4,
              productId: 4,
              productName: 'Dưa Leo Baby Lâm Đồng VietGAP',
              productImageUrl: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=500',
              unit: 'kg',
              quantity: 3,
              unitPrice: 38000,
              totalPrice: 114000,
            },
            {
              id: 5,
              productId: 5,
              productName: 'Cà Rốt Baby Đà Lạt Hữu Cơ',
              productImageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=500',
              unit: 'kg',
              quantity: 2,
              unitPrice: 63000,
              totalPrice: 126000,
            },
          ],
          createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
        },
      ];

      // Hợp nhất dữ liệu tránh trùng
      const orderMap = new Map<string, OrderResponse>();
      [...ordersFromStorage, ...ordersFromServer, ...fallbackRetailOrders].forEach((ord) => {
        if (!orderMap.has(ord.orderCode)) {
          orderMap.set(ord.orderCode, ord);
        }
      });

      const mergedOrders = Array.from(orderMap.values());
      setRetailOrders(mergedOrders);
      if (mergedOrders.length > 0 && selectedOrderId === null) {
        setSelectedOrderId(mergedOrders[0].id);
      }
    } catch (err) {
      console.warn('Lỗi khi tải dữ liệu đơn hàng & hợp đồng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, currentUser]);

  // Tra cứu trực tiếp theo mã đơn hàng hoặc hợp đồng
  const handleDirectSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) {
      setSearchedSingleOrder(null);
      setHasSearchedDirect(false);
      return;
    }

    setLoading(true);
    setHasSearchedDirect(true);

    try {
      if (cleanQuery.toUpperCase().startsWith('ORD-') || activeTab === 'retail') {
        const found = await getOrderByCode(cleanQuery);
        if (found) {
          setSearchedSingleOrder(found);
          setSelectedOrderId(found.id);
          setActiveTab('retail');
        } else {
          // Tìm trong list hiện có
          const localFound = retailOrders.find(
            (o) =>
              o.orderCode.toLowerCase().includes(cleanQuery.toLowerCase()) ||
              o.recipientPhone.includes(cleanQuery)
          );
          setSearchedSingleOrder(localFound || null);
          if (localFound) setSelectedOrderId(localFound.id);
        }
      } else {
        // Tìm hợp đồng B2B
        const foundContract = contracts.find(
          (c) =>
            c.contractCode.toLowerCase().includes(cleanQuery.toLowerCase()) ||
            c.lotCode.toLowerCase().includes(cleanQuery.toLowerCase()) ||
            c.buyerPhone.includes(cleanQuery) ||
            c.productName.toLowerCase().includes(cleanQuery.toLowerCase())
        );
        if (foundContract) {
          setSelectedContractId(foundContract.id);
          setActiveTab('b2b');
        }
      }
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Danh sách Hợp Đồng B2B sau lọc
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        c.contractCode.toLowerCase().includes(q) ||
        c.lotCode.toLowerCase().includes(q) ||
        c.productName.toLowerCase().includes(q) ||
        c.buyerName.toLowerCase().includes(q) ||
        c.buyerPhone.includes(q);

      const matchStatus =
        b2bFilter === 'ALL' || c.fulfillmentStatus === b2bFilter;

      return matchQuery && matchStatus;
    });
  }, [contracts, searchQuery, b2bFilter]);

  // Hợp đồng đang chọn chi tiết
  const currentContract = useMemo(() => {
    return (
      contracts.find((c) => c.id === selectedContractId) ||
      filteredContracts[0] ||
      contracts[0] ||
      null
    );
  }, [contracts, selectedContractId, filteredContracts]);

  // Danh sách Đơn Hàng Tiêu Dùng sau lọc
  const filteredRetailOrders = useMemo(() => {
    if (searchedSingleOrder) return [searchedSingleOrder];
    return retailOrders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        o.orderCode.toLowerCase().includes(q) ||
        o.recipientName.toLowerCase().includes(q) ||
        o.recipientPhone.includes(q) ||
        o.items?.some((it) => it.productName.toLowerCase().includes(q));

      const matchStatus =
        retailFilter === 'ALL' || o.status === retailFilter;

      return matchQuery && matchStatus;
    });
  }, [retailOrders, searchQuery, retailFilter, searchedSingleOrder]);

  // Đơn hàng đang chọn chi tiết
  const currentOrder = useMemo(() => {
    return (
      retailOrders.find((o) => o.id === selectedOrderId) ||
      filteredRetailOrders[0] ||
      retailOrders[0] ||
      null
    );
  }, [retailOrders, selectedOrderId, filteredRetailOrders]);

  // Mở chi tiết KCS Trạm Lạnh
  const handleOpenQc = async (contract: B2BContract) => {
    setLoading(true);
    try {
      const qc = await getContractQcApi(contract.id, contract);
      setSelectedQc(qc);
      setActiveDetailModal('QC');
    } catch {
      setSelectedQc(FALLBACK_QC_MAP[contract.id] || null);
      setActiveDetailModal('QC');
    } finally {
      setLoading(false);
    }
  };

  // Mở chi tiết Viễn trắc Xe Lạnh IoT
  const handleOpenTelemetry = async (contract: B2BContract) => {
    setLoading(true);
    try {
      const telem = await getColdChainTelemetryApi(contract.id);
      setSelectedTelemetry(telem || DEFAULT_TELEMETRY);
      setActiveDetailModal('TELEMETRY');
    } catch {
      setSelectedTelemetry(DEFAULT_TELEMETRY);
      setActiveDetailModal('TELEMETRY');
    } finally {
      setLoading(false);
    }
  };

  // Mở Biên bản giao nhận điện tử ePOD
  const handleOpenEpod = async (contract: B2BContract) => {
    setLoading(true);
    try {
      const epod = await getDeliveryProofApi(contract.id);
      setSelectedProof(epod || DEFAULT_DELIVERY_PROOF);
      setActiveDetailModal('EPOD');
    } catch {
      setSelectedProof(DEFAULT_DELIVERY_PROOF);
      setActiveDetailModal('EPOD');
    } finally {
      setLoading(false);
    }
  };

  // Hành động cốt lõi: Buyer Xác Nhận Đã Nhận Đủ Lô Hàng B2B -> Hoàn tất nghiệm thu & Mở khóa giải ngân Escrow
  const handleConfirmB2BReceipt = async () => {
    if (!currentContract) return;
    setActionLoading(true);
    try {
      const updatedContract: B2BContract = {
        ...currentContract,
        fulfillmentStatus: 'COMPLETED',
      };
      saveLocalContract(updatedContract);

      // Cập nhật state
      setContracts((prev) =>
        prev.map((c) => (c.id === updatedContract.id ? updatedContract : c))
      );

      setActiveDetailModal('NONE');
      setSuccessMessage(
        `Nghiệm thu thành công! Hợp đồng ${updatedContract.contractCode} đã chuyển trạng thái HOÀN TẤT. Tiền ký quỹ cọc 30% Escrow đã được giải phóng vào Ví Doanh Thu của Nhà Vườn.`
      );
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err) {
      console.error('Lỗi khi xác nhận nhận hàng:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Khách hàng xác nhận đã nhận đơn hàng tiêu dùng
  const handleConfirmRetailDelivered = (orderId: number) => {
    setRetailOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updated = { ...ord, status: 'DELIVERED', isPaid: true };
          if (typeof window !== 'undefined') {
            try {
              const list: OrderResponse[] = JSON.parse(
                localStorage.getItem('hona_my_orders') || '[]'
              );
              const nextList = list.map((item) =>
                item.id === orderId ? updated : item
              );
              localStorage.setItem('hona_my_orders', JSON.stringify(nextList));
            } catch {}
          }
          return updated;
        }
        return ord;
      })
    );
    setSuccessMessage('Cảm ơn bạn đã xác nhận đã nhận đủ rau củ tươi ngon!');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Stepper B2B: 5 Nấc Chuỗi Cung Ứng Lạnh
  const B2B_STEPS = [
    { key: 'WAITING_HARVEST', label: 'Cọc Escrow 30%', desc: 'Đã bảo chứng vốn sàn', icon: ShieldCheck },
    { key: 'HARVESTING', label: 'Thu hoạch vườn', desc: 'Đóng gói VietGAP', icon: SproutIcon },
    { key: 'HUB_DELIVERED', label: 'Trạm Hub QC', desc: 'Cân Net & đo Brix', icon: Scale },
    { key: 'IN_TRANSIT', label: 'Xe Lạnh IoT', desc: '2°C - 6°C viễn trắc', icon: Truck },
    { key: 'COMPLETED', label: 'ePOD Hoàn Tất', desc: 'Giải ngân Ví tiền', icon: CheckCircle2 },
  ];

  const getB2bStepIndex = (status: B2BContract['fulfillmentStatus']) => {
    switch (status) {
      case 'WAITING_HARVEST':
        return 0;
      case 'HARVESTING':
        return 1;
      case 'HUB_DELIVERED':
        return 2;
      case 'IN_TRANSIT':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 0;
    }
  };

  // Stepper B2C: 4 Nấc Giao Hỏa Tốc
  const RETAIL_STEPS = [
    { key: 'PENDING', label: 'Chờ tiếp nhận', desc: 'Đơn mới khởi tạo', icon: Clock },
    { key: 'CONFIRMED', label: 'Đang đóng gói', desc: 'Tươi chọn tại quầy', icon: Package },
    { key: 'SHIPPING', label: 'Đang giao 2h', desc: 'Shipper đang tới', icon: Truck },
    { key: 'DELIVERED', label: 'Đã nhận hàng', desc: 'Hoàn tất nghiệm thu', icon: CheckCircle2 },
  ];

  const getRetailStepIndex = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
        return 1;
      case 'SHIPPING':
        return 2;
      case 'DELIVERED':
        return 3;
      case 'CANCELLED':
        return -1;
      default:
        return 0;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      {/* Backdrop mờ sang trọng */}
      <div
        className="fixed inset-0 bg-[#0C1A10]/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Container */}
      <div className="relative bg-white rounded-3xl max-w-5xl w-full shadow-2xl z-10 max-h-[94vh] flex flex-col border border-[#10542C]/10 overflow-hidden">
        {/* ================= HEADER MODAL ================= */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/20 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#10542C] text-white flex items-center justify-center shadow-md shadow-[#10542C]/20 shrink-0">
              <Truck className="w-6 h-6 text-[#8BC34A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg sm:text-xl font-black text-[#10542C]">
                  Trung Tâm Theo Dõi Đơn Hàng & Hợp Đồng B2B
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#10542C] border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Tracking
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Minh bạch lộ trình thu hoạch, kiểm định trạm lạnh Hub QC, cảm biến IoT viễn trắc và giao nhận hỏa tốc
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              title="Làm mới dữ liệu từ trạm"
              className="p-2 text-slate-400 hover:text-[#10542C] hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#10542C]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thông báo thành công nổi bật */}
        {successMessage && (
          <div className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold flex items-center justify-between gap-2 shadow-inner animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 shrink-0 text-emerald-200" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-white/80 hover:text-white text-xs font-bold underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* ================= TABS NAVIGATION & SEARCH BAR ================= */}
        <div className="p-4 sm:px-6 bg-[#F9FAF9] border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          {/* 2 Tabs chuyển đổi */}
          <div className="flex items-center bg-gray-200/70 p-1 rounded-2xl gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('b2b');
                setSearchedSingleOrder(null);
                setHasSearchedDirect(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'b2b'
                  ? 'bg-white text-[#10542C] shadow-sm'
                  : 'text-slate-600 hover:text-[#10542C]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Hợp Đồng & Lô Cọc B2B</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-100 text-[#10542C]">
                {contracts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('retail');
                setSearchedSingleOrder(null);
                setHasSearchedDirect(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'retail'
                  ? 'bg-white text-[#10542C] shadow-sm'
                  : 'text-slate-600 hover:text-[#10542C]'
              }`}
            >
              <Package className="w-4 h-4 text-amber-600" />
              <span>Đơn Hàng Tiêu Dùng (2h)</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                {retailOrders.length}
              </span>
            </button>
          </div>

          {/* Ô tìm kiếm đa năng */}
          <form onSubmit={handleDirectSearch} className="flex-1 max-w-md relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder={
                activeTab === 'b2b'
                  ? 'Tìm theo Mã HĐ (HD-...), Mã Lô, SĐT hoặc Tên rau...'
                  : 'Tìm theo Mã đơn (ORD-...), Số điện thoại người nhận...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-20 py-2 text-xs text-[#2C3E2E] placeholder:text-slate-400 focus:outline-none focus:border-[#10542C] focus:ring-1 focus:ring-[#10542C]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchedSingleOrder(null);
                  setHasSearchedDirect(false);
                }}
                className="absolute right-14 text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1 px-3 py-1 bg-[#10542C] hover:bg-[#0c3e20] text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Tìm
            </button>
          </form>
        </div>

        {/* ================= BODY CHÍNH (MASTER - DETAIL) ================= */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
          {/* ================= CỘT TRÁI: DANH SÁCH THẺ (LG: 4 CỘT) ================= */}
          <div className="lg:col-span-5 border-r border-gray-100 overflow-y-auto p-4 space-y-3 bg-[#FAFBF9]/50">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              {activeTab === 'b2b' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setB2bFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      b2bFilter === 'ALL'
                        ? 'bg-[#10542C] text-white'
                        : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Tất cả ({contracts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setB2bFilter('WAITING_HARVEST')}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      b2bFilter === 'WAITING_HARVEST'
                        ? 'bg-[#10542C] text-white'
                        : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Chờ thu hoạch
                  </button>
                  <button
                    type="button"
                    onClick={() => setB2bFilter('HUB_DELIVERED')}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      b2bFilter === 'HUB_DELIVERED'
                        ? 'bg-[#10542C] text-white'
                        : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Tại Hub QC
                  </button>
                  <button
                    type="button"
                    onClick={() => setB2bFilter('IN_TRANSIT')}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      b2bFilter === 'IN_TRANSIT'
                        ? 'bg-[#10542C] text-white'
                        : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Xe Lạnh IoT
                  </button>
                  <button
                    type="button"
                    onClick={() => setB2bFilter('COMPLETED')}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      b2bFilter === 'COMPLETED'
                        ? 'bg-[#10542C] text-white'
                        : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Hoàn tất
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setRetailFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      retailFilter === 'ALL'
                        ? 'bg-[#10542C] text-white'
                        : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Tất cả ({retailOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetailFilter('SHIPPING')}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      retailFilter === 'SHIPPING'
                        ? 'bg-[#10542C] text-white'
                        : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Đang giao 2h
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetailFilter('DELIVERED')}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      retailFilter === 'DELIVERED'
                        ? 'bg-[#10542C] text-white'
                        : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Đã nhận
                  </button>
                </>
              )}
            </div>

            {/* Danh sách Thẻ Hợp Đồng B2B */}
            {activeTab === 'b2b' && (
              <div className="space-y-2.5">
                {filteredContracts.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">Không tìm thấy hợp đồng nào</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Thử tìm với từ khóa khác hoặc xóa bộ lọc
                    </p>
                  </div>
                ) : (
                  filteredContracts.map((c) => {
                    const isSelected = c.id === currentContract?.id;
                    const isCompleted = c.fulfillmentStatus === 'COMPLETED';
                    const isDelivering = c.fulfillmentStatus === 'IN_TRANSIT';

                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedContractId(c.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white border-[#10542C] ring-2 ring-[#10542C]/10 shadow-md'
                            : 'bg-white border-gray-200/80 hover:border-emerald-300 hover:bg-emerald-50/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-xs font-black text-[#10542C]">
                            {c.contractCode}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : isDelivering
                                ? 'bg-blue-100 text-blue-800 animate-pulse'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isCompleted
                              ? 'Đã Nghiệm Thu'
                              : isDelivering
                              ? 'Xe Lạnh Đang Giao'
                              : c.fulfillmentStatus === 'HUB_DELIVERED'
                              ? 'Đã Về Hub QC'
                              : 'Chờ Thu Hoạch'}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-800 line-clamp-1 mb-1">
                          {c.productName}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-gray-100">
                          <span>
                            Số lượng: <strong className="text-slate-700">{c.quantity.toLocaleString('vi-VN')} kg</strong>
                          </span>
                          <span className="font-bold text-[#10542C]">
                            {formatVnd(c.totalAmount)}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Cọc Escrow: <strong>{formatVnd(c.depositAmount)} (30%)</strong>
                          </span>
                          <span>Hẹn trạm: {c.hubDeliveryDate}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Danh sách Thẻ Đơn Hàng Tiêu Dùng */}
            {activeTab === 'retail' && (
              <div className="space-y-2.5">
                {filteredRetailOrders.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">Chưa có đơn hàng nào</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Đặt mua rau củ tươi trên sàn để theo dõi lộ trình giao hỏa tốc 2 giờ
                    </p>
                  </div>
                ) : (
                  filteredRetailOrders.map((ord) => {
                    const isSelected = ord.id === currentOrder?.id;
                    const isDelivered = ord.status === 'DELIVERED';
                    const isShipping = ord.status === 'SHIPPING';

                    return (
                      <div
                        key={ord.id}
                        onClick={() => setSelectedOrderId(ord.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white border-[#10542C] ring-2 ring-[#10542C]/10 shadow-md'
                            : 'bg-white border-gray-200/80 hover:border-emerald-300 hover:bg-emerald-50/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-xs font-black text-[#10542C]">
                            {ord.orderCode}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isDelivered
                                ? 'bg-emerald-100 text-emerald-800'
                                : isShipping
                                ? 'bg-blue-100 text-blue-800 animate-pulse'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isDelivered
                              ? 'Đã Giao Thành Công'
                              : isShipping
                              ? 'Shipper Đang Giao'
                              : ord.status === 'CONFIRMED'
                              ? 'Đang Đóng Hộp'
                              : 'Chờ Xác Nhận'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 line-clamp-1 mb-1">
                          {ord.items?.map((it) => it.productName).join(', ') || 'Nông sản hữu cơ'}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-gray-100">
                          <span>
                            {ord.items?.length || 1} món rau củ
                          </span>
                          <span className="font-bold text-[#10542C]">
                            {formatVnd(ord.totalAmount)}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Người nhận: {ord.recipientName}</span>
                          <span>{ord.paymentMethod === 'COD' ? 'Tiền mặt COD' : 'VietQR'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ================= CỘT PHẢI: CHI TIẾT TIẾN TRÌNH (LG: 7 CỘT) ================= */}
          <div className="lg:col-span-7 overflow-y-auto p-4 sm:p-6 bg-white space-y-6">
            {/* ====== CHI TIẾT HỢP ĐỒNG B2B ====== */}
            {activeTab === 'b2b' && currentContract && (
              <div className="space-y-6">
                {/* Header Thẻ Hợp Đồng */}
                <div className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Mã hợp đồng B2B:</span>
                      <span className="font-mono text-base font-black text-[#10542C]">
                        {currentContract.contractCode}
                      </span>
                    </div>
                    <h3 className="font-heading text-lg font-black text-slate-800 mt-1">
                      {currentContract.productName}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Mã lô vụ: <strong>{currentContract.lotCode}</strong></span>
                      <span>•</span>
                      <span>Mã vùng trồng: <strong>{currentContract.pucCode || 'VN-LDO-04-100'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(getContractPrintUrl(currentContract.id), '_blank')}
                      className="px-3 py-1.5 text-xs font-bold text-[#10542C] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>In Hợp Đồng</span>
                    </button>
                  </div>
                </div>

                {/* STEPPER 5 BƯỚC CHUỖI CUNG ỨNG LẠNH B2B */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-[#10542C]" />
                      Tiến Trình Chuỗi Cung Ứng Lạnh B2B HoNa:
                    </span>
                    <span className="text-xs font-extrabold text-[#10542C]">
                      {currentContract.fulfillmentStatus === 'COMPLETED'
                        ? '100% Hoàn tất nghiệm thu'
                        : currentContract.fulfillmentStatus === 'IN_TRANSIT'
                        ? 'Bước 4/5: Xe lạnh viễn trắc'
                        : currentContract.fulfillmentStatus === 'HUB_DELIVERED'
                        ? 'Bước 3/5: Kiểm định trạm QC'
                        : 'Bước 1/5: Đã ký quỹ cọc'}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {B2B_STEPS.map((step, idx) => {
                      const currentIdx = getB2bStepIndex(currentContract.fulfillmentStatus);
                      const isCompleted = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;
                      const StepIcon = step.icon;

                      return (
                        <div key={step.key} className="flex flex-col items-center text-center">
                          <div
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
                              isCurrent
                                ? 'bg-[#10542C] text-white ring-4 ring-[#8BC34A]/30 shadow-md scale-105'
                                : isCompleted
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-400 border border-gray-200'
                            }`}
                          >
                            <StepIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <span
                            className={`text-[10px] sm:text-xs mt-2 leading-tight font-bold ${
                              isCurrent
                                ? 'text-[#10542C]'
                                : isCompleted
                                ? 'text-slate-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {step.label}
                          </span>
                          <span className="hidden sm:block text-[9px] text-slate-400 leading-tight mt-0.5">
                            {step.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3 THẺ KPI TÀI CHÍNH B2B ESCROW */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                    <span className="text-[11px] text-slate-500 block">Khối Lượng Hợp Đồng</span>
                    <span className="text-base font-black text-[#10542C]">
                      {currentContract.quantity.toLocaleString('vi-VN')} kg
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Đơn giá: {formatVnd(currentContract.unitPrice)}/kg
                    </span>
                  </div>

                  <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100">
                    <span className="text-[11px] text-slate-500 block">Ký Quỹ Cọc Escrow (30%)</span>
                    <span className="text-base font-black text-blue-700">
                      {formatVnd(currentContract.depositAmount)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                      ✓ Đã bảo chứng tại sàn
                    </span>
                  </div>

                  <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100">
                    <span className="text-[11px] text-slate-500 block">Tổng Giá Trị Lô Nông Sản</span>
                    <span className="text-base font-black text-amber-900">
                      {formatVnd(currentContract.totalAmount)}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Còn lại khi giao: {formatVnd((currentContract.totalAmount || 0) - (currentContract.depositAmount || 0))}
                    </span>
                  </div>
                </div>

                {/* KHỐI 3 NÚT TÍNH NĂNG CHUYÊN SÂU CHUẨN LOGISTICS B2B */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Nút 1: Xem Biên bản KCS Trạm Hub */}
                  <button
                    type="button"
                    onClick={() => handleOpenQc(currentContract)}
                    className="p-3 bg-white hover:bg-emerald-50/40 border border-gray-200 hover:border-emerald-300 rounded-2xl text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Scale className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block">Biên Bản Hub QC</span>
                    <span className="text-[10px] text-slate-500">Cân Net, độ Brix, độ ẩm</span>
                  </button>

                  {/* Nút 2: Cảm biến Xe Lạnh IoT */}
                  <button
                    type="button"
                    onClick={() => handleOpenTelemetry(currentContract)}
                    className="p-3 bg-white hover:bg-blue-50/40 border border-gray-200 hover:border-blue-300 rounded-2xl text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Thermometer className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block">Viễn Trắc Xe Lạnh</span>
                    <span className="text-[10px] text-blue-600 font-bold">2°C - 6°C chuẩn tươi</span>
                  </button>

                  {/* Nút 3: Biên bản giao nhận ePOD */}
                  <button
                    type="button"
                    onClick={() => handleOpenEpod(currentContract)}
                    className="p-3 bg-white hover:bg-amber-50/40 border border-gray-200 hover:border-amber-300 rounded-2xl text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <FileText className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block">Biên Bản ePOD</span>
                    <span className="text-[10px] text-slate-500">Chữ ký số & hao hụt kho</span>
                  </button>
                </div>

                {/* KHUNG HÀNH ĐỘNG BUYER XÁC NHẬN (TƯƠNG TỰ SHOPEE / TIKTOK SHOP B2B) */}
                <div className="p-4 bg-gradient-to-r from-emerald-50 via-[#F4F7F4] to-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <span className="text-xs font-bold text-[#10542C] flex items-center justify-center sm:justify-start gap-1.5">
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                      Xác Nhận Nghiệm Thu & Giải Ngân Ví Nông Dân
                    </span>
                    <p className="text-[11px] text-slate-600">
                      {currentContract.fulfillmentStatus === 'COMPLETED'
                        ? 'Lô hàng đã được nghiệm thu hoàn tất. Tiền cọc Escrow đã giải ngân an toàn.'
                        : 'Khi nhận đủ lô rau củ tại kho, vui lòng xác nhận để hoàn tất quyết toán.'}
                    </p>
                  </div>

                  {currentContract.fulfillmentStatus !== 'COMPLETED' ? (
                    <button
                      type="button"
                      onClick={() => setActiveDetailModal('CONFIRM_RECEIVE')}
                      className="px-5 py-2.5 bg-[#10542C] hover:bg-[#0c3e20] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#8BC34A]" />
                      <span>Xác Nhận Đã Nhận Hàng</span>
                    </button>
                  ) : (
                    <span className="px-3.5 py-1.5 bg-emerald-100 text-[#10542C] border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Đã Quyết Toán Xong
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ====== CHI TIẾT ĐƠN HÀNG TIÊU DÙNG B2C ====== */}
            {activeTab === 'retail' && currentOrder && (
              <div className="space-y-6">
                {/* Header Thẻ Đơn Hàng */}
                <div className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Mã đơn hàng:</span>
                      <span className="font-mono text-base font-black text-[#10542C]">
                        {currentOrder.orderCode}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Đặt lúc: {new Date(currentOrder.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onReorder && currentOrder.items && currentOrder.items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          onReorder(currentOrder.items);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 bg-[#FB8C00] hover:bg-[#E67E00] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Mua Lại Đơn Này</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* STEPPER 4 BƯỚC GIAO HỎA TỐC 2 GIỜ */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-[#10542C]" />
                      Lộ Trình Giao Nhanh 2 Giờ HoNa Fresh:
                    </span>
                    <span className="text-xs font-extrabold text-[#10542C]">
                      {currentOrder.status === 'DELIVERED'
                        ? 'Đã giao thành công'
                        : currentOrder.status === 'SHIPPING'
                        ? 'Tài xế đang di chuyển'
                        : currentOrder.status === 'CONFIRMED'
                        ? 'Đang chuẩn bị rau'
                        : 'Chờ tiếp nhận'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {RETAIL_STEPS.map((step, idx) => {
                      const currentIdx = getRetailStepIndex(currentOrder.status);
                      const isCompleted = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;
                      const StepIcon = step.icon;

                      return (
                        <div key={step.key} className="flex flex-col items-center text-center">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                              isCurrent
                                ? 'bg-[#10542C] text-white ring-4 ring-[#8BC34A]/30 shadow-md scale-105 animate-pulse'
                                : isCompleted
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-400 border border-gray-200'
                            }`}
                          >
                            <StepIcon className="w-5 h-5" />
                          </div>
                          <span
                            className={`text-xs mt-2 leading-tight font-bold ${
                              isCurrent
                                ? 'text-[#10542C]'
                                : isCompleted
                                ? 'text-slate-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {step.label}
                          </span>
                          <span className="hidden sm:block text-[10px] text-slate-400 leading-tight mt-0.5">
                            {step.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* THÔNG TIN NGƯỜI NHẬN & ĐỊA CHỈ */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-[#10542C]" />
                      Người nhận: {currentOrder.recipientName} ({currentOrder.recipientPhone})
                    </span>
                    <span className="font-extrabold text-[#10542C]">
                      {currentOrder.paymentMethod === 'COD' ? 'Tiền mặt COD' : 'VietQR Chuyển Khoản'}
                    </span>
                  </div>
                  <div className="text-slate-600 flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{currentOrder.shippingAddress}</span>
                  </div>
                  {currentOrder.note && (
                    <div className="text-slate-500 italic pl-5">
                      Ghi chú: {currentOrder.note}
                    </div>
                  )}
                </div>

                {/* DANH SÁCH MÓN RAU CỦ TRONG ĐƠN */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">
                    Nông sản trong đơn ({currentOrder.items?.length || 0} món):
                  </span>
                  <div className="space-y-2">
                    {currentOrder.items?.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-xl hover:border-emerald-200 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {it.productImageUrl ? (
                            <img
                              src={it.productImageUrl}
                              alt={it.productName}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                              Rau
                            </div>
                          )}
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">
                              {it.productName}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatVnd(it.unitPrice)} × {it.quantity} {it.unit}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-black text-[#10542C]">
                          {formatVnd(it.totalPrice)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-[#FAFBF9] rounded-xl border border-gray-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">Tổng thanh toán:</span>
                    <span className="font-heading font-black text-lg text-[#10542C]">
                      {formatVnd(currentOrder.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* NÚT KHÁCH HÀNG XÁC NHẬN ĐÃ NHẬN HÀNG */}
                {currentOrder.status !== 'DELIVERED' && (
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-[#10542C] block">
                        Đã nhận được rau tươi ngon?
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Bấm xác nhận để hoàn tất đơn hàng và tích lũy điểm thưởng thành viên
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConfirmRetailDelivered(currentOrder.id)}
                      className="px-4 py-2 bg-[#10542C] hover:bg-[#0c3e20] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#8BC34A]" />
                      <span>Đã Nhận Hàng</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================= SUB-MODAL 1: BIÊN BẢN HUB QC ================= */}
        {activeDetailModal === 'QC' && selectedQc && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-emerald-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-heading text-base font-black text-[#10542C]">
                    Biên Bản KCS Trạm Lạnh Hub
                  </h4>
                </div>
                <button
                  onClick={() => setActiveDetailModal('NONE')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-slate-500">Mã hợp đồng:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedQc.contractCode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-slate-500">Nông sản kiểm định:</span>
                  <span className="font-bold text-slate-800">{selectedQc.productName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-slate-500">Cân thực nhận trạm (Gross):</span>
                  <span className="font-bold text-slate-800">{selectedQc.grossWeight.toLocaleString('vi-VN')} kg</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-slate-500">Cân chuẩn thực tế (Net):</span>
                  <span className="font-bold text-emerald-600">{selectedQc.netQualifiedWeight.toLocaleString('vi-VN')} kg</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-slate-500">Tỷ lệ đạt chuẩn:</span>
                  <span className="font-black text-[#10542C]">{selectedQc.qualifiedPercent}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-slate-500">Độ ngọt Brix đo được:</span>
                  <span className="font-bold text-amber-600">{selectedQc.brixScore} °Bx</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-slate-500">Độ ẩm cuống lá:</span>
                  <span className="font-bold text-blue-600">{selectedQc.moisturePercent}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-slate-500">Chuyên viên KCS:</span>
                  <span className="font-bold text-slate-700">{selectedQc.inspectorName}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl text-slate-600 italic">
                  Lời phê KCS: {selectedQc.qcNotes}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDetailModal('NONE')}
                className="w-full py-2.5 bg-[#10542C] text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-[#0c3e20]"
              >
                Đóng Biên Bản
              </button>
            </div>
          </div>
        )}

        {/* ================= SUB-MODAL 2: VIỄN TRẮC XE LẠNH IOT ================= */}
        {activeDetailModal === 'TELEMETRY' && selectedTelemetry && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-blue-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-blue-600" />
                  <h4 className="font-heading text-base font-black text-blue-900">
                    Cảm Biến Xe Lạnh IoT Viễn Trắc
                  </h4>
                </div>
                <button
                  onClick={() => setActiveDetailModal('NONE')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-blue-700 font-bold block">Biển số xe lạnh:</span>
                  <span className="font-mono text-base font-black text-blue-950">
                    {selectedTelemetry.truckPlate}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Tài xế: {selectedTelemetry.driverName} ({selectedTelemetry.driverPhone})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Nhiệt độ thùng xe:</span>
                  <span className="text-2xl font-black text-blue-700">
                    {selectedTelemetry.currentTemp}°C
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold block">
                    ✓ Trong ngưỡng 2°C - 6°C
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Nhật ký viễn trắc nhiệt độ thời gian thực:
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedTelemetry.logs?.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs"
                    >
                      <span className="text-slate-500">{log.time}</span>
                      <span className="font-bold text-blue-800">{log.temperature}°C</span>
                      <span className="text-slate-600">{log.humidity}% ẩm</span>
                      <span className="text-[10px] font-bold text-emerald-600">Bình thường</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDetailModal('NONE')}
                className="w-full py-2.5 bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-blue-800"
              >
                Đóng Bảng Viễn Trắc
              </button>
            </div>
          </div>
        )}

        {/* ================= SUB-MODAL 3: BIÊN BẢN GIAO NHẬN EPOD ================= */}
        {activeDetailModal === 'EPOD' && selectedProof && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-amber-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <h4 className="font-heading text-base font-black text-slate-800">
                    Biên Bản Giao Nhận Điện Tử (ePOD)
                  </h4>
                </div>
                <button
                  onClick={() => setActiveDetailModal('NONE')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-slate-500">Mã vận chuyển:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedProof.shipmentCode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-slate-500">Khối lượng xuất trạm:</span>
                  <span className="font-bold text-slate-800">{selectedProof.loadedWeightKg?.toLocaleString('vi-VN')} kg</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-slate-500">Khối lượng giao tại kho:</span>
                  <span className="font-bold text-emerald-700">{selectedProof.deliveredWeightKg?.toLocaleString('vi-VN')} kg</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-slate-500">Hao hụt tự nhiên chuỗi lạnh:</span>
                  <span className="font-bold text-slate-700">
                    {selectedProof.naturalShrinkageKg} kg ({selectedProof.shrinkagePercent}%)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-slate-500">Đại diện ký nhận kho:</span>
                  <span className="font-bold text-[#10542C]">{selectedProof.epodSignatureName || 'Thương Lái Kho Tổng'}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 font-bold text-center">
                  ✓ Hàng hóa hạ kho đạt chuẩn chất lượng tươi sống 100%
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDetailModal('NONE')}
                className="w-full py-2.5 bg-[#10542C] text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-[#0c3e20]"
              >
                Đóng Biên Bản ePOD
              </button>
            </div>
          </div>
        )}

        {/* ================= SUB-MODAL 4: BUYER XÁC NHẬN NHẬN HÀNG B2B ================= */}
        {activeDetailModal === 'CONFIRM_RECEIVE' && currentContract && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 border border-emerald-200">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#10542C] flex items-center justify-center mx-auto mb-2">
                  <BadgeCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="font-heading text-lg font-black text-[#10542C]">
                  Xác Nhận Nghiệm Thu Lô Hàng
                </h4>
                <p className="text-xs text-slate-500">
                  Hợp đồng: <strong className="font-mono">{currentContract.contractCode}</strong> ({currentContract.productName})
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span>Khối lượng nghiệm thu:</span>
                  <strong>{currentContract.quantity.toLocaleString('vi-VN')} kg</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tổng tiền quyết toán:</span>
                  <strong className="text-[#10542C]">{formatVnd(currentContract.totalAmount)}</strong>
                </div>
                <p className="text-[11px] text-emerald-700 pt-1 border-t border-emerald-200/60 mt-1">
                  ⚡ Khi bạn xác nhận, tiền cọc Escrow 30% ({formatVnd(currentContract.depositAmount)}) sẽ được tự động giải phóng vào Ví Nông Dân.
                </p>
              </div>

              {/* Đánh giá sao */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Đánh giá chất lượng nông sản:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingStars(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-115"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= ratingStars
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-500 ml-2">
                    {ratingStars === 5 ? 'Tuyệt vời (5/5)' : `${ratingStars}/5 sao`}
                  </span>
                </div>
              </div>

              {/* Nhận xét */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ghi chú nghiệm thu kho:
                </label>
                <textarea
                  rows={2}
                  value={buyerFeedback}
                  onChange={(e) => setBuyerFeedback(e.target.value)}
                  placeholder="Nhập cảm quan về độ tươi, màu sắc hoặc đóng gói..."
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#10542C]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveDetailModal('NONE')}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmB2BReceipt}
                  className="flex-1 py-2.5 bg-[#10542C] hover:bg-[#0c3e20] text-white rounded-xl font-bold text-xs cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading ? 'Đang xử lý...' : 'Xác Nhận & Giải Ngân'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Icon for Sprout in Stepper
function SproutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 20h10" />
      <path d="M10 20c5.5-2.5.8-6.4 3-10" />
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
    </svg>
  );
}

export default OrderTrackingModal;
