'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/services/auth';
import {
  Receipt,
  Settings,
  FileDown,
  Printer,
  AlertCircle,
  RefreshCw,
  Loader2,
  BookOpen,
  TrendingUp,
  Wallet,
  Building2,
  ShieldCheck,
  CreditCard,
  Scale,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  Eye,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { DataTable, FormDialog, Row, Field, str } from '@/components/admin/AdminConsole';

const f = (name: string, label: string, type = 'text', value?: string | number): Field => ({
  name,
  label,
  type,
  value,
});

interface ContractLedgerItem {
  contract_id: number;
  contract_code: string;
  status: string;
  fulfillment_status?: string;
  product_name: string;
  buyer_name: string;
  buyer_company?: string;
  buyer_phone?: string;
  farmer_name: string;
  farmer_company?: string;
  farmer_phone?: string;
  totalGoodsAmount: number;
  depositAmount: number;
  balanceAmount: number;
  totalBuyerPaid: number;
  platformFeeAmount: number;
  logisticsFeeAmount: number;
  serviceVatAmount: number;
  honaRealPocket: number;
  farmerPayoutAmount: number;
  cashflowStatus: 'SETTLED_COMPLETED' | 'BUYER_PAID_100' | 'ESCROW_HOLDING_30' | string;
  settled_at?: string;
  bank_transfer_ref?: string;
  deposit_ref?: string;
  payout_ref?: string;
  balance_ref?: string;
}

interface DailyCashflowItem {
  day: string;
  incoming: number;
  outgoing: number;
}

export default function AdminAccountingPage() {
  const [reports, setReports] = useState<Row>({});
  const [settings, setSettings] = useState<Row>({});
  const [cashflowData, setCashflowData] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [dialog, setDialog] = useState<{ title: string; fields: Field[]; submit: (v: Row) => Promise<unknown> } | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);

  // Tab điều hướng
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'DAILY' | 'ENTRIES' | 'DOCUMENTS'>('LEDGER');

  // Bộ lọc bảng đối soát
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal xem chi tiết bút toán dòng tiền của hợp đồng
  const [selectedContractLedger, setSelectedContractLedger] = useState<ContractLedgerItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reportsData, settingsData, cashflowRes] = await Promise.all([
        api<Row>('admin/accounting/vas-reports').catch(() => ({})),
        api<Row>('admin/settings').catch(() => ({})),
        api<any>('admin/accounting/cashflow-summary').catch(() => ({})),
      ]);
      setReports(reportsData || {});
      setSettings(settingsData || {});
      setCashflowData(cashflowRes || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu kế toán & dòng tiền');
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
    a.download = 'hona-b2b-bao-cao-dong-tien-vas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpi = cashflowData?.kpi || {};
  const ledger: ContractLedgerItem[] = cashflowData?.contractLedger || [];
  const dailyCashflow: DailyCashflowItem[] = cashflowData?.dailyCashflow || [];

  const documents = (reports.documents as Row[]) || [];
  const entries = (reports.entries as Row[]) || [];
  const lines = (reports.lines as Row[]) || [];

  // Lọc danh sách đối soát
  const filteredLedger = useMemo(() => {
    return ledger.filter((item) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        item.contract_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.farmer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SETTLED' && item.cashflowStatus === 'SETTLED_COMPLETED') ||
        (statusFilter === 'PAID_100' && item.cashflowStatus === 'BUYER_PAID_100') ||
        (statusFilter === 'ESCROW_30' && item.cashflowStatus === 'ESCROW_HOLDING_30');

      return matchSearch && matchStatus;
    });
  }, [ledger, searchQuery, statusFilter]);

  // Các hợp đồng liên quan đến mục được chọn
  const selectedEntries = useMemo(() => {
    if (!selectedContractLedger) return [];
    return entries.filter(
      (e) => String(e.contract_id) === String(selectedContractLedger.contract_id) || e.contract_code === selectedContractLedger.contract_code
    );
  }, [selectedContractLedger, entries]);

  const selectedEntryIds = useMemo(() => selectedEntries.map((e) => String(e.id)), [selectedEntries]);

  const selectedLines = useMemo(() => {
    if (!selectedEntryIds.length) return [];
    return lines.filter((l) => selectedEntryIds.includes(String(l.entry_id)));
  }, [selectedEntryIds, lines]);

  return (
    <div className="space-y-6">
      {/* 1. BANNER HEADER TRUNG TÂM KẾ TOÁN & KIỂM SOÁT DÒNG TIỀN */}
      <div className="bg-gradient-to-r from-[#10542C] via-[#166534] to-[#0A3D1E] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden print:hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Scale className="w-4 h-4 text-emerald-300" />
              <span>B2B Platform Financial & Escrow Cashflow Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
              <Wallet className="w-7 h-7 text-[#8BC34A]" /> Kế Toán & Kiểm Soát Dòng Tiền Về Túi HoNa
            </h1>
            <p className="text-xs text-white/80 mt-1 max-w-2xl">
              Hệ thống kế toán kép VAS giám sát két ký quỹ Escrow bảo chứng giao dịch, đối soát doanh thu thực tế về túi HoNa, dòng tiền giải ngân cho Nhà vườn và bảng kê thu mua 01/TNDN.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadCsv(ledger.length ? (ledger as unknown as Row[]) : documents)}
              disabled={!ledger.length && !documents.length}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1.5 border border-white/20 cursor-pointer disabled:opacity-50"
            >
              <FileDown className="w-4 h-4 text-emerald-300" />
              <span>Xuất Báo Cáo CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1.5 border border-white/20 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              <span>In Báo Cáo / PDF</span>
            </button>

            <button
              onClick={() =>
                openDialog(
                  'Cấu Hình Tham Số Tỷ Lệ Sàn HoNa',
                  'admin/settings',
                  [
                    f('platformFeeRate', 'Tỷ lệ phí hoa hồng sàn (%) · Từ 1 đến 5', 'number', Number(settings.platform_fee_rate || 2.5)),
                    f('depositRate', 'Tỷ lệ cọc ký quỹ Escrow (%) · Mặc định 30', 'number', Number(settings.deposit_rate || 30)),
                    f('tempMin', 'Ngưỡng nhiệt độ an toàn thấp nhất (°C)', 'number', Number(settings.temp_min || 2)),
                    f('tempMax', 'Ngưỡng nhiệt độ an toàn cao nhất (°C)', 'number', Number(settings.temp_max || 6)),
                    f('serviceVatRate', 'Thuế GTGT dịch vụ sàn (%) · 8 hoặc 10', 'number', Number(settings.service_vat_rate || 8)),
                  ],
                  'PUT'
                )
              }
              className="px-3.5 py-2 rounded-xl bg-[#8BC34A] hover:bg-[#7CB342] text-[#10542C] font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>Tham Số Tỷ Lệ Sàn</span>
            </button>

            <button
              onClick={() => void loadData()}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 transition cursor-pointer flex items-center gap-1"
              title="Làm mới dữ liệu kế toán"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-xs font-bold text-white">Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-2xl flex items-center gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. KHỐI 5 THẺ KPI TÀI CHÍNH — KIỂM SOÁT DÒNG TIỀN VỀ TÚI HONA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 print:grid-cols-3">
        {/* THẺ 1: TIỀN THỰC SỰ VỀ TÚI HONA (TK 5113) */}
        <div className="bg-gradient-to-br from-emerald-900 to-[#10542C] text-white rounded-3xl p-5 shadow-sm border border-emerald-700/50 relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200 block">
              Tiền Về Túi HoNa (TK 5113)
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white">
            {Number(kpi.totalHonaRevenue || 0).toLocaleString('vi-VN')} đ
          </div>
          <p className="text-[11px] text-emerald-200/90 leading-tight">
            Doanh thu ròng sàn giữ lại (Phí hoa hồng 2.5% + Phí xe tải lạnh).
          </p>
        </div>

        {/* THẺ 2: SỐ DƯ TÀI KHOẢN NGÂN HÀNG SÀN (TK 112) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Số Dư Ngân Hàng (TK 112)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-blue-900">
            {Number(kpi.totalBankBalance || 0).toLocaleString('vi-VN')} đ
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Tổng tiền mặt khả dụng hiện có trong tài khoản thanh toán sàn.
          </p>
        </div>

        {/* THẺ 3: TIỀN KÝ QUỸ ESCROW ĐANG GIỮ HỘ (TK 3388) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
              Két Ký Quỹ Escrow (TK 3388)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-amber-800">
            {Number(kpi.totalEscrowHeld || 0).toLocaleString('vi-VN')} đ
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Tiền cọc & tiền hàng giữ hộ trung gian, chưa quyết toán cho Farmer.
          </p>
        </div>

        {/* THẺ 4: TIỀN ĐÃ GIẢI NGÂN CHO NHÀ VƯỜN (PAYOUT) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block">
              Đã Payout Cho Nông Dân
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-indigo-900">
            {Number(kpi.totalFarmerPayouts || 0).toLocaleString('vi-VN')} đ
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Tổng tiền sàn đã chuyển khoản thanh toán ròng cho đối tác Nông dân.
          </p>
        </div>

        {/* THẺ 5: THUẾ GTGT DỊCH VỤ PHẢI NỘP (TK 3331) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Thuế VAT Thu Hộ (TK 3331)
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-slate-800">
            {Number(kpi.totalVatPayable || 0).toLocaleString('vi-VN')} đ
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Thuế VAT 8% tính trên phí dịch vụ sàn thu hộ nhà nước.
          </p>
        </div>
      </div>

      {/* 3. THANH TAB ĐIỀU HƯỚNG BÁO CÁO KẾ TOÁN */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 print:hidden">
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'LEDGER'
              ? 'bg-[#10542C] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Bảng Đối Soát Dòng Tiền Hợp Đồng ({ledger.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DAILY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'DAILY'
              ? 'bg-[#10542C] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Dòng Tiền Vào / Ra Theo Ngày ({dailyCashflow.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ENTRIES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'ENTRIES'
              ? 'bg-[#10542C] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Sổ Nhật Ký Chung & Bút Toán Kép VAS ({entries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DOCUMENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'DOCUMENTS'
              ? 'bg-[#10542C] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bảng Kê Quyết Toán 01/TNDN & Hóa Đơn ({documents.length})</span>
        </button>
      </div>

      {/* 4. TAB 1: BẢNG ĐỐI SOÁT DÒNG TIỀN TỪNG HỢP ĐỒNG (CONTRACT CASHFLOW LEDGER) */}
      {activeTab === 'LEDGER' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-heading font-black text-sm text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#10542C]" />
                <span>Bảng Đối Soát Dòng Tiền & Tiền Về Túi HoNa Theo Từng Hợp Đồng</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kiểm soát từng dòng tiền: Tiền Buyer đã thanh toán, tiền sàn giữ lại về túi, và tiền thực giải ngân cho nông dân
              </p>
            </div>

            {/* Thanh tìm kiếm & bộ lọc */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã HĐ, Buyer, Nông dân..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-emerald-600 w-56"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-emerald-600 bg-white"
              >
                <option value="ALL">Tất cả trạng thái ({ledger.length})</option>
                <option value="SETTLED">Đã chốt sổ về túi HoNa (SETTLED)</option>
                <option value="PAID_100">Đã thu đủ 100% chờ chốt (DELIVERED)</option>
                <option value="ESCROW_30">Đang giữ cọc 30% Escrow</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-[#10542C] animate-spin" />
              <span>Đang tính toán dòng tiền đối soát...</span>
            </div>
          ) : filteredLedger.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-800">Không tìm thấy giao dịch nào phù hợp.</p>
              <p className="text-slate-400">Các hợp đồng B2B có phát sinh nộp cọc hoặc thanh toán sẽ tự động xuất hiện tại đây.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3">Hợp Đồng & Nông Sản</th>
                    <th className="py-3 px-3">Thương Lái (Buyer)</th>
                    <th className="py-3 px-3">Nhà Vườn (Farmer)</th>
                    <th className="py-3 px-3 text-right">Tổng Tiền Hàng</th>
                    <th className="py-3 px-3 text-right">Buyer Đã Nộp</th>
                    <th className="py-3 px-3 text-right text-emerald-800 bg-emerald-50/40">Tiền Về Túi HoNa</th>
                    <th className="py-3 px-3 text-right">Payout Nông Dân</th>
                    <th className="py-3 px-3 text-center">Trạng Thái Dòng Tiền</th>
                    <th className="py-3 px-3 text-center">Bút Toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLedger.map((item) => {
                    const isSettled = item.cashflowStatus === 'SETTLED_COMPLETED';
                    const isPaid100 = item.cashflowStatus === 'BUYER_PAID_100';

                    return (
                      <tr key={item.contract_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block w-fit mb-1">
                            {item.contract_code}
                          </span>
                          <span className="text-slate-800 font-semibold block">{item.product_name}</span>
                          <span className="text-[10px] text-slate-400">HĐ #{item.contract_id}</span>
                        </td>

                        <td className="py-3 px-3">
                          <strong className="text-slate-900 block">{item.buyer_company || item.buyer_name}</strong>
                          <span className="text-slate-500 font-mono text-[11px]">{item.buyer_phone || '0987654321'}</span>
                        </td>

                        <td className="py-3 px-3">
                          <strong className="text-slate-900 block">{item.farmer_company || item.farmer_name}</strong>
                          <span className="text-slate-500 font-mono text-[11px]">{item.farmer_phone || '0912345678'}</span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                          {Number(item.totalGoodsAmount || 0).toLocaleString('vi-VN')} đ
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="font-mono font-bold text-slate-900 block">
                            {Number(item.totalBuyerPaid || 0).toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {isSettled || isPaid100 ? '100% (Cọc 30% + Nốt 70%)' : 'Đã nộp cọc 30%'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right bg-emerald-50/40">
                          <strong className="font-mono text-sm text-[#10542C] block">
                            + {Number(item.honaRealPocket || 0).toLocaleString('vi-VN')} đ
                          </strong>
                          <span className="text-[10px] text-emerald-700 block">
                            Phí sàn: {Number(item.platformFeeAmount || 0).toLocaleString('vi-VN')} đ
                          </span>
                          {Number(item.logisticsFeeAmount || 0) > 0 && (
                            <span className="text-[10px] text-emerald-700 block">
                              Xe lạnh: {Number(item.logisticsFeeAmount || 0).toLocaleString('vi-VN')} đ
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-indigo-900 font-semibold">
                          {Number(item.farmerPayoutAmount || 0).toLocaleString('vi-VN')} đ
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border block w-fit mx-auto ${
                              isSettled
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isPaid100
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {isSettled
                              ? '✓ ĐÃ VỀ TÚI HONA (SETTLED)'
                              : isPaid100
                              ? 'ĐÃ THU ĐỦ 100% (DELIVERED)'
                              : 'GIỮ CỌC 30% ESCROW'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedContractLedger(item)}
                            className="px-2.5 py-1 text-xs font-bold text-[#10542C] bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Bút Toán</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: BIẾN ĐỘNG DÒNG TIỀN VÀO / RA THEO NGÀY */}
      {activeTab === 'DAILY' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="font-heading font-black text-sm text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#10542C]" />
                <span>Nhật Ký Biến Động Dòng Tiền Vào / Ra Hàng Ngày (Tài Khoản Ngân Hàng 112)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi dòng tiền nộp vào từ Buyer và dòng tiền chuyển khoản giải ngân Payout cho Nông dân
              </p>
            </div>
            <span className="text-xs text-slate-500">
              Ghi nhận trong <strong className="text-emerald-800 font-bold">{dailyCashflow.length}</strong> ngày gần nhất
            </span>
          </div>

          {dailyCashflow.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-800">Chưa có phát sinh dòng tiền vào / ra.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Ngày Ghi Nhận</th>
                    <th className="py-3 px-4 text-right text-emerald-800">Tiền Vào (Buyer Nộp)</th>
                    <th className="py-3 px-4 text-right text-rose-800">Tiền Ra (Payout Nông Dân)</th>
                    <th className="py-3 px-4 text-right">Dòng Tiền Ròng Trong Ngày (Net Inflow)</th>
                    <th className="py-3 px-4 text-center">Trạng Thái Dòng Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyCashflow.map((d, idx) => {
                    const net = Number(d.incoming || 0) - Number(d.outgoing || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {d.day}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          + {Number(d.incoming || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                          {Number(d.outgoing || 0) > 0 ? `- ${Number(d.outgoing || 0).toLocaleString('vi-VN')} đ` : '0 đ'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          {net >= 0 ? `+ ${net.toLocaleString('vi-VN')}` : net.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              net >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {net >= 0 ? 'Thặng Dư Dòng Tiền' : 'Chi Giải Ngân Lớn'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 3: SỔ NHẬT KÝ CHUNG & BÚT TOÁN KÉP VAS (ACCOUNTS 112, 3388, 5113, 3331) */}
      {activeTab === 'ENTRIES' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="font-heading font-black text-sm text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#10542C]" />
                <span>Sổ Nhật Ký Chung & Bút Toán Kế Toán Kép VAS (Journal Entries & Lines)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nguyên tắc kế toán kép bất biến: Tổng Nợ (Debit) luôn bằng Tổng Có (Credit)
              </p>
            </div>
            <span className="text-xs text-slate-500">
              <strong className="text-emerald-800 font-bold">{entries.length}</strong> sự kiện nghiệp vụ ·{' '}
              <strong className="text-emerald-800 font-bold">{lines.length}</strong> dòng định khoản
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-800">Chưa có bút toán ghi nhận trong sổ nhật ký chung.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Sổ nhật ký chung */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Sự Kiện Nghiệp Vụ Sàn (Journal Entries)</span>
                </p>
                <DataTable
                  rows={entries}
                  columns={[
                    ['id', 'Mã'],
                    ['contract_code', 'Hợp Đồng'],
                    ['event', 'Sự Kiện'],
                    ['reference', 'Mã Giao Dịch'],
                    ['created_at', 'Thời Điểm'],
                  ]}
                />
              </div>

              {/* Bút toán định khoản Nợ / Có */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Định Khoản Nợ / Có (Debit / Credit Lines)</span>
                </p>
                <DataTable
                  rows={lines}
                  columns={[
                    ['entry_id', 'Mã Sự Kiện'],
                    ['account', 'Tài Khoản (TK)'],
                    ['debit', 'Nợ (Debit)'],
                    ['credit', 'Có (Credit)'],
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. TAB 4: BẢNG KÊ QUYẾT TOÁN 01/TNDN & HÓA ĐƠN SÀN */}
      {activeTab === 'DOCUMENTS' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="font-heading font-black text-sm text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#10542C]" />
                <span>Bảng Kê Quyết Toán Chứng Từ Thuế Nông Sản (Mẫu 01/TNDN & Hóa Đơn Sàn)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chuẩn mực kế toán VAS & Bảng kê thu mua nông sản trực tiếp từ hộ nông dân không có hóa đơn
              </p>
            </div>
            <span className="text-xs text-slate-500">
              Hiển thị <strong className="text-emerald-800 font-bold">{documents.length}</strong> chứng từ đã quyết toán
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-[#10542C] animate-spin" />
              <span>Đang tải bảng kê kế toán...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-800">Chưa có chứng từ kế toán trong cơ sở dữ liệu.</p>
              <p className="text-slate-400">Khi các hợp đồng B2B hoàn tất thanh toán hoặc quyết toán, bảng kê chứng từ sẽ tự động xuất tại đây.</p>
            </div>
          ) : (
            <DataTable
              rows={documents}
              columns={[
                ['contract_code', 'Mã Hợp Đồng'],
                ['company_name', 'Nông Trại / HTX'],
                ['tax_code', 'Mã Số Thuế'],
                ['document_type', 'Loại Chứng Từ'],
                ['total_goods_amount', 'Tổng Giá Trị (đ)'],
                ['payout_amount', 'Số Tiền Thực Giải Ngân (đ)'],
              ]}
              actions={(row) => (
                <button
                  type="button"
                  onClick={() => setDetail(row)}
                  className="px-2.5 py-1 text-xs font-medium text-[#10542C] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                >
                  Chi tiết
                </button>
              )}
            />
          )}
        </div>
      )}

      {/* MODAL 1: XEM CHI TIẾT ĐỐI SOÁT & BÚT TOÁN CỦA MỘT HỢP ĐỒNG CỤ THỂ */}
      {selectedContractLedger && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800">
                <Receipt className="w-5 h-5 text-[#10542C]" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Đối Soát Dòng Tiền Hợp Đồng {selectedContractLedger.contract_code}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Sản phẩm: {selectedContractLedger.product_name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedContractLedger(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Chi tiết phân chia dòng tiền */}
            <div className="space-y-3 text-xs">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between font-bold text-emerald-950 text-sm">
                  <span>Tổng tiền Buyer đã nộp sàn:</span>
                  <span className="font-mono text-base">
                    {Number(selectedContractLedger.totalBuyerPaid || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800 pt-1 border-t border-emerald-200/60">
                  <div>Cọc 30% Escrow: {Number(selectedContractLedger.depositAmount || 0).toLocaleString('vi-VN')} đ</div>
                  <div>Thanh toán nốt 70%: {Number(selectedContractLedger.balanceAmount || 0).toLocaleString('vi-VN')} đ</div>
                </div>
              </div>

              {/* DÒNG TIỀN VỀ TÚI HONA */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between font-bold text-[#10542C] text-sm">
                  <span>TIỀN THỰC SỰ VỀ TÚI HONA (TK 5113):</span>
                  <span className="font-mono text-base">
                    + {Number(selectedContractLedger.honaRealPocket || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200">
                  <div className="flex justify-between">
                    <span>Phí hoa hồng sàn HoNa (2.5%):</span>
                    <strong className="font-mono">{Number(selectedContractLedger.platformFeeAmount || 0).toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Phí vận chuyển xe tải lạnh:</span>
                    <strong className="font-mono">{Number(selectedContractLedger.logisticsFeeAmount || 0).toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Thuế VAT 8% thu hộ (TK 3331):</span>
                    <span className="font-mono">{Number(selectedContractLedger.serviceVatAmount || 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              </div>

              {/* DÒNG TIỀN PAYOUT CHO NÔNG DÂN */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between font-bold text-indigo-950 text-sm">
                  <span>TIỀN GIẢI NGÂN CHO NÔNG DÂN (PAYOUT):</span>
                  <span className="font-mono text-base text-indigo-900">
                    {Number(selectedContractLedger.farmerPayoutAmount || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="text-[11px] text-indigo-800 space-y-0.5 pt-1 border-t border-indigo-200/60">
                  <p><strong>Người thụ hưởng:</strong> {selectedContractLedger.farmer_name} ({selectedContractLedger.farmer_company})</p>
                  <p><strong>Ngân hàng thụ hưởng:</strong> Vietcombank · 0123456789 (NGUYEN VAN NONG)</p>
                  <p><strong>Mã giao dịch giải ngân:</strong> {selectedContractLedger.payout_ref || selectedContractLedger.bank_transfer_ref || 'PAY-SUCCESS'}</p>
                </div>
              </div>

              {/* Bút toán định khoản liên quan */}
              {selectedLines.length > 0 && (
                <div className="space-y-2 pt-2">
                  <strong className="text-slate-800 block text-xs">Các bút toán kế toán kép liên quan (TK 112, 3388, 5113, 3331):</strong>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold">
                          <th className="py-1 px-2">Mã Sự Kiện</th>
                          <th className="py-1 px-2">Tài Khoản (TK)</th>
                          <th className="py-1 px-2 text-right text-emerald-800">Nợ (Debit)</th>
                          <th className="py-1 px-2 text-right text-rose-800">Có (Credit)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedLines.map((l, i) => (
                          <tr key={i}>
                            <td className="py-1 px-2 font-mono">Entry #{String(l.entry_id)}</td>
                            <td className="py-1 px-2 font-bold font-mono text-slate-800">TK {String(l.account)}</td>
                            <td className="py-1 px-2 text-right font-mono text-emerald-700">
                              {Number(l.debit || 0) > 0 ? Number(l.debit).toLocaleString('vi-VN') + ' đ' : '-'}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-rose-700">
                              {Number(l.credit || 0) > 0 ? Number(l.credit).toLocaleString('vi-VN') + ' đ' : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedContractLedger(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DIALOG FORM CẤU HÌNH THAM SỐ TOÀN SÀN */}
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

      {/* MODAL 3: XEM CHI TIẾT BẢNG KÊ CHỨNG TỪ NÔNG SẢN */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex justify-center items-center">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#2C3E2E]">Chi Tiết Bảng Kê Quyết Toán Nông Sản</h2>
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
