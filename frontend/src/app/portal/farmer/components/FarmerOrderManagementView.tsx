'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  FileText,
  ChevronRight,
  RotateCw,
  Eye,
  AlertTriangle,
  Building2,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
  TrendingUp,
  LockKeyhole,
  Scale,
  QrCode,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import {
  B2bSyncContract,
  getSyncContracts,
  subscribeB2bSyncEvents,
  farmerStartHarvest,
  farmerCompleteHarvest,
  farmerVerifyHarvest,
  buyerPayDeposit,
  replaceSyncContracts,
} from '@/services/b2bSyncService';
import { getFarmerContractsFromServer, startFarmerHarvest } from '@/services/farmerApi';
import { api } from '@/services/auth';
import { HarvestPackagingModal } from '@/components/farmer/HarvestPackagingModal';
import B2bContractViewModal, { B2bContractModalData } from '@/components/common/B2bContractViewModal';
import { formatDateVi, formatStatusVi, formatFulfillmentStatusVi } from '@/utils/formatters';
import { b2bWebSocket } from '@/services/websocketService';

interface FarmerOrderManagementViewProps {
  onNavigateToPostSale: (contractId: number) => void;
  formatVnd: (val?: number) => string;
}

export default function FarmerOrderManagementView({
  onNavigateToPostSale,
  formatVnd,
}: FarmerOrderManagementViewProps) {
  const [contracts, setContracts] = useState<B2bSyncContract[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'WAITING_DEPOSIT' | 'STEP_2' | 'STEP_3' | 'STEP_4' | 'STEP_6'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewingContract, setViewingContract] = useState<B2bContractModalData | null>(null);

  // Modal Nghiệm thu Thu hoạch & Đóng gói sau khi cắt rau
  const [harvestVerificationContract, setHarvestVerificationContract] = useState<B2bSyncContract | null>(null);
  const [actualWeight, setActualWeight] = useState<number>(0);
  const [packagingType, setPackagingType] = useState<string>('Thùng xốp 15kg (Dán tem niêm phong)');
  const [boxCount, setBoxCount] = useState<number>(10);
  const [proofImage, setProofImage] = useState<string>('https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600');
  const [farmPickupAddress, setFarmPickupAddress] = useState<string>('');
  const [harvestNotes, setHarvestNotes] = useState<string>('Rau thu hoạch sáng sớm, cuống tươi ráo sương, tỷ lệ loại 1 đạt 98%');
  const [submittingVerification, setSubmittingVerification] = useState<boolean>(false);

  const openHarvestVerificationModal = (contract: B2bSyncContract) => {
    const defaultQty = contract.quantityKg || 100;
    setHarvestVerificationContract(contract);
    setActualWeight(contract.actualHarvestWeightKg || defaultQty);
    setPackagingType(contract.packageType || 'Thùng xốp 15kg (Dán tem niêm phong)');
    setBoxCount(contract.packageCount || Math.ceil(defaultQty / 15));
    setProofImage(contract.harvestProofImageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600');
    setFarmPickupAddress(contract.farmPickupAddress || contract.farmerCompany || 'Nông trại VietGAP HoNa Fresh, Đơn Dương, Lâm Đồng');
    setHarvestNotes('Rau thu hoạch sáng sớm, cuống tươi ráo sương, tỷ lệ loại 1 đạt 98%');
  };

  const handleConfirmVerifyHarvest = async () => {
    if (!harvestVerificationContract) return;
    setSubmittingVerification(true);
    try {
      const cId = harvestVerificationContract.id;
      const qrData = `HONAFRESH-PUC-${harvestVerificationContract.contractCode}-BOX-${boxCount}`;

      // 1. Gọi backend API
      const harvestPayload = {
        actualHarvestWeightKg: actualWeight,
        grade1Ratio: 96,
        harvestProofImageUrl: proofImage,
        packageCount: boxCount,
        packageType: packagingType,
        qrCodeData: qrData,
        farmPickupAddress: farmPickupAddress,
        notes: harvestNotes,
      };
      await api(`farmer/contracts/${cId}/verify-harvest`, 'POST', harvestPayload).catch((err) => {
        console.warn('API verify-harvest warning:', err);
      });

      // 2. Cập nhật sync store
      farmerVerifyHarvest(cId, harvestPayload);

      // 3. Bắn STOMP WebSocket cho Admin và Buyer
      b2bWebSocket.publish('/topic/contracts', {
        action: 'HARVESTED',
        contractCode: harvestVerificationContract.contractCode,
        status: 'HARVESTED',
        ...harvestPayload,
      });

      setActionSuccessMsg('Đã nghiệm thu thu hoạch xong! Dữ liệu đã chuyển sang Ban Quản Trị để điều phối xe.');
      setHarvestVerificationContract(null);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      void reloadContracts();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi nộp biên bản nghiệm thu.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Load contracts from sync service and backend API
  const reloadContracts = async () => {
    setRefreshing(true);
    try {
      const apiContracts = await getFarmerContractsFromServer().catch(() => []);
      const localSync: B2bSyncContract[] = getSyncContracts();
      const map = new Map<string, B2bSyncContract>();

      // 1. Nạp từ local storage trước làm nền tảng
      for (const lc of localSync) {
        if (lc && lc.contractCode) {
          map.set(lc.contractCode.trim().toUpperCase(), {
            ...lc,
            quantityKg: Number(lc.quantityKg) || 0,
            agreedPricePerKg: Number(lc.agreedPricePerKg) || 0,
            totalAmount: Number(lc.totalAmount) || 0,
            depositAmount: Number(lc.depositAmount) || 0,
          });
        }
      }

      // 2. Đồng bộ với Backend API (Server database là thẩm quyền tối cao cho cọc Escrow & trạng thái vận hành)
      let hasLocalChanges = false;
      for (const ac of apiContracts) {
        if (ac && ac.contractCode) {
          const key = ac.contractCode.trim().toUpperCase();
          const rawStatus = ((ac as any).status || ac.depositStatus || '').toUpperCase();
          const rawFulfillment = (ac.fulfillmentStatus || (ac as any).fulfillment_status || '').toUpperCase();
          const isDepositPaid =
            rawStatus === 'DEPOSIT_PAID' ||
            rawStatus === 'AT_HUB_QC' ||
            rawStatus === 'IN_TRANSIT' ||
            rawStatus === 'DELIVERED' ||
            rawStatus === 'SETTLED' ||
            ac.depositStatus === 'DEPOSIT_PAID';

          if (map.has(key)) {
            const existing = map.get(key)!;
            const mergedDepositPaid = isDepositPaid || existing.depositStatus === 'DEPOSIT_PAID';
            const fStep =
              rawFulfillment === 'COMPLETED' ? 6 :
              rawFulfillment === 'IN_TRANSIT' ? 3 :
              rawFulfillment === 'HUB_DELIVERED' ? 4 :
              rawFulfillment === 'HARVESTING' ? 2 :
              (mergedDepositPaid && (existing.fulfillmentStep <= 1 || !existing.fulfillmentStep) ? 2 : existing.fulfillmentStep || 1);

            const fName =
              mergedDepositPaid && fStep === 2 && (!existing.fulfillmentStatusName || existing.fulfillmentStatusName === 'Chờ Buyer Đặt Cọc 30% Escrow')
                ? 'Đã Đóng Cọc 30% · Chờ Thu Hoạch & Đóng Gói'
                : (ac.fulfillmentStatus || existing.fulfillmentStatusName);

            const updatedItem: B2bSyncContract = {
              ...existing,
              id: ac.id || existing.id,
              depositStatus: mergedDepositPaid ? 'DEPOSIT_PAID' : existing.depositStatus,
              depositPaidAt: ac.depositPaidAt || existing.depositPaidAt || (mergedDepositPaid ? new Date().toISOString() : undefined),
              fulfillmentStep: fStep,
              fulfillmentStatusName: fName,
              remainingAmount: Number(ac.remainingAmount) || existing.remainingAmount,
              finalPaidStatus: ac.settlementId ? 'PAID' : existing.finalPaidStatus,
            };

            if (existing.depositStatus !== updatedItem.depositStatus || existing.fulfillmentStep !== updatedItem.fulfillmentStep) {
              hasLocalChanges = true;
            }
            map.set(key, updatedItem);
          } else {
            const fStep =
              rawFulfillment === 'COMPLETED' ? 6 :
              rawFulfillment === 'IN_TRANSIT' ? 3 :
              rawFulfillment === 'HUB_DELIVERED' ? 4 :
              rawFulfillment === 'HARVESTING' ? 2 :
              (isDepositPaid ? 2 : 1);

            map.set(key, {
              id: ac.id,
              contractCode: ac.contractCode,
              rfqCode: ac.rfqCode || `RFQ-${ac.id}`,
              lotId: ac.harvestLotId,
              lotCode: ac.lotCode || 'LOT-2026-DL-001',
              productName: ac.productName || 'Nông sản VietGAP',
              buyerName: ac.buyerName || 'Khách mua',
              buyerPhone: ac.buyerPhone || '0901234567',
              buyerCompany: ac.buyerName || 'Khách mua sỉ',
              farmerName: ac.farmName || 'HTX Nông Nghiệp Đà Lạt GAP',
              farmerPhone: ac.farmerPhone || '0912345678',
              farmerCompany: ac.farmName || 'HTX Nông Nghiệp Đà Lạt GAP',
              quantityKg: Number(ac.quantity) || 0,
              agreedPricePerKg: Number(ac.unitPrice) || 0,
              totalAmount: Number(ac.totalAmount) || 0,
              depositAmount: Number(ac.depositAmount) || 0,
              remainingAmount: Number(ac.remainingAmount) || (Number(ac.totalAmount || 0) - Number(ac.depositAmount || 0)),
              depositStatus: isDepositPaid ? 'DEPOSIT_PAID' : 'WAITING_DEPOSIT',
              depositPaidAt: ac.depositPaidAt,
              fulfillmentStep: fStep,
              fulfillmentStatusName: isDepositPaid ? 'Đã Đóng Cọc 30% · Chờ Thu Hoạch & Đóng Gói' : (ac.fulfillmentStatus || 'Chờ Buyer Đặt Cọc 30% Escrow'),
              truckLicensePlate: ac.truckType || '49C-198.86 (Xe Thùng Lạnh)',
              truckDriverName: 'Tài xế Nguyễn Văn Tài',
              truckDriverPhone: '0944556677',
              truckTempCurrent: 4.0,
              deliveryAddress: ac.hubName || 'Trạm Trung Chuyển Đức Trọng',
              deliveryTimeSlot: ac.hubDeliveryDate || '06:00 - 09:00',
              finalPaidStatus: ac.settlementId ? 'PAID' : 'UNPAID',
              createdAt: ac.createdAt || new Date().toISOString(),
            });
            hasLocalChanges = true;
          }
        }
      }

      const mergedList = Array.from(map.values());
      setContracts(mergedList);
      if (hasLocalChanges) {
        replaceSyncContracts(mergedList);
      }
    } catch (error) {
      setActionSuccessMsg(error instanceof Error ? error.message : 'Không thể làm mới hợp đồng');
    } finally {
      setRefreshing(false);
    }
  };

  const handleStartHarvest = async (contractId: number | string) => {
    try {
      farmerStartHarvest(contractId);
      await startFarmerHarvest(Number(contractId)).catch(() => {});
      setActionSuccessMsg('Đã chuyển sang bước Thu hoạch nông sản tại vườn!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      void reloadContracts();
    } catch {}
  };

  const handleCompleteHarvest = (contractId: number | string) => {
    try {
      farmerCompleteHarvest(contractId);
      setActionSuccessMsg('Đã xác nhận thu hoạch xong! Dữ liệu đã chuyển sang Admin để kiểm định.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      void reloadContracts();
    } catch {}
  };

  useEffect(() => {
    void reloadContracts();

    // Lắng nghe trực tiếp từ STOMP WebSocket Message Broker (/topic/contracts)
    const unsubContracts = b2bWebSocket.subscribeContracts((payload) => {
      const code = payload?.contractCode || payload?.contract?.contractCode || payload?.contract?.contract_code;
      const rawStatus = (payload?.action || payload?.contract?.status || payload?.contract?.deposit_status || '').toUpperCase();
      const isDepositPaid = rawStatus === 'DEPOSIT_PAID' || payload?.action === 'DEPOSIT_PAID';

      if (isDepositPaid && code) {
        try {
          buyerPayDeposit(code);
        } catch {}
        setContracts((prev) =>
          prev.map((c) => {
            if (c.contractCode && c.contractCode.trim().toUpperCase() === code.trim().toUpperCase()) {
              return {
                ...c,
                depositStatus: 'DEPOSIT_PAID',
                depositPaidAt: new Date().toISOString(),
                fulfillmentStep: c.fulfillmentStep <= 1 ? 2 : c.fulfillmentStep,
                fulfillmentStatusName: c.fulfillmentStep <= 1 ? 'Đã Đóng Cọc 30% · Chờ Thu Hoạch & Đóng Gói' : c.fulfillmentStatusName,
              };
            }
            return c;
          })
        );
        setActionSuccessMsg(`Hợp đồng ${code} vừa nhận cọc 30% Escrow thành công! Bạn có thể bắt đầu thu hoạch.`);
      } else {
        setActionSuccessMsg(`Hợp đồng ${code || ''} vừa được cập nhật thời gian thực!`);
      }
      setTimeout(() => setActionSuccessMsg(null), 5000);
      void reloadContracts();
    });

    // Lắng nghe sự kiện đồng bộ từ tab Buyer hoặc các tab khác
    const unsubscribe = subscribeB2bSyncEvents(() => {
      void reloadContracts();
    });
    const handleCustomSync = () => {
      void reloadContracts();
    };
    window.addEventListener('b2b_sync_event', handleCustomSync);
    window.addEventListener('b2b_contract_updated', handleCustomSync);
    window.addEventListener('storage', handleCustomSync);
    return () => {
      unsubContracts();
      unsubscribe();
      window.removeEventListener('b2b_sync_event', handleCustomSync);
      window.removeEventListener('b2b_contract_updated', handleCustomSync);
      window.removeEventListener('storage', handleCustomSync);
    };
  }, []);

  // Filter & Search
  const filteredContracts = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return contracts.filter((c) => {
      if (!c) return false;
      const matchSearch =
        !q ||
        (c.contractCode || '').toLowerCase().includes(q) ||
        (c.buyerName || '').toLowerCase().includes(q) ||
        (c.productName || '').toLowerCase().includes(q) ||
        (c.lotCode || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'WAITING_DEPOSIT') return c.depositStatus !== 'DEPOSIT_PAID' && (c.fulfillmentStep === 1 || !c.fulfillmentStep);
      if (filterStatus === 'STEP_2') return c.fulfillmentStep === 2;
      if (filterStatus === 'STEP_3') return c.fulfillmentStep === 3;
      if (filterStatus === 'STEP_4') return c.fulfillmentStep === 4 || c.fulfillmentStep === 5;
      if (filterStatus === 'STEP_6') return c.fulfillmentStep === 6 || c.fulfillmentStatusName === 'COMPLETED';
      return true;
    });
  }, [contracts, filterStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalOrders = contracts.length;
    const waitingDeposit = contracts.filter((c) => c.depositStatus === 'WAITING_DEPOSIT').length;
    const inTransit = contracts.filter((c) => c.fulfillmentStep === 3).length;
    const completed = contracts.filter((c) => c.fulfillmentStep === 6).length;
    const totalRevenue = contracts.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
    const totalEscrowHolding = contracts
      .filter((c) => c.depositStatus === 'DEPOSIT_PAID')
      .reduce((sum, c) => sum + (c.depositAmount || 0), 0);

    return { totalOrders, waitingDeposit, inTransit, completed, totalRevenue, totalEscrowHolding };
  }, [contracts]);

  const showSuccessNotice = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Thông Báo Thành Công */}
      <div className="rounded-3xl bg-gradient-to-r from-[#10542C] via-[#1B6A3A] to-[#2E7D32] p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white/5 transform skew-x-12 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-green-100 backdrop-blur-md mb-2">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-300" />
              <span>QUẢN LÝ TIẾN ĐỘ ĐƠN HÀNG & TIỀN CỌC</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight">
              Quản Lý Hợp Đồng & Đơn Hàng B2B
            </h1>
            <p className="text-sm text-green-100/90 mt-1 max-w-2xl">
              Theo dõi và cập nhật trạng thái đơn hàng xuyên suốt tiến trình từ nhận cọc 30%, thu hoạch, vận chuyển xe lạnh đến bàn giao và thanh toán. Dữ liệu đồng bộ trực tiếp với khách mua.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={reloadContracts}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2.5 text-xs font-bold text-white transition active:scale-95"
            >
              <RotateCw className={`w-4 h-4 text-emerald-300 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Đồng Bộ Ngay</span>
            </button>
          </div>
        </div>

        {actionSuccessMsg && (
          <div className="mt-4 rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-3 text-xs font-bold text-emerald-100 flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* 2. KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 block uppercase">Tổng Đơn Hàng</span>
          <span className="text-2xl font-black text-[#10542C] mt-1 block">{stats.totalOrders}</span>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Hợp đồng B2B chốt</span>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-amber-100 shadow-2xs bg-amber-50/20">
          <span className="text-[11px] font-bold text-amber-700 block uppercase">Chờ Cọc 30%</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{stats.waitingDeposit}</span>
          <span className="text-[10px] text-amber-600/80 mt-0.5 block">Chờ khách mua quét mã chuyển cọc</span>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-blue-100 shadow-2xs bg-blue-50/20">
          <span className="text-[11px] font-bold text-blue-700 block uppercase">Đang Vận Chuyển</span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">{stats.inTransit}</span>
          <span className="text-[10px] text-blue-600/80 mt-0.5 block">Xe lạnh có cảm biến nhiệt độ</span>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-emerald-100 shadow-2xs bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-700 block uppercase">Đã Quyết Toán</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{stats.completed}</span>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Tiền đã giải ngân về tài khoản</span>
        </div>

        <div className="col-span-2 rounded-2xl bg-white p-4 border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-gray-500 block uppercase">Tiền Cọc Bảo Chứng (30%)</span>
              <span className="text-lg font-black text-emerald-700 mt-0.5 block">{formatVnd(stats.totalEscrowHolding)}</span>
            </div>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">Bảo chứng sàn</span>
          </div>
          <div className="pt-2 border-t border-gray-100 mt-2 flex justify-between text-[11px] text-gray-500">
            <span>Tổng giá trị hợp đồng:</span>
            <b className="text-gray-800">{formatVnd(stats.totalRevenue)}</b>
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Search & Bộ Lọc Nhanh */}
      <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã hợp đồng (HD-...), tên Buyer, nông sản hoặc mã lô..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#10542C] focus:ring-1 focus:ring-[#10542C] transition bg-gray-50/50"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-gray-400" /> Lọc:
          </span>
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterStatus === 'ALL' ? 'bg-[#10542C] text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả ({contracts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('WAITING_DEPOSIT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterStatus === 'WAITING_DEPOSIT' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Chờ cọc 30%
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('STEP_2')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterStatus === 'STEP_2' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Thu hoạch & Đóng gói
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('STEP_3')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterStatus === 'STEP_3' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Đang vận chuyển
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('STEP_6')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterStatus === 'STEP_6' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Đã hoàn tất
          </button>
        </div>
      </div>

      {/* 4. Danh Sách Đơn Hàng & Cập Nhật Tiến Trình Nghiệp Vụ */}
      {filteredContracts.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center border border-dashed border-gray-200">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-700">Chưa có đơn hàng nào phù hợp</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            Khi khách mua gửi yêu cầu báo giá và hai bên chốt đơn thành công, hợp đồng và tiến trình giao hàng sẽ tự động xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContracts.map((contract) => {
            const isDepositPaid = contract.depositStatus === 'DEPOSIT_PAID';

            return (
              <div
                key={`${contract.contractCode || "contract"}-${contract.id}`}
                className="rounded-3xl bg-white border border-gray-100 shadow-2xs p-5 transition-all hover:border-green-200 hover:shadow-xs relative overflow-hidden"
              >
                {/* Trạng thái cọc bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    contract.fulfillmentStep === 6
                      ? 'bg-emerald-500'
                      : contract.fulfillmentStep >= 3
                      ? 'bg-blue-500'
                      : isDepositPaid
                      ? 'bg-amber-500'
                      : 'bg-gray-300'
                  }`}
                />

                {/* Header đơn hàng */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-[#10542C] font-bold">
                      <ShoppingBag className="w-5 h-5 text-[#10542C]" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-base font-black text-gray-800 font-mono tracking-tight">
                          {contract.contractCode}
                        </strong>
                        <span className="text-[10px] rounded-full bg-gray-100 text-gray-600 font-mono px-2 py-0.5">
                          {contract.lotCode}
                        </span>
                        {contract.rfqCode && (
                          <span className="text-[10px] rounded-full bg-sky-50 text-sky-700 font-mono px-2 py-0.5">
                            Yêu cầu gốc: {contract.rfqCode}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ngày tạo: {new Date(contract.createdAt).toLocaleDateString('vi-VN')} · Giao hàng: {contract.deliveryTimeSlot}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge cọc */}
                    {isDepositPaid ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Đã Cọc 30% ({formatVnd(contract.depositAmount)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Chờ Cọc 30% ({formatVnd(contract.depositAmount)})
                      </span>
                    )}

                    {/* Badge trạng thái */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${
                        contract.fulfillmentStep === 6
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : contract.fulfillmentStep >= 3
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      Mốc {contract.fulfillmentStep}/6: {formatFulfillmentStatusVi(contract.fulfillmentStatusName, contract.fulfillmentStep)}
                    </span>
                  </div>
                </div>

                {/* Body chi tiết đơn hàng */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 text-xs sm:text-sm">
                  {/* Cột 1: Thông tin nông sản */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Nông Sản Xuất Kho</span>
                    <strong className="text-base font-bold text-[#10542C] block">{contract.productName}</strong>
                    <div className="flex justify-between text-gray-700 pt-1">
                      <span>Sản lượng chốt:</span>
                      <b className="text-gray-900 font-mono text-sm sm:text-base">{(contract.quantityKg ?? 0).toLocaleString('vi-VN')} kg</b>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Đơn giá chốt:</span>
                      <b className="text-[#10542C] font-mono text-sm sm:text-base">{formatVnd(contract.agreedPricePerKg)}/kg</b>
                    </div>
                    <div className="flex justify-between text-gray-900 pt-1.5 border-t border-gray-200 font-bold">
                      <span>Tổng tiền hàng:</span>
                      <span className="text-[#10542C] font-mono text-base sm:text-lg font-black">{formatVnd(contract.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Cột 2: Thông tin Thương lái (Buyer) */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Thương Lái Mua Sỉ</span>
                    <strong className="text-base font-bold text-gray-900 block">{contract.buyerCompany}</strong>
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="text-gray-500">Người đại diện:</span>
                      <b className="text-gray-900">{contract.buyerName}</b>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {isDepositPaid ? (
                        <span className="font-mono text-gray-900 font-bold">{contract.buyerPhone}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs" title="Thông tin liên hệ thương lái mở khóa sau khi nhận cọc">
                          <LockKeyhole className="w-3 h-3 text-amber-600" />
                          <span>•••••••••• (Hiện sau khi cọc)</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-1.5 text-gray-600 pt-1 border-t border-gray-200">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{contract.deliveryAddress}</span>
                    </div>
                  </div>

                  {/* Cột 3: Vận chuyển xe lạnh & Biên bản bàn giao */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Vận Chuyển & Bàn Giao</span>
                    {contract.fulfillmentStep < 3 ? (
                      <div className="space-y-1.5 py-1">
                        <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-amber-200">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Chờ xong đóng gói để điều xe</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Phương tiện vận chuyển sẽ được điều phối sau khi nhà vườn xác nhận đóng gói và in tem dán thùng.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-bold text-gray-900 text-sm truncate">{contract.truckLicensePlate}</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                          <span>Cảm biến thùng xe:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {contract.truckTempCurrent}°C (Chuẩn 2-6°C)
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-gray-700 pt-1 border-t border-gray-100">
                      <span>Biên bản nhận hàng:</span>
                      {contract.epodSignedAt ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã ký ({contract.epodDeliveredWeightKg} kg)
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold">Chưa ký</span>
                      )}
                    </div>
                    <div className="flex justify-between text-gray-900 pt-1 border-t border-gray-200 font-bold">
                      <span>Quyết toán 70%:</span>
                      <span className={contract.finalPaidStatus === 'PAID' ? 'text-emerald-700 font-bold' : 'text-gray-600'}>
                        {contract.finalPaidStatus === 'PAID' ? 'Đã giải ngân' : 'Chờ tất toán'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline 6 mốc mini bar */}
                <div className="pt-2 pb-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-2">
                    <span className="flex items-center gap-1 text-[#10542C]">
                      <Clock className="w-3.5 h-3.5" /> Tiến Trình Giao Nhận & Quyết Toán (Mốc {contract.fulfillmentStep}/6)
                    </span>
                    <span className="text-gray-400 font-normal">
                      {contract.fulfillmentStep === 6 ? 'Đã thanh toán tiền về tài khoản' : 'Đang xử lý theo hợp đồng'}
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5">
                    {[
                      { step: 1, label: '1. Chốt & Cọc' },
                      { step: 2, label: '2. Thu Hoạch' },
                      { step: 3, label: '3. Xe Lạnh' },
                      { step: 4, label: '4. Giao Hàng' },
                      { step: 5, label: '5. Ký Nhận Hàng' },
                      { step: 6, label: '6. Quyết Toán' },
                    ].map((m) => {
                      const isDone = contract.fulfillmentStep >= m.step;
                      const isCurrent = contract.fulfillmentStep === m.step;
                      return (
                        <div
                          key={m.step}
                          className={`rounded-lg py-1.5 px-2 text-center text-[10px] font-bold transition-all ${
                            isCurrent
                              ? 'bg-[#10542C] text-white shadow-2xs ring-2 ring-green-300'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {m.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer: Chỉ xem và điều hướng sang trang Hành trình xe lạnh để xem & quản lý tiến trình */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="text-gray-500 font-semibold">Trạng thái vận hành:</span>
                    <span className="font-bold text-[#10542C] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-[#10542C]" />
                      <span>Mốc {contract.fulfillmentStep}/6: {formatFulfillmentStatusVi(contract.fulfillmentStatusName, contract.fulfillmentStep)}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Thao tác Thu hoạch của Nông dân khi hợp đồng đã nhận cọc */}
                    {isDepositPaid && (
                      (() => {
                        const isHarvestDone = (contract as any).isHarvestDone || contract.fulfillmentStatusName?.includes('Đã Thu Hoạch') || contract.fulfillmentStep > 2;
                        const isHarvesting = (contract as any).isHarvesting || (contract.fulfillmentStep === 2 && !isHarvestDone);

                        if (isHarvestDone) {
                          return (
                            <span className="flex items-center gap-1.5 bg-emerald-100 text-[#10542C] font-bold text-xs px-3.5 py-2.5 rounded-xl border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Đã Thu Hoạch Xong</span>
                            </span>
                          );
                        }

                        if (isHarvesting) {
                          return (
                            <button
                              type="button"
                              onClick={() => openHarvestVerificationModal(contract)}
                              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-98"
                              title="Mở biểu mẫu nghiệm thu thu hoạch thực tế, ảnh cân điện tử, số thùng & tem QR để gửi Admin điều phối xe"
                            >
                              <Scale className="w-3.5 h-3.5 text-white" />
                              <span>Nghiệm Thu Thu Hoạch & Đóng Gói</span>
                            </button>
                          );
                        }

                        // Mốc 1: Chờ thu hoạch
                        return (
                          <button
                            type="button"
                            onClick={() => void handleStartHarvest(contract.id)}
                            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-98"
                            title="Bắt đầu triển khai thu hoạch nông sản tại vườn"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                            <span>Bắt Đầu Thu Hoạch</span>
                          </button>
                        );
                      })()
                    )}

                    {/* Nút Xem Văn Bản Hợp Đồng B2B Điện Tử */}
                    <button
                      type="button"
                      onClick={() =>
                        setViewingContract({
                          id: Number(contract.id),
                          contractCode: contract.contractCode,
                          rfqCode: contract.rfqCode,
                          lotCode: contract.lotCode,
                          productName: contract.productName,
                          buyerName: contract.buyerName,
                          buyerCompany: contract.buyerCompany || contract.buyerName,
                          buyerPhone: contract.buyerPhone,
                          farmerName: contract.farmerName,
                          farmerCompany: contract.farmerCompany || contract.farmerName,
                          farmerPhone: contract.farmerPhone,
                          quantityKg: contract.quantityKg,
                          unitPrice: contract.agreedPricePerKg,
                          totalAmount: contract.totalAmount,
                          goodsAmount: (contract.quantityKg || 0) * (contract.agreedPricePerKg || 0),
                          shippingOption: (contract as any).shippingOption || 'CROSS_DOCKING_HUB',
                          shippingFee: (contract as any).shippingFee,
                          depositAmount: contract.depositAmount,
                          remainingAmount: contract.remainingAmount,
                          depositStatus: contract.depositStatus,
                          fulfillmentStatusName: contract.fulfillmentStatusName,
                          deliveryAddress: contract.deliveryAddress,
                          deliveryTimeSlot: contract.deliveryTimeSlot,
                          createdAt: contract.createdAt,
                        })
                      }
                      className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#10542C] font-bold text-xs px-3.5 py-2.5 rounded-xl transition border border-emerald-200 cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#10542C]" />
                      <span>Xem Hợp Đồng B2B</span>
                    </button>

                    {/* Nút Xem chi tiết Vận chuyển & Biên bản -> Chuyển sang tab Hành Trình Xe Lạnh */}
                    <button
                      type="button"
                      onClick={() => onNavigateToPostSale(contract.id)}
                      className="flex items-center gap-2 bg-[#10542C] hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-98"
                    >
                      <span>Xem Chi Tiết Vận Chuyển & Biên Bản</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nghiệm Thu Thu Hoạch & Đóng Gói (Mốc 2) */}
      {harvestVerificationContract && (
        <HarvestPackagingModal
          contract={harvestVerificationContract}
          isOpen={Boolean(harvestVerificationContract)}
          onClose={() => setHarvestVerificationContract(null)}
          onSubmit={async (data) => {
            const cId = harvestVerificationContract.id;
            await api(`farmer/contracts/${cId}/verify-harvest`, 'POST', data).catch((err) => {
              console.warn('API verify-harvest warning:', err);
            });

            farmerVerifyHarvest(cId, data);
            b2bWebSocket.publish('/topic/contracts', {
              action: 'HARVESTED',
              contractCode: harvestVerificationContract.contractCode,
              status: 'HARVESTED',
              ...data,
            });

            setActionSuccessMsg('Đã nghiệm thu thu hoạch xong! Dữ liệu đã chuyển sang Ban Quản Trị để điều phối xe.');
            setHarvestVerificationContract(null);
            setTimeout(() => setActionSuccessMsg(null), 4000);
            void reloadContracts();
          }}
        />
      )}

      {/* Modal Xem Toàn Văn Hợp Đồng B2B Điện Tử */}
      <B2bContractViewModal
        isOpen={Boolean(viewingContract)}
        contract={viewingContract}
        onClose={() => setViewingContract(null)}
      />
    </div>
  );
}
