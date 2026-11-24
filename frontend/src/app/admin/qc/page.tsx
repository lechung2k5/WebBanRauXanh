'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Warehouse,
  Plus,
  AlertCircle,
  RefreshCw,
  Loader2,
  Snowflake,
  CheckCircle2,
  Clock,
  Truck,
  Scale,
  Thermometer,
  Droplets,
  Activity,
  FileCheck,
  QrCode,
  Search,
  Filter,
  ArrowRight,
  Eye,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Boxes,
  FileText,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
  ChevronDown,
  MapPin,
  User,
  CheckSquare,
  Square,
  XCircle,
  Calendar,
} from 'lucide-react';
import {
  fleetDispatchApi,
  PickupTripDto,
  DEFAULT_OFFICIAL_HUBS,
  WarehouseHubDto,
} from '@/services/fleetDispatchApi';
import { b2bWebSocket } from '@/services/websocketService';
import { subscribeB2bSyncEvents } from '@/services/b2bSyncService';

// Định dạng tiền tệ
const money = (val: unknown) => {
  const num = Number(val || 0);
  return num.toLocaleString('vi-VN');
};

export default function AdminQcPage() {
  const [hubs] = useState<WarehouseHubDto[]>(DEFAULT_OFFICIAL_HUBS);
  const [selectedHubId, setSelectedHubId] = useState<number>(2); // Mặc định Hub Đức Trọng, Lâm Đồng
  const [activeTab, setActiveTab] = useState<'GATE_RECEIVING' | 'QC_LAB' | 'FEFO_STORAGE' | 'READY_OUTBOUND'>('GATE_RECEIVING');

  const [trips, setTrips] = useState<PickupTripDto[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Modal Tiếp Nhận Cổng Kho & Bàn Cân (Gate Weighing Modal)
  const [weighingTrip, setWeighingTrip] = useState<PickupTripDto | null>(null);
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [tareWeight, setTareWeight] = useState<string>('25');
  const [netWeight, setNetWeight] = useState<string>('');
  const [dockCoreTemp, setDockCoreTemp] = useState<string>('3.5');
  const [receivingZone, setReceivingZone] = useState<string>('Zone A (Rau lá 2-4°C)');
  const [receivingBin, setReceivingBin] = useState<string>('R-01 / Bin A-01');
  const [receivingNotes, setReceivingNotes] = useState<string>('Xe tải lạnh đạt chuẩn, tem niêm phong nguyên vẹn.');

  // 2. Modal Kiểm Định Lab QC Chuyên Sâu (Lab QC Inspection Modal)
  const [qcContract, setQcContract] = useState<any | null>(null);
  const [brix, setBrix] = useState<string>('12.5');
  const [nitrate, setNitrate] = useState<string>('240');
  const [pesticideSafe, setPesticideSafe] = useState<boolean>(true);
  const [grade1Ratio, setGrade1Ratio] = useState<string>('96');
  const [sampleWeight, setSampleWeight] = useState<string>('150');
  const [rejectedWeight, setRejectedWeight] = useState<string>('0');
  const [qcCertCode, setQcCertCode] = useState<string>('');
  const [qcInspector, setQcInspector] = useState<string>('KTV. Lê Hoàng Yến (Lab QC Trạm HoNa)');
  const [qcNotes, setQcNotes] = useState<string>('Ngoại quan cuống tươi giòn, lá xanh mướt đồng đều, test tồn dư âm tính đạt chuẩn xuất khẩu.');
  const [showCertSuccess, setShowCertSuccess] = useState<any | null>(null);

  // Ref lưu Hub được chọn để xử lý closure stale
  const selectedHubIdRef = React.useRef(selectedHubId);
  useEffect(() => {
    selectedHubIdRef.current = selectedHubId;
  }, [selectedHubId]);

  const currentHub = useMemo(() => {
    return hubs.find((h) => h.id === selectedHubId) || hubs[0];
  }, [hubs, selectedHubId]);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Nạp dữ liệu toàn diện của Trạm QC
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const hubId = selectedHubIdRef.current;
      const [tripsData, invData] = await Promise.all([
        fleetDispatchApi.getReceivingTrips(hubId).catch(() => []),
        fleetDispatchApi.getHubInventory(hubId).catch(() => []),
      ]);

      setTrips(Array.isArray(tripsData) ? tripsData : []);
      setInventory(Array.isArray(invData) ? invData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu trạm QC');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();

    // Đồng bộ thời gian thực đa kênh: STOMP WebSocket & BroadcastChannel
    const unsubContracts = b2bWebSocket.subscribeContracts(() => {
      void loadData();
    });
    const unsubDispatch = b2bWebSocket.subscribeDispatch(() => {
      void loadData();
    });
    const unsubSync = subscribeB2bSyncEvents(() => {
      void loadData();
    });

    return () => {
      unsubContracts();
      unsubDispatch();
      unsubSync();
    };
  }, [selectedHubId, loadData]);

  // Danh sách các lô ĐÃ THỰC SỰ TIẾP NHẬN & DỠ HÀNG VÀO KHO (đã gán buồng và ô kệ)
  const storedLots = useMemo(() => {
    return inventory.filter(
      (c) =>
        (['AT_HUB_QC', 'HUB_DELIVERED', 'READY_OUTBOUND'].includes(c.status) ||
         ['AT_HUB_QC', 'HUB_DELIVERED'].includes(c.fulfillment_status)) &&
        Boolean(c.hub_rack_bin)
    );
  }, [inventory]);

  // Metric Cards
  const metrics = useMemo(() => {
    const totalStoredKg = storedLots.reduce(
      (sum, c) => sum + Number(c.actual_harvest_weight_kg || c.offered_weight_kg || 0),
      0
    );

    const incomingTrucks = trips.filter((t) =>
      ['ON_TRIP', 'RETURNING', 'ARRIVED_AT_WAREHOUSE'].includes(t.status)
    );

    const pendingQcLots = inventory.filter(
      (c) =>
        (['AT_HUB_QC', 'HUB_DELIVERED'].includes(c.status) ||
         ['AT_HUB_QC', 'HUB_DELIVERED'].includes(c.fulfillment_status)) &&
        c.qc_status !== 'QC_PASSED'
    );

    const readyOutboundLots = inventory.filter(
      (c) =>
        ((c.status === 'AT_HUB_QC' && c.qc_status === 'QC_PASSED') ||
         c.status === 'READY_OUTBOUND') &&
        Boolean(c.hub_rack_bin)
    );

    const capacityKg = 50000; // Sức chứa tiêu chuẩn trạm 50 tấn
    const utilizationPct = capacityKg > 0 ? Math.round((totalStoredKg / capacityKg) * 100) : 0;

    return {
      totalStoredKg,
      utilizationPct,
      incomingTrucksCount: incomingTrucks.length,
      pendingQcCount: pendingQcLots.length,
      readyOutboundCount: readyOutboundLots.length,
    };
  }, [inventory, trips, storedLots]);

  // 1. Xử lý xác nhận xe đến cổng kho (GĐ 7.1)
  const handleConfirmTruckArrival = async (tripId: number) => {
    try {
      setSubmitting(true);
      setError('');
      await fleetDispatchApi.confirmTruckArrival(tripId);
      showToast('Đã xác nhận xe tải lạnh đã cập bến cổng Hub an toàn!');
      await loadData();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Lỗi xác nhận xe cập bến');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal cân xe & tiếp nhận bốc dỡ
  const openWeighingModal = (trip: PickupTripDto) => {
    setWeighingTrip(trip);
    const sumWeight =
      trip.stops?.reduce((acc, s) => acc + (s.actualWeightKg || s.weightKg || 0), 0) ||
      trip.actualTotalWeightKg ||
      trip.totalWeightKg ||
      150;
    setNetWeight(String(sumWeight));
    setGrossWeight(String(sumWeight + 25));
    setTareWeight('25');
    setDockCoreTemp('3.5');
    setReceivingZone('Zone A (Rau lá 2-4°C)');
    setReceivingBin('R-01 / Bin A-01');
    setReceivingNotes(`Tiếp nhận kiểm đếm đối soát xe ${trip.vehicle?.plateNumber || ''}. Hàng tươi mát nguyên vẹn.`);
  };

  // Tính Net Weight khi Gross hoặc Tare thay đổi
  const handleGrossChange = (g: string) => {
    setGrossWeight(g);
    const gNum = parseFloat(g) || 0;
    const tNum = parseFloat(tareWeight) || 0;
    if (gNum >= tNum) {
      setNetWeight(String(gNum - tNum));
    }
  };

  // Hoàn tất tiếp nhận bốc dỡ (GĐ 7.2)
  const handleCompleteGateReceiving = async () => {
    if (!weighingTrip) return;
    const netNum = parseFloat(netWeight);
    if (isNaN(netNum) || netNum <= 0) {
      setError('Khối lượng thực nhận (Net Weight) không hợp lệ');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const lotItems = weighingTrip.stops?.map((s) => ({
        contractId: s.contractId,
        receivedWeightKg: s.actualWeightKg || s.weightKg || netNum,
        qualifiedWeightKg: s.actualWeightKg || s.weightKg || netNum,
        rejectedWeightKg: 0,
        packageCount: s.actualPackageCount || s.packageCount || 10,
        coldZone: receivingZone,
        rackBin: receivingBin,
        qcNotes: receivingNotes,
      })) || [];

      await fleetDispatchApi.completeReceiving(weighingTrip.id, {
        actualTotalWeightKg: netNum,
        actualTotalPackages: weighingTrip.actualTotalPackages || weighingTrip.totalPackages || 10,
        receivingNotes,
        lotItems,
      });

      showToast(`Đã hoàn tất dỡ hàng chuyến ${weighingTrip.tripCode} vào ${receivingBin}! Xe & Tài xế đã được giải phóng.`);
      setWeighingTrip(null);
      await loadData();
      setActiveTab('QC_LAB'); // Chuyển sang Tab kiểm định Lab QC
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Lỗi tiếp nhận dỡ hàng');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Mở Modal Kiểm Định Lab QC
  const openQcInspectionModal = (contract: any) => {
    setQcContract(contract);
    const weight = contract.actual_harvest_weight_kg || contract.offered_weight_kg || 150;
    setSampleWeight(String(weight));
    setRejectedWeight('0');
    setBrix(contract.qc_brix ? String(contract.qc_brix) : '12.5');
    setNitrate(contract.qc_nitrate_ppm ? String(contract.qc_nitrate_ppm) : '240');
    setPesticideSafe(contract.qc_pesticide_safe !== undefined ? Boolean(contract.qc_pesticide_safe) : true);
    setGrade1Ratio(contract.grade1_ratio ? String(contract.grade1_ratio) : '96');
    setQcCertCode(`QC-${new Date().getFullYear()}-${contract.contract_code?.replace(/^#/, '') || '001'}`);
    setQcNotes('Ngoại quan cuống tươi giòn, lá xanh mướt đồng đều, test tồn dư âm tính đạt chuẩn xuất khẩu.');
  };

  // Xác nhận cấp chứng chỉ QC & Xếp vào kệ FEFO
  const handleApproveQcLab = async () => {
    if (!qcContract) return;
    try {
      setSubmitting(true);
      setError('');

      const netNum = parseFloat(sampleWeight) || 150;
      const brixNum = parseFloat(brix) || 12.5;
      const nitrateNum = parseFloat(nitrate) || 240;

      const payload = {
        zone: qcContract.hub_warehouse_zone || 'Zone A (Rau lá 2-4°C)',
        rackBin: qcContract.hub_rack_bin || 'R-01 / Bin A-01',
        maxStorageDays: 2,
        grossWeightKg: netNum + 25,
        tareWeightKg: 25,
        netWeightKg: netNum,
        brix: brixNum,
        nitratePpm: nitrateNum,
        pesticideSafe: pesticideSafe,
        qcCertUrl: `https://honafresh.vn/qc/certs/${qcCertCode}.pdf`,
        qcNotes: qcNotes,
      };

      await fleetDispatchApi.submitWarehouseInboundQc(qcContract.id, payload);

      showToast(`Đã hoàn tất kiểm định và cấp Chứng chỉ ${qcCertCode} cho hợp đồng ${qcContract.contract_code}!`);
      setShowCertSuccess({
        contractCode: qcContract.contract_code,
        productName: qcContract.product_name,
        certCode: qcCertCode,
        inspector: qcInspector,
        brix: brixNum,
        nitrate: nitrateNum,
        pesticideSafe,
        weight: netNum,
        rackBin: qcContract.hub_rack_bin || 'R-01 / Bin A-01',
        issuedAt: new Date().toLocaleString('vi-VN'),
      });
      setQcContract(null);
      await loadData();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Lỗi lưu biên bản kiểm định QC');
    } finally {
      setSubmitting(false);
    }
  };

  // Hàm render động từng ô Bin theo tồn kho thực tế
  const getBinLot = useCallback(
    (binCode: string) => {
      return storedLots.find((c) =>
        String(c.hub_rack_bin || '').toUpperCase().includes(binCode.toUpperCase())
      );
    },
    [storedLots]
  );

  const renderBinCard = (binCode: string, defaultCapacity = 2000) => {
    const lot = getBinLot(binCode);

    if (!lot) {
      return (
        <div
          key={binCode}
          className="p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 flex flex-col items-center justify-center text-center text-xs space-y-1 min-h-[140px]"
        >
          <span className="font-mono font-bold text-slate-400">{binCode}</span>
          <span className="text-slate-400 text-[11px]">Ô Kệ Trống</span>
          <span className="text-[10px] text-slate-400">Sẵn sàng tiếp nhận ({defaultCapacity.toLocaleString()} kg)</span>
        </div>
      );
    }

    const isQcPassed = lot.qc_status === 'QC_PASSED';
    const weight = Number(lot.actual_harvest_weight_kg || lot.offered_weight_kg || 150);

    // Tính thời gian FEFO thực tế (chuẩn Cross-docking 24h từ lúc nhập cổng)
    const inboundTime = lot.hub_inbound_at ? new Date(lot.hub_inbound_at).getTime() : Date.now();
    const elapsedHours = Math.max(0, Math.floor((Date.now() - inboundTime) / (1000 * 60 * 60)));
    const remainingHours = Math.max(1, 24 - elapsedHours);
    const fefoBadgeClass =
      remainingHours > 18
        ? 'text-emerald-800 bg-emerald-100/80'
        : remainingHours > 6
        ? 'text-amber-800 bg-amber-100/80'
        : 'text-rose-800 bg-rose-100/80';

    return (
      <div
        key={binCode}
        className="p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/40 space-y-2 relative shadow-xs"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono font-black text-xs text-[#10542C] bg-emerald-100 px-2 py-0.5 rounded-lg">
            {binCode}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${fefoBadgeClass}`}>
            <Clock className="w-3 h-3" />
            Còn {remainingHours}h (FEFO {remainingHours > 18 ? 'OK' : 'Cần Xuất'})
          </span>
        </div>

        <div>
          <span className="font-mono font-bold text-xs text-[#10542C] block">{lot.contract_code}</span>
          <strong className="text-xs text-slate-900 block truncate">{lot.product_name || 'Nông sản VietGAP'}</strong>
          <span className="text-[11px] text-slate-600 block truncate">Bán: {lot.farmer_name || 'Nhà vườn'}</span>
        </div>

        <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between text-xs">
          <span className="text-slate-500">Tải trọng:</span>
          <strong className="font-mono text-[#10542C]">{weight} kg ({lot.package_count || 10} thùng)</strong>
        </div>

        <div className="flex items-center justify-between text-[10px] pt-1 text-slate-500">
          <span>Nhiệt độ buồng: <strong className="text-blue-700">2.8°C</strong></span>
          <span className={isQcPassed ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
            {isQcPassed ? 'QC: Pass ✓' : 'Chờ Lab QC'}
          </span>
        </div>
      </div>
    );
  };

  // Lọc danh sách lô hàng kiểm định & tồn kho theo từ khóa
  const filteredInventory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^#/, '');
    if (!q) return inventory;
    return inventory.filter((c) => {
      const code = String(c.contract_code || '').toLowerCase().replace(/^#/, '');
      const product = String(c.product_name || '').toLowerCase();
      const farmer = String(c.farmer_name || '').toLowerCase();
      const zone = String(c.hub_warehouse_zone || '').toLowerCase();
      const bin = String(c.hub_rack_bin || '').toLowerCase();
      return code.includes(q) || product.includes(q) || farmer.includes(q) || zone.includes(q) || bin.includes(q);
    });
  }, [inventory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. BANNER CONTROL TOWER CHUẨN KHO LẠNH HONA FRESH */}
      <div className="bg-gradient-to-r from-[#10542C] via-[#166534] to-[#0B381E] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Snowflake className="w-4 h-4 text-emerald-300 animate-spin" />
              <span>Cross-Docking Cold Storage Control Tower</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
              <Warehouse className="w-7 h-7 text-[#8BC34A]" /> Trạm Kiểm Định QC & Kho Lạnh FEFO
            </h1>
            <p className="text-xs text-white/80 mt-1 max-w-2xl">
              Trung tâm giám sát cân đối soát cổng kho, kiểm nghiệm hóa lý sinh (Brix, Nitrate, que thử BVTV) và điều phối lưu tạm FEFO (6–24h) phục vụ trung chuyển nông sản B2B.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadData()}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shrink-0"
              title="Làm mới dữ liệu kho"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Thông báo Toast */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xs transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xs transition-all">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. THANH CHỌN TRẠM TRUNG CHUYỂN (5 HUB CHÍNH THỨC) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <MapPin className="w-4 h-4 text-[#10542C]" />
            <span>Mạng Lưới 5 Trạm Trung Chuyển Lạnh Chuẩn Cross-Docking</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Đang chọn: <strong className="text-[#10542C]">{currentHub.hubName}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {hubs.map((hub) => {
            const isSelected = hub.id === selectedHubId;
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => setSelectedHubId(hub.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#10542C] bg-emerald-50/50 shadow-xs ring-2 ring-[#10542C]/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-[#10542C] text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {hub.hubCode}
                  </span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />}
                </div>
                <strong className="text-xs font-bold text-slate-900 block mt-2 line-clamp-1">
                  {hub.hubName}
                </strong>
                <span className="text-[11px] text-slate-500 block mt-0.5 line-clamp-1">{hub.address}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. BẢNG 4 CHỈ SỐ KPI VẬN HÀNH THỜI GIAN THỰC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Công suất kho */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Dung Lượng Lưu Tạm Kho Lạnh</span>
            <Snowflake className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{money(metrics.totalStoredKg)}</span>
            <span className="text-xs text-slate-500 font-bold">/ 50.000 kg</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.utilizationPct)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1.5 block">
            Tỷ lệ lấp đầy: <strong>{metrics.utilizationPct}%</strong> (Cross-docking an toàn)
          </span>
        </div>

        {/* Metric 2: Xe sắp cập bến */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Chuyến Xe Về Cổng / Cập Bến</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-[#10542C] font-mono">
            {metrics.incomingTrucksCount} <span className="text-xs font-bold text-slate-500">chuyến</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-2 block">
            Bao gồm xe thu gom rẫy đang chuyển về & xe đã tới cổng
          </span>
        </div>

        {/* Metric 3: Lô chờ kiểm định Lab */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Lô Chờ Kiểm Định Lab QC</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 font-mono">
            {metrics.pendingQcCount} <span className="text-xs font-bold text-slate-500">lô hàng</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-2 block">
            Cần đo Brix, nồng độ Nitrate và thử que test thuốc BVTV
          </span>
        </div>

        {/* Metric 4: Sẵn sàng Outbound */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Lô Đạt Chuẩn Sẵn Sàng Xuất</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-700 font-mono">
            {metrics.readyOutboundCount} <span className="text-xs font-bold text-slate-500">hợp đồng</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-2 block">
            Đã cấp tem QC Pass, nằm trong ô Bin chờ ghép chuyến Outbound
          </span>
        </div>
      </div>

      {/* 4. THANH ĐIỀU HƯỚNG 4 TAB PHÂN HỆ VẬN HÀNH KHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/60 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('GATE_RECEIVING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'GATE_RECEIVING'
                ? 'bg-white text-[#10542C] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-4 h-4 text-emerald-600" />
            <span>Tiếp Nhận & Bàn Cân ({trips.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('QC_LAB')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'QC_LAB'
                ? 'bg-white text-[#10542C] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-600" />
            <span>Trạm Kiểm Định Lab QC ({inventory.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FEFO_STORAGE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'FEFO_STORAGE'
                ? 'bg-white text-[#10542C] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4 text-blue-600" />
            <span>Sơ Đồ Kho Lạnh FEFO ({storedLots.length} đang lưu)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('READY_OUTBOUND')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'READY_OUTBOUND'
                ? 'bg-white text-[#10542C] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4 text-purple-600" />
            <span>Sẵn Sàng Xuất Kho ({metrics.readyOutboundCount})</span>
          </button>
        </div>

        {/* Ô Tìm Kiếm */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã HĐ, nông sản, vị trí..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#10542C]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TIẾP NHẬN CỔNG KHO & CÂN ĐỐI SOÁT TẢI TRỌNG (GATE RECEIVING) */}
      {/* ========================================================================= */}
      {activeTab === 'GATE_RECEIVING' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-950 text-white rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" /> Cân Tải Trọng Cổng & Kiểm Soát Chuỗi Lạnh
              </span>
              <h3 className="text-sm font-bold">Tiếp nhận các chuyến xe lạnh thu gom từ rẫy về {currentHub.hubName}</h3>
              <p className="text-xs text-slate-300">
                Quy trình đối soát: Cân Tổng (Gross) $\rightarrow$ Cân Bì (Tare) $\rightarrow$ Cân Tịnh (Net) $\rightarrow$ Đo nhiệt độ cuống $\rightarrow$ Nhập kho mát.
              </p>
            </div>
          </div>

          {trips.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <p className="text-xs text-slate-500">Chưa có chuyến xe nào đang trên đường về kho này.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {trips.map((trip) => {
                const isArrived = trip.status === 'ARRIVED_AT_WAREHOUSE';
                const isCompleted = trip.status === 'COMPLETED';
                const isOnTrip = trip.status === 'ON_TRIP' || trip.status === 'RETURNING';

                return (
                  <div
                    key={trip.id}
                    className={`bg-white rounded-3xl p-5 border transition-all shadow-xs space-y-4 ${
                      isCompleted
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : isArrived
                        ? 'border-purple-300 ring-2 ring-purple-100'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isArrived
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900">{trip.tripCode}</span>
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isArrived
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              {isCompleted
                                ? 'GĐ 7.2: ĐÃ TIẾP NHẬN XONG'
                                : isArrived
                                ? 'GĐ 7.1: XE ĐÃ ĐẾN CỔNG KHO'
                                : 'GĐ 6: ĐANG VỀ KHO TRUNG CHUYỂN'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Xe: <strong className="font-mono text-slate-800">{trip.vehicle?.plateNumber}</strong> · Tài xế: <strong>{trip.driver?.fullName}</strong> ({trip.driver?.phone})
                          </span>
                        </div>
                      </div>

                      {/* Nút hành động */}
                      <div className="flex items-center gap-2">
                        {isOnTrip && (
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleConfirmTruckArrival(trip.id)}
                            className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Xác Nhận Xe Đến Cổng</span>
                          </button>
                        )}

                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => openWeighingModal(trip)}
                            className="px-4 py-2 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                          >
                            <Scale className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Cân Đối Soát & Tiếp Nhận Dỡ Hàng</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Chi tiết các lô hàng trên xe */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Các Lô Hàng Thu Gom Trên Xe Lạnh ({trip.stops?.length || 0} rẫy)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                        {trip.stops?.map((stop) => (
                          <div key={stop.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[#10542C]">
                                {stop.contractCode || stop.contract?.contractCode || `HĐ-${stop.contractId}`}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                stop.status === 'LOADED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {stop.status === 'LOADED' ? 'ĐÃ BỐC RẪY' : stop.status}
                              </span>
                            </div>
                            <strong className="text-slate-800 block truncate">{stop.farmerName}</strong>
                            <p className="text-[11px] text-slate-500 truncate">{stop.pickupAddress}</p>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
                              <span>Khối lượng thực bốc:</span>
                              <strong className="font-mono text-emerald-800">{stop.actualWeightKg || stop.weightKg} kg</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRẠM KIỂM ĐỊNH LAB QC & CẤP CHỨNG CHỈ (QC_LAB) */}
      {/* ========================================================================= */}
      {activeTab === 'QC_LAB' && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-amber-900 to-amber-950 text-white rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Tiêu Chuẩn Kiểm Định Nông Sản B2B VietGAP / GlobalGAP
              </span>
              <h3 className="text-sm font-bold">Thử nghiệm hóa lý sinh: Đo độ ngọt Brix, tồn dư Nitrate & que thử BVTV</h3>
              <p className="text-xs text-amber-100/80">
                Lô hàng sau khi dỡ khỏi xe lạnh sẽ được lấy mẫu tại phòng Lab để kiểm tra chất lượng trước khi lưu vào kệ FEFO.
              </p>
            </div>
          </div>

          {filteredInventory.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <p className="text-xs text-slate-500">Không có lô hàng nào đang chờ kiểm định QC.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Mã Hợp Đồng</th>
                      <th className="p-3.5">Nông Sản & Nhà Vườn</th>
                      <th className="p-3.5 text-right">Khối Lượng</th>
                      <th className="p-3.5 text-center">Nhiệt Độ Cuống</th>
                      <th className="p-3.5">Chỉ Số QC Thực Nghiệm</th>
                      <th className="p-3.5 text-center">Trạng Thái Kho</th>
                      <th className="p-3.5 text-right pr-5">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInventory.map((row) => {
                      const isQcPassed = row.qc_status === 'QC_PASSED';
                      const isReceivedAtHub =
                        ['AT_HUB_QC', 'HUB_DELIVERED', 'READY_OUTBOUND'].includes(row.status) ||
                        Boolean(row.hub_rack_bin);
                      const brixVal = row.qc_brix || 12.5;
                      const nitrateVal = row.qc_nitrate_ppm || 240;

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/60 transition">
                          <td className="p-3.5 font-mono font-bold text-[#10542C] whitespace-nowrap">
                            {row.contract_code}
                          </td>
                          <td className="p-3.5">
                            <strong className="text-slate-900 block">{row.product_name || 'Rau nông sản VietGAP'}</strong>
                            <span className="text-[11px] text-slate-500">Bán: {row.farmer_name || 'Nhà vườn'}</span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {money(row.actual_harvest_weight_kg || row.offered_weight_kg || 150)} kg
                            <span className="text-[10px] text-slate-500 block">({row.package_count || 10} thùng)</span>
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 text-[11px]">
                              <Thermometer className="w-3 h-3 text-blue-600" />
                              3.5°C
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            {isQcPassed ? (
                              <div className="space-y-0.5 text-[11px]">
                                <div>Brix: <strong className="text-amber-700 font-mono">{brixVal}°Bx</strong></div>
                                <div>Nitrate: <strong className="text-purple-700 font-mono">{nitrateVal} ppm</strong> (An toàn)</div>
                                <div className="text-emerald-700 font-bold flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Test BVTV: Âm tính
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">
                                {isReceivedAtHub ? 'Chờ thử nghiệm mẫu' : 'Xe đang vận chuyển về cổng'}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                              isQcPassed
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : isReceivedAtHub
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}>
                              {isQcPassed ? 'ĐÃ ĐẠT QC' : isReceivedAtHub ? 'CHỜ KIỂM ĐỊNH' : 'XE ĐANG VẬN CHUYỂN'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right pr-5 whitespace-nowrap">
                            {isReceivedAtHub ? (
                              <button
                                type="button"
                                onClick={() => openQcInspectionModal(row)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ml-auto ${
                                  isQcPassed
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs'
                                }`}
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                                <span>{isQcPassed ? 'Xem & Cấp Lại Chứng Chỉ' : 'Kiểm Nghiệm Lab QC'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveTab('GATE_RECEIVING')}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                <Scale className="w-3 h-3 text-emerald-700" />
                                <span>Tiếp nhận cổng kho trước</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SƠ ĐỒ KHO LẠNH 2D & QUẢN TRỊ FEFO (FEFO STORAGE MAP - ĐỘNG 100%) */}
      {/* ========================================================================= */}
      {activeTab === 'FEFO_STORAGE' && (
        <div className="space-y-6">
          {/* Header giải thích nguyên tắc FEFO */}
          <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl shadow-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
              <Boxes className="w-4 h-4 text-blue-400" />
              <span>FEFO Inventory Control (First-Expired, First-Out)</span>
            </div>
            <h3 className="text-base font-bold">Bản đồ buồng lạnh phân vùng Zone, Kệ Rack & Ô Chứa Bin thực tế</h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Mô hình Cross-docking: Hàng nông sản được tiếp nhận dỡ hàng tại cổng kho, xếp vào ô Bin kiểm soát nhiệt độ nghiêm ngặt và đếm ngược thời gian lưu kho. Hàng có hạn sử dụng ngắn nhất hoặc vào kho trước bắt buộc phải được ưu tiên bốc lên xe Outbound giao Buyer trước.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-200">🟢 An toàn: Còn &gt; 18 giờ lưu kho</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-200">🟡 Cần xuất sớm: Còn 6h - 18h</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-200">🔴 Báo động quá hạn: Dưới 6 giờ</span>
              </span>
            </div>
          </div>

          {/* SƠ ĐỒ 3 ZONE BUỒNG LẠNH - RENDER HOÀN TOÀN TỰ ĐỘNG */}
          <div className="space-y-6">
            {/* ZONE A: KHO RAU LÁ & THẢO MỘC (2 - 4°C) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <Snowflake className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-slate-900">Zone A — Kho Lạnh Rau Ăn Lá & Thảo Mộc</strong>
                      <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        2°C - 4°C · RH 92%
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Chuyên biệt: Xà lách, lá é, cải bó xôi, rau thơm VietGAP</span>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-500">Đang lưu: </span>
                  <strong className="font-mono text-emerald-800">
                    {storedLots
                      .filter((c) => String(c.hub_warehouse_zone || '').includes('Zone A') || String(c.hub_rack_bin || '').includes('A-'))
                      .reduce((sum, c) => sum + Number(c.actual_harvest_weight_kg || c.offered_weight_kg || 0), 0)}{' '}
                    kg
                  </strong>{' '}
                  / 20.000 kg
                </div>
              </div>

              {/* Danh sách Kệ Rack & Ô Bin của Zone A */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Dãy Kệ Rack R-01 (Khu vực tiếp nhận & đếm ngược FEFO)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {renderBinCard('BIN A-01')}
                  {renderBinCard('BIN A-02')}
                  {renderBinCard('BIN A-03')}
                  {renderBinCard('BIN A-04')}
                </div>
              </div>
            </div>

            {/* ZONE B: KHO MÁT CỦ QUẢ NHIỆT ĐỚI (6 - 10°C) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <Thermometer className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-slate-900">Zone B — Kho Mát Củ QuẢ Nhiệt Đới</strong>
                      <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        6°C - 10°C · RH 85%
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Chuyên biệt: Cà chua beef, khoai tây, cà rốt, ớt chuông Đà Lạt</span>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-500">Đang lưu: </span>
                  <strong className="font-mono text-slate-700">
                    {storedLots
                      .filter((c) => String(c.hub_warehouse_zone || '').includes('Zone B') || String(c.hub_rack_bin || '').includes('B-'))
                      .reduce((sum, c) => sum + Number(c.actual_harvest_weight_kg || c.offered_weight_kg || 0), 0)}{' '}
                    kg
                  </strong>{' '}
                  / 15.000 kg
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {renderBinCard('BIN B-01')}
                {renderBinCard('BIN B-02')}
                {renderBinCard('BIN B-03')}
                {renderBinCard('BIN B-04')}
              </div>
            </div>

            {/* ZONE C: KHO MÁT TRÁI CÂY CAO CẤP (8 - 12°C) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-slate-900">Zone C — Kho Mát Trái Cây & Nông Sản Cao Cấp</strong>
                      <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        8°C - 12°C · RH 88%
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Chuyên biệt: Dâu tây New Zealand, dưa lưới Huỳnh Long, bơ booth</span>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-500">Đang lưu: </span>
                  <strong className="font-mono text-slate-700">
                    {storedLots
                      .filter((c) => String(c.hub_warehouse_zone || '').includes('Zone C') || String(c.hub_rack_bin || '').includes('C-'))
                      .reduce((sum, c) => sum + Number(c.actual_harvest_weight_kg || c.offered_weight_kg || 0), 0)}{' '}
                    kg
                  </strong>{' '}
                  / 15.000 kg
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {renderBinCard('BIN C-01')}
                {renderBinCard('BIN C-02')}
                {renderBinCard('BIN C-03')}
                {renderBinCard('BIN C-04')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DANH SÁCH LÔ SẴN SÀNG XUẤT KHO (READY_OUTBOUND) */}
      {/* ========================================================================= */}
      {activeTab === 'READY_OUTBOUND' && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Chuỗi Cung Ứng Xuất Kho Chặng Cuối (Outbound Cross-docking)
              </span>
              <h3 className="text-sm font-bold">Các lô hàng đã qua kiểm định QC Pass, sẵn sàng bốc lên xe giao Buyer</h3>
              <p className="text-xs text-purple-200">
                Lập chuyến xe giao hàng đa điểm (Outbound Delivery Trip) và kích hoạt giám sát hành trình ePOD.
              </p>
            </div>
            <Link
              href="/admin/outbound-dispatch"
              className="px-4 py-2.5 rounded-xl bg-white text-purple-950 font-bold text-xs flex items-center gap-2 hover:bg-purple-50 transition cursor-pointer shrink-0"
            >
              <span>Mở Bảng Điều Phối Xuất Kho Outbound</span>
              <ArrowRight className="w-4 h-4 text-purple-800" />
            </Link>
          </div>

          {storedLots.filter(c => c.qc_status === 'QC_PASSED').length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <p className="text-xs text-slate-500">Chưa có lô hàng nào hoàn tất kiểm định QC tại trạm này.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storedLots.filter(c => c.qc_status === 'QC_PASSED').map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3 hover:border-purple-300 transition"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="font-mono font-bold text-sm text-[#10542C]">{item.contract_code}</span>
                      <strong className="text-xs text-slate-900 block mt-0.5">{item.product_name}</strong>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      QC PASSED ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Khối Lượng Sẵn Sàng</span>
                      <strong className="font-mono text-emerald-800 block text-sm">
                        {money(item.actual_harvest_weight_kg || item.offered_weight_kg || 150)} kg
                      </strong>
                      <span className="text-[10px] text-slate-500">({item.package_count || 10} thùng xốp)</span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Vị Trí Lưu Kệ</span>
                      <strong className="font-mono text-blue-800 block text-sm">
                        {item.hub_rack_bin || 'R-01 / Bin A-01'}
                      </strong>
                      <span className="text-[10px] text-slate-500">{item.hub_warehouse_zone || 'Zone A (2-4°C)'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Người nhận (Buyer):</span>
                      <strong className="text-slate-800">{item.buyer_name || 'Công Ty Thu Mua'}</strong>
                    </div>

                    <Link
                      href={`/admin/outbound-dispatch?contractCode=${item.contract_code}`}
                      className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Điều Xe Giao Buyer</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CÂN ĐỐI SOÁT & TIẾP NHẬN DỠ HÀNG CỔNG KHO */}
      {/* ========================================================================= */}
      {weighingTrip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#10542C]" />
                <h3 className="font-bold text-base text-slate-900">
                  Cân Đối Soát & Tiếp Nhận Chuyến {weighingTrip.tripCode}
                </h3>
              </div>
              <button
                onClick={() => setWeighingTrip(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div>Xe: <strong className="font-mono">{weighingTrip.vehicle?.plateNumber}</strong> · Tài xế: <strong>{weighingTrip.driver?.fullName}</strong></div>
              <div>Tổng rẫy bốc: <strong>{weighingTrip.stops?.length || 1} điểm rẫy</strong></div>
            </div>

            {/* Các trường nhập liệu Bàn Cân */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cân Tổng (Gross kg)</label>
                  <input
                    type="number"
                    value={grossWeight}
                    onChange={(e) => handleGrossChange(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-[#10542C]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cân Bì (Tare kg)</label>
                  <input
                    type="number"
                    value={tareWeight}
                    onChange={(e) => {
                      setTareWeight(e.target.value);
                      const g = parseFloat(grossWeight) || 0;
                      const t = parseFloat(e.target.value) || 0;
                      if (g >= t) setNetWeight(String(g - t));
                    }}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-[#10542C]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#10542C] block mb-1">Cân Tịnh (Net kg)</label>
                  <input
                    type="number"
                    value={netWeight}
                    onChange={(e) => setNetWeight(e.target.value)}
                    className="w-full p-2.5 border border-emerald-400 bg-emerald-50/50 rounded-xl font-mono font-black text-emerald-800 focus:outline-none focus:border-[#10542C]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nhiệt Độ Cuống Lúc Dỡ Hàng (°C)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={dockCoreTemp}
                    onChange={(e) => setDockCoreTemp(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-[#10542C]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                    Tiêu chuẩn: 2°C - 6°C
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phân Vùng Buồng Lạnh</label>
                  <select
                    value={receivingZone}
                    onChange={(e) => setReceivingZone(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-slate-800 font-medium focus:outline-none focus:border-[#10542C]"
                  >
                    <option value="Zone A (Rau lá 2-4°C)">Zone A (Rau lá 2-4°C)</option>
                    <option value="Zone B (Củ quả 6-10°C)">Zone B (Củ quả 6-10°C)</option>
                    <option value="Zone C (Trái cây 8-12°C)">Zone C (Trái cây 8-12°C)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vị Trí Kệ Rack / Ô Bin</label>
                  <select
                    value={receivingBin}
                    onChange={(e) => setReceivingBin(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-slate-800 font-medium focus:outline-none focus:border-[#10542C]"
                  >
                    <option value="R-01 / Bin A-01">R-01 / Bin A-01</option>
                    <option value="R-01 / Bin A-02">R-01 / Bin A-02</option>
                    <option value="R-02 / Bin A-03">R-02 / Bin A-03</option>
                    <option value="R-03 / Bin B-01">R-03 / Bin B-01</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi Chú Kiểm Đếm Đối Soát</label>
                <textarea
                  rows={2}
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-slate-800 focus:outline-none focus:border-[#10542C]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWeighingTrip(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleCompleteGateReceiving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#10542C] hover:bg-[#0C3E20] text-white transition cursor-pointer shadow-xs flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Xác Nhận Nhập Kho & Giải Phóng Xe</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: KIỂM ĐỊNH LAB QC CHUYÊN SÂU & CẤP CHỨNG CHỈ */}
      {/* ========================================================================= */}
      {qcContract && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Thử Nghiệm Lab QC · {qcContract.contract_code}
                </h3>
              </div>
              <button
                onClick={() => setQcContract(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-0.5">
              <div>Nông sản: <strong className="text-slate-900">{qcContract.product_name}</strong></div>
              <div>Nhà vườn: <strong>{qcContract.farmer_name}</strong> · Khối lượng: <strong className="font-mono">{sampleWeight} kg</strong></div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* Đo độ ngọt Brix */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Độ Ngọt Brix (°Bx)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={brix}
                    onChange={(e) => setBrix(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Tiêu chuẩn: $\ge 12.0$ °Bx</span>
                </div>

                {/* Đo nồng độ Nitrate ppm */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nồng Độ Nitrate (ppm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={nitrate}
                    onChange={(e) => setNitrate(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Ngưỡng an toàn: $\le 300$ ppm (VietGAP)</span>
                </div>
              </div>

              {/* Test nhanh thuốc BVTV */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-700 block">Kết Quả Que Thử Nhanh Thuốc Bảo Vệ Thực Vật (Pesticide Test)</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pesticide"
                      checked={pesticideSafe === true}
                      onChange={() => setPesticideSafe(true)}
                      className="text-[#10542C] focus:ring-[#10542C]"
                    />
                    <span className="font-bold text-emerald-800">Âm Tính (Đạt chuẩn an toàn)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pesticide"
                      checked={pesticideSafe === false}
                      onChange={() => setPesticideSafe(false)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-bold text-rose-700">Dương Tính (Có dư lượng tồn dư)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tỷ Lệ Loại 1 Đạt Chuẩn (%)</label>
                  <input
                    type="number"
                    value={grade1Ratio}
                    onChange={(e) => setGrade1Ratio(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số Hiệu Chứng Chỉ QC</label>
                  <input
                    type="text"
                    value={qcCertCode}
                    onChange={(e) => setQcCertCode(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-[#10542C] focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kỹ Thuật Viên Thực Hiện Thử Nghiệm</label>
                <input
                  type="text"
                  value={qcInspector}
                  onChange={(e) => setQcInspector(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-slate-800 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kết Luận Cảm Quan & Đánh Giá QC</label>
                <textarea
                  rows={2}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-slate-800 focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQcContract(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleApproveQcLab}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition cursor-pointer shadow-xs flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Phê Duyệt QC Pass & Cấp Chứng Chỉ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: XEM CHỨNG CHỈ KIỂM ĐỊNH QC PASS & TEM QR CODE */}
      {/* ========================================================================= */}
      {showCertSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-emerald-300">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Chứng Chỉ Kiểm Định Chất Lượng Đạt Chuẩn</span>
              </div>
              <button
                onClick={() => setShowCertSuccess(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs space-y-2 text-emerald-950">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#10542C]">{showCertSuccess.certCode}</span>
                <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                  QC PASSED ✓
                </span>
              </div>

              <div className="space-y-1 pt-1">
                <div>Hợp đồng: <strong className="font-mono">{showCertSuccess.contractCode}</strong></div>
                <div>Sản phẩm: <strong>{showCertSuccess.productName}</strong></div>
                <div>Khối lượng kiểm định: <strong>{showCertSuccess.weight} kg</strong></div>
                <div>Vị trí lưu kho FEFO: <strong className="text-blue-800 font-mono">{showCertSuccess.rackBin}</strong></div>
                <div>Độ ngọt Brix: <strong>{showCertSuccess.brix}°Bx</strong> · Nitrate: <strong>{showCertSuccess.nitrate} ppm</strong></div>
                <div>Thuốc BVTV: <strong className="text-emerald-800">Âm tính</strong></div>
                <div>KTV phê duyệt: <strong>{showCertSuccess.inspector}</strong></div>
                <div>Thời điểm cấp: <span className="text-slate-600">{showCertSuccess.issuedAt}</span></div>
              </div>

              <div className="pt-2 border-t border-emerald-200 flex items-center justify-center">
                <div className="p-2 bg-white rounded-xl border border-emerald-200 flex items-center gap-2 text-[11px] font-mono">
                  <QrCode className="w-8 h-8 text-emerald-800" />
                  <span>HONAFRESH-QC-VERIFIED-{showCertSuccess.contractCode}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCertSuccess(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#10542C] hover:bg-[#0C3E20] text-white transition cursor-pointer text-center"
              >
                Đóng & Tiếp Tục Điều Hành Kho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
