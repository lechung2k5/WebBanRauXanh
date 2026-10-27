'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HarvestLot,
  HarvestLotRequest,
  Category,
  HarvestLotTierPrice,
  PageResponse,
} from '@/types';
import {
  getAdminHarvestLotsApi,
  getAdminLotStatsApi,
  createHarvestLotApi,
  updateHarvestLotApi,
  updateHarvestLotStatusApi,
  deleteHarvestLotApi,
  getCategories,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
} from '@/services/api';
import {
  Package,
  Layers,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  RefreshCw,
  Thermometer,
  ShieldCheck,
  Calendar,
  Clock,
  ChevronRight,
  Lock,
  Unlock,
  Copy,
  Tag,
  Loader2,
  Check,
  ArrowRight,
  MapPin,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';

interface Module2HarvestLotsProps {
  activeTab?: 'lots' | 'categories';
}

export function Module2HarvestLots({ activeTab = 'lots' }: Module2HarvestLotsProps = {}) {
  const [activeSubTab, setActiveSubTab] = useState<'lots' | 'categories'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p === 'categories' || p === 'lots') return p;
    }
    return activeTab;
  });

  const handleTabChange = (tab: 'lots' | 'categories') => {
    setActiveSubTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  useEffect(() => {
    if (activeTab && activeTab !== activeSubTab) {
      setActiveSubTab(activeTab);
    }
  }, [activeTab]);

  // ================= STATE CHO HARVEST LOTS =================
  const [lots, setLots] = useState<HarvestLot[]>([]);
  const [lotStats, setLotStats] = useState<Record<string, number>>({
    totalLots: 0,
    openLots: 0,
    pendingLots: 0,
    suspendedLots: 0,
    rejectedLots: 0,
    soldOutLots: 0,
  });
  const [loadingLots, setLoadingLots] = useState<boolean>(true);
  const [searchKw, setSearchKw] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Modals cho Lots
  const [selectedLotDetail, setSelectedLotDetail] = useState<HarvestLot | null>(null);
  const [isLotFormOpen, setIsLotFormOpen] = useState<boolean>(false);
  const [editingLot, setEditingLot] = useState<HarvestLot | null>(null);
  const [statusModalLot, setStatusModalLot] = useState<HarvestLot | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<string>('OPEN');
  const [statusReason, setStatusReason] = useState<string>('');
  const [statusAuditNote, setStatusAuditNote] = useState<string>('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State cho Tạo/Sửa Lô
  const [lotForm, setLotForm] = useState<{
    lotCode: string;
    farmerId?: number;
    farmerName: string;
    productName: string;
    category: string;
    categoryId: number;
    pucCode: string;
    certification: string;
    harvestDate: string;
    expiryDate: string;
    totalWeightKg: number;
    availableWeightKg: number;
    basePricePerKg: number;
    reqTempMin: number;
    reqTempMax: number;
    status: string;
    imageUrl: string;
    warehouseLocation: string;
    region: string;
    auditNote: string;
    tierPricing: HarvestLotTierPrice[];
  }>({
    lotCode: '',
    farmerId: 4,
    farmerName: 'HTX Nông Nghiệp Công Nghệ Cao Đơn Dương',
    productName: '',
    category: 'RAU_AN_LA',
    categoryId: 1,
    pucCode: 'VN-LDO-04-100',
    certification: 'VietGAP',
    harvestDate: '',
    expiryDate: '',
    totalWeightKg: 5000,
    availableWeightKg: 5000,
    basePricePerKg: 15000,
    reqTempMin: 2.0,
    reqTempMax: 6.0,
    status: 'PENDING_APPROVAL',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    warehouseLocation: 'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1',
    region: 'Tây Nguyên & Lâm Đồng',
    auditNote: 'Đạt chuẩn kiểm định VietGAP',
    tierPricing: [
      { minKg: 500, price: 15000 },
      { minKg: 2000, price: 13500 },
    ],
  });
  const [isSubmittingLot, setIsSubmittingLot] = useState<boolean>(false);

  // ================= STATE CHO CATEGORIES =================
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState<boolean>(false);
  const [categorySearchKw, setCategorySearchKw] = useState<string>('');
  const [categoryFilterStock, setCategoryFilterStock] = useState<'ALL' | 'HAS_LOTS' | 'EMPTY'>('ALL');
  const [categorySortBy, setCategorySortBy] = useState<'name_asc' | 'name_desc' | 'productCount'>('productCount');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<{
    name: string;
    description: string;
    imageUrl: string;
  }>({
    name: '',
    description: '',
    imageUrl: '',
  });

  const filteredCategories = categories
    .filter((cat) => {
      if (categoryFilterStock === 'HAS_LOTS' && (cat.productCount || 0) <= 0) return false;
      if (categoryFilterStock === 'EMPTY' && (cat.productCount || 0) > 0) return false;
      if (!categorySearchKw.trim()) return true;
      const kw = categorySearchKw.trim().toLowerCase();
      return (
        cat.name.toLowerCase().includes(kw) ||
        (cat.description && cat.description.toLowerCase().includes(kw))
      );
    })
    .sort((a, b) => {
      if (categorySortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (categorySortBy === 'name_desc') return b.name.localeCompare(a.name);
      return (b.productCount || 0) - (a.productCount || 0);
    });

  // Helper chuyển đổi category sang mã & tên hiển thị
  const getCategoryCode = (cat: Category) => {
    if (!cat) return 'RAU_AN_LA';
    if (cat.id === 1 || cat.slug === 'rau-an-la') return 'RAU_AN_LA';
    if (cat.id === 2 || cat.slug === 'cu-qua-tuoi' || cat.slug === 'cu-qua') return 'CU_QUA';
    if (cat.id === 3 || cat.slug === 'nam-tuoi-huu-co' || cat.slug === 'nam-tuoi') return 'NAM_TUOI';
    if (cat.id === 4 || cat.slug === 'rau-gia-vi-thao-moc') return 'RAU_GIA_VI';
    return cat.slug ? cat.slug.toUpperCase().replace(/-/g, '_') : `CAT_${cat.id}`;
  };

  const getCategoryName = (catCode?: string, catId?: number) => {
    if (catId) {
      const found = categories.find((c) => c.id === catId);
      if (found) return found.name;
    }
    if (catCode) {
      const upper = catCode.toUpperCase();
      const found = categories.find(
        (c) => getCategoryCode(c) === upper || c.slug?.toUpperCase() === upper || c.name?.toUpperCase() === upper
      );
      if (found) return found.name;
    }
    return catCode || 'Nông sản';
  };

  // Load initial data
  useEffect(() => {
    fetchLots();
    fetchStats();
    fetchCategoriesData();
  }, [currentPage, filterStatus, filterCategory, activeSubTab]);

  // Khóa cuộn trang nền khi có bất kỳ modal nào đang mở
  useEffect(() => {
    const isAnyModalOpen = Boolean(selectedLotDetail || isLotFormOpen || statusModalLot || isCategoryModalOpen);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedLotDetail, isLotFormOpen, statusModalLot, isCategoryModalOpen]);

  const fetchLots = async (pageOverride?: number, statusOverride?: string, catOverride?: string, searchOverride?: string) => {
    setLoadingLots(true);
    try {
      const pageToFetch = pageOverride !== undefined ? pageOverride : currentPage;
      const statusToFetch = statusOverride !== undefined ? statusOverride : filterStatus;
      const catToFetch = catOverride !== undefined ? catOverride : filterCategory;
      const searchToFetch = searchOverride !== undefined ? searchOverride : searchKw;

      const res = await getAdminHarvestLotsApi({
        keyword: searchToFetch.trim() || undefined,
        status: statusToFetch,
        category: catToFetch,
        page: pageToFetch,
        size: 15,
      });
      setLots(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || (res.data ? res.data.length : 0));
    } catch (err) {
      console.error('Error fetching harvest lots:', err);
    } finally {
      setLoadingLots(false);
    }
  };

  const fetchStats = async () => {
    try {
      const s = await getAdminLotStatsApi();
      setLotStats(s);
    } catch (err) {
      console.warn('Error fetching stats:', err);
    }
  };

  const fetchCategoriesData = async (): Promise<Category[]> => {
    setLoadingCategories(true);
    try {
      const data = await getCategories();
      const catList = data || [];
      setCategories(catList);
      return catList;
    } catch (err) {
      console.warn('Error fetching categories:', err);
      return [];
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const parseTierPricing = (tierJson?: string): HarvestLotTierPrice[] => {
    if (!tierJson) return [];
    try {
      return JSON.parse(tierJson);
    } catch {
      return [];
    }
  };

  // ================= THAO TÁC DUYỆT / TẠM KHÓA LÔ =================
  const openStatusModal = (lot: HarvestLot, initialStatus: string) => {
    setStatusModalLot(lot);
    setNewStatusValue(initialStatus);
    setStatusReason(lot.rejectionReason || '');
    setStatusAuditNote(lot.auditNote || '');
  };

  const handleSaveStatus = async () => {
    if (!statusModalLot) return;
    setIsSubmittingStatus(true);
    try {
      await updateHarvestLotStatusApi(
        statusModalLot.id,
        newStatusValue,
        statusReason.trim() || undefined,
        statusAuditNote.trim() || undefined
      );
      setStatusModalLot(null);
      await fetchLots();
      await fetchStats();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái lô hàng');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // ================= THÊM / SỬA LÔ =================
  const openCreateLotModal = async () => {
    setEditingLot(null);
    let currentCats = categories;
    if (currentCats.length === 0) {
      currentCats = await fetchCategoriesData();
    }
    const defaultCat = currentCats.length > 0 ? currentCats[0] : null;
    const catCode = defaultCat ? getCategoryCode(defaultCat) : 'RAU_AN_LA';
    const catId = defaultCat ? defaultCat.id : 1;

    setLotForm({
      lotCode: '',
      farmerId: 4,
      farmerName: 'HTX Nông Nghiệp Công Nghệ Cao Đơn Dương',
      productName: '',
      category: catCode,
      categoryId: catId,
      pucCode: 'VN-LDO-04-100',
      certification: 'VietGAP',
      harvestDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      totalWeightKg: 5000,
      availableWeightKg: 5000,
      basePricePerKg: 15000,
      reqTempMin: 2.0,
      reqTempMax: 6.0,
      status: 'PENDING_APPROVAL',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
      warehouseLocation: 'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1',
      region: 'Tây Nguyên & Lâm Đồng',
      auditNote: 'Đạt chuẩn kiểm định VietGAP',
      tierPricing: [
        { minKg: 500, price: 15000 },
        { minKg: 2000, price: 13500 },
      ],
    });
    setIsLotFormOpen(true);
  };

  const openEditLotModal = (lot: HarvestLot) => {
    setEditingLot(lot);
    const parsedTiers = parseTierPricing(lot.tierPricingJson);
    let matchedCat = categories.find((c) => c.id === lot.categoryId);
    if (!matchedCat && lot.category) {
      const upper = lot.category.toUpperCase();
      matchedCat = categories.find(
        (c) => getCategoryCode(c) === upper || c.slug?.toUpperCase() === upper
      );
    }
    const catCode = matchedCat ? getCategoryCode(matchedCat) : (lot.category || 'RAU_AN_LA');
    const catId = matchedCat ? matchedCat.id : (lot.categoryId || (categories[0]?.id || 1));

    setLotForm({
      lotCode: lot.lotCode,
      farmerId: lot.farmerId || 4,
      farmerName: lot.farmerName,
      productName: lot.productName,
      category: catCode,
      categoryId: catId,
      pucCode: lot.pucCode,
      certification: lot.certification || 'VietGAP',
      harvestDate: lot.harvestDate,
      expiryDate: lot.expiryDate,
      totalWeightKg: lot.totalWeightKg,
      availableWeightKg: lot.availableWeightKg,
      basePricePerKg: lot.basePricePerKg,
      reqTempMin: lot.reqTempMin ?? 2.0,
      reqTempMax: lot.reqTempMax ?? 6.0,
      status: lot.status,
      imageUrl: lot.imageUrl || '',
      warehouseLocation: lot.warehouseLocation || '',
      region: lot.region || 'Tây Nguyên & Lâm Đồng',
      auditNote: lot.auditNote || '',
      tierPricing: parsedTiers.length > 0 ? parsedTiers : [{ minKg: 500, price: lot.basePricePerKg }],
    });
    setIsLotFormOpen(true);
  };

  const handleSaveLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotForm.productName.trim() || !lotForm.pucCode.trim()) {
      alert('Vui lòng điền đầy đủ Tên nông sản và Mã số vùng trồng (PUC)');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const defaultExpiry = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    const payload: HarvestLotRequest = {
      lotCode: lotForm.lotCode.trim() || undefined,
      farmerId: lotForm.farmerId || 4,
      farmerName: lotForm.farmerName.trim() || 'HTX Nông Nghiệp Công Nghệ Cao Đơn Dương',
      productName: lotForm.productName.trim(),
      category: lotForm.category,
      categoryId: lotForm.categoryId,
      pucCode: lotForm.pucCode.trim().toUpperCase(),
      certification: lotForm.certification || 'VietGAP',
      harvestDate: lotForm.harvestDate || today,
      expiryDate: lotForm.expiryDate || defaultExpiry,
      totalWeightKg: Number(lotForm.totalWeightKg) || 1000,
      availableWeightKg: Number(lotForm.availableWeightKg) || Number(lotForm.totalWeightKg) || 1000,
      basePricePerKg: Number(lotForm.basePricePerKg) || 15000,
      tierPricingJson: JSON.stringify(lotForm.tierPricing || []),
      reqTempMin: Number(lotForm.reqTempMin) || 2.0,
      reqTempMax: Number(lotForm.reqTempMax) || 6.0,
      status: lotForm.status || 'PENDING_APPROVAL',
      imageUrl: lotForm.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
      warehouseLocation: lotForm.warehouseLocation || 'Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1',
      region: lotForm.region || 'Tây Nguyên & Lâm Đồng',
      auditNote: lotForm.auditNote || 'Đạt chuẩn kiểm định VietGAP',
    };

    setIsSubmittingLot(true);
    try {
      if (editingLot) {
        await updateHarvestLotApi(editingLot.id, payload);
        setIsLotFormOpen(false);
        await fetchLots();
      } else {
        await createHarvestLotApi(payload);
        setIsLotFormOpen(false);
        setCurrentPage(0);
        setFilterStatus('ALL');
        setFilterCategory('ALL');
        setSearchKw('');
        await fetchLots(0, 'ALL', 'ALL', '');
      }
      await fetchStats();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu lô nông sản');
    } finally {
      setIsSubmittingLot(false);
    }
  };

  const handleDeleteLot = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lô nông sản này khỏi hệ thống?')) return;
    try {
      await deleteHarvestLotApi(id);
      await fetchLots();
      await fetchStats();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa lô nông sản');
    }
  };

  // ================= THAO TÁC CATEGORY CRUD =================
  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    });
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    setIsSubmittingCategory(true);
    try {
      if (editingCategory) {
        await updateCategoryApi(editingCategory.id, categoryForm);
      } else {
        await createCategoryApi(categoryForm);
      }
      setIsCategoryModalOpen(false);
      await fetchCategoriesData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu danh mục');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa danh mục này? Hãy đảm bảo không còn nông sản thuộc nhóm này.')) return;
    try {
      await deleteCategoryApi(id);
      await fetchCategoriesData();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa danh mục đang có sản phẩm liên kết');
    }
  };

  return (
    <div className="space-y-6">
      {/* Thanh chuyển đổi phân hệ bên trong "Nguồn cung & danh mục" */}
      <div className="flex items-center gap-2 bg-white p-1.5 sm:p-2 rounded-2xl border border-[#EAECE8] shadow-xs w-fit">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('lots')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'lots'
                ? 'bg-[#10542C] text-white shadow-sm'
                : 'text-[#4B5563] hover:text-[#10542C] hover:bg-[#F4F6F0]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Lô Nông Sản Sàn Sỉ</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeSubTab === 'lots'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#EAF5E9] text-[#10542C]'
              }`}
            >
              {lotStats.totalLots || 50}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('categories')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-[#10542C] text-white shadow-sm'
                : 'text-[#4B5563] hover:text-[#10542C] hover:bg-[#F4F6F0]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Quản Lý Danh Mục</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeSubTab === 'categories'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#EAF5E9] text-[#10542C]'
              }`}
            >
              {categories.length || 4}
            </span>
          </button>
        </div>
      </div>

      {/* ======================= SUB-TAB 1: LÔ NÔNG SẢN VỤ MÙA ======================= */}
      {activeSubTab === 'lots' && (
        <div className="space-y-6">
          {/* Banner Riêng Biệt Cho Lô Nông Sản - Không có nút bên trong */}
          <div className="bg-gradient-to-r from-[#10542C] via-[#1B6D3D] to-[#0A4020] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
                <Package className="w-7 h-7 text-[#8BC34A]" /> Quản Lý Lô Nông Sản
              </h2>
              <p className="text-xs text-white/80 mt-1">
                Kiểm duyệt và quản lý các lô nông sản B2B xuất xứ nông trại, đạt chuẩn VietGAP và chuỗi lạnh.
              </p>
            </div>
          </div>
          {/* 4 Thẻ KPI Tóm Tắt */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-[#EAECE8] shadow-xs">
              <div className="flex items-center justify-between text-[#6B7280] mb-1.5">
                <span className="text-xs font-bold">Lô Mở Bán (OPEN)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <p className="font-heading font-black text-2xl text-[#10542C]">{lotStats.openLots || 0}</p>
              <span className="text-[11px] text-emerald-600 font-medium">Sẵn sàng xuất khẩu / giao sỉ</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#EAECE8] shadow-xs">
              <div className="flex items-center justify-between text-[#6B7280] mb-1.5">
                <span className="text-xs font-bold">Chờ Kiểm Định (QC)</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="font-heading font-black text-2xl text-amber-600">{lotStats.pendingLots || 0}</p>
              <span className="text-[11px] text-amber-600 font-medium">Đang chờ lấy mẫu kiểm nghiệm</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#EAECE8] shadow-xs">
              <div className="flex items-center justify-between text-[#6B7280] mb-1.5">
                <span className="text-xs font-bold">Tạm Khóa (Cảnh Báo BVTV)</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="font-heading font-black text-2xl text-rose-600">{lotStats.suspendedLots || 0}</p>
              <span className="text-[11px] text-rose-600 font-medium">Khiếu nại dư lượng thuốc BVTV</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#EAECE8] shadow-xs">
              <div className="flex items-center justify-between text-[#6B7280] mb-1.5">
                <span className="text-xs font-bold">Đã Bán Hết (SOLD OUT)</span>
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
              </div>
              <p className="font-heading font-black text-2xl text-[#2C3E2E]">{lotStats.soldOutLots || 0}</p>
              <span className="text-[11px] text-slate-500 font-medium">Hoàn tất hợp đồng thương lái</span>
            </div>
          </div>

          {/* Thanh Công Cụ: Tìm Kiếm, Lọc & Thao Tác */}
          <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Tìm theo Mã Lô, Mã PUC, Nông trại, Tên sản phẩm..."
                  value={searchKw}
                  onChange={(e) => setSearchKw(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setCurrentPage(0);
                      fetchLots();
                    }
                  }}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />
                <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {/* Lọc Trạng Thái */}
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full sm:w-44 bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] font-medium focus:outline-none focus:border-[#10542C]"
              >
                <option value="ALL">Mọi trạng thái</option>
                <option value="OPEN">🟢 Đang mở bán (OPEN)</option>
                <option value="PENDING_APPROVAL">🟡 Chờ kiểm định (PENDING)</option>
                <option value="SUSPENDED">🔴 Tạm khóa BVTV (SUSPENDED)</option>
                <option value="SOLD_OUT">⚪ Đã bán hết (SOLD OUT)</option>
                <option value="REJECTED">⛔ Bị từ chối (REJECTED)</option>
              </select>

              {/* Lọc Ngành Hàng */}
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full sm:w-44 bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] font-medium focus:outline-none focus:border-[#10542C]"
              >
                <option value="ALL">Mọi danh mục</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={getCategoryCode(cat)}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  fetchLots();
                  fetchStats();
                }}
                className="p-2 border border-[#EAECE8] rounded-xl hover:bg-[#F9F9F5] text-[#2C3E2E] cursor-pointer"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={openCreateLotModal}
                className="px-4 py-2 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-[#8BC34A]" /> Đăng Lô Mới
              </button>
            </div>
          </div>

          {/* Bảng Dữ Liệu Harvest Lots */}
          <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F5] text-[#2C3E2E] uppercase font-bold text-[11px] border-b border-[#EAECE8]">
                  <tr>
                    <th className="py-3.5 px-3">Mã Lô & Hạn FEFO</th>
                    <th className="py-3.5 px-3">Nông Sản & Vùng Trồng</th>
                    <th className="py-3.5 px-3">Sản Lượng (kg)</th>
                    <th className="py-3.5 px-3">Đơn Giá Sỉ & Bậc Thang</th>
                    <th className="py-3.5 px-3">Chuỗi Lạnh & Kho</th>
                    <th className="py-3.5 px-3">Trạng Thái</th>
                    <th className="py-3.5 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2ED]">
                  {loadingLots ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-[#6B7280]">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#10542C] mb-2" />
                        Đang tải danh sách lô nông sản...
                      </td>
                    </tr>
                  ) : lots.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-[#6B7280]">
                        Không tìm thấy lô nông sản nào khớp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    lots.map((lot) => {
                      const tierPrices = parseTierPricing(lot.tierPricingJson);
                      const percentLeft = lot.totalWeightKg > 0
                        ? Math.round((lot.availableWeightKg / lot.totalWeightKg) * 100)
                        : 0;

                      return (
                        <tr key={lot.id} className="hover:bg-[#F9F9F5]/70 transition-colors">
                          {/* Cột 1: Mã Lô & Hạn FEFO */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-mono font-black text-[#10542C] text-xs bg-[#EAF5E9] px-2 py-0.5 rounded-md border border-[#D0E8CE]">
                                {lot.lotCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(lot.lotCode)}
                                className="text-[#6B7280] hover:text-[#10542C] cursor-pointer"
                                title="Copy mã lô"
                              >
                                {copiedCode === lot.lotCode ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-[#6B7280]">
                              <Calendar className="w-3 h-3" /> Thu: {lot.harvestDate}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 mt-0.5">
                              <Clock className="w-3 h-3 text-amber-600" /> FEFO: {lot.expiryDate}
                            </div>
                          </td>

                          {/* Cột 2: Nông Sản & Vùng Trồng */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={lot.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80'}
                                alt={lot.productName}
                                className="w-11 h-11 rounded-xl object-cover border border-[#EAECE8] shrink-0 bg-[#F9F9F5]"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-[#2C3E2E] truncate max-w-[180px]">{lot.productName}</p>
                                <p className="text-[10px] text-[#6B7280] truncate max-w-[180px]">{lot.farmerName}</p>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  <span className="bg-emerald-50 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                    PUC: {lot.pucCode}
                                  </span>
                                  {lot.certification && (
                                    <span className="bg-blue-50 text-blue-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-blue-200">
                                      {lot.certification}
                                    </span>
                                  )}
                                  <span className="bg-amber-50 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-200">
                                    {getCategoryName(lot.category, lot.categoryId)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Cột 3: Sản Lượng */}
                          <td className="py-3.5 px-3">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-bold text-[#10542C]">
                                  {Number(lot.availableWeightKg).toLocaleString('vi-VN')} kg
                                </span>
                                <span className="text-[#6B7280] text-[10px]">
                                  / {Number(lot.totalWeightKg).toLocaleString('vi-VN')} kg
                                </span>
                              </div>
                              <div className="w-28 bg-[#EAECE8] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${percentLeft > 40 ? 'bg-[#4CAF50]' : percentLeft > 15 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                  style={{ width: `${Math.min(100, Math.max(0, percentLeft))}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-[#6B7280] block">Còn {percentLeft}% sản lượng</span>
                            </div>
                          </td>

                          {/* Cột 4: Đơn Giá Sỉ & Bậc Thang */}
                          <td className="py-3.5 px-3">
                            <p className="font-black text-[#10542C] text-xs">{formatVND(lot.basePricePerKg)} / kg</p>
                            {tierPrices.length > 0 && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="bg-[#F4F5F1] text-[#2C3E2E] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#EAECE8]">
                                  {tierPrices.length} bậc giá sỉ
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedLotDetail(lot)}
                                  className="text-[10px] text-[#10542C] hover:underline font-bold cursor-pointer"
                                >
                                  Chi tiết
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Cột 5: Chuỗi Lạnh & Kho */}
                          <td className="py-3.5 px-3">
                            <div className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-cyan-200">
                              <Thermometer className="w-3 h-3 text-cyan-600" />
                              {lot.reqTempMin}°C - {lot.reqTempMax}°C
                            </div>
                            <p className="text-[10px] text-[#6B7280] mt-1 truncate max-w-[150px]">
                              {lot.warehouseLocation || 'Kho tổng Trạm'}
                            </p>
                          </td>

                          {/* Cột 6: Trạng Thái */}
                          <td className="py-3.5 px-3">
                            {lot.status === 'OPEN' && (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Đang mở bán
                              </span>
                            )}
                            {lot.status === 'PENDING_APPROVAL' && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-200">
                                <Clock className="w-3 h-3" /> Chờ QC duyệt
                              </span>
                            )}
                            {lot.status === 'SUSPENDED' && (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-1 rounded-full border border-rose-200 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> Tạm khóa BVTV
                              </span>
                            )}
                            {lot.status === 'SOLD_OUT' && (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-full border border-slate-200">
                                <CheckCircle2 className="w-3 h-3" /> Đã bán hết
                              </span>
                            )}
                            {lot.status === 'REJECTED' && (
                              <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-bold px-2 py-1 rounded-full border border-red-200">
                                <XCircle className="w-3 h-3" /> Bị từ chối
                              </span>
                            )}
                          </td>

                          {/* Cột 7: Thao Tác Thẩm Định */}
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {lot.status === 'PENDING_APPROVAL' && (
                                <button
                                  type="button"
                                  onClick={() => openStatusModal(lot, 'OPEN')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                                  title="Phê duyệt mở bán sỉ"
                                >
                                  Duyệt
                                </button>
                              )}

                              {lot.status === 'OPEN' && (
                                <button
                                  type="button"
                                  onClick={() => openStatusModal(lot, 'SUSPENDED')}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                  title="Tạm khóa khiếu nại dư lượng BVTV"
                                >
                                  <Lock className="w-3 h-3" /> Khóa
                                </button>
                              )}

                              {lot.status === 'SUSPENDED' && (
                                <button
                                  type="button"
                                  onClick={() => openStatusModal(lot, 'OPEN')}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                  title="Mở khóa khôi phục mở bán"
                                >
                                  <Unlock className="w-3 h-3" /> Mở lại
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedLotDetail(lot)}
                                className="p-1.5 text-[#10542C] hover:bg-[#EAF5E9] rounded-lg transition-colors cursor-pointer"
                                title="Xem chi tiết thông số lô"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditLotModal(lot)}
                                className="p-1.5 text-[#6B7280] hover:bg-[#F9F9F5] rounded-lg transition-colors cursor-pointer"
                                title="Sửa thông tin lô"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteLot(lot.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa lô"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân Trang */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#EAECE8]">
                <p className="text-xs text-[#6B7280]">
                  Hiển thị {lots.length} trên tổng số <strong className="text-[#10542C]">{totalElements}</strong> lô nông sản
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#EAECE8] bg-white text-[#2C3E2E] hover:bg-[#F9F9F5] disabled:opacity-40 cursor-pointer"
                  >
                    Trang trước
                  </button>
                  <span className="text-xs px-2.5 py-1 font-bold bg-[#D7EED6] text-[#10542C] rounded-lg">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage + 1 >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#EAECE8] bg-white text-[#2C3E2E] hover:bg-[#F9F9F5] disabled:opacity-40 cursor-pointer"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= SUB-TAB 2: QUẢN LÝ DANH MỤC NGÀNH HÀNG ======================= */}
      {activeSubTab === 'categories' && (
        <div className="space-y-6">
          {/* Banner Riêng Biệt Cho Danh Mục - Không có nút bên trong */}
          <div className="bg-gradient-to-r from-[#10542C] via-[#1B6D3D] to-[#0A4020] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
                <Layers className="w-7 h-7 text-[#8BC34A]" /> Quản Lý Danh Mục
              </h2>
              <p className="text-xs text-white/80 mt-1">
                Phân loại ngành hàng nông sản sỉ sàn B2B, quản lý nhóm hàng và hình ảnh đại diện.
              </p>
            </div>
          </div>

          {/* Thanh Công Cụ: Tìm Kiếm, Lọc & Thao Tác (Tương tự thanh công cụ Lô hàng) */}
          <div className="bg-white rounded-3xl p-5 border border-[#EAECE8] shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
              {/* Ô Tìm Kiếm Danh Mục */}
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Tìm theo tên danh mục, mô tả ngành hàng..."
                  value={categorySearchKw}
                  onChange={(e) => setCategorySearchKw(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />
                <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {/* Lọc Tình Trạng Lô Hàng */}
              <select
                value={categoryFilterStock}
                onChange={(e) => setCategoryFilterStock(e.target.value as any)}
                className="w-full sm:w-44 bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] font-medium focus:outline-none focus:border-[#10542C]"
              >
                <option value="ALL">Mọi tình trạng</option>
                <option value="HAS_LOTS">Đang có lô hàng</option>
                <option value="EMPTY">Chưa có lô hàng</option>
              </select>

              {/* Sắp Xếp Danh Mục */}
              <select
                value={categorySortBy}
                onChange={(e) => setCategorySortBy(e.target.value as any)}
                className="w-full sm:w-44 bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] font-medium focus:outline-none focus:border-[#10542C]"
              >
                <option value="productCount">Số lô hàng nhiều nhất (Mặc định)</option>
                <option value="name_asc">Tên danh mục (A - Z)</option>
                <option value="name_desc">Tên danh mục (Z - A)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchCategoriesData()}
                className="p-2 border border-[#EAECE8] rounded-xl hover:bg-[#F9F9F5] text-[#2C3E2E] cursor-pointer"
                title="Làm mới danh mục"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={openCreateCategoryModal}
                className="px-4 py-2 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-[#8BC34A]" /> Thêm Danh Mục
              </button>
            </div>
          </div>

          {/* Lưới Danh Mục Ngành Hàng */}
          {loadingCategories ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#EAECE8] text-xs text-[#6B7280]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#10542C] mb-2" />
              Đang tải danh mục ngành hàng...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#EAECE8] text-xs text-[#6B7280] space-y-2">
              <Layers className="w-8 h-8 text-[#9CA3AF] mx-auto mb-1" />
              <p className="font-bold text-[#2C3E2E]">Không tìm thấy danh mục nào phù hợp</p>
              <p>Hãy thử tìm kiếm với từ khóa khác hoặc bấm làm mới.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredCategories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-[#EAECE8] shadow-xs overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all"
              >
                <div className="relative h-32 w-full bg-[#F9F9F5] overflow-hidden">
                  <img
                    src={cat.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80'}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 right-2 bg-[#10542C]/90 backdrop-blur-xs text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                    {cat.productCount ?? 0} lô hàng
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-heading font-black text-sm text-[#2C3E2E]">{cat.name}</h4>
                    <p className="text-xs text-[#6B7280] line-clamp-2 mt-1.5">
                      {cat.description || 'Chưa có mô tả cho nhóm ngành hàng này.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0F2ED]">
                    <button
                      type="button"
                      onClick={() => openEditCategoryModal(cat)}
                      className="px-2.5 py-1 text-xs font-bold text-[#10542C] bg-[#EAF5E9] hover:bg-[#D7EED6] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

      {/* ======================= MODAL: CHI TIẾT LÔ NÔNG SẢN ======================= */}
      {selectedLotDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setSelectedLotDetail(null)} />
          <div className="relative bg-white rounded-3xl max-w-2xl w-full z-10 border border-[#EAECE8] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Cố Định */}
            <div className="flex items-start justify-between gap-4 border-b border-[#F0F2ED] p-5 sm:p-6 shrink-0 bg-[#FDFDFB]">
              <div>
                <span className="text-[11px] font-mono font-black text-[#10542C] bg-[#EAF5E9] px-2.5 py-1 rounded-md border border-[#D0E8CE]">
                  {selectedLotDetail.lotCode}
                </span>
                <h3 className="font-heading font-black text-xl text-[#2C3E2E] mt-2">
                  {selectedLotDetail.productName}
                </h3>
                <p className="text-xs text-[#6B7280]">{selectedLotDetail.farmerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLotDetail(null)}
                className="text-[#6B7280] hover:text-[#2C3E2E] text-2xl cursor-pointer p-1 rounded-full hover:bg-slate-100 w-8 h-8 flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>

            {/* Thân Modal Cuộn Độc Lập */}
            <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-2xl overflow-hidden border border-[#EAECE8] bg-[#F9F9F5] h-52">
                  <img
                    src={selectedLotDetail.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80'}
                    alt={selectedLotDetail.productName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-3 bg-[#F9F9F5] p-4 rounded-2xl border border-[#EAECE8]">
                  <div>
                    <span className="text-[10px] text-[#6B7280] font-bold block">MÃ SỐ VÙNG TRỒNG (PUC)</span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">{selectedLotDetail.pucCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] font-bold block">DANH MỤC / NGÀNH HÀNG</span>
                    <span className="font-bold text-[#10542C]">
                      {getCategoryName(selectedLotDetail.category, selectedLotDetail.categoryId)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] font-bold block">TIÊU CHUẨN KIỂM ĐỊNH</span>
                    <span className="font-bold text-blue-700">{selectedLotDetail.certification || 'VietGAP'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] font-bold block">DẢI NHIỆT ĐỘ CHUỖI LẠNH</span>
                    <span className="font-bold text-cyan-800">
                      {selectedLotDetail.reqTempMin}°C đến {selectedLotDetail.reqTempMax}°C (Buồng lạnh bảo quản)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] font-bold block">VỊ TRÍ LƯU TRẠM / KHO</span>
                    <span className="font-bold text-[#2C3E2E]">{selectedLotDetail.warehouseLocation || 'Kho tổng'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] font-bold block">KHU VỰC VÙNG TRỒNG</span>
                    <span className="text-[#2C3E2E]">{selectedLotDetail.region || 'Tây Nguyên & Lâm Đồng'}</span>
                  </div>
                </div>
              </div>

              {/* Bảng Giá Sỉ Phân Tầng */}
              <div>
                <h4 className="font-bold text-xs text-[#2C3E2E] mb-2">Bảng Giá Sỉ Phân Tầng (Tier Pricing)</h4>
                <div className="border border-[#EAECE8] rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F9F9F5] text-[#2C3E2E] font-bold text-[11px] border-b border-[#EAECE8]">
                      <tr>
                        <th className="py-2.5 px-3">Mức khối lượng</th>
                        <th className="py-2.5 px-3">Đơn giá sỉ</th>
                        <th className="py-2.5 px-3 text-right">Chiết khấu sàn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F2ED]">
                      {parseTierPricing(selectedLotDetail.tierPricingJson).map((t, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-medium">≥ {t.minKg.toLocaleString('vi-VN')} kg</td>
                          <td className="py-2.5 px-3 font-black text-[#10542C]">{formatVND(t.price)} / kg</td>
                          <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                            {idx === 0 ? 'Giá chuẩn' : `Tiết kiệm ${Math.round((1 - t.price / selectedLotDetail.basePricePerKg) * 100)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Biên bản / Lý do tạm khóa */}
              {selectedLotDetail.rejectionReason && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
                  <strong className="flex items-center gap-1 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Lý do tạm khóa / Khiếu nại kiểm định:
                  </strong>
                  <p>{selectedLotDetail.rejectionReason}</p>
                </div>
              )}

              {selectedLotDetail.auditNote && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800">
                  <strong>Ghi chú thẩm định Admin:</strong> {selectedLotDetail.auditNote}
                </div>
              )}
            </div>

            {/* Footer Cố Định */}
            <div className="flex justify-end p-4 border-t border-[#F0F2ED] bg-[#FDFDFB] shrink-0">
              <button
                type="button"
                onClick={() => setSelectedLotDetail(null)}
                className="px-5 py-2.5 bg-[#10542C] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#0C3E20] transition-colors shadow-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: THAY ĐỔI TRẠNG THÁI (DUYỆT / TẠM KHÓA / TỪ CHỐI) ======================= */}
      {statusModalLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setStatusModalLot(null)} />
          <div className="relative bg-white rounded-3xl max-w-lg w-full z-10 border border-[#EAECE8] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Cố Định */}
            <div className="p-5 sm:p-6 border-b border-[#F0F2ED] shrink-0 bg-[#FDFDFB] flex items-center justify-between">
              <div>
                <h3 className="font-heading font-black text-lg text-[#10542C] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#8BC34A]" /> Thẩm Định Trạng Thái Lô Nông Sản
                </h3>
                <p className="text-xs text-[#6B7280] mt-1">
                  Lô hàng: <strong className="text-[#2C3E2E]">{statusModalLot.lotCode}</strong> ({statusModalLot.productName})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalLot(null)}
                className="text-[#6B7280] hover:text-[#2C3E2E] text-2xl cursor-pointer p-1 rounded-full hover:bg-slate-100 w-8 h-8 flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>

            {/* Thân Modal Cuộn Độc Lập */}
            <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Trạng thái mới</label>
                <select
                  value={newStatusValue}
                  onChange={(e) => setNewStatusValue(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-xs text-[#2C3E2E] font-bold focus:outline-none focus:border-[#10542C]"
                >
                  <option value="OPEN">🟢 Duyệt mở bán công khai (OPEN)</option>
                  <option value="SUSPENDED">🔴 Tạm khóa khẩn cấp (Khiếu nại dư lượng BVTV)</option>
                  <option value="REJECTED">⛔ Từ chối phê duyệt (REJECTED)</option>
                  <option value="PENDING_APPROVAL">🟡 Trả về chờ kiểm định (PENDING)</option>
                  <option value="SOLD_OUT">⚪ Chuyển trạng thái Đã bán hết (SOLD OUT)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Lý do / Biên bản kiểm định {newStatusValue === 'SUSPENDED' && <span className="text-rose-600">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Ghi rõ lý do tạm khóa hoặc từ chối (vd: Dư lượng thuốc BVTV vượt ngưỡng quy định, mẫu kiểm định số...)"
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl p-3 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Ghi chú thẩm định quản trị viên</label>
                <input
                  type="text"
                  value={statusAuditNote}
                  onChange={(e) => setStatusAuditNote(e.target.value)}
                  placeholder="Ghi chú nội bộ cho trạm kiểm định QC"
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />
              </div>
            </div>

            {/* Footer Cố Định */}
            <div className="p-4 border-t border-[#F0F2ED] bg-[#FDFDFB] shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => setStatusModalLot(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#EAECE8] text-xs font-bold hover:bg-[#F9F9F5] cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={isSubmittingStatus}
                className="flex-1 py-2.5 rounded-xl bg-[#10542C] text-white text-xs font-bold hover:bg-[#0C3E20] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                {isSubmittingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xác Nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: TẠO / SỬA LÔ NÔNG SẢN ======================= */}
      {isLotFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setIsLotFormOpen(false)} />
          <div className="relative bg-white rounded-3xl max-w-2xl w-full z-10 border border-[#EAECE8] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <form onSubmit={handleSaveLot} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
              {/* Header Cố Định */}
              <div className="p-5 sm:p-6 border-b border-[#F0F2ED] shrink-0 bg-[#FDFDFB] flex items-center justify-between">
                <h3 className="font-heading font-black text-xl text-[#10542C] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#8BC34A]" /> {editingLot ? 'Chỉnh Sửa Lô Nông Sản' : 'Đăng Lô Nông Sản Vụ Mùa'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsLotFormOpen(false)}
                  className="text-[#6B7280] hover:text-[#2C3E2E] text-2xl cursor-pointer p-1 rounded-full hover:bg-slate-100 w-8 h-8 flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Thân Form Cuộn Độc Lập */}
              <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Mã Lô (Để trống để tự sinh)</label>
                    <input
                      type="text"
                      placeholder="VD: LOT-LD-2026-009"
                      value={lotForm.lotCode}
                      onChange={(e) => setLotForm({ ...lotForm, lotCode: e.target.value })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#2C3E2E]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Tên Nông Sản *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Xà lách Romaine thủy canh"
                      value={lotForm.productName}
                      onChange={(e) => setLotForm({ ...lotForm, productName: e.target.value })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Nông trại / HTX sản xuất *</label>
                    <input
                      type="text"
                      required
                      value={lotForm.farmerName}
                      onChange={(e) => setLotForm({ ...lotForm, farmerName: e.target.value })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Mã Số Vùng Trồng (PUC Code) *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: VN-LDO-04-100"
                      value={lotForm.pucCode}
                      onChange={(e) => setLotForm({ ...lotForm, pucCode: e.target.value.toUpperCase() })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Danh mục / Ngành hàng *</label>
                    <select
                      value={
                        lotForm.categoryId ||
                        categories.find((c) => getCategoryCode(c) === lotForm.category)?.id ||
                        ''
                      }
                      onChange={(e) => {
                        const selectedId = Number(e.target.value);
                        const cat = categories.find((c) => c.id === selectedId);
                        if (cat) {
                          setLotForm({
                            ...lotForm,
                            categoryId: cat.id,
                            category: getCategoryCode(cat),
                          });
                        }
                      }}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] font-medium focus:outline-none focus:border-[#10542C]"
                    >
                      {categories.length === 0 ? (
                        <option value="">Đang tải danh mục...</option>
                      ) : (
                        categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Trạng thái lô hàng *</label>
                    <select
                      value={lotForm.status}
                      onChange={(e) => setLotForm({ ...lotForm, status: e.target.value })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-bold text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                    >
                      <option value="PENDING_APPROVAL">🟡 Chờ kiểm định (PENDING)</option>
                      <option value="OPEN">🟢 Đang mở bán (OPEN)</option>
                      <option value="SUSPENDED">🔴 Tạm khóa BVTV (SUSPENDED)</option>
                      <option value="SOLD_OUT">⚪ Đã bán hết (SOLD OUT)</option>
                      <option value="REJECTED">⛔ Bị từ chối (REJECTED)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Chứng nhận tiêu chuẩn</label>
                    <input
                      type="text"
                      placeholder="VD: VietGAP, GlobalGAP, Organic..."
                      value={lotForm.certification}
                      onChange={(e) => setLotForm({ ...lotForm, certification: e.target.value })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Khu vực vùng trồng</label>
                    <input
                      type="text"
                      placeholder="VD: Tây Nguyên & Lâm Đồng"
                      value={lotForm.region}
                      onChange={(e) => setLotForm({ ...lotForm, region: e.target.value })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Ngày thu hoạch *</label>
                    <input
                      type="date"
                      required
                      value={lotForm.harvestDate}
                      onChange={(e) => setLotForm({ ...lotForm, harvestDate: e.target.value })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Hạn sử dụng (FEFO) *</label>
                    <input
                      type="date"
                      required
                      value={lotForm.expiryDate}
                      onChange={(e) => setLotForm({ ...lotForm, expiryDate: e.target.value })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Tổng sản lượng (kg) *</label>
                    <input
                      type="number"
                      required
                      value={lotForm.totalWeightKg}
                      onChange={(e) => setLotForm({ ...lotForm, totalWeightKg: Number(e.target.value) })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Còn lại chào bán (kg)</label>
                    <input
                      type="number"
                      value={lotForm.availableWeightKg}
                      onChange={(e) => setLotForm({ ...lotForm, availableWeightKg: Number(e.target.value) })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Đơn giá cơ sở (đ/kg) *</label>
                    <input
                      type="number"
                      required
                      value={lotForm.basePricePerKg}
                      onChange={(e) => setLotForm({ ...lotForm, basePricePerKg: Number(e.target.value) })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                    />
                  </div>
                </div>

                {/* Dải nhiệt độ chuỗi lạnh */}
                <div className="grid grid-cols-2 gap-3 bg-cyan-50/50 p-3 rounded-2xl border border-cyan-100">
                  <div>
                    <label className="block font-bold mb-1 text-cyan-900">Nhiệt độ tối thiểu Tmin (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={lotForm.reqTempMin}
                      onChange={(e) => setLotForm({ ...lotForm, reqTempMin: Number(e.target.value) })}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-cyan-900">Nhiệt độ tối đa Tmax (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={lotForm.reqTempMax}
                      onChange={(e) => setLotForm({ ...lotForm, reqTempMax: Number(e.target.value) })}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                    />
                  </div>
                </div>

                {/* Bảng giá sỉ phân tầng (Tier Pricing) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold">Bảng Giá Sỉ Phân Tầng (Tier Pricing)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setLotForm({
                          ...lotForm,
                          tierPricing: [...lotForm.tierPricing, { minKg: 1000, price: lotForm.basePricePerKg }],
                        });
                      }}
                      className="text-[10px] font-bold text-[#10542C] hover:underline cursor-pointer"
                    >
                      + Thêm bậc giá
                    </button>
                  </div>
                  {lotForm.tierPricing.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] text-[#6B7280]">≥</span>
                      <input
                        type="number"
                        value={tier.minKg}
                        onChange={(e) => {
                          const newTiers = [...lotForm.tierPricing];
                          newTiers[idx].minKg = Number(e.target.value);
                          setLotForm({ ...lotForm, tierPricing: newTiers });
                        }}
                        className="w-28 bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 text-xs text-[#2C3E2E]"
                        placeholder="Số kg tối thiểu"
                      />
                      <span className="text-[11px] text-[#6B7280]">kg:</span>
                      <input
                        type="number"
                        value={tier.price}
                        onChange={(e) => {
                          const newTiers = [...lotForm.tierPricing];
                          newTiers[idx].price = Number(e.target.value);
                          setLotForm({ ...lotForm, tierPricing: newTiers });
                        }}
                        className="flex-1 bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 text-xs text-[#2C3E2E]"
                        placeholder="Đơn giá (đ)"
                      />
                      {lotForm.tierPricing.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setLotForm({
                              ...lotForm,
                              tierPricing: lotForm.tierPricing.filter((_, i) => i !== idx),
                            });
                          }}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer p-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Kho lưu / Buồng lạnh trạm</label>
                    <input
                      type="text"
                      value={lotForm.warehouseLocation}
                      onChange={(e) => setLotForm({ ...lotForm, warehouseLocation: e.target.value })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Link hình ảnh</label>
                    <input
                      type="text"
                      value={lotForm.imageUrl}
                      onChange={(e) => setLotForm({ ...lotForm, imageUrl: e.target.value })}
                      className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Cố Định Với Nút Thao Tác */}
              <div className="p-4 border-t border-[#F0F2ED] bg-[#FDFDFB] shrink-0 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsLotFormOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EAECE8] text-xs font-bold hover:bg-[#F9F9F5] cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLot}
                  className="flex-1 py-2.5 rounded-xl bg-[#10542C] text-white text-xs font-bold hover:bg-[#0C3E20] cursor-pointer shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmittingLot ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingLot ? 'Lưu Thay Đổi' : 'Đăng Lô Nông Sản')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: TẠO / SỬA CATEGORY ======================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setIsCategoryModalOpen(false)} />
          <div className="relative bg-white rounded-3xl max-w-lg w-full z-10 border border-[#EAECE8] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <form onSubmit={handleSaveCategory} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
              {/* Header Cố Định */}
              <div className="p-5 sm:p-6 border-b border-[#F0F2ED] shrink-0 bg-[#FDFDFB] flex items-center justify-between">
                <h3 className="font-heading font-black text-xl text-[#10542C] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#8BC34A]" /> {editingCategory ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Ngành Hàng'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="text-[#6B7280] hover:text-[#2C3E2E] text-2xl cursor-pointer p-1 rounded-full hover:bg-slate-100 w-8 h-8 flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Thân Form Cuộn Độc Lập */}
              <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-3 text-xs">
                <div>
                  <label className="block font-bold mb-1">Tên ngành hàng *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nông Sản Sấy Lạnh"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                  />
                </div>


                <div>
                  <label className="block font-bold mb-1">Mô tả ngành hàng</label>
                  <textarea
                    rows={2}
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Mô tả nhóm nông sản phục vụ tìm kiếm sỉ"
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl p-3 text-xs text-[#2C3E2E]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Ảnh đại diện danh mục</label>
                  <input
                    type="text"
                    value={categoryForm.imageUrl}
                    onChange={(e) => setCategoryForm({ ...categoryForm, imageUrl: e.target.value })}
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E]"
                  />
                </div>
              </div>

              {/* Footer Cố Định */}
              <div className="p-4 border-t border-[#F0F2ED] bg-[#FDFDFB] shrink-0 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EAECE8] text-xs font-bold hover:bg-[#F9F9F5] cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCategory}
                  className="flex-1 py-2.5 rounded-xl bg-[#10542C] text-white text-xs font-bold hover:bg-[#0C3E20] cursor-pointer shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmittingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingCategory ? 'Lưu Thay Đổi' : 'Tạo Danh Mục')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
