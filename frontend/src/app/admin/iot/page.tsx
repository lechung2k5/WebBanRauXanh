'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/auth';
import { Thermometer, AlertTriangle, AlertCircle, RefreshCw, Loader2, Volume2, VolumeX, ShieldAlert, Activity } from 'lucide-react';
import { DataTable, FormDialog, Row, Field } from '@/components/admin/AdminConsole';

const str = (value: unknown) => value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
const f = (name: string, label: string, type = 'text', value?: string | number): Field => ({ name, label, type, value });
const select = (name: string, label: string, options: string[]): Field => ({ name, label, options });

export default function AdminIotPage() {
  const [assets, setAssets] = useState<Row[]>([]);
  const [assetId, setAssetId] = useState<number>(0);
  const [telemetry, setTelemetry] = useState<Row[]>([]);
  const [sound, setSound] = useState(false);
  const [streamStatus, setStreamStatus] = useState('Đang kết nối SSE...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; fields: Field[]; submit: (v: Row) => Promise<unknown> } | null>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<Row[]>('admin/cold-assets').catch(() => []);
      const rows = Array.isArray(data) ? data : [];
      setAssets(rows);
      if (rows.length > 0 && !assetId) {
        setAssetId(Number(rows[0].id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách tài sản');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  // Kết nối SSE Server-Sent Events nhận cập nhật nhiệt độ thời gian thực
  useEffect(() => {
    const source = new EventSource('/api/backend/admin/iot/events');
    source.onmessage = (e) => {
      try {
        const liveAssets = JSON.parse(e.data) as Row[];
        setAssets(liveAssets);
        setStreamStatus('🟢 Đang nhận dữ liệu thời gian thực');
        if (sound && liveAssets.some((a) => a.status === 'TEMP_WARNING')) {
          const context = new AudioContext();
          const oscillator = context.createOscillator();
          oscillator.connect(context.destination);
          oscillator.frequency.value = 660;
          oscillator.start();
          oscillator.stop(context.currentTime + 0.15);
          oscillator.onended = () => void context.close();
        }
      } catch {
        // ignore
      }
    };
    source.onerror = () => setStreamStatus('🟡 Mất kết nối SSE · Đang tự động kết nối lại...');
    return () => source.close();
  }, [sound]);

  // Cập nhật telemetry theo chu kỳ cho tài sản được chọn
  useEffect(() => {
    if (!assetId) return;
    const fetchTelemetry = () => {
      api<Row[]>(`admin/iot/telemetry?assetId=${assetId}`)
        .then((data) => setTelemetry(Array.isArray(data) ? data : []))
        .catch(() => {});
    };
    fetchTelemetry();
    const timer = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(timer);
  }, [assetId]);

  const update = async (endpoint: string, method = 'POST', values: Row = {}) => {
    setBusy(true);
    setError('');
    try {
      await api(endpoint, method, values);
      await loadAssets();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác giả lập sự cố thất bại');
    } finally {
      setBusy(false);
    }
  };

  const openDialog = (title: string, endpoint: string, fields: Field[], method = 'POST', fixed: Row = {}) => {
    setDialog({
      title,
      fields,
      submit: async (values) => {
        await api(endpoint, method, { ...values, ...fixed });
        await loadAssets();
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner Chuẩn HoNa Fresh */}
      <div className="bg-gradient-to-r from-[#10542C] via-[#1B6D3D] to-[#0A4020] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
              <Thermometer className="w-7 h-7 text-[#8BC34A]" /> Giám Sát IoT Chuỗi Lạnh & Bảng Giả Lập Sự Cố
            </h1>
            <p className="text-xs text-white/80 mt-1">
              Module 5: Đo lường nhiệt độ & độ ẩm buồng bảo quản / xe tải lạnh thời gian thực (2°C - 6°C), kích hoạt giả lập sự cố phục vụ báo cáo.
            </p>
          </div>
          <button
            onClick={() => void loadAssets()}
            disabled={loading}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Control Bar: Chọn Tài Sản & Chuông Cảnh Báo */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAECE8] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-[#2C3E2E]">Thiết bị giám sát:</span>
          <select
            aria-label="Chọn tài sản giám sát"
            className="border border-[#E5E7EB] bg-[#F9F9F5] rounded-xl px-3 py-2 text-xs font-bold text-[#2C3E2E] focus:outline-none"
            value={assetId}
            onChange={(e) => setAssetId(Number(e.target.value))}
          >
            <option value={0}>-- Chọn buồng / xe để xem telemetry --</option>
            {assets.map((a) => (
              <option key={str(a.id)} value={Number(a.id)}>
                {str(a.asset_code)} · {str(a.asset_name)} ({str(a.asset_type)})
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs font-bold text-[#2C3E2E] cursor-pointer bg-[#F9F9F5] px-3 py-2 rounded-xl border border-[#EAECE8]">
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => setSound(e.target.checked)}
              className="accent-[#10542C] rounded"
            />
            {sound ? <Volume2 className="w-4 h-4 text-[#10542C]" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
            <span>Còi hú cảnh báo ({sound ? 'Bật' : 'Tắt'})</span>
          </label>
        </div>

        <span className="text-xs font-mono text-[#6B7280] flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          {streamStatus}
        </span>
      </div>

      {/* Danh Sách Buồng & Xe Lạnh Kèm Bảng Điều Khiển Giả Lập */}
      <div className="space-y-3">
        <h3 className="font-heading font-black text-sm text-[#2C3E2E]">
          Cảm Biến IoT Các Điểm Chuỗi Lạnh ({assets.length})
        </h3>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8] flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-[#10542C] animate-spin" />
            <span>Đang kết nối cảm biến IoT...</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8]">
            <p className="font-bold text-[#2C3E2E]">Chưa có thiết bị cảm biến / buồng lạnh trong cơ sở dữ liệu.</p>
            <p className="mt-1">Vui lòng khai báo Buồng lạnh tại Module 4 hoặc Xe lạnh tại Module 6 để kích hoạt giám sát.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((row) => {
              const temp = Number(row.current_temp);
              const isWarning = row.status === 'TEMP_WARNING' || temp > 8 || temp < 1;
              const isNotice = temp > 6 && temp <= 8;

              return (
                <div
                  key={str(row.id)}
                  className={`p-5 rounded-2xl border-2 bg-white shadow-xs transition-all ${
                    isWarning
                      ? 'border-red-500 shadow-red-100 ring-2 ring-red-200'
                      : isNotice
                      ? 'border-amber-400'
                      : 'border-[#EAECE8]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-[#2C3E2E]">{str(row.asset_name)}</p>
                      <p className="text-[11px] font-mono text-[#6B7280]">{str(row.asset_code)} · {str(row.asset_type)}</p>
                    </div>
                    {isWarning && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center gap-1 animate-bounce">
                        <AlertTriangle className="w-3 h-3" /> Cảnh Báo
                      </span>
                    )}
                  </div>

                  <div className="my-4 flex items-baseline justify-between">
                    <p
                      className={`font-black text-3xl font-heading ${
                        isWarning ? 'text-red-600' : isNotice ? 'text-amber-600' : 'text-[#10542C]'
                      }`}
                    >
                      {str(row.current_temp)}°C
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      Độ ẩm: <strong className="text-[#2C3E2E]">{str(row.current_humidity)}%</strong>
                    </p>
                  </div>

                  {/* Nút Bấm Giả Lập Sự Cố (IoT Fault Injector) */}
                  <div className="pt-3 border-t border-[#F0F2ED] space-y-2">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                      Bảng Giả Lập Sự Cố (Phục vụ Demo)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void update('admin/iot/inject-fault', 'POST', { assetId: row.id, mode: 'TEMP_SPIKE' })}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        🔴 Tăng vọt 15°C
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void update('admin/iot/inject-fault', 'POST', { assetId: row.id, mode: 'DOOR_OPEN' })}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        ⚠️ Cửa hở tụt ẩm
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void update('admin/iot/reset-fault', 'POST', { assetId: row.id })}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        🟢 Phục hồi 4.0°C
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          openDialog(
                            'Lập Biên Bản Sự Cố Chuỗi Lạnh',
                            'admin/claims',
                            [
                              f('contractId', 'ID Hợp đồng vận chuyển liên quan', 'number'),
                              f('damagedWeightKg', 'Khối lượng hàng suy giảm chất lượng (kg)', 'number'),
                              f('cause', 'Nguyên nhân', 'text', 'COOLING_FAILURE'),
                              select('liableParty', 'Bên chịu trách nhiệm bồi thường', ['PLATFORM', 'FARMER']),
                            ]
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        📄 Lập biên bản
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Đồ Thị Nhiệt Độ & Lịch Sử Telemetry */}
      {assetId > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
          <h3 className="font-heading font-black text-sm text-[#2C3E2E]">
            Biểu Đồ Nhiệt Độ Thời Gian Thực (Thiết bị ID: {assetId})
          </h3>

          {telemetry.length > 1 && (
            <div className="bg-[#F9F9F5] p-4 rounded-2xl border border-[#EAECE8]">
              <svg viewBox="0 0 600 160" className="w-full max-h-52" role="img" aria-label="Biểu đồ nhiệt độ">
                <line x1="0" y1="128" x2="600" y2="128" stroke="#E5E7EB" strokeDasharray="4" />
                <line x1="0" y1="80" x2="600" y2="80" stroke="#E5E7EB" strokeDasharray="4" />
                <polyline
                  fill="none"
                  stroke="#10542C"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={[...telemetry]
                    .reverse()
                    .map((r, i) => `${(i * 600) / Math.max(1, telemetry.length - 1)},${150 - Number(r.temperature) * 7}`)
                    .join(' ')}
                />
              </svg>
            </div>
          )}

          <DataTable
            rows={telemetry.slice(0, 10)}
            columns={[
              ['recorded_at', 'Thời Điểm'],
              ['temperature', 'Nhiệt Độ (°C)'],
              ['humidity', 'Độ Ẩm (%)'],
              ['alert_message', 'Ghi Nhận Cảm Biến'],
            ]}
          />
        </div>
      )}

      {/* Modal Dialog Form */}
      {dialog && (
        <FormDialog
          value={dialog}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            void loadAssets();
          }}
        />
      )}
    </div>
  );
}
