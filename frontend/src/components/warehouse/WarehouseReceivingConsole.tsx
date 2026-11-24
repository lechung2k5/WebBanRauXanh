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
} from 'lucide-react';
import {
  fleetDispatchApi,
  PickupTripDto,
  PickupTripStopDto,
  DEFAULT_OFFICIAL_HUBS,
  WarehouseHubDto,
} from '@/services/fleetDispatchApi';
import { useApp } from '@/context/AppContext';
import { b2bWebSocket } from '@/services/websocketService';

export default function WarehouseReceivingConsole() {
  const { currentUser, logout } = useApp();
  const router = useRouter();

  const [hubs] = useState<WarehouseHubDto[]>(DEFAULT_OFFICIAL_HUBS);
  const [selectedHubId, setSelectedHubId] = useState<number>(2); // Mặc định Hub Đức Trọng
  const [trips, setTrips] = useState<PickupTripDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Receiving Modal state
  const [activeReceivingTrip, setActiveReceivingTrip] = useState<PickupTripDto | null>(null);
  const [actualTotalWeight, setActualTotalWeight] = useState<string>('');
  const [actualTotalPackages, setActualTotalPackages] = useState<string>('');
  const [receivingNotes, setReceivingNotes] = useState<string>('');
  const [selectedColdZone, setSelectedColdZone] = useState<string>('Kho Mát A (15°C)');
  const [selectedBin, setSelectedBin] = useState<string>('BIN-IN-01');

  // Per-stop QC overrides
  const [lotQcMap, setLotQcMap] = useState<Record<number, { qualified: string; rejected: string; notes: string }>>({});

  const loadReceivingTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fleetDispatchApi.getReceivingTrips(selectedHubId);
      setTrips(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách chuyến tiếp nhận');
    } finally {
      setLoading(false);
    }
  }, [selectedHubId]);

  useEffect(() => {
    loadReceivingTrips();
    const unsub = b2bWebSocket.subscribeDispatch(() => {
      loadReceivingTrips();
    });
    return () => unsub();
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

      setSuccessMsg(`Đã hoàn tất tiếp nhận chuyến ${activeReceivingTrip.tripCode}! Xe và tài xế đã được giải phóng sẵn sàng.`);
      setActiveReceivingTrip(null);
      await loadReceivingTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi hoàn tất nhập kho');
    } finally {
      setSubmitting(false);
    }
  };

  const incomingTrips = trips.filter(t => ['RETURNING', 'ARRIVED_AT_WAREHOUSE', 'ON_TRIP'].includes(t.status));
  const completedTrips = trips.filter(t => t.status === 'COMPLETED');

  return (
    <main className="min-h-screen bg-[#F4F6F0] text-slate-900 pb-16">
      {/* 1. TOP NAVIGATION */}
      <header className="sticky top-0 z-40 bg-[#10542C] text-white px-4 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-white text-[#10542C] flex items-center justify-center font-black text-sm shadow-inner">
                HN
              </span>
              <span>HoNa Fresh</span>
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-800/80 border border-emerald-600/40 text-emerald-200 font-bold uppercase tracking-wider">
              Cổng Tiếp Nhận & QC Kho
            </span>
          </div>

          <div className="flex items-center gap-2">
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

      <div className="max-w-6xl mx-auto px-4 pt-4 space-y-4">
        {/* Hub Selector Banner */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#10542C] text-white flex items-center justify-center font-bold text-xl">
              <Warehouse className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Khu Vực Cổng Tiếp Nhận Chuỗi Lạnh
              </h2>
              <p className="text-xs text-slate-500">
                Thực hiện quy trình tiếp nhận, cân đối soát tải trọng và phân bổ buồng lạnh nhập kho (GĐ 7)
              </p>
            </div>
          </div>

          {/* Chọn Kho */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Trạm trung chuyển:</span>
            <select
              value={selectedHubId}
              onChange={(e) => setSelectedHubId(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-emerald-600"
            >
              {hubs.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  {hub.hubName}
                </option>
              ))}
            </select>
          </div>
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
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">{trip.tripCode}</span>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            isArrived
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : isReturning
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}>
                            {isArrived ? 'ĐÃ ĐẾN CỔNG KHO' : isReturning ? 'ĐANG QUAY VỀ KHO' : 'ĐANG LẤY HÀNG TRÊN ĐƯỜNG'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Khởi hành: {trip.departureTime ? new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Biển số</span>
                        <strong className="font-mono text-slate-900 text-sm">{trip.vehicle?.plateNumber}</strong>
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
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      {isReturning && (
                        <button
                          type="button"
                          onClick={() => handleConfirmArrival(trip.id)}
                          disabled={submitting}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Warehouse className="w-3.5 h-3.5" />
                          <span>Xe Đã Đến Cổng (GĐ 7.1)</span>
                        </button>
                      )}

                      {(isArrived || isReturning) && (
                        <button
                          type="button"
                          onClick={() => openReceivingModal(trip)}
                          disabled={submitting}
                          className="px-4 py-1.5 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Scale className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Kiểm Đếm & Nhập Kho (GĐ 7.2)</span>
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
              <div className="overflow-x-auto">
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
      </div>

      {/* 4. MODAL KIỂM ĐẾM & NHẬP KHO CHUỖI LẠNH (GIAI ĐOẠN 7.2) */}
      {activeReceivingTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#10542C]">
                <Scale className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Đối Soát Cân & Phân Bổ Kho Mát ({activeReceivingTrip.tripCode})
                </h3>
              </div>
              <button
                onClick={() => setActiveReceivingTrip(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Thông tin chuyến & Xe */}
            <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Xe tải</span>
                <strong className="font-mono text-slate-900">{activeReceivingTrip.vehicle?.plateNumber}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tài xế</span>
                <strong className="text-slate-900">{activeReceivingTrip.driver?.fullName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Khối lượng kế hoạch</span>
                <strong className="font-mono text-blue-800">{activeReceivingTrip.totalWeightKg} kg</strong>
              </div>
            </div>

            {/* Bảng đối soát từng hợp đồng */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Danh sách lô hàng từ các rẫy trong chuyến:
              </span>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
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
                  onChange={(e) => setSelectedColdZone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-emerald-600"
                >
                  <option value="Kho Mát A (15°C)">Kho Mát A (15°C) — Rau củ quả ăn lá</option>
                  <option value="Kho Lạnh B (4°C)">Kho Lạnh B (4°C) — Trái cây nhiệt đới</option>
                  <option value="Kho Cấp Đông C (-18°C)">Kho Cấp Đông C (-18°C)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mã kệ / Ô lưu trữ (Rack/Bin) *</label>
                <input
                  type="text"
                  value={selectedBin}
                  onChange={(e) => setSelectedBin(e.target.value)}
                  placeholder="BIN-IN-01"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-emerald-600"
                />
              </div>
            </div>

            {/* Tổng cân tại trạm */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tổng khối lượng cân nhập kho (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={actualTotalWeight}
                  onChange={(e) => setActualTotalWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold text-emerald-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tổng số kiện / sọt thực tế *</label>
                <input
                  type="number"
                  value={actualTotalPackages}
                  onChange={(e) => setActualTotalPackages(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm focus:outline-emerald-600"
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

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveReceivingTrip(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCompleteReceiving}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Xác Nhận Hoàn Tất Nhập Kho (GĐ 7.2)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
