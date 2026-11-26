'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Truck,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Navigation,
  Camera,
  Layers,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  FileText,
  AlertCircle,
  ExternalLink,
  LogOut,
  RefreshCw,
  Boxes,
} from 'lucide-react';
import {
  fleetDispatchApi,
  PickupTripDto,
  PickupTripStopDto,
} from '@/services/fleetDispatchApi';
import { useApp } from '@/context/AppContext';
import { portalFor } from '@/services/auth';
import { b2bWebSocket } from '@/services/websocketService';
import { adminFarmHandover } from '@/services/b2bSyncService';
import ImageUploadField from '@/components/ImageUploadField';
import DriverOutboundDeliveryConsole from './DriverOutboundDeliveryConsole';

export default function DriverInboundPickupConsole() {
  const { currentUser, authLoading, logout } = useApp();
  const router = useRouter();

  const canAccessDriver = Boolean(
    currentUser?.roles?.includes('ROLE_DRIVER') || currentUser?.roles?.includes('ROLE_ADMIN')
  );

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.replace('/dang-nhap');
      return;
    }
    if (!canAccessDriver) {
      router.replace(portalFor(currentUser.roles || []));
    }
  }, [authLoading, currentUser, canAccessDriver, router]);

  const [consoleMode, setConsoleMode] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');
  const [trips, setTrips] = useState<PickupTripDto[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Stop loading modal / drawer state
  const [activeStopModal, setActiveStopModal] = useState<PickupTripStopDto | null>(null);
  const [actualWeight, setActualWeight] = useState<string>('');
  const [actualPackages, setActualPackages] = useState<string>('');
  const [stopNotes, setStopNotes] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');

  // Issue reporting modal
  const [issueStopModal, setIssueStopModal] = useState<PickupTripStopDto | null>(null);
  const [issueReason, setIssueReason] = useState<string>('Đường rẫy sạt lở, xe không vào được');
  const [issueNotes, setIssueNotes] = useState<string>('');

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fleetDispatchApi.getMyTrips();
      const tripList = Array.isArray(res) ? res : [];
      setTrips(tripList);
      if (tripList.length > 0 && !selectedTripId) {
        // Ưu tiên chọn chuyến đang chạy (ON_TRIP hoặc ACKNOWLEDGED hoặc ASSIGNED)
        const activeTrip = tripList.find(t => ['ON_TRIP', 'RETURNING', 'ARRIVED_AT_WAREHOUSE', 'ACKNOWLEDGED', 'ASSIGNED'].includes(t.status)) || tripList[0];
        setSelectedTripId(activeTrip.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách chuyến xe');
    } finally {
      setLoading(false);
    }
  }, [selectedTripId]);

  useEffect(() => {
    loadTrips();
    // Subscribe realtime dispatch updates
    const unsub = b2bWebSocket.subscribeDispatch(() => {
      loadTrips();
    });
    return () => {
      unsub();
    };
  }, [loadTrips]);

  const selectedTrip = trips.find(t => t.id === selectedTripId) || null;

  // Giai đoạn 2: Tiếp nhận chuyến
  const handleAcknowledge = async (tripId: number) => {
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.acknowledgeTrip(tripId);
      setSuccessMsg('Đã xác nhận tiếp nhận chuyến xe phân công!');
      await loadTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tiếp nhận chuyến');
    } finally {
      setSubmitting(false);
    }
  };

  // Giai đoạn 3: Bắt đầu xuất bến (có modal xác nhận & chụp ảnh xe lên hàng)
  const [departModalTrip, setDepartModalTrip] = useState<PickupTripDto | null>(null);
  const [departurePhotoUrl, setDeparturePhotoUrl] = useState<string>('');
  const [departureNotes, setDepartureNotes] = useState<string>('Đã kiểm tra xe lạnh và sẵn sàng xuất bến đi thu gom.');

  const openDepartModal = (trip: PickupTripDto) => {
    setDepartModalTrip(trip);
    setDeparturePhotoUrl('');
    setDepartureNotes('Đã kiểm tra xe lạnh và sẵn sàng xuất bến đi thu gom.');
    setError(null);
  };

  const handleConfirmDepart = async () => {
    if (!departModalTrip) return;
    if (!departurePhotoUrl) {
      setError('Vui lòng chụp ảnh xe trước khi xuất bến đi thu gom');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.departTrip(departModalTrip.id);
      setDepartModalTrip(null);
      setSuccessMsg('Đã xuất bến thành công! Hệ thống đã thông báo cho nhà vườn.');
      await loadTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xuất bến');
    } finally {
      setSubmitting(false);
    }
  };

  // Giai đoạn 4.1: Đến điểm dừng rẫy
  const handleArriveStop = async (stopId: number) => {
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.arriveStop(stopId);
      setSuccessMsg('Đã xác nhận đến điểm rẫy nhà vườn!');
      await loadTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi cập nhật điểm đến');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal bốc hàng
  const openLoadModal = (stop: PickupTripStopDto) => {
    setActiveStopModal(stop);
    setActualWeight(String(stop.weightKg || ''));
    setActualPackages(String(stop.packageCount || ''));
    setStopNotes('');
    setPhotoUrl('');
  };

  // Giai đoạn 4.2: Xác nhận bốc hàng
  const handleConfirmLoad = async () => {
    if (!activeStopModal) return;
    const weightNum = parseFloat(actualWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setError('Vui lòng nhập khối lượng thực tế hợp lệ (kg)');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.loadStop(activeStopModal.id, {
        actualWeightKg: weightNum,
        actualPackageCount: actualPackages ? parseInt(actualPackages, 10) : activeStopModal.packageCount,
        handoverPhotoUrl: photoUrl || undefined,
        notes: stopNotes || undefined,
      });

      // Đồng bộ ngay lập tức sang BroadcastChannel & LocalStorage
      const cId = activeStopModal.contractId || (activeStopModal as any).contractCode;
      if (cId) {
        try {
          adminFarmHandover(cId, { handoverTemp: 18 });
        } catch (e) {
          console.warn('Sync farm handover failed:', e);
        }
      }

      // Phát sự kiện STOMP WebSocket tới các trang điều phối & hợp đồng
      try {
        b2bWebSocket.publish('/topic/dispatch', {
          action: 'STOP_LOADED',
          stopId: activeStopModal.id,
          tripId: selectedTripId,
        });
        b2bWebSocket.publish('/topic/contracts', {
          action: 'IN_TRANSIT_HUB',
          contractId: activeStopModal.contractId,
          contractCode: (activeStopModal as any).contractCode,
        });
      } catch (wsErr) {
        console.warn('WebSocket publish warning:', wsErr);
      }

      setSuccessMsg(`Đã xác nhận bốc hàng thành công cho rẫy ${activeStopModal.farmerName}!`);
      setActiveStopModal(null);
      await loadTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xác nhận bốc hàng');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal báo sự cố
  const openIssueModal = (stop: PickupTripStopDto) => {
    setIssueStopModal(stop);
    setIssueReason('Đường rẫy sạt lở, xe không vào được');
    setIssueNotes('');
  };

  // Giai đoạn 5: Báo sự cố
  const handleReportIssue = async () => {
    if (!issueStopModal) return;
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.reportStopIssue(issueStopModal.id, {
        issueReason,
        issueNotes: issueNotes || undefined,
      });
      setSuccessMsg('Đã gửi cảnh báo sự cố đến điều phối viên trung tâm!');
      setIssueStopModal(null);
      await loadTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi báo sự cố');
    } finally {
      setSubmitting(false);
    }
  };

  // Giai đoạn 6: Xe quay về kho
  const handleReturnHub = async (tripId: number) => {
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.returnToHub(tripId);
      setSuccessMsg('Đã chuyển trạng thái xe quay về Hub. Bộ phận tiếp nhận kho đã nhận thông báo!');
      await loadTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi cập nhật về Hub');
    } finally {
      setSubmitting(false);
    }
  };

  // Tính toán tiến độ các điểm dừng
  const stops = selectedTrip?.stops || [];
  const totalStops = stops.length;
  const loadedStops = stops.filter(s => s.status === 'LOADED').length;
  const issueStops = stops.filter(s => s.status === 'ISSUE_REPORTED').length;
  const progressPercent = totalStops > 0 ? Math.round((loadedStops / totalStops) * 100) : 0;
  const allStopsHandled = totalStops > 0 && stops.every(s => ['LOADED', 'SKIPPED', 'CANCELLED'].includes(s.status));

  return (
    <main className="min-h-screen bg-[#F4F6F0] text-slate-900 pb-12">
      {/* 1. TOP NAVIGATION BAR */}
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
              Tài Xế Lạnh
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadTrips}
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

      <div className="max-w-4xl mx-auto px-4 pt-20 space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-[#10542C] flex items-center justify-center font-bold shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-900 truncate">
                  {currentUser?.fullName || 'Tài xế chuyên trách'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                  HoNa Cold Express
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <strong className="font-mono text-slate-700">{currentUser?.phone || '0901.888.xxx'}</strong>
              </p>
            </div>
          </div>

          {selectedTrip && (
            <div className="bg-slate-50 sm:bg-transparent border border-slate-200/80 sm:border-0 rounded-xl px-3 py-2 sm:p-0 flex items-center justify-between sm:block sm:text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Xe phân công</span>
              <div className="text-right">
                <span className="font-mono font-black text-slate-900 text-sm sm:text-base">{selectedTrip.vehicle?.plateNumber}</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 block">{selectedTrip.vehicle?.vehicleModel}</span>
              </div>
            </div>
          )}
        </div>

        {/* Chuyển chế độ Vận chuyển: Inbound Thu Gom vs Outbound Xuất Giao */}
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-200/80 p-1 font-bold text-xs">
          <button
            onClick={() => setConsoleMode('INBOUND')}
            className={`py-2.5 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              consoleMode === 'INBOUND' ? 'bg-[#10542C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4 shrink-0" />
            <span>Thu Gom Rẫy</span>
            <span className="hidden sm:inline">(Inbound)</span>
            {trips.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${consoleMode === 'INBOUND' ? 'bg-emerald-700 text-white' : 'bg-slate-300 text-slate-700'}`}>
                {trips.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setConsoleMode('OUTBOUND')}
            className={`py-2.5 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              consoleMode === 'OUTBOUND' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span>Giao Hàng ePOD</span>
            <span className="hidden sm:inline">(Outbound)</span>
          </button>
        </div>

        {consoleMode === 'OUTBOUND' ? (
          <DriverOutboundDeliveryConsole />
        ) : (
          <>
            {/* Thông báo Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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

        {/* Chọn chuyến nếu có nhiều chuyến */}
        {trips.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 shrink-0">Chuyến xe:</span>
            {trips.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTripId(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition shrink-0 cursor-pointer ${
                  selectedTripId === t.id
                    ? 'bg-[#10542C] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.tripCode} ({t.status})
              </button>
            ))}
          </div>
        )}

        {/* Chưa có chuyến */}
        {!loading && trips.length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Không có chuyến lấy hàng nào đang chờ</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Bạn đang ở trạng thái sẵn sàng. Khi điều phối viên trung tâm gán chuyến lấy hàng mới, thông tin sẽ xuất hiện ngay tại đây.
            </p>
          </div>
        )}

        {/* Chi tiết chuyến xe đang chọn */}
        {selectedTrip && (
          <div className="space-y-4">
            {/* Banner trạng thái & Tiến trình 7 giai đoạn */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-2xl bg-[#10542C] text-white flex items-center justify-center font-bold shrink-0">
                    <Navigation className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm sm:text-base text-slate-900 whitespace-nowrap">{selectedTrip.tripCode}</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase whitespace-nowrap ${
                        selectedTrip.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : selectedTrip.status === 'RETURNING'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : selectedTrip.status === 'ARRIVED_AT_WAREHOUSE'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : selectedTrip.status === 'ON_TRIP'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : selectedTrip.status === 'ACKNOWLEDGED'
                          ? 'bg-teal-100 text-teal-800 border border-teal-300'
                          : 'bg-slate-100 text-slate-800 border border-slate-300'
                      }`}>
                        {selectedTrip.status === 'COMPLETED' ? 'Đã hoàn tất nhập kho' :
                         selectedTrip.status === 'RETURNING' ? 'Đang quay về Hub' :
                         selectedTrip.status === 'ARRIVED_AT_WAREHOUSE' ? 'Đã đến cổng kho' :
                         selectedTrip.status === 'ON_TRIP' ? 'Đang thu gom trên đường' :
                         selectedTrip.status === 'ACKNOWLEDGED' ? 'Đã tiếp nhận (Sẵn sàng xuất bến)' :
                         'Đã phân công xe (Chờ nhận)'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Kho xuất phát: <strong className="text-slate-700">{selectedTrip.warehouse?.hubName || 'Hub Lâm Đồng'}</strong>
                    </span>
                  </div>
                </div>

                {/* NÚT THAO TÁC THEO GIAI ĐOẠN */}
                <div className="flex items-center gap-2">
                  {selectedTrip.status === 'ASSIGNED' && (
                    <button
                      onClick={() => handleAcknowledge(selectedTrip.id)}
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Tiếp Nhận Chuyến</span>
                    </button>
                  )}

                  {selectedTrip.status === 'ACKNOWLEDGED' && (
                    <button
                      onClick={() => openDepartModal(selectedTrip)}
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Truck className="w-4 h-4 text-emerald-300" />
                      <span>Xuất Bến Đi Lấy Hàng</span>
                    </button>
                  )}

                  {selectedTrip.status === 'ON_TRIP' && allStopsHandled && (
                    <button
                      onClick={() => handleReturnHub(selectedTrip.id)}
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Bắt Đầu Quay Về Hub</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Thanh tiến độ lộ trình */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold">
                    Tiến độ thu gom: <strong className="text-[#10542C] font-mono">{loadedStops}/{totalStops} rẫy đã bốc</strong>
                    {issueStops > 0 && <span className="text-rose-600 font-bold ml-2">({issueStops} rẫy báo sự cố)</span>}
                  </span>
                  <span className="font-mono font-bold text-emerald-800">{progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* DANH SÁCH LỘ TRÌNH CÁC ĐIỂM DỪNG RẪY */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Danh sách điểm dừng lấy hàng ({totalStops} điểm theo thứ tự tối ưu)</span>
                </h3>
              </div>

              {stops.map((stop) => {
                const isLoaded = stop.status === 'LOADED';
                const isArrived = stop.status === 'ARRIVED';
                const isIssue = stop.status === 'ISSUE_REPORTED';
                const isPending = stop.status === 'PENDING';

                return (
                  <div
                    key={stop.id}
                    className={`bg-white rounded-3xl p-5 border transition-all shadow-xs space-y-3.5 ${
                      isLoaded
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : isIssue
                        ? 'border-rose-300 bg-rose-50/30'
                        : isArrived
                        ? 'border-blue-300 ring-2 ring-blue-100'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Header Điểm dừng */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-xl font-mono text-xs font-black flex items-center justify-center ${
                          isLoaded
                            ? 'bg-emerald-600 text-white'
                            : isIssue
                            ? 'bg-rose-600 text-white'
                            : isArrived
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-white'
                        }`}>
                          {stop.stopOrder}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{stop.farmerName}</h4>
                          <span className="text-[11px] text-slate-500">Mã HĐ: <strong className="font-mono text-slate-700">{stop.contract?.contractCode || `HĐ-${stop.contractId}`}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isLoaded && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>ĐÃ BỐC {stop.actualWeightKg || stop.weightKg} KG</span>
                          </span>
                        )}
                        {isArrived && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            ĐÃ TỚI RẪY (ĐANG KIỂM HÀNG)
                          </span>
                        )}
                        {isIssue && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>SỰ CỐ: {stop.issueReason}</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            CHỜ ĐẾN ĐÓN
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Địa chỉ và Liên hệ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Địa chỉ đón hàng</span>
                        <p className="text-slate-800 font-medium">{stop.pickupAddress}</p>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(stop.pickupAddress)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-700 font-bold hover:underline pt-0.5"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Dẫn đường Google Maps</span>
                        </a>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Liên hệ & Hàng hóa</span>
                        <div className="flex items-center justify-between">
                          <span>SĐT Nhà Vườn:</span>
                          <a href={`tel:${stop.contactPhone}`} className="font-mono font-bold text-emerald-800 hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{stop.contactPhone}</span>
                          </a>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Khối lượng kế hoạch:</span>
                          <strong className="font-mono text-slate-900">{stop.weightKg} kg ({stop.packageCount} kiện)</strong>
                        </div>
                      </div>
                    </div>

                    {/* Chi tiết sự cố nếu có */}
                    {isIssue && stop.issueNotes && (
                      <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
                        <strong>Ghi chú sự cố:</strong> {stop.issueNotes}
                      </div>
                    )}

                    {/* NÚT THAO TÁC ĐIỂM DỪNG */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      {/* Báo sự cố */}
                      {!isLoaded && (
                        <button
                          type="button"
                          onClick={() => openIssueModal(stop)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Báo Sự Cố</span>
                        </button>
                      )}

                      {/* Xác nhận đã đến rẫy */}
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleArriveStop(stop.id)}
                          disabled={submitting}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Xác Nhận Đã Đến Rẫy</span>
                        </button>
                      )}

                      {/* Xác nhận bốc hàng */}
                      {(isArrived || isPending) && (
                        <button
                          type="button"
                          onClick={() => openLoadModal(stop)}
                          disabled={submitting}
                          className="px-4 py-1.5 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Boxes className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Cân Hàng & Bốc Lên Xe</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* 2. MODAL XÁC NHẬN BỐC HÀNG & CÂN THỰC TẾ (GIAI ĐOẠN 4) */}
      {activeStopModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#10542C]">
                <Boxes className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Xác Nhận Cân & Bốc Hàng Tại Rẫy
                </h3>
              </div>
              <button
                onClick={() => setActiveStopModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
              <p><strong>Nhà vườn:</strong> {activeStopModal.farmerName}</p>
              <p><strong>Khối lượng dự kiến:</strong> {activeStopModal.weightKg} kg ({activeStopModal.packageCount} kiện)</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Khối lượng thực tế cân tại rẫy (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={actualWeight}
                  onChange={(e) => setActualWeight(e.target.value)}
                  placeholder="Ví dụ: 1250"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold text-emerald-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Số kiện / sọt thực tế
                </label>
                <input
                  type="number"
                  value={actualPackages}
                  onChange={(e) => setActualPackages(e.target.value)}
                  placeholder="Ví dụ: 50"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm focus:outline-emerald-600"
                />
              </div>

              <div>
                <ImageUploadField
                  name="handoverPhotoUrl"
                  label="Ảnh biên bản bàn giao / Ảnh chụp sọt hàng"
                  value={photoUrl}
                  onChange={(url) => setPhotoUrl(url)}
                  purpose="EPOD"
                  hint="Chụp trực tiếp bằng camera hoặc tải ảnh biên bản có chữ ký nông dân"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Ghi chú kiểm tra ngoại quan tại rẫy
                </label>
                <textarea
                  rows={2}
                  value={stopNotes}
                  onChange={(e) => setStopNotes(e.target.value)}
                  placeholder="Ví dụ: Rau tươi, đóng thùng xốp đạt chuẩn, nhiệt độ đo lúc bốc 18°C..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveStopModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmLoad}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Hoàn Tất Bốc Hàng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL BÁO CÁO SỰ CỐ TẠI RẪY (GIAI ĐOẠN 5) */}
      {issueStopModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-800">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Báo Cáo Sự Cố Tại Rẫy Nông Dân
                </h3>
              </div>
              <button
                onClick={() => setIssueStopModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100 text-xs text-rose-900">
              <strong>Điểm dừng:</strong> {issueStopModal.farmerName} — {issueStopModal.pickupAddress}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Lý do sự cố *
                </label>
                <select
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-emerald-600"
                >
                  <option value="Đường rẫy sạt lở, xe không vào được">Đường rẫy sạt lở, xe không vào được</option>
                  <option value="Thời tiết mưa lớn, ngập úng không thể bốc hàng">Thời tiết mưa lớn, ngập úng không thể bốc hàng</option>
                  <option value="Nhà vườn chưa thu hoạch / đóng gói xong">Nhà vườn chưa thu hoạch / đóng gói xong</option>
                  <option value="Không liên lạc được với nhà vườn qua SĐT">Không liên lạc được với nhà vườn qua SĐT</option>
                  <option value="Hàng hóa không đúng chủng loại / quy cách cam kết">Hàng hóa không đúng chủng loại / quy cách cam kết</option>
                  <option value="Khác">Lý do khác</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mô tả chi tiết và hướng xử lý đề xuất
                </label>
                <textarea
                  rows={3}
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="Chi tiết tình trạng thực tế..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIssueStopModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReportIssue}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Gửi Cảnh Báo Cho Điều Phối</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL XÁC NHẬN XUẤT BẾN & CHỤP ẢNH XE LÊN HÀNG (INBOUND) */}
      {departModalTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-start gap-2 text-[#10542C] min-w-0">
                <Camera className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                    Xác Nhận Xe Xuất Bến Đi Lấy Hàng
                  </h3>
                  <span className="font-mono text-xs font-bold text-emerald-700">{departModalTrip.tripCode}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDepartModalTrip(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-lg font-bold flex items-center justify-center shrink-0 cursor-pointer"
              >
                ×
              </button>
            </div>

            <ImageUploadField
              name="inboundDeparturePhoto"
              label="Ảnh chụp xe lên hàng / kiểm tra thùng lạnh *"
              value={departurePhotoUrl}
              onChange={(url) => setDeparturePhotoUrl(url)}
              purpose="EPOD"
              hint="Chụp trực tiếp bằng camera hình ảnh xe trước khi xuất bến"
            />

            <div className="text-xs">
              <label className="font-bold text-slate-700 block mb-1">Ghi chú xuất bến</label>
              <textarea
                rows={2}
                value={departureNotes}
                onChange={(e) => setDepartureNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-emerald-600"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDepartModalTrip(null)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDepart}
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-3 sm:py-2 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Truck className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>{submitting ? 'Đang xuất bến...' : 'Xác Nhận Xuất Bến'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
