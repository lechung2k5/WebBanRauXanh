'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/auth';
import { Truck, Plus, AlertCircle, RefreshCw, Loader2, FileCheck2, Wrench } from 'lucide-react';
import { DataTable, FormDialog, Row, Field, epodFields } from '@/components/admin/AdminConsole';

const str = (value: unknown) => value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
const f = (name: string, label: string, type = 'text', value?: string | number): Field => ({ name, label, type, value });
const select = (name: string, label: string, options: string[]): Field => ({ name, label, options });

const truckForm: Field[] = [
  f('assetCode', 'Biển số xe lạnh (VD: 49C-123.45)'),
  f('assetName', 'Tên phương tiện (VD: Isuzu Thùng Lạnh 5 Tấn)'),
  select('assetType', 'Loại tài sản', ['REFRIGERATED_TRUCK']),
  f('capacityKg', 'Tải trọng tối đa (kg)', 'number', 5000),
  { ...f('driverId', 'ID Tài xế phụ trách xe', 'number'), optional: true },
];

export default function AdminShipmentsPage() {
  const [trucks, setTrucks] = useState<Row[]>([]);
  const [shipments, setShipments] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ title: string; fields: Field[]; submit: (v: Row) => Promise<unknown> } | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [shipmentsData, assetsData] = await Promise.all([
        api<Row[]>('admin/shipments').catch(() => []),
        api<Row[]>('admin/cold-assets').catch(() => []),
      ]);
      const assets = Array.isArray(assetsData) ? assetsData : [];
      setTrucks(assets.filter((r) => r.asset_type === 'REFRIGERATED_TRUCK'));
      setShipments(Array.isArray(shipmentsData) ? shipmentsData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu vận tải');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openDialog = (title: string, endpoint: string, fields: Field[], method = 'POST', fixed: Row = {}) => {
    setDialog({
      title,
      fields,
      submit: async (values) => {
        await api(endpoint, method, { ...values, ...fixed });
        await loadData();
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
              <Truck className="w-7 h-7 text-[#8BC34A]" /> Điều Phối Vận Tải Lạnh TMS & Hồ Sơ ePOD
            </h1>
            <p className="text-xs text-white/80 mt-1">
              Module 6: Quản trị đội xe tải lạnh chuyên dụng, điều phối chuyến hàng từ trạm về kho bên mua và lưu trữ biên bản giao nhận điện tử ePOD.
            </p>
          </div>
          <button
            onClick={() => void loadData()}
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

      {/* Toolbar Thao Tác Vận Tải */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => openDialog('Thêm Phương Tiện Xe Tải Lạnh Mới', 'admin/cold-assets', truckForm)}
          className="px-4 py-2.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Thêm Xe Tải Lạnh
        </button>

        <button
          onClick={() =>
            openDialog('Điều Phối Chuyến Xe Vận Chuyển', 'admin/shipments', [
              f('contractId', 'ID Hợp đồng đã qua kiểm định QC trạm', 'number'),
              f('truckId', 'ID Xe tải lạnh thực hiện chuyến', 'number'),
              f('driverId', 'ID Tài xế phụ trách điều khiển xe', 'number'),
            ])
          }
          className="px-4 py-2.5 rounded-xl border border-[#10542C]/20 bg-[#EAF5E9] hover:bg-[#D7EED6] text-[#10542C] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Truck className="w-4 h-4" /> Phân Chuyến Vận Chuyển
        </button>
      </div>

      {/* Danh Sách Đội Xe Lạnh */}
      <div className="space-y-3">
        <h3 className="font-heading font-black text-sm text-[#2C3E2E] flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#10542C]" />
          <span>Đội Xe Tải Lạnh Chuyên Dụng ({trucks.length})</span>
        </h3>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8] flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-[#10542C] animate-spin" />
            <span>Đang tải danh sách đội xe...</span>
          </div>
        ) : trucks.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8]">
            <p className="font-bold text-[#2C3E2E]">Chưa có phương tiện xe tải lạnh nào trong cơ sở dữ liệu.</p>
            <p className="mt-1">Bấm &quot;Thêm Xe Tải Lạnh&quot; để bổ sung phương tiện vào đội xe vận tải TMS.</p>
          </div>
        ) : (
          <DataTable
            rows={trucks}
            columns={[
              ['id', 'ID'],
              ['asset_code', 'Biển Số Xe'],
              ['driver_id', 'ID Tài Xế Phụ Trách'],
              ['capacity_kg', 'Tải Trọng (kg)'],
              ['current_temp', 'Nhiệt Độ Thùng Xe (°C)'],
              ['status', 'Trạng Thái'],
            ]}
            actions={(row) => (
              <button
                type="button"
                onClick={() =>
                  openDialog(
                    `Đổi trạng thái phương tiện · ${row.asset_code}`,
                    `admin/cold-assets/${row.id}/status`,
                    [],
                    'PATCH',
                    { status: row.status === 'MAINTENANCE' ? 'NORMAL' : 'MAINTENANCE' }
                  )
                }
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  row.status === 'MAINTENANCE'
                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <Wrench className="w-3 h-3" />
                {row.status === 'MAINTENANCE' ? 'Chuyển Hoạt Động' : 'Đưa Vào Bảo Trì'}
              </button>
            )}
          />
        )}
      </div>

      {/* Danh Sách Chuyến Hàng & Biên Bản Giao Nhận ePOD */}
      <div className="space-y-3 pt-4 border-t border-[#EAECE8]">
        <h3 className="font-heading font-black text-sm text-[#2C3E2E] flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-[#10542C]" />
          <span>Lịch Trình Vận Chuyển & Biên Bản Giao Nhận ePOD ({shipments.length})</span>
        </h3>

        {shipments.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8]">
            <p className="font-bold text-[#2C3E2E]">Chưa có chuyến vận chuyển nào trong cơ sở dữ liệu.</p>
          </div>
        ) : (
          <DataTable
            rows={shipments}
            columns={[
              ['id', 'ID'],
              ['shipment_code', 'Mã Chuyến'],
              ['contract_code', 'Mã Hợp Đồng'],
              ['asset_code', 'Biển Số Xe'],
              ['driver_id', 'Tài Xế'],
              ['delivery_address', 'Kho Nhận Hàng'],
              ['loaded_weight_kg', 'Bốc Hàng (kg)'],
              ['status', 'Trạng Thái'],
            ]}
            actions={(row) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetail(row)}
                  className="px-2.5 py-1 text-xs font-bold text-[#10542C] bg-[#EAF5E9] hover:bg-[#D7EED6] rounded-lg transition-colors cursor-pointer"
                >
                  Hồ sơ ePOD
                </button>
                {row.status === 'IN_TRANSIT' && (
                  <button
                    type="button"
                    onClick={() =>
                      openDialog(
                        `Ký Nhận Giao Hàng ePOD · ${row.shipment_code}`,
                        `admin/shipments/${row.id}/epod`,
                        epodFields
                      )
                    }
                    className="px-2.5 py-1 text-xs font-bold text-white bg-[#10542C] hover:bg-[#0C3E20] rounded-lg transition-colors cursor-pointer"
                  >
                    Ghi nhận ePOD
                  </button>
                )}
              </div>
            )}
          />
        )}
      </div>

      {/* Modal Dialog Form */}
      {dialog && (
        <FormDialog
          value={dialog}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            void loadData();
          }}
        />
      )}

      {/* Modal Chi Tiết ePOD */}
      {detail && (
        <div className="fixed inset-0 z-[150] bg-black/40 p-4 flex justify-center items-center">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#2C3E2E]">Hồ Sơ Chuyến Xe & Biên Bản ePOD</h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 cursor-pointer"
              >
                ×
              </button>
            </div>
            <dl className="space-y-3 text-xs">
              {Object.entries(detail).map(([key, value]) => (
                <div key={key} className="border-b border-[#F0F2ED] pb-2">
                  <dt className="text-[#6B7280] font-mono">{key}</dt>
                  <dd className="font-bold text-[#2C3E2E] mt-1 break-words">
                    {(key === 'epod_photo_url' || key === 'epod_signature_data') &&
                    typeof value === 'string' &&
                    (value.startsWith('https://') || value.startsWith('data:image/')) ? (
                      <img
                        src={value}
                        alt={key === 'epod_photo_url' ? 'Ảnh giao hàng tại cửa xe' : 'Chữ ký điện tử'}
                        className="max-h-64 max-w-full rounded-xl border border-gray-200 mt-2"
                      />
                    ) : (
                      str(value)
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
