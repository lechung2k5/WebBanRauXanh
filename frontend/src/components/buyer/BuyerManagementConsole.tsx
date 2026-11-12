'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { api } from '@/services/auth';
import {
  getBuyerB2bContractsApi,
  getStoredUser,
  getProducts,
} from '@/services/api';
import {
  B2bSyncContract,
  B2bSyncRfq,
  getSyncContracts,
  getSyncRfqs,
  subscribeB2bSyncEvents,
  buyerAcceptCounterRfq,
  buyerCounterRfq,
} from '@/services/b2bSyncService';
import { B2BContract, Product } from '@/types';
import B2BNegotiationModal from '@/components/B2BNegotiationModal';
import { SepayPaymentModal } from '@/components/common/SepayPaymentModal';
import { GoongMapViewer } from '@/components/common/GoongMapViewer';
import Pagination from '@/components/Pagination';
import {
  LayoutDashboard,
  Sprout,
  Handshake,
  FileText,
  Truck,
  User as UserIcon,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  QrCode,
  MapPin,
  Building2,
  Phone,
  Scale,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  FileCheck2,
  X,
  Filter,
  ArrowUpDown,
} from 'lucide-react';

type BuyerTab = 'overview' | 'catalog' | 'negotiations' | 'contracts' | 'shipments' | 'profile';

export default function BuyerManagementConsole() {
  const router = useRouter();
  const { currentUser, authLoading, logout, setCurrentUser } = useApp();

  const [activeTab, setActiveTab] = useState<BuyerTab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Dữ liệu nghiệp vụ
  const [contracts, setContracts] = useState<B2BContract[]>([]);
  const [syncContracts, setSyncContracts] = useState<B2bSyncContract[]>([]);
  const [rfqs, setRfqs] = useState<B2bSyncRfq[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

  // Bộ lọc & Tìm kiếm & Phân trang nguồn nông sản sỉ
  const [catalogKeyword, setCatalogKeyword] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('ALL');
  const [catalogSort, setCatalogSort] = useState<'default' | 'price_asc' | 'price_desc' | 'moq_asc'>('default');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogSize] = useState(6);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Modals
  const [negotiatingProduct, setNegotiatingProduct] = useState<Product | null>(null);
  const [selectedContractForPayment, setSelectedContractForPayment] = useState<B2BContract | B2bSyncContract | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState<{ id: number; price: number } | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // Form Profile
  const [profileCompany, setProfileCompany] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileWarehouse, setProfileWarehouse] = useState('');

  // 1. Kiểm tra quyền truy cập (Role BUYER)
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/dang-nhap?redirect=/portal/buyer');
    }
  }, [authLoading, currentUser, router]);

  // Nạp thông tin hồ sơ
  useEffect(() => {
    const user = currentUser || getStoredUser();
    if (user) {
      setProfileCompany(user.companyName || '');
      setProfilePhone(user.phone || '');
      setProfileAddress(user.address || '');
      setProfileWarehouse(user.warehouseAddress || user.address || '');
    }
  }, [currentUser]);

  // 2. Tải nguồn nông sản sỉ (Tìm kiếm, Lọc danh mục & Phân trang)
  const loadCatalogData = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await getProducts({
        keyword: catalogKeyword.trim() || undefined,
        categorySlug: catalogCategory === 'ALL' ? undefined : catalogCategory,
        page: catalogPage,
        size: catalogSize,
      });
      let list = [...(res.products || [])];
      if (catalogSort === 'price_asc') {
        list.sort((a, b) => a.price - b.price);
      } else if (catalogSort === 'price_desc') {
        list.sort((a, b) => b.price - a.price);
      } else if (catalogSort === 'moq_asc') {
        list.sort((a, b) => (a.moq || 500) - (b.moq || 500));
      }
      setAvailableProducts(list);
      setCatalogTotal(res.totalElements || list.length);
      setCatalogTotalPages(Math.max(1, res.totalPages || Math.ceil((res.totalElements || list.length) / catalogSize)));
    } catch (err) {
      console.warn('Lỗi tải danh mục nông sản:', err);
      setAvailableProducts([]);
      setCatalogTotal(0);
      setCatalogTotalPages(1);
    } finally {
      setCatalogLoading(false);
    }
  }, [catalogKeyword, catalogCategory, catalogSort, catalogPage, catalogSize]);

  useEffect(() => {
    void loadCatalogData();
  }, [loadCatalogData]);

  const handleKeywordChange = (val: string) => {
    setCatalogKeyword(val);
    setCatalogPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setCatalogCategory(val);
    setCatalogPage(1);
  };

  const handleSortChange = (val: 'default' | 'price_asc' | 'price_desc' | 'moq_asc') => {
    setCatalogSort(val);
    setCatalogPage(1);
  };

  const handleResetCatalogFilters = () => {
    setCatalogKeyword('');
    setCatalogCategory('ALL');
    setCatalogSort('default');
    setCatalogPage(1);
  };

  // 3. Tải toàn bộ dữ liệu hợp đồng & đàm phán
  const loadAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [backendContracts] = await Promise.all([
        getBuyerB2bContractsApi().catch(() => []),
      ]);

      const localContracts = getSyncContracts();
      const localRfqs = getSyncRfqs();

      setContracts(backendContracts);
      setSyncContracts(localContracts);
      setRfqs(localRfqs);
      void loadCatalogData();
    } catch (err) {
      console.warn('Lỗi tải dữ liệu phân hệ thương lái:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadCatalogData]);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  // 3. Kết nối Socket / Kênh đồng bộ thời gian thực (Real-time Sync) với Nông dân & Quản trị viên
  useEffect(() => {
    const unsubscribe = subscribeB2bSyncEvents((event) => {
      // Nhận sự kiện thời gian thực từ kênh đồng bộ
      if (
        event.type === 'LOT_STATUS_UPDATED' ||
        event.type === 'LOT_CREATED' ||
        event.type === 'LOT_UPDATED'
      ) {
        void loadCatalogData();
      } else if (
        event.type === 'RFQ_UPDATED' ||
        event.type === 'RFQ_CREATED' ||
        event.type === 'CONTRACT_CREATED' ||
        event.type === 'DEPOSIT_PAID' ||
        event.type === 'EPOD_SIGNED' ||
        event.type === 'CONTRACTS_STORAGE_SYNC' ||
        event.type === 'RFQS_STORAGE_SYNC'
      ) {
        setNotification('Dữ liệu đàm phán & hợp đồng vừa được cập nhật tức thì!');
        setTimeout(() => setNotification(null), 4000);
        void loadAllData();
      }
    });

    const handleStorage = () => {
      void loadCatalogData();
      void loadAllData();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('b2b_sync_event', handleStorage);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('b2b_sync_event', handleStorage);
    };
  }, [loadAllData, loadCatalogData]);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Thống kê nhanh
  const totalVolumeTons = (contracts.reduce((sum, c) => sum + (c.quantity || 0), 0) / 1000).toFixed(1);
  const totalDepositHolding = contracts
    .filter((c) => c.depositStatus === 'DEPOSIT_PAID')
    .reduce((sum, c) => sum + (c.depositAmount || 0), 0);
  const pendingDepositContracts = contracts.filter((c) => c.depositStatus !== 'DEPOSIT_PAID');
  const inTransitContracts = contracts.filter((c) => c.fulfillmentStatus === 'IN_TRANSIT');

  // Xử lý chấp nhận giá đàm phán
  const handleAcceptRfq = (rfqId: number) => {
    try {
      buyerAcceptCounterRfq(rfqId);
      void loadAllData();
      setNotification('Bạn đã chấp nhận giá và tạo hợp đồng thành công!');
      setTimeout(() => setNotification(null), 3000);
    } catch {
      alert('Không thể hoàn tất chấp thuận đơn đàm phán.');
    }
  };

  // Xử lý gửi lại mức giá mới
  const handleSendCounter = (rfqId: number) => {
    if (!counterPriceInput || counterPriceInput.price <= 0) return;
    try {
      buyerCounterRfq(rfqId, counterPriceInput.price);
      setCounterPriceInput(null);
      void loadAllData();
      setNotification('Đã gửi đề xuất giá mới tới nhà vườn!');
      setTimeout(() => setNotification(null), 3000);
    } catch {
      alert('Không thể gửi mức giá đề xuất.');
    }
  };

  // Cập nhật hồ sơ thương lái
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api<any>('auth/profile', 'PUT', {
        companyName: profileCompany,
        phone: profilePhone,
        address: profileAddress,
        warehouseAddress: profileWarehouse,
      });
      if (updated) setCurrentUser(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      alert('Không thể lưu thông tin hồ sơ. Vui lòng kiểm tra lại kết nối mạng.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F5F6F2] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-[#10542C] animate-spin" />
        <span className="text-sm font-bold text-[#10542C]">Đang chuẩn bị không gian làm việc của Thương lái...</span>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#F4F6F2] text-[#243A2A] flex flex-col lg:flex-row antialiased">
      {/* Toast thông báo thời gian thực */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-[#10542C] text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-[#8BC34A]" />
          <span>{notification}</span>
        </div>
      )}

      {/* =========================================================================
          1. MENU DỌC BÊN TRÁI (LEFT SIDEBAR MANAGEMENT)
      ========================================================================= */}
      <aside className="w-full lg:w-72 lg:h-screen lg:sticky lg:top-0 bg-[#0F3820] text-white flex flex-col shrink-0 border-r border-[#1B4D2E] shadow-xl z-20">
        {/* Logo & Nhãn phân hệ */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8BC34A] to-[#4CAF50] flex items-center justify-center text-[#0F3820] font-black text-lg shadow-md">
              HF
            </div>
            <div>
              <h2 className="font-heading font-black text-base text-white tracking-tight">HoNa Fresh</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8BC34A] block">
                Cổng Thu Mua & Thương Lái
              </span>
            </div>
          </div>
        </div>

        {/* Thông tin thương lái tóm tắt */}
        <div className="p-4 mx-4 my-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8BC34A] text-[#0F3820] flex items-center justify-center font-bold font-heading text-sm shrink-0">
            {currentUser?.fullName?.charAt(0) || 'T'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{currentUser?.fullName || 'Thương Lái'}</p>
            <p className="text-[11px] text-[#8BC34A] truncate font-medium">
              {currentUser?.companyName || 'Đơn vị thu mua sỉ'}
            </p>
          </div>
        </div>

        {/* Danh sách mục menu */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {[
            { id: 'overview', label: 'Tổng Quan', icon: LayoutDashboard },
            { id: 'catalog', label: 'Tìm Nguồn Nông Sản Sỉ', icon: Sprout },
            {
              id: 'negotiations',
              label: 'Đơn Đàm Phán Giá',
              icon: Handshake,
              badge: rfqs.filter((r) => r.status === 'WAITING_BUYER').length,
            },
            {
              id: 'contracts',
              label: 'Hợp Đồng & Đặt Cọc',
              icon: FileText,
              badge: pendingDepositContracts.length,
            },
            {
              id: 'shipments',
              label: 'Chuyến Xe Đang Giao',
              icon: Truck,
              badge: inTransitContracts.length,
            },
            { id: 'profile', label: 'Hồ Sơ & Kho Tiếp Nhận', icon: UserIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as BuyerTab)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#8BC34A] text-[#0F3820] shadow-sm'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#0F3820]' : 'text-[#8BC34A]'}`} />
                  <span>{item.label}</span>
                </div>
                {Boolean(item.badge && item.badge > 0) && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-[#0F3820] text-[#8BC34A]' : 'bg-[#E53935] text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Nút thoát ở chân menu */}
        <div className="p-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => void logout().then(() => router.replace('/dang-nhap'))}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          2. KHU VỰC NỘI DUNG CHÍNH BÊN PHẢI (MAIN CONTENT AREA)
      ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Header thanh thoát */}
        <header className="h-16 bg-white border-b border-[#EAECE8] px-6 sm:px-8 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#6B7280]">Bàn làm việc</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <strong className="text-[#10542C] capitalize">
              {activeTab === 'overview' && 'Tổng quan thu mua'}
              {activeTab === 'catalog' && 'Danh mục nông sản sỉ'}
              {activeTab === 'negotiations' && 'Đơn đàm phán giá sỉ'}
              {activeTab === 'contracts' && 'Hợp đồng & Đặt cọc'}
              {activeTab === 'shipments' && 'Theo dõi chuyến xe giao hàng'}
              {activeTab === 'profile' && 'Hồ sơ thương lái & kho tiếp nhận'}
            </strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadAllData()}
              disabled={refreshing}
              className="px-3.5 py-1.5 rounded-xl bg-[#F4F6F2] hover:bg-[#EAECE8] text-[#10542C] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </header>

        {/* Nội dung chi tiết từng Tab */}
        <div className="p-6 sm:p-8 space-y-6 flex-1">
          {/* ==================== TAB 1: TỔNG QUAN (OVERVIEW) ==================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* 4 Thẻ KPI tóm tắt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-xs">
                  <span className="text-xs text-[#6B7280] font-medium block">Hợp đồng đang thực hiện</span>
                  <p className="font-heading font-black text-2xl text-[#10542C] mt-1.5">
                    {contracts.length} <span className="text-xs font-normal text-slate-500">hợp đồng</span>
                  </p>
                  <span className="text-[11px] text-emerald-700 block mt-1">Giao dịch trực tiếp nhà vườn</span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-xs">
                  <span className="text-xs text-[#6B7280] font-medium block">Sản lượng đặt thu mua</span>
                  <p className="font-heading font-black text-2xl text-[#2C3E2E] mt-1.5">
                    {totalVolumeTons} <span className="text-xs font-normal text-slate-500">Tấn</span>
                  </p>
                  <span className="text-[11px] text-slate-500 block mt-1">Đạt chuẩn chất lượng an toàn</span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-xs">
                  <span className="text-xs text-[#6B7280] font-medium block">Tiền cọc bảo chứng an toàn</span>
                  <p className="font-heading font-black text-2xl text-[#E53935] mt-1.5">
                    {formatVND(totalDepositHolding)}
                  </p>
                  <span className="text-[11px] text-emerald-700 block mt-1">Tài khoản bảo chứng giữ an toàn</span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-xs">
                  <span className="text-xs text-[#6B7280] font-medium block">Chuyến xe đang giao về kho</span>
                  <p className="font-heading font-black text-2xl text-[#1565C0] mt-1.5">
                    {inTransitContracts.length} <span className="text-xs font-normal text-slate-500">chuyến</span>
                  </p>
                  <span className="text-[11px] text-blue-700 block mt-1">Xe thùng lạnh giữ tươi</span>
                </div>
              </div>

              {/* Banner điều hướng nhanh */}
              <div className="bg-gradient-to-r from-[#10542C] to-[#1B6D3D] rounded-3xl p-6 sm:p-7 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading font-black text-lg text-white">Bạn cần nhập thêm nông sản sạch hôm nay?</h3>
                  <p className="text-xs text-white/80 mt-1 max-w-xl">
                    Hàng chục tấn rau củ quả chuẩn VietGAP từ các hợp tác xã Lâm Đồng đang sẵn sàng thu hoạch với mức giá sỉ ưu đãi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="px-5 py-3 rounded-2xl bg-[#8BC34A] hover:bg-[#7CB342] text-[#10542C] font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0 shadow-md"
                >
                  <Sprout className="w-4 h-4" />
                  <span>Khám phá nguồn hàng ngay</span>
                </button>
              </div>

              {/* Danh sách các đơn đàm phán cần chú ý */}
              <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0F2ED] pb-3">
                  <h4 className="font-heading font-black text-sm text-[#2C3E2E] flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-[#10542C]" />
                    <span>Yêu Cầu Đàm Phán Cần Bạn Phản Hồi</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('negotiations')}
                    className="text-xs text-[#10542C] hover:underline font-bold"
                  >
                    Xem tất cả ({rfqs.length})
                  </button>
                </div>

                {rfqs.filter((r) => r.status === 'WAITING_BUYER').length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#6B7280] space-y-1">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                    <p className="font-bold text-[#2C3E2E]">Tất cả đơn đàm phán đều đang được xử lý ổn định.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#F0F2ED]">
                    {rfqs
                      .filter((r) => r.status === 'WAITING_BUYER')
                      .map((rfq) => (
                        <div key={rfq.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-mono font-bold text-[#10542C]">{rfq.rfqCode}</span> ·{' '}
                            <strong className="text-[#2C3E2E]">{rfq.productName}</strong>
                            <p className="text-[11px] text-[#6B7280] mt-0.5">
                              Khối lượng: {rfq.requestedQuantityKg.toLocaleString()} kg · Nhà vườn đề xuất:{' '}
                              <strong className="text-[#E53935]">{formatVND(rfq.counterPricePerKg || rfq.targetPricePerKg)}/kg</strong>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAcceptRfq(rfq.id)}
                              className="px-3 py-1.5 bg-[#10542C] text-white rounded-lg font-bold hover:bg-[#0C3E20] transition-colors"
                            >
                              Đồng ý giá này
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: TÌM NGUỒN NÔNG SẢN (CATALOG) ==================== */}
          {activeTab === 'catalog' && (
            <div id="buyer-catalog-section" className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading font-black text-xl text-[#10542C]">Nguồn Nông Sản Sạch Xuất Vườn</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Liên kết trực tiếp các hợp tác xã và nhà vườn uy tín tại Đà Lạt & Lâm Đồng
                  </p>
                </div>
                <div className="text-xs font-bold text-[#10542C] bg-[#EAF5E9] px-3.5 py-1.5 rounded-xl border border-[#D7EED6] self-start sm:self-auto">
                  Sẵn có: <strong>{catalogTotal}</strong> lô nông sản
                </div>
              </div>

              {/* KHỐI TÌM KIẾM & BỘ LỌC */}
              <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Ô tìm kiếm từ khóa */}
                  <div className="relative sm:col-span-2">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={catalogKeyword}
                      onChange={(e) => handleKeywordChange(e.target.value)}
                      placeholder="Tìm theo tên nông sản, nhà vườn, hợp tác xã..."
                      className="w-full pl-10 pr-9 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#10542C] focus:bg-white transition-all"
                    />
                    {Boolean(catalogKeyword) && (
                      <button
                        type="button"
                        onClick={() => handleKeywordChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title="Xóa từ khóa"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Lọc theo danh mục / Ngành hàng */}
                  <div>
                    <select
                      value={catalogCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#10542C] cursor-pointer"
                    >
                      <option value="ALL">Tất cả ngành hàng</option>
                      <option value="rau-an-la">Rau ăn lá VietGAP</option>
                      <option value="cu-qua-tuoi">Củ & Quả tươi</option>
                      <option value="nam-tuoi-huu-co">Nấm tươi hữu cơ</option>
                      <option value="rau-gia-vi">Rau gia vị & Khác</option>
                    </select>
                  </div>

                  {/* Lọc sắp xếp theo giá / sản lượng */}
                  <div>
                    <select
                      value={catalogSort}
                      onChange={(e) => handleSortChange(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#10542C] cursor-pointer"
                    >
                      <option value="default">Sắp xếp: Mặc định</option>
                      <option value="price_asc">Giá sỉ: Thấp đến cao</option>
                      <option value="price_desc">Giá sỉ: Cao đến thấp</option>
                      <option value="moq_asc">Đặt tối thiểu: Thấp nhất</option>
                    </select>
                  </div>
                </div>

                {/* Các nút bấm chọn nhanh danh mục + Nút Xóa lọc */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F0F2ED]">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[#6B7280] font-medium text-[11px] mr-1">Ngành hàng:</span>
                    {[
                      { id: 'ALL', label: 'Tất cả' },
                      { id: 'rau-an-la', label: 'Rau ăn lá' },
                      { id: 'cu-qua-tuoi', label: 'Củ & Quả' },
                      { id: 'nam-tuoi-huu-co', label: 'Nấm tươi' },
                      { id: 'rau-gia-vi', label: 'Rau gia vị' },
                    ].map((cat) => {
                      const isActive = catalogCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategoryChange(cat.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#10542C] text-white shadow-2xs'
                              : 'bg-[#F4F6F2] text-[#6B7280] hover:bg-[#EAECE8] hover:text-[#10542C]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>

                  {(Boolean(catalogKeyword) || catalogCategory !== 'ALL' || catalogSort !== 'default') && (
                    <button
                      type="button"
                      onClick={handleResetCatalogFilters}
                      className="px-3 py-1 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Xóa bộ lọc</span>
                    </button>
                  )}
                </div>
              </div>

              {/* LƯỚI SẢN PHẨM / KẾT QUẢ TÌM KIẾM */}
              {catalogLoading ? (
                <div className="py-20 text-center bg-white rounded-3xl border border-[#EAECE8] shadow-xs">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#10542C] mb-2" />
                  <p className="text-xs font-bold text-[#10542C]">Đang tìm kiếm nguồn nông sản sỉ phù hợp...</p>
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-[#EAECE8] shadow-xs space-y-3">
                  <Sprout className="w-12 h-12 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="font-heading font-black text-sm text-[#2C3E2E]">Không tìm thấy lô nông sản nào</p>
                    <p className="text-xs text-[#6B7280]">
                      Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh mục xuất vườn.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetCatalogFilters}
                    className="px-4 py-2 bg-[#10542C] text-white rounded-xl text-xs font-bold hover:bg-[#0C3E20] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Xem lại tất cả nông sản</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="buyer-catalog-grid">
                    {availableProducts.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4 group"
                      >
                        <div className="space-y-3">
                          <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-100">
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-[#10542C]/90 text-white font-bold text-[10px] backdrop-blur-xs">
                              Chuẩn VietGAP
                            </span>
                            {Boolean(p.availableVolume && p.availableVolume > 0) && (
                              <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono font-medium backdrop-blur-xs">
                                Sẵn có: {p.availableVolume?.toLocaleString()} kg
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="font-heading font-bold text-sm text-[#10542C] line-clamp-1 group-hover:text-[#0C3E20] transition-colors">
                              {p.name}
                            </h4>
                            <p className="text-[11px] text-[#6B7280] flex items-center gap-1 mt-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{p.farmName || 'Hợp Tác Xã Nông Nghiệp Đà Lạt'}</span>
                            </p>
                          </div>

                          <div className="p-3 bg-[#F9FAF8] rounded-xl border border-[#EAECE8] space-y-1 text-xs">
                            <div className="flex justify-between text-[#6B7280]">
                              <span>Giá sỉ xuất vườn:</span>
                              <strong className="text-[#10542C] font-black">{formatVND(p.price)}/kg</strong>
                            </div>
                            <div className="flex justify-between text-[#6B7280]">
                              <span>Khối lượng đặt tối thiểu:</span>
                              <span className="font-bold text-slate-700">
                                {p.moq && p.moq >= 1000 ? `${(p.moq / 1000).toFixed(1)} Tấn` : `${(p.moq || 500).toLocaleString()} kg`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setNegotiatingProduct(p)}
                          className="w-full py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Scale className="w-3.5 h-3.5 text-[#8BC34A]" />
                          <span>Thương lượng giá sỉ</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* PHÂN TRANG (PAGINATION) */}
                  <Pagination
                    currentPage={catalogPage}
                    totalPages={catalogTotalPages}
                    totalItems={catalogTotal}
                    pageSize={catalogSize}
                    onPageChange={(page) => setCatalogPage(page)}
                    scrollTargetId="buyer-catalog-section"
                  />
                </>
              )}
            </div>
          )}

          {/* ==================== TAB 3: ĐƠN ĐÀM PHÁN GIÁ SỈ ==================== */}
          {activeTab === 'negotiations' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-heading font-black text-lg text-[#10542C]">Danh Sách Đơn Đàm Phán Giá Sỉ</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Theo dõi phản hồi thỏa thuận giá từ nhà vườn và chốt tạo hợp đồng
                </p>
              </div>

              {rfqs.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-[#EAECE8] text-xs text-[#6B7280] space-y-2">
                  <Handshake className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-[#2C3E2E]">Bạn chưa gửi yêu cầu đàm phán giá nào.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className="text-xs text-[#10542C] underline font-bold"
                  >
                    Xem nguồn hàng để bắt đầu đàm phán
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-[#EAECE8] overflow-hidden shadow-xs">
                  <div className="divide-y divide-[#F0F2ED]">
                    {rfqs.map((rfq) => {
                      const isWaitingBuyer = rfq.status === 'WAITING_BUYER';
                      const isAccepted = rfq.status === 'ACCEPTED';
                      return (
                        <div key={rfq.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-[#10542C]">{rfq.rfqCode}</span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isAccepted
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isWaitingBuyer
                                    ? 'bg-amber-100 text-amber-800 animate-pulse'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {isAccepted
                                  ? 'Đã đồng ý & Tạo hợp đồng'
                                  : isWaitingBuyer
                                  ? 'Nhà vườn đã gửi giá mới'
                                  : 'Đang chờ nhà vườn xem xét'}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-[#2C3E2E]">{rfq.productName}</h4>
                            <p className="text-[#6B7280]">
                              Khối lượng: <strong>{rfq.requestedQuantityKg.toLocaleString()} kg</strong> · Giá bạn đề xuất:{' '}
                              <strong>{formatVND(rfq.targetPricePerKg)}/kg</strong>
                            </p>
                            {Boolean(rfq.counterPricePerKg) && (
                              <p className="text-amber-800 font-bold bg-amber-50 px-2 py-1 rounded-md inline-block">
                                Nhà vườn phản hồi: {formatVND(rfq.counterPricePerKg!)}/kg
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {isWaitingBuyer && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptRfq(rfq.id)}
                                  className="px-4 py-2 bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                >
                                  Đồng ý mức giá này
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCounterPriceInput({
                                      id: rfq.id,
                                      price: rfq.counterPricePerKg || rfq.targetPricePerKg,
                                    })
                                  }
                                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                  Đề xuất lại giá
                                </button>
                              </>
                            )}

                            {isAccepted && rfq.contractCode && (
                              <button
                                type="button"
                                onClick={() => setActiveTab('contracts')}
                                className="px-3.5 py-1.5 bg-[#EAF5E9] text-[#10542C] font-bold rounded-xl hover:bg-[#D7EED6] transition-colors"
                              >
                                Xem hợp đồng: {rfq.contractCode}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form popup đề xuất lại giá */}
              {counterPriceInput && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
                    <h4 className="font-heading font-black text-sm text-[#10542C]">Đề Xuất Lại Mức Giá Mua</h4>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Mức giá bạn mong muốn (đ/kg):</label>
                      <input
                        type="number"
                        value={counterPriceInput.price}
                        onChange={(e) =>
                          setCounterPriceInput({ ...counterPriceInput, price: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border rounded-xl font-bold text-[#10542C]"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setCounterPriceInput(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendCounter(counterPriceInput.id)}
                        className="px-4 py-2 bg-[#10542C] text-white rounded-xl text-xs font-bold hover:bg-[#0C3E20]"
                      >
                        Gửi tới nhà vườn
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 4: HỢP ĐỒNG & ĐẶT CỌC ==================== */}
          {activeTab === 'contracts' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-heading font-black text-lg text-[#10542C]">Hợp Đồng Thu Mua & Đặt Cọc An Toàn</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Thanh toán cọc 30% bảo chứng tự động qua VietQR và theo dõi tiến độ giao hàng
                </p>
              </div>

              {contracts.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-[#EAECE8] text-xs text-[#6B7280]">
                  Chưa có hợp đồng nào được tạo. Khi bạn và nhà vườn thống nhất giá đàm phán, hợp đồng sẽ xuất hiện tại đây.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {contracts.map((c) => {
                    const isPaid = c.depositStatus === 'DEPOSIT_PAID';
                    return (
                      <div
                        key={c.id}
                        className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#10542C]">{c.contractCode}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isPaid ? 'Đã nộp cọc 30% bảo chứng' : 'Chờ nộp cọc 30%'}
                            </span>
                          </div>

                          <h4 className="font-heading font-bold text-base text-[#2C3E2E]">{c.productName}</h4>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-600">
                            <div>
                              <span>Khối lượng chốt: </span>
                              <strong className="text-slate-900">{(c.quantity || 0).toLocaleString()} kg</strong>
                            </div>
                            <div>
                              <span>Tổng giá trị hợp đồng: </span>
                              <strong className="text-[#10542C]">{formatVND(c.totalAmount || 0)}</strong>
                            </div>
                            <div>
                              <span>Tiền cọc 30%: </span>
                              <strong className="text-[#E53935]">{formatVND(c.depositAmount || 0)}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {!isPaid ? (
                            <button
                              type="button"
                              onClick={() => setSelectedContractForPayment(c)}
                              className="px-5 py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                            >
                              <QrCode className="w-4 h-4 text-[#8BC34A]" />
                              <span>Quét VietQR nộp cọc</span>
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-[11px] border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Đã bảo chứng an toàn</span>
                            </div>
                          )}

                          <a
                            href={`/don-hang?code=${c.contractCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors flex items-center gap-1"
                          >
                            <span>Xem chi tiết</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 5: CHUYẾN XE ĐANG GIAO (SHIPMENTS) ==================== */}
          {activeTab === 'shipments' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-heading font-black text-lg text-[#10542C]">Hành Trình Xe Tải Lạnh Giao Hàng</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Bản đồ lộ trình vận chuyển và phiếu ký nhận bàn giao nông sản tại kho
                </p>
              </div>

              {/* Bản đồ Goong Maps lộ trình xe lạnh */}
              <GoongMapViewer
                title="Bản Đồ Lộ Trình Xe Lạnh Chở Nông Sản Về Kho"
                origin={{
                  lat: 11.9404,
                  lng: 108.4583,
                  name: 'Trạm Tiếp Nhận Nông Sản Đức Trọng, Lâm Đồng',
                }}
                destination={{
                  lat: 10.8499,
                  lng: 106.7725,
                  name: profileWarehouse || 'Kho Tiếp Nhận Nông Sản Thủ Đức, TP.HCM',
                }}
                truckCode="49C-198.86 (Xe thùng lạnh)"
                temperature={4.2}
                statusBadge="Xe đang di chuyển an toàn"
                height={340}
              />

              {/* Danh sách các chuyến hàng */}
              <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
                <h4 className="font-heading font-bold text-sm text-[#2C3E2E] flex items-center gap-2 border-b border-[#F0F2ED] pb-3">
                  <FileCheck2 className="w-4 h-4 text-[#10542C]" />
                  <span>Phiếu Giao Nhận & Trạng Thái Xe Lạnh</span>
                </h4>

                <div className="space-y-3">
                  {syncContracts.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-[#F9FAF8] border border-[#EAECE8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <span className="font-mono font-bold text-[#10542C]">{c.contractCode}</span> ·{' '}
                        <strong className="text-[#2C3E2E]">{c.productName}</strong>
                        <p className="text-[11px] text-[#6B7280]">
                          Phương tiện: <strong>{c.truckLicensePlate || '49C-123.45'}</strong> · Tài xế:{' '}
                          {c.truckDriverName || 'Nguyễn Văn Tài'} ({c.truckDriverPhone || '0909.112.233'})
                        </p>
                        <p className="text-[11px] text-emerald-700">
                          Địa chỉ giao: {c.deliveryAddress || profileWarehouse || 'Kho nông sản bên mua'}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px]">
                          {c.fulfillmentStatusName || 'Đang vận chuyển giữ tươi'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 6: HỒ SƠ THƯƠNG LÁI & KHO (PROFILE) ==================== */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-[#EAECE8] shadow-xs space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-heading font-black text-lg text-[#10542C]">Hồ Sơ Doanh Nghiệp & Kho Tiếp Nhận</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Thông tin này sẽ được tự động điền sẵn khi bạn gửi đơn đàm phán giá sỉ hoặc lập hợp đồng
                </p>
              </div>

              {profileSaved && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Đã lưu thông tin hồ sơ thương lái thành công!</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên Đơn Vị / Công Ty Thu Mua:</label>
                  <input
                    type="text"
                    required
                    value={profileCompany}
                    onChange={(e) => setProfileCompany(e.target.value)}
                    placeholder="VD: Công Ty Nông Sản Sài Gòn / Vựa Rau Củ Quả"
                    className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl font-bold text-[#10542C] focus:outline-none focus:border-[#10542C]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Số Điện Thoại Điều Phối:</label>
                    <input
                      type="tel"
                      required
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="09xx.xxx.xxx"
                      className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#10542C]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Địa Chỉ Doanh Nghiệp:</label>
                    <input
                      type="text"
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      placeholder="Số nhà, đường, phường, quận..."
                      className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#10542C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Địa Chỉ Kho Tiếp Nhận Hàng (Xe Tải Lạnh Giao Về):
                  </label>
                  <input
                    type="text"
                    required
                    value={profileWarehouse}
                    onChange={(e) => setProfileWarehouse(e.target.value)}
                    placeholder="VD: Cửa số 4, Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM"
                    className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-slate-200 rounded-xl font-bold text-[#10542C] focus:outline-none focus:border-[#10542C]"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Địa chỉ này sẽ dùng để tính toán định tuyến lộ trình xe tải lạnh tự động.
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold rounded-xl transition-colors cursor-pointer shadow-md"
                  >
                    Lưu Thông Tin Hồ Sơ
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          3. CÁC CỬA SỔ MODAL (ĐÀM PHÁN & THANH TOÁN VIETQR)
      ========================================================================= */}
      {/* Modal Đàm Phán Báo Giá Sỉ (Đã tự động điền thông tin tài khoản) */}
      {negotiatingProduct && (
        <B2BNegotiationModal
          product={negotiatingProduct}
          isOpen={!!negotiatingProduct}
          onClose={() => setNegotiatingProduct(null)}
          onSuccess={() => {
            setNegotiatingProduct(null);
            void loadAllData();
            setActiveTab('negotiations');
          }}
        />
      )}

      {/* Modal Quét Mã VietQR SePay Đặt Cọc 30% Hợp Đồng */}
      {selectedContractForPayment && (
        <SepayPaymentModal
          isOpen={!!selectedContractForPayment}
          onClose={() => setSelectedContractForPayment(null)}
          type="CONTRACT"
          code={String(selectedContractForPayment.contractCode || `HD-${selectedContractForPayment.id}`)}
          amount={Number(selectedContractForPayment.depositAmount || 0)}
          title="Quét Mã VietQR Nộp Cọc 30% Hợp Đồng"
          recipientName={currentUser?.fullName || 'Thương Lái'}
          onSuccess={() => {
            setSelectedContractForPayment(null);
            void loadAllData();
            setNotification('Đã xác nhận nộp cọc 30% bảo chứng thành công!');
          }}
        />
      )}
    </div>
  );
}

