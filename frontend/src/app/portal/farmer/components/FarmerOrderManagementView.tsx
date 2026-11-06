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
  CreditCard,
  FileText,
  ChevronRight,
  Play,
  RotateCw,
  Eye,
  AlertTriangle,
  Building2,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  B2bSyncContract,
  getSyncContracts,
  updateContractFulfillmentStep,
  subscribeB2bSyncEvents,
} from '@/services/b2bSyncService';

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
  const [autoSimulatingId, setAutoSimulatingId] = useState<number | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Load contracts from sync service
  const reloadContracts = () => {
    setContracts(getSyncContracts());
  };

  useEffect(() => {
    reloadContracts();
    // Lắng nghe sự kiện đồng bộ từ tab Buyer hoặc các tab khác
    const unsubscribe = subscribeB2bSyncEvents(() => {
      reloadContracts();
    });
    return () => unsubscribe();
  }, []);

  // Filter & Search
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchSearch =
        c.contractCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lotCode.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'WAITING_DEPOSIT') return c.depositStatus === 'WAITING_DEPOSIT';
      if (filterStatus === 'STEP_2') return c.fulfillmentStep === 2;
      if (filterStatus === 'STEP_3') return c.fulfillmentStep === 3;
      if (filterStatus === 'STEP_4') return c.fulfillmentStep === 4 || c.fulfillmentStep === 5;
      if (filterStatus === 'STEP_6') return c.fulfillmentStep === 6;
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

  // Cập nhật từng bước
  const handleAdvanceStep = (contract: B2bSyncContract, targetStep: 1 | 2 | 3 | 4 | 5 | 6, note?: string) => {
    const updated = updateContractFulfillmentStep(contract.id, targetStep);
    reloadContracts();
    showSuccessNotice(note || `Đã chuyển đơn hàng ${contract.contractCode} sang mốc: ${updated.fulfillmentStatusName}`);
  };

  // Mô phỏng tự động toàn bộ tiến trình (Auto Advance Simulation)
  const handleAutoRunSimulation = (contract: B2bSyncContract) => {
    if (autoSimulatingId) return;
    setAutoSimulatingId(contract.id);

    let currentStep = contract.fulfillmentStep;
    const interval = setInterval(() => {
      if (currentStep < 6) {
        currentStep = (currentStep + 1) as 1 | 2 | 3 | 4 | 5 | 6;
        updateContractFulfillmentStep(contract.id, currentStep);
        reloadContracts();
      } else {
        clearInterval(interval);
        setAutoSimulatingId(null);
        showSuccessNotice(`Quy trình giao nhận & quyết toán đơn ${contract.contractCode} đã hoàn tất và giải ngân về ví!`);
      }
    }, 2500);
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
              <span>PHÂN HỆ QUẢN LÝ ĐƠN HÀNG B2B & ESCROW</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight">
              Quản Lý Hợp Đồng & Đơn Hàng B2B
            </h1>
            <p className="text-sm text-green-100/90 mt-1 max-w-2xl">
              Theo dõi và cập nhật trạng thái đơn hàng xuyên suốt tiến trình thu hoạch, vận chuyển xe lạnh IoT và giải ngân bảo chứng Escrow. Dữ liệu đồng bộ trực tiếp với Thương lái (Buyer).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={reloadContracts}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2.5 text-xs font-bold text-white transition active:scale-95"
            >
              <RotateCw className="w-4 h-4 text-emerald-300" />
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
          <span className="text-[10px] text-amber-600/80 mt-0.5 block">Chờ Buyer quét VietQR</span>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-blue-100 shadow-2xs bg-blue-50/20">
          <span className="text-[11px] font-bold text-blue-700 block uppercase">Đang Vận Chuyển</span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">{stats.inTransit}</span>
          <span className="text-[10px] text-blue-600/80 mt-0.5 block">Xe lạnh có cảm biến IoT</span>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-emerald-100 shadow-2xs bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-700 block uppercase">Đã Quyết Toán</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{stats.completed}</span>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Tiền đã giải ngân về ví</span>
        </div>

        <div className="col-span-2 rounded-2xl bg-white p-4 border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-gray-500 block uppercase">Cọc Escrow Đang Bảo Chứng</span>
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
            Khi thương lái gửi đề xuất mua và chốt giá qua mục Đàm Phán RFQ, hợp đồng điện tử và tiến trình giao hàng sẽ tự động xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContracts.map((contract) => {
            const isAutoRunning = autoSimulatingId === contract.id;
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
                            Gốc: {contract.rfqCode}
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
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                        contract.fulfillmentStep === 6
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : contract.fulfillmentStep >= 3
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      Mốc {contract.fulfillmentStep}/6: {contract.fulfillmentStatusName}
                    </span>
                  </div>
                </div>

                {/* Body chi tiết đơn hàng */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 text-xs">
                  {/* Cột 1: Thông tin nông sản */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-gray-50/70 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Nông Sản Xuất Kho</span>
                    <strong className="text-sm font-bold text-[#10542C] block">{contract.productName}</strong>
                    <div className="flex justify-between text-gray-600 pt-1">
                      <span>Sản lượng chốt:</span>
                      <b className="text-gray-800 font-mono">{contract.quantityKg.toLocaleString('vi-VN')} kg</b>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Đơn giá chốt:</span>
                      <b className="text-gray-800 font-mono">{formatVnd(contract.agreedPricePerKg)}/kg</b>
                    </div>
                    <div className="flex justify-between text-gray-700 pt-1 border-t border-gray-200 font-bold">
                      <span>Tổng tiền hàng:</span>
                      <span className="text-[#10542C] font-mono text-sm">{formatVnd(contract.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Cột 2: Thông tin Thương lái (Buyer) */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-gray-50/70 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Thương Lái Mua Sỉ</span>
                    <strong className="text-sm font-bold text-gray-800 block">{contract.buyerCompany}</strong>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-gray-400">Người đại diện:</span>
                      <b className="text-gray-800">{contract.buyerName}</b>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-mono text-gray-700">{contract.buyerPhone}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-gray-500 pt-1 border-t border-gray-200">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{contract.deliveryAddress}</span>
                    </div>
                  </div>

                  {/* Cột 3: Vận tải lạnh IoT & ePOD */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-gray-50/70 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Vận Chuyển Lạnh & ePOD</span>
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-bold text-gray-800 truncate">{contract.truckLicensePlate}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Cảm biến thùng xe:</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {contract.truckTempCurrent}°C (Chuẩn 2-6°C)
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Biên bản ePOD:</span>
                      {contract.epodSignedAt ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Đã ký ({contract.epodDeliveredWeightKg} kg)
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold">Chưa ký</span>
                      )}
                    </div>
                    <div className="flex justify-between text-gray-700 pt-1 border-t border-gray-200 font-bold">
                      <span>Quyết toán 70%:</span>
                      <span className={contract.finalPaidStatus === 'PAID' ? 'text-emerald-600' : 'text-gray-600'}>
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
                      {contract.fulfillmentStep === 6 ? 'Đã giải ngân Escrow về ví' : 'Đang xử lý theo hợp đồng'}
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5">
                    {[
                      { step: 1, label: '1. Chốt & Cọc' },
                      { step: 2, label: '2. Thu Hoạch' },
                      { step: 3, label: '3. Xe Lạnh' },
                      { step: 4, label: '4. Giao Hàng' },
                      { step: 5, label: '5. Ký ePOD' },
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

                {/* Footer Hành Động: Cập nhật trạng thái nghiệp vụ */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  {/* Nút hành động tương ứng theo mốc */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Bước 1 -> Bước 2 */}
                    {contract.fulfillmentStep === 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAdvanceStep(
                            contract,
                            2,
                            `Đã xác nhận thu hoạch & đóng gói đơn ${contract.contractCode} tại nông trại!`
                          )
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-[#10542C] hover:bg-[#0c4021] text-white px-3.5 py-2 text-xs font-bold transition shadow-2xs"
                      >
                        <ArrowRight className="w-3.5 h-3.5" /> Bắt Đầu Thu Hoạch & Đóng Gói (Mốc 2)
                      </button>
                    )}

                    {/* Bước 2 -> Bước 3 */}
                    {contract.fulfillmentStep === 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAdvanceStep(
                            contract,
                            3,
                            `Đã bàn giao đơn ${contract.contractCode} cho xe tải lạnh IoT ${contract.truckLicensePlate}!`
                          )
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-3.5 py-2 text-xs font-bold transition shadow-2xs"
                      >
                        <Truck className="w-3.5 h-3.5" /> Bàn Giao Xe Tải Lạnh Chuyên Dụng (Mốc 3)
                      </button>
                    )}

                    {/* Bước 3 -> Bước 4 */}
                    {contract.fulfillmentStep === 3 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAdvanceStep(
                            contract,
                            4,
                            `Đã cập nhật xe lạnh tới điểm giao ${contract.deliveryAddress}. Chờ Buyer kiểm đếm và ký ePOD!`
                          )
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white px-3.5 py-2 text-xs font-bold transition shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Xác Nhận Hàng Đã Đến Kho Buyer (Mốc 4)
                      </button>
                    )}

                    {/* Bước 4 hoặc 5 -> Bước 6 */}
                    {(contract.fulfillmentStep === 4 || contract.fulfillmentStep === 5) && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAdvanceStep(
                            contract,
                            6,
                            `Đã hoàn tất đối soát và giải ngân toàn bộ số tiền về ví nông dân thành công!`
                          )
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 text-xs font-bold transition shadow-2xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Yêu Cầu Giải Ngân Escrow Về Ví (Mốc 6)
                      </button>
                    )}

                    {contract.fulfillmentStep === 6 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Đơn hàng đã hoàn tất trọn vẹn và giải ngân
                      </span>
                    )}

                    {/* Nút Auto-advance simulation */}
                    <button
                      type="button"
                      disabled={isAutoRunning || contract.fulfillmentStep === 6}
                      onClick={() => handleAutoRunSimulation(contract)}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 text-xs font-bold transition shadow-2xs disabled:opacity-50"
                      title="Hệ thống sẽ tự động nhảy lần lượt qua các mốc sau mỗi 2.5s"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {isAutoRunning ? 'Đang chạy tự động...' : '▶ Tự Động Chạy Tiến Trình'}
                    </button>
                  </div>

                  {/* Nút Xem chi tiết Post-Sale & Chuỗi lạnh */}
                  <button
                    type="button"
                    onClick={() => onNavigateToPostSale(contract.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#10542C] hover:text-emerald-700 hover:underline px-2 py-1.5 transition"
                  >
                    <span>Xem Chi Tiết Chuỗi Lạnh & ePOD</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
