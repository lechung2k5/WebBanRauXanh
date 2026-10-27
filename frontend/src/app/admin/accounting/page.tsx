'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/auth';
import { Receipt, Settings, FileDown, Printer, AlertCircle, RefreshCw, Loader2, BookOpen } from 'lucide-react';
import { DataTable, FormDialog, Row, Field } from '@/components/admin/AdminConsole';

const str = (value: unknown) => value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
const f = (name: string, label: string, type = 'text', value?: string | number): Field => ({ name, label, type, value });

export default function AdminAccountingPage() {
  const [reports, setReports] = useState<Row>({});
  const [settings, setSettings] = useState<Row>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ title: string; fields: Field[]; submit: (v: Row) => Promise<unknown> } | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reportsData, settingsData] = await Promise.all([
        api<Row>('admin/accounting/vas-reports').catch(() => ({})),
        api<Row>('admin/settings').catch(() => ({})),
      ]);
      setReports(reportsData || {});
      setSettings(settingsData || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được báo cáo kế toán');
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

  const downloadCsv = (data: Row[]) => {
    if (!data.length) return;
    const columns = [...new Set(data.flatMap(Object.keys))];
    const escape = (v: unknown) => '"' + (/^[=+\-@]/.test(str(v)) ? "'" : '') + str(v).replaceAll('"', '""') + '"';
    const csv = '\uFEFF' + [columns.join(','), ...data.map((row) => columns.map((k) => escape(row[k])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hona-b2b-bao-cao-vas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const documents = (reports.documents as Row[]) || [];
  const entries = (reports.entries as Row[]) || [];
  const lines = (reports.lines as Row[]) || [];

  return (
    <div className="space-y-6">
      {/* Banner Chuẩn HoNa Fresh */}
      <div className="bg-gradient-to-r from-[#10542C] via-[#1B6D3D] to-[#0A4020] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden print:hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
              <Receipt className="w-7 h-7 text-[#8BC34A]" /> Báo Cáo Kế Toán Thuế VAS & Cài Đặt Sàn
            </h1>
            <p className="text-xs text-white/80 mt-1">
              Module 7: Tự động hóa chuẩn mực kế toán Việt Nam (VAS), bảng kê 01/TNDN, hóa đơn sàn và thiết lập tham số sàn.
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
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-2xl flex items-center gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar Thao Tác Kế Toán & Cấu Hình */}
      <div className="flex flex-wrap gap-3 items-center print:hidden">
        <button
          onClick={() => downloadCsv(documents)}
          disabled={!documents.length}
          className="px-4 py-2.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" /> Xuất Báo Cáo CSV
        </button>

        <button
          onClick={() => window.print()}
          className="px-4 py-2.5 rounded-xl border border-[#EAECE8] bg-white hover:bg-gray-50 text-[#2C3E2E] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Printer className="w-4 h-4 text-[#6B7280]" /> In / Lưu Bản PDF
        </button>

        <button
          onClick={() =>
            openDialog(
              'Cấu Hình Tham Số Vận Hành Toàn Sàn',
              'admin/settings',
              [
                f('platformFeeRate', 'Tỷ lệ phí hoa hồng sàn (%) · Từ 1 đến 5', 'number', Number(settings.platform_fee_rate || 3)),
                f('depositRate', 'Tỷ lệ cọc ký quỹ Escrow (%) · Mặc định 30', 'number', Number(settings.deposit_rate || 30)),
                f('tempMin', 'Ngưỡng nhiệt độ an toàn thấp nhất (°C)', 'number', Number(settings.temp_min || 2)),
                f('tempMax', 'Ngưỡng nhiệt độ an toàn cao nhất (°C)', 'number', Number(settings.temp_max || 6)),
                f('serviceVatRate', 'Thuế GTGT dịch vụ sàn (%) · 8 hoặc 10', 'number', Number(settings.service_vat_rate || 8)),
              ],
              'PUT'
            )
          }
          className="px-4 py-2.5 rounded-xl border border-[#10542C]/20 bg-[#EAF5E9] hover:bg-[#D7EED6] text-[#10542C] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Settings className="w-4 h-4" /> Tham Số Vận Hành Sàn
        </button>
      </div>

      {/* Bảng Kê Quyết Toán Nội Bộ (Mẫu 01/TNDN & Hóa đơn) */}
      <div className="space-y-3">
        <h3 className="font-heading font-black text-sm text-[#2C3E2E] flex items-center justify-between">
          <span>Bảng Kê Quyết Toán Chứng Từ Thuế Nông Sản ({documents.length})</span>
          <span className="text-xs font-normal text-[#6B7280]">Chuẩn mực VAS & Mẫu 01/TNDN</span>
        </h3>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8] flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-[#10542C] animate-spin" />
            <span>Đang tải bảng kê kế toán...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8]">
            <p className="font-bold text-[#2C3E2E]">Chưa có chứng từ kế toán trong cơ sở dữ liệu.</p>
            <p className="mt-1">Khi các hợp đồng B2B hoàn tất thanh toán hoặc quyết toán, bảng kê chứng từ sẽ tự động xuất tại đây.</p>
          </div>
        ) : (
          <DataTable
            rows={documents}
            columns={[
              ['contract_code', 'Mã Hợp Đồng'],
              ['company_name', 'Nông Trại / HTX Bán Hàng'],
              ['tax_code', 'Mã Số Thuế'],
              ['document_type', 'Loại Chứng Từ'],
              ['total_goods_amount', 'Tổng Giá Trị (đ)'],
              ['payout_amount', 'Số Tiền Thực Giải Ngân (đ)'],
            ]}
            actions={(row) => (
              <button
                type="button"
                onClick={() => setDetail(row)}
                className="px-2.5 py-1 text-xs font-bold text-[#10542C] bg-[#EAF5E9] hover:bg-[#D7EED6] rounded-lg transition-colors cursor-pointer"
              >
                Chi tiết
              </button>
            )}
          />
        )}
      </div>

      {/* Sổ Nhật Ký Chung & Bút Toán Kế Toán */}
      <div className="space-y-4 pt-4 border-t border-[#EAECE8]">
        <h3 className="font-heading font-black text-sm text-[#2C3E2E] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#10542C]" />
          <span>Sổ Nhật Ký Chung Hệ Thống ({entries.length} Nghiệp vụ · {lines.length} Bút toán)</span>
        </h3>

        {entries.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8]">
            <p className="font-bold text-[#2C3E2E]">Chưa có bút toán ghi nhận trong sổ nhật ký chung.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-[#EAECE8] space-y-2">
              <p className="text-xs font-bold text-[#2C3E2E]">Sổ Nhật Ký Chung (Entries)</p>
              <DataTable
                rows={entries}
                columns={[
                  ['id', 'ID'],
                  ['contract_code', 'Hợp Đồng'],
                  ['event', 'Sự Kiện Nghiệp Vụ'],
                  ['reference', 'Mã Tham Chiếu'],
                  ['created_at', 'Thời Điểm'],
                ]}
              />
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#EAECE8] space-y-2">
              <p className="text-xs font-bold text-[#2C3E2E]">Định Khoản Nợ / Có (Accounting Lines)</p>
              <DataTable
                rows={lines}
                columns={[
                  ['entry_id', 'Bút Toán'],
                  ['account', 'Tài Khoản (TK)'],
                  ['debit', 'Nợ (đ)'],
                  ['credit', 'Có (đ)'],
                ]}
              />
            </div>
          </div>
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
              <h2 className="text-lg font-bold text-[#2C3E2E]">Chi Tiết Bảng Kê Quyết Toán</h2>
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
