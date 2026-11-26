'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Warehouse,
  Boxes,
  PlusCircle,
  Edit3,
  Trash2,
  RotateCw,
  CheckCircle2,
  Snowflake,
  Sliders,
  Box,
  ArrowRightLeft,
  X,
} from 'lucide-react';
import {
  fleetDispatchApi,
  DEFAULT_OFFICIAL_HUBS,
  WarehouseHubDto,
  WarehouseLayoutDto,
  WarehouseZoneDto,
  WarehouseBinDto,
  WarehouseZoneTelemetryDto,
} from '@/services/fleetDispatchApi';
import { b2bWebSocket } from '@/services/websocketService';
import Warehouse3DDigitalTwin from '@/components/admin/Warehouse3DDigitalTwin';
import WarehouseIotMonitorPanel from '@/components/admin/WarehouseIotMonitorPanel';

export default function AdminWarehousesPage() {
  const [hubs] = useState<WarehouseHubDto[]>(DEFAULT_OFFICIAL_HUBS);
  const [selectedHubId, setSelectedHubId] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hona_admin_selected_hub_id');
      if (saved) return Number(saved);
    }
    return 2;
  });

  const [layout, setLayout] = useState<WarehouseLayoutDto | null>(null);
  const [iotReadings, setIotReadings] = useState<WarehouseZoneTelemetryDto[]>([]);
  const [iotHistory, setIotHistory] = useState<WarehouseZoneTelemetryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'3D' | 'CONFIG'>('3D');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal Sửa Kho
  const [hubModalOpen, setHubModalOpen] = useState(false);
  const [hubForm, setHubForm] = useState({
    hubName: '',
    managerName: '',
    hotline: '',
    address: '',
    totalCapacityKg: 50000,
  });

  // Modal Thêm / Sửa Zone
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<WarehouseZoneDto | null>(null);
  const [zoneForm, setZoneForm] = useState({
    zoneCode: 'ZONE-D',
    zoneName: '',
    description: '',
    tempMin: 2,
    tempMax: 6,
    humidityTarget: 90,
    capacityKg: 15000,
    status: 'ACTIVE' as 'ACTIVE' | 'MAINTENANCE',
  });

  // Modal Thêm Kệ / Ô Bin
  const [binModalOpen, setBinModalOpen] = useState(false);
  const [targetZoneForBin, setTargetZoneForBin] = useState<WarehouseZoneDto | null>(null);
  const [editingBin, setEditingBin] = useState<WarehouseBinDto | null>(null);
  const [binForm, setBinForm] = useState({
    rackCode: 'R-04',
    binCode: 'BIN D-01',
    binPrefix: 'BIN D-',
    startIndex: 1,
    count: 4,
    maxWeightKg: 5000,
    status: 'ACTIVE' as 'ACTIVE' | 'MAINTENANCE',
    notes: '',
  });

  // Modal Chuyển Ô Kệ (Move Bin)
  const [movingContract, setMovingContract] = useState<{ contract: any; currentBin: WarehouseBinDto } | null>(null);
  const [targetMoveBinId, setTargetMoveBinId] = useState<number>(0);

  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    const onHubChanged = (e: Event) => {
      const custom = e as CustomEvent<number>;
      if (custom.detail) setSelectedHubId(Number(custom.detail));
    };
    window.addEventListener('hona-admin-hub-changed', onHubChanged);
    return () => window.removeEventListener('hona-admin-hub-changed', onHubChanged);
  }, []);

  const loadLayout = useCallback(async (hubId: number) => {
    setLoading(true);
    try {
      const [res, latestIot, histIot] = await Promise.all([
        fleetDispatchApi.getWarehouseLayout(hubId),
        fleetDispatchApi.getWarehouseIotLatest(hubId).catch(() => []),
        fleetDispatchApi.getWarehouseIotHistory(hubId, undefined, 20).catch(() => []),
      ]);
      setLayout(res);
      setIotReadings(Array.isArray(latestIot) ? latestIot : []);
      setIotHistory(Array.isArray(histIot) ? histIot : []);
    } catch (err: any) {
      alert(err?.message || 'Không thể tải cấu hình sơ đồ kho.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTelemetryReading = useCallback((reading: WarehouseZoneTelemetryDto) => {
    if (!reading?.zoneCode) return;
    setIotReadings((prev) => {
      const code = reading.zoneCode.toUpperCase();
      const idx = prev.findIndex((item) => item.zoneCode?.toUpperCase() === code);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = reading;
        return next;
      }
      return [...prev, reading];
    });
    if (reading.id) {
      setIotHistory((prev) => [reading, ...prev.filter((h) => h.id !== reading.id)].slice(0, 20));
    }
  }, []);

  const zoneTelemetryMap = useMemo(() => {
    const map: Record<string, WarehouseZoneTelemetryDto> = {};
    for (const r of iotReadings) {
      if (r.zoneCode) map[r.zoneCode.toUpperCase()] = r;
    }
    return map;
  }, [iotReadings]);

  useEffect(() => {
    void loadLayout(selectedHubId);
    const unsubIot = b2bWebSocket.subscribeWarehouseIot(selectedHubId, (payload) => {
      if (payload?.reading) {
        handleTelemetryReading(payload.reading as WarehouseZoneTelemetryDto);
      }
    });
    const syncTimer = setInterval(() => {
      void fleetDispatchApi
        .getWarehouseIotLatest(selectedHubId)
        .then((latest) => {
          if (Array.isArray(latest)) setIotReadings(latest);
        })
        .catch(() => {});
      void fleetDispatchApi
        .getWarehouseIotHistory(selectedHubId, undefined, 20)
        .then((hist) => {
          if (Array.isArray(hist)) setIotHistory(hist);
        })
        .catch(() => {});
    }, 1500);
    return () => {
      unsubIot();
      clearInterval(syncTimer);
    };
  }, [selectedHubId, loadLayout, handleTelemetryReading]);

  const allActiveBins = useMemo(() => {
    if (!layout?.zones) return [];
    return layout.zones.flatMap((z) =>
      (z.bins || [])
        .filter((b) => b.status === 'ACTIVE')
        .map((b) => ({ ...b, zoneName: z.zoneName }))
    );
  }, [layout]);

  const handleHubSwitch = (nextId: number) => {
    setSelectedHubId(nextId);
    try {
      sessionStorage.setItem('hona_admin_selected_hub_id', String(nextId));
      localStorage.setItem('hona_admin_selected_hub_id', String(nextId));
      window.dispatchEvent(new CustomEvent('hona-admin-hub-changed', { detail: nextId }));
    } catch {}
  };

  const handleSaveHub = async () => {
    setSaving(true);
    try {
      await fleetDispatchApi.updateWarehouseHub(selectedHubId, hubForm);
      showToast('Đã cập nhật thông tin & sức chứa kho!');
      setHubModalOpen(false);
      await loadLayout(selectedHubId);
    } catch (err: any) {
      alert(err?.message || 'Lỗi cập nhật kho');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveZone = async () => {
    if (!zoneForm.zoneCode.trim() || !zoneForm.zoneName.trim()) {
      alert('Vui lòng nhập mã Zone và tên Zone.');
      return;
    }
    setSaving(true);
    try {
      if (editingZone) {
        await fleetDispatchApi.updateWarehouseZone(editingZone.id, zoneForm);
        showToast(`Đã cập nhật ${zoneForm.zoneName}!`);
      } else {
        await fleetDispatchApi.createWarehouseZone(selectedHubId, zoneForm);
        showToast(`Đã thêm buồng lạnh ${zoneForm.zoneName}!`);
      }
      setZoneModalOpen(false);
      await loadLayout(selectedHubId);
    } catch (err: any) {
      alert(err?.message || 'Lỗi lưu buồng lạnh');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZone = async (zone: WarehouseZoneDto) => {
    if (!confirm(`Xác nhận xóa ${zone.zoneName} và toàn bộ kệ bên trong?`)) return;
    try {
      await fleetDispatchApi.deleteWarehouseZone(zone.id);
      showToast(`Đã xóa ${zone.zoneName}!`);
      await loadLayout(selectedHubId);
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa Zone này');
    }
  };

  const handleSaveBin = async () => {
    setSaving(true);
    try {
      if (editingBin) {
        await fleetDispatchApi.updateWarehouseBin(editingBin.id, {
          rackCode: binForm.rackCode,
          binCode: binForm.binCode,
          maxWeightKg: binForm.maxWeightKg,
          status: binForm.status,
          notes: binForm.notes,
        });
        showToast(`Đã cập nhật ô kệ ${binForm.binCode}!`);
      } else if (targetZoneForBin) {
        await fleetDispatchApi.createWarehouseBins(targetZoneForBin.id, {
          rackCode: binForm.rackCode,
          binCode: binForm.binCode,
          maxWeightKg: binForm.maxWeightKg,
          status: binForm.status,
          notes: binForm.notes,
          count: 1,
        });
        showToast(`Đã thêm kệ ${binForm.binCode} vào ${targetZoneForBin.zoneCode}!`);
      }
      setBinModalOpen(false);
      await loadLayout(selectedHubId);
    } catch (err: any) {
      alert(err?.message || 'Lỗi lưu kệ / ô chứa');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBin = async (bin: WarehouseBinDto) => {
    if (!confirm(`Xác nhận xóa ô kệ ${bin.binCode}?`)) return;
    try {
      await fleetDispatchApi.deleteWarehouseBin(bin.id);
      showToast(`Đã xóa ô kệ ${bin.binCode}!`);
      await loadLayout(selectedHubId);
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa ô kệ này');
    }
  };

  const handleMoveContract = async () => {
    if (!movingContract || !targetMoveBinId) return;
    setSaving(true);
    try {
      await fleetDispatchApi.moveContractBin(movingContract.contract.id, targetMoveBinId);
      showToast(`Đã chuyển ${movingContract.contract.contract_code} sang ô kệ mới!`);
      setMovingContract(null);
      await loadLayout(selectedHubId);
    } catch (err: any) {
      alert(err?.message || 'Không thể chuyển ô kệ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-700">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#10542C] text-white flex items-center justify-center shrink-0">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Phân Hệ Kho Hàng, Sơ Đồ 3D & Quản Lý Kệ
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý sức chứa kho, buồng lạnh (Zone), dãy kệ (Rack/Bin) và theo dõi hàng hóa 3D theo thời gian thực.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedHubId}
            onChange={(e) => handleHubSwitch(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800"
          >
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.hubName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              if (!layout?.hub) return;
              setHubForm({
                hubName: layout.hub.hubName,
                managerName: layout.hub.managerName || '',
                hotline: layout.hub.hotline || '',
                address: layout.hub.address,
                totalCapacityKg: Number(layout.totalCapacityKg || 50000),
              });
              setHubModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Cấu Hình Kho</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingZone(null);
              setZoneForm({
                zoneCode: `ZONE-${String.fromCharCode(65 + (layout?.zones?.length || 0))}`,
                zoneName: '',
                description: '',
                tempMin: 2,
                tempMax: 6,
                humidityTarget: 90,
                capacityKg: 15000,
                status: 'ACTIVE',
              });
              setZoneModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10542C] hover:bg-[#0d4624] text-white text-xs font-bold cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Thêm Buồng Lạnh (Zone)</span>
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      {layout && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">Tổng Sức Chứa Kho</span>
            <strong className="text-2xl font-black text-slate-900 font-mono">
              {Number(layout.totalCapacityKg).toLocaleString('vi-VN')} kg
            </strong>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-600 uppercase block">Đang Lưu Trên Kệ</span>
            <strong className="text-2xl font-black text-emerald-900 font-mono">
              {Number(layout.totalUsedKg).toLocaleString('vi-VN')} kg
            </strong>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-sky-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-sky-600 uppercase block">Còn Trống Khả Dụng</span>
            <strong className="text-2xl font-black text-sky-900 font-mono">
              {Number(layout.totalAvailableKg).toLocaleString('vi-VN')} kg
            </strong>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-600 uppercase block">Tỷ Lệ Lấp Đầy / Kệ</span>
            <strong className="text-2xl font-black text-amber-900 font-mono">
              {layout.utilizationPct}% ({layout.totalZones} Zone · {layout.totalBins} Ô)
            </strong>
          </div>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('3D')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === '3D' ? 'bg-white text-[#10542C] shadow-2xs' : 'text-slate-600'
          }`}
        >
          <Box className="w-4 h-4 text-sky-600" />
          <span>Không Gian Kho 3D Digital Twin</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CONFIG')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'CONFIG' ? 'bg-white text-[#10542C] shadow-2xs' : 'text-slate-600'
          }`}
        >
          <Boxes className="w-4 h-4 text-emerald-600" />
          <span>Quản Lý Zone, Kệ & Sức Chứa (CRUD)</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 flex flex-col items-center gap-3">
          <RotateCw className="w-7 h-7 text-[#10542C] animate-spin" />
          <span className="text-xs font-bold text-slate-500">Đang tải không gian 3D & sơ đồ kệ kho...</span>
        </div>
      ) : activeTab === '3D' ? (
        <div className="space-y-5">
          <WarehouseIotMonitorPanel
            hubId={selectedHubId}
            zones={layout?.zones || []}
            telemetryList={iotReadings}
            historyList={iotHistory}
            onTelemetryUpdated={handleTelemetryReading}
            onThresholdsSaved={() => void loadLayout(selectedHubId)}
          />
          <Warehouse3DDigitalTwin
            layout={layout}
            zoneTelemetryMap={zoneTelemetryMap}
            onMoveContract={(contract, currentBin) => {
              setMovingContract({ contract, currentBin });
              const firstOther = allActiveBins.find((b) => b.id !== currentBin.id);
              setTargetMoveBinId(firstOther ? firstOther.id : 0);
            }}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {layout?.zones.map((zone) => (
            <div key={zone.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center">
                    <Snowflake className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm font-bold text-slate-900">{zone.zoneName}</strong>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                        {zone.tempMin}°C – {zone.tempMax}°C · RH {zone.humidityTarget}%
                      </span>
                      {zone.status !== 'ACTIVE' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                          Đang bảo trì
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {zone.description || 'Buồng lạnh tiêu chuẩn HoNa Fresh'} · Đang lưu:{' '}
                      <strong className="font-mono text-emerald-800">
                        {Number(zone.usedKg).toLocaleString('vi-VN')} / {Number(zone.capacityKg).toLocaleString('vi-VN')} kg
                      </strong>{' '}
                      ({zone.utilizationPct}%)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBin(null);
                      setTargetZoneForBin(zone);
                      const existingRack = zone.bins[0]?.rackCode || `R-${String(new Set(zone.bins.map((b) => b.rackCode)).size + 1).padStart(2, '0')}`;
                      const shortLetter = zone.zoneCode.replace('ZONE-', '') || 'X';
                      setBinForm({
                        rackCode: existingRack,
                        binCode: `BIN ${shortLetter}-${String(zone.bins.length + 1).padStart(2, '0')}`,
                        binPrefix: `BIN ${shortLetter}-`,
                        startIndex: zone.bins.length + 1,
                        count: 1,
                        maxWeightKg: 5000,
                        status: 'ACTIVE',
                        notes: '',
                      });
                      setBinModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#10542C] text-xs font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Thêm Kệ / Ô Chứa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingZone(zone);
                      setZoneForm({
                        zoneCode: zone.zoneCode,
                        zoneName: zone.zoneName,
                        description: zone.description || '',
                        tempMin: Number(zone.tempMin),
                        tempMax: Number(zone.tempMax),
                        humidityTarget: Number(zone.humidityTarget),
                        capacityKg: Number(zone.capacityKg),
                        status: zone.status,
                      });
                      setZoneModalOpen(true);
                    }}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    title="Sửa Zone"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteZone(zone)}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Xóa Zone"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {zone.bins.map((bin) => (
                  <div
                    key={bin.id}
                    className={`p-3.5 rounded-2xl border space-y-2 ${
                      bin.status !== 'ACTIVE'
                        ? 'bg-slate-100 border-slate-300'
                        : Number(bin.usedKg) > 0
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block">{bin.rackCode}</span>
                        <strong className="font-mono text-sm text-slate-900">{bin.binCode}</strong>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBin(bin);
                            setTargetZoneForBin(zone);
                            setBinForm({
                              rackCode: bin.rackCode,
                              binCode: bin.binCode,
                              binPrefix: 'BIN ',
                              startIndex: 1,
                              count: 1,
                              maxWeightKg: Number(bin.maxWeightKg),
                              status: bin.status,
                              notes: bin.notes || '',
                            });
                            setBinModalOpen(true);
                          }}
                          className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-[#10542C] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBin(bin)}
                          className="p-1 rounded-lg hover:bg-white text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] flex justify-between text-slate-600">
                      <span>Sức chứa:</span>
                      <strong className="font-mono text-slate-900">
                        {Number(bin.usedKg).toLocaleString('vi-VN')} / {Number(bin.maxWeightKg).toLocaleString('vi-VN')} kg
                      </strong>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          bin.utilizationPct >= 85 ? 'bg-rose-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, bin.utilizationPct)}%` }}
                      />
                    </div>

                    {bin.contracts.length > 0 && (
                      <div className="pt-1 space-y-1">
                        {bin.contracts.map((c: any) => (
                          <div
                            key={c.id}
                            className="text-[10px] bg-white px-2 py-1 rounded-lg border border-slate-200 flex items-center justify-between gap-1"
                          >
                            <span className="font-mono font-bold text-[#10542C] truncate">{c.contract_code}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setMovingContract({ contract: c, currentBin: bin });
                                const firstOther = allActiveBins.find((b) => b.id !== bin.id);
                                setTargetMoveBinId(firstOther ? firstOther.id : 0);
                              }}
                              className="text-sky-600 hover:underline font-bold flex items-center gap-0.5 shrink-0 cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3 h-3" /> Chuyển
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cấu Hình Kho */}
      {hubModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Cấu Hình Kho & Tổng Sức Chứa</h3>
              <button onClick={() => setHubModalOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Tên kho / trạm</label>
                <input
                  value={hubForm.hubName}
                  onChange={(e) => setHubForm({ ...hubForm, hubName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Quản lý kho</label>
                  <input
                    value={hubForm.managerName}
                    onChange={(e) => setHubForm({ ...hubForm, managerName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Tổng sức chứa (kg)</label>
                  <input
                    type="number"
                    value={hubForm.totalCapacityKg}
                    onChange={(e) => setHubForm({ ...hubForm, totalCapacityKg: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setHubModalOpen(false)} className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer">
                Hủy
              </button>
              <button
                disabled={saving}
                onClick={handleSaveHub}
                className="px-4 py-2 rounded-xl bg-[#10542C] text-white text-xs font-bold cursor-pointer"
              >
                {saving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm / Sửa Zone */}
      {zoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingZone ? `Sửa ${editingZone.zoneCode}` : 'Thêm Buồng Lạnh (Zone)'}
              </h3>
              <button onClick={() => setZoneModalOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Mã Zone *</label>
                  <input
                    value={zoneForm.zoneCode}
                    disabled={Boolean(editingZone)}
                    onChange={(e) => setZoneForm({ ...zoneForm, zoneCode: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Sức chứa (kg) *</label>
                  <input
                    type="number"
                    value={zoneForm.capacityKg}
                    onChange={(e) => setZoneForm({ ...zoneForm, capacityKg: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Tên buồng lạnh *</label>
                <input
                  value={zoneForm.zoneName}
                  onChange={(e) => setZoneForm({ ...zoneForm, zoneName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="VD: Zone D — Kho Đông Mát Nấm Tươi"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold block mb-1">Nhiệt Min (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={zoneForm.tempMin}
                    onChange={(e) => setZoneForm({ ...zoneForm, tempMin: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Nhiệt Max (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={zoneForm.tempMax}
                    onChange={(e) => setZoneForm({ ...zoneForm, tempMax: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Trạng thái</label>
                  <select
                    value={zoneForm.status}
                    onChange={(e) => setZoneForm({ ...zoneForm, status: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-300 px-2 py-2 bg-white font-bold"
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setZoneModalOpen(false)} className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer">
                Hủy
              </button>
              <button
                disabled={saving}
                onClick={handleSaveZone}
                className="px-4 py-2 rounded-xl bg-[#10542C] text-white text-xs font-bold cursor-pointer"
              >
                {saving ? 'Đang lưu...' : 'Lưu Zone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm / Sửa Kệ & Ô Chứa */}
      {binModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingBin ? `Cập Nhật Ô Kệ ${editingBin.binCode}` : `Thêm Kệ / Ô Chứa (${targetZoneForBin?.zoneCode})`}
              </h3>
              <button onClick={() => setBinModalOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Mã kệ *</label>
                  <input
                    value={binForm.binCode}
                    onChange={(e) => setBinForm({ ...binForm, binCode: e.target.value })}
                    placeholder="VD: BIN A-05"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Mã dãy *</label>
                  <input
                    value={binForm.rackCode}
                    onChange={(e) => setBinForm({ ...binForm, rackCode: e.target.value })}
                    placeholder="VD: R-01"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Sức chứa (kg) *</label>
                  <input
                    type="number"
                    min={1}
                    value={binForm.maxWeightKg}
                    onChange={(e) => setBinForm({ ...binForm, maxWeightKg: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Trạng thái</label>
                  <select
                    value={binForm.status}
                    onChange={(e) => setBinForm({ ...binForm, status: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white font-bold"
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setBinModalOpen(false)} className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer">
                Hủy
              </button>
              <button
                disabled={saving}
                onClick={handleSaveBin}
                className="px-4 py-2 rounded-xl bg-[#10542C] text-white text-xs font-bold cursor-pointer"
              >
                {saving ? 'Đang lưu...' : 'Lưu Kệ / Ô Chứa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chuyển Ô Kệ (Move Bin) */}
      {movingContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Điều Chuyển Kệ — {movingContract.contract.contract_code}
              </h3>
              <button onClick={() => setMovingContract(null)} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs space-y-3">
              <p className="text-slate-600">
                Vị trí hiện tại: <strong className="font-mono">{movingContract.currentBin.binCode}</strong>
              </p>
              <div>
                <label className="font-bold block mb-1">Chọn ô kệ đích *</label>
                <select
                  value={targetMoveBinId}
                  onChange={(e) => setTargetMoveBinId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white font-semibold"
                >
                  {allActiveBins
                    .filter((b) => b.id !== movingContract.currentBin.id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.binCode} ({b.rackCode}) — Còn trống {Math.round(b.availableKg)} kg
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setMovingContract(null)} className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer">
                Hủy
              </button>
              <button
                disabled={saving || !targetMoveBinId}
                onClick={handleMoveContract}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
              >
                {saving ? 'Đang chuyển...' : 'Xác Nhận Chuyển Kệ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
