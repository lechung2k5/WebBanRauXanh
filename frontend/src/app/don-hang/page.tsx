'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getOrderByCode } from '@/services/api';
import {
  trackB2bContractsApi,
  getContractQcApi,
  getContractPrintUrl,
  getFarmerContractsApi,
} from '@/services/farmerApi';
import { OrderResponse, B2BContract, QcInspection } from '@/types';
import {
  Clock,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Calendar,
  MapPin,
  ChevronRight,
  ReceiptText,
  AlertCircle,
  Phone,
  ShieldCheck,
  FileText,
  Printer,
  X,
  ExternalLink,
  Award,
  Thermometer,
  Droplets,
  Layers,
} from 'lucide-react';

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  // Mode: B2C (Đơn hàng tiêu dùng) vs B2B (Hợp đồng nông sản sỉ & Escrow 30%)
  const [activeTab, setActiveTab] = useState<'B2C' | 'B2B'>(
    initialCode.toUpperCase().startsWith('HD-') || initialCode.toUpperCase().startsWith('RFQ-')
      ? 'B2B'
      : 'B2C'
  );

  // ================= B2C STATE =================
  const [orderCode, setOrderCode] = useState(
    initialCode.toUpperCase().startsWith('HD-') || initialCode.toUpperCase().startsWith('RFQ-')
      ? ''
      : initialCode
  );
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [localHistory, setLocalHistory] = useState<OrderResponse[]>([]);
  const [loadingB2c, setLoadingB2c] = useState(false);
  const [errorB2c, setErrorB2c] = useState<string | null>(null);

  // ================= B2B STATE =================
  const [b2bQuery, setB2bQuery] = useState(
    initialCode.toUpperCase().startsWith('HD-') || initialCode.toUpperCase().startsWith('RFQ-')
      ? initialCode
      : ''
  );
  const [b2bContracts, setB2bContracts] = useState<B2BContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<B2BContract | null>(null);
  const [localB2bHistory, setLocalB2bHistory] = useState<B2BContract[]>([]);
  const [loadingB2b, setLoadingB2b] = useState(false);
  const [errorB2b, setErrorB2b] = useState<string | null>(null);

  // Modal QC state
  const [qcModalData, setQcModalData] = useState<QcInspection | null>(null);
  const [isQcLoading, setIsQcLoading] = useState(false);

  // Load local history on mount
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('xanhfarm_orders') || '[]');
      setLocalHistory(history);
      if (initialCode && !initialCode.toUpperCase().startsWith('HD-') && !initialCode.toUpperCase().startsWith('RFQ-')) {
        handleSearchB2c(initialCode, history);
      } else if (history.length > 0 && activeTab === 'B2C') {
        setOrder(history[0]);
        setOrderCode(history[0].orderCode);
      }
    } catch {}

    // Load B2B history
    getFarmerContractsApi().then((cts) => {
      setLocalB2bHistory(cts);
      if (
        (initialCode.toUpperCase().startsWith('HD-') || initialCode.toUpperCase().startsWith('RFQ-')) &&
        cts.length > 0
      ) {
        handleSearchB2b(initialCode);
      } else if (cts.length > 0 && activeTab === 'B2B') {
        setSelectedContract(cts[0]);
        setB2bQuery(cts[0].contractCode);
      }
    });
  }, [initialCode]);

  // Handle Search B2C
  const handleSearchB2c = async (codeToSearch: string, fallbackHistory?: OrderResponse[]) => {
    const code = codeToSearch.trim().toUpperCase();
    if (!code) return;

    setLoadingB2c(true);
    setErrorB2c(null);

    try {
      const res = await getOrderByCode(code);
      setOrder(res);
    } catch {
      const list = fallbackHistory || localHistory;
      const found = list.find((o) => o.orderCode?.toUpperCase() === code);
      if (found) {
        setOrder(found);
      } else {
        setErrorB2c(`Không tìm thấy đơn hàng với mã "${code}". Vui lòng kiểm tra lại.`);
        setOrder(null);
      }
    } finally {
      setLoadingB2c(false);
    }
  };

  // Handle Search B2B
  const handleSearchB2b = async (queryToSearch: string) => {
    const query = queryToSearch.trim();
    if (!query) return;

    setLoadingB2b(true);
    setErrorB2b(null);

    try {
      const res = await trackB2bContractsApi(query);
      if (res && res.length > 0) {
        setB2bContracts(res);
        setSelectedContract(res[0]);
      } else {
        setErrorB2b(
          `Không tìm thấy hợp đồng B2B nào khớp với "${query}". Vui lòng nhập đúng Mã Hợp Đồng (VD: HD-2026-...) hoặc Số Điện Thoại người mua.`
        );
        setSelectedContract(null);
      }
    } catch {
      setErrorB2b('Lỗi khi tra cứu hợp đồng B2B.');
      setSelectedContract(null);
    } finally {
      setLoadingB2b(false);
    }
  };

  // View QC Inspection Modal
  const handleViewQc = async (contract: B2BContract) => {
    setIsQcLoading(true);
    try {
      const qc = await getContractQcApi(contract.id, contract);
      setQcModalData(qc);
    } catch (err) {
      alert('Chưa có biên bản kiểm định QC cho hợp đồng này');
    } finally {
      setIsQcLoading(false);
    }
  };

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // B2C Status Steps
  const b2cStatusSteps = [
    { key: 'PENDING', label: 'Tiếp nhận đơn', icon: Clock, desc: 'Hệ thống đã nhận đơn hàng' },
    { key: 'CONFIRMED', label: 'Đang đóng gói', icon: Package, desc: 'Rau tươi được đóng gói cẩn thận' },
    { key: 'SHIPPING', label: 'Đang giao 2h', icon: Truck, desc: 'Shipper đang trên đường giao' },
    { key: 'DELIVERED', label: 'Đã giao hàng', icon: CheckCircle2, desc: 'Giao hàng thành công' },
  ];

  const getB2cStepIndex = (status: string) => {
    switch (status) {
      case 'PENDING': return 0;
      case 'CONFIRMED': return 1;
      case 'SHIPPING': return 2;
      case 'DELIVERED': return 3;
      default: return 1;
    }
  };

  // B2B Status Steps
  const b2bStatusSteps = [
    {
      key: 'DEPOSIT_PAID',
      label: 'Ký quỹ Escrow 30%',
      icon: ShieldCheck,
      desc: 'Sàn bảo chứng nhận cọc 30%',
    },
    {
      key: 'WAITING_HARVEST',
      label: 'Chuẩn bị thu hoạch',
      icon: Calendar,
      desc: 'Nhà vườn thu hoạch đúng hẹn',
    },
    {
      key: 'HUB_DELIVERED',
      label: 'Giao tại Trạm lạnh',
      icon: Truck,
      desc: 'Bàn giao trạm Cross-docking',
    },
    {
      key: 'QC_VERIFIED',
      label: 'Nghiệm thu QC',
      icon: Award,
      desc: 'Đo Brix, độ ẩm & bàn cân',
    },
    {
      key: 'COMPLETED',
      label: 'Hoàn tất giao xe lạnh',
      icon: CheckCircle2,
      desc: 'Ký nhận ePOD & quyết toán',
    },
  ];

  const getB2bStepIndex = (c: B2BContract) => {
    if (c.fulfillmentStatus === 'COMPLETED') return 4;
    if (c.hasQc) return 3;
    if (c.fulfillmentStatus === 'HUB_DELIVERED') return 2;
    if (c.fulfillmentStatus === 'HARVESTING' || c.fulfillmentStatus === 'WAITING_HARVEST') return 1;
    return 0;
  };

  return (
    <div className="min-h-screen bg-[#F9F9F5] flex flex-col justify-between">
      <Header />

      <main className="max-w-[1240px] mx-auto px-4 py-8 w-full flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-6">
          <Link href="/" className="hover:text-[#10542C]">Trang chủ</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#10542C] font-bold">Tra cứu tiến trình đơn hàng & Hợp đồng B2B</span>
        </div>

        {/* Tab Switcher: B2C vs B2B */}
        <div className="bg-white rounded-3xl p-2 sm:p-3 border border-[#EAECE8] shadow-xs mb-6 inline-flex w-full sm:w-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('B2C')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'B2C'
                ? 'bg-[#10542C] text-white shadow-md'
                : 'text-[#6B7280] hover:text-[#10542C] hover:bg-[#F9F9F5]'
            }`}
          >
            <Package className="w-4 h-4" /> Đơn Hàng Bán Lẻ (B2C)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('B2B')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'B2B'
                ? 'bg-[#10542C] text-white shadow-md'
                : 'text-[#6B7280] hover:text-[#10542C] hover:bg-[#F9F9F5]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#8BC34A]" /> Hợp Đồng & Ký Quỹ Đặt Cọc Sỉ (B2B Escrow)
          </button>
        </div>

        {/* ===================== TAB B2C: ĐƠN HÀNG TIÊU DÙNG ===================== */}
        {activeTab === 'B2C' && (
          <div>
            {/* Thanh tìm kiếm mã đơn B2C */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAECE8] shadow-xs mb-8">
              <h1 className="font-heading text-2xl font-black text-[#10542C] mb-2 flex items-center gap-2.5">
                <Clock className="w-6 h-6 text-[#8BC34A]" /> Tra Cứu Tiến Trình Giao Hàng B2C
              </h1>
              <p className="text-xs text-[#6B7280] mb-6">
                Nhập mã đơn hàng bán lẻ (ví dụ: HF100123) để kiểm tra trạng thái nông sản đang được đóng gói và giao đến bạn trong 2 giờ.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearchB2c(orderCode);
                }}
                className="flex flex-col sm:flex-row gap-3 max-w-xl"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Nhập mã đơn hàng (VD: HF100123)..."
                    value={orderCode}
                    onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-2xl pl-11 pr-4 py-3.5 text-xs uppercase font-bold text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                  />
                  <Search className="w-4 h-4 text-[#6B7280] absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="submit"
                  disabled={loadingB2c}
                  className="px-6 py-3.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {loadingB2c ? 'Đang Tra Cứu...' : 'Tra Cứu Đơn'}
                </button>
              </form>

              {errorB2c && (
                <div className="mt-4 p-3 bg-red-50 text-[#E53935] text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2 max-w-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorB2c}</span>
                </div>
              )}
            </div>

            {/* Lịch sử đơn hàng gần đây */}
            {localHistory.length > 0 && !order && (
              <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs mb-8">
                <h2 className="font-heading font-bold text-sm text-[#2C3E2E] mb-4">Các đơn hàng đã đặt gần đây:</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {localHistory.map((h) => (
                    <button
                      key={h.orderCode}
                      type="button"
                      onClick={() => {
                        setOrderCode(h.orderCode);
                        setOrder(h);
                      }}
                      className="p-4 rounded-2xl bg-[#F9F9F5] border border-[#EAECE8] hover:border-[#10542C] text-left transition-all cursor-pointer"
                    >
                      <p className="font-bold text-xs text-[#10542C]">{h.orderCode}</p>
                      <p className="text-[11px] text-[#6B7280] mt-1">{formatVND(h.totalAmount)} • {h.items?.length || 0} món</p>
                      <p className="text-[10px] text-[#2C3E2E] mt-2 font-semibold">Giao: {h.shippingAddress}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chi tiết đơn hàng B2C */}
            {order && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                  {/* Timeline Trạng Thái */}
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAECE8] shadow-xs">
                    <div className="flex justify-between items-center border-b border-[#F0F2ED] pb-4 mb-6">
                      <div>
                        <span className="text-xs text-[#6B7280]">Mã vận đơn:</span>
                        <h2 className="font-heading font-black text-xl text-[#10542C]">{order.orderCode}</h2>
                      </div>
                      <span className="bg-[#D7EED6] text-[#10542C] text-xs font-bold px-3 py-1 rounded-full">
                        {order.status === 'DELIVERED' ? 'Giao thành công' : 'Đang xử lý giao hàng'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
                      {b2cStatusSteps.map((step, idx) => {
                        const isDone = idx <= getB2cStepIndex(order.status);
                        const isCurrent = idx === getB2cStepIndex(order.status);
                        const Icon = step.icon;
                        return (
                          <div key={step.key} className="flex flex-col items-center text-center">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-all ${
                                isDone
                                  ? 'bg-[#10542C] text-white shadow-md'
                                  : 'bg-[#F4F5F1] text-[#6B7280]'
                              } ${isCurrent ? 'ring-4 ring-[#8BC34A]/30' : ''}`}
                            >
                              <Icon className="w-6 h-6" />
                            </div>
                            <h4 className={`text-xs font-bold ${isDone ? 'text-[#10542C]' : 'text-[#6B7280]'}`}>
                              {step.label}
                            </h4>
                            <p className="text-[10px] text-[#6B7280] mt-0.5 max-w-[120px]">{step.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Danh sách món */}
                  <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
                    <h3 className="font-heading font-bold text-base text-[#2C3E2E] border-b border-[#F0F2ED] pb-3">
                      Danh Sách Nông Sản Trong Đơn ({order.items?.length || 0} món)
                    </h3>
                    <div className="divide-y divide-[#F0F2ED]">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="py-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.productImageUrl || `/api/product-image?name=${encodeURIComponent(item.productName)}`}
                              alt={item.productName}
                              className="w-12 h-12 object-cover rounded-xl bg-[#F9F9F5] border border-[#EAECE8]"
                            />
                            <div>
                              <p className="font-bold text-[#2C3E2E]">{item.productName}</p>
                              <p className="text-[11px] text-[#6B7280]">
                                {item.quantity} x {formatVND(item.unitPrice)} / {item.unit || 'gói'}
                              </p>
                            </div>
                          </div>
                          <span className="font-black text-[#10542C]">{formatVND(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Thông Tin Nhận Hàng B2C */}
                <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-6">
                  <h3 className="font-heading font-bold text-base text-[#2C3E2E] border-b border-[#F0F2ED] pb-3">
                    Thông Tin Nhận Hàng
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#10542C] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[#6B7280]">Địa chỉ giao:</span>
                        <p className="font-bold text-[#2C3E2E] mt-0.5">{order.shippingAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-[#10542C] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[#6B7280]">Người nhận:</span>
                        <p className="font-bold text-[#2C3E2E] mt-0.5">{order.recipientName} - {order.recipientPhone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <ReceiptText className="w-4 h-4 text-[#10542C] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[#6B7280]">Thanh toán:</span>
                        <p className="font-bold text-[#10542C] mt-0.5">
                          {order.paymentMethod === 'COD' ? 'Tiền mặt (COD)' : 'Chuyển khoản VietQR'} • {order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#F0F2ED] pt-4 flex justify-between items-baseline">
                    <span className="text-xs text-[#6B7280]">Tổng giá trị đơn:</span>
                    <span className="font-heading font-black text-2xl text-[#10542C]">
                      {formatVND(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB B2B: HỢP ĐỒNG SỈ & BẢO CHỨNG CỌC ESCROW 30% ===================== */}
        {activeTab === 'B2B' && (
          <div>
            {/* Thanh tìm kiếm Hợp đồng B2B */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAECE8] shadow-xs mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="font-heading text-2xl font-black text-[#10542C] flex items-center gap-2.5">
                    <ShieldCheck className="w-7 h-7 text-[#2E7D32]" /> Tra Cứu Hợp Đồng Sỉ & Ký Quỹ Escrow 30%
                  </h1>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Nhập <strong>Mã Hợp Đồng</strong> (ví dụ: <code className="bg-[#E8F5E9] text-[#2E7D32] px-1.5 py-0.5 rounded font-mono font-bold">HD-2026-B2B-0104</code>) hoặc <strong>Số Điện Thoại Thương Lái</strong> để tra cứu tiến độ thu hoạch, trạng thái cọc bảo chứng và biên bản nghiệm thu QC trạm lạnh.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#E8F5E9] text-[#10542C] rounded-2xl text-xs font-bold border border-[#C8E6C9] shrink-0">
                  <ShieldCheck className="w-4 h-4 text-[#2E7D32]" /> Quỹ Ký Quỹ Escrow HoNa Fresh
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearchB2b(b2bQuery);
                }}
                className="flex flex-col sm:flex-row gap-3 max-w-xl"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Nhập mã hợp đồng (HD-2026-...) hoặc SĐT thương lái..."
                    value={b2bQuery}
                    onChange={(e) => setB2bQuery(e.target.value)}
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-2xl pl-11 pr-4 py-3.5 text-xs font-bold text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                  />
                  <Search className="w-4 h-4 text-[#6B7280] absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="submit"
                  disabled={loadingB2b}
                  className="px-6 py-3.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {loadingB2b ? 'Đang Tra Cứu...' : 'Tra Cứu Hợp Đồng'}
                </button>
              </form>

              {errorB2b && (
                <div className="mt-4 p-3 bg-red-50 text-[#E53935] text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2 max-w-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorB2b}</span>
                </div>
              )}
            </div>

            {/* Danh sách Hợp đồng gợi ý gần đây */}
            {localB2bHistory.length > 0 && !selectedContract && (
              <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs mb-8">
                <h2 className="font-heading font-bold text-sm text-[#2C3E2E] mb-4">Các Hợp Đồng Nông Sản Sỉ Gần Đây:</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {localB2bHistory.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedContract(c);
                        setB2bQuery(c.contractCode);
                      }}
                      className="p-4 rounded-2xl bg-[#F9F9F5] border border-[#EAECE8] hover:border-[#10542C] text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[#10542C] font-mono">{c.contractCode}</span>
                        <span className="text-[10px] bg-[#D7EED6] text-[#10542C] font-bold px-2 py-0.5 rounded-full">
                          Đã cọc 30%
                        </span>
                      </div>
                      <p className="font-bold text-xs text-[#2C3E2E] mt-1">{c.productName}</p>
                      <p className="text-[11px] text-[#6B7280] mt-1">
                        {c.quantity?.toLocaleString()} kg • {formatVND(c.totalAmount)}
                      </p>
                      <p className="text-[10px] text-[#6B7280] mt-2">
                        Thương lái: <strong className="text-[#2C3E2E]">{c.buyerName}</strong>
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chi tiết Hợp đồng B2B & Bảo chứng Escrow */}
            {selectedContract && (
              <div className="space-y-6">
                {/* Banner Ký Quỹ Escrow 30% Bảo Chứng */}
                <div className="bg-linear-to-r from-[#10542C] to-[#1E3A2F] text-white rounded-3xl p-6 sm:p-8 shadow-md">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-bold mb-3 border border-white/20">
                        <ShieldCheck className="w-4 h-4 text-[#8BC34A]" /> HỢP ĐỒNG BẢO CHỨNG ESCROW 3 BÊN ĐÃ XÁC LẬP
                      </div>
                      <h2 className="font-heading font-black text-2xl sm:text-3xl tracking-tight">
                        {selectedContract.productName}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-white/80 mt-2 font-mono">
                        <span>Mã HĐ: <strong className="text-white font-bold">{selectedContract.contractCode}</strong></span>
                        <span>•</span>
                        <span>Mã Lô: <strong className="text-white font-bold">{selectedContract.lotCode || 'LOT-2026-DL-001'}</strong></span>
                        <span>•</span>
                        <span>Mã PUC Vùng Trồng: <strong className="text-[#8BC34A] font-bold">{selectedContract.pucCode || 'VN-LDO-PUC-0849'}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Nút Xem Biên Bản QC */}
                      <button
                        type="button"
                        onClick={() => handleViewQc(selectedContract)}
                        disabled={isQcLoading}
                        className="px-5 py-3 rounded-2xl bg-white text-[#10542C] font-bold text-xs hover:bg-[#F9F9F5] transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <Award className="w-4 h-4 text-[#2E7D32]" />
                        {isQcLoading ? 'Đang mở QC...' : 'Xem Biên Bản QC Trạm Lạnh'}
                      </button>

                      {/* Nút In / Xem Hợp Đồng B2B */}
                      <a
                        href={getContractPrintUrl(selectedContract.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-3 rounded-2xl bg-[#8BC34A] hover:bg-[#7CB342] text-[#10542C] font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" /> In / Tải Hợp Đồng B2B
                      </a>
                    </div>
                  </div>

                  {/* 3 Thẻ dòng tiền cọc */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/15">
                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-xs">
                      <span className="text-[11px] text-white/70">Tổng Giá Trị Hợp Đồng:</span>
                      <p className="font-heading font-black text-xl text-white mt-1">
                        {formatVND(selectedContract.totalAmount)}
                      </p>
                      <span className="text-[10px] text-white/60">
                        {selectedContract.quantity?.toLocaleString()} kg x {formatVND(selectedContract.unitPrice)}/kg
                      </span>
                    </div>

                    <div className="bg-[#2E7D32]/50 border border-[#8BC34A]/40 rounded-2xl p-4 backdrop-blur-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/80">Ký Quỹ Đặt Cọc 30% (Escrow):</span>
                        <span className="text-[10px] bg-white text-[#10542C] font-bold px-2 py-0.5 rounded-full">
                          ĐÃ KÝ QUỸ
                        </span>
                      </div>
                      <p className="font-heading font-black text-xl text-[#8BC34A] mt-1">
                        {formatVND(selectedContract.depositAmount)}
                      </p>
                      <span className="text-[10px] text-white/70">
                        Quỹ Ký Quỹ Sàn HoNa Fresh đang giữ bảo chứng
                      </span>
                    </div>

                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-xs">
                      <span className="text-[11px] text-white/70">Còn Phải Thanh Toán (70%):</span>
                      <p className="font-heading font-black text-xl text-white mt-1">
                        {formatVND(selectedContract.totalAmount - selectedContract.depositAmount)}
                      </p>
                      <span className="text-[10px] text-white/60">
                        Thanh toán khi ký nhận ePOD tại bàn cân trạm
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline Tiến Trình B2B 5 Bước */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAECE8] shadow-xs">
                  <h3 className="font-heading font-bold text-base text-[#10542C] mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#8BC34A]" /> Tiến Trình Chuỗi Cung Ứng Lạnh Nông Sản Sỉ (Cold-Chain)
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative">
                    {b2bStatusSteps.map((step, idx) => {
                      const currentStep = getB2bStepIndex(selectedContract);
                      const isDone = idx <= currentStep;
                      const isCurrent = idx === currentStep;
                      const Icon = step.icon;
                      return (
                        <div key={step.key} className="flex flex-col items-center text-center">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-all ${
                              isDone
                                ? 'bg-[#10542C] text-white shadow-md'
                                : 'bg-[#F4F5F1] text-[#6B7280]'
                            } ${isCurrent ? 'ring-4 ring-[#8BC34A]/40' : ''}`}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                          <h4 className={`text-xs font-bold ${isDone ? 'text-[#10542C]' : 'text-[#6B7280]'}`}>
                            {step.label}
                          </h4>
                          <p className="text-[10px] text-[#6B7280] mt-0.5 max-w-[140px]">{step.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2 Cột: Thông tin Hàng hóa & Địa điểm Bàn giao */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Cột 1: Thông tin Lô Nông Sản & Nhà Vườn */}
                  <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
                    <h3 className="font-heading font-bold text-base text-[#2C3E2E] border-b border-[#F0F2ED] pb-3 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#10542C]" /> Thông Tin Lô Hàng & Nhà Vườn Cung Ứng
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-[#F9F9F5]">
                        <span className="text-[#6B7280]">Nhà vườn / Hợp tác xã:</span>
                        <strong className="text-[#2C3E2E]">{selectedContract.farmName || 'HTX Nông Nghiệp Đà Lạt GAP'}</strong>
                      </div>

                      <div className="flex justify-between py-1 border-b border-[#F9F9F5]">
                        <span className="text-[#6B7280]">Mã số vùng trồng (PUC):</span>
                        <span className="font-mono font-bold text-[#10542C] bg-[#E8F5E9] px-2 py-0.5 rounded">
                          {selectedContract.pucCode || 'VN-LDO-PUC-0849'}
                        </span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-[#F9F9F5]">
                        <span className="text-[#6B7280]">Địa chỉ canh tác:</span>
                        <span className="text-[#2C3E2E] font-medium text-right max-w-[260px]">
                          {selectedContract.farmerAddress || 'Tiểu khu 158, Phường 8, TP. Đà Lạt, Lâm Đồng'}
                        </span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-[#F9F9F5]">
                        <span className="text-[#6B7280]">Hotline điều phối nhà vườn:</span>
                        <strong className="text-[#10542C]">{selectedContract.farmerPhone || '0912.849.688'}</strong>
                      </div>

                      <div className="flex justify-between py-1 border-b border-[#F9F9F5]">
                        <span className="text-[#6B7280]">Quy chuẩn bảo quản tươi:</span>
                        <span className="text-[#1565C0] font-bold flex items-center gap-1">
                          <Thermometer className="w-3.5 h-3.5" /> 2.0°C - 6.0°C (Pre-cooling)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cột 2: Thông tin Thương Lái & Kế Hoạch Giao Trạm */}
                  <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
                    <h3 className="font-heading font-bold text-base text-[#2C3E2E] border-b border-[#F0F2ED] pb-3 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-[#10542C]" /> Điểm Bàn Giao & Vận Chuyển Xe Lạnh
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-[#F9F9F5]">
                        <span className="text-[#6B7280]">Đại diện thu mua:</span>
                        <strong className="text-[#2C3E2E]">{selectedContract.buyerName}</strong>
                      </div>

                      <div className="flex justify-between py-1 border-b border-[#F9F9F5]">
                        <span className="text-[#6B7280]">Số điện thoại thương lái:</span>
                        <strong className="text-[#2C3E2E]">{selectedContract.buyerPhone}</strong>
                      </div>

                      <div className="flex justify-between py-1 border-b border-[#F9F9F5]">
                        <span className="text-[#6B7280]">Trạm kiểm định tiếp nhận:</span>
                        <strong className="text-[#10542C] text-right">
                          {selectedContract.hubName || 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng'}
                        </strong>
                      </div>

                      <div className="flex justify-between py-1 border-b border-[#F9F9F5]">
                        <span className="text-[#6B7280]">Ngày hẹn giao nhận:</span>
                        <strong className="text-[#2E7D32]">
                          {selectedContract.hubDeliveryDate || '2026-10-29'}
                        </strong>
                      </div>

                      <div className="flex justify-between py-1 border-b border-[#F9F9F5]">
                        <span className="text-[#6B7280]">Khung giờ tiếp đón tại trạm:</span>
                        <span className="text-[#2C3E2E] font-bold">
                          {selectedContract.deliveryTimeSlot || '06:00 - 09:00 (Sáng sớm)'}
                        </span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-[#F9F9F5]">
                        <span className="text-[#6B7280]">Phương tiện chuyên chở:</span>
                        <span className="text-[#2C3E2E] font-medium">
                          {selectedContract.truckType || 'Xe tải lạnh chuyên dụng 2.5 - 5 Tấn'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== POPUP MODAL XEM BIÊN BẢN QC ===================== */}
        {qcModalData && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#EAECE8] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-[#EAECE8] pb-4 mb-6">
                <div>
                  <span className="text-xs bg-[#E8F5E9] text-[#10542C] font-bold px-2.5 py-1 rounded-full">
                    BIÊN BẢN NGHIỆM THU QC CHÍNH THỨC
                  </span>
                  <h3 className="font-heading font-black text-xl text-[#10542C] mt-2">
                    Biên Bản Kiểm Định Trạm Lạnh Cross-docking
                  </h3>
                  <p className="text-xs text-[#6B7280] font-mono mt-0.5">
                    Hợp đồng: {qcModalData.contractCode} • {qcModalData.productName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQcModalData(null)}
                  className="p-2 rounded-full hover:bg-[#F4F5F1] text-[#6B7280] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid 4 Chỉ số QC */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-4 rounded-2xl bg-[#F9F9F5] border border-[#EAECE8] text-center">
                  <span className="text-[10px] text-[#6B7280]">Tổng cân nhận:</span>
                  <p className="font-heading font-black text-lg text-[#2C3E2E] mt-1">
                    {qcModalData.grossWeight?.toLocaleString()} kg
                  </p>
                  <span className="text-[10px] text-[#6B7280]">Bàn cân điện tử</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#E8F5E9] border border-[#C8E6C9] text-center">
                  <span className="text-[10px] text-[#2E7D32] font-bold">Đạt chuẩn lưu kho:</span>
                  <p className="font-heading font-black text-lg text-[#2E7D32] mt-1">
                    {qcModalData.netQualifiedWeight?.toLocaleString()} kg
                  </p>
                  <span className="text-[10px] text-[#2E7D32] font-bold">
                    ({qcModalData.qualifiedPercent}%)
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                  <span className="text-[10px] text-amber-700 font-bold">Độ ngọt Brix:</span>
                  <p className="font-heading font-black text-lg text-amber-800 mt-1">
                    {qcModalData.brixScore}°Bx
                  </p>
                  <span className="text-[10px] text-amber-700">Khúc xạ kế chuẩn</span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                  <span className="text-[10px] text-blue-700 font-bold">Độ ẩm cuống lá:</span>
                  <p className="font-heading font-black text-lg text-blue-800 mt-1">
                    {qcModalData.moisturePercent}%
                  </p>
                  <span className="text-[10px] text-blue-700">Cảm quan tươi tốt</span>
                </div>
              </div>

              {/* Chi tiết phế phẩm loại bỏ & Chuyên viên kiểm định */}
              <div className="space-y-3 text-xs bg-[#F9F9F5] p-4 rounded-2xl border border-[#EAECE8] mb-6">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Khối lượng phế phẩm loại trừ tại bàn cân:</span>
                  <strong className="text-[#E53935]">{qcModalData.rejectedWeight} kg (Tách bỏ tại vườn/trạm)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Kỹ sư kiểm định chất lượng:</span>
                  <strong className="text-[#10542C]">{qcModalData.inspectorName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Thời điểm hoàn tất kiểm định:</span>
                  <span>{new Date(qcModalData.inspectedAt).toLocaleString('vi-VN')}</span>
                </div>
                <div className="pt-2 border-t border-[#EAECE8]">
                  <span className="text-[#6B7280]">Ghi chú chuyên viên:</span>
                  <p className="text-[#2C3E2E] mt-1 italic font-medium">"{qcModalData.qcNotes}"</p>
                </div>
              </div>

              {/* Footer Modal QC */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[#6B7280] italic">
                  * Kết quả kiểm định là căn cứ giải phóng quỹ ký quỹ Escrow.
                </span>
                <button
                  type="button"
                  onClick={() => setQcModalData(null)}
                  className="px-6 py-2.5 bg-[#10542C] text-white rounded-xl text-xs font-bold hover:bg-[#0C3E20] transition-all cursor-pointer"
                >
                  Đóng Biên Bản
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9F9F5] flex items-center justify-center">Đang tải...</div>}>
      <OrderTrackingContent />
    </Suspense>
  );
}
