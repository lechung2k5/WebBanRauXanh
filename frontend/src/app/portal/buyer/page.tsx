'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import B2BNegotiationModal from '@/components/B2BNegotiationModal';
import BuyerAddressesPanel from '@/components/BuyerAddressesPanel';
import BuyerOrdersPanel from '@/components/BuyerOrdersPanel';
import BuyerProfilePanel from '@/components/BuyerProfilePanel';
import Pagination from '@/components/Pagination';
import { Product } from '@/types';
import {
  getProducts,
  getStoredUser,
  getBuyerContractsApi,
  getBuyerTelemetryApi,
  getBuyerQcReportApi,
  getBuyerRfqsApi,
  getBuyerRfqHistoryApi,
  respondBuyerRfqApi,
  getBuyerInvoiceUrl,
  getBuyerReviewsApi,
  submitBuyerReviewApi,
} from '@/services/api';
import {
  getSyncRfqs,
  getSyncContracts,
  buyerAcceptCounterRfq,
  buyerCounterRfq,
  buyerPayDeposit,
  updateContractFulfillmentStep,
  buyerSignEpod,
  buyerPayFinalSettlement,
  mergeSyncRfqs,
  subscribeB2bSyncEvents,
  type B2bSyncRfq,
  type B2bSyncContract,
} from '@/services/b2bSyncService';
import { getRfqStatusMeta, isRfqExpiredAt, isRfqWaitingForBuyer, isRfqWaitingForFarmer, normalizeRfqStatus } from '@/utils/rfqStatus';
import RfqHistoryTimeline, { type RfqHistoryEvent } from '@/components/RfqHistoryTimeline';
import B2BNotificationBell from '@/components/B2BNotificationBell';
import RfqCountdown from '@/components/RfqCountdown';
import {
  Search,
  LayoutDashboard,
  PackageSearch,
  ShieldCheck,
  RefreshCw,
  CreditCard,
  Thermometer,
  Droplets,
  Truck,
  CheckCircle2,
  PenLine,
  FileText,
  Upload,
  Download,
  MessageSquareQuote,
  ShoppingBag,
  UserRound,
  Send,
  Check,
  MapPin,
  ArrowRight,
  Zap,
  Clock,
  ChevronRight,
  Sparkles,
  Star,
} from 'lucide-react';

export default function BuyerPortalPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [lotsPage, setLotsPage] = useState(1);
  const [lotsTotal, setLotsTotal] = useState(0);
  const [lotsTotalPages, setLotsTotalPages] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Tab điều hướng
  const [activeSection, setActiveSection] = useState<
    'lots' | 'purchases' | 'orders' | 'profile' | 'addresses' | 'negotiation' | 'escrow' | 'telemetry' | 'qc' | 'epod' | 'invoices'
  >('lots');

  // Dữ liệu đồng bộ Realtime B2B
  const [syncRfqs, setSyncRfqs] = useState<B2bSyncRfq[]>([]);
  const [syncContracts, setSyncContracts] = useState<B2bSyncContract[]>([]);
  const [selectedRfqCode, setSelectedRfqCode] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [rfqCount, setRfqCount] = useState(0);
  const [rfqHistory, setRfqHistory] = useState<RfqHistoryEvent[]>([]);

  // State hỗ trợ nghiệp vụ
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [negotiationMessage, setNegotiationMessage] = useState('');
  const [receivedWeight, setReceivedWeight] = useState<number>(3000);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const signatureRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [qcReports, setQcReports] = useState<Array<Record<string, unknown>>>([]);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');

  // Telemetry IoT
  const [telemetry, setTelemetry] = useState({ temperature: 3.8, humidity: 82, updatedAt: '' });
  const [telemetrySource, setTelemetrySource] = useState<'api' | 'sync'>('sync');

  // Hàm load & refresh dữ liệu đồng bộ
  const refreshSyncData = () => {
    const rfqs = getSyncRfqs();
    const contracts = getSyncContracts();
    setSyncRfqs(rfqs);
    setSyncContracts(contracts);
    setRfqCount(rfqs.length);

    if (rfqs.length > 0 && !selectedRfqCode) {
      setSelectedRfqCode(rfqs[0].rfqCode);
    }
    if (contracts.length > 0 && !selectedContractId) {
      setSelectedContractId(contracts[0].id);
    }
  };

  // Khởi tạo và lắng nghe sự kiện đồng bộ 2 chiều (Farmer <-> Buyer)
  useEffect(() => {
    const user = getStoredUser();
    if (!user || !user.roles?.includes('ROLE_BUYER')) {
      router.replace('/dang-nhap?redirect=/portal/buyer');
      return;
    }

    refreshSyncData();

    // Kết nối BroadcastChannel và Storage events
    const unsubscribe = subscribeB2bSyncEvents(() => {
      refreshSyncData();
    });

    // Đồng bộ RFQ thật từ backend vào lớp đồng bộ hai chiều.
    let active = true;
    getBuyerRfqsApi().then((serverRfqs) => {
      if (!active || serverRfqs.length === 0) return;
      mergeSyncRfqs(serverRfqs.map((rfq) => ({
        id: rfq.id,
        rfqCode: rfq.rfqCode,
        harvestLotId: rfq.harvestLotId || 0,
        lotCode: rfq.lotCode || `LOT-${rfq.harvestLotId || rfq.id}`,
        productName: rfq.productName || 'Nông sản',
        buyerName: rfq.buyerName || user.fullName,
        buyerPhone: rfq.buyerPhone || user.phone || '',
        buyerCompany: rfq.buyerCompany || user.companyName || '',
        requestedQuantityKg: rfq.requestedQuantityKg || rfq.quantityKg || 0,
        targetPricePerKg: rfq.proposedPricePerKg || 0,
        counterPricePerKg: rfq.counterPricePerKg || undefined,
        desiredDeliveryDate: rfq.deliveryDate,
        deliveryLocation: rfq.deliveryLocation || '',
        shippingOption: rfq.shippingOption || 'cold_storage_truck',
        notes: rfq.notes,
        status: rfq.status as B2bSyncRfq['status'],
        createdAt: rfq.createdAt || new Date().toISOString(),
        updatedAt: rfq.updatedAt || rfq.createdAt || new Date().toISOString(),
        expiresAt: rfq.expiresAt,
        contractId: rfq.contractId,
        contractCode: rfq.contractCode,
        depositStatus: rfq.depositStatus,
        depositAmount: rfq.depositAmount,
      })));
      refreshSyncData();
    }).catch(() => {});
    getBuyerContractsApi().catch(() => {});

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  // Hợp đồng đang chọn
  const activeContract = useMemo(() => {
    return syncContracts.find((c) => c.id === selectedContractId) || syncContracts[0] || null;
  }, [syncContracts, selectedContractId]);

  // RFQ đang chọn
  const currentRfq = useMemo(() => {
    return syncRfqs.find((r) => r.rfqCode === selectedRfqCode) || syncRfqs[0] || null;
  }, [syncRfqs, selectedRfqCode]);
  const currentRfqStatus = currentRfq ? normalizeRfqStatus(currentRfq.status) : '';
  const currentRfqExpired = currentRfq ? isRfqExpiredAt(currentRfq.expiresAt, currentRfq.createdAt, currentRfqStatus) : false;

  useEffect(() => {
    if (!currentRfq?.id) {
      setRfqHistory([]);
      return;
    }
    getBuyerRfqHistoryApi(currentRfq.id)
      .then((events) => setRfqHistory(events as unknown as RfqHistoryEvent[]))
      .catch(() => setRfqHistory([]));
  }, [currentRfq?.id]);

  // Đồng bộ khối lượng thực nhận khi chuyển hợp đồng
  useEffect(() => {
    if (activeContract) {
      setReceivedWeight(activeContract.epodDeliveredWeightKg || activeContract.quantityKg);
      if (activeContract.truckTempCurrent) {
        setTelemetry((prev) => ({
          ...prev,
          temperature: activeContract.truckTempCurrent,
          updatedAt: new Date().toISOString(),
        }));
      }
    }
  }, [activeContract]);

  useEffect(() => {
    if (!activeContract?.id) return;
    getBuyerReviewsApi(activeContract.id).then((reviews) => {
      const mine = reviews.find((review) => review.reviewerRole === 'BUYER');
      if (mine) {
        setReviewStars(mine.rating);
        setReviewComment(mine.comment || '');
      }
    }).catch(() => {
      // Hợp đồng demo/local có thể chưa tồn tại trên backend.
    });
  }, [activeContract?.id]);

  const handleSubmitBuyerReview = async () => {
    if (!activeContract) return;
    setReviewLoading(true);
    setReviewMessage('');
    try {
      await submitBuyerReviewApi(activeContract.id, { rating: reviewStars, comment: reviewComment });
      setReviewMessage('Đã lưu đánh giá giao dịch thành công. Bạn có thể cập nhật lại bất cứ lúc nào.');
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : 'Không thể lưu đánh giá giao dịch.');
    } finally {
      setReviewLoading(false);
    }
  };

  // Load danh sách sản phẩm nông sản sỉ
  useEffect(() => {
    const loadLots = async () => {
      setLoading(true);
      try {
        const result = await getProducts({
          keyword: keyword || undefined,
          categorySlug: category === 'ALL' ? undefined : category,
          status: 'OPEN',
          page: lotsPage,
          size: 10,
        });
        setProducts(result.products || []);
        setLotsTotal(result.totalElements || 0);
        setLotsTotalPages(Math.max(1, result.totalPages || 1));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    loadLots();
  }, [keyword, category, lotsPage]);

  // Cập nhật telemetry giả lập định kỳ
  useEffect(() => {
    if (activeSection !== 'telemetry' || !activeContract) return;

    const interval = setInterval(() => {
      const baseTemp = activeContract.truckTempCurrent || 3.8;
      const variation = Number(((Math.random() - 0.5) * 0.4).toFixed(1));
      const currentTemp = Number((baseTemp + variation).toFixed(1));
      setTelemetry({
        temperature: currentTemp,
        humidity: Math.round(80 + Math.random() * 5),
        updatedAt: new Date().toISOString(),
      });
      setTelemetrySource('sync');
    }, 4000);

    return () => clearInterval(interval);
  }, [activeSection, activeContract]);

  // Thống kê nguồn cung
  const stats = useMemo(
    () => ({
      lots: products.length,
      available: products.reduce(
        (sum, product) => sum + (product.availableVolume || product.stockQuantity || 0),
        0
      ),
      contractsCount: syncContracts.length,
      waitingDepositCount: syncContracts.filter((c) => c.depositStatus === 'WAITING_DEPOSIT').length,
    }),
    [products, syncContracts]
  );

  // 1. Nghiệp vụ: Chấp nhận giá phản hồi từ Nông Dân
  const handleBuyerAcceptRfq = (rfq: B2bSyncRfq) => {
    try {
      void respondBuyerRfqApi(rfq.id, { action: 'ACCEPT' }).catch(() => {});
      const { newContract } = buyerAcceptCounterRfq(rfq.id);
      setSelectedContractId(newContract.id);
      refreshSyncData();
      setWorkflowMessage(
        `✓ Đã chốt thành công hợp đồng ${newContract.contractCode}! Chuyển ngay sang Ký Quỹ VietQR 30% để nông dân bắt đầu thu hoạch.`
      );
      setActiveSection('escrow');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi chấp nhận đề xuất');
    }
  };

  const handleBuyerCounterRfq = async (rfq: B2bSyncRfq) => {
    const suggestedPrice = rfq.counterPricePerKg || rfq.targetPricePerKg;
    const newOffer = prompt('Nhập giá đề xuất mới gửi lại người bán (đ/kg):', String(suggestedPrice));
    if (!newOffer || Number(newOffer) <= 0) return;
    try {
      await respondBuyerRfqApi(rfq.id, { action: 'COUNTER', counterPrice: Number(newOffer) });
    } catch (_) {
      // Dữ liệu demo/local vẫn được đồng bộ nếu backend chưa có RFQ tương ứng.
    }
    try {
      buyerCounterRfq(rfq.id, Number(newOffer));
      refreshSyncData();
      setNegotiationMessage('Đã gửi đề xuất mới. Hiện đang chờ người bán phản hồi.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể gửi đề xuất mới');
    }
  };

  // 2. Nghiệp vụ: Thanh toán cọc 30% Escrow giả lập
  const handlePayDeposit = (contractId: number) => {
    try {
      const updated = buyerPayDeposit(contractId);
      refreshSyncData();
      setWorkflowMessage(
        `⚡ Đã ký quỹ VietQR 30% (${updated.depositAmount.toLocaleString('vi-VN')} đ) thành công vào tài khoản bảo chứng Escrow! Nông trại đã nhận thông báo và bắt đầu Mốc 2: Thu hoạch & Đóng gói.`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi thanh toán cọc');
    }
  };

  // 3. Nghiệp vụ: Ký xác nhận ePOD khi nhận hàng
  const handleSignEpod = () => {
    if (!activeContract) {
      alert('Vui lòng chọn hợp đồng!');
      return;
    }
    const canvas = signatureRef.current;
    const signatureData = canvas ? canvas.toDataURL('image/png') : 'VERIFIED_SIGNATURE';

    try {
      const updated = buyerSignEpod(
        activeContract.id,
        receivedWeight,
        getStoredUser()?.fullName || 'Đại diện Buyer',
        signatureData,
        proofImage || undefined
      );
      refreshSyncData();
      setWorkflowMessage(
        `✍ Đã ký nhận ePOD thành công! Khối lượng thực nhận: ${receivedWeight.toLocaleString('vi-VN')} kg (Hao hụt: ${(activeContract.quantityKg - receivedWeight).toLocaleString('vi-VN')} kg). Chuyển sang Mốc 5: Quyết toán 70% còn lại.`
      );
      setActiveSection('invoices');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi ký ePOD');
    }
  };

  // 4. Nghiệp vụ: Quyết toán 70% còn lại (trừ hao hụt) & Giải ngân ví nông dân
  const handleFinalSettlement = (contractId: number) => {
    try {
      const updated = buyerPayFinalSettlement(contractId);
      refreshSyncData();
      setWorkflowMessage(
        `🎉 Đã thanh toán 70% quyết toán (${(updated.remainingAmount || 0).toLocaleString('vi-VN')} đ) thành công! Hệ thống Escrow đã tự động giải ngân toàn bộ số tiền về Ví Nông Dân.`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi thanh toán quyết toán');
    }
  };

  // Mốc tiến trình
  const stepLabels = [
    { step: 1, title: 'Tiếp nhận HĐ', sub: 'Chờ cọc 30%' },
    { step: 2, title: 'Thu hoạch', sub: 'Tại Farm Đà Lạt' },
    { step: 3, title: 'Xe lạnh', sub: 'Giám sát IoT 2-5°C' },
    { step: 4, title: 'Tới kho nhận', sub: 'Chờ ký ePOD' },
    { step: 5, title: 'Đối soát ePOD', sub: 'Chốt hao hụt' },
    { step: 6, title: 'Hoàn tất', sub: 'Giải ngân Escrow' },
  ];

  return (
    <div className="min-h-screen bg-[#F5FAFC] flex flex-col">
      <Header />
      <main className="max-w-[1280px] mx-auto px-4 py-8 w-full flex-1">
        {/* Banner thông báo Realtime Sync */}
        <div className="mb-4 bg-white border border-sky-100 rounded-2xl p-3 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-700">Realtime B2B Escrow Engine:</span>
            <span className="text-slate-500 hidden sm:inline">
              Đồng bộ hai chiều tức thì với Phân Hệ Nông Nghiệp (/portal/farmer)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <B2BNotificationBell audience="BUYER" tone="light" />
            <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-bold border border-sky-200">
              {syncRfqs.length} RFQ
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              {syncContracts.length} Hợp đồng B2B
            </span>
            <button
              type="button"
              onClick={refreshSyncData}
              title="Làm mới dữ liệu"
              className="p-1 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {workflowMessage && (
          <div className="mb-5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-bold text-emerald-800 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{workflowMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setWorkflowMessage('')}
              className="text-emerald-700 hover:text-emerald-900 text-xs underline"
            >
              Đóng
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Sidebar điều hướng */}
          <aside className="w-full lg:w-64 bg-[#0C4A6E] text-white rounded-3xl p-5 lg:sticky lg:top-24 shadow-md">
            <div className="flex items-center gap-2 mb-6">
              <LayoutDashboard className="w-5 h-5 text-[#7DD3FC]" />
              <span className="font-bold tracking-wide">Thương Lái / Buyer</span>
            </div>
            <nav className="space-y-1.5 text-sm">
              <button
                type="button"
                onClick={() => setActiveSection('lots')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                  activeSection === 'lots'
                    ? 'bg-white/20 font-bold text-white shadow-xs'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                Tổng quan & Nguồn cung
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('addresses')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all ${
                  activeSection === 'addresses'
                    ? 'bg-white/20 font-bold text-white shadow-xs'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <MapPin className="w-4 h-4 text-sky-300" /> Địa chỉ nhận hàng
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('purchases')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all ${
                  activeSection === 'purchases' ? 'bg-white/20 font-bold text-white shadow-xs' : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-emerald-300" /> Sản phẩm đã mua
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('orders')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all ${
                  activeSection === 'orders' ? 'bg-white/20 font-bold text-white shadow-xs' : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <Truck className="w-4 h-4 text-cyan-300" /> Theo dõi đơn hàng
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('profile')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all ${
                  activeSection === 'profile' ? 'bg-white/20 font-bold text-white shadow-xs' : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <UserRound className="w-4 h-4 text-violet-300" /> Trang cá nhân
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('negotiation')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between font-medium transition-all ${
                  activeSection === 'negotiation'
                    ? 'bg-white/20 font-bold text-white shadow-xs'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2">
                  <MessageSquareQuote className="w-4 h-4 text-sky-300" /> Phòng đàm phán
                </span>
                <span className="bg-sky-400/30 text-sky-200 text-xs px-2 py-0.5 rounded-full font-bold">
                  {syncRfqs.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('escrow')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between font-medium transition-all ${
                  activeSection === 'escrow'
                    ? 'bg-white/20 font-bold text-white shadow-xs'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-orange-300" /> Ký quỹ VietQR 30%
                </span>
                {stats.waitingDepositCount > 0 && (
                  <span className="bg-orange-500 text-white text-[11px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                    {stats.waitingDepositCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('telemetry')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all ${
                  activeSection === 'telemetry'
                    ? 'bg-white/20 font-bold text-white shadow-xs'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <Truck className="w-4 h-4 text-emerald-300" /> Xe lạnh & Tiến trình
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('epod')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all ${
                  activeSection === 'epod'
                    ? 'bg-white/20 font-bold text-white shadow-xs'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <PenLine className="w-4 h-4 text-amber-300" /> Ký nhận ePOD
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('invoices')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all ${
                  activeSection === 'invoices'
                    ? 'bg-white/20 font-bold text-white shadow-xs'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <FileText className="w-4 h-4 text-sky-300" /> Quyết toán 70% & HĐ
              </button>
              <Link
                href="/san-pham"
                className="block px-3.5 py-2.5 rounded-xl text-blue-200 hover:bg-white/10 transition-colors"
              >
                Xem sàn nông sản ↗
              </Link>
            </nav>

            <div className="mt-8 pt-5 border-t border-white/15 text-xs text-blue-100 space-y-3">
              <p className="flex gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#FDBA74]" /> Hợp đồng B2B Bảo Chứng Escrow
              </p>
              <p className="flex gap-2">
                <Truck className="w-4 h-4 shrink-0 text-emerald-300" /> Chuỗi xe lạnh IoT giám sát 24/7
              </p>
              <p className="flex gap-2">
                <PenLine className="w-4 h-4 shrink-0 text-amber-300" /> Nghiệm thu ePOD cấn trừ hao hụt
              </p>
            </div>
          </aside>

          {/* Nội dung chi tiết các Section */}
          <section className="flex-1 min-w-0 space-y-6">
            {activeSection === 'purchases' && <BuyerOrdersPanel mode="purchases" />}
            {activeSection === 'purchases' && (
              <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-6 space-y-4">
                <div>
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">POST-TRADE FEEDBACK</p>
                  <h2 className="font-heading text-xl font-black text-[#0C4A6E] mt-1">Đánh giá giao dịch B2B</h2>
                  <p className="text-sm text-slate-500 mt-1">Đánh giá sau khi hợp đồng đã giao hàng hoặc quyết toán. Đánh giá được lưu theo từng hợp đồng.</p>
                </div>
                {syncContracts.length === 0 ? (
                  <p className="p-4 rounded-2xl bg-slate-50 text-sm text-slate-500">Chưa có hợp đồng B2B để đánh giá.</p>
                ) : (
                  <>
                    <select
                      value={activeContract?.id || ''}
                      onChange={(event) => setSelectedContractId(Number(event.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                    >
                      {syncContracts.map((contract) => (
                        <option key={contract.id} value={contract.id}>{contract.contractCode} · {contract.productName}</option>
                      ))}
                    </select>
                    {activeContract && activeContract.fulfillmentStep < 6 && activeContract.finalPaidStatus !== 'PAID' ? (
                      <p className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-sm text-amber-800">Hợp đồng này chưa hoàn tất. Bạn có thể đánh giá sau khi ký nhận và quyết toán.</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} type="button" onClick={() => setReviewStars(star)} className="p-1 hover:scale-110 transition-transform" aria-label={`Chọn ${star} sao`}>
                              <Star className={`w-7 h-7 ${star <= reviewStars ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                            </button>
                          ))}
                          <span className="text-sm font-bold text-slate-500 ml-2">{reviewStars}/5 sao</span>
                        </div>
                        <textarea
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                          maxLength={2000}
                          rows={3}
                          placeholder="Chia sẻ cảm nhận về chất lượng lô hàng và phối hợp giao nhận..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <p className={`text-sm ${reviewMessage.includes('thành công') ? 'text-emerald-700' : 'text-slate-500'}`}>{reviewMessage}</p>
                          <button type="button" onClick={handleSubmitBuyerReview} disabled={reviewLoading} className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm disabled:opacity-50">
                            {reviewLoading ? 'Đang lưu...' : 'Lưu đánh giá'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {activeSection === 'orders' && <BuyerOrdersPanel mode="tracking" />}
            {activeSection === 'profile' && <BuyerProfilePanel />}
            {activeSection === 'addresses' && <BuyerAddressesPanel />}

            {/* Header Tổng Quan */}
            <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-[#0284C7] uppercase tracking-wider">
                    PHÂN HỆ THƯƠNG LÁI (BUYER B2B)
                  </p>
                  <h1 className="font-heading text-2xl sm:text-3xl font-black text-[#0C4A6E] mt-1">
                    Trung Tâm Đàm Phán & Giao Nhận B2B
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Đàm phán hợp đồng hai chiều, ký quỹ VietQR 30% Escrow, kiểm soát hành trình xe lạnh IoT và ký nhận ePOD.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-sky-50 rounded-xl px-3 py-2 border border-sky-100">
                    <b className="block text-lg font-black text-[#0C4A6E]">{stats.lots}</b>
                    Lô đang mở
                  </div>
                  <div className="bg-sky-50 rounded-xl px-3 py-2 border border-sky-100">
                    <b className="block text-lg font-black text-[#0C4A6E]">
                      {stats.available.toLocaleString('vi-VN')}
                    </b>
                    Kg sẵn sàng
                  </div>
                  <div className="bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-100">
                    <b className="block text-lg font-black text-emerald-700">{stats.contractsCount}</b>
                    Đơn hàng B2B
                  </div>
                </div>
              </div>
            </div>

            {/* TAB 1: NGUỒN CUNG NÔNG SẢN SỈ */}
            {activeSection === 'lots' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-4 border border-sky-100 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={keyword}
                      onChange={(e) => { setKeyword(e.target.value); setLotsPage(1); }}
                      placeholder="Tìm tên nông sản, HTX, mã lô VietGAP..."
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <select
                    value={category}
                    onChange={(e) => { setCategory(e.target.value); setLotsPage(1); }}
                    className="sm:w-44 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700"
                  >
                    <option value="ALL">Tất cả ngành hàng</option>
                    <option value="rau-sach">Rau ăn lá</option>
                    <option value="cu">Củ & quả</option>
                    <option value="nam-tuoi">Nấm tươi</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setKeyword('');
                      setCategory('ALL');
                      setLotsPage(1);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" /> Xóa lọc
                  </button>
                </div>

                {loading ? (
                  <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-sky-100">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-500 mb-2" />
                    Đang tải danh sách nguồn cung nông sản...
                  </div>
                ) : products.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-sky-100">
                    Không tìm thấy lô nông sản phù hợp với tiêu chí tìm kiếm.
                  </div>
                ) : (
                  <>
                    <div className="grid lg:grid-cols-2 gap-5" id="buyer-lots-grid">
                      {products.map((product) => (
                        <div key={product.id} className="relative">
                          <ProductCard product={product} layout="grid" onNegotiate={setSelectedProduct} />
                        </div>
                      ))}
                    </div>
                    <Pagination currentPage={lotsPage} totalPages={lotsTotalPages} totalItems={lotsTotal} pageSize={10} onPageChange={setLotsPage} scrollTargetId="buyer-lots-grid" />
                  </>
                )}
              </div>
            )}

            {/* TAB 2: PHÒNG ĐÀM PHÁN HAI CHIỀU */}
            {activeSection === 'negotiation' && (
              <div className="bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                      B2B NEGOTIATION WORKSPACE · REALTIME SYNC
                    </p>
                    <h2 className="font-heading text-2xl font-black text-[#0C4A6E] mt-1">
                      Phòng Đàm Phán Nông Sản Hai Chiều
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Trao đổi số lượng, phản giá và chốt hợp đồng B2B trực tiếp với Nông Trại / HTX.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('lots')}
                    className="px-4 py-2 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold hover:bg-sky-100 border border-sky-200 transition-colors"
                  >
                    + Tạo thêm RFQ mới
                  </button>
                </div>

                <div className="grid lg:grid-cols-[300px_1fr] min-h-[560px]">
                  {/* Danh sách RFQs bên trái */}
                  <div className="border-r border-slate-100 bg-slate-50/60 p-3 space-y-2 overflow-y-auto max-h-[640px]">
                    <p className="text-[11px] font-bold text-slate-400 uppercase px-2 mb-1">
                      Danh sách RFQ đang giao dịch ({syncRfqs.length})
                    </p>
                    {syncRfqs.map((item) => {
                      const isSelected = (currentRfq?.rfqCode || '') === item.rfqCode;
                      const statusMeta = getRfqStatusMeta(isRfqExpiredAt(item.expiresAt, item.createdAt, item.status) ? 'EXPIRED' : item.status, 'BUYER');
                      return (
                        <button
                          type="button"
                          key={`${item.rfqCode || "rfq"}-${item.id}`}
                          onClick={() => setSelectedRfqCode(item.rfqCode)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                            isSelected
                              ? 'bg-white border-sky-400 shadow-md ring-2 ring-sky-100'
                              : 'bg-white/70 border-slate-200 hover:bg-white'
                          }`}
                        >
                          <div className="flex justify-between items-center gap-2">
                            <strong className="text-xs font-black text-[#0C4A6E]">{item.rfqCode}</strong>
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-800 mt-1.5 line-clamp-1">
                            {item.productName}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Lô: {item.lotCode}</p>
                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            <span
                              className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${statusMeta.className} ${statusMeta.nextActor ? 'animate-pulse' : ''}`}
                            >
                              {statusMeta.label}
                            </span>
                            <span className="text-[11px] font-black text-slate-700">
                              {item.requestedQuantityKg.toLocaleString('vi-VN')} kg
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Chi tiết đàm phán RFQ được chọn */}
                  {currentRfq ? (
                    <div className="flex flex-col h-full bg-white">
                      {/* Header RFQ */}
                      <div className="p-5 border-b border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                              {currentRfq.rfqCode}
                            </span>
                            <span className="text-xs text-slate-400">· Lô {currentRfq.lotCode}</span>
                          </div>
                          <h3 className="font-bold text-lg text-[#0C4A6E] mt-1">{currentRfq.productName}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Bên bán: Nông Trại Hữu Cơ Đà Lạt Fresh · Đặt:{' '}
                            <b className="text-slate-700">
                              {currentRfq.requestedQuantityKg.toLocaleString('vi-VN')} kg
                            </b>
                          </p>
                        </div>
                        <div className="text-right bg-white p-3 rounded-2xl border border-slate-200">
                          <p className="text-[11px] text-slate-500 font-medium">Đề xuất vs Phản giá</p>
                          <div className="flex items-center justify-end gap-2 mt-0.5">
                            <span className="text-xs text-slate-500 line-through">
                              {currentRfq.targetPricePerKg.toLocaleString('vi-VN')} đ
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-base font-black text-orange-600">
                              {(currentRfq.counterPricePerKg || currentRfq.targetPricePerKg).toLocaleString(
                                'vi-VN'
                              )}{' '}
                              đ/kg
                            </span>
                          </div>
                          <div className="mt-2"><RfqCountdown expiresAt={currentRfq.expiresAt} createdAt={currentRfq.createdAt} /></div>
                        </div>
                      </div>

                      <details className="mx-5 mt-4 rounded-2xl border border-slate-200 bg-slate-50/60">
                        <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-slate-700">Xem lịch sử phiên bản giá và phản hồi</summary>
                        <div className="px-4 pb-4"><RfqHistoryTimeline events={rfqHistory} /></div>
                      </details>

                      {/* Khung tin nhắn đàm phán */}
                      <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50/20 to-white">
                        {/* Lời đề xuất ban đầu từ Buyer */}
                        <div className="flex justify-end">
                          <div className="max-w-[80%] p-4 rounded-3xl rounded-tr-xs bg-sky-600 text-white shadow-sm space-y-1.5 text-sm">
                            <div className="flex items-center justify-between gap-3 text-[11px] text-sky-100 font-bold border-b border-sky-500/40 pb-1">
                              <span>Bạn (Thương Lái Buyer)</span>
                              <span>Đề xuất ban đầu</span>
                            </div>
                            <p>
                              Đề xuất thu mua lô nông sản <b>{currentRfq.requestedQuantityKg.toLocaleString('vi-VN')} kg</b> với giá{' '}
                              <b>{currentRfq.targetPricePerKg.toLocaleString('vi-VN')} đ/kg</b>.
                            </p>
                            <p className="text-xs text-sky-100">
                              📍 Địa điểm giao nhận: {currentRfq.deliveryLocation}
                            </p>
                            {currentRfq.notes && (
                              <p className="text-xs text-sky-100 italic">Ghi chú: {currentRfq.notes}</p>
                            )}
                          </div>
                        </div>

                        {/* Phản hồi từ Farmer/HTX */}
                        {isRfqWaitingForBuyer(currentRfqStatus) && !currentRfqExpired && (
                          <div className="flex justify-start">
                            <div className="max-w-[80%] p-4 rounded-3xl rounded-tl-xs bg-orange-50 border border-orange-200 text-slate-800 shadow-sm space-y-2 text-sm">
                              <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-orange-800 border-b border-orange-200 pb-1">
                                <span>Nông Dân (Nông Trại Hữu Cơ Đà Lạt)</span>
                                <span className="bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full">
                                  Counter-Offer Đề Xuất Giá Mới
                                </span>
                              </div>
                              <p>
                                Chào quý công ty, nông trại chúng tôi đã nhận được đề xuất mua {currentRfq.requestedQuantityKg.toLocaleString('vi-VN')} kg.
                                Để đảm bảo sản phẩm <b>loại 1 tuyển chọn, brix cao, đóng thùng chuẩn xuất khẩu và vận chuyển duy trì xe lạnh 2-5°C</b> suốt tuyến,
                                nông trại đề xuất mức giá chốt là:{' '}
                                <b className="text-orange-600 text-base">
                                  {currentRfq.counterPricePerKg?.toLocaleString('vi-VN')} đ/kg
                                </b>.
                              </p>
                              <p className="text-xs text-slate-500">
                                Quý thương lái có thể bấm "Chấp Nhận Giá" để kích hoạt tạo Hợp đồng B2B Escrow và tiến hành đặt cọc 30%!
                              </p>
                            </div>
                          </div>
                        )}

                        {currentRfqStatus === 'ACCEPTED' && (
                          <div className="flex justify-center my-4">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center max-w-md shadow-xs">
                              <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
                              <h4 className="font-bold text-emerald-900 text-sm">
                                Hợp Đồng B2B Đã Ký Kết Thành Công!
                              </h4>
                              <p className="text-xs text-emerald-700 mt-1">
                                Hai bên đã thống nhất giá {(currentRfq.counterPricePerKg || currentRfq.targetPricePerKg).toLocaleString('vi-VN')} đ/kg.
                                {currentRfq.contractCode ? ` Hợp đồng ${currentRfq.contractCode} đã được tạo.` : ''} Vui lòng tiến hành Ký Quỹ VietQR 30% để tiến hành thu hoạch.
                              </p>
                            </div>
                          </div>
                        )}

                        {isRfqWaitingForFarmer(currentRfqStatus) && !currentRfqExpired && (
                          <div className="flex justify-start">
                            <div className="max-w-[80%] p-4 rounded-3xl rounded-tl-xs bg-slate-100 text-slate-700 space-y-1 text-sm">
                              <p className="text-xs font-bold text-slate-500">Hệ Thống HoNa Fresh</p>
                              <p>
                                Yêu cầu RFQ đã được gửi tới Phân Hệ Nông Nghiệp. Nông dân đang kiểm tra tồn kho tại farm và sẽ phản hồi trong giây lát.
                              </p>
                              <p className="text-[11px] text-sky-700">
                                💡 Mẹo: Bạn có thể mở tab Nông Dân (/portal/farmer) trên cùng trình duyệt để xem thông báo và gửi phản giá phản hồi realtime!
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer hành động đàm phán */}
                      <div className="p-4 border-t border-slate-100 bg-slate-50/80">
                        {isRfqWaitingForBuyer(currentRfqStatus) && !currentRfqExpired && (
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleBuyerAcceptRfq(currentRfq)}
                              className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                            >
                              <Check className="w-5 h-5" />
                              Chấp Nhận Giá {currentRfq.counterPricePerKg?.toLocaleString('vi-VN')} đ/kg & Tạo Hợp Đồng B2B
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleBuyerCounterRfq(currentRfq)}
                              className="w-full sm:w-auto py-3 px-4 rounded-xl border border-sky-300 bg-white text-sky-800 hover:bg-sky-50 font-bold text-xs transition-colors"
                            >
                              Gửi Counter-Offer Mới
                            </button>
                          </div>
                        )}

                        {currentRfqStatus === 'ACCEPTED' && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 font-medium">
                              Hợp đồng B2B đã tạo. Chuyển sang bước Ký Quỹ Escrow:
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveSection('escrow')}
                              className="py-2.5 px-5 rounded-xl bg-[#0C4A6E] text-white hover:bg-[#083B59] font-bold text-xs flex items-center gap-2 shadow-sm transition-colors"
                            >
                              Ký Quỹ VietQR 30% Ngay <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {isRfqWaitingForFarmer(currentRfqStatus) && !currentRfqExpired && (
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500 animate-spin" />
                            Đang chờ phản hồi từ Nông Trại. Dữ liệu sẽ tự động nhảy khi nông dân chấp nhận hoặc gửi counter-offer.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-slate-400">Chưa có RFQ nào được chọn.</div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: KÝ QUỸ BẢO CHỨNG 30% (ESCROW) */}
            {activeSection === 'escrow' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                      ESCROW PAYMENT · VIETQR CHUẨN NAPAS
                    </p>
                    <h2 className="font-heading text-2xl font-black text-[#0C4A6E] mt-1">
                      Ký Quỹ Bảo Chứng 30% Giá Trị Đơn Hàng
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Tiền cọc được giữ an toàn tại tài khoản bảo chứng trung gian Escrow của HoNa Fresh, chỉ thanh toán cho nông dân khi hàng được nghiệm thu đạt chuẩn.
                    </p>
                  </div>
                  {/* Dropdown chọn hợp đồng */}
                  <div className="sm:w-72">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Chọn Hợp Đồng B2B Cần Cọc:
                    </label>
                    <select
                      value={selectedContractId || ''}
                      onChange={(e) => setSelectedContractId(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                    >
                      {syncContracts.map((c) => (
                        <option key={`${c.contractCode || "contract"}-${c.id}`} value={c.id}>
                          {c.contractCode} · {c.productName} ({c.depositStatus === 'DEPOSIT_PAID' ? 'Đã cọc' : 'Chờ cọc 30%'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeContract ? (
                  <div className="grid lg:grid-cols-2 gap-8 items-center">
                    {/* Thông tin hợp đồng & chi tiết cọc */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2.5 py-1 rounded-md bg-sky-100 text-[#0C4A6E]">
                          {activeContract.contractCode}
                        </span>
                        <span className="text-xs text-slate-500">Mã Lô: {activeContract.lotCode}</span>
                      </div>

                      <h3 className="font-bold text-xl text-[#0C4A6E]">{activeContract.productName}</h3>
                      <p className="text-xs text-slate-500">
                        Nhà cung cấp: <b>{activeContract.farmerCompany}</b> ({activeContract.farmerName})
                      </p>

                      <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div>
                          <span className="text-slate-500">Sản lượng hợp đồng:</span>
                          <strong className="block text-sm text-slate-800 mt-0.5">
                            {activeContract.quantityKg.toLocaleString('vi-VN')} kg
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Đơn giá đã chốt:</span>
                          <strong className="block text-sm text-slate-800 mt-0.5">
                            {activeContract.agreedPricePerKg.toLocaleString('vi-VN')} đ/kg
                          </strong>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-slate-200/60">
                          <span className="text-slate-500">Tổng giá trị hợp đồng (100%):</span>
                          <strong className="block text-base text-[#0C4A6E] font-black mt-0.5">
                            {activeContract.totalAmount.toLocaleString('vi-VN')} đ
                          </strong>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-orange-900 font-bold">Tiền cọc bảo chứng Escrow (30%):</span>
                          <span className="text-xl font-black text-orange-600">
                            {activeContract.depositAmount.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-600">
                          <span>70% còn lại thanh toán sau nghiệm thu:</span>
                          <span className="font-bold text-slate-800">
                            {activeContract.remainingAmount.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 italic pt-1">
                          🛡️ Cam kết: Nếu nông trại không giao hàng hoặc vi phạm chất lượng, tiền cọc 30% sẽ được hoàn trả 100% về tài khoản Buyer.
                        </p>
                      </div>

                      {/* Nút thanh toán */}
                      {activeContract.depositStatus === 'WAITING_DEPOSIT' ? (
                        <button
                          type="button"
                          onClick={() => handlePayDeposit(activeContract.id)}
                          className="w-full py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                        >
                          <Zap className="w-5 h-5 text-amber-200 fill-amber-200" />
                          Giả Lập Đã Quét & Thanh Toán Cọc 30% ({activeContract.depositAmount.toLocaleString('vi-VN')} đ)
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-sm flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            Đã Đóng Cọc 30% Thành Công · Đơn Hàng Đang Chạy Tiến Trình!
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveSection('telemetry')}
                            className="w-full py-3 rounded-xl bg-[#0C4A6E] hover:bg-[#083B59] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                          >
                            Theo Dõi Xe Lạnh Vận Chuyển & Tiến Trình <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Khung quét mã VietQR */}
                    <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-200 text-center space-y-3">
                      <p className="text-xs font-bold text-[#0C4A6E]">
                        Quét mã VietQR thanh toán vào Quỹ Ký Quỹ Escrow
                      </p>
                      <div className="inline-block p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                        <img
                          src={`https://api.vietqr.io/image/970422-0987654321-compact2.jpg?amount=${activeContract.depositAmount}&addInfo=COC%20${activeContract.contractCode}`}
                          alt="VietQR Đặt cọc 30%"
                          className="w-56 h-56 mx-auto object-contain rounded-xl"
                        />
                      </div>
                      <div className="text-xs text-slate-600 space-y-0.5">
                        <p className="font-bold text-[#0C4A6E]">Ngân hàng Quân Đội (MB Bank)</p>
                        <p>Số tài khoản Escrow: <b className="text-slate-800">0987654321</b></p>
                        <p>Chủ TK: <b className="text-slate-800">HONA FRESH ESCROW B2B</b></p>
                        <p className="text-[11px] text-slate-500">
                          Nội dung: <b className="text-orange-600">COC {activeContract.contractCode}</b>
                        </p>
                      </div>
                      <p
                        className={`text-xs font-bold pt-1 ${
                          activeContract.depositStatus === 'DEPOSIT_PAID'
                            ? 'text-emerald-600'
                            : 'text-orange-600'
                        }`}
                      >
                        {activeContract.depositStatus === 'DEPOSIT_PAID'
                          ? '✓ Đã ghi nhận ký quỹ Escrow'
                          : '⏳ Đang chờ người mua quét mã...'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-10">Chưa có hợp đồng nào.</p>
                )}
              </div>
            )}

            {/* TAB 4: THEO DÕI XE LẠNH IOT & TIẾN TRÌNH GIAO NHẬN */}
            {activeSection === 'telemetry' && (
              <div className="space-y-6">
                {/* Chọn hợp đồng */}
                <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                      COLD-CHAIN IOT & TIMELINE FULFILLMENT
                    </p>
                    <h2 className="font-heading text-2xl font-black text-[#0C4A6E] mt-1">
                      Giám Sát Chuỗi Vận Chuyển Lạnh & Tiến Trình Đơn Hàng
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Theo dõi trạng thái 6 mốc tiến trình và nhiệt độ xe lạnh liên tục từ Đà Lạt tới kho Buyer.
                    </p>
                  </div>
                  <div className="sm:w-72">
                    <select
                      value={selectedContractId || ''}
                      onChange={(e) => setSelectedContractId(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                    >
                      {syncContracts.map((c) => (
                        <option key={`${c.contractCode || "contract"}-${c.id}`} value={c.id}>
                          {c.contractCode} · Mốc {c.fulfillmentStep}/6
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeContract && (
                  <>
                    {/* Tiến trình 6 Mốc trực quan */}
                    <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0C4A6E] uppercase tracking-wider">
                          Tiến trình đơn hàng: {activeContract.fulfillmentStatusName}
                        </span>
                        <span className="text-xs font-black text-sky-600">
                          Mốc {activeContract.fulfillmentStep} / 6
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {stepLabels.map((s) => {
                          const isDone = activeContract.fulfillmentStep > s.step;
                          const isCurrent = activeContract.fulfillmentStep === s.step;
                          return (
                            <div
                              key={s.step}
                              className={`p-3 rounded-2xl border text-center transition-all ${
                                isDone
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : isCurrent
                                  ? 'bg-sky-50 border-sky-400 text-[#0C4A6E] shadow-sm ring-2 ring-sky-100'
                                  : 'bg-slate-50/60 border-slate-200 text-slate-400'
                              }`}
                            >
                              <div
                                className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-black mb-1.5 ${
                                  isDone
                                    ? 'bg-emerald-600 text-white'
                                    : isCurrent
                                    ? 'bg-sky-600 text-white animate-pulse'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {isDone ? '✓' : s.step}
                              </div>
                              <p className="text-xs font-bold line-clamp-1">{s.title}</p>
                              <p className="text-[10px] opacity-75 line-clamp-1">{s.sub}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Phím tắt mô phỏng nghiệp vụ nhanh cho demo */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 text-xs">
                        <span className="text-slate-500">
                          Xe đang ở <b>{activeContract.fulfillmentStatusName}</b>
                        </span>
                        <div className="flex gap-2">
                          {activeContract.fulfillmentStep === 3 && (
                            <button
                              type="button"
                              onClick={() => {
                                updateContractFulfillmentStep(activeContract.id, 4);
                                refreshSyncData();
                                setWorkflowMessage(
                                  'Đã cập nhật Mốc 4: Xe lạnh đã tới kho nhận hàng! Mời Buyer tiến hành Ký nhận ePOD.'
                                );
                                setActiveSection('epod');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-colors"
                            >
                              ▶ Mô phỏng xe tới kho (Chuyển Mốc 4)
                            </button>
                          )}
                          {activeContract.fulfillmentStep >= 4 && (
                            <button
                              type="button"
                              onClick={() => setActiveSection('epod')}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors"
                            >
                              Đi tới Ký nhận ePOD →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bảng đồng hồ cảm biến IoT xe lạnh */}
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="p-5 rounded-3xl bg-white border border-sky-100 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Cảm biến nhiệt độ</span>
                          <Thermometer className="w-5 h-5 text-sky-600" />
                        </div>
                        <p className="text-3xl font-black text-[#0C4A6E] mt-2">{telemetry.temperature}°C</p>
                        <p className="text-xs text-emerald-600 font-bold">Chuẩn an toàn: 2.0°C – 6.0°C</p>
                      </div>

                      <div className="p-5 rounded-3xl bg-white border border-sky-100 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Độ ẩm thùng lạnh</span>
                          <Droplets className="w-5 h-5 text-sky-600" />
                        </div>
                        <p className="text-3xl font-black text-[#0C4A6E] mt-2">{telemetry.humidity}%</p>
                        <p className="text-xs text-slate-500">Cập nhật cảm biến IoT 4s/lần</p>
                      </div>

                      <div className="p-5 rounded-3xl bg-white border border-sky-100 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Tình trạng xe lạnh</span>
                          <Truck className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-xl font-black text-emerald-700 mt-2">Bình Thường (Đạt Chuẩn)</p>
                        <p className="text-xs text-slate-400">
                          {telemetry.updatedAt
                            ? `Cập nhật lúc ${new Date(telemetry.updatedAt).toLocaleTimeString('vi-VN')}`
                            : 'Đang kết nối GPS'}
                        </p>
                      </div>
                    </div>

                    {/* Chi tiết tài xế & xe */}
                    <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-4">
                      <h4 className="font-bold text-sm text-[#0C4A6E] flex items-center gap-2">
                        <Truck className="w-4 h-4 text-sky-600" /> Thông tin chuyến xe chuyên dụng
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-4 rounded-2xl bg-slate-50 space-y-1">
                          <span className="text-slate-400">Biển số & Loại xe:</span>
                          <p className="font-bold text-slate-800 text-sm">{activeContract.truckLicensePlate}</p>
                          <span className="text-slate-400 block pt-1">Tài xế phụ trách:</span>
                          <p className="font-bold text-slate-800">
                            {activeContract.truckDriverName} ({activeContract.truckDriverPhone})
                          </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 space-y-1">
                          <span className="text-slate-400">Điểm giao nhận chỉ định:</span>
                          <p className="font-bold text-slate-800 text-sm">{activeContract.deliveryAddress}</p>
                          <span className="text-slate-400 block pt-1">Khung giờ giao hàng:</span>
                          <p className="font-bold text-slate-800">{activeContract.deliveryTimeSlot}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 5: KÝ NHẬN HÀNG EPOD (ELECTRONIC PROOF OF DELIVERY) */}
            {activeSection === 'epod' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-sky-100 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                      ELECTRONIC PROOF OF DELIVERY · EPOD
                    </p>
                    <h2 className="font-heading text-2xl font-black text-[#0C4A6E] mt-1">
                      Ký Biên Bản Nghiệm Thu & Nhận Hàng Điện Tử
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Kiểm đếm khối lượng thực nhận tại kho, ghi nhận tỷ lệ hao hụt tự động để cấn trừ trực tiếp vào số tiền quyết toán cuối 70%.
                    </p>
                  </div>
                  <div className="sm:w-72">
                    <select
                      value={selectedContractId || ''}
                      onChange={(e) => setSelectedContractId(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                    >
                      {syncContracts.map((c) => (
                        <option key={`${c.contractCode || "contract"}-${c.id}`} value={c.id}>
                          {c.contractCode} ({c.quantityKg.toLocaleString('vi-VN')} kg)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeContract ? (
                  <div className="space-y-6">
                    {/* Bảng đối soát khối lượng */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <label className="block text-xs font-bold text-slate-700">
                          Khối lượng thực nhận khi cân tại kho (kg)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={activeContract.quantityKg * 1.5}
                          value={receivedWeight}
                          onChange={(e) => setReceivedWeight(Number(e.target.value) || 0)}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base font-bold text-[#0C4A6E] bg-white focus:outline-none focus:border-sky-500"
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Khối lượng cam kết hợp đồng:</span>
                          <b>{activeContract.quantityKg.toLocaleString('vi-VN')} kg</b>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 space-y-2 text-xs">
                        <span className="font-bold text-orange-900 block">Tự động tính toán hao hụt:</span>
                        <div className="flex justify-between text-slate-700">
                          <span>Khối lượng hao hụt ghi nhận:</span>
                          <b className="text-orange-600">
                            {Math.max(0, activeContract.quantityKg - receivedWeight).toLocaleString('vi-VN')} kg
                          </b>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Tỷ lệ hao hụt:</span>
                          <b className="text-orange-600">
                            {(
                              (Math.max(0, activeContract.quantityKg - receivedWeight) /
                                activeContract.quantityKg) *
                              100
                            ).toFixed(1)}
                            %
                          </b>
                        </div>
                        <div className="flex justify-between text-slate-700 pt-1 border-t border-orange-200">
                          <span>Số tiền cấn trừ vào đợt 70%:</span>
                          <b className="text-orange-700">
                            -{' '}
                            {(
                              Math.max(0, activeContract.quantityKg - receivedWeight) *
                              activeContract.agreedPricePerKg
                            ).toLocaleString('vi-VN')}{' '}
                            đ
                          </b>
                        </div>
                      </div>
                    </div>

                    {/* Chữ ký điện tử & Ảnh đối chứng */}
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700">
                            Chữ ký điện tử đại diện bên nhận (Vẽ bằng chuột/tay)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const canvas = signatureRef.current;
                              const ctx = canvas?.getContext('2d');
                              if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                            }}
                            className="text-xs text-sky-700 hover:underline"
                          >
                            Xóa chữ ký vẽ lại
                          </button>
                        </div>
                        <canvas
                          ref={signatureRef}
                          width={500}
                          height={160}
                          onMouseDown={(e) => {
                            const canvas = signatureRef.current;
                            if (!canvas) return;
                            const rect = canvas.getBoundingClientRect();
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            ctx.beginPath();
                            ctx.moveTo(
                              ((e.clientX - rect.left) * canvas.width) / rect.width,
                              ((e.clientY - rect.top) * canvas.height) / rect.height
                            );
                            setIsDrawing(true);
                          }}
                          onMouseMove={(e) => {
                            if (!isDrawing) return;
                            const canvas = signatureRef.current;
                            if (!canvas) return;
                            const rect = canvas.getBoundingClientRect();
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            ctx.lineWidth = 3;
                            ctx.strokeStyle = '#0C4A6E';
                            ctx.lineTo(
                              ((e.clientX - rect.left) * canvas.width) / rect.width,
                              ((e.clientY - rect.top) * canvas.height) / rect.height
                            );
                            ctx.stroke();
                          }}
                          onMouseUp={() => setIsDrawing(false)}
                          onMouseLeave={() => setIsDrawing(false)}
                          className="w-full h-36 border border-dashed border-slate-300 rounded-2xl bg-slate-50 cursor-crosshair"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block">
                          Ảnh chụp biên bản / kiện hàng đối chứng
                        </label>
                        <label className="flex flex-col items-center justify-center h-36 rounded-2xl border border-dashed border-sky-300 bg-sky-50/50 hover:bg-sky-50 text-xs font-bold text-sky-700 cursor-pointer transition-colors p-4 text-center">
                          <Upload className="w-6 h-6 mb-1 text-sky-600" />
                          <span>{proofImage ? 'Đã tải lên ảnh đối chứng' : 'Tải lên ảnh chụp thực tế tại kho'}</span>
                          <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                            JPG, PNG hoặc ảnh camera kiểm hàng
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setProofImage(URL.createObjectURL(file));
                            }}
                          />
                        </label>
                        {proofImage && (
                          <div className="flex items-center gap-2">
                            <img
                              src={proofImage}
                              alt="Ảnh chụp thực tế"
                              className="w-16 h-12 object-cover rounded-lg border border-slate-200"
                            />
                            <span className="text-xs text-emerald-600 font-bold">✓ Ảnh đối chứng hợp lệ</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nút ký xác nhận */}
                    <button
                      type="button"
                      onClick={handleSignEpod}
                      className="w-full py-4 rounded-2xl bg-[#0C4A6E] hover:bg-[#083B59] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.005]"
                    >
                      <PenLine className="w-5 h-5 text-sky-300" />
                      Ký Xác Nhận ePOD & Chuyển Sang Quyết Toán 70% Còn Lại
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-10">Chưa có hợp đồng nào.</p>
                )}
              </div>
            )}

            {/* TAB 6: QUYẾT TOÁN 70% & HÓA ĐƠN CHỨNG TỪ */}
            {activeSection === 'invoices' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-sky-100 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <p className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                        FINAL SETTLEMENT · ESCROW DISBURSEMENT
                      </p>
                      <h2 className="font-heading text-2xl font-black text-[#0C4A6E] mt-1">
                        Quyết Toán 70% Còn Lại & Hóa Đơn Điện Tử
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Số tiền thanh toán được tự động khấu trừ theo biên bản bàn giao ePOD thực nhận. Khi Buyer hoàn tất thanh toán, tiền sẽ tự động giải ngân về Ví Nông Dân.
                      </p>
                    </div>
                    <div className="sm:w-72">
                      <select
                        value={selectedContractId || ''}
                        onChange={(e) => setSelectedContractId(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                      >
                        {syncContracts.map((c) => (
                          <option key={`${c.contractCode || "contract"}-${c.id}`} value={c.id}>
                            {c.contractCode} ({c.finalPaidStatus === 'PAID' ? 'Đã hoàn tất' : 'Chưa quyết toán'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {activeContract ? (
                    <div className="space-y-6">
                      {/* Bảng cân đối tài chính */}
                      <div className="grid sm:grid-cols-4 gap-3 text-sm">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 text-xs">Giá trị hợp đồng:</span>
                          <strong className="block text-base text-[#0C4A6E] font-black mt-1">
                            {activeContract.totalAmount.toLocaleString('vi-VN')} đ
                          </strong>
                        </div>
                        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200">
                          <span className="text-orange-700 text-xs">Đã cọc Escrow 30%:</span>
                          <strong className="block text-base text-orange-600 font-black mt-1">
                            {activeContract.depositAmount.toLocaleString('vi-VN')} đ
                          </strong>
                        </div>
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                          <span className="text-rose-700 text-xs">Khấu trừ hao hụt ePOD:</span>
                          <strong className="block text-base text-rose-600 font-black mt-1">
                            -{' '}
                            {(
                              (activeContract.epodDamagedWeightKg || 0) * activeContract.agreedPricePerKg
                            ).toLocaleString('vi-VN')}{' '}
                            đ
                          </strong>
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                          <span className="text-emerald-700 text-xs font-bold">Số tiền quyết toán 70%:</span>
                          <strong className="block text-xl text-emerald-700 font-black mt-0.5">
                            {(activeContract.remainingAmount || 0).toLocaleString('vi-VN')} đ
                          </strong>
                        </div>
                      </div>

                      {/* Thanh toán VietQR 70% */}
                      <div className="grid md:grid-cols-2 gap-6 items-center p-6 bg-slate-50/70 rounded-3xl border border-slate-200">
                        <div className="space-y-3">
                          <h4 className="font-bold text-[#0C4A6E] text-base">
                            Quét mã VietQR thanh toán 70% còn lại
                          </h4>
                          <p className="text-xs text-slate-500">
                            Sau khi quét mã, hệ thống Escrow sẽ xác nhận và giải ngân toàn bộ số tiền thanh toán vào số dư ví của Nông Dân bên kia.
                          </p>
                          <div className="text-xs space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                            <p>Mã Hợp Đồng: <b>{activeContract.contractCode}</b></p>
                            <p>Khối lượng thanh toán thực tế: <b>{(activeContract.epodDeliveredWeightKg || activeContract.quantityKg).toLocaleString('vi-VN')} kg</b></p>
                            <p>Số tiền quyết toán: <b className="text-orange-600">{(activeContract.remainingAmount || 0).toLocaleString('vi-VN')} đ</b></p>
                          </div>

                          {activeContract.finalPaidStatus === 'PAID' ? (
                            <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-sm flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                              Đã Quyết Toán 70% & Giải Ngân Thành Công Về Ví Nông Dân!
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleFinalSettlement(activeContract.id)}
                              className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                            >
                              <Zap className="w-5 h-5 text-amber-200 fill-amber-200" />
                              Giả Lập Đã Thanh Toán 70% ({(activeContract.remainingAmount || 0).toLocaleString('vi-VN')} đ)
                            </button>
                          )}
                        </div>

                        <div className="text-center">
                          <img
                            src={`https://api.vietqr.io/image/970422-0987654321-compact2.jpg?amount=${
                              activeContract.remainingAmount || 0
                            }&addInfo=THANHTOAN%20${activeContract.contractCode}`}
                            alt="VietQR thanh toán 70%"
                            className="w-48 h-48 mx-auto object-contain rounded-2xl border border-slate-200 bg-white p-2 shadow-xs"
                          />
                          <p className="text-[11px] text-slate-500 mt-2">MB Bank · STK 0987654321</p>
                        </div>
                      </div>

                      {/* Hóa đơn & Chứng từ */}
                      <div className="border-t border-slate-100 pt-5 space-y-3">
                        <h4 className="font-bold text-sm text-[#0C4A6E] flex items-center gap-2">
                          <FileText className="w-4 h-4 text-sky-600" /> Hóa đơn VAT & Biên bản giao nhận
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                            <div>
                              <p className="text-xs font-bold text-slate-800">Hóa đơn điện tử VAT (e-Invoice)</p>
                              <p className="text-[11px] text-slate-500">Mã hóa đơn: HD-VAT-{activeContract.contractCode}</p>
                            </div>
                            <a
                              href={getBuyerInvoiceUrl(activeContract.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-sky-100 text-sky-800 hover:bg-sky-200 text-xs font-bold flex items-center gap-1 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" /> Xem HĐ
                            </a>
                          </div>

                          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                            <div>
                              <p className="text-xs font-bold text-slate-800">Biên bản bàn giao điện tử ePOD</p>
                              <p className="text-[11px] text-slate-500">
                                {activeContract.epodSignedAt
                                  ? `Đã ký lúc ${new Date(activeContract.epodSignedAt).toLocaleTimeString('vi-VN')}`
                                  : 'Đã lưu chữ ký số'}
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">
                              Đã xác thực
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-slate-400 py-10">Chưa có hợp đồng nào.</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
      <B2BNegotiationModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onSuccess={() => {
          refreshSyncData();
          setActiveSection('negotiation');
        }}
      />
    </div>
  );
}
