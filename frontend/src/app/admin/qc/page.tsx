'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/auth';
import { Warehouse, Plus, AlertCircle, RefreshCw, Loader2, Snowflake, CheckCircle2, Clock } from 'lucide-react';
import { DataTable, FormDialog, Row, Field } from '@/components/admin/AdminConsole';

const str = (value: unknown) => value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
const f = (name: string, label: string, type = 'text', value?: string | number): Field => ({ name, label, type, value });
const select = (name: string, label: string, options: string[]): Field => ({ name, label, options });

const assetForm: Field[] = [
  f('assetCode', 'Mã buồng bảo quản (VD: ROOM-A1)'),
  f('assetName', 'Tên buồng lạnh (VD: Buồng lạnh Rau ăn lá A1)'),
  select('assetType', 'Loại tài sản', ['COLD_ROOM']),
  f('capacityKg', 'Sức chứa tối đa (kg)', 'number', 10000),
];

export default function AdminQcPage() {
  const [coldRooms, setColdRooms] = useState<Row[]>([]);
  const [inspections, setInspections] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ title: string; fields: Field[]; submit: (v: Row) => Promise<unknown> } | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [assetsData, inspectionsData] = await Promise.all([
        api<Row[]>('admin/cold-assets').catch(() => []),
        api<Row[]>('admin/hub-inspections').catch(() => []),
      ]);
      const assets = Array.isArray(assetsData) ? assetsData : [];
      setColdRooms(assets.filter((r) => r.asset_type === 'COLD_ROOM'));
      setInspections(Array.isArray(inspectionsData) ? inspectionsData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu trạm QC');
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
              <Warehouse className="w-7 h-7 text-[#8BC34A]" /> Trạm Kiểm Định QC & Kho Lạnh FEFO
            </h1>
            <p className="text-xs text-white/80 mt-1">
              Module 4: Quản trị các buồng lạnh bảo quản tại trạm trung chuyển, nghiệm thu kiểm định chất lượng và xuất kho FEFO.
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

      {/* Toolbar Thao Tác QC */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => openDialog('Thêm Buồng Lạnh Bảo Quản Mới', 'admin/cold-assets', assetForm)}
          className="px-4 py-2.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Thêm Buồng Lạnh
        </button>

        <button
          onClick={() =>
            openDialog('Lập Phiếu Nghiệm Thu Kiểm Định QC Tại Trạm', 'admin/hub-inspections', [
              f('contractId', 'ID Hợp đồng đã nhận cọc 30%', 'number'),
              f('coldRoomId', 'ID Buồng lạnh tiếp nhận lưu kho', 'number'),
              f('receivedWeightKg', 'Khối lượng hàng nhập thực tế (kg)', 'number'),
              f('qualifiedWeightKg', 'Khối lượng đạt chuẩn nhập kho (kg)', 'number'),
              f('brix', 'Độ ngọt Brix đo được (°Bx)', 'number', 0),
              f('moisture', 'Độ ẩm đo được (%)', 'number', 85),
              f('note', 'Ghi chú cảm quan chất lượng nông sản'),
            ])
          }
          className="px-4 py-2.5 rounded-xl border border-[#10542C]/20 bg-[#EAF5E9] hover:bg-[#D7EED6] text-[#10542C] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" /> Lập Biên Bản Kiểm Định QC
        </button>
      </div>

      {/* Danh Sách Buồng Lạnh Tại Trạm */}
      <div className="space-y-3">
        <h3 className="font-heading font-black text-sm text-[#2C3E2E] flex items-center gap-2">
          <Snowflake className="w-4 h-4 text-[#10542C]" />
          <span>Danh Sách Buồng Lạnh Bảo Quản ({coldRooms.length})</span>
        </h3>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8] flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-[#10542C] animate-spin" />
            <span>Đang tải danh sách buồng lạnh...</span>
          </div>
        ) : coldRooms.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8]">
            <p className="font-bold text-[#2C3E2E]">Chưa có buồng lạnh nào trong cơ sở dữ liệu.</p>
            <p className="mt-1">Bấm &quot;Thêm Buồng Lạnh&quot; để khai báo cơ sở hạ tầng kho trạm trung chuyển.</p>
          </div>
        ) : (
          <DataTable
            rows={coldRooms}
            columns={[
              ['id', 'ID'],
              ['asset_code', 'Mã Buồng'],
              ['asset_name', 'Tên Buồng Lạnh'],
              ['capacity_kg', 'Sức Chứa (kg)'],
              ['occupied_kg', 'Đang Lưu Trữ (kg)'],
              ['current_temp', 'Nhiệt Độ Hiện Thời (°C)'],
              ['status', 'Trạng Thái'],
            ]}
          />
        )}
      </div>

      {/* Bảng Ưu Tiên Xuất Kho FEFO */}
      <div className="space-y-3 pt-4 border-t border-[#EAECE8]">
        <h3 className="font-heading font-black text-sm text-[#2C3E2E] flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Thuật Toán Ưu Tiên Xuất Kho FEFO (First Expired, First Out) ({inspections.length})</span>
        </h3>

        {inspections.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8]">
            <p className="font-bold text-[#2C3E2E]">Chưa có phiếu kiểm định QC nào trong cơ sở dữ liệu.</p>
          </div>
        ) : (
          <DataTable
            rows={inspections}
            columns={[
              ['inspection_code', 'Mã Kiểm Định'],
              ['contract_code', 'Mã Hợp Đồng'],
              ['product_name', 'Nông Sản'],
              ['qualified_weight_kg', 'Khối Lượng Đạt (kg)'],
              ['rejected_weight_kg', 'Khối Lượng Loại (kg)'],
              ['expiry_date', 'Ngày Hết Hạn'],
              ['fefo_priority_score', 'Số Ngày Còn Lại'],
            ]}
            actions={(row) => (
              <div className="flex items-center gap-2">
                {Number(row.fefo_priority_score) < 2 && (
                  <span className="text-red-700 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-md">
                    Ưu tiên xuất ngay
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setDetail(row)}
                  className="px-2.5 py-1 text-xs font-bold text-[#10542C] bg-[#EAF5E9] hover:bg-[#D7EED6] rounded-lg transition-colors cursor-pointer"
                >
                  Xem biên bản
                </button>
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

      {/* Modal Chi Tiết */}
      {detail && (
        <div className="fixed inset-0 z-[150] bg-black/40 p-4 flex justify-center items-center">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#2C3E2E]">Biên Bản Kiểm Định QC Trạm</h2>
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
                <div key={key} className="border-b border-[#F0F2ED] pb-2 flex justify-between gap-4">
                  <dt className="text-[#6B7280] font-mono shrink-0">{key}</dt>
                  <dd className="font-bold text-[#2C3E2E] text-right break-words">{str(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
