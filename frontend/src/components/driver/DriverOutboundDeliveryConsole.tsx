'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  Boxes,
  UserCheck,
  Send,
  X,
  FileCheck2,
} from 'lucide-react';
import {
  fleetDispatchApi,
  OutboundDeliveryTripDto,
  OutboundDeliveryStopDto,
  DriverOutboundEpodRequest,
} from '@/services/fleetDispatchApi';
import { b2bWebSocket } from '@/services/websocketService';
import ImageUploadField from '@/components/ImageUploadField';
import { geocodeAddress, Coordinates } from '@/services/goongMapService';

export default function DriverOutboundDeliveryConsole() {
  const [trips, setTrips] = useState<OutboundDeliveryTripDto[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal ePOD state
  const [activeStopModal, setActiveStopModal] = useState<OutboundDeliveryStopDto | null>(null);
  const [actualWeight, setActualWeight] = useState<string>('');
  const [rejectedWeight, setRejectedWeight] = useState<string>('0');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [driverSignature, setDriverSignature] = useState<string>('');
  const [handoverPhotoUrl, setHandoverPhotoUrl] = useState<string>('');
  const [driverNotes, setDriverNotes] = useState<string>('');

  const loadTrips = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await fleetDispatchApi.getMyOutboundTrips();
      const list = Array.isArray(res) ? res : [];
      setTrips(list);
      if (list.length > 0 && !selectedTripId) {
        // Ưu tiên chọn chuyến ON_DELIVERY hoặc ASSIGNED
        const activeTrip = list.find((t) => ['ON_DELIVERY', 'ASSIGNED'].includes(t.status)) || list[0];
        setSelectedTripId(activeTrip.id);
      }
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Không tải được danh sách chuyến xuất giao');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedTripId]);

  useEffect(() => {
    loadTrips();
    const unsubDispatch = b2bWebSocket.subscribeDispatch(() => {
      void loadTrips(true);
    });
    const unsubContracts = b2bWebSocket.subscribeContracts(() => {
      void loadTrips(true);
    });
    const onFocusOrVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void loadTrips(true);
      }
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    const syncTimer = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void loadTrips(true);
      }
    }, 10000);
    return () => {
      unsubDispatch();
      unsubContracts();
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      window.clearInterval(syncTimer);
    };
  }, [loadTrips]);

  const selectedTrip = trips.find((t) => t.id === selectedTripId) || null;
  const [stopCoordsMap, setStopCoordsMap] = useState<Record<number, Coordinates>>({});

  useEffect(() => {
    const stops = selectedTrip?.stops || [];
    if (stops.length === 0) return;
    let cancelled = false;
    stops.forEach((s) => {
      if ((s as any).deliveryLat && (s as any).deliveryLng) return;
      if (stopCoordsMap[s.id] || !s.deliveryAddressSnapshot) return;
      geocodeAddress(s.deliveryAddressSnapshot).then((coords) => {
        if (coords && !cancelled) {
          setStopCoordsMap((prev) => ({ ...prev, [s.id]: coords }));
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedTrip?.id, selectedTrip?.stops]);

  // Modal xác nhận xuất bến + chụp ảnh xe lên hàng
  const [departModalTrip, setDepartModalTrip] = useState<OutboundDeliveryTripDto | null>(null);
  const [departurePhotoUrl, setDeparturePhotoUrl] = useState<string>('');
  const [departureNotes, setDepartureNotes] = useState<string>('Đã kiểm tra đủ hàng lên xe lạnh và sẵn sàng xuất bến giao Thương lái.');

  // Theo dõi & phát GPS trực tiếp khi chuyến đang giao hàng (ON_DELIVERY)
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const lastGpsSentRef = React.useRef<number>(0);

  const mapGeoError = (err: GeolocationPositionError) => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return 'Trình duyệt chặn GPS do đang mở qua HTTP (cần HTTPS hoặc localhost).';
    }
    if (err.code === 1) return 'Chưa cấp quyền Vị trí (GPS) cho trình duyệt.';
    if (err.code === 2) return 'Thiết bị chưa thu được tín hiệu GPS.';
    if (err.code === 3) return 'Quá thời gian chờ định vị GPS.';
    return 'Không lấy được tọa độ GPS.';
  };

  const requestCurrentGps = useCallback((tripId: number) => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setGpsActive(false);
      setGpsError('Trình duyệt chặn GPS do đang mở qua HTTP (cần HTTPS hoặc localhost).');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsActive(false);
      setGpsError('Thiết bị không hỗ trợ định vị GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsCoords({ lat, lng });
        setGpsAccuracy(pos.coords.accuracy ?? null);
        setGpsActive(true);
        setGpsError(null);
        lastGpsSentRef.current = Date.now();
        void fleetDispatchApi.updateTripGps(tripId, lat, lng).catch(() => {});
      },
      (err) => {
        setGpsActive(false);
        setGpsError(mapGeoError(err));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    if (!selectedTrip || selectedTrip.status !== 'ON_DELIVERY') {
      setGpsActive(false);
      setGpsError(null);
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setGpsActive(false);
      setGpsError('Trình duyệt chặn GPS do đang mở qua HTTP (cần HTTPS hoặc localhost).');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsActive(false);
      setGpsError('Thiết bị không hỗ trợ định vị GPS.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsCoords({ lat, lng });
        setGpsAccuracy(pos.coords.accuracy ?? null);
        setGpsActive(true);
        setGpsError(null);
        const now = Date.now();
        if (now - lastGpsSentRef.current >= 10000) {
          lastGpsSentRef.current = now;
          void fleetDispatchApi.updateTripGps(selectedTrip.id, lat, lng).catch(() => {});
        }
      },
      (err) => {
        setGpsActive(false);
        setGpsError(mapGeoError(err));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [selectedTrip?.id, selectedTrip?.status]);

  // 1. Xuất phát chuyến giao (có ảnh xác nhận xe lên hàng & bật GPS)
  const openDepartModal = (trip: OutboundDeliveryTripDto) => {
    setDepartModalTrip(trip);
    setDeparturePhotoUrl(trip.departurePhotoUrl || '');
    setDepartureNotes('Đã kiểm tra đủ hàng lên xe lạnh và sẵn sàng xuất bến giao Thương lái.');
    setError(null);
  };

  const handleConfirmDepart = async () => {
    if (!departModalTrip) return;
    if (!departurePhotoUrl) {
      setError('Vui lòng chụp ảnh xe lên hàng trước khi xuất bến');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.departOutboundTrip(departModalTrip.id, {
        departurePhotoUrl,
        notes: departureNotes,
      });
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            void fleetDispatchApi.updateTripGps(departModalTrip.id, pos.coords.latitude, pos.coords.longitude).catch(() => {});
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
      setDepartModalTrip(null);
      setSuccessMsg('Chuyến xe đã chính thức xuất bến và bật GPS! Trạng thái đơn hàng đã chuyển sang Đang Giao Hàng.');
      await loadTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi bắt đầu chuyến xe');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Xác nhận đã đến điểm dừng
  const handleArriveStop = async (stopId: number) => {
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.arriveOutboundStop(stopId);
      setSuccessMsg('Đã xác nhận xe đã đến kho của Buyer!');
      await loadTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xác nhận đến điểm dừng');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Mở Modal lập biên bản ePOD
  const openEpodModal = (stop: OutboundDeliveryStopDto) => {
    setActiveStopModal(stop);
    setActualWeight(String(stop.actualDeliveredWeightKg || stop.expectedWeightKg || ''));
    setRejectedWeight(String(stop.rejectedWeightKg || '0'));
    setRejectionReason(stop.rejectionReason || '');
    setDriverSignature(stop.driverSignatureData || 'Tài xế đã bàn giao đầy đủ hàng hóa tại kho');
    setHandoverPhotoUrl(stop.handoverPhotoUrl || '');
    setDriverNotes(stop.driverNotes || '');
  };

  // 4. Nộp biên bản ePOD
  const handleSubmitEpod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStopModal) return;

    const deliveredKg = parseFloat(actualWeight);
    const rejectedKg = parseFloat(rejectedWeight) || 0;

    if (isNaN(deliveredKg) || deliveredKg <= 0) {
      setError('Vui lòng nhập khối lượng thực giao hợp lệ (> 0 kg)');
      return;
    }

    if (rejectedKg > 0 && !rejectionReason.trim()) {
      setError('Vui lòng ghi rõ lý do từ chối/hư hao khi khối lượng hư hao > 0');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const req: DriverOutboundEpodRequest = {
        actualDeliveredWeightKg: deliveredKg,
        rejectedWeightKg: rejectedKg,
        rejectionReason: rejectedKg > 0 ? rejectionReason.trim() : undefined,
        driverSignatureData: driverSignature.trim() || 'Xác nhận chữ ký điện tử từ tài xế',
        driverNotes: driverNotes.trim() || undefined,
        handoverPhotoUrl: handoverPhotoUrl.trim() || undefined,
      };

      await fleetDispatchApi.submitDriverOutboundEpod(activeStopModal.id, req);
      setSuccessMsg(`Đã nộp biên bản ePOD cho hợp đồng ${activeStopModal.contractCode || activeStopModal.contractId}. Chờ Buyer ký xác nhận!`);
      setActiveStopModal(null);
      await loadTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi nộp biên bản ePOD');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Thông báo lỗi / thành công */}
      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selector Chuyến Xe */}
      {trips.length > 1 && (
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Chọn chuyến xuất giao Outbound ({trips.length} chuyến)
          </label>
          <div className="flex flex-wrap gap-2">
            {trips.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTripId(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  t.id === selectedTripId
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{t.tripCode}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    t.status === 'ON_DELIVERY'
                      ? 'bg-amber-400 text-amber-950'
                      : t.status === 'COMPLETED'
                      ? 'bg-emerald-400 text-emerald-950'
                      : 'bg-blue-400 text-blue-950'
                  }`}
                >
                  {t.status === 'ASSIGNED'
                    ? 'Chờ xuất bến'
                    : t.status === 'ON_DELIVERY'
                    ? 'Đang giao hàng'
                    : t.status === 'COMPLETED'
                    ? 'Hoàn tất'
                    : t.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nội dung chi tiết chuyến xe */}
      {selectedTrip ? (
        <div className="space-y-4">
          {/* Header Chuyến */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-mono text-blue-700 font-bold block">{selectedTrip.tripCode}</span>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>Xuất Giao Thương Lái</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      selectedTrip.status === 'ON_DELIVERY'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : selectedTrip.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                    }`}
                  >
                    {selectedTrip.status === 'ASSIGNED'
                      ? 'ĐÃ PHÂN CÔNG'
                      : selectedTrip.status === 'ON_DELIVERY'
                      ? 'ĐANG GIAO HÀNG'
                      : selectedTrip.status === 'COMPLETED'
                      ? 'HOÀN TẤT CHUYẾN'
                      : selectedTrip.status}
                  </span>
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedTrip.status === 'ON_DELIVERY' && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border ${
                      gpsActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${gpsActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      <span>
                        {gpsActive
                          ? `GPS Đang Bật${gpsAccuracy != null ? ` (±${Math.round(gpsAccuracy)}m)` : ''}`
                          : (gpsError || 'Đang chờ tín hiệu GPS...')}
                      </span>
                      {gpsCoords && (
                        <span className="font-mono text-[9px] text-emerald-700 hidden sm:inline">
                          ({gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)})
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => requestCurrentGps(selectedTrip.id)}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition"
                    >
                      {gpsActive ? 'Cập nhật GPS' : 'Thử bật GPS'}
                    </button>
                  </div>
                )}

                {selectedTrip.status === 'ASSIGNED' && (() => {
                  const isWarehousePickedReady =
                    (selectedTrip.stops || []).length > 0 &&
                    (selectedTrip.stops || []).every((s) => {
                      const fs = String((s.contract as any)?.fulfillmentStatus || (s.contract as any)?.fulfillment_status || '').toUpperCase();
                      const st = String((s.contract as any)?.status || '').toUpperCase();
                      return fs === 'PICKED_FROM_BIN' || fs === 'OUTBOUND_DISPATCHED' || st === 'OUTBOUND_DISPATCHED';
                    });
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      {!isWarehousePickedReady && (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          <span>Chờ nhân viên kho soạn hàng xong...</span>
                        </span>
                      )}
                      <button
                        onClick={() => openDepartModal(selectedTrip)}
                        disabled={submitting || !isWarehousePickedReady}
                        title={!isWarehousePickedReady ? 'Nhân viên kho chưa hoàn tất soạn hàng tại kệ' : 'Ký hợp đồng vận chuyển & xuất kho'}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Bắt Đầu Chuyến Xuất Giao</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Thông tin xe & tải trọng */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Biển số xe:</span>
                <strong className="text-slate-800 font-mono text-sm">{selectedTrip.vehicle?.plateNumber}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Trạm xuất phát:</span>
                <strong className="text-slate-800 truncate block">{selectedTrip.hub?.hubName}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Tổng tải xuất:</span>
                <strong className="text-blue-700 text-sm">
                  {Number(selectedTrip.totalLoadedWeightKg || 0).toLocaleString()} kg
                </strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Số điểm dừng:</span>
                <strong className="text-slate-800 text-sm">{selectedTrip.stops?.length || 0} kho Buyer</strong>
              </div>
            </div>
          </div>

          {/* Danh sách các Điểm dừng (Stops) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              Lộ Trình Các Điểm Giao Hàng ({selectedTrip.stops?.length || 0} điểm)
            </h4>

            {selectedTrip.stops && selectedTrip.stops.length > 0 ? (
              selectedTrip.stops.map((stop, idx) => {
                const isArrived = stop.status === 'ARRIVED';
                const isPendingBuyer = stop.status === 'PENDING_BUYER_CONFIRMATION';
                const isConfirmed = stop.status === 'BUYER_CONFIRMED';
                const isAssigned = stop.status === 'ASSIGNED' || stop.status === 'PLANNED';

                return (
                  <div
                    key={stop.id}
                    className={`bg-white rounded-2xl p-4 border transition ${
                      isConfirmed
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : isPendingBuyer
                        ? 'border-amber-200 bg-amber-50/20'
                        : isArrived
                        ? 'border-blue-200 bg-blue-50/20 shadow-xs'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {stop.stopSequence || idx + 1}
                          </span>
                          <span className="font-mono font-bold text-xs text-blue-700">
                            {stop.contractCode || `HĐ #${stop.contractId}`}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                              isConfirmed
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPendingBuyer
                                ? 'bg-amber-100 text-amber-800'
                                : isArrived
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isConfirmed
                              ? 'THƯƠNG LÁI ĐÃ KÝ NHẬN'
                              : isPendingBuyer
                              ? 'CHỜ THƯƠNG LÁI XÁC NHẬN'
                              : isArrived
                              ? 'ĐÃ ĐẾN ĐIỂM GIAO'
                              : 'CHỜ ĐẾN'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 flex items-start gap-1.5 pt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{(stop as any).resolvedDeliveryAddress || stop.deliveryAddressSnapshot}</span>
                        </div>

                        {(stop.contactNameSnapshot || stop.contactPhoneSnapshot) && (
                          <div className="text-xs text-slate-600 flex items-center gap-3 pt-0.5">
                            {stop.contactNameSnapshot && <span>Người nhận: <strong>{stop.contactNameSnapshot}</strong></span>}
                            {stop.contactPhoneSnapshot && (
                              <a
                                href={`tel:${stop.contactPhoneSnapshot}`}
                                className="text-blue-600 hover:underline flex items-center gap-1 font-mono font-bold"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{stop.contactPhoneSnapshot}</span>
                              </a>
                            )}
                          </div>
                        )}

                        <div className="text-xs pt-1 flex items-center gap-4 text-slate-600">
                          <span>
                            Dự kiến giao: <strong className="text-slate-800">{Number(stop.expectedWeightKg).toLocaleString()} kg</strong>
                          </span>
                          {stop.actualDeliveredWeightKg != null && (
                            <span>
                              Thực giao Q4: <strong className="text-emerald-700">{Number(stop.actualDeliveredWeightKg).toLocaleString()} kg</strong>
                            </span>
                          )}
                          {Number(stop.rejectedWeightKg || 0) > 0 && (
                            <span className="text-rose-600 font-bold">
                              Hao hụt/Hư hại: {Number(stop.rejectedWeightKg).toLocaleString()} kg
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Nút hành động */}
                      <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                        {((stop as any).resolvedDeliveryAddress || stop.deliveryAddressSnapshot || ((stop as any).deliveryLat && (stop as any).deliveryLng)) && (() => {
                          const resolvedAddr = (stop as any).resolvedDeliveryAddress || stop.deliveryAddressSnapshot;
                          const destinationParam = resolvedAddr
                            ? encodeURIComponent(resolvedAddr)
                            : `${(stop as any).deliveryLat},${(stop as any).deliveryLng}`;
                          return (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${destinationParam}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs flex items-center gap-1.5 transition"
                            >
                              <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span>Mở Google Maps</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          );
                        })()}

                        {isAssigned && selectedTrip.status === 'ON_DELIVERY' && (
                          <button
                            onClick={() => handleArriveStop(stop.id)}
                            disabled={submitting}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Đã Đến Điểm Giao</span>
                          </button>
                        )}

                        {isArrived && (
                          <button
                            onClick={() => openEpodModal(stop)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Lập Biên Bản Giao Hàng</span>
                          </button>
                        )}

                        {isPendingBuyer && (
                          <div className="text-right">
                            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg font-bold block">
                              Đã nộp biên bản · Chờ Thương lái ký
                            </span>
                            <button
                              onClick={() => openEpodModal(stop)}
                              className="text-[11px] text-slate-500 hover:text-slate-800 underline mt-1"
                            >
                              Xem lại biên bản
                            </button>
                          </div>
                        )}

                        {isConfirmed && (
                          <div className="text-right">
                            <span className="text-[11px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Hoàn Tất Giao Nhận</span>
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Người nhận: {stop.buyerSignerName || 'Đại diện Buyer'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
                Chưa có điểm dừng giao hàng nào trong chuyến xe này.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 text-center text-xs text-slate-500 border border-slate-200 space-y-2">
          <Truck className="w-8 h-8 text-slate-400 mx-auto" />
          <p>Hiện bạn không có chuyến xe xuất giao Outbound nào được phân công.</p>
        </div>
      )}

      {/* MODAL LẬP BIÊN BẢN GIAO HÀNG & KÝ ePOD */}
      {activeStopModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Biên Bản Bàn Giao Điện Tử (ePOD)</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Hợp đồng: {activeStopModal.contractCode || `#${activeStopModal.contractId}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveStopModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEpod} className="space-y-3.5 text-xs">
              <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-100 space-y-1">
                <span className="text-slate-600 block">Địa chỉ kho giao:</span>
                <strong className="text-slate-900 block">{activeStopModal.deliveryAddressSnapshot}</strong>
                <span className="text-[11px] text-slate-500 block">
                  Khối lượng kế hoạch tại trạm: <strong>{Number(activeStopModal.expectedWeightKg).toLocaleString()} kg</strong>
                </span>
              </div>

              {/* Khối lượng thực giao (Q4) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Khối lượng thực giao bàn giao cho Buyer (kg) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={actualWeight}
                  onChange={(e) => setActualWeight(e.target.value)}
                  placeholder="VD: 500.5"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-bold text-slate-900 text-sm"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Sản lượng thực nhận (Q4) sẽ làm căn cứ chốt hợp đồng và giải ngân tài chính.
                </span>
              </div>

              {/* Khối lượng hư hao / từ chối */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Khối lượng hư hao / từ chối (kg nếu có)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={rejectedWeight}
                  onChange={(e) => setRejectedWeight(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-rose-500 font-bold text-rose-700"
                />
                {parseFloat(rejectedWeight) > 0 && (
                  <div className="mt-1 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Hệ thống sẽ tự động lập <strong>Biên bản Khiếu nại (Claim)</strong> và khóa quyết toán hợp đồng này cho đến khi giải quyết xong.
                    </span>
                  </div>
                )}
              </div>

              {parseFloat(rejectedWeight) > 0 && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Lý do hư hao / từ chối <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="VD: Dập nát trong thùng do xóc nảy, héo úa góc thùng..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs"
                  />
                </div>
              )}

              {/* Chữ ký tài xế xác nhận */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Chữ ký điện tử / Tên tài xế xác nhận bàn giao <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={driverSignature}
                  onChange={(e) => setDriverSignature(e.target.value)}
                  placeholder="Họ tên tài xế hoặc mã xác nhận chữ ký số"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 font-mono text-xs"
                />
              </div>

              {/* Ảnh chụp biên bản / hàng giao */}
              <div>
                <ImageUploadField
                  name="handoverPhotoUrl"
                  label="Ảnh chụp hàng giao / biên bản giấy"
                  value={handoverPhotoUrl}
                  onChange={(url) => setHandoverPhotoUrl(url)}
                  purpose="EPOD"
                  hint="Chụp trực tiếp hoặc chọn ảnh biên bản bàn giao tại kho Buyer"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi chú giao hàng</label>
                <textarea
                  rows={2}
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="Ghi chú thêm về điều kiện bảo quản, nhiệt độ thùng lạnh lúc giao..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveStopModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Nộp Biên Bản ePOD Lên Sàn</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Xác Nhận Xuất Bến & Chụp Ảnh Xe Lên Hàng */}
      {departModalTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-start gap-2 text-blue-800 min-w-0">
                <Camera className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                    Xác Nhận Xe Lên Hàng & Xuất Bến
                  </h3>
                  <span className="font-mono text-xs font-bold text-blue-700">{departModalTrip.tripCode}</span>
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

            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-xs text-blue-900 space-y-1">
              <p className="font-bold">Lưu ý trước khi xuất bến:</p>
              <p>Hệ thống sẽ chuyển trạng thái đơn hàng sang <strong>Đang giao hàng</strong> và tự động bật GPS để Thương lái &amp; Nhà vườn theo dõi hành trình.</p>
            </div>

            <ImageUploadField
              name="outboundDeparturePhoto"
              label="Ảnh chụp xe lên hàng tại kho *"
              value={departurePhotoUrl}
              onChange={(url) => setDeparturePhotoUrl(url)}
              purpose="EPOD"
              capture="environment"
              hint="Chụp trực tiếp bằng camera hình ảnh thùng xe đã xếp hàng trước khi rời kho"
            />

            <div className="text-xs">
              <label className="font-bold text-slate-700 block mb-1">Ghi chú xuất bến</label>
              <textarea
                rows={2}
                value={departureNotes}
                onChange={(e) => setDepartureNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-blue-600"
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
                className="w-full sm:w-auto px-5 py-3 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-4 h-4 shrink-0" />
                <span>{submitting ? 'Đang xuất bến...' : 'Xác Nhận Xuất Bến & Bật GPS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
