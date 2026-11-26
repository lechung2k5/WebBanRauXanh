'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Warehouse,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Search,
  Layers,
  Thermometer,
  ShieldCheck,
  Boxes,
  FileCheck,
  ChevronRight,
  LogOut,
  RefreshCw,
  Eye,
  X,
  Scale,
  QrCode,
  Printer,
  Camera,
} from 'lucide-react';
import CameraQrScannerModal from '@/components/warehouse/CameraQrScannerModal';
import {
  buildCrateBarcodeCode,
  getShortContractCode,
  printCrateLabels,
} from '@/utils/crateLabelPrinter';
import {
  fleetDispatchApi,
  PickupTripDto,
  PickupTripStopDto,
  DEFAULT_OFFICIAL_HUBS,
  WarehouseHubDto,
  WarehouseZoneDto,
} from '@/services/fleetDispatchApi';
import { useApp } from '@/context/AppContext';
import { portalFor } from '@/services/auth';
import { b2bWebSocket } from '@/services/websocketService';

export default function WarehouseReceivingConsole() {
  const { currentUser, authLoading, logout } = useApp();
  const router = useRouter();

  const canAccessStaffQc = Boolean(
    currentUser?.roles?.includes('ROLE_WAREHOUSE_QC') ||
      currentUser?.roles?.includes('ROLE_WAREHOUSE_MANAGER') ||
      currentUser?.roles?.includes('ROLE_ADMIN')
  );

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.replace('/dang-nhap');
      return;
    }
    if (!canAccessStaffQc) {
      router.replace(portalFor(currentUser.roles || []));
    }
  }, [authLoading, currentUser, canAccessStaffQc, router]);

  const [hubs] = useState<WarehouseHubDto[]>(DEFAULT_OFFICIAL_HUBS);
  const [selectedHubId, setSelectedHubId] = useState<number>(() => Number(currentUser?.assignedHubId || 2));
  const isHubLocked = !currentUser?.roles?.includes('ROLE_ADMIN') || Boolean(currentUser?.assignedHubId);
  const assignedHub = hubs.find((h) => h.id === selectedHubId) || hubs[1] || hubs[0];

  useEffect(() => {
    if (currentUser?.assignedHubId) {
      setSelectedHubId(Number(currentUser.assignedHubId));
    }
  }, [currentUser?.assignedHubId]);
  const [activeTab, setActiveTab] = useState<'RECEIVING' | 'QC' | 'OUTBOUND'>('RECEIVING');
  const [trips, setTrips] = useState<PickupTripDto[]>([]);
  const [hubInventory, setHubInventory] = useState<any[]>([]);
  const [outboundTasks, setOutboundTasks] = useState<{ pa2Tasks: any[]; pa3Tasks: any[]; totalPending: number }>({
    pa2Tasks: [],
    pa3Tasks: [],
    totalPending: 0,
  });
  const [warehouseZones, setWarehouseZones] = useState<WarehouseZoneDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Receiving Modal state
  const [activeReceivingTrip, setActiveReceivingTrip] = useState<PickupTripDto | null>(null);
  const [actualTotalWeight, setActualTotalWeight] = useState<string>('');
  const [actualTotalPackages, setActualTotalPackages] = useState<string>('');
  const [receivingNotes, setReceivingNotes] = useState<string>('');
  const [selectedColdZone, setSelectedColdZone] = useState<string>('Zone A — Kho Lạnh Rau Ăn Lá & Thảo Mộc');
  const [selectedBin, setSelectedBin] = useState<string>('R-01 / BIN A-01');

  // Per-stop QC overrides
  const [lotQcMap, setLotQcMap] = useState<Record<number, { qualified: string; rejected: string; notes: string }>>({});

  // Mobile QC Inspection Modal state
  const [activeQcContract, setActiveQcContract] = useState<any | null>(null);
  const [qcDecision, setQcDecision] = useState<'PASS' | 'FAIL'>('PASS');
  const [qcBrix, setQcBrix] = useState<string>('12.5');
  const [qcNitrate, setQcNitrate] = useState<string>('240');
  const [qcPesticideSafe, setQcPesticideSafe] = useState<boolean>(true);
  const [qcWeight, setQcWeight] = useState<string>('');
  const [qcMaxDays, setQcMaxDays] = useState<string>('3');
  const [qcNotes, setQcNotes] = useState<string>('');
  const [qcRejectReason, setQcRejectReason] = useState<string>('');

  // Outbound Picking & Handover Modal state
  const [activeOutboundTask, setActiveOutboundTask] = useState<any | null>(null);
  const [outboundStep, setOutboundStep] = useState<1 | 2 | 3>(1);
  const [sealVerified, setSealVerified] = useState<boolean>(false);
  const [scannedCrates, setScannedCrates] = useState<number[]>([]);
  const [crateScanInput, setCrateScanInput] = useState<string>('');
  const [crateScanError, setCrateScanError] = useState<string | null>(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState<boolean>(false);
  const [lastScannedLabel, setLastScannedLabel] = useState<string | null>(null);
  const [pickedPackages, setPickedPackages] = useState<string>('');
  const [pickedWeightKg, setPickedWeightKg] = useState<string>('');
  const [outboundTemp, setOutboundTemp] = useState<string>('3.2');
  const [outboundNotes, setOutboundNotes] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [receiverPhone, setReceiverPhone] = useState<string>('');

  const loadReceivingTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tripsRes, invRes, layoutRes, outboundRes] = await Promise.all([
        fleetDispatchApi.getReceivingTrips(selectedHubId),
        fleetDispatchApi.getHubInventory(selectedHubId).catch(() => []),
        fleetDispatchApi.getWarehouseLayout(selectedHubId).catch(() => null),
        fleetDispatchApi.getWarehouseOutboundTasks(selectedHubId).catch(() => ({ pa2Tasks: [], pa3Tasks: [], totalPending: 0 })),
      ]);
      setTrips(Array.isArray(tripsRes) ? tripsRes : []);
      setHubInventory(Array.isArray(invRes) ? invRes : []);
      if (outboundRes && typeof outboundRes === 'object') {
        setOutboundTasks({
          pa2Tasks: Array.isArray(outboundRes.pa2Tasks) ? outboundRes.pa2Tasks : [],
          pa3Tasks: Array.isArray(outboundRes.pa3Tasks) ? outboundRes.pa3Tasks : [],
          totalPending: Number(outboundRes.totalPending || 0),
        });
      }
      if (layoutRes && Array.isArray(layoutRes.zones) && layoutRes.zones.length > 0) {
        setWarehouseZones(layoutRes.zones);
        const firstZone = layoutRes.zones[0];
        const firstBin = firstZone.bins?.[0];
        setSelectedColdZone(firstZone.zoneName);
        if (firstBin) {
          setSelectedBin(`${firstBin.rackCode} / ${firstBin.binCode}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách chuyến tiếp nhận');
    } finally {
      setLoading(false);
    }
  }, [selectedHubId]);

  useEffect(() => {
    loadReceivingTrips();
    const unsubDispatch = b2bWebSocket.subscribeDispatch(() => {
      loadReceivingTrips();
    });
    const unsubContracts = b2bWebSocket.subscribeContracts(() => {
      loadReceivingTrips();
    });
    return () => {
      unsubDispatch();
      unsubContracts();
    };
  }, [loadReceivingTrips]);

  // Giai đoạn 7.1: Xác nhận xe đã đến cổng kho
  const handleConfirmArrival = async (tripId: number) => {
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.confirmTruckArrival(tripId);
      setSuccessMsg('Đã xác nhận xe tải đã đến cổng kho trung chuyển!');
      await loadReceivingTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xác nhận xe đến cổng');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal kiểm đếm nhập kho (Giai đoạn 7.2)
  const openReceivingModal = (trip: PickupTripDto) => {
    setActiveReceivingTrip(trip);
    // Tính tổng khối lượng thực tế tài xế đã bốc tại các stop
    const sumActualWeight = trip.stops?.reduce((acc, s) => acc + (s.actualWeightKg || s.weightKg || 0), 0) || trip.totalWeightKg;
    const sumActualPackages = trip.stops?.reduce((acc, s) => acc + (s.actualPackageCount || s.packageCount || 0), 0) || trip.totalPackages;

    setActualTotalWeight(String(sumActualWeight));
    setActualTotalPackages(String(sumActualPackages));
    setReceivingNotes(`Đã kiểm tra cân đối soát xe ${trip.vehicle?.plateNumber}. Rau tươi, đạt tiêu chuẩn cảm quan và nhiệt độ chuỗi lạnh.`);

    const initLotMap: Record<number, { qualified: string; rejected: string; notes: string }> = {};
    trip.stops?.forEach(s => {
      const w = s.actualWeightKg || s.weightKg;
      initLotMap[s.contractId] = {
        qualified: String(w),
        rejected: '0',
        notes: 'Đạt chuẩn nhập kho mát',
      };
    });
    setLotQcMap(initLotMap);
  };

  // Giai đoạn 7.2: Hoàn tất kiểm đếm & Nhập kho
  const handleCompleteReceiving = async () => {
    if (!activeReceivingTrip) return;

    const totalWeightNum = parseFloat(actualTotalWeight);
    if (isNaN(totalWeightNum) || totalWeightNum <= 0) {
      setError('Vui lòng nhập tổng khối lượng cân thực tế tại kho');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const lotItems = activeReceivingTrip.stops?.map(s => {
        const qc = lotQcMap[s.contractId];
        const qualWeight = qc ? parseFloat(qc.qualified) : (s.actualWeightKg || s.weightKg);
        const rejWeight = qc ? parseFloat(qc.rejected) : 0;
        return {
          contractId: s.contractId,
          receivedWeightKg: qualWeight + rejWeight,
          qualifiedWeightKg: qualWeight,
          rejectedWeightKg: rejWeight,
          packageCount: s.actualPackageCount || s.packageCount,
          coldZone: selectedColdZone,
          rackBin: selectedBin,
          qcNotes: qc?.notes || 'Đã kiểm đếm đạt chuẩn tại cổng Hub',
        };
      }) || [];

      await fleetDispatchApi.completeReceiving(activeReceivingTrip.id, {
        actualTotalWeightKg: totalWeightNum,
        actualTotalPackages: actualTotalPackages ? parseInt(actualTotalPackages, 10) : activeReceivingTrip.totalPackages,
        receivingNotes,
        lotItems,
      });

      setSuccessMsg(`Đã hoàn tất tiếp nhận chuyến ${activeReceivingTrip.tripCode}! Lô hàng đã được lưu kho và sẵn sàng kiểm định QC.`);
      setActiveReceivingTrip(null);
      await loadReceivingTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi hoàn tất nhập kho');
    } finally {
      setSubmitting(false);
    }
  };

  const openQcModal = (contract: any) => {
    const net = Number(contract.inbound_net_weight_kg ?? contract.actual_harvest_weight_kg ?? contract.offered_weight_kg ?? 100);
    setActiveQcContract(contract);
    setQcDecision('PASS');
    setQcBrix(String(contract.qc_brix ?? 12.5));
    setQcNitrate(String(contract.qc_nitrate_ppm ?? 240));
    setQcPesticideSafe(contract.qc_pesticide_safe !== false);
    setQcWeight(String(net));
    setQcMaxDays(String(contract.max_storage_days ?? 3));
    setQcNotes('Rau củ tươi, không dập nát, đạt chỉ tiêu an toàn thực phẩm & chuỗi lạnh.');
    setQcRejectReason('');
  };

  const handleSubmitQc = async () => {
    if (!activeQcContract) return;
    const netNum = parseFloat(qcWeight) || 0;
    const brixNum = parseFloat(qcBrix) || 12.5;
    const nitrateNum = parseFloat(qcNitrate) || 240;

    if (netNum <= 0) {
      setError('Vui lòng nhập khối lượng kiểm định hợp lệ (> 0 kg)');
      return;
    }
    if (qcDecision === 'FAIL' && !qcRejectReason.trim() && !qcNotes.trim()) {
      setError('Vui lòng nhập lý do không đạt QC');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (qcDecision === 'FAIL') {
        await fleetDispatchApi.rejectWarehouseQc(activeQcContract.id, {
          brix: brixNum,
          nitratePpm: nitrateNum,
          pesticideSafe: qcPesticideSafe,
          rejectedWeightKg: netNum,
          qcNotes,
          reason: qcRejectReason.trim() || qcNotes,
        });
        setSuccessMsg(`Đã ghi nhận KHÔNG ĐẠT QC cho hợp đồng ${activeQcContract.contract_code}.`);
      } else {
        const certCode = `QC-${activeQcContract.contract_code}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`;
        await fleetDispatchApi.submitWarehouseInboundQc(activeQcContract.id, {
          zone: activeQcContract.hub_warehouse_zone || selectedColdZone,
          rackBin: activeQcContract.hub_rack_bin || selectedBin,
          maxStorageDays: parseInt(qcMaxDays, 10) || 3,
          grossWeightKg: netNum + 25,
          tareWeightKg: 25,
          netWeightKg: netNum,
          brix: brixNum,
          nitratePpm: nitrateNum,
          pesticideSafe: qcPesticideSafe,
          qcCertUrl: `https://honafresh.vn/qc/certs/${certCode}.pdf`,
          qcNotes,
        });
        setSuccessMsg(`Đã duyệt ĐẠT QC và cấp chứng chỉ ${certCode} cho lô ${activeQcContract.contract_code}!`);
      }

      setActiveQcContract(null);
      void loadReceivingTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi lưu kết quả kiểm định QC');
    } finally {
      setSubmitting(false);
    }
  };

  const openOutboundPickingModal = async (task: any, startAtStep?: 1 | 2 | 3) => {
    try {
      setError(null);
      if (task.pickingStage === 'WAITING_PICKING') {
        setSubmitting(true);
        await fleetDispatchApi.startWarehouseOutboundPicking(task.id);
        void loadReceivingTrips();
      }
      const nextStep: 1 | 2 | 3 =
        startAtStep ||
        (task.pickingStage === 'PICKED_FROM_BIN' ? 3 : 1);
      setActiveOutboundTask(task);
      setOutboundStep(nextStep);
      const totalPkgs = Math.max(1, Number(task.packageCount || 7));
      setScannedCrates(
        task.pickingStage === 'PICKED_FROM_BIN'
          ? Array.from({ length: totalPkgs }, (_, i) => i + 1)
          : []
      );
      setCrateScanInput('');
      setCrateScanError(null);
      setSealVerified(task.pickingStage === 'PICKED_FROM_BIN');
      setPickedPackages(String(task.packageCount || 7));
      setPickedWeightKg(String(task.weightKg || 100));
      setOutboundTemp('3.2');
      setOutboundNotes('');
      if (task.isSelfPickup) {
        setReceiverName(String(task.buyer_name || task.buyer_company || 'Đại diện Buyer'));
        setReceiverPhone(String(task.buyer_phone || ''));
      } else {
        setReceiverName(String(task.assigned_driver_name || 'Tài xế xe lạnh HoNa'));
        setReceiverPhone(String(task.assigned_driver_phone || ''));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể mở lệnh xuất kho');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScanCrateInput = (raw: string) => {
    if (!activeOutboundTask) return;
    const val = raw.trim().toUpperCase();
    if (!val) return;
    const totalPkgs = Math.max(1, Number(activeOutboundTask.packageCount || 7));
    const shortCode = getShortContractCode(activeOutboundTask.contract_code);

    // Chặn quét nhầm thùng thuộc hợp đồng khác nằm chung ô kệ
    if (val.includes('-') || val.includes('|')) {
      const hasContractMatch =
        val.includes(shortCode) ||
        val.includes(String(activeOutboundTask.contract_code || '').toUpperCase());
      if (!hasContractMatch) {
        setCrateScanError(
          `CẢNH BÁO NHẦM ĐƠN: Mã "${val}" không thuộc hợp đồng ${activeOutboundTask.contract_code}!`
        );
        return;
      }
    }

    // Trích xuất số thứ tự thùng (VD: E279-03 -> 3 hoặc "3" -> 3)
    const parts = val.split(/[-|]/);
    const lastPart = parts[parts.length - 1];
    const crateNo = parseInt(lastPart, 10);
    if (Number.isNaN(crateNo) || crateNo < 1 || crateNo > totalPkgs) {
      setCrateScanError(
        `Mã thùng "${val}" không hợp lệ (Đơn này có ${totalPkgs} thùng từ #1 đến #${totalPkgs}).`
      );
      return;
    }

    setCrateScanError(null);
    setLastScannedLabel(buildCrateBarcodeCode(activeOutboundTask.contract_code, crateNo));
    setScannedCrates((prev) => (prev.includes(crateNo) ? prev : [...prev, crateNo].sort((a, b) => a - b)));
    setCrateScanInput('');
  };

  const handleConfirmPickedStep = async () => {
    if (!activeOutboundTask) return;
    const pkgs = parseInt(pickedPackages, 10) || 0;
    const wt = parseFloat(pickedWeightKg) || 0;
    const temp = parseFloat(outboundTemp) || 3.2;
    if (pkgs <= 0 || wt <= 0) {
      setError('Vui lòng nhập số thùng và khối lượng thực xuất hợp lệ (> 0)');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.confirmWarehouseOutboundPicked(activeOutboundTask.id, {
        pickedPackages: pkgs,
        actualWeightKg: wt,
        outboundTemp: temp,
        notes: outboundNotes,
      });
      setOutboundStep(3);
      void loadReceivingTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xác nhận lấy hàng tại kệ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteHandoverStep = async () => {
    if (!activeOutboundTask) return;
    if (!receiverName.trim()) {
      setError('Vui lòng nhập tên người nhận bàn giao');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.completeWarehouseOutboundHandover(activeOutboundTask.id, {
        handoverType: activeOutboundTask.isSelfPickup ? 'PA3_BUYER_PICKUP' : 'PA2_TRUCK',
        receiverName: receiverName.trim(),
        receiverPhone: receiverPhone.trim(),
        notes: outboundNotes.trim(),
      });
      const code = activeOutboundTask.contract_code;
      setActiveOutboundTask(null);
      setSuccessMsg(
        activeOutboundTask.isSelfPickup
          ? `Đã bàn giao xuất kho PA3 đơn ${code} cho Buyer tại cổng kho!`
          : `Đã bàn giao đơn ${code} lên xe lạnh Outbound thành công!`
      );
      void loadReceivingTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi hoàn tất bàn giao xuất kho');
    } finally {
      setSubmitting(false);
    }
  };

  const incomingTrips = trips.filter(t => ['RETURNING', 'ARRIVED_AT_WAREHOUSE', 'ON_TRIP'].includes(t.status));
  const completedTrips = trips.filter(t => t.status === 'COMPLETED');

  const qcPendingLots = hubInventory.filter(
    c => c.status === 'AT_HUB_QC' || c.qc_status === 'PENDING_QC'
  );
  const qcCompletedLots = hubInventory.filter(
    c => ['QC_PASSED', 'QC_FAILED', 'READY_OUTBOUND'].includes(c.status) || ['PASSED', 'FAILED'].includes(c.qc_status)
  );

  const selectedZoneObj = warehouseZones.find(z => z.zoneName === selectedColdZone) || warehouseZones[0];
  const availableBins = selectedZoneObj?.bins || [];

  return (
    <main className="min-h-screen bg-[#F4F6F0] text-slate-900 pb-16">
      {/* 1. TOP NAVIGATION */}
      <header className="fixed top-0 left-0 right-0 w-full z-40 bg-[#10542C] text-white px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-md">
        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="inline-flex items-center shrink-0">
              <img
                src="/assets/logo/Logo_full.png"
                alt="HoNa Fresh"
                className="h-11 w-auto object-contain [filter:drop-shadow(1px_0_0_#fff)_drop-shadow(-1px_0_0_#fff)_drop-shadow(0_1px_0_#fff)_drop-shadow(0_-1px_0_#fff)_drop-shadow(0_0_4px_rgba(255,255,255,0.65))]"
              />
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-800/80 border border-emerald-600/40 text-emerald-200 font-bold uppercase tracking-wider whitespace-nowrap">
              <span className="sm:hidden">QC Kho</span>
              <span className="hidden sm:inline">Cổng Tiếp Nhận & QC Kho</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadReceivingTrips}
              disabled={loading}
              className="p-2 rounded-xl bg-emerald-800/60 hover:bg-emerald-700 text-emerald-100 transition cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => void logout().then(() => router.replace('/dang-nhap'))}
              className="p-2 rounded-xl bg-emerald-800/60 hover:bg-rose-700 text-emerald-100 transition cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-20 space-y-4">
        {/* Hub Selector Banner */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#10542C] text-white flex items-center justify-center shrink-0">
              <Warehouse className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Khu Vực Cổng Tiếp Nhận Chuỗi Lạnh
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Tiếp nhận, cân đối soát tải trọng và phân bổ buồng lạnh nhập kho
              </p>
            </div>
          </div>

          {/* Kho trực thuộc */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">Trạm trung chuyển:</span>
            {isHubLocked ? (
              <div className="w-full sm:w-auto px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-[#10542C] flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-[#10542C] shrink-0" />
                <span className="truncate">{assignedHub?.hubName}</span>
              </div>
            ) : (
              <select
                value={selectedHubId}
                onChange={(e) => setSelectedHubId(Number(e.target.value))}
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-emerald-600"
              >
                {hubs.map((hub) => (
                  <option key={hub.id} value={hub.id}>
                    {hub.hubName}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* TAB SWITCHER: TIẾP NHẬN KHO | KIỂM ĐỊNH QC | XUẤT KHO & LẤY HÀNG */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('RECEIVING')}
            className={`py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'RECEIVING'
                ? 'bg-[#10542C] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Truck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Tiếp Nhận</span>
            {incomingTrips.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'RECEIVING' ? 'bg-emerald-700 text-emerald-100' : 'bg-amber-100 text-amber-800'
              }`}>
                {incomingTrips.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('QC')}
            className={`py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'QC'
                ? 'bg-[#10542C] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Kiểm Định QC</span>
            {qcPendingLots.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'QC' ? 'bg-emerald-700 text-emerald-100' : 'bg-rose-100 text-rose-700'
              }`}>
                {qcPendingLots.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OUTBOUND')}
            className={`py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'OUTBOUND'
                ? 'bg-[#10542C] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Xuất Kho</span>
            {outboundTasks.totalPending > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'OUTBOUND' ? 'bg-emerald-700 text-emerald-100' : 'bg-blue-100 text-blue-800'
              }`}>
                {outboundTasks.totalPending}
              </span>
            )}
          </button>
        </div>

        {/* Thông báo Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold">×</button>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">×</button>
          </div>
        )}

        {/* 2. KHU VỰC XE ĐANG VỀ KHO / CHỜ TIẾP NHẬN */}
        {activeTab === 'RECEIVING' && (
          <>
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Xe tải đang về kho & Chờ kiểm đếm tại cổng ({incomingTrips.length} chuyến)</span>
            </h3>
          </div>

          {incomingTrips.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Clock className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500">Hiện không có xe nào đang trên đường về hoặc chờ tại cổng.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingTrips.map((trip) => {
                const isReturning = trip.status === 'RETURNING';
                const isArrived = trip.status === 'ARRIVED_AT_WAREHOUSE';
                const isOnTrip = trip.status === 'ON_TRIP';

                const totalActualWeight = trip.stops?.reduce((acc, s) => acc + (s.actualWeightKg || s.weightKg || 0), 0) || trip.totalWeightKg;

                return (
                  <div
                    key={trip.id}
                    className={`bg-white rounded-3xl p-5 border transition-all shadow-xs space-y-3.5 ${
                      isArrived
                        ? 'border-purple-300 ring-2 ring-purple-100'
                        : isReturning
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900 whitespace-nowrap">{trip.tripCode}</span>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase whitespace-nowrap ${
                            isArrived
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : isReturning
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}>
                            {isArrived ? 'ĐÃ ĐẾN CỔNG KHO' : isReturning ? 'ĐANG QUAY VỀ KHO' : 'ĐANG LẤY HÀNG'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Khởi hành: {trip.departureTime ? new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Biển số</span>
                        <strong className="font-mono text-slate-900 text-sm whitespace-nowrap">{trip.vehicle?.plateNumber}</strong>
                      </div>
                    </div>

                    {/* Tài xế & Tải trọng */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tài xế</span>
                        <strong className="text-slate-900 block truncate">{trip.driver?.fullName}</strong>
                        <span className="text-[11px] font-mono text-slate-600 block">{trip.driver?.phone}</span>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Khối lượng trên xe</span>
                        <strong className="font-mono text-emerald-800 text-sm block">{totalActualWeight} kg</strong>
                        <span className="text-[11px] text-slate-500 block">{trip.stops?.length || 0} điểm dừng thu gom</span>
                      </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-slate-100">
                      {isReturning && (
                        <button
                          type="button"
                          onClick={() => handleConfirmArrival(trip.id)}
                          disabled={submitting}
                          className="w-full sm:w-auto px-3.5 py-2.5 sm:py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
                        >
                          <Warehouse className="w-3.5 h-3.5 shrink-0" />
                          <span>Xe Đã Đến Cổng</span>
                        </button>
                      )}

                      {(isArrived || isReturning) && (
                        <button
                          type="button"
                          onClick={() => openReceivingModal(trip)}
                          disabled={submitting}
                          className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
                        >
                          <Scale className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                          <span>Kiểm Đếm & Nhập Kho</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. LỊCH SỬ CHUYẾN ĐÃ HOÀN TẤT NHẬP KHO */}
        {completedTrips.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Chuyến xe đã hoàn tất tiếp nhận nhập kho gần đây ({completedTrips.length})</span>
            </h3>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              {/* Mobile Card List */}
              <div className="sm:hidden divide-y divide-slate-100">
                {completedTrips.slice(0, 5).map((trip) => (
                  <div key={trip.id} className="p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-slate-900 whitespace-nowrap">{trip.tripCode}</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                        HOÀN TẤT
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>
                        <strong className="font-mono text-slate-900">{trip.vehicle?.plateNumber}</strong> · {trip.driver?.fullName}
                      </span>
                      <strong className="font-mono text-emerald-800">
                        {trip.actualTotalWeightKg || trip.totalWeightKg} kg
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{trip.stops?.length || trip.totalStops} rẫy thu gom</span>
                      <span>{trip.completionTime ? new Date(trip.completionTime).toLocaleString('vi-VN') : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Mã Chuyến</th>
                      <th className="p-3">Xe / Tài Xế</th>
                      <th className="p-3">Số Rẫy</th>
                      <th className="p-3">Tổng Nhập (kg)</th>
                      <th className="p-3">Thời Gian Hoàn Tất</th>
                      <th className="p-3">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completedTrips.slice(0, 5).map((trip) => (
                      <tr key={trip.id} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono font-bold text-slate-900">{trip.tripCode}</td>
                        <td className="p-3">
                          <strong className="font-mono text-slate-900">{trip.vehicle?.plateNumber}</strong>
                          <span className="text-[11px] text-slate-500 block">{trip.driver?.fullName}</span>
                        </td>
                        <td className="p-3 font-mono">{trip.stops?.length || trip.totalStops} rẫy</td>
                        <td className="p-3 font-mono font-bold text-emerald-800">
                          {trip.actualTotalWeightKg || trip.totalWeightKg} kg
                        </td>
                        <td className="p-3 text-[11px] text-slate-500">
                          {trip.completionTime ? new Date(trip.completionTime).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            HOÀN TẤT
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
          </>
        )}

        {/* TAB 2: KIỂM ĐỊNH CHẤT LƯỢNG QC */}
        {activeTab === 'QC' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Lô hàng chờ kiểm định QC ({qcPendingLots.length})</span>
                </h3>
              </div>

              {qcPendingLots.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs text-slate-500">Không có lô hàng nào đang chờ kiểm định QC tại kho.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {qcPendingLots.map((lot) => {
                    const weightKg = lot.inbound_net_weight_kg || lot.actual_harvest_weight_kg || lot.offered_weight_kg || 0;
                    return (
                      <div key={lot.id} className="bg-white rounded-3xl border border-amber-300 shadow-xs p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-xs text-emerald-800 block">{lot.contract_code}</span>
                            <h4 className="font-bold text-sm text-slate-900 truncate">{lot.product_name || 'Nông sản tươi'}</h4>
                            <p className="text-[11px] text-slate-500 truncate">Nhà vườn: {lot.farmer_name || '—'}</p>
                          </div>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap shrink-0">
                            CHỜ QC
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Khối lượng</span>
                            <strong className="font-mono text-emerald-800 text-sm">{weightKg} kg</strong>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Vị trí lưu kho</span>
                            <strong className="font-mono text-slate-800 text-xs block truncate">{lot.hub_rack_bin || 'Chưa phân kệ'}</strong>
                            <span className="text-[10px] text-slate-500 block truncate">{lot.hub_warehouse_zone || '—'}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openQcModal(lot)}
                          disabled={submitting}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                          <span>Thực Hiện Kiểm Định QC</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {qcCompletedLots.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Đã kiểm định QC gần đây ({qcCompletedLots.length})</span>
                </h3>

                <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                  {qcCompletedLots.slice(0, 8).map((lot) => {
                    const isFailed = lot.status === 'QC_FAILED' || lot.qc_status === 'FAILED';
                    return (
                      <div key={lot.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-900">{lot.contract_code}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              isFailed
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}>
                              {isFailed ? 'KHÔNG ĐẠT QC' : 'ĐẠT QC'}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-800 truncate">{lot.product_name || 'Nông sản'} · {lot.inbound_net_weight_kg || lot.actual_harvest_weight_kg || lot.offered_weight_kg} kg</p>
                          <p className="text-[11px] text-slate-500">
                            Kệ: <span className="font-mono font-semibold text-slate-700">{lot.hub_rack_bin || '—'}</span> · Brix: {lot.qc_brix ?? '—'} · Nitrate: {lot.qc_nitrate_ppm ?? '—'} ppm
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: XUẤT KHO & LẤY HÀNG TẠI KỆ (PA2 & PA3) */}
        {activeTab === 'OUTBOUND' && (
          <div className="space-y-5">
            {outboundTasks.pa2Tasks.length === 0 && outboundTasks.pa3Tasks.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs space-y-2">
                <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
                <strong className="text-sm text-slate-700 block">Chưa có lệnh xuất kho nào đang chờ</strong>
                <p className="text-xs text-slate-500">
                  Các lô hàng sau khi Đạt QC (PA3 tự lấy hoặc PA2 đã điều xe Outbound) sẽ xuất hiện tại đây để nhân viên đi lấy hàng tại kệ.
                </p>
              </div>
            ) : (
              <>
                {/* NHÓM PA3: BUYER TỰ TỚI KHO LẤY */}
                {outboundTasks.pa3Tasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>PA3 · Giao Tại Kho Cho Buyer Tự Lấy ({outboundTasks.pa3Tasks.length})</span>
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {outboundTasks.pa3Tasks.map((task: any) => (
                        <div key={task.id} className="bg-white rounded-2xl p-4 border-2 border-blue-200 shadow-xs space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-xs font-black text-[#10542C]">{task.contract_code}</span>
                              <h3 className="text-sm font-bold text-slate-900">{task.product_name}</h3>
                              <p className="text-[11px] text-slate-600">Buyer: <strong>{task.buyer_company || task.buyer_name}</strong></p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                              {task.pickingStage === 'PICKED_FROM_BIN'
                                ? 'Đã lấy ra cửa kho'
                                : task.pickingStage === 'PICKING_IN_PROGRESS'
                                ? 'Đang lấy tại kệ'
                                : 'Chờ soạn hàng'}
                            </span>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Vị trí kệ:</span>
                              <strong className="font-mono text-[#10542C]">{task.hub_rack_bin || 'R-01 / BIN A-01'}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Dải thùng & Tem:</span>
                              <strong className="font-mono text-blue-800">{task.crateRange} · {task.sealRange}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Sản lượng:</span>
                              <strong className="font-mono text-slate-800">{task.weightKg} kg ({task.packageCount} thùng)</strong>
                            </div>
                            {task.buyerTruckDispatched ? (
                              <div className="pt-1 text-emerald-800 font-semibold">
                                Xe thương lái đang đến: <span className="font-mono font-bold">{task.outbound_truck_plate}</span> · {task.outbound_driver_name}
                              </div>
                            ) : (
                              <div className="pt-1 text-amber-700 font-medium">
                                Chờ thương lái nhập biển số xe &amp; tài xế
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void openOutboundPickingModal(task)}
                            disabled={submitting}
                            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Boxes className="w-4 h-4" />
                            <span>
                              {task.pickingStage === 'PICKED_FROM_BIN'
                                ? 'Bàn Giao Tại Cổng Kho (Bước 3/3)'
                                : task.pickingStage === 'PICKING_IN_PROGRESS'
                                ? 'Tiếp Tục Lấy & Kiểm Tra Hàng'
                                : 'Bắt Đầu Đi Lấy Hàng Tại Kệ'}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NHÓM PA2: XE LẠNH HONA GIAO */}
                {outboundTasks.pa2Tasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#10542C] flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-emerald-600" />
                        <span>PA2 · Soạn Hàng Lên Xe Lạnh HoNa ({outboundTasks.pa2Tasks.length})</span>
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {outboundTasks.pa2Tasks.map((task: any) => (
                        <div key={task.id} className="bg-white rounded-2xl p-4 border-2 border-emerald-200 shadow-xs space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-xs font-black text-[#10542C]">{task.contract_code}</span>
                              <h3 className="text-sm font-bold text-slate-900">{task.product_name}</h3>
                              <p className="text-[11px] text-slate-600">Giao tới: <strong>{task.buyer_company || task.buyer_name}</strong></p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              {task.pickingStage === 'HANDED_OVER'
                                ? 'Đã bàn giao xe'
                                : task.pickingStage === 'PICKED_FROM_BIN'
                                ? 'Đã lấy khỏi kệ'
                                : task.pickingStage === 'PICKING_IN_PROGRESS'
                                ? 'Đang lấy tại kệ'
                                : 'Chờ lấy hàng'}
                            </span>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Vị trí kệ:</span>
                              <strong className="font-mono text-[#10542C]">{task.hub_rack_bin || 'R-01 / BIN A-01'}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Dải thùng & Tem:</span>
                              <strong className="font-mono text-emerald-800">{task.crateRange} · {task.sealRange}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Xe Outbound:</span>
                              <strong className="font-mono text-slate-800">
                                {task.assigned_truck_plate
                                  ? `${task.assigned_truck_plate} (${task.assigned_driver_name || 'Tài xế'})`
                                  : 'Chờ Admin gán xe Outbound'}
                              </strong>
                            </div>
                          </div>
                          {task.pickingStage === 'HANDED_OVER' ? (
                            <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold text-center">
                              ✓ Đã bàn giao lên xe lạnh Outbound
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void openOutboundPickingModal(task)}
                              disabled={submitting}
                              className="w-full py-2.5 px-4 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Boxes className="w-4 h-4" />
                              <span>
                                {task.pickingStage === 'PICKED_FROM_BIN'
                                  ? 'Bàn Giao Lên Xe Lạnh (Bước 3/3)'
                                  : task.pickingStage === 'PICKING_IN_PROGRESS'
                                  ? 'Tiếp Tục Lấy & Kiểm Tra Hàng'
                                  : 'Bắt Đầu Đi Lấy Hàng Tại Kệ'}
                              </span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 4. MODAL KIỂM ĐẾM & NHẬP KHO CHUỖI LẠNH (GIAI ĐOẠN 7.2) */}
      {activeReceivingTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-start gap-2 text-[#10542C] min-w-0">
                <Scale className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                    Đối Soát Cân & Phân Bổ Kho Mát
                  </h3>
                  <span className="font-mono text-xs font-bold text-emerald-700">{activeReceivingTrip.tripCode}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveReceivingTrip(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-lg font-bold flex items-center justify-center shrink-0 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Thông tin chuyến & Xe */}
            <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Xe tải</span>
                <strong className="font-mono text-slate-900 text-[11px] sm:text-xs whitespace-nowrap">{activeReceivingTrip.vehicle?.plateNumber}</strong>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tài xế</span>
                <strong className="text-slate-900 text-[11px] sm:text-xs block truncate">{activeReceivingTrip.driver?.fullName}</strong>
              </div>
              <div className="min-w-0 text-right sm:text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">KL kế hoạch</span>
                <strong className="font-mono text-blue-800 text-[11px] sm:text-xs whitespace-nowrap">{activeReceivingTrip.totalWeightKg} kg</strong>
              </div>
            </div>

            {/* Bảng đối soát từng hợp đồng */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Danh sách lô hàng từ các rẫy trong chuyến:
              </span>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                {/* Mobile Card List */}
                <div className="sm:hidden divide-y divide-slate-100 bg-white">
                  {activeReceivingTrip.stops?.map((stop) => {
                    const qc = lotQcMap[stop.contractId] || { qualified: String(stop.actualWeightKg || stop.weightKg), rejected: '0', notes: '' };
                    return (
                      <div key={stop.id} className="p-3 space-y-2.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <strong className="text-slate-900 block truncate">{stop.farmerName}</strong>
                            <span className="text-[10px] text-slate-500 font-mono">HĐ-{stop.contractId}</span>
                          </div>
                          <div className="text-right text-[11px] shrink-0">
                            <span className="text-slate-500 block">KH: <strong className="font-mono text-slate-700">{stop.weightKg} kg</strong></span>
                            <span className="text-slate-500 block">Cân rẫy: <strong className="font-mono text-emerald-700">{stop.actualWeightKg || stop.weightKg} kg</strong></span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1">KL Đạt Nhập (kg)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={qc.qualified}
                              onChange={(e) => {
                                setLotQcMap(prev => ({
                                  ...prev,
                                  [stop.contractId]: { ...prev[stop.contractId], qualified: e.target.value }
                                }));
                              }}
                              className="w-full px-2.5 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-emerald-600 font-bold text-emerald-900"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1">Loại / Hủy (kg)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={qc.rejected}
                              onChange={(e) => {
                                setLotQcMap(prev => ({
                                  ...prev,
                                  [stop.contractId]: { ...prev[stop.contractId], rejected: e.target.value }
                                }));
                              }}
                              className="w-full px-2.5 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-emerald-600 text-rose-700 font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <table className="hidden sm:table w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold text-[11px]">
                    <tr>
                      <th className="p-2.5">Rẫy / Nông Dân</th>
                      <th className="p-2.5">KH Bốc</th>
                      <th className="p-2.5">Thực Tế Cân Rẫy</th>
                      <th className="p-2.5">KL Đạt Nhập (kg)</th>
                      <th className="p-2.5">Loại (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeReceivingTrip.stops?.map((stop) => {
                      const qc = lotQcMap[stop.contractId] || { qualified: String(stop.actualWeightKg || stop.weightKg), rejected: '0', notes: '' };
                      return (
                        <tr key={stop.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5">
                            <strong className="text-slate-900 block">{stop.farmerName}</strong>
                            <span className="text-[10px] text-slate-500 font-mono">HĐ-{stop.contractId}</span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-600">{stop.weightKg} kg</td>
                          <td className="p-2.5 font-mono font-bold text-emerald-800">
                            {stop.actualWeightKg || stop.weightKg} kg
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              step="0.1"
                              value={qc.qualified}
                              onChange={(e) => {
                                setLotQcMap(prev => ({
                                  ...prev,
                                  [stop.contractId]: { ...prev[stop.contractId], qualified: e.target.value }
                                }));
                              }}
                              className="w-20 px-2 py-1 rounded-lg border border-slate-300 font-mono text-xs focus:outline-emerald-600 font-bold text-emerald-900"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              step="0.1"
                              value={qc.rejected}
                              onChange={(e) => {
                                setLotQcMap(prev => ({
                                  ...prev,
                                  [stop.contractId]: { ...prev[stop.contractId], rejected: e.target.value }
                                }));
                              }}
                              className="w-16 px-2 py-1 rounded-lg border border-slate-300 font-mono text-xs focus:outline-emerald-600 text-rose-700"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Phân bổ buồng lạnh và ô kệ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Buồng lạnh tiếp nhận *</label>
                <select
                  value={selectedColdZone}
                  onChange={(e) => {
                    const nextZoneName = e.target.value;
                    setSelectedColdZone(nextZoneName);
                    const matchedZone = warehouseZones.find(z => z.zoneName === nextZoneName);
                    const firstBin = matchedZone?.bins?.[0];
                    if (firstBin) {
                      setSelectedBin(`${firstBin.rackCode} / ${firstBin.binCode}`);
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-emerald-600 bg-white"
                >
                  {warehouseZones.length > 0 ? (
                    warehouseZones.map((zone) => (
                      <option key={zone.id} value={zone.zoneName}>
                        {zone.zoneName} ({zone.tempMin ?? 2}–{zone.tempMax ?? 8}°C)
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Zone A — Kho Lạnh Rau Ăn Lá & Thảo Mộc">Zone A — Kho Lạnh Rau Ăn Lá & Thảo Mộc</option>
                      <option value="Zone B — Kho Mát Củ Quả Nhiệt Đới">Zone B — Kho Mát Củ Quả Nhiệt Đới</option>
                      <option value="Zone C — Kho Mát Trái Cây & Nông Sản Cao Cấp">Zone C — Kho Mát Trái Cây & Nông Sản Cao Cấp</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mã kệ / Ô lưu trữ (Rack/Bin) *</label>
                {availableBins.length > 0 ? (
                  <select
                    value={selectedBin}
                    onChange={(e) => setSelectedBin(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-emerald-600 bg-white"
                  >
                    {availableBins.map((bin) => {
                      const code = `${bin.rackCode} / ${bin.binCode}`;
                      return (
                        <option key={bin.id} value={code}>
                          {code} (Trống {bin.availableKg} kg)
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <select
                    value={selectedBin}
                    onChange={(e) => setSelectedBin(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-emerald-600 bg-white"
                  >
                    <option value="R-01 / BIN A-01">R-01 / BIN A-01</option>
                    <option value="R-01 / BIN A-02">R-01 / BIN A-02</option>
                    <option value="R-02 / BIN B-01">R-02 / BIN B-01</option>
                    <option value="R-03 / BIN C-01">R-03 / BIN C-01</option>
                  </select>
                )}
              </div>
            </div>

            {/* Tổng cân tại trạm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tổng khối lượng cân nhập kho (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={actualTotalWeight}
                  onChange={(e) => setActualTotalWeight(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold text-emerald-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tổng số kiện / sọt thực tế *</label>
                <input
                  type="number"
                  value={actualTotalPackages}
                  onChange={(e) => setActualTotalPackages(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:outline-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">Ghi chú đối soát & QC nhập kho</label>
              <textarea
                rows={2}
                value={receivingNotes}
                onChange={(e) => setReceivingNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-emerald-600"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveReceivingTrip(null)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCompleteReceiving}
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-3 sm:py-2 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Xác Nhận Hoàn Tất Nhập Kho</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 5. MODAL KIỂM ĐỊNH CHẤT LƯỢNG QC (MOBILE-FIRST) */}
      {activeQcContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-start gap-2 text-[#10542C] min-w-0">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                    Kiểm Định Chất Lượng QC
                  </h3>
                  <span className="font-mono text-xs font-bold text-emerald-700">
                    {activeQcContract.contract_code} · {activeQcContract.product_name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveQcContract(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-lg font-bold flex items-center justify-center shrink-0 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Kết luận QC */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setQcDecision('PASS')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  qcDecision === 'PASS'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Đạt Chuẩn (PASS)</span>
              </button>
              <button
                type="button"
                onClick={() => setQcDecision('FAIL')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  qcDecision === 'FAIL'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Không Đạt (FAIL)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Độ ngọt Brix (°Bx)</label>
                <input
                  type="number"
                  step="0.1"
                  value={qcBrix}
                  onChange={(e) => setQcBrix(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nitrate (ppm)</label>
                <input
                  type="number"
                  value={qcNitrate}
                  onChange={(e) => setQcNitrate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {qcDecision === 'PASS' ? 'KL đạt nhập (kg) *' : 'KL không đạt (kg) *'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={qcWeight}
                  onChange={(e) => setQcWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold text-emerald-900 focus:outline-emerald-600"
                />
              </div>
              {qcDecision === 'PASS' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lưu kho tối đa (ngày)</label>
                  <input
                    type="number"
                    min="1"
                    value={qcMaxDays}
                    onChange={(e) => setQcMaxDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm focus:outline-emerald-600"
                  />
                </div>
              )}
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={qcPesticideSafe}
                onChange={(e) => setQcPesticideSafe(e.target.checked)}
                className="w-4 h-4 accent-emerald-700 rounded"
              />
              <span className="font-semibold text-slate-800">Không phát hiện tồn dư thuốc BVTV vượt ngưỡng</span>
            </label>

            {qcDecision === 'FAIL' && (
              <div className="text-xs">
                <label className="font-bold text-rose-700 block mb-1">Lý do không đạt QC *</label>
                <input
                  type="text"
                  value={qcRejectReason}
                  onChange={(e) => setQcRejectReason(e.target.value)}
                  placeholder="Ví dụ: Dập nát > 15%, vượt ngưỡng Nitrate..."
                  className="w-full px-3 py-2 rounded-xl border border-rose-300 text-xs focus:outline-rose-600"
                />
              </div>
            )}

            <div className="text-xs">
              <label className="font-bold text-slate-700 block mb-1">Ghi chú kiểm định QC</label>
              <textarea
                rows={2}
                value={qcNotes}
                onChange={(e) => setQcNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-emerald-600"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveQcContract(null)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitQc}
                disabled={submitting}
                className={`w-full sm:w-auto px-5 py-3 sm:py-2 rounded-xl text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  qcDecision === 'PASS'
                    ? 'bg-[#10542C] hover:bg-emerald-900'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                    <span>Đang lưu kết quả QC...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{qcDecision === 'PASS' ? 'Xác Nhận ĐẠT QC' : 'Xác Nhận KHÔNG ĐẠT QC'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL QUY TRÌNH XUẤT KHO & LẤY HÀNG 3 BƯỚC CHO NHÂN VIÊN KHO */}
      {activeOutboundTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <span className="font-mono text-xs font-bold text-[#10542C] block">
                  {activeOutboundTask.contract_code} · {activeOutboundTask.isSelfPickup ? 'PA3 Tự Lấy Tại Kho' : 'PA2 Xe Lạnh HoNa'}
                </span>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Quy Trình Xuất Kho & Lấy Hàng ({activeOutboundTask.product_name})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveOutboundTask(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-lg font-bold flex items-center justify-center shrink-0 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Thanh tiến trình 3 bước */}
            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
              <div className={`p-2 rounded-xl text-center border ${outboundStep === 1 ? 'bg-emerald-600 text-white border-emerald-700' : outboundStep > 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                1. Lấy Tại Kệ
              </div>
              <div className={`p-2 rounded-xl text-center border ${outboundStep === 2 ? 'bg-emerald-600 text-white border-emerald-700' : outboundStep > 2 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                2. Cân & Nhiệt Độ
              </div>
              <div className={`p-2 rounded-xl text-center border ${outboundStep === 3 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                3. Bàn Giao Xuất
              </div>
            </div>

            {outboundStep === 1 && (() => {
              const totalPkgs = Math.max(1, Number(activeOutboundTask.packageCount || 7));
              const allCratesScanned = scannedCrates.length >= totalPkgs;
              return (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Vùng lạnh &amp; Ô kệ:</span>
                    <strong className="text-[#10542C] font-mono">{activeOutboundTask.hub_warehouse_zone} · {activeOutboundTask.hub_rack_bin}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Dải thùng cần lấy:</span>
                    <strong className="text-blue-800 font-mono">{activeOutboundTask.crateRange} ({totalPkgs} thùng)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Mã tem niêm phong:</span>
                    <strong className="text-slate-900 font-mono">{activeOutboundTask.sealRange}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Khách nhận (Buyer):</span>
                    <strong className="text-slate-900">{activeOutboundTask.buyer_company || activeOutboundTask.buyer_name}</strong>
                  </div>
                </div>

                {/* Quét mã QR / Barcode từng thùng hàng */}
                <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-[#10542C]" />
                      <span>Quét Từng Thùng Hàng ({scannedCrates.length}/{totalPkgs} thùng)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const items = Array.from({ length: totalPkgs }, (_, idx) => ({
                          contractCode: activeOutboundTask.contract_code,
                          productName: activeOutboundTask.product_name || 'Nông sản VietGAP',
                          buyerName: activeOutboundTask.buyer_company || activeOutboundTask.buyer_name || 'Khách sỉ HoNa',
                          zoneName: activeOutboundTask.hub_warehouse_zone,
                          binCode: activeOutboundTask.hub_rack_bin || 'BIN A-01',
                          crateIndex: idx + 1,
                          totalCrates: totalPkgs,
                          weightKg: Number(activeOutboundTask.weightKg || 0),
                        }));
                        printCrateLabels(items, `Tem QR & Barcode · ${activeOutboundTask.contract_code}`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3" />
                      <span>In lại tem</span>
                    </button>
                  </div>

                  {/* Thanh tiến độ quét */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all"
                      style={{ width: `${Math.min(100, Math.round((scannedCrates.length / totalPkgs) * 100))}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCrateScanError(null);
                        setLastScannedLabel(null);
                        setIsCameraScannerOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Quét Camera</span>
                    </button>
                    <input
                      type="text"
                      value={crateScanInput}
                      onChange={(e) => setCrateScanInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleScanCrateInput(crateScanInput);
                        }
                      }}
                      placeholder={`Hoặc nhập mã (VD: ${buildCrateBarcodeCode(activeOutboundTask.contract_code, 1)})`}
                      className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:outline-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleScanCrateInput(crateScanInput)}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shrink-0"
                    >
                      Nhập
                    </button>
                  </div>

                  {crateScanError && (
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                      {crateScanError}
                    </div>
                  )}

                  {/* Lưới từng thùng: bấm trực tiếp để xác nhận khi không có máy quét */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {Array.from({ length: totalPkgs }, (_, idx) => {
                      const crateNo = idx + 1;
                      const barcode = buildCrateBarcodeCode(activeOutboundTask.contract_code, crateNo);
                      const isDone = scannedCrates.includes(crateNo);
                      return (
                        <button
                          type="button"
                          key={barcode}
                          onClick={() => {
                            setCrateScanError(null);
                            setScannedCrates((prev) =>
                              prev.includes(crateNo)
                                ? prev.filter((x) => x !== crateNo)
                                : [...prev, crateNo].sort((a, b) => a - b)
                            );
                          }}
                          className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                            isDone
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span>Thùng #{crateNo}</span>
                            <span>{isDone ? '✓' : '○'}</span>
                          </div>
                          <div className={`font-mono text-[10px] ${isDone ? 'text-emerald-100' : 'text-slate-500'}`}>
                            {barcode}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!allCratesScanned}
                  onClick={() => {
                    setPickedPackages(String(scannedCrates.length));
                    setOutboundNotes(
                      `Đã quét đủ ${scannedCrates.length}/${totalPkgs} thùng (${scannedCrates
                        .map((n) => buildCrateBarcodeCode(activeOutboundTask.contract_code, n))
                        .join(', ')})`
                    );
                    setOutboundStep(2);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#10542C] hover:bg-emerald-900 disabled:opacity-50 text-white font-bold text-xs cursor-pointer"
                >
                  {allCratesScanned
                    ? `Đã Quét Đủ ${totalPkgs}/${totalPkgs} Thùng · Sang Bước 2 →`
                    : `Cần Quét Đủ ${totalPkgs} Thùng (${scannedCrates.length}/${totalPkgs})`}
                </button>
              </div>
              );
            })()}

            {outboundStep === 2 && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Số thùng thực lấy *</label>
                    <input
                      type="number"
                      value={pickedPackages}
                      onChange={(e) => setPickedPackages(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Khối lượng xuất (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={pickedWeightKg}
                      onChange={(e) => setPickedWeightKg(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nhiệt độ xuất (°C) *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={outboundTemp}
                      onChange={(e) => setOutboundTemp(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-blue-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ghi chú kiểm tra xuất kho</label>
                  <textarea
                    rows={2}
                    value={outboundNotes}
                    onChange={(e) => setOutboundNotes(e.target.value)}
                    placeholder="Ví dụ: Thùng xốp khô ráo, tem niêm phong nguyên vẹn..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOutboundStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs cursor-pointer"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleConfirmPickedStep()}
                    className="flex-1 py-2.5 rounded-xl bg-[#10542C] hover:bg-emerald-900 disabled:opacity-60 text-white font-bold text-xs cursor-pointer"
                  >
                    {submitting ? 'Đang lưu...' : 'Xác Nhận Đã Lấy Hàng & Sang Bước 3'}
                  </button>
                </div>
              </div>
            )}

            {outboundStep === 3 && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                  {activeOutboundTask.isSelfPickup
                    ? 'Đơn PA3: Bàn giao trực tiếp cho người đại diện Buyer đến nhận tại cổng kho HoNa.'
                    : `Đơn PA2: Bàn giao hàng lên xe lạnh Outbound ${activeOutboundTask.assigned_truck_plate || ''}.`}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Người nhận bàn giao *</label>
                    <input
                      type="text"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">SĐT liên hệ</label>
                    <input
                      type="text"
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOutboundStep(2)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs cursor-pointer"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleCompleteHandoverStep()}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-xs cursor-pointer"
                  >
                    {submitting
                      ? 'Đang hoàn tất...'
                      : activeOutboundTask.isSelfPickup
                      ? 'Hoàn Tất Bàn Giao Cho Buyer (DELIVERED)'
                      : 'Hoàn Tất Bàn Giao Xe Lạnh Outbound'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <CameraQrScannerModal
        isOpen={isCameraScannerOpen && Boolean(activeOutboundTask)}
        title={`Quét Camera · ${activeOutboundTask?.contract_code || ''}`}
        scannedCount={scannedCrates.length}
        totalCount={Math.max(1, Number(activeOutboundTask?.packageCount || 7))}
        lastError={crateScanError}
        lastSuccessCode={lastScannedLabel}
        onScan={handleScanCrateInput}
        onClose={() => setIsCameraScannerOpen(false)}
      />
    </main>
  );
}
