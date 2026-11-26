'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Truck,
  Route,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  Phone,
  User,
  Thermometer,
  Layers,
  ChevronDown,
  Navigation,
  Sparkles,
  ExternalLink,
  Boxes,
  Compass,
  ArrowUp,
  ArrowDown,
  Trash2,
  PlusCircle,
  Warehouse,
  History,
  Activity,
  Calendar,
  AlertCircle,
  Eye,
  X,
  XCircle,
  RefreshCw,
  Award,
} from 'lucide-react';
import {
  fleetDispatchApi,
  WarehouseHubDto,
  FleetVehicleDto,
  FleetDriverDto,
  WaitingLotDto,
  PickupTripDto,
  DispatchOptimizationResultDto,
  ProposedTripDto,
  UnassignedContractDto,
} from '@/services/fleetDispatchApi';
import { b2bWebSocket } from '@/services/websocketService';
import { subscribeB2bSyncEvents } from '@/services/b2bSyncService';
import ImageUploadField from '@/components/ImageUploadField';
import OutboundFleetMap from '@/components/admin/OutboundFleetMap';
import { api } from '@/services/auth';

// =========================================================================
// 1. MẠNG LƯỚI 5 HUB TRUNG CHUYỂN VẬN HÀNH THỰC TẾ
// =========================================================================
const DEFAULT_OFFICIAL_HUBS: WarehouseHubDto[] = [
  {
    id: 1,
    hubCode: 'HUB-CU-CHI',
    hubName: 'Tổng Kho Chuỗi Lạnh Củ Chi (Hub TP.HCM)',
    region: 'Đông Nam Bộ & TP.HCM',
    address: 'Tỉnh Lộ 8, Xã Tân An Hội, Huyện Củ Chi, TP. Hồ Chí Minh',
    latitude: 10.9732,
    longitude: 106.4955,
    hotline: '0901.888.111',
    managerName: 'Trần Anh Tuấn',
    active: true,
  },
  {
    id: 2,
    hubCode: 'HUB-DUC-TRONG',
    hubName: 'Trạm Trung Chuyển Đức Trọng (Hub Lâm Đồng)',
    region: 'Tây Nguyên & Lâm Đồng',
    address: 'QL20, TT. Liên Nghĩa, Huyện Đức Trọng, Lâm Đồng',
    latitude: 11.7345,
    longitude: 108.3752,
    hotline: '0901.888.222',
    managerName: 'Nguyễn Thanh Tùng',
    active: true,
  },
  {
    id: 3,
    hubCode: 'HUB-CAI-BE',
    hubName: 'Trạm Trung Chuyển Cái Bè (Hub ĐBSCL)',
    region: 'Tây Nam Bộ / ĐBSCL',
    address: 'QL1A, Xã An Thái Trung, Huyện Cái Bè, Tiền Giang',
    latitude: 10.3621,
    longitude: 105.9523,
    hotline: '0901.888.333',
    managerName: 'Lê Hữu Nghĩa',
    active: true,
  },
  {
    id: 4,
    hubCode: 'HUB-BUON-HO',
    hubName: 'Kho Nông Sản Buôn Hồ (Hub Đắk Lắk)',
    region: 'Tây Nguyên & Đắk Lắk',
    address: 'QL14, Phường Đoàn Kết, Thị xã Buôn Hồ, Đắk Lắk',
    latitude: 12.9125,
    longitude: 108.2612,
    hotline: '0901.888.444',
    managerName: 'Phạm Minh Đức',
    active: true,
  },
  {
    id: 5,
    hubCode: 'HUB-HA-NOI',
    hubName: 'Kho Logistics Nông Sản Miền Bắc (Hub Hà Nội)',
    region: 'Miền Bắc & Hà Nội',
    address: 'KCN Đài Tư, Phường Sài Đồng, Quận Long Biên, Hà Nội',
    latitude: 21.0315,
    longitude: 105.9184,
    hotline: '0901.888.555',
    managerName: 'Hoàng Đình Nam',
    active: true,
  },
];

// Hàm làm sạch địa chỉ rẫy đón xe
const parsePickupDetails = (rawStr: unknown) => {
  const text = String(rawStr || '').trim();
  if (!text || text === '—') {
    return {
      farmLocation: 'Vườn Nông Dân VietGAP, Xã Xuân Thọ, Đà Lạt',
      contactPhone: '0912.345.678',
    };
  }

  let contactPhone = '';
  const phoneMatch = text.match(/SĐT\s*đón\s*xe:\s*([0-9\.\-\s]+)/i);
  if (phoneMatch) {
    contactPhone = phoneMatch[1].trim();
  }

  const farmLocation = text
    .replace(/\s*\(\s*SĐT\s*đón\s*xe:[^)]*\)/gi, '')
    .trim();

  return {
    farmLocation: farmLocation || 'Vườn Nông Dân VietGAP, Xã Xuân Thọ, Đà Lạt',
    contactPhone: contactPhone || '0912.345.678',
  };
};

// =========================================================================
// 2. MAIN COMPONENT: ADMIN INBOUND DISPATCH CONSOLE
// =========================================================================
function AdminInboundDispatchContent() {
  const pathname = usePathname();
  const basePath = pathname?.startsWith('/manager') ? '/manager' : '/admin';
  const searchParams = useSearchParams();
  const highlightCode = searchParams.get('contractCode') || '';

  // Tab chính
  const [activeTab, setActiveTab] = useState<'WAITING' | 'TRIPS' | 'FLEET' | 'DRIVERS'>('WAITING');

  // Hubs & Hub được chọn
  const [hubs, setHubs] = useState<WarehouseHubDto[]>(DEFAULT_OFFICIAL_HUBS);
  const [selectedHubId, setSelectedHubId] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hona_admin_selected_hub_id');
      if (saved) return Number(saved);
    }
    return 2;
  });

  useEffect(() => {
    const onHubChanged = (e: Event) => {
      const custom = e as CustomEvent<number>;
      if (custom.detail) setSelectedHubId(Number(custom.detail));
    };
    window.addEventListener('hona-admin-hub-changed', onHubChanged);
    return () => window.removeEventListener('hona-admin-hub-changed', onHubChanged);
  }, []);

  // Dữ liệu thời gian thực
  const [waitingLots, setWaitingLots] = useState<WaitingLotDto[]>([]);
  const [vehicles, setVehicles] = useState<FleetVehicleDto[]>([]);
  const [drivers, setDrivers] = useState<FleetDriverDto[]>([]);
  const [trips, setTrips] = useState<PickupTripDto[]>([]);
  const [coldAssets, setColdAssets] = useState<any[]>([]);
  const [focusedTripId, setFocusedTripId] = useState<number | null>(null);

  // Tìm kiếm & Lọc (không dùng highlightCode làm bộ lọc để vẫn hiện đủ các đơn chờ gom cùng tuyến)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedContractIds, setSelectedContractIds] = useState<number[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Tự Động Điều Phối (Optimization Results)
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<DispatchOptimizationResultDto | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Modal Hủy Chuyến (Cancel Trip)
  const [cancellingTrip, setCancellingTrip] = useState<PickupTripDto | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Xe tải gặp sự cố kỹ thuật đột xuất');

  // Cấu hình phân công trực tiếp từng hợp đồng (Single manual dispatch)
  const [assignmentMap, setAssignmentMap] = useState<
    Record<string, { vehicleId: number; driverId: number }>
  >({});

  // Hub hiện tại
  const currentHub = useMemo(() => {
    return hubs.find((h) => h.id === selectedHubId) || hubs[0] || DEFAULT_OFFICIAL_HUBS[0];
  }, [hubs, selectedHubId]);

  // Thông báo toast
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Nạp toàn bộ dữ liệu của Hub
  const loadHubData = useCallback(async (hubId: number) => {
    setIsLoading(true);
    try {
      // 1. Tải danh sách Hubs
      try {
        const hubList = await fleetDispatchApi.getHubs();
        if (Array.isArray(hubList) && hubList.length > 0) {
          setHubs(hubList);
        }
      } catch (e) {
        console.warn('Fallback to local hubs list', e);
      }

      // 2. Tải danh sách xe và tài xế của Hub
      const [vList, dList, wLots, tList, assets] = await Promise.all([
        fleetDispatchApi.getVehicles(hubId).catch(() => []),
        fleetDispatchApi.getDrivers(hubId).catch(() => []),
        fleetDispatchApi.getWaitingLots(hubId).catch(() => []),
        fleetDispatchApi.getTrips(hubId).catch(() => []),
        api<any[]>('admin/cold-assets').catch(() => []),
      ]);

      setVehicles(vList);
      setDrivers(dList);
      setWaitingLots(wLots);
      setTrips(tList);
      setColdAssets(Array.isArray(assets) ? assets : []);
    } catch (err: any) {
      console.error('Lỗi nạp dữ liệu điều phối:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectedHubIdRef = React.useRef(selectedHubId);
  useEffect(() => {
    selectedHubIdRef.current = selectedHubId;
  }, [selectedHubId]);

  // Lắng nghe thay đổi Hub
  useEffect(() => {
    void loadHubData(selectedHubId);
  }, [selectedHubId, loadHubData]);

  // Đăng ký WebSocket thời gian thực (Contracts & Dispatch events) và kênh Broadcast nội bộ
  useEffect(() => {
    const unsubContracts = b2bWebSocket.subscribeContracts(() => {
      void loadHubData(selectedHubIdRef.current);
    });

    const unsubDispatch = b2bWebSocket.subscribeDispatch((payload) => {
      if (payload?.trip && typeof payload.trip === 'object' && payload.trip.id) {
        setTrips((prevTrips) => {
          const tripIdx = prevTrips.findIndex((t) => t.id === payload.trip.id);
          if (tripIdx !== -1) {
            const nextTrips = [...prevTrips];
            nextTrips[tripIdx] = { ...nextTrips[tripIdx], ...payload.trip };
            return nextTrips;
          }
          return prevTrips;
        });
      }
      void loadHubData(selectedHubIdRef.current);
    });

    const unsubSync = subscribeB2bSyncEvents(() => {
      void loadHubData(selectedHubIdRef.current);
    });

    return () => {
      unsubContracts();
      unsubDispatch();
      unsubSync();
    };
  }, [loadHubData]);

  // Highlight hợp đồng nếu truyền từ Admin Contracts
  useEffect(() => {
    if (highlightCode && waitingLots.length > 0) {
      const cleanH = highlightCode.replace(/^#/, '').trim().toUpperCase();
      const match = waitingLots.find((c) => c.contract_code?.replace(/^#/, '').trim().toUpperCase() === cleanH);
      if (match) {
        setSelectedContractIds((prev) => Array.from(new Set([...prev, Number(match.id)])));
      }
    }
  }, [highlightCode, waitingLots]);

  // Khởi tạo gán xe mặc định cho từng hợp đồng nếu chưa có
  useEffect(() => {
    if (vehicles.length > 0 && drivers.length > 0 && waitingLots.length > 0) {
      const nextMap = { ...assignmentMap };
      let changed = false;
      const defaultVehicle = vehicles.find((v) => v.status === 'AVAILABLE') || vehicles[0];
      const truckDrivers = drivers.filter((d) => !['QC_TECH', 'WH_STAFF', 'DISPATCH', 'ACCOUNTANT'].includes(String(d.licenseClass || '').toUpperCase()));
      const defaultDriver = truckDrivers.find((d) => d.status === 'AVAILABLE') || truckDrivers[0];

      for (const lot of waitingLots) {
        const key = String(lot.id);
        if (!nextMap[key]) {
          nextMap[key] = {
            vehicleId: defaultVehicle.id,
            driverId: defaultDriver.id,
          };
          changed = true;
        }
      }
      if (changed) setAssignmentMap(nextMap);
    }
  }, [vehicles, drivers, waitingLots]);

  // Lọc danh sách lô hàng chờ theo từ khóa
  const filteredWaitingLots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^#/, '');
    if (!q) return waitingLots;
    return waitingLots.filter((lot) => {
      const code = String(lot.contract_code || '').toLowerCase().replace(/^#/, '');
      const product = String(lot.product_name || '').toLowerCase();
      const farmer = String(lot.farmer_name || '').toLowerCase();
      const address = String(lot.farm_pickup_address || '').toLowerCase();
      return code.includes(q) || product.includes(q) || farmer.includes(q) || address.includes(q);
    });
  }, [waitingLots, searchQuery]);

  // Tick chọn hợp đồng
  const toggleSelectLot = (id: number) => {
    setSelectedContractIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllWaiting = () => {
    if (selectedContractIds.length === filteredWaitingLots.length) {
      setSelectedContractIds([]);
    } else {
      setSelectedContractIds(filteredWaitingLots.map((c) => Number(c.id)));
    }
  };

  // Tính tổng khối lượng & thể tích các lô được tick chọn
  const selectedLotsMetrics = useMemo(() => {
    const selected = filteredWaitingLots.filter((l) => selectedContractIds.includes(Number(l.id)));
    const totalWeight = selected.reduce((sum, l) => sum + Number(l.computedWeightKg || 0), 0);
    const totalVolume = selected.reduce((sum, l) => sum + Number(l.computedVolumeM3 || 0), 0);
    const totalPackages = selected.reduce((sum, l) => sum + Number(l.computedPackageCount || 0), 0);
    return { count: selected.length, totalWeight, totalVolume, totalPackages };
  }, [filteredWaitingLots, selectedContractIds]);

  // 1. TỰ ĐỘNG ĐIỀU PHỐI (Gọi Backend Auto-Optimize)
  const handleTriggerAutoOptimize = async () => {
    if (waitingLots.length === 0) {
      alert('Hiện không có lô hàng nào chờ điều phối tại kho này!');
      return;
    }
    setIsOptimizing(true);
    try {
      const ids = selectedContractIds.length > 0 ? selectedContractIds : undefined;
      const res = await fleetDispatchApi.autoOptimize(selectedHubId, ids);
      setOptimizationResult(res);
      setShowOptimizeModal(true);
      showToast('Đã tính toán phương án điều phối tối ưu đa điểm!');
    } catch (err: any) {
      alert(`Lỗi phân tích tối ưu: ${err.message || 'Không thể thực thi'}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  // 2. XÁC NHẬN PHÂN CÔNG CHUYẾN ĐỀ XUẤT (Confirm Trip)
  const handleConfirmProposedTrip = async (trip: ProposedTripDto) => {
    setIsSubmitting(true);
    try {
      const stops = trip.stops.map((s, idx) => ({
        contractId: s.contractId,
        stopOrder: idx + 1,
      }));

      await fleetDispatchApi.confirmTrip(selectedHubId, trip.vehicleId, trip.driverId, stops);

      showToast(`Đã xác nhận phân công chuyến xe ${trip.plateNumber} gom ${stops.length} rẫy thành công!`);

      // Cập nhật lại kết quả đề xuất trong modal
      if (optimizationResult) {
        const remainingTrips = optimizationResult.proposedTrips.filter((t) => t.tempTripId !== trip.tempTripId);
        setOptimizationResult({
          ...optimizationResult,
          proposedTrips: remainingTrips,
        });
        if (remainingTrips.length === 0) {
          setShowOptimizeModal(false);
        }
      }

      setSelectedContractIds([]);
      await loadHubData(selectedHubId);
    } catch (err: any) {
      alert(`Lỗi xác nhận chuyến: ${err.message || 'Không thể lưu vào cơ sở dữ liệu'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. ĐIỀU PHỐI ĐƠN LẺ TRỰC TIẾP
  const handleSingleDispatch = async (lot: WaitingLotDto) => {
    const assignment = assignmentMap[String(lot.id)];
    if (!assignment) return;

    setIsSubmitting(true);
    try {
      const stops = [{ contractId: lot.id, stopOrder: 1 }];
      await fleetDispatchApi.confirmTrip(selectedHubId, assignment.vehicleId, assignment.driverId, stops);

      const vehicle = vehicles.find((v) => v.id === assignment.vehicleId);
      showToast(`Đã điều xe ${vehicle?.plateNumber || ''} tới rẫy lấy hàng cho HĐ ${lot.contract_code}!`);

      setSelectedContractIds((prev) => prev.filter((id) => id !== Number(lot.id)));
      await loadHubData(selectedHubId);
    } catch (err: any) {
      alert(`Lỗi điều phối xe: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. HỦY CHUYẾN ĐIỀU PHỐI (Cancel Trip)
  const handleConfirmCancelTrip = async () => {
    if (!cancellingTrip) return;
    setIsSubmitting(true);
    try {
      await fleetDispatchApi.cancelTrip(cancellingTrip.id, cancelReason);
      showToast(`Đã hủy chuyến ${cancellingTrip.tripCode} và giải phóng các lô hàng về lại hàng chờ!`);
      setCancellingTrip(null);
      await loadHubData(selectedHubId);
    } catch (err: any) {
      alert(`Lỗi hủy chuyến: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4.1. ĐIỀU KHIỂN TIẾN ĐỘ CHUYẾN XE & NHẬN HÀNG TẠI RẪY / HUB
  const [tripActionId, setTripActionId] = useState<number | null>(null);
  const [stopActionId, setStopActionId] = useState<number | null>(null);

  // Modal Kiểm Duyệt & Nhận Hàng Tại Rẫy
  const [inspectingStop, setInspectingStop] = useState<PickupTripDto['stops'][number] | null>(null);
  const [stopInspectMode, setStopInspectMode] = useState<'LOAD' | 'ISSUE'>('LOAD');
  const [stopActualWeight, setStopActualWeight] = useState<number>(0);
  const [stopActualPackages, setStopActualPackages] = useState<number>(0);
  const [stopChecklist, setStopChecklist] = useState({
    pucMatched: true,
    qualityOk: true,
    precooledOk: true,
  });
  const [stopHandoverPhoto, setStopHandoverPhoto] = useState<string>('');
  const [stopUploadingPhoto, setStopUploadingPhoto] = useState<boolean>(false);
  const [stopNotes, setStopNotes] = useState<string>('');
  const [stopIssueReason, setStopIssueReason] = useState<string>('Thiếu sản lượng thực tế hoặc chưa đạt cảm quan');
  const [stopIssueNotes, setStopIssueNotes] = useState<string>('');
  const [submittingStopModal, setSubmittingStopModal] = useState<boolean>(false);

  const openStopInspectModal = (stop: PickupTripDto['stops'][number]) => {
    setInspectingStop(stop);
    setStopInspectMode('LOAD');
    setStopActualWeight(Number(stop.actualWeightKg || stop.weightKg || 0));
    setStopActualPackages(Number(stop.actualPackageCount || stop.packageCount || 1));
    setStopChecklist({ pucMatched: true, qualityOk: true, precooledOk: true });
    setStopHandoverPhoto(stop.handoverPhotoUrl || '');
    setStopNotes('Đã kiểm đếm cân thực tế, đối chiếu tem PUC và xếp hàng lên xe lạnh đạt chuẩn.');
    setStopIssueReason('Thiếu sản lượng thực tế hoặc chưa đạt cảm quan');
    setStopIssueNotes('');
  };

  const handleSubmitStopInspection = async () => {
    if (!inspectingStop) return;
    setSubmittingStopModal(true);
    try {
      if (stopInspectMode === 'LOAD') {
        await fleetDispatchApi.loadStop(inspectingStop.id, {
          actualWeightKg: stopActualWeight,
          actualPackageCount: stopActualPackages,
          handoverPhotoUrl: stopHandoverPhoto || undefined,
          handoverSignatureData: 'ADMIN_VERIFIED_FARM_HANDOVER',
          notes: stopNotes.trim() || 'Đã kiểm duyệt và bốc hàng lên xe lạnh tại rẫy',
        });
        showToast(
          `Đã kiểm duyệt & xác nhận bốc ${stopActualWeight} kg (${stopActualPackages} thùng) tại ${inspectingStop.farmerName}!`
        );
      } else {
        await fleetDispatchApi.reportStopIssue(inspectingStop.id, {
          issueReason: stopIssueReason,
          issueNotes: stopIssueNotes.trim() || undefined,
        });
        showToast(`Đã ghi nhận báo cáo sự cố tại điểm rẫy ${inspectingStop.farmerName}!`);
      }
      setInspectingStop(null);
      await loadHubData(selectedHubId);
    } catch (err: any) {
      alert(`Lỗi kiểm duyệt điểm dừng: ${err?.message || 'Không thể thực hiện'}`);
    } finally {
      setSubmittingStopModal(false);
    }
  };

  const handleTripAction = async (
    trip: PickupTripDto,
    action: 'ACKNOWLEDGE' | 'DEPART' | 'RETURN_HUB' | 'ARRIVE_HUB' | 'COMPLETE_RECEIVING'
  ) => {
    setTripActionId(trip.id);
    try {
      if (action === 'ACKNOWLEDGE') {
        await fleetDispatchApi.acknowledgeTrip(trip.id);
        showToast(`Chuyến ${trip.tripCode}: Tài xế đã tiếp nhận!`);
      } else if (action === 'DEPART') {
        await fleetDispatchApi.departTrip(trip.id);
        showToast(`Chuyến ${trip.tripCode}: Đã xuất bến đi thu gom tại rẫy!`);
      } else if (action === 'RETURN_HUB') {
        await fleetDispatchApi.returnToHub(trip.id);
        showToast(`Chuyến ${trip.tripCode}: Đã gom đủ hàng, đang quay về Kho!`);
      } else if (action === 'ARRIVE_HUB') {
        await fleetDispatchApi.confirmTruckArrival(trip.id);
        showToast(`Chuyến ${trip.tripCode}: Xe đã tới cổng Kho chờ nhập kho!`);
      } else if (action === 'COMPLETE_RECEIVING') {
        const stops = trip.stops || [];
        await fleetDispatchApi.completeReceiving(trip.id, {
          actualTotalWeightKg: trip.actualTotalWeightKg || trip.totalWeightKg,
          actualTotalPackages: trip.actualTotalPackages || trip.totalPackages,
          receivingNotes: 'Admin xác nhận nhận hàng & nhập kho lạnh từ bảng điều phối',
          lotItems: stops.map((s) => ({
            contractId: s.contractId,
            receivedWeightKg: s.actualWeightKg || s.weightKg,
            qualifiedWeightKg: s.actualWeightKg || s.weightKg,
            rejectedWeightKg: 0,
            packageCount: s.actualPackageCount || s.packageCount,
            coldZone: 'Zone A (Lạnh mát 2-6°C)',
            rackBin: 'Kệ R-01 Ô A-01',
            qcNotes: 'Đạt chuẩn nhập kho HoNa Fresh',
          })),
        });
        showToast(`Chuyến ${trip.tripCode}: Đã hoàn tất nhận hàng & nhập Kho!`);
      }
      await loadHubData(selectedHubId);
    } catch (err: any) {
      alert(`Lỗi cập nhật chuyến ${trip.tripCode}: ${err?.message || 'Không thể thực hiện'}`);
    } finally {
      setTripActionId(null);
    }
  };

  const handleStopAction = async (
    stop: PickupTripDto['stops'][number],
    action: 'ARRIVE' | 'LOAD'
  ) => {
    setStopActionId(stop.id);
    try {
      if (action === 'ARRIVE') {
        await fleetDispatchApi.arriveStop(stop.id);
        showToast(`Đã xác nhận xe tới điểm rẫy ${stop.farmerName}!`);
      } else {
        await fleetDispatchApi.loadStop(stop.id, {
          actualWeightKg: stop.actualWeightKg || stop.weightKg,
          actualPackageCount: stop.actualPackageCount || stop.packageCount,
          notes: 'Xác nhận đã bốc hàng lên xe lạnh tại rẫy',
        });
        showToast(`Đã xác nhận nhận & bốc hàng (${stop.actualWeightKg || stop.weightKg} kg) tại ${stop.farmerName}!`);
      }
      await loadHubData(selectedHubId);
    } catch (err: any) {
      alert(`Lỗi cập nhật điểm dừng: ${err?.message || 'Không thể thực hiện'}`);
    } finally {
      setStopActionId(null);
    }
  };

  // 5. CẬP NHẬT TRẠNG THÁI PHƯƠNG TIỆN (Toggle Sẵn Sàng / Bảo Trì)
  const handleToggleVehicleStatus = async (vehicle: FleetVehicleDto) => {
    const nextStatus = vehicle.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE';
    try {
      await fleetDispatchApi.updateVehicleStatus(vehicle.id, nextStatus);
      showToast(`Đã chuyển trạng thái xe ${vehicle.plateNumber} sang ${nextStatus === 'AVAILABLE' ? 'Sẵn sàng' : 'Bảo trì'}!`);
      await loadHubData(selectedHubId);
    } catch (err: any) {
      alert(`Lỗi cập nhật: ${err.message}`);
    }
  };

  // 6. CẬP NHẬT TRẠNG THÁI NHÂN VIÊN / TÀI XẾ (Toggle Sẵn Sàng / Nghỉ Phép)
  const [staffFilter, setStaffFilter] = useState<'ALL' | 'DRIVER' | 'QC_TECH'>('ALL');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffRole, setNewStaffRole] = useState<'DRIVER' | 'QC_TECH'>('QC_TECH');
  const [newStaffCode, setNewStaffCode] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffLicenseNo, setNewStaffLicenseNo] = useState('');
  const [newStaffLicenseClass, setNewStaffLicenseClass] = useState('C');
  const [newStaffExp, setNewStaffExp] = useState(2);
  const [creatingStaff, setCreatingStaff] = useState(false);

  const handleCreateStaff = async () => {
    if (!newStaffCode.trim() || !newStaffName.trim() || !newStaffPhone.trim()) {
      alert('Vui lòng nhập đầy đủ mã nhân viên, họ tên và số điện thoại.');
      return;
    }
    setCreatingStaff(true);
    try {
      await fleetDispatchApi.createDriver({
        warehouseId: selectedHubId,
        driverCode: newStaffCode.trim().toUpperCase(),
        fullName: newStaffName.trim(),
        phone: newStaffPhone.trim(),
        licenseNumber:
          newStaffLicenseNo.trim() ||
          `${newStaffRole === 'QC_TECH' ? 'QC' : 'GPLX'}-${Date.now().toString().slice(-6)}`,
        licenseClass: newStaffRole === 'QC_TECH' ? 'QC_TECH' : newStaffLicenseClass,
        experienceYears: Number(newStaffExp) || 1,
        status: 'AVAILABLE',
      });
      showToast(
        `Đã thêm ${newStaffRole === 'QC_TECH' ? 'KTV Kiểm định QC' : 'Tài xế'} ${newStaffName.trim()} vào ${currentHub.hubName}!`
      );
      setShowAddStaffModal(false);
      setNewStaffCode('');
      setNewStaffName('');
      setNewStaffPhone('');
      setNewStaffLicenseNo('');
      await loadHubData(selectedHubId);
    } catch (err: any) {
      alert(`Lỗi thêm nhân viên: ${err?.message || 'Không thể lưu'}`);
    } finally {
      setCreatingStaff(false);
    }
  };

  const handleToggleDriverStatus = async (driver: FleetDriverDto) => {
    const nextStatus = driver.status === 'AVAILABLE' ? 'OFF_DUTY' : 'AVAILABLE';
    try {
      await fleetDispatchApi.updateDriverStatus(driver.id, nextStatus);
      showToast(`Đã chuyển tài xế ${driver.fullName} sang ${nextStatus === 'AVAILABLE' ? 'Sẵn sàng làm việc' : 'Nghỉ phép'}!`);
      await loadHubData(selectedHubId);
    } catch (err: any) {
      alert(`Lỗi cập nhật: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 font-sans pb-24">
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4 bg-emerald-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-700">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMsg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* 1. Header & KPI Tóm tắt */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Hệ Thống Quản Trị Chuỗi Lạnh B2B</span>
              <span>/</span>
              <span className="text-[#10542C]">Điều Phối Lấy Hàng Tại Vườn</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 mt-1 flex items-center gap-2.5">
              <Route className="w-7 h-7 text-[#10542C]" />
              <span>Quản Lý Đội Xe & Tự Động Điều Phối Lấy Hàng</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Kiểm soát đội xe tải lạnh, tài xế theo từng kho và thuật toán ghép tuyến tối ưu đa điểm, kiểm tra kép tải trọng & thể tích thùng xe.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadHubData(selectedHubId)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
            <Link
              href={`${basePath}/contracts`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-2xs"
            >
              <span>Xem Sổ Hợp Đồng B2B</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
            </Link>
          </div>
        </div>

        {/* 2. BẢN ĐỒ GIÁM SÁT ĐỘI XE & LỘ TRÌNH LẤY HÀNG RẪY */}
        <OutboundFleetMap
          mode="INBOUND"
          hub={currentHub}
          vehicles={vehicles}
          trips={trips}
          coldAssets={coldAssets}
          focusedTripId={focusedTripId}
          onSelectTrip={setFocusedTripId}
        />

        {/* 3. THANH TAB & ĐIỀU HƯỚNG */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('WAITING')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'WAITING'
                  ? 'bg-white text-[#10542C] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Chờ Điều Xe ({waitingLots.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TRIPS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'TRIPS'
                  ? 'bg-white text-[#10542C] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Route className="w-4 h-4 text-blue-600" />
              <span>Chuyến Đang Chạy ({trips.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FLEET')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'FLEET'
                  ? 'bg-white text-[#10542C] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Đội Xe ({vehicles.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DRIVERS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'DRIVERS'
                  ? 'bg-white text-[#10542C] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4 text-purple-600" />
              <span>Nhân Viên & Tài Xế ({drivers.length})</span>
            </button>
          </div>

          {/* Ô Tìm Kiếm */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã HĐ, nông sản, rẫy..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#10542C] focus:ring-1 focus:ring-[#10542C]"
            />
          </div>
        </div>

        {/* 4. THANH ĐIỀU KHIỂN ĐIỀU PHỐI TỐI ƯU (ACTION BAR KHI Ở TAB CHỜ ĐIỀU XE) */}
        {activeTab === 'WAITING' && (
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-5 text-white shadow-lg space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span>Thuật Toán Ghép Tuyến & Tối Ưu Tải Trọng Đa Điểm</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Tự động gom chuyến lấy hàng tại {currentHub.hubName}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isOptimizing || waitingLots.length === 0}
                  onClick={handleTriggerAutoOptimize}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-[#10542C] hover:from-emerald-400 hover:to-[#0d4423] text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>
                    {isOptimizing ? 'Đang Tính Toán Tối Ưu...' : `Tự Động Đề Xuất Điều Phối (${selectedContractIds.length > 0 ? `${selectedContractIds.length} Lô Đã Chọn` : 'Toàn Bộ Hàng Chờ'})`}
                  </span>
                </button>
              </div>
            </div>

            {/* Thống kê lô hàng đang chọn */}
            {selectedContractIds.length > 0 && (
              <div className="pt-3 border-t border-slate-700/80 flex flex-wrap items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-4">
                  <span className="text-emerald-300 font-bold">
                    Đã tick chọn: {selectedLotsMetrics.count} hợp đồng
                  </span>
                  <span className="text-slate-300">
                    Tổng khối lượng: <strong className="text-white font-mono">{selectedLotsMetrics.totalWeight.toLocaleString()} kg</strong>
                  </span>
                  <span className="text-slate-300">
                    Tổng thể tích: <strong className="text-white font-mono">{selectedLotsMetrics.totalVolume.toFixed(2)} m³</strong>
                  </span>
                  <span className="text-slate-300">
                    Tổng số kiện: <strong className="text-white font-mono">{selectedLotsMetrics.totalPackages} kiện</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedContractIds([])}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            )}
          </div>
        )}

        {/* 5. TAB 1: DANH SÁCH HÀNG CHỜ ĐIỀU XE (WAITING LOTS) */}
        {activeTab === 'WAITING' && (
          <div className="space-y-4">
            {/* Banner Lô Đang Vận Chuyển */}
            {trips.filter(t => !['CANCELLED', 'COMPLETED'].includes(t.status)).length > 0 && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-950 text-sm">
                      Đang có {trips.filter(t => !['CANCELLED', 'COMPLETED'].includes(t.status)).length} chuyến xe đang thực hiện lấy hàng tại {currentHub.hubName}
                    </h4>
                    <p className="text-blue-700 text-[11px]">
                      {trips.filter(t => !['CANCELLED', 'COMPLETED'].includes(t.status)).reduce((acc, t) => acc + (t.stops?.length || t.totalStops || 0), 0)} lô hàng nông sản đã được điều phối và đang được thu gom theo thời gian thực.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('TRIPS')}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Route className="w-3.5 h-3.5" />
                  <span>Theo Dõi Lộ Trình Chuyến Xe</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {filteredWaitingLots.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  Không có hợp đồng nào đang chờ điều phối lấy hàng tại {currentHub.hubName}
                </h3>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-2 text-xs text-slate-600 font-bold">
                  <button
                    type="button"
                    onClick={selectAllWaiting}
                    className="flex items-center gap-2 hover:text-slate-900 cursor-pointer"
                  >
                    {selectedContractIds.length === filteredWaitingLots.length ? (
                      <CheckSquare className="w-4 h-4 text-[#10542C]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Chọn tất cả ({filteredWaitingLots.length} hợp đồng sẵn sàng điều xe)</span>
                  </button>
                  <span>Đã chọn: {selectedContractIds.length} hợp đồng</span>
                </div>

                <div className="space-y-4">
                  {filteredWaitingLots.map((lot) => {
                    const key = String(lot.id);
                    const currentAssignment = assignmentMap[key] || {
                      vehicleId: vehicles[0]?.id || 1,
                      driverId: drivers[0]?.id || 1,
                    };
                    const isSelected = selectedContractIds.includes(Number(lot.id));
                    const details = parsePickupDetails(lot.farm_pickup_address);
                    const harvestKg = Number(lot.computedWeightKg) || 100;
                    const volumeM3 = Number(lot.computedVolumeM3) || 0.5;
                    const packageCount = Number(lot.computedPackageCount) || 10;
                    const packageType = lot.computedPackageType || 'THÙNG NHỰA 20KG';

                    return (
                      <div
                        key={lot.id}
                        className={`bg-white rounded-3xl p-5 border transition-all duration-200 shadow-xs space-y-4 ${
                          isSelected
                            ? 'border-[#10542C] ring-2 ring-[#10542C]/20 bg-emerald-50/20'
                            : 'border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        {/* Header Thẻ: Mã HĐ, Trạng thái & Tick chọn */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => toggleSelectLot(Number(lot.id))}
                              className="text-slate-400 hover:text-[#10542C] cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-[#10542C]" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-[#10542C]">
                                  {lot.contract_code}
                                </span>
                                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                                  ✓ Đã Duyệt Đóng Gói
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500">
                                {lot.created_at ? new Date(lot.created_at).toLocaleDateString('vi-VN') : 'Mới tạo'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                              <span>Hàng Sẵn Sàng Tại Rẫy · Chờ Điều Xe</span>
                            </span>
                          </div>
                        </div>

                        {/* Chi tiết 3 cột: Nông sản, Điểm đón xe tại rẫy, Thông số tải trọng */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          {/* Cột 1: Nông sản */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Nông Sản Thu Hoạch
                            </span>
                            <strong className="text-sm font-bold text-slate-900 block">
                              {lot.product_name || 'Nông sản HoNa'}
                            </strong>
                            <div className="flex justify-between text-slate-700 pt-1">
                              <span>Khối lượng:</span>
                              <strong className="text-emerald-700 font-mono font-bold text-sm">
                                {harvestKg.toLocaleString()} kg
                              </strong>
                            </div>
                            <div className="flex justify-between text-slate-600 text-[11px]">
                              <span>Quy cách đóng gói:</span>
                              <span className="font-bold">{packageCount} {packageType}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 text-[11px]">
                              <span>Thể tích tính toán:</span>
                              <span className="font-bold font-mono text-blue-700">{volumeM3.toFixed(2)} m³</span>
                            </div>
                          </div>

                          {/* Cột 2: Điểm đón xe tại rẫy */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Điểm Đón Xe Tại Vườn
                            </span>
                            <div className="flex items-start gap-1.5 text-slate-800">
                              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                              <span className="font-medium">{details.farmLocation}</span>
                            </div>
                            <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                              <span>Chủ vườn:</span>
                              <strong className="text-slate-900">{lot.farmer_name || 'Nhà vườn'}</strong>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                              <span>SĐT liên hệ:</span>
                              <a
                                href={`tel:${details.contactPhone}`}
                                className="font-mono text-[#10542C] font-bold hover:underline flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{details.contactPhone}</span>
                              </a>
                            </div>
                          </div>

                          {/* Cột 3: Phân công phương tiện & tài xế trực tiếp */}
                          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
                            <span className="text-[10px] font-bold text-[#10542C] uppercase tracking-wider block">
                              Gán Xe Lạnh & Tài Xế ({currentHub.hubCode})
                            </span>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 block">Chọn xe tải:</label>
                              <select
                                value={currentAssignment.vehicleId}
                                onChange={(e) => {
                                  const vId = Number(e.target.value);
                                  setAssignmentMap((prev) => ({
                                    ...prev,
                                    [key]: { ...prev[key], vehicleId: vId },
                                  }));
                                }}
                                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#10542C]"
                              >
                                {vehicles.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.plateNumber} - {v.vehicleModel} ({v.capacityKg} kg / {v.volumeM3} m³) [{v.status}]
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 block">Chọn tài xế:</label>
                              <select
                                value={currentAssignment.driverId}
                                onChange={(e) => {
                                  const dId = Number(e.target.value);
                                  setAssignmentMap((prev) => ({
                                    ...prev,
                                    [key]: { ...prev[key], driverId: dId },
                                  }));
                                }}
                                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#10542C]"
                              >
                                {drivers
                                  .filter((d) => !['QC_TECH', 'WH_STAFF', 'DISPATCH', 'ACCOUNTANT'].includes(String(d.licenseClass || '').toUpperCase()))
                                  .map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.fullName} (Bằng {d.licenseClass} - {d.phone}) [{d.status}]
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Footer thẻ: Nút bấm điều xe */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Bảo quản lạnh 2°C - 6°C từ rẫy về {currentHub.hubName}</span>
                          </div>

                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleSingleDispatch(lot)}
                            className="px-4 py-2 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] disabled:bg-slate-400 text-white font-bold text-xs flex items-center gap-2 shadow-2xs transition cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Xác Nhận Điều Xe Đơn Lẻ</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* 6. TAB 2: DANH SÁCH CHUYẾN XE ĐIỀU PHỐI (TRIPS) */}
        {activeTab === 'TRIPS' && (
          <div className="space-y-4">
            {trips.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                <p className="text-xs text-slate-500">Chưa có chuyến xe nào được tạo tại {currentHub.hubName}.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trips.map((trip) => {
                  const isCancelled = trip.status === 'CANCELLED';
                  const isCompleted = trip.status === 'COMPLETED';
                  const canCancel = !isCancelled && !isCompleted;

                  const stops = trip.stops || [];
                  const totalStopsCount = stops.length || trip.totalStops || 0;
                  const loadedStopsCount = stops.filter(s => s.status === 'LOADED').length;
                  const issueStops = stops.filter(s => s.status === 'ISSUE_REPORTED');
                  const progressPct = totalStopsCount > 0 ? Math.round((loadedStopsCount / totalStopsCount) * 100) : 0;

                  return (
                    <div
                      key={trip.id}
                      className={`bg-white rounded-3xl p-5 border transition-all shadow-xs space-y-4 ${
                        isCancelled
                          ? 'border-rose-200 bg-rose-50/20 opacity-80'
                          : issueStops.length > 0
                          ? 'border-amber-300 ring-2 ring-amber-100'
                          : isCompleted
                          ? 'border-emerald-200 bg-emerald-50/10'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Header Chuyến */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isCancelled
                              ? 'bg-rose-100 text-rose-800'
                              : trip.status === 'RETURNING'
                              ? 'bg-amber-100 text-amber-800'
                              : trip.status === 'ARRIVED_AT_WAREHOUSE'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-slate-900">{trip.tripCode}</span>
                              <span
                                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                                  isCancelled
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : isCompleted
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : trip.status === 'RETURNING'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : trip.status === 'ARRIVED_AT_WAREHOUSE'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                    : trip.status === 'ON_TRIP' || trip.status === 'DEPARTED'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : trip.status === 'ACKNOWLEDGED'
                                    ? 'bg-teal-100 text-teal-800 border border-teal-300'
                                    : 'bg-slate-100 text-slate-800 border border-slate-300'
                                }`}
                              >
                                {isCancelled
                                  ? 'ĐÃ HỦY CHUYẾN'
                                  : isCompleted
                                  ? 'ĐÃ NHẬP KHO'
                                  : trip.status === 'ARRIVED_AT_WAREHOUSE'
                                  ? 'ĐÃ ĐẾN CỔNG KHO'
                                  : trip.status === 'RETURNING'
                                  ? 'ĐANG VỀ KHO'
                                  : trip.status === 'ON_TRIP' || trip.status === 'DEPARTED'
                                  ? 'ĐANG THU GOM RẪY'
                                  : trip.status === 'ACKNOWLEDGED'
                                  ? 'TÀI XẾ ĐÃ NHẬN'
                                  : 'ĐÃ PHÂN CÔNG'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFocusedTripId(trip.id);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition cursor-pointer flex items-center gap-1"
                                title="Hiển thị lộ trình chuyến này trên bản đồ"
                              >
                                <MapPin className="w-3 h-3" />
                                <span>Xem bản đồ</span>
                              </button>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              Khởi tạo: {trip.createdAt ? new Date(trip.createdAt).toLocaleString('vi-VN') : 'Mới tạo'}
                              {trip.departureTime && (
                                <span className="ml-2">
                                  · Xuất bến: <strong>{new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong>
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Nhóm nút điều khiển tiến độ chuyến & hủy chuyến */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {trip.status === 'ASSIGNED' && (
                            <button
                              type="button"
                              disabled={tripActionId === trip.id}
                              onClick={() => handleTripAction(trip, 'ACKNOWLEDGE')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{tripActionId === trip.id ? 'Đang xử lý...' : 'Tiếp Nhận Chuyến'}</span>
                            </button>
                          )}

                          {trip.status === 'ACKNOWLEDGED' && (
                            <button
                              type="button"
                              disabled={tripActionId === trip.id}
                              onClick={() => handleTripAction(trip, 'DEPART')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>{tripActionId === trip.id ? 'Đang xử lý...' : 'Xuất Bến Lấy Hàng'}</span>
                            </button>
                          )}

                          {(trip.status === 'ON_TRIP' || trip.status === 'DEPARTED') &&
                            totalStopsCount > 0 &&
                            loadedStopsCount >= totalStopsCount && (
                              <button
                                type="button"
                                disabled={tripActionId === trip.id}
                                onClick={() => handleTripAction(trip, 'RETURN_HUB')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>{tripActionId === trip.id ? 'Đang xử lý...' : 'Đã Gom Đủ · Quay Về Kho'}</span>
                              </button>
                            )}

                          {trip.status === 'RETURNING' && (
                            <button
                              type="button"
                              disabled={tripActionId === trip.id}
                              onClick={() => handleTripAction(trip, 'ARRIVE_HUB')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{tripActionId === trip.id ? 'Đang xử lý...' : 'Xác Nhận Tới Cổng Kho'}</span>
                            </button>
                          )}

                          {trip.status === 'ARRIVED_AT_WAREHOUSE' && (
                            <button
                              type="button"
                              disabled={tripActionId === trip.id}
                              onClick={() => handleTripAction(trip, 'COMPLETE_RECEIVING')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10542C] hover:bg-[#0d4624] disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{tripActionId === trip.id ? 'Đang xử lý...' : 'Nhận Hàng & Nhập Kho'}</span>
                            </button>
                          )}

                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancellingTrip(trip);
                                setCancelReason('Xe tải gặp sự cố kỹ thuật đột xuất');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Hủy Chuyến & Trả Lô Về Hàng Chờ</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Tiến độ thu gom */}
                      {!isCancelled && (
                        <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-semibold">
                              Tiến độ lộ trình: <strong className="text-[#10542C] font-mono">{loadedStopsCount}/{totalStopsCount} rẫy đã bốc hàng</strong>
                              {trip.status === 'RETURNING' && <span className="text-amber-700 font-bold ml-2">· Đang trên đường về Kho</span>}
                              {trip.status === 'ARRIVED_AT_WAREHOUSE' && <span className="text-purple-700 font-bold ml-2">· Xe đã tới cổng kho</span>}
                            </span>
                            <span className="font-mono font-bold text-emerald-800">{progressPct}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Cảnh báo sự cố nếu có rẫy báo sự cố */}
                      {issueStops.length > 0 && (
                        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Phát hiện {issueStops.length} điểm dừng có báo cáo sự cố từ tài xế:</span>
                          </div>
                          {issueStops.map(s => (
                            <p key={s.id} className="pl-5 text-slate-700">
                              • <strong>{s.farmerName}:</strong> {s.issueReason} {s.issueNotes ? `(${s.issueNotes})` : ''}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Chi tiết Xe, Tài xế, Tải trọng */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Xe Tải Lạnh</span>
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-900 font-mono text-sm">{trip.vehicle?.plateNumber}</strong>
                            <span className="text-slate-500">({trip.vehicle?.vehicleModel})</span>
                          </div>
                          <span className="text-slate-600 text-[11px] block">
                            Sức chứa: {trip.vehicle?.capacityKg} kg / {trip.vehicle?.volumeM3} m³
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tài Xế Phụ Trách</span>
                          <strong className="text-slate-900 block">{trip.driver?.fullName}</strong>
                          <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                            <span>SĐT: <strong className="text-slate-800 font-mono">{trip.driver?.phone}</strong></span>
                            <span>·</span>
                            <span>Bằng: <strong className="text-purple-700">{trip.driver?.licenseClass}</strong></span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Tải Chuyến</span>
                          <div className="flex items-center justify-between">
                            <span>Khối lượng:</span>
                            <strong className="font-mono text-emerald-800">{trip.actualTotalWeightKg || trip.totalWeightKg} kg</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Thể tích:</span>
                            <strong className="font-mono text-blue-800">{trip.totalVolumeM3} m³</strong>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Số điểm dừng:</span>
                            <span className="font-bold">{totalStopsCount} điểm rẫy</span>
                          </div>
                        </div>
                      </div>

                      {/* Danh sách các điểm dừng trong chuyến (Tracking chi tiết lô đã điều phối) */}
                      {stops.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Lộ trình các điểm dừng bốc hàng ({stops.length} rẫy — Các lô hàng đã điều phối)
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {stops.map((stop) => {
                              const isStopLoaded = stop.status === 'LOADED';
                              const isStopArrived = stop.status === 'ARRIVED';
                              const isStopIssue = stop.status === 'ISSUE_REPORTED';

                              return (
                                <div
                                  key={stop.id}
                                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                                    isStopLoaded
                                      ? 'border-emerald-200 bg-emerald-50/40'
                                      : isStopIssue
                                      ? 'border-rose-200 bg-rose-50/50'
                                      : isStopArrived
                                      ? 'border-blue-200 bg-blue-50/50'
                                      : 'border-slate-200 bg-slate-50/60'
                                  }`}
                                >
                                  <span className={`w-5 h-5 rounded-full font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5 ${
                                    isStopLoaded
                                      ? 'bg-emerald-600 text-white'
                                      : isStopIssue
                                      ? 'bg-rose-600 text-white'
                                      : isStopArrived
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-800 text-white'
                                  }`}>
                                    {stop.stopOrder}
                                  </span>
                                  <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <strong className="text-slate-900 truncate">{stop.farmerName}</strong>
                                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                        ({stop.actualWeightKg || stop.weightKg} kg)
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 truncate">{stop.pickupAddress}</p>
                                    <div className="flex items-center justify-between pt-0.5 text-[10px]">
                                      <span className="font-mono text-slate-400">HĐ-{stop.contractId}</span>
                                      <span className={`px-1.5 py-0.2 rounded font-bold ${
                                        isStopLoaded
                                          ? 'text-emerald-700 bg-emerald-100'
                                          : isStopIssue
                                          ? 'text-rose-700 bg-rose-100'
                                          : isStopArrived
                                          ? 'text-blue-700 bg-blue-100'
                                          : 'text-slate-600 bg-slate-200'
                                      }`}>
                                        {isStopLoaded ? 'ĐÃ BỐC HÀNG' : isStopIssue ? 'SỰ CỐ' : isStopArrived ? 'ĐÃ TỚI RẪY' : 'CHỜ ĐÓN XE'}
                                      </span>
                                    </div>

                                    {!isCancelled && !isCompleted && !isStopLoaded && (trip.status === 'ASSIGNED' || trip.status === 'ACKNOWLEDGED' || trip.status === 'ON_TRIP' || trip.status === 'DEPARTED') && (
                                      <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
                                        {stop.status === 'PENDING' && (
                                          <button
                                            type="button"
                                            disabled={stopActionId === stop.id}
                                            onClick={() => handleStopAction(stop, 'ARRIVE')}
                                            className="px-2 py-1 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-800 text-[10px] font-bold transition cursor-pointer"
                                          >
                                            {stopActionId === stop.id ? '...' : 'Đã Tới Rẫy'}
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          disabled={stopActionId === stop.id}
                                          onClick={() => openStopInspectModal(stop)}
                                          className="px-2.5 py-1 rounded-lg bg-[#10542C] hover:bg-[#0d4624] disabled:opacity-50 text-white text-[10px] font-bold transition cursor-pointer"
                                        >
                                          Kiểm Duyệt & Nhận Hàng
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Lý do hủy nếu có */}
                      {isCancelled && trip.cancellationReason && (
                        <div className="p-3 bg-rose-100/60 rounded-2xl border border-rose-200 text-xs text-rose-900">
                          <strong>Lý do hủy:</strong> {trip.cancellationReason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 7. TAB 3: QUẢN LÝ ĐỘI XE (FLEET VEHICLES) */}
        {activeTab === 'FLEET' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                Danh sách phương tiện trực thuộc {currentHub.hubName}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((v) => {
                const isAvail = v.status === 'AVAILABLE';
                return (
                  <div key={v.id} className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-emerald-700" />
                        <span className="font-mono font-black text-sm text-slate-900">{v.plateNumber}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                          isAvail
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : v.status === 'ON_TRIP'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : v.status === 'ASSIGNED'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <strong className="text-slate-800 block">{v.vehicleModel}</strong>
                      <div className="flex justify-between text-slate-600">
                        <span>Tải trọng tối đa:</span>
                        <strong className="font-mono text-emerald-800">{v.capacityKg.toLocaleString()} kg</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Thể tích thùng:</span>
                        <strong className="font-mono text-blue-800">{v.volumeM3} m³</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Dải nhiệt độ:</span>
                        <span className="font-bold text-slate-700">{v.minTemp}°C - {v.maxTemp}°C</span>
                      </div>
                      {v.notes && <p className="text-[11px] text-slate-500 italic pt-1">{v.notes}</p>}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleVehicleStatus(v)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                          isAvail
                            ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                            : 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {isAvail ? 'Chuyển Bảo Trì' : 'Đưa Vào Sẵn Sàng'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 8. TAB 4: QUẢN LÝ NHÂN VIÊN & TÀI XẾ (DRIVERS & QC TECHNICIANS) */}
        {activeTab === 'DRIVERS' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Đội ngũ Nhân viên & Tài xế trực thuộc {currentHub.hubName}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Quản lý chung Tài xế xe lạnh và Kỹ thuật viên kiểm định QC trong kho.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-[11px] font-bold">
                  {[
                    { key: 'ALL' as const, label: `Tất cả (${drivers.length})` },
                    { key: 'DRIVER' as const, label: `Tài xế (${drivers.filter((d) => d.licenseClass !== 'QC_TECH').length})` },
                    { key: 'QC_TECH' as const, label: `KTV QC (${drivers.filter((d) => d.licenseClass === 'QC_TECH').length})` },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setStaffFilter(f.key)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        staffFilter === f.key ? 'bg-white text-[#10542C] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewStaffRole('QC_TECH');
                    setNewStaffCode(`KTV-${Date.now().toString().slice(-4)}`);
                    setShowAddStaffModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#10542C] hover:bg-[#0d4624] text-white text-xs font-bold transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Thêm Nhân Viên / Tài Xế</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers
                .filter((d) => {
                  if (staffFilter === 'QC_TECH') return d.licenseClass === 'QC_TECH';
                  if (staffFilter === 'DRIVER') return d.licenseClass !== 'QC_TECH';
                  return true;
                })
                .map((d) => {
                const isAvail = d.status === 'AVAILABLE';
                const isQcTech = d.licenseClass === 'QC_TECH';
                return (
                  <div key={d.id} className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        {isQcTech ? (
                          <ShieldCheck className="w-5 h-5 text-emerald-700" />
                        ) : (
                          <User className="w-5 h-5 text-purple-700" />
                        )}
                        <div>
                          <strong className="text-xs font-bold text-slate-900 block">{d.fullName}</strong>
                          <span className="font-mono text-[10px] text-slate-500">{d.driverCode}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                          isAvail
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : d.status === 'ON_TRIP'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : d.status === 'ASSIGNED'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {d.status === 'AVAILABLE'
                          ? 'Sẵn sàng làm việc'
                          : d.status === 'ON_TRIP'
                          ? 'Đang chạy chuyến'
                          : d.status === 'ASSIGNED'
                          ? 'Đã phân công'
                          : 'Nghỉ phép / Tạm ngưng'}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Số điện thoại:</span>
                        <strong className="font-mono text-slate-800">{d.phone}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{isQcTech ? 'Mã chứng chỉ QC:' : 'Số GPLX:'}</span>
                        <span className="font-mono text-slate-700">{d.licenseNumber}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{isQcTech ? 'Chức danh:' : 'Hạng bằng lái:'}</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded border ${
                            isQcTech
                              ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                              : 'text-purple-800 bg-purple-50 border-purple-200'
                          }`}
                        >
                          {isQcTech ? 'KTV Kiểm Định QC' : `Hạng ${d.licenseClass}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Kinh nghiệm:</span>
                        <span className="font-bold text-slate-800">{d.experienceYears} năm</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleDriverStatus(d)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                          isAvail
                            ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                            : 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {isAvail ? 'Cho Nghỉ Phép' : 'Đưa Vào Sẵn Sàng'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 9. MODAL KẾT QUẢ TỰ ĐỘNG ĐIỀU PHỐI (AUTO-OPTIMIZE PROPOSAL MODAL)      */}
      {/* ===================================================================== */}
      {showOptimizeModal && optimizationResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8 animate-in fade-in zoom-in-95">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    Phương Án Đề Xuất Điều Phối Tự Động ({optimizationResult.hubName})
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Dữ liệu tạm tính toán trên bộ nhớ để điều phối viên tinh chỉnh trước khi bấm xác nhận chính thức vào Database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOptimizeModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thống kê tổng quan */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-500 block">Tổng Lô Chờ Gom</span>
                <strong className="text-lg font-mono font-bold text-slate-900">
                  {optimizationResult.totalWaitingLots}
                </strong>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-emerald-700 block">Đã Ghép Vào Chuyến</span>
                <strong className="text-lg font-mono font-bold text-emerald-800">
                  {optimizationResult.assignedLotsCount}
                </strong>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <span className="text-amber-700 block">Chưa Thể Ghép</span>
                <strong className="text-lg font-mono font-bold text-amber-800">
                  {optimizationResult.unassignedLotsCount}
                </strong>
              </div>
            </div>

            {/* Danh sách các chuyến đề xuất */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Các chuyến xe được thuật toán ghép tối ưu ({optimizationResult.proposedTrips.length} chuyến)
              </span>

              {optimizationResult.proposedTrips.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl text-xs text-slate-500">
                  Không có chuyến nào được ghép (do vượt tải trọng hoặc thiếu xe/tài xế).
                </div>
              ) : (
                optimizationResult.proposedTrips.map((trip) => (
                  <div
                    key={trip.tempTripId}
                    className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-[#10542C]" />
                        <strong className="text-sm font-bold text-slate-900">
                          {trip.plateNumber} ({trip.vehicleModel})
                        </strong>
                        <span className="text-xs text-slate-600">· Tài xế: <strong>{trip.driverName}</strong> (Bằng {trip.licenseClass})</span>
                      </div>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleConfirmProposedTrip(trip)}
                        className="px-4 py-2 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Xác Nhận Phân Công Chuyến Này</span>
                      </button>
                    </div>

                    {/* Tiến độ kiểm soát kép Tải trọng và Thể tích */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-100 text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-600">Tải trọng xe:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {trip.totalWeightKg.toLocaleString()} / {trip.capacityKg.toLocaleString()} kg ({trip.weightLoadPercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${trip.weightLoadPercentage > 100 ? 'bg-rose-500' : 'bg-emerald-600'}`}
                            style={{ width: `${Math.min(100, trip.weightLoadPercentage)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-600">Thể tích thùng:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {trip.totalVolumeM3.toFixed(2)} / {trip.volumeM3.toFixed(2)} m³ ({trip.volumeLoadPercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${trip.volumeLoadPercentage > 100 ? 'bg-rose-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(100, trip.volumeLoadPercentage)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Danh sách các điểm dừng trong chuyến đề xuất */}
                    <div className="pt-2 border-t border-emerald-100/60 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Lộ trình lấy hàng ({trip.stops.length} điểm)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {trip.stops.map((stop) => (
                          <div
                            key={stop.contractId}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2"
                          >
                            <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-mono text-[10px] flex items-center justify-center shrink-0">
                              {stop.stopOrder}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-[#10542C] text-[11px] truncate">
                                  {stop.contractCode}
                                </span>
                                <span className="font-mono text-[10px] text-slate-600">
                                  {stop.weightKg} kg / {stop.volumeM3.toFixed(2)} m³
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">{stop.farmerName} - {stop.pickupAddress}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Danh sách các hợp đồng chưa thể ghép chuyến */}
              {optimizationResult.unassignedContracts.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Lô hàng chưa thể điều phối ({optimizationResult.unassignedContracts.length} lô)</span>
                  </span>

                  <div className="space-y-2">
                    {optimizationResult.unassignedContracts.map((u) => (
                      <div
                        key={u.contractId}
                        className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{u.contractCode}</span>
                            <span className="text-slate-600">({u.farmerName})</span>
                          </div>
                          <span className="text-[11px] text-slate-500">Khối lượng: {u.weightKg} kg · Thể tích: {u.volumeM3.toFixed(2)} m³</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300">
                          {u.reasonDescription}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowOptimizeModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 10. MODAL HỦY CHUYẾN (CANCEL TRIP CONFIRMATION MODAL)                  */}
      {/* ===================================================================== */}
      {cancellingTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Xác Nhận Hủy Chuyến Xe</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn hủy chuyến xe <strong className="font-mono text-slate-900">{cancellingTrip.tripCode}</strong>?
              Thao tác này sẽ giải phóng xe <strong className="font-mono">{cancellingTrip.vehicle?.plateNumber}</strong> và tài xế về trạng thái <span className="text-emerald-700 font-bold">AVAILABLE</span>, đồng thời trả toàn bộ các hợp đồng chưa hoàn tất về lại hàng chờ điều phối.
            </p>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700 block">Lý do hủy chuyến:</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                placeholder="Nhập nguyên nhân hủy chuyến..."
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setCancellingTrip(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmCancelTrip}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Đang Hủy...' : 'Xác Nhận Hủy Chuyến'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10.1 MODAL KIỂM DUYỆT & NHẬN HÀNG TẠI RẪY */}
      {inspectingStop && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#10542C] text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Kiểm Duyệt & Nhận Hàng Tại Rẫy
                  </h3>
                  <p className="text-xs text-slate-600">
                    <strong className="text-[#10542C]">{inspectingStop.farmerName}</strong> ·{' '}
                    <span className="font-mono">HĐ-{inspectingStop.contractId}</span> · Dự kiến{' '}
                    <strong>{inspectingStop.weightKg} kg</strong> ({inspectingStop.packageCount} thùng)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingStop(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Chọn kết quả kiểm duyệt */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setStopInspectMode('LOAD')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    stopInspectMode === 'LOAD'
                      ? 'bg-[#10542C] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đạt Chuẩn · Nhận & Bốc Hàng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStopInspectMode('ISSUE')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    stopInspectMode === 'ISSUE'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Không Đạt · Báo Sự Cố</span>
                </button>
              </div>

              {stopInspectMode === 'LOAD' ? (
                <>
                  {/* Checklist kiểm duyệt 3 bước */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      1. Checklist Kiểm Duyệt Bắt Buộc Tại Rẫy
                    </span>
                    {[
                      { key: 'pucMatched' as const, label: 'Đã đối chiếu đúng mã hợp đồng & tem truy xuất vùng trồng (PUC) trên thùng' },
                      { key: 'qualityOk' as const, label: 'Cảm quan nông sản tươi, không dập nát, không sâu bệnh hoặc ẩm úng' },
                      { key: 'precooledOk' as const, label: 'Đóng thùng đúng quy cách & đã xếp lên thùng xe lạnh (2-6°C)' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stopChecklist[item.key]}
                          onChange={(e) =>
                            setStopChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))
                          }
                          className="mt-0.5 rounded border-slate-300 text-[#10542C] focus:ring-[#10542C]"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Cân đếm thực tế */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Khối lượng cân thực nhận (kg) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={stopActualWeight}
                        onChange={(e) => setStopActualWeight(Math.max(0, Number(e.target.value)))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-[#10542C] focus:outline-none focus:border-[#10542C]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Số thùng / kiện thực nhận *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={stopActualPackages}
                        onChange={(e) => setStopActualPackages(Math.max(1, Number(e.target.value)))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#10542C]"
                      />
                    </div>
                  </div>

                  {/* Upload ảnh biên bản bàn giao */}
                  <ImageUploadField
                    name="handoverPhotoUrl"
                    label="2. Ảnh thực tế bàn cân / hàng xếp lên xe lạnh"
                    purpose="EPOD"
                    value={stopHandoverPhoto}
                    onChange={(url) => setStopHandoverPhoto(url)}
                    onUploadingChange={setStopUploadingPhoto}
                  />

                  {/* Ghi chú */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ghi chú kiểm duyệt bàn giao
                    </label>
                    <textarea
                      rows={2}
                      value={stopNotes}
                      onChange={(e) => setStopNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#10542C]"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3 p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
                  <div>
                    <label className="block text-xs font-bold text-rose-900 mb-1.5">
                      Lý do sự cố tại rẫy *
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        'Thiếu sản lượng thực tế',
                        'Nông sản dập nát / không đạt cảm quan',
                        'Chưa đóng thùng hoặc thiếu tem PUC',
                        'Nhà vườn chưa sẵn sàng giao hàng',
                      ].map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setStopIssueReason(reason)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            stopIssueReason === reason
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-100/60'
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={stopIssueReason}
                      onChange={(e) => setStopIssueReason(e.target.value)}
                      className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-rose-900 mb-1">
                      Mô tả chi tiết hiện trường
                    </label>
                    <textarea
                      rows={3}
                      value={stopIssueNotes}
                      onChange={(e) => setStopIssueNotes(e.target.value)}
                      placeholder="Ghi rõ số kg thiếu, tình trạng hàng hóa hoặc hướng xử lý..."
                      className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={submittingStopModal}
                onClick={() => setInspectingStop(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={
                  submittingStopModal ||
                  stopUploadingPhoto ||
                  (stopInspectMode === 'LOAD' &&
                    (!stopChecklist.pucMatched ||
                      !stopChecklist.qualityOk ||
                      !stopChecklist.precooledOk ||
                      stopActualWeight <= 0)) ||
                  (stopInspectMode === 'ISSUE' && !stopIssueReason.trim())
                }
                onClick={handleSubmitStopInspection}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                  stopInspectMode === 'LOAD'
                    ? 'bg-[#10542C] hover:bg-[#0d4624]'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submittingStopModal
                  ? 'Đang lưu...'
                  : stopUploadingPhoto
                  ? 'Đang tải ảnh...'
                  : stopInspectMode === 'LOAD'
                  ? 'Xác Nhận Đạt Chuẩn & Bốc Hàng'
                  : 'Gửi Báo Cáo Sự Cố'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10.2 MODAL THÊM NHÂN VIÊN / TÀI XẾ */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Thêm Nhân Viên / Tài Xế Kho</h3>
                <p className="text-xs text-slate-500">{currentHub.hubName}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setNewStaffRole('QC_TECH');
                  setNewStaffCode(`KTV-${Date.now().toString().slice(-4)}`);
                }}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  newStaffRole === 'QC_TECH' ? 'bg-[#10542C] text-white' : 'text-slate-600'
                }`}
              >
                KTV Kiểm Định QC
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewStaffRole('DRIVER');
                  setNewStaffCode(`DRV-${Date.now().toString().slice(-4)}`);
                }}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  newStaffRole === 'DRIVER' ? 'bg-[#10542C] text-white' : 'text-slate-600'
                }`}
              >
                Tài Xế Xe Lạnh
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mã nhân viên *</label>
                  <input
                    type="text"
                    value={newStaffCode}
                    onChange={(e) => setNewStaffCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold"
                    placeholder="KTV-DT-01"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số điện thoại *</label>
                  <input
                    type="text"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                    placeholder="0912.345.678"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Họ và tên *</label>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder={newStaffRole === 'QC_TECH' ? 'VD: KTV. Lê Hoàng Yến' : 'VD: Nguyễn Văn Tài'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {newStaffRole === 'QC_TECH' ? 'Mã chứng chỉ QC' : 'Số GPLX'}
                  </label>
                  <input
                    type="text"
                    value={newStaffLicenseNo}
                    onChange={(e) => setNewStaffLicenseNo(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                    placeholder={newStaffRole === 'QC_TECH' ? 'QC-CERT-01' : '790123456789'}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {newStaffRole === 'QC_TECH' ? 'Kinh nghiệm (năm)' : 'Hạng bằng lái'}
                  </label>
                  {newStaffRole === 'QC_TECH' ? (
                    <input
                      type="number"
                      min={1}
                      value={newStaffExp}
                      onChange={(e) => setNewStaffExp(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                    />
                  ) : (
                    <select
                      value={newStaffLicenseClass}
                      onChange={(e) => setNewStaffLicenseClass(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white font-bold"
                    >
                      <option value="B2">Hạng B2</option>
                      <option value="C">Hạng C</option>
                      <option value="C1">Hạng C1</option>
                      <option value="CE">Hạng CE</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={creatingStaff}
                onClick={handleCreateStaff}
                className="px-4 py-2 rounded-xl bg-[#10542C] hover:bg-[#0d4624] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {creatingStaff ? 'Đang lưu...' : 'Lưu Nhân Viên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Skeleton loading cho Suspense
function DispatchLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/70 p-6 flex flex-col items-center justify-center space-y-3">
      <RotateCw className="w-8 h-8 text-[#10542C] animate-spin" />
      <span className="text-xs font-bold text-slate-600">
        Đang tải dữ liệu đội xe và mạng lưới 5 trạm trung chuyển...
      </span>
    </div>
  );
}

// =========================================================================
// 11. EXPORT DEFAULT BỌC SUSPENSE
// =========================================================================
export default function AdminInboundDispatchPage() {
  return (
    <Suspense fallback={<DispatchLoadingSkeleton />}>
      <AdminInboundDispatchContent />
    </Suspense>
  );
}
