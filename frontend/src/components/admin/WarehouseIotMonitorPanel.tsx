'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Thermometer,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Sliders,
  Save,
  Radio,
  BellRing,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  fleetDispatchApi,
  WarehouseZoneDto,
  WarehouseZoneTelemetryDto,
} from '@/services/fleetDispatchApi';

interface WarehouseIotMonitorPanelProps {
  hubId: number;
  zones: WarehouseZoneDto[];
  telemetryList: WarehouseZoneTelemetryDto[];
  historyList?: WarehouseZoneTelemetryDto[];
  onTelemetryUpdated?: (reading: WarehouseZoneTelemetryDto) => void;
  onThresholdsSaved?: () => void;
  compact?: boolean;
}

export default function WarehouseIotMonitorPanel({
  zones,
  telemetryList,
  historyList = [],
  onThresholdsSaved,
  compact = false,
}: WarehouseIotMonitorPanelProps) {
  const [selectedZoneCode, setSelectedZoneCode] = useState<string>('');
  const [tempMinInput, setTempMinInput] = useState<number>(2);
  const [tempMaxInput, setTempMaxInput] = useState<number>(6);
  const [humidityMinInput, setHumidityMinInput] = useState<number>(85);
  const [humidityMaxInput, setHumidityMaxInput] = useState<number>(95);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [thresholdNotice, setThresholdNotice] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (zones.length > 0 && !zones.some((z) => z.zoneCode === selectedZoneCode)) {
      setSelectedZoneCode(zones[0].zoneCode);
    }
  }, [zones, selectedZoneCode]);

  const telemetryByZone = useMemo(() => {
    const map: Record<string, WarehouseZoneTelemetryDto> = {};
    for (const t of telemetryList) {
      if (t.zoneCode) map[t.zoneCode.toUpperCase()] = t;
    }
    return map;
  }, [telemetryList]);

  const activeZone = useMemo(
    () => zones.find((z) => z.zoneCode === selectedZoneCode) || zones[0] || null,
    [zones, selectedZoneCode]
  );

  useEffect(() => {
    if (!activeZone) return;
    const hTarget = Number(activeZone.humidityTarget ?? 90);
    setTempMinInput(Number(activeZone.tempMin ?? 2));
    setTempMaxInput(Number(activeZone.tempMax ?? 6));
    setHumidityMinInput(Number(activeZone.humidityMin ?? Math.max(0, hTarget - 5)));
    setHumidityMaxInput(Number(activeZone.humidityMax ?? Math.min(100, hTarget + 5)));
  }, [activeZone]);

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeZone) return;
    if (tempMinInput >= tempMaxInput) {
      setThresholdNotice('Nhiệt độ tối thiểu phải nhỏ hơn nhiệt độ tối đa.');
      return;
    }
    if (humidityMinInput >= humidityMaxInput) {
      setThresholdNotice('Độ ẩm tối thiểu phải nhỏ hơn độ ẩm tối đa.');
      return;
    }
    setSavingThreshold(true);
    setThresholdNotice(null);
    try {
      await fleetDispatchApi.updateWarehouseZone(activeZone.id, {
        zoneCode: activeZone.zoneCode,
        zoneName: activeZone.zoneName,
        description: activeZone.description || '',
        tempMin: tempMinInput,
        tempMax: tempMaxInput,
        humidityMin: humidityMinInput,
        humidityMax: humidityMaxInput,
        humidityTarget: Math.round((humidityMinInput + humidityMaxInput) / 2),
        capacityKg: activeZone.capacityKg,
        status: activeZone.status || 'ACTIVE',
      });
      setThresholdNotice(
        `Đã lưu ngưỡng ${activeZone.zoneCode}: ${tempMinInput}°C – ${tempMaxInput}°C · Độ ẩm ${humidityMinInput}% – ${humidityMaxInput}%.`
      );
      onThresholdsSaved?.();
    } catch (err: any) {
      setThresholdNotice(err?.message || 'Không thể lưu cấu hình ngưỡng.');
    } finally {
      setSavingThreshold(false);
    }
  };

  const alertReadings = telemetryList.filter((t) => t.alert);
  const alertCount = alertReadings.length;

  // Phát tiếng còi cảnh báo nhẹ qua Web Audio API khi người dùng bật âm thanh và có vùng vượt ngưỡng
  useEffect(() => {
    if (!soundEnabled || alertCount === 0 || typeof window === 'undefined') return;
    const playBeep = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.26);
        setTimeout(() => void ctx.close().catch(() => {}), 350);
      } catch {}
    };
    playBeep();
    const timer = setInterval(playBeep, 2500);
    return () => clearInterval(timer);
  }, [soundEnabled, alertCount]);

  return (
    <div
      className={`rounded-3xl p-5 space-y-5 transition-all ${
        alertCount > 0
          ? 'bg-gradient-to-b from-rose-50/70 via-white to-white border-2 border-rose-500 ring-4 ring-rose-500/20 shadow-lg shadow-rose-500/10'
          : 'bg-white border border-emerald-200/80 shadow-xs'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center shrink-0 transition-colors ${
              alertCount > 0 ? 'bg-rose-600 animate-pulse shadow-md shadow-rose-300' : 'bg-[#10542C]'
            }`}
          >
            {alertCount > 0 ? (
              <BellRing className="w-5 h-5 text-white animate-bounce" />
            ) : (
              <Cpu className="w-5 h-5 text-emerald-300" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-black text-base text-slate-900">
                Giám Sát Nhiệt Độ & Độ Ẩm Kho Lạnh (Cảm Biến Wokwi)
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Radio className="w-3 h-3 animate-pulse text-emerald-600" />
                Realtime
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Hiển thị thông số trực tiếp từ cảm biến Wokwi ESP32 và tự động cảnh báo khi vượt ngưỡng khu vực.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition ${
              soundEnabled
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Bật hoặc tắt âm thanh cảnh báo trên trình duyệt khi vượt ngưỡng"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? 'Còi web: BẬT' : 'Còi web: TẮT'}</span>
          </button>

          {alertCount > 0 ? (
            <span className="px-3 py-1.5 rounded-xl bg-rose-600 text-white border border-rose-700 text-xs font-black flex items-center gap-1.5 animate-pulse shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <AlertTriangle className="w-4 h-4" />
              CẢNH BÁO: {alertCount} KHU VỰC VƯỢT NGƯỠNG
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Nhiệt độ & Độ ẩm ổn định
            </span>
          )}
        </div>
      </div>

      {/* Banner Cảnh Báo Khẩn Cấp khi có Zone vượt ngưỡng */}
      {alertCount > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white px-4 py-3 shadow-md border border-rose-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-90" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-300" />
            </span>
            <div className="text-xs">
              <strong className="uppercase tracking-wide block">
                CẢNH BÁO CHUỖI LẠNH KHO HÀNG — CẦN KIỂM TRA NGAY!
              </strong>
              <span className="text-rose-100">
                {alertReadings
                  .map((a) => `${a.zoneCode}: ${a.alertMessage || `${a.temperature}°C / ${a.humidity}%`}`)
                  .join(' • ')}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold bg-black/25 px-2.5 py-1 rounded-lg shrink-0">
            ACTIVE ALERT ({alertCount})
          </span>
        </div>
      )}

      {/* Thẻ cảm biến theo từng Zone */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {zones.map((zone) => {
          const reading = telemetryByZone[zone.zoneCode.toUpperCase()];
          const temp = reading ? Number(reading.temperature) : Number(((zone.tempMin + zone.tempMax) / 2).toFixed(1));
          const hum = reading ? Number(reading.humidity) : zone.humidityTarget;
          const isAlert = Boolean(reading?.alert);
          const sourceLabel = reading?.source || 'BASELINE';

          return (
            <div
              key={zone.id}
              onClick={() => setSelectedZoneCode(zone.zoneCode)}
              className={`rounded-2xl p-4 border transition cursor-pointer ${
                isAlert
                  ? 'bg-gradient-to-br from-rose-50 via-red-50 to-rose-100/80 border-2 border-rose-500 ring-2 ring-rose-400/40 shadow-md shadow-rose-200/70'
                  : selectedZoneCode === zone.zoneCode
                  ? 'bg-emerald-50/50 border-[#10542C] shadow-2xs'
                  : 'bg-slate-50/70 border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    {isAlert && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-85" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
                      </span>
                    )}
                    <span className={`font-mono text-xs font-black ${isAlert ? 'text-rose-700' : 'text-[#10542C]'}`}>
                      {zone.zoneCode}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 truncate">{zone.zoneName}</div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      sourceLabel === 'WOKWI'
                        ? 'bg-sky-50 text-sky-800 border-sky-200'
                        : sourceLabel === 'SIMULATOR'
                        ? 'bg-violet-50 text-violet-800 border-violet-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {sourceLabel === 'WOKWI'
                      ? 'Cảm biến Wokwi'
                      : sourceLabel === 'SIMULATOR'
                      ? 'Giả lập cũ'
                      : 'Mặc định'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {reading?.recordedAt ? new Date(reading.recordedAt).toLocaleTimeString('vi-VN') : 'Chưa có tín hiệu'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 my-2">
                <div className="bg-white rounded-xl p-2.5 border border-slate-200/80">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                    <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                    Nhiệt độ
                  </div>
                  <div className={`text-lg font-black font-mono ${isAlert ? 'text-rose-600' : 'text-slate-900'}`}>
                    {temp.toFixed(1)}°C
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Ngưỡng: {zone.tempMin}–{zone.tempMax}°C
                  </div>
                </div>

                <div className="bg-white rounded-xl p-2.5 border border-slate-200/80">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                    <Droplets className="w-3.5 h-3.5 text-sky-500" />
                    Độ ẩm
                  </div>
                  <div className="text-lg font-black font-mono text-sky-900">{hum.toFixed(1)}%</div>
                  <div className="text-[10px] text-slate-400">
                    Ngưỡng: {zone.humidityMin ?? Math.max(0, zone.humidityTarget - 5)}–{zone.humidityMax ?? Math.min(100, zone.humidityTarget + 5)}%
                  </div>
                </div>
              </div>

              <div
                className={`mt-2 text-[11px] font-semibold rounded-xl px-2.5 py-1.5 border truncate ${
                  isAlert && reading?.alertMessage
                    ? 'text-rose-700 bg-rose-100/80 border-rose-200'
                    : 'text-emerald-700 bg-emerald-50/70 border-emerald-200/70'
                }`}
                title={isAlert && reading?.alertMessage ? reading.alertMessage : 'Đạt chuẩn bảo quản'}
              >
                {isAlert && reading?.alertMessage ? reading.alertMessage : 'Đạt chuẩn bảo quản'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cấu hình ngưỡng đạt chuẩn */}
      {!compact && activeZone && (
        <form onSubmit={handleSaveThresholds} className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Sliders className="w-4 h-4 text-[#10542C]" />
                <span>Cấu Hình Ngưỡng Đạt Chuẩn ({activeZone.zoneCode})</span>
              </div>
              <span className="text-[11px] text-slate-500">Khoảng an toàn Min – Max</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhiệt độ min (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempMinInput}
                  onChange={(e) => setTempMinInput(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhiệt độ max (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempMaxInput}
                  onChange={(e) => setTempMaxInput(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Độ ẩm min (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="1"
                  value={humidityMinInput}
                  onChange={(e) => setHumidityMinInput(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-sky-900"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Độ ẩm max (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="1"
                  value={humidityMaxInput}
                  onChange={(e) => setHumidityMaxInput(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-sky-900"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-slate-500">
                Khi cảm biến Wokwi vượt ngoài khoảng này, Web và còi/LED sẽ báo động.
              </span>
              <button
                type="submit"
                disabled={savingThreshold}
                className="px-3.5 py-1.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingThreshold ? 'Đang lưu...' : 'Lưu ngưỡng'}</span>
              </button>
            </div>

            {thresholdNotice && (
              <div className="text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                {thresholdNotice}
              </div>
            )}
        </form>
      )}

      {/* Lịch sử mẫu gần nhất */}
      {!compact && historyList.length > 0 && (
        <div className="h-[248px] overflow-y-auto overflow-x-auto border border-slate-200 rounded-2xl bg-white">
          <table className="w-full min-w-[720px] table-fixed text-xs text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 w-[88px]">Thời gian</th>
                <th className="py-2 px-3 w-[96px]">Khu vực</th>
                <th className="py-2 px-3 w-[210px]">Thiết bị</th>
                <th className="py-2 px-3 w-[90px] text-right">Nhiệt độ</th>
                <th className="py-2 px-3 w-[84px] text-right">Độ ẩm</th>
                <th className="py-2 px-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyList.slice(0, 8).map((row, idx) => (
                <tr key={row.id ?? idx} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {row.recordedAt ? new Date(row.recordedAt).toLocaleTimeString('vi-VN') : '—'}
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-800 whitespace-nowrap truncate">{row.zoneCode}</td>
                  <td className="py-2 px-3 text-slate-600 whitespace-nowrap truncate" title={`${row.deviceId} (${row.source})`}>
                    {row.deviceId} ({row.source})
                  </td>
                  <td className={`py-2 px-3 text-right font-mono font-bold whitespace-nowrap tabular-nums ${row.alert ? 'text-rose-600' : 'text-slate-900'}`}>
                    {Number(row.temperature).toFixed(1)}°C
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-sky-800 whitespace-nowrap tabular-nums">
                    {Number(row.humidity).toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap truncate" title={row.alert ? (row.alertMessage || 'Vượt ngưỡng') : 'Đạt chuẩn'}>
                    {row.alert ? (
                      <span className="text-[11px] font-bold text-rose-700">{row.alertMessage || 'Vượt ngưỡng'}</span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700">Đạt chuẩn</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
