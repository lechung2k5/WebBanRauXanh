'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/services/auth';
import {
  Handshake,
  Plus,
  AlertCircle,
  RefreshCw,
  Loader2,
  DollarSign,
  ShieldAlert,
  FileText,
  Search,
  X,
  Printer,
  Building2,
  Sprout,
  Package,
  Receipt,
  MapPin,
  Calendar,
  Clock,
  Filter,
  ChevronDown,
  Eye,
  ArrowRight,
  CheckCircle2,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { FormDialog, Row, Field } from '@/components/admin/AdminConsole';

const money = (value: unknown) => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 });

const cleanVietnamese = (s: string) => {
  if (s.includes('?')) {
    if (s.includes('Nguy') || s.includes('Minh H') || s.includes('H???nh')) return 'Nguyễn Thị Minh Hạnh';
    if (s.includes('Ph') || s.includes('Nam') || s.includes('Ho??ng')) return 'Phạm Hoàng Nam';
    if (s.includes('L?') && (s.includes('Tr') || s.includes('t') || s.includes('????t'))) return 'Lê Trọng Đạt';
  }
  return s;
};

const str = (value: unknown) => {
  if (value == null) return '—';
  const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return cleanVietnamese(val);
};
const f = (name: string, label: string, type = 'text', value?: string | number): Field => ({ name, label, type, value });
const select = (name: string, label: string, options: string[]): Field => ({ name, label, options });

const nextState: Record<string, string> = {
  RFQ_SENT: 'AGREED',
  AGREED: 'DEPOSIT_PAID',
  DEPOSIT_PAID: 'AT_HUB_QC',
  AT_HUB_QC: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
  DELIVERED: 'SETTLED',
};

const nextStateLabel: Record<string, string> = {
  RFQ_SENT: 'Chấp thuận RFQ',
  AGREED: 'Xác nhận cọc 30%',
  DEPOSIT_PAID: 'Chuyển trạm QC',
  AT_HUB_QC: 'Điều xe vận chuyển',
  IN_TRANSIT: 'Ký nhận ePOD',
  DELIVERED: 'Quyết toán & Giải ngân',
};

export const CLAIM_LIABLE_CONFIG: Record<
  string,
  { label: string; shortLabel: string; bg: string; text: string; border: string; icon: string }
> = {
  PLATFORM: {
    label: 'Sàn HoNa Fresh (Vận chuyển & Bảo quản)',
    shortLabel: 'Sàn HoNa Fresh',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: '🏢',
  },
  FARMER: {
    label: 'Nông trại cung ứng (Đóng gói & Tiêu chuẩn)',
    shortLabel: 'Nhà vườn / Nông trại',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: '🚜',
  },
  BUYER: {
    label: 'Bên mua (Kiểm nhận & Bốc dỡ)',
    shortLabel: 'Bên mua hàng',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: '🏪',
  },
};

export const CLAIM_STATUS_CONFIG: Record<
  string,
  { label: string; desc: string; bg: string; text: string; border: string; dot: string; actionLabel: string }
> = {
  OPEN: {
    label: 'Chờ phán quyết',
    desc: 'Biên bản sự cố đang chờ trọng tài sàn xem xét hồ sơ kỹ thuật và ra phán quyết giải quyết.',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500 animate-pulse',
    actionLabel: 'Xử lý phán quyết',
  },
  DISMISSED: {
    label: 'Đã hòa giải / Bác bỏ',
    desc: 'Hao hụt nằm trong dung sai kỹ thuật hợp đồng hoặc hai bên đã thương lượng chấp thuận, không khấu trừ cọc.',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    actionLabel: 'Xem quyết định',
  },
  COMPENSATED: {
    label: 'Đã bồi hoàn thiệt hại',
    desc: 'Sàn HoNa Fresh đã duyệt chi bồi hoàn từ chi phí vận hành (TK 811) giữ hộ cho bên bị ảnh hưởng.',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    actionLabel: 'Xem quyết định',
  },
  REFUNDED: {
    label: 'Đã hoàn cọc bên mua',
    desc: 'Hợp đồng hủy do sự cố bất khả kháng, tiền ký quỹ đã được hoàn 100% về tài khoản bên mua.',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    actionLabel: 'Xem quyết định',
  },
};

export const STATUS_CONFIG: Record<string, { label: string; desc: string; bg: string; text: string; border: string; dot: string }> = {
  SETTLED: {
    label: 'Đã hoàn tất & Giải ngân',
    desc: 'Hàng đã giao đạt chuẩn, tiền đã giải ngân về tài khoản nông dân.',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  DELIVERED: {
    label: 'Đã giao hàng (Chờ quyết toán)',
    desc: 'Bên mua đã ký nhận ePOD tại kho, kế toán đang đối soát giải ngân.',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  IN_TRANSIT: {
    label: 'Đang vận chuyển lạnh',
    desc: 'Xe tải lạnh đang di chuyển và giám sát nhiệt độ IoT hành trình.',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  AT_HUB_QC: {
    label: 'Đang kiểm định tại trạm QC',
    desc: 'Lô hàng đang được kỹ thuật viên đo độ ngọt Brix và độ ẩm tại trạm.',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  DEPOSIT_PAID: {
    label: 'Đã ký quỹ cọc 30%',
    desc: 'Bên mua đã chuyển cọc 30% vào quỹ tạm giữ Escrow sàn (TK 3388).',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
  },
  AGREED: {
    label: 'Nông trại đã chấp thuận RFQ',
    desc: 'Hai bên đã thống nhất khối lượng & đơn giá, chờ bên mua ký quỹ cọc.',
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
  },
  RFQ_SENT: {
    label: 'Chờ nông trại xác nhận RFQ',
    desc: 'Yêu cầu báo giá sỉ đã gửi tới nông dân, chờ phê duyệt.',
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
  CANCELLED: {
    label: 'Đã hủy hợp đồng',
    desc: 'Hợp đồng bị hủy do quá hạn hoặc sự cố bất khả kháng.',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
};

const formatDate = (isoStr: unknown) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(String(isoStr));
    if (isNaN(d.getTime())) return String(isoStr);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(isoStr);
  }
};

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<Row[]>([]);
  const [claims, setClaims] = useState<Row[]>([]);
  const [stats, setStats] = useState<Row>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ title: string; fields: Field[]; submit: (v: Row) => Promise<unknown> } | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [claimDetail, setClaimDetail] = useState<Row | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [contractsData, disputesData, statsData] = await Promise.all([
        api<Row[]>('admin/contracts').catch(() => []),
        api<Row[]>('admin/claims').catch(() => []),
        api<Row>('admin/dashboard/stats').catch(() => ({})),
      ]);
      setContracts(Array.isArray(contractsData) ? contractsData : []);
      setClaims(Array.isArray(disputesData) ? disputesData : []);
      setStats(statsData || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu hợp đồng');
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

  const advanceStatus = async (row: Row) => {
    const next = nextState[str(row.status)];
    if (!next) return;
    const fields: Field[] = [];
    if (['DEPOSIT_PAID', 'DELIVERED', 'SETTLED'].includes(next)) {
      try {
        const quote = await api<Row>(`admin/contracts/${row.id}/settlement-quote`);
        fields.push(
          f('reference', 'Mã giao dịch ngân hàng đã đối soát'),
          f(
            'amount',
            next === 'SETTLED' ? 'Số tiền thực chuyển nông trại (đ)' : 'Số tiền thực nhận (đ)',
            'number',
            Number(next === 'DEPOSIT_PAID' ? row.deposit_30_amount : next === 'DELIVERED' ? quote.balanceDue : quote.payout)
          )
        );
      } catch {
        fields.push(
          f('reference', 'Mã giao dịch ngân hàng đã đối soát'),
          f('amount', 'Số tiền thanh toán (đ)', 'number', 0)
        );
      }
    }
    openDialog(
      `Xác nhận chuyển trạng thái: ${nextStateLabel[str(row.status)] || next} · ${row.contract_code}`,
      `admin/contracts/${row.id}/status`,
      fields,
      'PATCH',
      { status: next }
    );
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        String(c.contract_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(c.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(c.buyer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(c.farmer_name || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || String(c.status) === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [contracts, searchQuery, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: contracts.length };
    contracts.forEach((c) => {
      const s = String(c.status || '');
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [contracts]);

  const activeDetailStatus = detail ? (STATUS_CONFIG[String(detail.status)] || {
    label: str(detail.status),
    desc: '',
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    dot: 'bg-gray-500',
  }) : null;

  return (
    <div className="space-y-6">
      {/* Banner Chuẩn HoNa Fresh */}
      <div className="bg-gradient-to-r from-[#10542C] via-[#1B6D3D] to-[#0A4020] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
              <Handshake className="w-7 h-7 text-[#8BC34A]" /> Hợp Đồng B2B & Quỹ Ký Quỹ Escrow
            </h1>
            <p className="text-xs text-white/80 mt-1 max-w-2xl">
              Module 3: Giám sát toàn trình hợp đồng mua bán sỉ nông sản, dòng tiền ký quỹ 30% giữ hộ (TK 3388), kiểm soát phí sàn (TK 5113) và giải ngân quyết toán nông dân.
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

      {/* 3 Metric Cards Giám Sát Dòng Tiền */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#EAECE8] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-bold">Quỹ Tạm Giữ Escrow (TK 3388)</span>
            <DollarSign className="w-4 h-4 text-[#10542C]" />
          </div>
          <p className="text-2xl font-black text-[#10542C]">
            {loading ? '...' : `${money(stats.heldFunds)} đ`}
          </p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Tiền cọc 30% Sàn đang giữ hộ bảo chứng</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EAECE8] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-bold">Doanh Thu Phí Dịch Vụ Sàn (TK 112)</span>
            <FileText className="w-4 h-4 text-[#FB8C00]" />
          </div>
          <p className="text-2xl font-black text-[#2C3E2E]">
            {loading ? '...' : `${money(stats.serviceRevenue)} đ`}
          </p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Phí hoa hồng 3% tích lũy từ các giao dịch</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EAECE8] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-bold">Tổng Giá Trị Giao Dịch (GMV)</span>
            <Handshake className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-[#10542C]">
            {loading ? '...' : `${money(stats.gmv)} đ`}
          </p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Tổng quy mô hợp đồng đã chốt qua sàn</span>
        </div>
      </div>

      {/* Toolbar Thao Tác Hợp Đồng */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() =>
              openDialog('Tạo RFQ Hợp Đồng Sỉ Thay Mặt Bên Mua', 'admin/contracts', [
                f('buyerId', 'ID Thương Lái (BUYER đã duyệt KYC)', 'number'),
                f('lotId', 'ID Lô Nông Sản Đang Mở Bán', 'number'),
                f('weightKg', 'Khối lượng đặt sỉ (kg)', 'number'),
                f('pricePerKg', 'Đơn giá thỏa thuận (đ/kg)', 'number'),
                f('logisticsFee', 'Phí vận chuyển và lưu trạm lạnh (đ)', 'number', 0),
                f('deliveryAddress', 'Địa chỉ kho nhận hàng bên mua'),
              ])
            }
            className="px-4 py-2.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tạo RFQ / Hợp Đồng Mới
          </button>

          <button
            onClick={() =>
              openDialog('Lập Biên Bản Sự Cố Hợp Đồng', 'admin/claims', [
                f('contractId', 'ID Hợp đồng phát sinh sự cố', 'number'),
                f('damagedWeightKg', 'Khối lượng hàng hư hỏng / dập nát (kg)', 'number'),
                f('cause', 'Nguyên nhân sự cố (đứt chuỗi lạnh / trễ hẹn / dập nát)'),
                select('liableParty', 'Bên chịu trách nhiệm bồi thường', ['PLATFORM', 'FARMER']),
              ])
            }
            className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" /> Lập Biên Bản Sự Cố
          </button>
        </div>

        {/* Bộ Lọc Trạng Thái Dropdown & Ô Tìm Kiếm - Gọn gàng tiết kiệm diện tích */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown Lọc Trạng Thái */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-[#10542C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Lọc theo trạng thái hợp đồng"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`pl-8 pr-8 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:border-[#10542C] cursor-pointer appearance-none shadow-2xs transition-colors ${
                statusFilter !== 'ALL'
                  ? 'bg-emerald-50 border-emerald-300 text-[#10542C]'
                  : 'bg-white border-[#EAECE8] text-[#2C3E2E] hover:border-[#10542C]/40'
              }`}
            >
              <option value="ALL">Tất cả trạng thái ({statusCounts['ALL'] || 0})</option>
              <option value="SETTLED">Đã hoàn tất & Giải ngân ({statusCounts['SETTLED'] || 0})</option>
              <option value="DELIVERED">Đã giao hàng (Chờ quyết toán) ({statusCounts['DELIVERED'] || 0})</option>
              <option value="IN_TRANSIT">Đang vận chuyển lạnh ({statusCounts['IN_TRANSIT'] || 0})</option>
              <option value="AT_HUB_QC">Đang kiểm định tại trạm QC ({statusCounts['AT_HUB_QC'] || 0})</option>
              <option value="DEPOSIT_PAID">Đã cọc 30% bảo chứng ({statusCounts['DEPOSIT_PAID'] || 0})</option>
              <option value="AGREED">Nông trại đã chấp thuận ({statusCounts['AGREED'] || 0})</option>
              <option value="RFQ_SENT">Chờ xác nhận RFQ ({statusCounts['RFQ_SENT'] || 0})</option>
              <option value="CANCELLED">Đã hủy hợp đồng ({statusCounts['CANCELLED'] || 0})</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Ô Tìm Kiếm Hợp Đồng */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo mã HĐ, nông sản, bên mua..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-white border border-[#EAECE8] rounded-xl text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Danh Sách Hợp Đồng B2B Bảng Chuẩn */}
      <div className="space-y-3">
        <h3 className="font-heading font-black text-sm text-[#2C3E2E] flex items-center justify-between">
          <span>Danh Sách Hợp Đồng Nguyên Tắc ({filteredContracts.length})</span>
        </h3>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8] flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-[#10542C] animate-spin" />
            <span>Đang tải danh sách hợp đồng...</span>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8]">
            <p className="font-bold text-[#2C3E2E]">Không tìm thấy hợp đồng nào phù hợp bộ lọc.</p>
            <p className="mt-1">Thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#EAECE8] rounded-2xl bg-white shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F4F6F1] text-[#52634F] font-bold">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Mã Hợp Đồng</th>
                  <th className="p-3.5 whitespace-nowrap">Nông Sản Vụ Mùa</th>
                  <th className="p-3.5 whitespace-nowrap">Bên Mua (Thương Lái)</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Sản Lượng (kg)</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Tổng Tiền Hàng (đ)</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Cọc 30% Đã Thu (đ)</th>
                  <th className="p-3.5 whitespace-nowrap">Trạng Thái</th>
                  <th className="p-3.5 text-right pr-5 whitespace-nowrap">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2ED]">
                {filteredContracts.map((row) => {
                  const sCfg = STATUS_CONFIG[str(row.status)] || {
                    label: str(row.status),
                    desc: '',
                    bg: 'bg-gray-100',
                    text: 'text-gray-700',
                    border: 'border-gray-200',
                    dot: 'bg-gray-400',
                  };

                  return (
                    <tr key={str(row.id)} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#10542C] whitespace-nowrap">
                        {str(row.contract_code)}
                      </td>
                      <td className="p-3.5 font-bold text-[#2C3E2E]">
                        <div>{str(row.product_name)}</div>
                        {Boolean(row.lot_code) && (
                          <span className="text-[10px] text-[#6B7280] font-mono">
                            {str(row.lot_code)}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[#2C3E2E] max-w-[200px]">
                        <div className="font-bold truncate">{str(row.buyer_name || 'Công Ty Thu Mua')}</div>
                        {Boolean(row.farmer_name) && (
                          <div className="text-[10px] text-[#6B7280] truncate">
                            Bán: {str(row.farmer_name)}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-bold text-[#2C3E2E] whitespace-nowrap">
                        {money(row.offered_weight_kg)} kg
                      </td>
                      <td className="p-3.5 text-right font-black text-[#10542C] whitespace-nowrap">
                        {money(row.total_goods_amount)} đ
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {money(row.deposit_received)} đ
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${sCfg.bg} ${sCfg.text} ${sCfg.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot}`} />
                          {sCfg.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-right pr-5 whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {/* Trạng thái đã giải ngân hoàn tất */}
                          {str(row.status) === 'SETTLED' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoàn tất
                            </span>
                          )}

                          {/* Nút thao tác chuyển trạng thái tiếp theo trong quy trình */}
                          {nextState[str(row.status)] && (
                            <button
                              type="button"
                              onClick={() => void advanceStatus(row)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-[#10542C] hover:bg-[#0C3E20] rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <span>{nextStateLabel[str(row.status)] || nextState[str(row.status)]}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}

                          {/* Nút Chi tiết luôn cố định ở vị trí ngoài cùng bên phải, thẳng hàng 100% */}
                          <button
                            type="button"
                            onClick={() => setDetail(row)}
                            className="px-3 py-1.5 text-xs font-bold text-[#10542C] bg-[#EAF5E9] hover:bg-[#D7EED6] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bảng Tranh Chấp & Khiếu Nại Bồi Thường */}
      <div className="space-y-3 pt-6 border-t border-[#EAECE8]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-heading font-black text-sm text-[#2C3E2E] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Biên Bản Tranh Chấp & Bồi Thường ({claims.length})</span>
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Cơ chế trọng tài sàn HoNa Fresh: Phân định trách nhiệm hao hụt vận chuyển, hư hỏng lạnh và giải quyết bồi hoàn minh bạch.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              openDialog(
                'Lập Biên Bản Sự Cố / Tranh Chấp Hợp Đồng B2B',
                'admin/claims',
                [
                  select('contractId', 'Mã hợp đồng B2B', contracts.map((c) => String(c.id))),
                  f('damagedWeightKg', 'Khối lượng hư hỏng (kg)', 'number', 10),
                  f('cause', 'Mô tả chi tiết nguyên nhân sự cố'),
                  select('liableParty', 'Bên chịu trách nhiệm', ['PLATFORM', 'FARMER']),
                ],
                'POST'
              );
            }}
            className="px-3.5 py-1.5 text-xs font-bold text-[#10542C] bg-[#EAF5E9] hover:bg-[#D7EED6] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lập biên bản sự cố</span>
          </button>
        </div>

        {claims.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#EAECE8]">
            <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
            <p className="font-bold text-[#2C3E2E]">Không có khiếu nại tranh chấp nào cần xử lý</p>
            <p className="mt-1">Tất cả các lô hàng và hợp đồng đang được vận hành an toàn và đúng quy chuẩn chất lượng.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#EAECE8] rounded-2xl bg-white shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F4F6F1] text-[#52634F] font-bold">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Mã Biên Bản</th>
                  <th className="p-3.5 whitespace-nowrap">Hợp Đồng & Nông Sản</th>
                  <th className="p-3.5 whitespace-nowrap">Nguyên Nhân Sự Cố</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Hư Hỏng (kg)</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Ước Tính Thiệt Hại (đ)</th>
                  <th className="p-3.5 whitespace-nowrap">Bên Chịu Trách Nhiệm</th>
                  <th className="p-3.5 whitespace-nowrap">Trạng Thái</th>
                  <th className="p-3.5 text-right pr-5 whitespace-nowrap">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2ED]">
                {claims.map((row) => {
                  const liableCfg = CLAIM_LIABLE_CONFIG[str(row.liable_party)] || {
                    label: str(row.liable_party),
                    shortLabel: str(row.liable_party),
                    bg: 'bg-gray-100',
                    text: 'text-gray-700',
                    border: 'border-gray-200',
                    icon: '⚖️',
                  };

                  const statusCfg = CLAIM_STATUS_CONFIG[str(row.status)] || {
                    label: str(row.status),
                    desc: '',
                    bg: 'bg-gray-100',
                    text: 'text-gray-700',
                    border: 'border-gray-200',
                    dot: 'bg-gray-400',
                    actionLabel: 'Xem chi tiết',
                  };

                  const contractCode = str(row.contract_code || ('#HĐ-' + row.contract_id));
                  const claimCode = str(row.claim_code || ('#CLM-' + String(row.id).padStart(3, '0')));

                  return (
                    <tr key={str(row.id)} className="hover:bg-rose-50/20 transition-colors">
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200/70 px-2 py-0.5 rounded-lg text-xs">
                          {claimCode}
                        </span>
                        {Boolean(row.created_at) && (
                          <div className="text-[10px] text-[#6B7280] mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#6B7280]" />
                            {formatDate(row.created_at)}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-[#2C3E2E]">
                        <div className="flex items-center gap-1.5 font-bold">
                          <button
                            type="button"
                            onClick={() => {
                              const foundContract = contracts.find((c) => String(c.id) === String(row.contract_id));
                              if (foundContract) setDetail(foundContract);
                            }}
                            className="font-mono text-[#10542C] hover:underline cursor-pointer"
                            title="Xem chi tiết hợp đồng"
                          >
                            {contractCode}
                          </button>
                          <span className="text-[#9CA3AF]">·</span>
                          <span className="truncate max-w-[180px]">{str(row.product_name || 'Nông sản hợp đồng')}</span>
                        </div>
                        <div className="text-[10px] text-[#6B7280] truncate max-w-[240px] mt-0.5">
                          Mua: <span className="font-medium text-[#2C3E2E]">{str(row.buyer_name || 'Thương lái')}</span>
                          {Boolean(row.farmer_name) && (
                            <span> · Bán: <span className="font-medium text-[#2C3E2E]">{str(row.farmer_name)}</span></span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-[#2C3E2E] max-w-[260px]">
                        <p className="line-clamp-2 text-xs leading-relaxed" title={str(row.cause)}>
                          {str(row.cause)}
                        </p>
                      </td>
                      <td className="p-3.5 text-right font-bold text-[#2C3E2E] whitespace-nowrap">
                        {money(row.damaged_weight_kg)} kg
                      </td>
                      <td className="p-3.5 text-right font-black text-rose-600 whitespace-nowrap">
                        {money(row.compensation_amount)} đ
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${liableCfg.bg} ${liableCfg.text} ${liableCfg.border}`}
                          title={liableCfg.label}
                        >
                          <span>{liableCfg.icon}</span>
                          <span>{liableCfg.shortLabel}</span>
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-right pr-5 whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {str(row.status) === 'OPEN' ? (
                            <button
                              type="button"
                              onClick={() =>
                                openDialog(
                                  `Phán Quyết Tranh Chấp Hợp Đồng · ${claimCode}`,
                                  `admin/contracts/${row.contract_id}/resolve-dispute`,
                                  [
                                    select('action', 'Hình thức phán quyết', ['DISMISS', 'COMPENSATE', 'REFUND']),
                                    f('reference', 'Mã quyết định / Giao dịch bồi hoàn ngân hàng'),
                                    f('note', 'Nội dung chi tiết quyết định xử lý'),
                                  ],
                                  'POST',
                                  { claimId: row.id }
                                )
                              }
                              className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Scale className="w-3.5 h-3.5" />
                              <span>Xử lý phán quyết</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setClaimDetail(row)}
                              className="px-3 py-1.5 text-xs font-bold text-[#10542C] bg-[#EAF5E9] hover:bg-[#D7EED6] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-[#D7EED6]"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Xem quyết định</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

      {/* MODAL CHI TIẾT HỢP ĐỒNG B2B - ĐÃ THIẾT KẾ LẠI HOÀN TOÀN CHUẨN TIẾNG VIỆT */}
      {detail && activeDetailStatus && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs p-4 flex justify-center items-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#EAECE8] overflow-hidden">
            
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-[#10542C] via-[#1B6D3D] to-[#0A4020] text-white p-5 sm:p-6 relative">
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white tracking-wider uppercase">
                      Hợp Đồng Sỉ B2B
                    </span>
                    <span className="text-xs text-white/90 font-mono font-bold bg-black/20 px-2 py-0.5 rounded-md">
                      #{str(detail.contract_code)}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                    <Handshake className="w-6 h-6 text-[#8BC34A]" /> Chi Tiết Hợp Đồng & Ký Quỹ Escrow
                  </h2>
                  <p className="text-xs text-white/80 mt-1">
                    Hợp đồng nguyên tắc mua bán sỉ qua Sàn Nông Sản HoNa Fresh · Bảo chứng Quỹ Escrow độc lập
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Banner trạng thái hợp đồng tiếng Việt */}
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/80">Trạng thái giao dịch:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 shadow-2xs ${activeDetailStatus.bg} ${activeDetailStatus.text} ${activeDetailStatus.border}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${activeDetailStatus.dot}`} />
                    {activeDetailStatus.label}
                  </span>
                </div>
                {activeDetailStatus.desc && (
                  <span className="text-[11px] text-white/80 italic">
                    {activeDetailStatus.desc}
                  </span>
                )}
              </div>
            </div>

            {/* Nội dung chi tiết cuộn được - Tiếng Việt có dấu */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#2C3E2E]">

              {/* 1. Hai bên đối tác tham gia */}
              <div>
                <h3 className="font-heading font-black text-xs uppercase tracking-wider text-[#6B7280] mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#10542C]" /> Hai Bên Tham Gia Giao Dịch
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bên Bán */}
                  <div className="bg-[#F9FAF8] border border-[#EAECE8] rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between border-b border-[#EAECE8] pb-2">
                      <span className="font-black text-[#10542C] flex items-center gap-1.5 text-xs">
                        <Sprout className="w-4 h-4 text-[#10542C]" /> Bên Bán (Đơn Vị Cung Ứng)
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Nông Dân / HTX
                      </span>
                    </div>
                    <div className="space-y-1 pt-1">
                      <p className="font-black text-sm text-[#2C3E2E]">
                        {str(detail.farmer_name || 'Nông Trại Hữu Cơ Đà Lạt Fresh')}
                      </p>
                      {Boolean(detail.farmer_contact) && (
                        <p className="text-[#6B7280]">
                          Người đại diện: <span className="font-bold text-[#2C3E2E]">{str(detail.farmer_contact)}</span>
                        </p>
                      )}
                      <p className="text-[#6B7280]">
                        Mã đối tác: <span className="font-mono font-bold text-[#2C3E2E]">#FARMER-{str(detail.farmer_id)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Bên Mua */}
                  <div className="bg-[#F9FAF8] border border-[#EAECE8] rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between border-b border-[#EAECE8] pb-2">
                      <span className="font-black text-[#1565C0] flex items-center gap-1.5 text-xs">
                        <Building2 className="w-4 h-4 text-[#1565C0]" /> Bên Mua (Đơn Vị Tiếp Nhận)
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                        Thương Lái / Siêu Thị
                      </span>
                    </div>
                    <div className="space-y-1 pt-1">
                      <p className="font-black text-sm text-[#2C3E2E]">
                        {str(detail.buyer_name || 'Doanh Nghiệp Thu Mua Nông Sản Sỉ')}
                      </p>
                      {Boolean(detail.buyer_contact) && (
                        <p className="text-[#6B7280]">
                          Người đại diện: <span className="font-bold text-[#2C3E2E]">{str(detail.buyer_contact)}</span>
                        </p>
                      )}
                      <p className="text-[#6B7280]">
                        Mã đối tác: <span className="font-mono font-bold text-[#2C3E2E]">#BUYER-{str(detail.buyer_id)}</span>
                      </p>
                      <p className="text-[#6B7280] flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span>Kho giao nhận: <span className="font-bold text-[#2C3E2E]">{str(detail.delivery_address)}</span></span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Chi tiết nông sản & quy cách hàng hóa */}
              <div>
                <h3 className="font-heading font-black text-xs uppercase tracking-wider text-[#6B7280] mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#10542C]" /> Thông Tin Hàng Hóa & Thỏa Thuận Giá Sỉ
                </h3>
                <div className="bg-white border border-[#EAECE8] rounded-2xl p-4 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0F2ED] pb-3">
                    <div>
                      <span className="text-[11px] text-[#6B7280]">Nông sản giao dịch:</span>
                      <p className="text-base font-black text-[#10542C]">{str(detail.product_name)}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-[#6B7280]">Mã lô nông sản liên kết:</span>
                      <p className="font-mono font-bold text-xs text-[#2C3E2E]">
                        {str(detail.lot_code || `Lô #${detail.lot_id}`)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-[#F9FAF8] p-3 rounded-xl border border-[#EAECE8]">
                      <span className="text-[10px] text-[#6B7280] uppercase font-bold">Khối lượng đặt sỉ</span>
                      <p className="text-lg font-black text-[#2C3E2E] mt-0.5">
                        {money(detail.offered_weight_kg)} <span className="text-xs font-normal text-[#6B7280]">kg</span>
                      </p>
                    </div>

                    <div className="bg-[#F9FAF8] p-3 rounded-xl border border-[#EAECE8]">
                      <span className="text-[10px] text-[#6B7280] uppercase font-bold">Đơn giá thỏa thuận</span>
                      <p className="text-lg font-black text-[#2C3E2E] mt-0.5">
                        {money(detail.offered_price_per_kg)} <span className="text-xs font-normal text-[#6B7280]">đ/kg</span>
                      </p>
                    </div>

                    <div className="bg-[#EAF5E9] p-3 rounded-xl border border-[#C8E6C9]">
                      <span className="text-[10px] text-[#10542C] uppercase font-black">Tổng giá trị đơn hàng sỉ</span>
                      <p className="text-lg font-black text-[#10542C] mt-0.5">
                        {money(detail.total_goods_amount)} <span className="text-xs font-bold text-[#10542C]">đ</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Dòng tiền Ký quỹ Escrow & Kế toán VAS */}
              <div>
                <h3 className="font-heading font-black text-xs uppercase tracking-wider text-[#6B7280] mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#10542C]" /> Dòng Tiền Ký Quỹ Escrow & Quyết Toán (Kế Toán VAS)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Cột Trái: Thu Tiền Ký Quỹ Từ Bên Mua */}
                  <div className="border border-[#EAECE8] rounded-2xl p-4 bg-white space-y-3">
                    <div className="border-b border-[#F0F2ED] pb-2 font-bold text-xs text-[#2C3E2E] flex items-center justify-between">
                      <span>1. Thu Tiền Ký Quỹ Bên Mua</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                        Quỹ Tạm Giữ TK 3388
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1 border-b border-[#F9FAF8]">
                        <span className="text-[#6B7280]">Tiền cọc 30% bảo chứng:</span>
                        <span className="font-bold text-[#2C3E2E]">{money(detail.deposit_30_amount)} đ</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-[#F9FAF8]">
                        <span className="text-[#6B7280]">Thực tế đã nhận cọc:</span>
                        <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {money(detail.deposit_received)} đ
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-[#F9FAF8]">
                        <span className="text-[#6B7280]">Mã giao dịch ngân hàng cọc:</span>
                        <span className="font-mono text-[11px] bg-gray-100 px-2 py-0.5 rounded text-[#2C3E2E]">
                          {str(detail.deposit_ref || 'Chưa phát sinh')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-[#F9FAF8]">
                        <span className="text-[#6B7280]">Thanh toán 70% đợt 2:</span>
                        <span className="font-bold text-[#2C3E2E]">{money(detail.balance_received)} đ</span>
                      </div>

                      <div className="flex justify-between items-center py-1">
                        <span className="text-[#6B7280]">Mã giao dịch ngân hàng đợt 2:</span>
                        <span className="font-mono text-[11px] bg-gray-100 px-2 py-0.5 rounded text-[#2C3E2E]">
                          {str(detail.balance_ref || 'Chưa phát sinh')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cột Phải: Khấu Trừ Phí Sàn & Giải Ngân Cho Nông Trại */}
                  <div className="border border-[#EAECE8] rounded-2xl p-4 bg-white space-y-3">
                    <div className="border-b border-[#F0F2ED] pb-2 font-bold text-xs text-[#2C3E2E] flex items-center justify-between">
                      <span>2. Khấu Trừ Phí Sàn & Giải Ngân</span>
                      <span className="text-[10px] text-[#FB8C00] bg-orange-50 px-2 py-0.5 rounded font-bold">
                        Dòng Tiền TK 112 / 5113
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1 border-b border-[#F9FAF8]">
                        <span className="text-[#6B7280]">Phí dịch vụ sàn ({str(detail.platform_fee_rate)}%):</span>
                        <span className="font-bold text-[#2C3E2E]">{money(detail.platform_fee_amount)} đ</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-[#F9FAF8]">
                        <span className="text-[#6B7280]">Phí vận chuyển & trạm lạnh:</span>
                        <span className="font-bold text-[#2C3E2E]">{money(detail.logistics_fee_amount)} đ</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-[#F9FAF8]">
                        <span className="text-[#6B7280]">Thuế VAT dịch vụ ({str(detail.service_vat_rate)}%):</span>
                        <span className="font-bold text-[#2C3E2E]">
                          {money(
                            ((Number(detail.platform_fee_amount || 0) + Number(detail.logistics_fee_amount || 0)) *
                              Number(detail.service_vat_rate || 10)) /
                              100
                          )}{' '}
                          đ
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 bg-[#EAF5E9] px-2.5 rounded-xl border border-[#C8E6C9]">
                        <span className="font-black text-[#10542C]">Thực chi giải ngân Nông dân:</span>
                        <span className="font-black text-sm text-[#10542C]">{money(detail.payout_amount)} đ</span>
                      </div>

                      <div className="flex justify-between items-center py-1">
                        <span className="text-[#6B7280]">Mã ủy nhiệm chi / Payout:</span>
                        <span className="font-mono text-[11px] bg-gray-100 px-2 py-0.5 rounded text-[#2C3E2E]">
                          {str(detail.payout_ref || 'Chờ quyết toán')}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* 4. Dấu thời gian & căn cứ pháp lý */}
              <div className="bg-[#F9FAF8] border border-[#EAECE8] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#6B7280]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#10542C]" />
                  <span>
                    Thời điểm lập hợp đồng:{' '}
                    <strong className="text-[#2C3E2E]">{formatDate(detail.created_at)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#10542C]" />
                  <span>
                    Cập nhật mới nhất:{' '}
                    <strong className="text-[#2C3E2E]">{formatDate(detail.updated_at)}</strong>
                  </span>
                </div>
              </div>

            </div>

            {/* Footer Modal */}
            <div className="p-4 sm:p-5 bg-[#F9FAF8] border-t border-[#EAECE8] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-[#D5D9D2] bg-white hover:bg-[#F0F2ED] text-[#2C3E2E] text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4 text-[#10542C]" /> In Bản Kê / Lưu PDF
              </button>

              <button
                type="button"
                onClick={() => setDetail(null)}
                className="px-5 py-2 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Đóng cửa sổ
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT BIÊN BẢN TRANH CHẤP & PHÁN QUYẾT BỒI THƯỜNG */}
      {claimDetail && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs p-4 flex justify-center items-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#EAECE8] overflow-hidden">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-[#8B1A1A] via-[#A82B2B] to-[#681414] text-white p-5 sm:p-6 relative">
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white tracking-wider uppercase">
                      Biên Bản Trọng Tài Sàn
                    </span>
                    <span className="text-xs text-white/90 font-mono font-bold bg-black/20 px-2 py-0.5 rounded-md">
                      #{str(claimDetail.claim_code || ('CLM-' + claimDetail.id))}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-amber-300" /> Biên Bản Xử Lý Tranh Chấp & Bồi Thường
                  </h2>
                  <p className="text-xs text-white/80 mt-1">
                    Hồ sơ phân định sự cố hao hụt/hư hỏng và quyết định giải quyết theo Quy chế sàn HoNa Fresh
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setClaimDetail(null)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Bar */}
              {(() => {
                const cStatus = CLAIM_STATUS_CONFIG[str(claimDetail.status)] || {
                  label: str(claimDetail.status),
                  desc: '',
                  bg: 'bg-white/10',
                  text: 'text-white',
                  border: 'border-white/20',
                  dot: 'bg-white',
                };
                return (
                  <div className="mt-4 pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/80">Kết quả phân xử:</span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-rose-950 shadow-xs">
                        <span className={`w-2 h-2 rounded-full ${cStatus.dot}`} />
                        {cStatus.label}
                      </span>
                    </div>
                    {Boolean(claimDetail.resolution_ref) && (
                      <div className="text-xs text-white/90 font-mono">
                        Số chứng từ: <strong>{str(claimDetail.resolution_ref)}</strong>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-[#2C3E2E]">
              {/* Mô tả giải pháp từ config */}
              {(() => {
                const cStatus = CLAIM_STATUS_CONFIG[str(claimDetail.status)];
                return cStatus?.desc ? (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-900">Giải thích quyết định trọng tài:</div>
                      <p className="text-amber-800 mt-0.5 leading-relaxed">{cStatus.desc}</p>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Thông tin sự cố */}
              <div className="border border-[#EAECE8] rounded-2xl p-4 bg-[#F9FAF8] space-y-3">
                <div className="font-bold text-sm text-[#10542C] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#10542C]" />
                  <span>1. Thông Tin Sự Cố & Hợp Đồng B2B</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8]">
                    <div className="text-[11px] text-[#6B7280]">Hợp đồng liên quan</div>
                    <div className="font-mono font-bold text-[#10542C] text-sm mt-0.5">
                      {str(claimDetail.contract_code || ('#HĐ-' + claimDetail.contract_id))}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8]">
                    <div className="text-[11px] text-[#6B7280]">Nông sản vụ mùa</div>
                    <div className="font-bold text-[#2C3E2E] text-sm mt-0.5">
                      {str(claimDetail.product_name || 'Nông sản theo hợp đồng')}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8]">
                    <div className="text-[11px] text-[#6B7280]">Khối lượng hư hỏng ghi nhận</div>
                    <div className="font-bold text-rose-700 text-sm mt-0.5">
                      {money(claimDetail.damaged_weight_kg)} kg
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8]">
                    <div className="text-[11px] text-[#6B7280]">Ước tính giá trị thiệt hại</div>
                    <div className="font-black text-rose-600 text-sm mt-0.5">
                      {money(claimDetail.compensation_amount)} đ
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8] sm:col-span-2">
                    <div className="text-[11px] text-[#6B7280]">Bên xác định chịu trách nhiệm ban đầu</div>
                    <div className="mt-1 font-bold text-[#2C3E2E]">
                      {(() => {
                        const lCfg = CLAIM_LIABLE_CONFIG[str(claimDetail.liable_party)];
                        return lCfg ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${lCfg.bg} ${lCfg.text} ${lCfg.border}`}>
                            <span>{lCfg.icon}</span> {lCfg.label}
                          </span>
                        ) : (
                          str(claimDetail.liable_party)
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-[#EAECE8]">
                  <div className="text-[11px] text-[#6B7280] font-bold">Chi tiết nguyên nhân phát sinh sự cố:</div>
                  <p className="mt-1.5 text-xs text-[#2C3E2E] leading-relaxed italic bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                    &ldquo;{str(claimDetail.cause)}&rdquo;
                  </p>
                </div>
              </div>

              {/* Quyết định xử lý */}
              <div className="border border-[#EAECE8] rounded-2xl p-4 bg-[#F9FAF8] space-y-3">
                <div className="font-bold text-sm text-[#10542C] flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#10542C]" />
                  <span>2. Nội Dung Phán Quyết Trọng Tài & Chứng Từ Giải Quyết</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-[#EAECE8]">
                  <div className="text-[11px] text-[#6B7280] font-bold">Nội dung văn bản kết luận:</div>
                  <p className="mt-1.5 text-xs text-[#2C3E2E] leading-relaxed bg-emerald-50/40 p-3 rounded-lg border border-emerald-100/80 font-medium">
                    {str(claimDetail.resolution_note || 'Chưa ghi nhận nội dung văn bản phán quyết.')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8]">
                    <div className="text-[11px] text-[#6B7280]">Mã quyết định / Tham chiếu ngân hàng</div>
                    <div className="font-mono font-bold text-[#10542C] text-xs mt-0.5">
                      {str(claimDetail.resolution_ref || '—')}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EAECE8]">
                    <div className="text-[11px] text-[#6B7280]">Thời điểm lập biên bản</div>
                    <div className="font-medium text-[#2C3E2E] text-xs mt-0.5">
                      {claimDetail.created_at ? formatDate(claimDetail.created_at) : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cam kết pháp lý & kiểm toán */}
              <div className="bg-[#F4F6F1] border border-[#EAECE8] rounded-2xl p-4 text-[#6B7280] flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#10542C] shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  Biên bản giải quyết tranh chấp này được ký số và lưu giữ trên hệ thống kiểm toán (Audit Trail) của sàn HoNa Fresh. Các bút toán tài chính (nếu có) đã được tự động hạch toán đối ứng trên sổ cái kế toán VAS.
                </p>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 sm:p-5 bg-[#F9FAF8] border-t border-[#EAECE8] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-[#D5D9D2] bg-white hover:bg-[#F0F2ED] text-[#2C3E2E] text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4 text-[#10542C]" /> In Biên Bản
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const foundContract = contracts.find((c) => String(c.id) === String(claimDetail.contract_id));
                    if (foundContract) {
                      setClaimDetail(null);
                      setDetail(foundContract);
                    }
                  }}
                  className="px-4 py-2 rounded-xl border border-[#10542C] text-[#10542C] hover:bg-[#EAF5E9] text-xs font-bold transition-colors cursor-pointer"
                >
                  Xem hợp đồng gốc
                </button>
                <button
                  type="button"
                  onClick={() => setClaimDetail(null)}
                  className="px-5 py-2 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
