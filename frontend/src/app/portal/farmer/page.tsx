'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Sprout,
  MessageSquare,
  FileText,
  ShieldCheck,
  Scale,
  Receipt,
  Settings,
  Bot,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Thermometer,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Building2,
  User,
  Send,
  Printer,
  ChevronRight,
  ChevronDown,
  Calendar,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  ExternalLink,
  Sparkles,
  LogIn,
  Check,
  Truck,
  Upload,
  Image as ImageIcon,
  Lock,
  MapPin,
  HelpCircle,
  Info,
  Edit3,
  LogOut,
  Wallet,
  Eye,
} from 'lucide-react';

import {
  FarmerStats,
  FarmerProfile,
  HarvestLot,
  RfqItem,
  B2BContract,
  QcInspection,
  Settlement,
  AuthResponse,
} from '@/types';

import {
  VIETNAM_ADMINISTRATIVE_DATA,
  predictColdChainTemp,
  formatRealtimeTimestamp,
  validateFarmerProfile,
  ProfileValidationErrors,
  ColdChainRecommendation,
} from './utils/farmerHelpers';

import {
  getFarmerStatsApi,
  getFarmerProfileApi,
  updateFarmerProfileApi,
  getFarmerHarvestLotsApi,
  createHarvestLotApi,
  getFarmerRfqsApi,
  respondToRfqApi,
  getFarmerContractsApi,
  getContractQcApi,
  getFarmerSettlementsApi,
  settleContractApi,
  getPdf01TndnUrl,
  getInvoiceKctUrl,
  getContractPrintUrl,
  updateDeliveryScheduleApi,
  saveLocalContract,
  saveLocalRfqUpdate,
  FALLBACK_QC,
} from '@/services/farmerApi';

import { getStoredUser, loginApi, aiChatRagApi } from '@/services/api';
import FarmerDashboardView, { formatRfqTimestamp } from './components/FarmerDashboardView';
import FarmerAiChatView from './components/FarmerAiChatView';

export default function FarmerPortalPage() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'lots' | 'rfq' | 'qc' | 'settlements' | 'profile' | 'ai'
  >('dashboard');

  const [currentUser, setCurrentUser] = useState<AuthResponse | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FarmerStats | null>(null);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [lots, setLots] = useState<HarvestLot[]>([]);
  const [rfqs, setRfqs] = useState<RfqItem[]>([]);
  const [contracts, setContracts] = useState<B2BContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [selectedContractQc, setSelectedContractQc] = useState<QcInspection | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isQcDropdownOpen, setIsQcDropdownOpen] = useState(false);

  // Subtab in RFQ
  const [rfqSubTab, setRfqSubTab] = useState<'inbox' | 'contracts'>('inbox');

  // Modal State: Create Harvest Lot
  const [isLotModalOpen, setIsLotModalOpen] = useState(false);
  const [newLot, setNewLot] = useState({
    productName: '',
    categorySlug: 'rau-an-la',
    pucCode: 'VN-LDO-PUC-0849',
    harvestDate: '2026-10-28',
    expiryDate: '2026-11-12',
    totalQuantity: 5000,
    unit: 'kg',
    minTemp: 2.0,
    maxTemp: 6.0,
    hubLocation: 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
    imageUrl: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&auto=format&fit=crop&q=80',
    tier1Min: 500,
    tier1Price: 15000,
    tier2Min: 2000,
    tier2Price: 13500,
    tier3Min: 5000,
    tier3Price: 12000,
  });

  // Open Create Lot Modal with dynamic dates in event handler (không gọi Date.now trong render)
  const handleOpenLotModal = () => {
    const now = new Date();
    const hDate = new Date(now.getTime() + 2 * 86400000).toISOString().slice(0, 10);
    const eDate = new Date(now.getTime() + 16 * 86400000).toISOString().slice(0, 10);
    setNewLot((prev) => ({
      ...prev,
      harvestDate: prev.harvestDate || hDate,
      expiryDate: prev.expiryDate || eDate,
    }));
    setIsLotModalOpen(true);
  };

  // Modal State: Counter Offer
  const [counterModalRfq, setCounterModalRfq] = useState<RfqItem | null>(null);
  const [counterPrice, setCounterPrice] = useState<number>(14000);
  const [counterQty, setCounterQty] = useState<number>(3000);

  // Modal State: Reject Reason
  const [rejectModalRfq, setRejectModalRfq] = useState<RfqItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Không kịp tiến độ thu hoạch xe lạnh');

  // Modal State: View Tax 01/TNDN
  const [viewingTaxSettlementId, setViewingTaxSettlementId] = useState<number | null>(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    farmName: '',
    farmerType: 'COOPERATIVE' as 'COOPERATIVE' | 'HOUSEHOLD',
    pucCode: '',
    taxCode: '',
    idCardNumber: '',
    bankAccount: '',
    bankName: '',
    bankAccountName: '',
    farmAddress: '',
    cultivatedArea: '',
    certifications: '',
    certExpiryDate: '2027-12-31',
    certImageUrl: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=500&auto=format&fit=crop&q=80',
    contactPhone: '',
  });

  // REALTIME SYNCHRONIZATION FOR RFQS & NEGOTIATIONS
  // Khởi tạo null để tránh lỗi Next.js SSR Prerender 'unstable value new Date() in Client Component'
  const [realtimeTime, setRealtimeTime] = useState<Date | null>(null);
  const [isSyncingRfqs, setIsSyncingRfqs] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string>('');

  useEffect(() => {
    // Chỉ gán new Date() trên Client sau khi component đã mount
    setRealtimeTime(new Date());
    const timer = setInterval(() => {
      setRealtimeTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleSyncRfqs = async () => {
    setIsSyncingRfqs(true);
    try {
      const updatedRfqs = await getFarmerRfqsApi();
      setRfqs(updatedRfqs);
      const nowStr = new Date().toLocaleTimeString('vi-VN');
      setSyncNotice(`Đã đồng bộ RFQ thời gian thực lúc ${nowStr}`);
      setTimeout(() => setSyncNotice(''), 4000);
    } catch (e) {
      console.error('Lỗi sync RFQs:', e);
    } finally {
      setIsSyncingRfqs(false);
    }
  };

  // CREATE LOT: COLD-CHAIN AI & IMAGE UPLOAD & FORM VALIDATION
  const [lotImageTab, setLotImageTab] = useState<'url' | 'upload'>('url');
  const [aiTempAdvice, setAiTempAdvice] = useState<ColdChainRecommendation | null>(null);
  const [lotFormErrors, setLotFormErrors] = useState<Record<string, string>>({});

  const handleLotProductNameChange = (val: string) => {
    const advice = predictColdChainTemp(val);
    setAiTempAdvice(advice);
    setNewLot((prev) => ({
      ...prev,
      productName: val,
      minTemp: advice.minTemp,
      maxTemp: advice.maxTemp,
    }));
    if (lotFormErrors.productName) {
      setLotFormErrors((prev) => {
        const copy = { ...prev };
        delete copy.productName;
        return copy;
      });
    }
  };

  const handleApplyAiColdChain = () => {
    if (!newLot.productName) return;
    const advice = predictColdChainTemp(newLot.productName);
    setAiTempAdvice(advice);
    setNewLot((prev) => ({
      ...prev,
      minTemp: advice.minTemp,
      maxTemp: advice.maxTemp,
    }));
  };

  const handleLotFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh vượt quá giới hạn 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setNewLot((prev) => ({ ...prev, imageUrl: result }));
        if (lotFormErrors.imageUrl) {
          setLotFormErrors((prev) => {
            const copy = { ...prev };
            delete copy.imageUrl;
            return copy;
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLotForm = () => {
    const now = new Date();
    const hDate = new Date(now.getTime() + 2 * 86400000).toISOString().slice(0, 10);
    const eDate = new Date(now.getTime() + 16 * 86400000).toISOString().slice(0, 10);
    const activePuc = profile?.pucCode || profileForm.pucCode || 'VN-LDO-PUC-0849';
    setNewLot({
      productName: '',
      categorySlug: 'rau-an-la',
      pucCode: activePuc,
      harvestDate: hDate,
      expiryDate: eDate,
      totalQuantity: 1000,
      unit: 'kg',
      minTemp: 2.0,
      maxTemp: 6.0,
      hubLocation: 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
      imageUrl: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&auto=format&fit=crop&q=80',
      tier1Min: 200,
      tier1Price: 15000,
      tier2Min: 1000,
      tier2Price: 13500,
      tier3Min: 3000,
      tier3Price: 12000,
    });
    setAiTempAdvice(null);
    setLotFormErrors({});
  };

  // PROFILE MODULE: EDIT MODE, VALIDATION & CASCADING ADDRESS
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<ProfileValidationErrors>({});
  const [certImageTab, setCertImageTab] = useState<'url' | 'upload'>('url');
  const [selectedProvinceName, setSelectedProvinceName] = useState('Tỉnh Lâm Đồng');
  const [selectedDistrictName, setSelectedDistrictName] = useState('Thành phố Đà Lạt');
  const [selectedWardName, setSelectedWardName] = useState('Phường 8');
  const [hamletDetail, setHamletDetail] = useState('Tiểu khu 158');

  // Helper để đồng bộ địa chỉ hiện có vào 4 cấp dropdown
  const syncAddressFieldsFromFull = (addrStr: string) => {
    if (!addrStr) return;
    const prov = VIETNAM_ADMINISTRATIVE_DATA.find((p) =>
      addrStr.includes(p.name) || addrStr.includes(p.name.replace('Tỉnh ', '').replace('Thành phố ', ''))
    );
    if (prov) {
      setSelectedProvinceName(prov.name);
      const dist = prov.districts.find((d) =>
        addrStr.includes(d.name) || addrStr.includes(d.name.replace('Huyện ', '').replace('Thành phố ', '').replace('Thị xã ', ''))
      );
      if (dist) {
        setSelectedDistrictName(dist.name);
        const ward = dist.wards.find((w) =>
          addrStr.includes(w.name) || addrStr.includes(w.name.replace('Xã ', '').replace('Phường ', '').replace('Thị trấn ', ''))
        );
        if (ward) {
          setSelectedWardName(ward.name);
        }
      }
    }
    const parts = addrStr.split(',');
    if (parts.length > 0) {
      setHamletDetail(parts[0].trim());
    }
  };

  const handleProvinceSelect = (pName: string) => {
    setSelectedProvinceName(pName);
    const prov = VIETNAM_ADMINISTRATIVE_DATA.find((p) => p.name === pName);
    if (prov && prov.districts.length > 0) {
      const firstDist = prov.districts[0];
      setSelectedDistrictName(firstDist.name);
      if (firstDist.wards.length > 0) {
        const firstWard = firstDist.wards[0];
        setSelectedWardName(firstWard.name);
        const parts = [hamletDetail.trim(), firstWard.name, firstDist.name, pName].filter(Boolean);
        setProfileForm((prev) => ({ ...prev, farmAddress: parts.join(', ') }));
        return;
      }
    }
    const parts = [hamletDetail.trim(), pName].filter(Boolean);
    setProfileForm((prev) => ({ ...prev, farmAddress: parts.join(', ') }));
  };

  const handleDistrictSelect = (dName: string) => {
    setSelectedDistrictName(dName);
    const prov = VIETNAM_ADMINISTRATIVE_DATA.find((p) => p.name === selectedProvinceName);
    const dist = prov?.districts.find((d) => d.name === dName);
    if (dist && dist.wards.length > 0) {
      const firstWard = dist.wards[0];
      setSelectedWardName(firstWard.name);
      const parts = [hamletDetail.trim(), firstWard.name, dName, selectedProvinceName].filter(Boolean);
      setProfileForm((prev) => ({ ...prev, farmAddress: parts.join(', ') }));
    } else {
      const parts = [hamletDetail.trim(), dName, selectedProvinceName].filter(Boolean);
      setProfileForm((prev) => ({ ...prev, farmAddress: parts.join(', ') }));
    }
  };

  const handleWardSelect = (wName: string) => {
    setSelectedWardName(wName);
    const parts = [hamletDetail.trim(), wName, selectedDistrictName, selectedProvinceName].filter(Boolean);
    setProfileForm((prev) => ({ ...prev, farmAddress: parts.join(', ') }));
  };

  const handleHamletChange = (hText: string) => {
    setHamletDetail(hText);
    const parts = [hText.trim(), selectedWardName, selectedDistrictName, selectedProvinceName].filter(Boolean);
    setProfileForm((prev) => ({ ...prev, farmAddress: parts.join(', ') }));
  };

  const handleCertFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh chứng nhận tối đa là 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setProfileForm((prev) => ({ ...prev, certImageUrl: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const [isSettlingId, setIsSettlingId] = useState<number | null>(null);
  // Modal State: Lịch Giao Trạm Cross-docking Hub
  const [scheduleModalContract, setScheduleModalContract] = useState<B2BContract | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    hubDeliveryDate: '2026-10-29',
    hubName: 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
    timeSlot: '06:00 - 09:00 (Sáng sớm)',
    truckType: 'Xe tải lạnh chuyên dụng 2.5 Tấn',
    notes: 'Giữ nhiệt độ Pre-cooling 4.0°C khi chạy trên đường',
  });
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);

  const handleOpenScheduleModal = (c: B2BContract) => {
    setScheduleModalContract(c);
    setScheduleForm({
      hubDeliveryDate: c.hubDeliveryDate || '2026-10-29',
      hubName: c.hubName || 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
      timeSlot: c.deliveryTimeSlot || '06:00 - 09:00 (Sáng sớm)',
      truckType: c.truckType || 'Xe tải lạnh chuyên dụng 2.5 Tấn',
      notes: c.deliveryNotes || 'Giữ nhiệt độ Pre-cooling 4.0°C khi chạy trên đường',
    });
  };

  const handleSaveDeliverySchedule = async () => {
    if (!scheduleModalContract) return;
    setIsUpdatingSchedule(true);
    try {
      const updated = await updateDeliveryScheduleApi(scheduleModalContract.id, scheduleForm);
      setContracts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      alert('Đã cập nhật lịch bàn giao tại ' + scheduleForm.hubName + ' cho hợp đồng ' + scheduleModalContract.contractCode + '!');
      setScheduleModalContract(null);
    } catch {
      alert('Lỗi khi cập nhật lịch giao trạm');
    } finally {
      setIsUpdatingSchedule(false);
    }
  };

  const [taxDocType, setTaxDocType] = useState<'01_TNDN' | 'INVOICE_KCT'>('01_TNDN');

  const handleSettleContract = async (contractId: number) => {
    setIsSettlingId(contractId);
    try {
      const newStl = await settleContractApi(contractId);
      setSettlements((prev) => [newStl, ...prev.filter((s) => s.id !== newStl.id && s.settlementCode !== newStl.settlementCode)]);
      setContracts((prev) =>
        prev.map((c) => (c.id === contractId ? { ...c, fulfillmentStatus: 'COMPLETED' } : c))
      );
      const sRes = await getFarmerStatsApi();
      setStats(sRes);
      alert(`Đã quyết toán và giải ngân thành công ${formatVnd(newStl.payoutAmount)} về STK ${newStl.bankAccount} (${newStl.bankName})!`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi quyết toán hợp đồng');
    } finally {
      setIsSettlingId(null);
    }
  };



  // Load All Data
  const loadPortalData = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, lRes, rRes, cRes, stRes] = await Promise.all([
        getFarmerStatsApi(),
        getFarmerProfileApi(),
        getFarmerHarvestLotsApi(),
        getFarmerRfqsApi(),
        getFarmerContractsApi(),
        getFarmerSettlementsApi(),
      ]);

      setStats(sRes);
      setProfile(pRes);
      setLots(lRes);
      setRfqs(rRes);
      setContracts(cRes);
      setSettlements(stRes);

      if (pRes) {
        setProfileForm({
          farmName: pRes.farmName || '',
          farmerType: (pRes.farmerType as any) || 'COOPERATIVE',
          pucCode: pRes.pucCode || '',
          taxCode: pRes.taxCode || '',
          idCardNumber: pRes.idCardNumber || '',
          bankAccount: pRes.bankAccount || '',
          bankName: pRes.bankName || '',
          bankAccountName: pRes.bankAccountName || '',
          farmAddress: pRes.location || '',
          cultivatedArea: pRes.cultivatedArea || '',
          certifications: pRes.certifications || 'VietGAP, GlobalGAP, OCOP 4 Sao',
          certExpiryDate: pRes.certExpiryDate || '2027-12-31',
          certImageUrl: pRes.certImageUrl || 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=500&auto=format&fit=crop&q=80',
          contactPhone: pRes.phone || '',
        });
        syncAddressFieldsFromFull(pRes.location || '');
      }

      // Load contract QC
      if (cRes.length > 0) {
        const firstContract = cRes[0];
        setSelectedContractId(firstContract.id);
        const qc = await getContractQcApi(firstContract.id, firstContract);
        setSelectedContractQc(qc);
      } else {
        setSelectedContractQc(FALLBACK_QC);
      }
    } catch (err) {
      console.error('Error loading farmer portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUser(getStoredUser());
    loadPortalData();

    // Tự động đồng bộ ngay khi người mua gửi yêu cầu đàm phán RFQ từ Trang Chủ
    const handleRfqUpdate = (e?: Event) => {
      if (e instanceof StorageEvent) {
        if (!e.key || !e.key.startsWith('b2b_')) return;
      }
      loadPortalData();
    };
    window.addEventListener('b2b_rfq_updated', handleRfqUpdate);
    window.addEventListener('storage', handleRfqUpdate);
    return () => {
      window.removeEventListener('b2b_rfq_updated', handleRfqUpdate);
      window.removeEventListener('storage', handleRfqUpdate);
    };
  }, []);

  // Quick Login Action
  const handleQuickLoginFarmer = async () => {
    setIsLoggingIn(true);
    try {
      const user = await loginApi('farmer_dalat', 'farmer123', true);
      if ('token' in user || 'username' in user) {
        setCurrentUser(user as AuthResponse);
      }
      await loadPortalData();
      alert('Đăng nhập Nông dân thành công!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // KIỂM TRA QUYỀN TRUY CẬP: CHỈ TÀI KHOẢN FARMER / COOPERATIVE MỚI ĐƯỢC VÀO
  const isFarmer = Boolean(
    currentUser && (
      currentUser.roles?.some((r) =>
        ['ROLE_FARMER', 'FARMER', 'ROLE_COOPERATIVE', 'COOPERATIVE'].includes(r)
      ) ||
      currentUser.username === 'farmer_dalat'
    )
  );

  const handleLogoutFarmer = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  // Format Currency
  const formatVnd = (num?: number) => {
    if (num === undefined || num === null) return '0 đ';
    return num.toLocaleString('vi-VN') + ' đ';
  };

  // Handle Create Lot
  const handleCreateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ràng buộc & Validation chặt chẽ cho Lô Vụ Mùa
    const activePuc = profile?.pucCode || profileForm.pucCode || 'VN-LDO-PUC-0849';
    const errors: Record<string, string> = {};

    if (!newLot.productName || newLot.productName.trim().length < 2) {
      errors.productName = 'Vui lòng nhập tên nông sản rõ ràng (VD: Cà Chua Beef Đà Lạt).';
    }
    if (!newLot.imageUrl) {
      errors.imageUrl = 'Vui lòng cung cấp hình ảnh minh họa thực tế cho lô nông sản.';
    }
    if (newLot.totalQuantity < 100) {
      errors.totalQuantity = 'Sản lượng đăng bán tối thiểu cho sàn B2B là 100 kg.';
    }
    if (newLot.expiryDate <= newLot.harvestDate) {
      errors.expiryDate = 'Hạn bảo quản tươi (FEFO) phải sau ngày dự kiến thu hoạch!';
    }
    if (newLot.minTemp > newLot.maxTemp) {
      errors.temp = 'Nhiệt độ tối thiểu không được lớn hơn nhiệt độ tối đa!';
    }
    if (Number(newLot.tier1Min) >= Number(newLot.tier2Min) || Number(newLot.tier2Min) >= Number(newLot.tier3Min)) {
      errors.tierQty = 'Khối lượng mua sỉ bậc sau phải lớn hơn bậc trước (Bậc 1 < Bậc 2 < Bậc 3).';
    }
    if (Number(newLot.tier1Price) < Number(newLot.tier2Price) || Number(newLot.tier2Price) < Number(newLot.tier3Price)) {
      errors.tierPrice = 'Đơn giá sỉ mua số lượng lớn phải ưu đãi hơn hoặc bằng (Bậc 1 >= Bậc 2 >= Bậc 3).';
    }

    if (Object.keys(errors).length > 0) {
      setLotFormErrors(errors);
      alert('Vui lòng kiểm tra lại thông tin lô hàng chưa hợp lệ!');
      return;
    }
    setLotFormErrors({});

    try {
      const tierPricing = [
        { minKg: Number(newLot.tier1Min), pricePerKg: Number(newLot.tier1Price) },
        { minKg: Number(newLot.tier2Min), pricePerKg: Number(newLot.tier2Price) },
        { minKg: Number(newLot.tier3Min), pricePerKg: Number(newLot.tier3Price) },
      ];

      // MÃ SỐ VÙNG TRỒNG (PUC) ÁP CỨNG TỪ HỒ SƠ VÙNG TRỒNG ĐÃ XÁC THỰC
      const createdLot = await createHarvestLotApi({
        productName: newLot.productName.trim(),
        categorySlug: newLot.categorySlug,
        imageUrl: newLot.imageUrl,
        pucCode: activePuc,
        harvestDate: newLot.harvestDate,
        expiryDate: newLot.expiryDate,
        totalQuantity: Number(newLot.totalQuantity),
        unit: newLot.unit,
        minTemp: Number(newLot.minTemp),
        maxTemp: Number(newLot.maxTemp),
        hubLocation: newLot.hubLocation,
        tierPricingJson: JSON.stringify(tierPricing),
      });

      setLots((prev) => [createdLot, ...prev]);
      if (stats) {
        setStats({ ...stats, openLotsCount: stats.openLotsCount + 1 });
      }

      alert('Đăng bán Lô Vụ Mùa thành công! Mã PUC (' + activePuc + ') đã được bảo chứng xuất xứ.');
      setIsLotModalOpen(false);
      setActiveTab('lots');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi tạo lô hàng');
    }
  };

  // Handle RFQ Action
  const handleAcceptRfq = async (rfqId: number) => {
    if (
      !confirm(
        'Bạn có chắc chắn muốn CHẤP THUẬN đề xuất báo giá này? Hệ thống sẽ tự động khởi tạo Hợp Đồng B2B điện tử và yêu cầu Thương lái ký quỹ 30% Escrow.'
      )
    )
      return;
    try {
      await respondToRfqApi(rfqId, { action: 'ACCEPT' });

      const targetRfq = rfqs.find((r) => r.id === rfqId);
      setRfqs((prev) =>
        prev.map((r) => (r.id === rfqId ? { ...r, status: 'ACCEPTED' } : r))
      );

      if (targetRfq) {
        const newContract: B2BContract = {
          id: Date.now(),
          contractCode: `HD-2026-B2B-${Math.floor(100 + Math.random() * 900)}`,
          rfqId: targetRfq.id,
          rfqCode: targetRfq.rfqCode,
          harvestLotId: targetRfq.harvestLotId,
          lotCode: targetRfq.harvestLotCode,
          productName: targetRfq.productName,
          buyerName: targetRfq.buyerName,
          buyerPhone: targetRfq.buyerPhone,
          quantity: targetRfq.requestedQuantity,
          unitPrice: targetRfq.targetPrice,
          totalAmount: targetRfq.requestedQuantity * targetRfq.targetPrice,
          depositAmount: Math.round(targetRfq.requestedQuantity * targetRfq.targetPrice * 0.3),
          depositStatus: 'DEPOSIT_PAID',
          fulfillmentStatus: 'HUB_DELIVERED',
          hubName: 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng',
          hubDeliveryDate: targetRfq.deliveryDate,
          createdAt: new Date().toISOString(),
          hasQc: true,
        };

        const updatedContracts = [newContract, ...contracts];
        setContracts(updatedContracts);
        saveLocalContract(newContract);
        saveLocalRfqUpdate({
          id: targetRfq.id,
          rfqCode: targetRfq.rfqCode,
          status: 'ACCEPTED',
        });
        setSelectedContractId(newContract.id);
        const qc = await getContractQcApi(newContract.id, newContract);
        setSelectedContractQc(qc);

        setStats((prev) => ({
          totalRevenue: (prev?.totalRevenue || 51749500) + newContract.totalAmount,
          escrowHolding: (prev?.escrowHolding || 16500000) + newContract.depositAmount,
          openLotsCount: prev?.openLotsCount || lots.length,
          runningContractsCount: updatedContracts.length,
          pendingRfqCount: Math.max(0, (prev?.pendingRfqCount || rfqs.length) - 1),
        }));
      }

      alert('Đã chấp thuận đề xuất! Hợp đồng B2B đã được khởi tạo thành công.');
      setRfqSubTab('contracts');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi phản hồi RFQ');
    }
  };

  const handleCounterRfq = async () => {
    if (!counterModalRfq) return;
    try {
      await respondToRfqApi(counterModalRfq.id, {
        action: 'COUNTER',
        counterPrice: Number(counterPrice),
        counterQuantity: Number(counterQty),
      });

      saveLocalRfqUpdate({
        id: counterModalRfq.id,
        rfqCode: counterModalRfq.rfqCode,
        status: 'COUNTER_OFFER',
        counterPrice: Number(counterPrice),
        counterQuantity: Number(counterQty),
      });

      setRfqs((prev) =>
        prev.map((r) =>
          r.id === counterModalRfq.id
            ? { ...r, counterPrice: Number(counterPrice), counterQuantity: Number(counterQty) }
            : r
        )
      );

      alert('Đã gửi đề xuất thương lượng lại thành công cho Thương lái.');
      setCounterModalRfq(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi thương lượng RFQ');
    }
  };

  const handleRejectRfq = async () => {
    if (!rejectModalRfq) return;
    try {
      await respondToRfqApi(rejectModalRfq.id, {
        action: 'REJECT',
        rejectReason,
      });

      saveLocalRfqUpdate({
        id: rejectModalRfq.id,
        rfqCode: rejectModalRfq.rfqCode,
        status: 'REJECTED',
        rejectReason,
      });

      setRfqs((prev) =>
        prev.map((r) =>
          r.id === rejectModalRfq.id ? { ...r, status: 'REJECTED' } : r
        )
      );

      alert('Đã từ chối đề xuất chào mua.');
      setRejectModalRfq(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi từ chối RFQ');
    }
  };

  // Handle Save Profile
  const handleSaveProfile = async () => {
    const errors = validateFarmerProfile(profileForm);
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      alert('Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ (được đánh dấu đỏ)!');
      return;
    }
    setProfileErrors({});

    try {
      const updated = await updateFarmerProfileApi(profileForm);
      setProfile(updated);
      setIsEditingProfile(false);
      alert('Đã cập nhật hồ sơ vùng trồng PUC và tài khoản thụ hưởng thành công!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi lưu hồ sơ');
    }
  };

  // Handle Select Contract QC
  const handleSelectContractQc = async (contractId: number) => {
    setSelectedContractId(contractId);
    const contract = contracts.find((c) => c.id === contractId);
    const qc = await getContractQcApi(contractId, contract);
    setSelectedContractQc(qc);
  };

  const currentTaxSettlement =
    settlements.find((s) => s.id === viewingTaxSettlementId) || settlements[0];

  // =========================================================================
  // ROLE GUARD: NẾU CHƯA ĐĂNG NHẬP HOẶC KHÔNG PHẢI TÀI KHOẢN NÔNG DÂN
  // =========================================================================
  if (!isFarmer) {
    return (
      <div className="min-h-screen bg-[#F9F9F5] flex flex-col font-sans">
        {/* HEADER ĐƠN GIẢN */}
        <header className="bg-[#10542C] text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Sprout className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <span className="font-heading font-black text-lg text-white">
                HoNa Fresh <span className="text-emerald-400">B2B</span>
              </span>
              <p className="text-xs text-emerald-100/75">Cổng Quản Trị Vụ Mùa & Chuỗi Cung Ứng Lạnh Nông Dân</p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs bg-white text-[#10542C] hover:bg-emerald-50 font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <span>Về Sàn Chợ Sỉ</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </header>

        {/* NỘI DUNG THÔNG BÁO BẢO VỆ QUYỀN TRUY CẬP */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-[#EAECE8] shadow-xl p-6 sm:p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 text-[#10542C] flex items-center justify-center border-2 border-emerald-200 shadow-inner">
              <Lock className="w-10 h-10 text-emerald-700" />
            </div>

            <div className="space-y-2">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                Khu Vực Quản Trị Nông Dân
              </span>
              <h2 className="text-xl font-heading font-black text-gray-900">
                {!currentUser
                  ? 'Yêu Cầu Đăng Nhập Tài Khoản Nông Dân'
                  : 'Tài Khoản Không Có Quyền Truy Cập'}
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                {!currentUser
                  ? 'Cổng Nông Trại dành riêng cho Nhà Vườn & Hợp Tác Xã có mã số vùng trồng PUC để quản lý lô thu hoạch, đàm phán giá sỉ và giải ngân.'
                  : `Tài khoản hiện tại (${currentUser.fullName || currentUser.username}) có vai trò Khách Mua Hàng / Thương Lái, không có quyền quản lý vùng trồng.`}
              </p>
            </div>

            {/* HỘP HƯỚNG DẪN TÀI KHOẢN MẪU DEMO */}
            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-left text-xs space-y-1">
              <span className="font-bold text-[#10542C] block">Tài khoản Nông Dân (Mẫu trải nghiệm):</span>
              <div className="flex items-center justify-between text-gray-700 font-mono text-[11px]">
                <span>Tài khoản: <strong>farmer_dalat</strong></span>
                <span>Mật khẩu: <strong>farmer123</strong></span>
              </div>
              <span className="text-[10px] text-gray-500 block pt-0.5">
                * Có đầy đủ dữ liệu Lô vụ mùa, Báo giá RFQ, Hợp đồng bảo chứng và Hồ sơ PUC Đà Lạt.
              </span>
            </div>

            {/* CÁC NÚT HÀNH ĐỘNG */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleQuickLoginFarmer}
                disabled={isLoggingIn}
                className="w-full py-3 bg-[#10542C] hover:bg-emerald-800 text-white rounded-2xl font-heading font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sprout className="w-4 h-4 text-emerald-300" />
                )}
                <span>{isLoggingIn ? 'Đang Đăng Nhập...' : 'Đăng Nhập Nhanh Tài Khoản Nông Dân'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dang-nhap?redirect=/portal/farmer"
                  className="py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl transition text-center"
                >
                  Đăng Nhập Khác
                </Link>
                <Link
                  href="/"
                  className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition text-center"
                >
                  Về Trang Chủ
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className={`bg-[#F9F9F5] text-[#1E293B] flex flex-col font-sans ${
        activeTab === 'ai' ? 'h-screen overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* HEADER PORTAL */}
      <header className="shrink-0 sticky top-0 z-40 bg-[#10542C] text-white border-b border-[#0D4423] shadow-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Sprout className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-black tracking-wide text-lg sm:text-xl text-white">
                HoNa Fresh <span className="text-emerald-400">B2B</span>
              </span>
              <span className="text-[11px] bg-emerald-500/25 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30">
                FARMER PORTAL
              </span>
            </div>
            <p className="text-xs text-emerald-100/75">
              Cổng Quản Trị Vụ Mùa & Chuỗi Cung Ứng Lạnh Nông Dân
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl text-xs">
            <Building2 className="w-4 h-4 text-emerald-300" />
            <div>
              <p className="font-semibold text-white">
                {profile?.farmName || 'HTX Nông Nghiệp Đà Lạt GAP'}
              </p>
              <p className="text-[10px] text-emerald-200">
                Mã PUC: <strong className="font-mono">{profile?.pucCode || 'VN-LDO-PUC-0849'}</strong> •{' '}
                <span className="text-emerald-300">VietGAP 4 Sao</span>
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs bg-white text-[#10542C] hover:bg-emerald-50 font-bold px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
          >
            <span>Về Sàn Chợ Sỉ</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleLogoutFarmer}
            className="flex items-center gap-1.5 text-xs bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 hover:text-white font-bold px-3 py-2 rounded-xl border border-emerald-700/60 transition cursor-pointer"
            title="Đăng xuất tài khoản Nông dân"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đăng Xuất</span>
          </button>
        </div>
      </header>

      {/* BODY LAYOUT: SIDEBAR + MAIN CONTENT */}
      <div
        className={`flex-1 min-h-0 max-w-[1500px] w-full mx-auto px-4 sm:px-6 flex flex-col lg:flex-row gap-4 ${
          activeTab === 'ai' ? 'py-2.5' : 'py-5'
        }`}
      >
        {/* SIDEBAR NAVIGATION */}
        <aside
          className={`lg:w-64 shrink-0 bg-white rounded-3xl p-4 border border-[#EAECE8] shadow-2xs space-y-1.5 self-start ${
            activeTab === 'ai' ? 'max-h-full overflow-y-auto' : ''
          }`}
        >
          <div className="px-3 py-2 text-[11px] font-bold tracking-wider uppercase text-gray-600">
            Phân Hệ Nông Nghiệp
          </div>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#10542C] text-white shadow-xs'
                : 'text-gray-600 hover:bg-[#F2F4F0] hover:text-[#10542C]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Tổng Quan (Dashboard)</span>
          </button>

          <button
            onClick={() => setActiveTab('lots')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'lots'
                ? 'bg-[#10542C] text-white shadow-xs'
                : 'text-gray-600 hover:bg-[#F2F4F0] hover:text-[#10542C]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sprout className="w-4 h-4" />
              <span>Lô Vụ Mùa ({lots.length})</span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold">
              Tier Price
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rfq')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'rfq'
                ? 'bg-[#10542C] text-white shadow-xs'
                : 'text-gray-600 hover:bg-[#F2F4F0] hover:text-[#10542C]'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4" />
              <span>Đàm Phán RFQ ({rfqs.length})</span>
            </div>
            {rfqs.filter((r) => r.status === 'PENDING').length > 0 && (
              <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                Mới
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('qc')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'qc'
                ? 'bg-[#10542C] text-white shadow-xs'
                : 'text-gray-600 hover:bg-[#F2F4F0] hover:text-[#10542C]'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Biên Bản QC Trạm</span>
          </button>

          <button
            onClick={() => setActiveTab('settlements')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'settlements'
                ? 'bg-[#10542C] text-white shadow-xs'
                : 'text-gray-600 hover:bg-[#F2F4F0] hover:text-[#10542C]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Receipt className="w-4 h-4" />
              <span>Ví Tiền & Giải Ngân</span>
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-md">
              Mẫu 01
            </span>
          </button>

          <div className="pt-2 border-t border-[#EAECE8]">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-[#10542C] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F2F4F0] hover:text-[#10542C]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Hồ Sơ Vùng Trồng & STK</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition mt-1 cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-gradient-to-r from-emerald-600 to-[#10542C] text-white shadow-sm ring-1 ring-emerald-500/50'
                  : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bot
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'ai' ? 'text-white' : 'text-emerald-600'
                  }`}
                />
                <span className="truncate">Trợ Lý HoNa Fresh</span>
              </div>
              <Sparkles
                className={`w-3.5 h-3.5 shrink-0 ${
                  activeTab === 'ai' ? 'text-amber-300' : 'text-amber-500'
                }`}
              />
            </button>
          </div>

          {/* ESCROW GUARANTEE BADGE */}
          <div className="mt-4 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100/80 text-[11px] text-emerald-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Bảo Chứng Escrow 30%</span>
            </div>
            <p className="text-gray-600 leading-relaxed text-[10.5px]">
              Nông dân chỉ thu hoạch khi Thương lái đã ký quỹ 30% vào tài khoản Sàn giữ hộ. Xóa bỏ rủi ro bị bùng hàng.
            </p>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main
          className={`flex-1 ${
            activeTab === 'ai' ? 'h-full flex flex-col min-h-0' : 'space-y-6'
          }`}
        >
          {/* TAB 1: DASHBOARD (REDESIGNED BASED ON 8 CORE DESIGN RULES) */}
          {activeTab === 'dashboard' && (
            <FarmerDashboardView
              stats={stats}
              lots={lots}
              rfqs={rfqs}
              contracts={contracts}
              settlements={settlements}
              profile={profile}
              selectedContractQc={selectedContractQc}
              setActiveTab={setActiveTab}
              handleOpenLotModal={handleOpenLotModal}
              handleAcceptRfq={handleAcceptRfq}
              setCounterModalRfq={setCounterModalRfq}
              setCounterPrice={setCounterPrice}
              setCounterQty={setCounterQty}
              formatVnd={formatVnd}
            />
          )}

          {/* TAB 2: HARVEST LOTS */}
          {activeTab === 'lots' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-heading font-black text-[#10542C]">
                    Quản Lý Lô Nông Sản Vụ Mùa (Harvest Lots)
                  </h2>
                  <p className="text-xs text-gray-600">
                    Chào bán sỉ theo sản lượng lớn kèm bảng giá phân tầng Tier Pricing và dải nhiệt độ bảo quản lạnh FEFO
                  </p>
                </div>
                <button
                  onClick={handleOpenLotModal}
                  className="bg-[#10542C] hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Đăng Lô Thu Hoạch Mới</span>
                </button>
              </div>

              {/* LOTS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {lots.map((lot) => (
                  <div
                    key={lot.id}
                    className="bg-white rounded-3xl border border-[#EAECE8] shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div>
                      <div className="relative h-44 w-full bg-gray-100">
                        <img
                          src={lot.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600'}
                          alt={lot.productName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-3 left-3 bg-[#10542C]/90 backdrop-blur-xs text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg">
                          {lot.lotCode}
                        </div>
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-[#10542C] text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                          <Thermometer className="w-3.5 h-3.5 text-blue-600" />
                          <span>{lot.minTemp}°C - {lot.maxTemp}°C</span>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                            PUC: {lot.pucCode}
                          </span>
                          <h4 className="font-heading font-bold text-sm text-gray-900 mt-1 line-clamp-1">
                            {lot.productName}
                          </h4>
                        </div>

                        {/* Harvest & Expiry Dates */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50 p-2.5 rounded-xl text-gray-600">
                          <div>
                            <span className="text-gray-500">Thu hoạch:</span>
                            <p className="font-bold text-gray-800">{lot.harvestDate}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Hạn bảo quản:</span>
                            <p className="font-bold text-gray-800">{lot.expiryDate}</p>
                          </div>
                        </div>

                        {/* Quantity */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 font-medium">Sản lượng cung ứng:</span>
                          <span className="font-bold text-[#10542C]">
                            {(lot.remainingQuantity ?? lot.availableWeightKg ?? 0).toLocaleString()} / {(lot.totalQuantity ?? lot.totalWeightKg ?? 0).toLocaleString()} {lot.unit || 'kg'}
                          </span>
                        </div>

                        {/* Hub */}
                        <p className="text-[11px] text-gray-600 truncate">
                          📍 {lot.hubLocation || 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng'}
                        </p>

                        {/* Tier Pricing Matrix */}
                        <div className="space-y-1.5 pt-2 border-t border-gray-100">
                          <p className="text-[11px] font-bold text-gray-700">Bảng giá sỉ phân tầng (Tier Pricing):</p>
                          <div className="space-y-1">
                            {(lot.tierPricing || []).map((tp, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-[11px] bg-emerald-50/50 px-2 py-1 rounded-lg text-emerald-950 font-medium"
                              >
                                <span>Mua từ {tp.minKg.toLocaleString()} kg:</span>
                                <strong className="text-[#10542C] font-bold">
                                  {formatVnd(tp.pricePerKg)}/kg
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <button
                        onClick={() => {
                          alert(`Lô nông sản ${lot.lotCode} đã được đồng bộ công khai lên danh sách chào sỉ B2B toàn quốc.`);
                        }}
                        className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-[#10542C] font-bold text-xs rounded-xl border border-emerald-200 transition cursor-pointer"
                      >
                        ✓ Đang Mở Bán Sỉ Trên Sàn
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RFQ NEGOTIATION & B2B CONTRACTS */}
          {activeTab === 'rfq' && (
            <div className="space-y-5">
              {/* SUBTABS */}
              <div className="flex items-center gap-2 border-b border-[#EAECE8] pb-3">
                <button
                  onClick={() => setRfqSubTab('inbox')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    rfqSubTab === 'inbox'
                      ? 'bg-[#10542C] text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Hộp Thư Báo Giá RFQ ({rfqs.length})</span>
                </button>
                <button
                  onClick={() => setRfqSubTab('contracts')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    rfqSubTab === 'contracts'
                      ? 'bg-[#10542C] text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Hợp Đồng B2B Đã Ký ({contracts.length})</span>
                </button>
              </div>

              {/* SUBTAB 1: RFQ INBOX */}
              {rfqSubTab === 'inbox' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-black text-sm text-[#10542C]">Hộp Thư Đàm Phán Báo Giá Sỉ (RFQ)</h3>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          Trực Tuyến Thời Gian Thực
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Hệ thống tự động đồng bộ đề xuất giá sỉ từ các thương lái, siêu thị và chuỗi bán lẻ toàn quốc
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {syncNotice && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg animate-fade-in">
                          {syncNotice}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleSyncRfqs}
                        disabled={isSyncingRfqs}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#10542C] border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRfqs ? 'animate-spin text-emerald-600' : ''}`} />
                        <span>{isSyncingRfqs ? 'Đang Đồng Bộ...' : 'Đồng Bộ Thời Gian Thực'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {rfqs.map((rfq) => (
                      <div
                        key={rfq.id}
                        className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-2xs hover:border-emerald-200 transition space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-bold bg-[#10542C] text-white px-2.5 py-1 rounded-lg">
                              {rfq.rfqCode}
                            </span>
                            <div>
                              <h4 className="font-heading font-bold text-sm text-gray-900">
                                {rfq.buyerCompany || rfq.buyerName}
                              </h4>
                              <p className="text-[11px] text-gray-600">
                                Người liên hệ: {rfq.buyerName} • SĐT: {rfq.buyerPhone}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-xl self-start sm:self-auto ${
                              rfq.status === 'ACCEPTED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rfq.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {rfq.status === 'ACCEPTED'
                              ? '✓ ĐÃ CHẤP THUẬN (HỢP ĐỒNG KHỞI TẠO)'
                              : rfq.status === 'PENDING'
                              ? 'ĐANG CHỜ BÀ CON PHẢN HỒI'
                              : rfq.status}
                          </span>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/70 p-3.5 rounded-2xl text-xs">
                          <div>
                            <span className="text-gray-500">Lô nông sản:</span>
                            <p className="font-bold text-gray-900">{rfq.productName}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Khối lượng đề xuất:</span>
                            <p className="font-bold text-emerald-800">
                              {rfq.requestedQuantity.toLocaleString()} kg
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Mức giá đề xuất:</span>
                            <p className="font-bold text-[#10542C]">
                              {formatVnd(rfq.targetPrice)} / kg
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Ngày hẹn nhận hàng:</span>
                            <p className="font-bold text-gray-900">{rfq.deliveryDate}</p>
                          </div>
                        </div>

                        {/* THỜI GIAN HÌNH THÀNH ĐÀM PHÁN THỜI GIAN THỰC & TIẾN ĐỘ */}
                        {(() => {
                          const rfqTime = formatRealtimeTimestamp(rfq.createdAt, realtimeTime);
                          return (
                            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-gray-100 text-xs text-gray-500">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                <span>
                                  Thời gian nhận đề xuất:{' '}
                                  <strong className="text-gray-900 font-mono">
                                    {rfqTime.full}
                                  </strong>{' '}
                                  {rfqTime.isRecent ? (
                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                      {rfqTime.relative}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 font-semibold">
                                      ({rfqTime.relative})
                                    </span>
                                  )}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                <Calendar className="w-3 h-3 text-amber-600" />
                                <span>Hạn chốt đàm phán: 18:00 ngày {rfq.deliveryDate}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Counter offer info if any */}
                        {rfq.counterPrice && (
                          <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-200">
                            <strong>Đề xuất thương lượng lại:</strong> {formatVnd(rfq.counterPrice)}/kg cho {rfq.counterQuantity?.toLocaleString()} kg.
                          </div>
                        )}

                        {/* Actions */}
                        {rfq.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                            <button
                              onClick={() => setRejectModalRfq(rfq)}
                              className="px-3.5 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                              Từ Chối
                            </button>
                            <button
                              onClick={() => {
                                setCounterModalRfq(rfq);
                                setCounterPrice(rfq.targetPrice);
                                setCounterQty(rfq.requestedQuantity);
                              }}
                              className="px-4 py-2 border border-[#10542C] text-[#10542C] hover:bg-emerald-50 text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                              Thương Lượng Lại
                            </button>
                            <button
                              onClick={() => handleAcceptRfq(rfq.id)}
                              className="px-5 py-2 bg-[#10542C] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Chấp Thuận & Ký HĐ</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUBTAB 2: B2B CONTRACTS */}
              {rfqSubTab === 'contracts' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {contracts.map((c) => (
                      <div
                        key={c.id}
                        className="bg-white p-5 rounded-3xl border border-[#EAECE8] shadow-2xs space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-[#10542C] text-white px-2.5 py-1 rounded-lg">
                              {c.contractCode}
                            </span>
                            <span className="font-bold text-sm text-gray-800">{c.productName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Đã Cọc 30% Escrow ({formatVnd(c.depositAmount)})
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-lg">
                              {c.fulfillmentStatus}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50/70 p-3.5 rounded-2xl">
                          <div>
                            <span className="text-gray-500">Thương lái mua:</span>
                            <p className="font-bold text-gray-900">{c.buyerName}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Sản lượng hợp đồng:</span>
                            <p className="font-bold text-gray-900">{c.quantity.toLocaleString()} kg</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Đơn giá chốt:</span>
                            <p className="font-bold text-[#10542C]">{formatVnd(c.unitPrice)}/kg</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Tổng giá trị hợp đồng:</span>
                            <p className="font-bold text-emerald-800">{formatVnd(c.totalAmount)}</p>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
                          <div className="text-gray-600 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-[#10542C]" />
                              <span>Trạm trung chuyển: <strong className="text-gray-800">{c.hubName || 'Trạm Cross-docking Đức Trọng'}</strong></span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                              <span>Hẹn giao: <strong className="text-[#10542C]">{c.hubDeliveryDate}</strong></span>
                              <span>•</span>
                              <span>Khung giờ: <strong>{c.deliveryTimeSlot || '06:00 - 09:00 (Sáng sớm)'}</strong></span>
                              {c.truckType && (
                                <>
                                  <span>•</span>
                                  <span>Xe: {c.truckType}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenScheduleModal(c)}
                              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold flex items-center gap-1.5 text-xs transition cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5 text-[#10542C]" />
                              <span>Lịch Giao Trạm</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleSelectContractQc(c.id);
                                setActiveTab('qc');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#10542C] font-bold flex items-center gap-1 text-xs transition cursor-pointer"
                            >
                              <span>Biên Bản QC</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>

                            <a
                              href={getContractPrintUrl(c.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center gap-1 text-xs transition cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>In HĐ B2B</span>
                            </a>

                            {c.fulfillmentStatus !== 'COMPLETED' && (
                              <button
                                type="button"
                                onClick={() => handleSettleContract(c.id)}
                                disabled={isSettlingId === c.id}
                                className="px-3.5 py-1.5 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {isSettlingId === c.id ? 'Đang giải ngân...' : '⚡ Quyết Toán Ngay'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QC INSPECTIONS AT CROSS-DOCKING HUB */}
          {activeTab === 'qc' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-heading font-black text-[#10542C]">
                    Biên Bản Kiểm Định Chất Lượng Tại Trạm Lạnh (Hub QC)
                  </h2>
                  <p className="text-xs text-gray-600">
                    Thông số đo đạc khách quan tại bàn cân trạm trung chuyển trước khi đóng xe lạnh giao cho thương lái
                  </p>
                </div>

                {/* Custom Elegant Contract Dropdown */}
                {contracts.length > 0 && (
                  <div className="relative">
                    <div className="flex items-center gap-2.5 text-xs">
                      <span className="font-bold text-gray-700 shrink-0">Chọn Hợp Đồng:</span>
                      <button
                        type="button"
                        onClick={() => setIsQcDropdownOpen((prev) => !prev)}
                        className="px-4 py-2.5 bg-white hover:bg-emerald-50/50 border border-emerald-300 rounded-2xl text-xs font-bold text-[#10542C] shadow-2xs hover:shadow-xs flex items-center justify-between gap-3 transition cursor-pointer min-w-[280px] sm:min-w-[360px]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[11px] bg-[#10542C] text-white px-2 py-0.5 rounded-md shrink-0">
                            {contracts.find((c) => c.id === (selectedContractId || contracts[0]?.id))?.contractCode || 'Chọn HĐ'}
                          </span>
                          <span className="text-gray-800 font-bold truncate">
                            {contracts.find((c) => c.id === (selectedContractId || contracts[0]?.id))?.productName}
                          </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-[#10542C] shrink-0 transition-transform duration-200 ${isQcDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Dropdown Menu Panel */}
                    {isQcDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsQcDropdownOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 z-50 w-full sm:w-[420px] bg-white rounded-2xl border border-emerald-200 shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-semibold">
                            <span>Danh sách Hợp đồng B2B có Biên bản QC</span>
                            <span className="text-emerald-700 font-bold">{contracts.length} HĐ</span>
                          </div>
                          <div className="max-h-64 overflow-y-auto space-y-1">
                            {contracts.map((c) => {
                              const isSelected = c.id === (selectedContractId || contracts[0]?.id);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    handleSelectContractQc(c.id);
                                    setIsQcDropdownOpen(false);
                                  }}
                                  className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-50 border border-emerald-300 text-[#10542C]'
                                      : 'hover:bg-gray-50 border border-transparent text-gray-700'
                                  }`}
                                >
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                        isSelected ? 'bg-[#10542C] text-white' : 'bg-gray-200 text-gray-800'
                                      }`}>
                                        {c.contractCode}
                                      </span>
                                      <span className="font-bold text-xs truncate text-gray-900">
                                        {c.productName}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500">
                                      SL: <strong>{c.quantity.toLocaleString()} kg</strong> • {c.hubName.replace('Trạm Lạnh Cross-docking ', 'Trạm ')}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-[#10542C] shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {selectedContractQc ? (
                <div className="bg-white rounded-3xl border border-[#EAECE8] shadow-2xs p-6 space-y-6">
                  {/* Top info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div>
                      <span className="text-[11px] font-mono font-bold bg-[#10542C] text-white px-2.5 py-1 rounded-md">
                        HĐ: {selectedContractQc.contractCode}
                      </span>
                      <h3 className="font-heading font-bold text-base text-gray-900 mt-2">
                        {selectedContractQc.productName}
                      </h3>
                      <p className="text-xs text-gray-600">
                        Chuyên viên kiểm định: <strong>{selectedContractQc.inspectorName}</strong> • Thời gian: {selectedContractQc.inspectedAt.replace('T', ' ').slice(0, 16)}
                      </p>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl text-center self-start sm:self-auto">
                      <span className="text-[11px] text-emerald-800 font-semibold">Tỷ Lệ Đạt Chuẩn Kho Lạnh</span>
                      <h4 className="text-2xl font-black font-heading text-emerald-700">
                        {selectedContractQc.qualifiedPercent}%
                      </h4>
                    </div>
                  </div>

                  {/* 3 WEIGHT METRICS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center">
                      <p className="text-xs text-gray-600 font-medium">Khối Lượng Bàn Cân Thực Nhận</p>
                      <h4 className="text-xl font-black font-heading text-gray-900 mt-1">
                        {selectedContractQc.grossWeight.toLocaleString()} kg
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">Xe tải giao tại trạm</p>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                      <p className="text-xs text-emerald-800 font-medium">Khối Lượng Đạt Chuẩn Lưu Kho</p>
                      <h4 className="text-xl font-black font-heading text-[#10542C] mt-1">
                        {selectedContractQc.netQualifiedWeight.toLocaleString()} kg
                      </h4>
                      <p className="text-[11px] text-emerald-700 mt-0.5">Tính tiền quyết toán</p>
                    </div>

                    <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-center">
                      <p className="text-xs text-red-800 font-medium">Phế Phẩm Bị Loại Bỏ</p>
                      <h4 className="text-xl font-black font-heading text-red-600 mt-1">
                        {selectedContractQc.rejectedWeight.toLocaleString()} kg
                      </h4>
                      <p className="text-[11px] text-red-600 mt-0.5">Dập cuống, tách tại chỗ</p>
                    </div>
                  </div>

                  {/* BRIX & MOISTURE GAUGES */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700">Độ Ngọt Brix (°Bx)</span>
                        <span className="text-base font-black font-heading text-amber-600">
                          {selectedContractQc.brixScore} °Bx
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(selectedContractQc.brixScore / 15) * 100}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-600">
                        Chuẩn xuất khẩu từ 11.5°Bx trở lên • Đạt tiêu chuẩn phân phối hệ thống siêu thị
                      </p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-blue-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700">Độ Ẩm Tự Nhiên (%)</span>
                        <span className="text-base font-black font-heading text-blue-600">
                          {selectedContractQc.moisturePercent}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${selectedContractQc.moisturePercent}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-600">
                        Ngưỡng an toàn buồng lạnh từ 80% đến 88% • Rau củ mọng nước, không bị héo
                      </p>
                    </div>
                  </div>

                  {/* QC NOTES */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5 text-xs">
                    <p className="font-bold text-gray-800">Ghi chú cảm quan từ chuyên viên QC:</p>
                    <p className="text-gray-700 leading-relaxed italic">
                      &quot;{selectedContractQc.qcNotes}&quot;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-white rounded-3xl border border-gray-200">
                  <p className="text-xs text-gray-600">Chưa có biên bản kiểm định nào</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VÍ TIỀN & QUYẾT TOÁN GIẢI NGÂN (SETTLEMENTS & ESCROW) */}
          {activeTab === 'settlements' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-heading font-black text-[#10542C] flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#4CAF50]" />
                    <span>Ví Tiền & Quyết Toán Doanh Thu Nông Vụ (Escrow & Settlements)</span>
                  </h2>
                  <p className="text-xs text-gray-600">
                    Bảo chứng cọc 30% Escrow, khấu trừ phí sàn 3% minh bạch và phát hành chứng từ thuế hợp pháp
                  </p>
                </div>
              </div>

              {/* 3 Thẻ KPI Ví Tiền Nông Dân */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-[#10542C] to-[#1B743F] text-white p-5 rounded-3xl shadow-md space-y-2">
                  <div className="flex items-center justify-between text-emerald-200 text-xs font-semibold">
                    <span>Tổng Thu Nhập Thực Nhận (Đã về STK)</span>
                    <DollarSign className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div className="font-heading text-2xl font-black">
                    {formatVnd(
                      settlements.reduce((sum, s) => sum + (Number(s.payoutAmount) || 0), 0) ||
                        stats?.totalRevenue ||
                        39023100
                    )}
                  </div>
                  <div className="text-[11px] text-emerald-100 flex items-center gap-1.5 pt-1 border-t border-emerald-600/50">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Đã giải ngân thẳng vào tài khoản ngân hàng</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#D7EED6] shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
                    <span>Quỹ Bảo Chứng Escrow (Cọc 30% Đang Giữ)</span>
                    <ShieldCheck className="w-4 h-4 text-[#4CAF50]" />
                  </div>
                  <div className="font-heading text-2xl font-black text-[#10542C]">
                    {formatVnd(
                      contracts
                        .filter((c) => c.depositStatus === 'DEPOSIT_PAID' && c.fulfillmentStatus !== 'COMPLETED')
                        .reduce((sum, c) => sum + (Number(c.depositAmount) || 0), 0) ||
                        stats?.escrowHolding ||
                        12150000
                    )}
                  </div>
                  <div className="text-[11px] text-[#4CAF50] font-medium flex items-center gap-1.5 pt-1 border-t border-gray-100">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Sàn bảo chứng an toàn, không lo bị bùng hàng</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
                    <span>Doanh Thu Chờ Quyết Toán</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="font-heading text-2xl font-black text-amber-600">
                    {formatVnd(
                      contracts
                        .filter((c) => c.depositStatus === 'DEPOSIT_PAID' && c.fulfillmentStatus !== 'COMPLETED')
                        .reduce((sum, c) => sum + (Number(c.totalAmount) * 0.97 || 0), 0) || 0
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-1 border-t border-gray-100">
                    <span>Giải ngân ngay sau khi nghiệm thu QC xuất trạm</span>
                  </div>
                </div>
              </div>

              {/* Hợp đồng đang thực hiện có thể Quyết toán ngay */}
              {contracts.filter((c) => c.fulfillmentStatus !== 'COMPLETED').length > 0 && (
                <div className="bg-[#F9F9F5] rounded-3xl border border-[#D7EED6] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-black text-sm text-[#10542C] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Hợp Đồng Đã Có Cọc 30% - Sẵn Sàng Quyết Toán & Giải Ngân</span>
                    </h3>
                    <span className="text-[11px] text-gray-600">
                      Giao hàng xong tại trạm → Bấm quyết toán để tiền chuyển thẳng vào STK
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {contracts
                      .filter((c) => c.fulfillmentStatus !== 'COMPLETED')
                      .map((c) => (
                        <div
                          key={c.id}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[#10542C] bg-[#10542C]/10 px-2 py-0.5 rounded-md">
                                {c.contractCode}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                ✓ ĐÃ NHẬN CỌC 30%
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-gray-900 pt-1">{c.productName}</h4>
                            <p className="text-[11px] text-gray-600">
                              Thương lái: <strong>{c.buyerName}</strong> • SĐT: {c.buyerPhone}
                            </p>
                            <div className="flex items-center justify-between pt-1">
                              <span>Sản lượng: <strong>{c.quantity.toLocaleString()} kg</strong></span>
                              <span>Tổng tiền: <strong>{formatVnd(c.totalAmount)}</strong></span>
                            </div>
                            <div className="flex items-center justify-between text-emerald-800 bg-emerald-50/60 p-1.5 rounded-lg font-medium text-[11px]">
                              <span>Tiền cọc Sàn đang giữ (30%):</span>
                              <strong className="text-emerald-900 font-bold">{formatVnd(c.depositAmount)}</strong>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isSettlingId === c.id}
                            onClick={() => handleSettleContract(c.id)}
                            className="w-full py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white font-heading font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#8BC34A]" />
                            <span>
                              {isSettlingId === c.id
                                ? 'Đang giải ngân...'
                                : 'Quyết Toán & Giải Ngân Về STK Ngay (Khấu trừ 3% phí sàn)'}
                            </span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Danh sách Quyết toán đã giải ngân */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-black text-sm text-[#10542C]">
                    Lịch Sử Quyết Toán Đã Giải Ngân Thành Công ({settlements.length})
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Tài khoản thụ hưởng: {profile?.bankAccount || '5400205219999'} ({profile?.bankName || 'Agribank'})
                  </span>
                </div>

                <div className="space-y-4">
                  {settlements.map((s) => (
                    <div
                      key={s.id}
                      className="bg-white rounded-3xl border border-[#EAECE8] shadow-2xs p-5 space-y-4 transition-all hover:border-[#10542C]"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold bg-[#10542C] text-white px-2.5 py-1 rounded-md">
                            {s.settlementCode}
                          </span>
                          <div>
                            <h4 className="font-heading font-bold text-sm text-gray-900">{s.productName}</h4>
                            <p className="text-[11px] text-gray-600">
                              Hợp đồng: <strong>{s.contractCode}</strong> • Mã giao dịch ngân hàng: <span className="font-mono font-bold text-[#10542C]">{s.bankReference}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-xl flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ĐÃ GIẢI NGÂN VỀ STK</span>
                          </span>
                        </div>
                      </div>

                      {/* Phân rã dòng tiền minh bạch */}
                      <div className="bg-[#F9F9F5] p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-gray-700">
                          <span>Tiền hàng thực tế ({s.qualifiedWeight.toLocaleString()} kg đạt chuẩn QC × {formatVnd(s.unitPrice)}):</span>
                          <span className="font-bold">{formatVnd(s.grossAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-red-600">
                          <span>Khấu trừ phí dịch vụ nền tảng Sàn ({s.platformFeePercent}%):</span>
                          <span>- {formatVnd(s.platformFee)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-300 text-sm font-bold text-[#10542C]">
                          <span>SỐ TIỀN THỰC NHẬN VÀO TÀI KHOẢN NGÂN HÀNG:</span>
                          <span className="text-base text-emerald-800 font-black">{formatVnd(s.payoutAmount)}</span>
                        </div>
                      </div>

                      {/* Bank info & Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
                        <div className="text-gray-600">
                          Chuyển khoản tới: <strong>{s.bankName}</strong> • STK: <span className="font-mono font-bold text-gray-900">{s.bankAccount}</span> ({s.bankAccountName})
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTaxDocType('01_TNDN');
                              setViewingTaxSettlementId(s.id);
                            }}
                            className="px-3.5 py-1.5 bg-[#10542C] hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer text-xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Bảng Kê Mẫu 01/TNDN</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTaxDocType('INVOICE_KCT');
                              setViewingTaxSettlementId(s.id);
                            }}
                            className="px-3.5 py-1.5 bg-white hover:bg-gray-50 text-[#10542C] border border-[#10542C] font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer text-xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#10542C]" />
                            <span>Hóa Đơn Điện Tử KCT</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: HỒ SƠ VÙNG TRỒNG, CHỨNG NHẬN & TÀI KHOẢN NGÂN HÀNG */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-heading font-black text-[#10542C] flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#4CAF50]" />
                    <span>Hồ Sơ Vùng Trồng, Chứng Nhận & Tài Khoản Ngân Hàng (Module 1)</span>
                  </h2>
                  <p className="text-xs text-gray-600">
                    Hồ sơ pháp lý định danh vùng trồng PUC, giấy chứng nhận VietGAP/GlobalGAP và tài khoản thụ hưởng giải ngân
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!isEditingProfile ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(true);
                        setProfileErrors({});
                        syncAddressFieldsFromFull(profileForm.farmAddress);
                      }}
                      className="px-4 py-2.5 bg-[#10542C] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Chỉnh Sửa Hồ Sơ</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileErrors({});
                        }}
                        className="px-3.5 py-2 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Hủy Bỏ
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        className="px-4 py-2 bg-[#10542C] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Lưu Thay Đổi</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ================= VIEW MODE (CHẾ ĐỘ XEM HỒ SƠ ĐÃ XÁC THỰC) ================= */}
              {!isEditingProfile ? (
                <div className="space-y-6">
                  {/* Banner Trạng Thái Xác Thực */}
                  <div className="bg-gradient-to-r from-emerald-800 to-[#10542C] text-white p-6 rounded-3xl shadow-md relative overflow-hidden">
                    <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/30 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                            ĐÃ ĐƯỢC CHI CỤC TRỒNG TRỌT & BVTV XÁC THỰC
                          </span>
                          <span className="text-[10px] text-emerald-200">Cập nhật: 2026</span>
                        </div>
                        <h3 className="font-heading font-black text-xl sm:text-2xl text-white">
                          {profileForm.farmName || 'HTX Nông Nghiệp Rau Sạch HoNa Farm'}
                        </h3>
                        <p className="text-xs text-emerald-100 max-w-xl">
                          Chủ thể: <strong>{profileForm.farmerType === 'COOPERATIVE' ? 'Hợp Tác Xã / Doanh Nghiệp (Xuất Hóa Đơn KCT)' : 'Hộ Nông Dân Cá Thể (Bảng Kê Mẫu 01/TNDN)'}</strong> • Diện tích: <strong>{profileForm.cultivatedArea || '45 Hecta'}</strong>
                        </p>
                      </div>

                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center shrink-0">
                        <span className="block text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">MÃ SỐ VÙNG TRỒNG (PUC)</span>
                        <span className="text-lg font-mono font-black text-amber-300 block tracking-wider mt-0.5">
                          {profileForm.pucCode || 'VN-LDO-PUC-0849'}
                        </span>
                        <span className="text-[10px] text-emerald-100 mt-1 block">✓ Đạt chuẩn lưu hành toàn quốc & xuất khẩu</span>
                      </div>
                    </div>
                  </div>

                  {/* Thông Tin Chi Tiết Dạng Thẻ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Thẻ 1: Thông tin pháp lý & Địa chỉ */}
                    <div className="bg-white rounded-3xl border border-[#EAECE8] shadow-2xs p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h4 className="font-heading font-bold text-sm text-[#10542C] flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <span>Thông Tin Định Danh & Địa Điểm</span>
                        </h4>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          KYC Cấp 3
                        </span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-gray-500 block">Địa chỉ vườn trồng / Trụ sở:</span>
                          <p className="font-bold text-gray-900 mt-0.5 flex items-start gap-1.5">
                            <MapPin className="w-4 h-4 text-[#10542C] shrink-0 mt-0.5" />
                            <span>{profileForm.farmAddress || 'Tiểu khu 158, Phường 8, Thành phố Đà Lạt, Tỉnh Lâm Đồng'}</span>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                          <div>
                            <span className="text-gray-500 block">
                              {profileForm.farmerType === 'COOPERATIVE' ? 'Mã Số Thuế (MST):' : 'Số CCCD Đại Diện:'}
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {profileForm.farmerType === 'COOPERATIVE' ? (profileForm.taxCode || '5801459201') : (profileForm.idCardNumber || '049088019284')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Số Điện Thoại:</span>
                            <span className="font-mono font-bold text-gray-900">
                              {profileForm.contactPhone || '0912 345 678'}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          <span className="text-gray-500 block">Cơ chế phát hành chứng từ thuế:</span>
                          <p className="font-semibold text-emerald-800 mt-0.5">
                            {profileForm.farmerType === 'COOPERATIVE'
                              ? '✓ Phát hành Hóa đơn điện tử KCT (Không chịu thuế GTGT) theo Nghị định 123/2020/NĐ-CP'
                              : '✓ Giải ngân bảo chứng qua Bảng kê thu mua Mẫu 01/TNDN (Thông tư 78/2021/TT-BTC)'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Thẻ 2: Tài khoản thụ hưởng thanh toán */}
                    <div className="bg-white rounded-3xl border border-[#EAECE8] shadow-2xs p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h4 className="font-heading font-bold text-sm text-[#10542C] flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-emerald-600" />
                          <span>Tài Khoản Ngân Hàng Thụ Hưởng</span>
                        </h4>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          Giải Ngân 24/7
                        </span>
                      </div>

                      <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2">
                        <span className="text-[11px] text-gray-500 block">Số Tài Khoản Nhận Tiền Hợp Đồng:</span>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-lg text-[#10542C] tracking-wider">
                            {profileForm.bankAccount || '5400205219999'}
                          </span>
                          <span className="text-[10px] bg-white border border-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                            Khớp KYC
                          </span>
                        </div>
                        <div className="text-xs space-y-0.5 pt-1 border-t border-emerald-200/50">
                          <p className="text-gray-700">Ngân hàng: <strong>{profileForm.bankName || 'Agribank - Chi nhánh Lâm Đồng'}</strong></p>
                          <p className="text-gray-700">Chủ tài khoản: <strong className="font-mono uppercase">{profileForm.bankAccountName || 'HTX RAU SACH DA LAT GAP'}</strong></p>
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-500">
                        * Tiền ký quỹ 30% cọc và 70% giải ngân sau QC Pass sẽ được hệ thống thanh toán tự động chuyển trực tiếp vào tài khoản này.
                      </p>
                    </div>

                    {/* Thẻ 3: Giấy chứng nhận chất lượng VietGAP / GlobalGAP */}
                    <div className="md:col-span-2 bg-white rounded-3xl border border-[#EAECE8] shadow-2xs p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div>
                          <h4 className="font-heading font-bold text-sm text-[#10542C] flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Chứng Nhận Tiêu Chuẩn Nông Sản & Kiểm Định Chất Lượng</span>
                          </h4>
                          <p className="text-xs text-gray-500">
                            Tiêu chuẩn: <strong className="text-gray-900">{profileForm.certifications || 'VietGAP, GlobalGAP, OCOP 4 Sao'}</strong> • Hiệu lực đến: <strong className="text-emerald-800">{profileForm.certExpiryDate || '31/12/2027'}</strong>
                          </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl self-start sm:self-auto">
                          ✓ Đạt Chuẩn Sàn Sỉ HoNa Fresh
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-5 bg-gray-50/80 p-4 rounded-2xl border border-gray-200">
                        {profileForm.certImageUrl ? (
                          <div className="relative group shrink-0">
                            <img
                              src={profileForm.certImageUrl}
                              alt="Giấy chứng nhận VietGAP"
                              className="w-36 h-48 sm:w-44 sm:h-56 object-cover rounded-xl shadow-md border border-gray-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center text-white text-xs font-bold gap-1 pointer-events-none">
                              <Eye className="w-4 h-4" /> Xem ảnh gốc
                            </div>
                          </div>
                        ) : (
                          <div className="w-36 h-48 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-xs">
                            Chưa có ảnh
                          </div>
                        )}

                        <div className="space-y-2 text-xs text-gray-600">
                          <h5 className="font-heading font-bold text-sm text-[#10542C]">
                            Bản Gốc Giấy Chứng Nhận Tiêu Chuẩn Nông Sản An Toàn
                          </h5>
                          <p>
                            • Tổ chức chứng nhận: <strong>Trung Tâm Kiểm Định & Khảo Nghiệm Nông Lâm Thủy Sản</strong>
                          </p>
                          <p>
                            • Mã số chứng chỉ: <strong>GAP-VN-2024-88921/TTTT</strong>
                          </p>
                          <p>
                            • Danh mục sản phẩm được cấp phép: Rau ăn lá, Cà chua, Dưa leo, Ớt chuông, Cà rốt, Củ dền.
                          </p>
                          <p className="text-emerald-700 font-semibold">
                            ✓ Đã được đối soát chéo và phê duyệt bởi Ban Quản Trị Hệ Thống Chuỗi HoNa Fresh.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ================= EDIT MODE (CHẾ ĐỘ CHỈNH SỬA BIỂU MẪU) ================= */
                <div className="bg-white rounded-3xl border border-[#EAECE8] shadow-2xs p-6 sm:p-8 space-y-6">
                  {/* 1. Phân loại chủ thể canh tác */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                      1. Phân Loại Chủ Thể Canh Tác (Xác định chế độ xuất chứng từ thuế)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setProfileForm({ ...profileForm, farmerType: 'HOUSEHOLD' })}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          profileForm.farmerType === 'HOUSEHOLD'
                            ? 'border-[#10542C] bg-emerald-50/50 ring-2 ring-[#10542C]'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-heading font-black text-sm text-[#10542C]">Hộ Nông Dân Cá Thể</span>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            Miễn thuế TNCN/GTGT
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600">
                          Theo Thông tư 78/2021/TT-BTC, tiền bán hàng nông sản được giải ngân bảo chứng qua <strong>Bảng kê thu mua Mẫu 01/TNDN</strong> (không cần hóa đơn).
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProfileForm({ ...profileForm, farmerType: 'COOPERATIVE' })}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          profileForm.farmerType === 'COOPERATIVE'
                            ? 'border-[#10542C] bg-emerald-50/50 ring-2 ring-[#10542C]'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-heading font-black text-sm text-[#10542C]">Hợp Tác Xã / Doanh Nghiệp</span>
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Xuất Hóa Đơn KCT
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600">
                          Kê khai Mã số thuế (MST) của Hợp tác xã để phát hành <strong>Hóa đơn bán lẻ điện tử đối tượng KCT (Không chịu thuế GTGT)</strong> cho thương lái.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* 2. Thông tin vùng trồng & PUC */}
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                      2. Định Danh Vùng Trồng Nông Sản (PUC Profile)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">Tên Nông Trại / Hợp Tác Xã *</label>
                        <input
                          type="text"
                          value={profileForm.farmName}
                          onChange={(e) => setProfileForm({ ...profileForm, farmName: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border font-bold text-gray-900 focus:outline-none ${
                            profileErrors.farmName ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#10542C]'
                          }`}
                          placeholder="Ví dụ: HTX Nông Nghiệp Đà Lạt GAP"
                        />
                        {profileErrors.farmName && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1">✕ {profileErrors.farmName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-gray-700 font-semibold mb-1 flex items-center justify-between">
                          <span>Mã Số Vùng Trồng (PUC Code) do Chi cục Trồng trọt cấp *</span>
                          <span className="text-[10px] text-[#10542C] font-mono font-bold">Chuẩn Chi cục</span>
                        </label>
                        <input
                          type="text"
                          value={profileForm.pucCode}
                          onChange={(e) => setProfileForm({ ...profileForm, pucCode: e.target.value.toUpperCase().trim() })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border font-mono font-bold text-[#10542C] focus:outline-none ${
                            profileErrors.pucCode ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#10542C]'
                          }`}
                          placeholder="Ví dụ: VN-LDO-PUC-0849"
                        />
                        {profileErrors.pucCode && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1">✕ {profileErrors.pucCode}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">
                          {profileForm.farmerType === 'COOPERATIVE' ? 'Mã Số Thuế HTX (MST) *' : 'Mã Số Thuế (Nếu có)'}
                        </label>
                        <input
                          type="text"
                          value={profileForm.taxCode}
                          onChange={(e) => setProfileForm({ ...profileForm, taxCode: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border font-mono focus:outline-none ${
                            profileErrors.taxCode ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#10542C]'
                          }`}
                          placeholder="5801459201"
                        />
                        {profileErrors.taxCode && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1">✕ {profileErrors.taxCode}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">
                          {profileForm.farmerType === 'HOUSEHOLD' ? 'Số CCCD Người Đại Diện (Hộ Cá Thể) *' : 'Số CCCD Người Đại Diện Pháp Luật'}
                        </label>
                        <input
                          type="text"
                          value={profileForm.idCardNumber}
                          onChange={(e) => setProfileForm({ ...profileForm, idCardNumber: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border font-mono focus:outline-none ${
                            profileErrors.idCardNumber ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#10542C]'
                          }`}
                          placeholder="049088019284"
                        />
                        {profileErrors.idCardNumber && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1">✕ {profileErrors.idCardNumber}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">Số Điện Thoại Liên Hệ *</label>
                        <input
                          type="text"
                          value={profileForm.contactPhone}
                          onChange={(e) => setProfileForm({ ...profileForm, contactPhone: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border font-mono focus:outline-none ${
                            profileErrors.contactPhone ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#10542C]'
                          }`}
                          placeholder="0912345678"
                        />
                        {profileErrors.contactPhone && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1">✕ {profileErrors.contactPhone}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">Quy Mô Diện Tích Canh Tác (Hecta) *</label>
                        <input
                          type="text"
                          value={profileForm.cultivatedArea}
                          onChange={(e) => setProfileForm({ ...profileForm, cultivatedArea: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#10542C]"
                          placeholder="Ví dụ: 45 Hecta"
                        />
                      </div>
                    </div>

                    {/* CASCADING DROPDOWN: ĐỊA CHỈ HÀNH CHÍNH 4 CẤP (TỈNH -> HUYỆN -> XÃ -> ẤP/ĐƯỜNG) */}
                    <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-3 mt-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#10542C]">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span>Địa Chỉ Vườn Trồng / Trụ Sở HTX (Chọn Phân Cấp Hành Chính Việt Nam) *</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        {/* 1. Tỉnh / Thành */}
                        <div>
                          <label className="block text-gray-600 font-medium mb-1">1. Tỉnh / Thành Phố *</label>
                          <select
                            value={selectedProvinceName}
                            onChange={(e) => handleProvinceSelect(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-semibold text-gray-800 focus:outline-none focus:border-[#10542C]"
                          >
                            {VIETNAM_ADMINISTRATIVE_DATA.map((p) => (
                              <option key={p.name} value={p.name}>
                                {p.name} ({p.pucPrefix})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Huyện / Quận */}
                        <div>
                          <label className="block text-gray-600 font-medium mb-1">2. Quận / Huyện / Thị Xã *</label>
                          {(() => {
                            const curProv = VIETNAM_ADMINISTRATIVE_DATA.find((p) => p.name === selectedProvinceName);
                            const distList = curProv ? curProv.districts : [];
                            return (
                              <select
                                value={selectedDistrictName}
                                onChange={(e) => handleDistrictSelect(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-semibold text-gray-800 focus:outline-none focus:border-[#10542C]"
                              >
                                {distList.map((d) => (
                                  <option key={d.name} value={d.name}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            );
                          })()}
                        </div>

                        {/* 3. Xã / Phường */}
                        <div>
                          <label className="block text-gray-600 font-medium mb-1">3. Phường / Xã / Thị Trấn *</label>
                          {(() => {
                            const curProv = VIETNAM_ADMINISTRATIVE_DATA.find((p) => p.name === selectedProvinceName);
                            const curDist = curProv?.districts.find((d) => d.name === selectedDistrictName);
                            const wardList = curDist ? curDist.wards : [];
                            return (
                              <select
                                value={selectedWardName}
                                onChange={(e) => handleWardSelect(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-semibold text-gray-800 focus:outline-none focus:border-[#10542C]"
                              >
                                {wardList.map((w) => (
                                  <option key={w.name} value={w.name}>
                                    {w.name}
                                  </option>
                                ))}
                              </select>
                            );
                          })()}
                        </div>
                      </div>

                      {/* 4. Thôn / Ấp / Số nhà & Đường */}
                      <div className="text-xs">
                        <label className="block text-gray-600 font-medium mb-1">
                          4. Thôn / Ấp / Tiểu Khu / Số Nhà & Tên Đường Chi Tiết *
                        </label>
                        <input
                          type="text"
                          value={hamletDetail}
                          onChange={(e) => handleHamletChange(e.target.value)}
                          placeholder="Ví dụ: Tiểu khu 158, Thôn Phù Đổng Thiên Vương, Đường Mai Anh Đào"
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[#10542C]"
                        />

                        {/* Gợi ý ấp/thôn phổ biến của xã đã chọn */}
                        {(() => {
                          const curProv = VIETNAM_ADMINISTRATIVE_DATA.find((p) => p.name === selectedProvinceName);
                          const curDist = curProv?.districts.find((d) => d.name === selectedDistrictName);
                          const curWard = curDist?.wards.find((w) => w.name === selectedWardName);
                          const hList = curWard?.hamlets || [];
                          if (hList.length === 0) return null;
                          return (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span className="text-[10px] text-gray-500">Ấp/Thôn gợi ý:</span>
                              {hList.map((h) => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => handleHamletChange(h)}
                                  className="text-[10px] bg-white text-gray-700 border border-gray-200 hover:border-emerald-500 px-2 py-0.5 rounded-md cursor-pointer"
                                >
                                  + {h}
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Chuỗi địa chỉ ghép tự động hoàn chỉnh */}
                      <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100 text-xs">
                        <span className="text-gray-500 block text-[11px]">Chuỗi địa chỉ hoàn chỉnh lưu hệ thống:</span>
                        <strong className="text-[#10542C] font-semibold block mt-0.5">
                          {profileForm.farmAddress || `${hamletDetail}, ${selectedWardName}, ${selectedDistrictName}, ${selectedProvinceName}`}
                        </strong>
                      </div>
                      {profileErrors.farmAddress && (
                        <p className="text-[11px] text-red-600 font-semibold">✕ {profileErrors.farmAddress}</p>
                      )}
                    </div>
                  </div>

                  {/* 3. Chứng nhận chất lượng an toàn thực phẩm */}
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                      3. Chứng Nhận Tiêu Chuẩn Nông Sản & Thời Hạn
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">Các Tiêu Chuẩn Đạt Được</label>
                        <input
                          type="text"
                          value={profileForm.certifications}
                          onChange={(e) => setProfileForm({ ...profileForm, certifications: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#10542C]"
                          placeholder="VietGAP, GlobalGAP, Organic, OCOP 4 Sao"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {['VietGAP', 'GlobalGAP', 'Organic (Hữu cơ)', 'OCOP 4 Sao'].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                const curr = profileForm.certifications || '';
                                if (!curr.includes(tag)) {
                                  setProfileForm({
                                    ...profileForm,
                                    certifications: curr ? `${curr}, ${tag}` : tag,
                                  });
                                }
                              }}
                              className="text-[10px] bg-emerald-50 text-[#10542C] border border-emerald-200 px-2.5 py-1 rounded-md font-semibold cursor-pointer hover:bg-emerald-100"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">Thời Hạn Giấy Chứng Nhận Có Hiệu Lực</label>
                        <input
                          type="date"
                          value={profileForm.certExpiryDate}
                          onChange={(e) => setProfileForm({ ...profileForm, certExpiryDate: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#10542C]"
                        />
                      </div>

                      {/* CHỌN ẢNH CHỨNG NHẬN: URL INTERNET HOẶC CHỌN TỆP TỪ MÁY */}
                      <div className="sm:col-span-2 space-y-2">
                        <label className="block text-gray-700 font-semibold">
                          Ảnh Chụp Giấy Chứng Nhận Tiêu Chuẩn (VietGAP / GlobalGAP) *
                        </label>

                        {/* Tabs URL / Upload */}
                        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                          <button
                            type="button"
                            onClick={() => setCertImageTab('url')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              certImageTab === 'url' ? 'bg-[#10542C] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            🌐 Nhập Đường Dẫn URL
                          </button>
                          <button
                            type="button"
                            onClick={() => setCertImageTab('upload')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              certImageTab === 'upload' ? 'bg-[#10542C] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            📁 Chọn Tệp Từ Máy (Choose File)
                          </button>
                        </div>

                        {certImageTab === 'url' ? (
                          <input
                            type="text"
                            value={profileForm.certImageUrl}
                            onChange={(e) => setProfileForm({ ...profileForm, certImageUrl: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#10542C] text-gray-600"
                            placeholder="https://..."
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <label className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-[#10542C] font-bold text-xs rounded-xl border border-emerald-300 cursor-pointer flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              <span>Chọn Tệp Ảnh Từ Máy Tính...</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleCertFileUpload}
                                className="hidden"
                              />
                            </label>
                            <span className="text-gray-500 text-[11px]">Hỗ trợ JPG, PNG, WEBP tối đa 5MB</span>
                          </div>
                        )}

                        {profileForm.certImageUrl && (
                          <div className="mt-2 flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-200 max-w-lg">
                            <img
                              src={profileForm.certImageUrl}
                              alt="Xem trước Giấy chứng nhận"
                              className="w-20 h-24 object-cover rounded-xl border border-gray-300 shrink-0 shadow-xs"
                            />
                            <div className="text-[11px] text-gray-600 space-y-1">
                              <span className="font-bold text-[#10542C] block text-xs">Xem Trước Giấy Chứng Nhận</span>
                              <p>Hiệu lực đến: <strong>{profileForm.certExpiryDate || '31/12/2027'}</strong></p>
                              <span className="inline-block text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                ✓ Đủ điều kiện xác thực hồ sơ lưu hành
                              </span>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setProfileForm({ ...profileForm, certImageUrl: '' })}
                                  className="text-red-600 hover:text-red-700 font-semibold cursor-pointer underline text-[11px]"
                                >
                                  ✕ Xóa ảnh này
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. Tài khoản thụ hưởng giải ngân */}
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                      4. Cài Đặt Tài Khoản Thụ Hưởng Nhận Giải Ngân Tự Động
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">Số Tài Khoản Ngân Hàng *</label>
                        <input
                          type="text"
                          value={profileForm.bankAccount}
                          onChange={(e) => setProfileForm({ ...profileForm, bankAccount: e.target.value.replace(/\s/g, '') })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border font-mono font-bold text-gray-900 focus:outline-none ${
                            profileErrors.bankAccount ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#10542C]'
                          }`}
                          placeholder="5400205219999"
                        />
                        {profileErrors.bankAccount && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1">✕ {profileErrors.bankAccount}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">Ngân Hàng Thụ Hưởng *</label>
                        <input
                          type="text"
                          value={profileForm.bankName}
                          onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none ${
                            profileErrors.bankName ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#10542C]'
                          }`}
                          placeholder="Agribank - CN Lâm Đồng"
                        />
                        {profileErrors.bankName && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1">✕ {profileErrors.bankName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">Tên Chủ Tài Khoản (In Hoa Không Dấu) *</label>
                        <input
                          type="text"
                          value={profileForm.bankAccountName}
                          onChange={(e) => setProfileForm({ ...profileForm, bankAccountName: e.target.value.toUpperCase() })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border font-bold focus:outline-none ${
                            profileErrors.bankAccountName ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#10542C]'
                          }`}
                          placeholder="HTX RAU SACH DA LAT GAP"
                        />
                        {profileErrors.bankAccountName && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1">✕ {profileErrors.bankAccountName}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-gray-500">
                      * Mọi thay đổi sẽ được cập nhật tự động lên hệ thống Bảng Kê Thu Mua 01/TNDN và Hóa Đơn KCT.
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileErrors({});
                        }}
                        className="px-5 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        className="px-7 py-2.5 bg-[#10542C] hover:bg-emerald-800 text-white font-heading font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Lưu Hồ Sơ Vùng Trồng & Ngân Hàng</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= KHỐI GIẢI THÍCH CHUYÊN SÂU: MÃ SỐ VÙNG TRỒNG (PUC) & CƠ CHẾ XÁC THỰC ================= */}
              <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/70 rounded-3xl border border-emerald-200/80 p-6 sm:p-7 space-y-4">
                <div className="flex items-center gap-2.5 text-[#10542C]">
                  <HelpCircle className="w-5 h-5 text-emerald-700 shrink-0" />
                  <h4 className="font-heading font-black text-sm sm:text-base">
                    Cẩm Nang Pháp Lý & Hướng Dẫn Nhận Biết Mã Số Vùng Trồng (PUC) Đã Xác Thực
                  </h4>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed">
                  <strong>Mã Số Vùng Trồng (Production Unit Code - PUC)</strong> là mã định danh bắt buộc do <strong>Chi cục Trồng trọt và Bảo vệ Thực vật các tỉnh</strong> trực tiếp cấp cho từng diện tích canh tác xác định, tuân thủ Tiêu chuẩn cơ sở <strong>TCCS 774:2020/BVTV</strong> của Bộ Nông nghiệp & Phát triển Nông thôn.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#10542C] flex items-center justify-center text-xs">1</span>
                      <span>Tra Cứu CSDL Quốc Gia</span>
                    </div>
                    <p className="text-gray-600 text-[11px] leading-relaxed">
                      Mọi mã số PUC hợp lệ đều được đồng bộ trên Cổng phần mềm Cơ sở Dữ liệu Quốc gia của Cục Bảo vệ Thực vật (<code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[#10542C]">csdl.ppd.gov.vn</code>). Thương lái và người tiêu dùng có thể tra cứu minh bạch nhật ký canh tác và tọa độ ranh giới GPS.
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#10542C] flex items-center justify-center text-xs">2</span>
                      <span>Văn Bản Mộc Đỏ Chi Cục</span>
                    </div>
                    <p className="text-gray-600 text-[11px] leading-relaxed">
                      Hồ sơ bắt buộc phải có Giấy xác nhận / Quyết định cấp mã vùng trồng bản gốc có dấu mộc đỏ pháp lý của Chi cục Trồng trọt & BVTV Tỉnh ký duyệt sau khi đã kiểm tra thực địa, phân tích mẫu đất và dư lượng thuốc BVTV đạt chuẩn.
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#10542C] flex items-center justify-center text-xs">3</span>
                      <span>Cơ Chế Khóa Cứng Trên Sàn</span>
                    </div>
                    <p className="text-gray-600 text-[11px] leading-relaxed">
                      Trên Sàn B2B HoNa Fresh, sau khi Nông dân được Ban Quản Trị duyệt hồ sơ KYC, mã PUC sẽ được <strong>áp cứng và khóa chặt (read-only)</strong> vào mọi lô thu hoạch. Nông dân không thể tùy tiện sửa mã để tuyệt đối ngăn chặn hiện tượng mượn danh hoặc giả mạo xuất xứ.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}{/* TAB 7: AGRI-AI ASSISTANT (TRỢ LÝ HONA FRESH) */}
          {activeTab === 'ai' && (
            <FarmerAiChatView farmerName={profile?.farmName || profile?.fullName} />
          )}
        </main>
      </div>

      {/* ================= MODAL: CREATE HARVEST LOT ================= */}
      {isLotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5 text-[#10542C]">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#10542C] flex items-center justify-center">
                  <Sprout className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base">Đăng Lô Thu Hoạch Vụ Mùa Mới</h3>
                  <p className="text-[11px] text-gray-500">Thiết lập dải nhiệt bảo quản AI Cold-Chain và bảng giá sỉ phân tầng B2B</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLotModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLot} className="space-y-4 text-xs">
              {/* TÊN NÔNG SẢN & MÃ PUC ÁP CỨNG */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Tên Nông Sản Thu Hoạch *
                  </label>
                  <input
                    type="text"
                    required
                    value={newLot.productName}
                    onChange={(e) => handleLotProductNameChange(e.target.value)}
                    placeholder="VD: Cà Chua Beef Đà Lạt VietGAP"
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-bold text-gray-900 focus:outline-none ${
                      lotFormErrors.productName ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#10542C]'
                    }`}
                  />
                  {lotFormErrors.productName && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">✕ {lotFormErrors.productName}</p>
                  )}
                  <p className="text-[10px] text-gray-500 mt-1">
                    * Nhập tên để AI tự động phân loại và gợi ý dải nhiệt độ bảo quản lạnh tối ưu.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-gray-500" />
                      Mã Số Vùng Trồng (PUC) *
                    </span>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Khóa cứng theo hồ sơ
                    </span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={profile?.pucCode || profileForm.pucCode || 'VN-LDO-PUC-0849'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-black text-[#10542C] bg-gray-100 cursor-not-allowed select-none"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    🔒 Mã PUC áp cố định theo hồ sơ vùng trồng đã Chi cục thẩm định, không được sửa thủ công.
                  </p>
                </div>
              </div>

              {/* SẢN LƯỢNG & THỜI HẠN THU HOẠCH - FEFO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Tổng Sản Lượng (kg) *</label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={newLot.totalQuantity}
                    onChange={(e) => setNewLot({ ...newLot, totalQuantity: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      lotFormErrors.totalQuantity ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#10542C]'
                    }`}
                  />
                  {lotFormErrors.totalQuantity && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">✕ {lotFormErrors.totalQuantity}</p>
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Ngày Dự Kiến Thu Hoạch *</label>
                  <input
                    type="date"
                    required
                    value={newLot.harvestDate}
                    onChange={(e) => setNewLot({ ...newLot, harvestDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-[#10542C]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Hạn Bảo Quản Tươi (FEFO) *</label>
                  <input
                    type="date"
                    required
                    value={newLot.expiryDate}
                    onChange={(e) => setNewLot({ ...newLot, expiryDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border ${
                      lotFormErrors.expiryDate ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#10542C]'
                    }`}
                  />
                  {lotFormErrors.expiryDate && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">✕ {lotFormErrors.expiryDate}</p>
                  )}
                </div>
              </div>

              {/* DẢI NHIỆT ĐỘ LẠNH & KHỐI AI COLD-CHAIN GỢI Ý */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-gray-700">
                    Tiêu Chuẩn Chuỗi Lạnh (Cold-Chain Logistics)
                  </label>
                  <button
                    type="button"
                    onClick={handleApplyAiColdChain}
                    className="text-[11px] font-bold text-[#10542C] hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>AI Gợi Ý Nhiệt Độ Lại</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Nhiệt Độ Lạnh Tối Thiểu (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newLot.minTemp}
                      onChange={(e) => setNewLot({ ...newLot, minTemp: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold focus:outline-none focus:border-[#10542C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Nhiệt Độ Lạnh Tối Đa (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newLot.maxTemp}
                      onChange={(e) => setNewLot({ ...newLot, maxTemp: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold focus:outline-none focus:border-[#10542C]"
                    />
                  </div>
                </div>

                {/* Hộp gợi ý AI Cold-Chain */}
                {aiTempAdvice ? (
                  <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-xs space-y-1 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#10542C] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        AI Cold-Chain: {aiTempAdvice.categoryName}
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                        Độ ẩm: {aiTempAdvice.humidity}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-700 leading-relaxed">
                      💡 {aiTempAdvice.advice}
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-[11px] text-gray-500 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>Nhập tên nông sản phía trên (VD: Cà chua, Xà lách, Cà rốt...) để kích hoạt AI gợi ý dải nhiệt tự động.</span>
                  </div>
                )}
              </div>

              {/* HÌNH ẢNH MINH HỌA SẢN PHẨM: URL INTERNET HOẶC CHỌN TỆP TỪ MÁY */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-gray-700">
                    Hình Ảnh Minh Họa Nông Sản Thực Tế *
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLotImageTab('url')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        lotImageTab === 'url' ? 'bg-[#10542C] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🌐 URL Internet
                    </button>
                    <button
                      type="button"
                      onClick={() => setLotImageTab('upload')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        lotImageTab === 'upload' ? 'bg-[#10542C] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      📁 Chọn Tệp (Choose File)
                    </button>
                  </div>
                </div>

                {lotImageTab === 'url' ? (
                  <input
                    type="text"
                    value={newLot.imageUrl}
                    onChange={(e) => {
                      setNewLot({ ...newLot, imageUrl: e.target.value });
                      if (lotFormErrors.imageUrl) {
                        setLotFormErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.imageUrl;
                          return copy;
                        });
                      }
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      lotFormErrors.imageUrl ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#10542C]'
                    }`}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#10542C] font-bold text-xs rounded-xl border border-emerald-300 cursor-pointer flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>Chọn Ảnh Từ Máy Tính...</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLotFileUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-gray-500 text-[11px]">Hỗ trợ JPG, PNG, WEBP (tối đa 5MB)</span>
                  </div>
                )}
                {lotFormErrors.imageUrl && (
                  <p className="text-[11px] text-red-600 font-semibold">✕ {lotFormErrors.imageUrl}</p>
                )}

                {/* Khung xem trước ảnh sản phẩm */}
                {newLot.imageUrl && (
                  <div className="relative group max-w-sm rounded-2xl overflow-hidden border border-gray-200 shadow-2xs">
                    <img
                      src={newLot.imageUrl}
                      alt="Xem trước nông sản"
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      Ảnh minh họa trên Sàn B2B
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewLot({ ...newLot, imageUrl: '' })}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md cursor-pointer"
                      title="Xóa ảnh"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* TIER PRICING INPUTS */}
              <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-emerald-900">Thiết Lập Bảng Giá Sỉ Phân Tầng (Tier Pricing Matrix):</p>
                  <span className="text-[10px] text-emerald-700 font-semibold">Mua càng nhiều giá càng tốt</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Bậc 1: Mua từ (kg)</label>
                    <input
                      type="number"
                      value={newLot.tier1Min}
                      onChange={(e) => setNewLot({ ...newLot, tier1Min: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white"
                    />
                    <input
                      type="number"
                      placeholder="Giá/kg (đ)"
                      value={newLot.tier1Price}
                      onChange={(e) => setNewLot({ ...newLot, tier1Price: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white mt-1 font-bold text-[#10542C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Bậc 2: Mua từ (kg)</label>
                    <input
                      type="number"
                      value={newLot.tier2Min}
                      onChange={(e) => setNewLot({ ...newLot, tier2Min: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white"
                    />
                    <input
                      type="number"
                      placeholder="Giá/kg (đ)"
                      value={newLot.tier2Price}
                      onChange={(e) => setNewLot({ ...newLot, tier2Price: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white mt-1 font-bold text-[#10542C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Bậc 3: Mua từ (kg)</label>
                    <input
                      type="number"
                      value={newLot.tier3Min}
                      onChange={(e) => setNewLot({ ...newLot, tier3Min: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white"
                    />
                    <input
                      type="number"
                      placeholder="Giá/kg (đ)"
                      value={newLot.tier3Price}
                      onChange={(e) => setNewLot({ ...newLot, tier3Price: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white mt-1 font-bold text-[#10542C]"
                    />
                  </div>
                </div>
              </div>

              {/* HÀNG NÚT THAO TÁC: LÀM MỚI, HỦY BỎ, CÔNG KHAI */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleResetLotForm}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                  <span>Làm Mới Form</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLotModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#10542C] hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Công Khai Lên Sàn B2B</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: COUNTER OFFER ================= */}
      {counterModalRfq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <h3 className="font-heading font-bold text-sm text-[#10542C]">
              Thương Lượng Lại Giá RFQ ({counterModalRfq.rfqCode})
            </h3>
            <p className="text-gray-600">
              Đề xuất mức giá hoặc khối lượng mới gửi lại cho Thương lái <strong>{counterModalRfq.buyerName}</strong>:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Đơn Giá Đề Xuất Mới (VNĐ/kg):</label>
                <input
                  type="number"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold text-[#10542C]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Khối Lượng Có Thể Cung Cấp (kg):</label>
                <input
                  type="number"
                  value={counterQty}
                  onChange={(e) => setCounterQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCounterModalRfq(null)}
                className="px-3.5 py-1.5 border border-gray-200 rounded-xl font-bold text-gray-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleCounterRfq}
                className="px-4 py-1.5 bg-[#10542C] text-white rounded-xl font-bold shadow-xs hover:bg-emerald-800 cursor-pointer"
              >
                Gửi Thương Lượng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REJECT REASON ================= */}
      {rejectModalRfq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <h3 className="font-heading font-bold text-sm text-red-600">
              Từ Chối Yêu Cầu Báo Giá ({rejectModalRfq.rfqCode})
            </h3>
            <p className="text-gray-600">Vui lòng cung cấp lý do từ chối để hệ thống phản hồi thương lái:</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-300"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectModalRfq(null)}
                className="px-3.5 py-1.5 border border-gray-200 rounded-xl font-bold text-gray-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleRejectRfq}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
              >
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: XEM CHỨNG TỪ THUẾ (BẢNG KÊ 01/TNDN & HÓA ĐƠN KCT) ================= */}
      {viewingTaxSettlementId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 bg-[#10542C] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-heading font-bold text-sm">
                    {taxDocType === '01_TNDN'
                      ? 'Bảng Kê Thu Mua Nông Sản Mẫu 01/TNDN (Thông tư 78/2021/TT-BTC)'
                      : 'Hóa Đơn Bán Hàng Nông Sản Điện Tử (Đối tượng KCT - Không chịu thuế GTGT)'}
                  </h3>
                  <span className="text-[11px] text-emerald-200">
                    Số chứng từ: <strong>{currentTaxSettlement?.settlementCode}</strong> • Bảo chứng bởi Sàn HoNa Fresh
                  </span>
                </div>
              </div>

              {/* Actions Header */}
              <div className="flex items-center gap-2">
                {/* Switch Document Type Tabs */}
                <div className="bg-emerald-900/60 p-0.5 rounded-lg flex text-xs">
                  <button
                    type="button"
                    onClick={() => setTaxDocType('01_TNDN')}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      taxDocType === '01_TNDN' ? 'bg-white text-[#10542C]' : 'text-emerald-200 hover:text-white'
                    }`}
                  >
                    Mẫu 01/TNDN
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxDocType('INVOICE_KCT')}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      taxDocType === 'INVOICE_KCT' ? 'bg-white text-[#10542C]' : 'text-emerald-200 hover:text-white'
                    }`}
                  >
                    Hóa Đơn KCT
                  </button>
                </div>

                <a
                  href={
                    taxDocType === '01_TNDN'
                      ? getPdf01TndnUrl(currentTaxSettlement?.id || 1)
                      : getInvoiceKctUrl(currentTaxSettlement?.id || 1)
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Mở link trực tiếp từ backend"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở Tab Mới</span>
                </a>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white text-[#10542C] hover:bg-emerald-50 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> In
                </button>
                <button
                  onClick={() => setViewingTaxSettlementId(null)}
                  className="text-white hover:text-gray-300 font-bold px-2 text-base cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Document Viewer */}
            <div className="flex-1 bg-white p-6 sm:p-10 overflow-y-auto text-xs text-black space-y-6 print:p-0">
              {taxDocType === '01_TNDN' ? (
                <>
                  {/* Quốc hiệu tiêu ngữ */}
                  <div className="text-center space-y-1 border-b pb-4">
                    <p className="font-bold uppercase tracking-wider text-sm">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="italic font-medium">Độc lập - Tự do - Hạnh phúc</p>
                    <div className="w-32 h-[1px] bg-black mx-auto mt-1" />
                  </div>

                  {/* Tiêu đề bảng kê */}
                  <div className="text-center space-y-1">
                    <h2 className="text-base sm:text-lg font-black uppercase text-[#10542C]">
                      BẢNG KÊ THU MUA HÀNG HÓA NÔNG SẢN KHÔNG CÓ HÓA ĐƠN
                    </h2>
                    <p className="italic text-gray-700">
                      (Mẫu số 01/TNDN - Ban hành kèm theo Thông tư số 78/2021/TT-BTC của Bộ Tài chính)
                    </p>
                    <p className="font-mono text-gray-600 text-[11px]">
                      Mã chứng từ: <strong>{currentTaxSettlement?.settlementCode}</strong> • Ngày lập: {currentTaxSettlement?.paidAt?.slice(0, 10) || '28/10/2026'}
                    </p>
                  </div>

                  {/* Thông tin bên mua và bên bán */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="space-y-1">
                      <p className="font-bold text-emerald-950 uppercase">Đơn vị thu mua bảo chứng (Bên Mua):</p>
                      <p><strong>CÔNG TY CỔ PHẦN NÔNG SẢN SỈ B2B HONA FRESH</strong></p>
                      <p>Mã số thuế: <strong>0318992019</strong></p>
                      <p>Địa chỉ: Tầng 6, Innovation Hub, Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-emerald-950 uppercase">Người bán nông sản trực tiếp:</p>
                      <p>Họ tên / HTX: <strong>{profile?.farmName || currentTaxSettlement?.bankAccountName || 'Hộ Nông Dân Nguyễn Văn Thành'}</strong></p>
                      <p>Mã số vùng trồng (PUC): <strong className="font-mono text-[#10542C]">{profile?.pucCode || 'VN-LDO-PUC-0849'}</strong></p>
                      <p>Số CCCD / MST: <strong>{profile?.idCardNumber || profile?.taxCode || '049088019284'}</strong></p>
                      <p>Địa chỉ vườn trồng: {profile?.location || 'Xã Xuân Thọ, TP. Đà Lạt, Tỉnh Lâm Đồng'}</p>
                    </div>
                  </div>

                  {/* Bảng chi tiết nông sản */}
                  <table className="w-full border-collapse border border-gray-300 text-center">
                    <thead>
                      <tr className="bg-gray-100 font-bold">
                        <th className="border border-gray-300 p-2">STT</th>
                        <th className="border border-gray-300 p-2 text-left">Tên Nông Sản Thu Mua</th>
                        <th className="border border-gray-300 p-2">ĐVT</th>
                        <th className="border border-gray-300 p-2">Sản Lượng QC Đạt</th>
                        <th className="border border-gray-300 p-2">Đơn Giá Chốt</th>
                        <th className="border border-gray-300 p-2 text-right">Thành Tiền (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2">1</td>
                        <td className="border border-gray-300 p-2 text-left font-bold">{currentTaxSettlement?.productName}</td>
                        <td className="border border-gray-300 p-2">kg</td>
                        <td className="border border-gray-300 p-2 font-bold">{currentTaxSettlement?.qualifiedWeight.toLocaleString()}</td>
                        <td className="border border-gray-300 p-2">{formatVnd(currentTaxSettlement?.unitPrice)}</td>
                        <td className="border border-gray-300 p-2 text-right font-bold">{formatVnd(currentTaxSettlement?.grossAmount)}</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="border border-gray-300 p-2 text-right font-semibold">Tổng giá trị tiền hàng:</td>
                        <td className="border border-gray-300 p-2 text-right font-bold">{formatVnd(currentTaxSettlement?.grossAmount)}</td>
                      </tr>
                      <tr className="text-red-700 bg-red-50/50">
                        <td colSpan={5} className="border border-gray-300 p-2 text-right">Khấu trừ phí nền tảng Sàn ({currentTaxSettlement?.platformFeePercent}%):</td>
                        <td className="border border-gray-300 p-2 text-right font-bold">- {formatVnd(currentTaxSettlement?.platformFee)}</td>
                      </tr>
                      <tr className="bg-emerald-50 text-emerald-950 font-bold text-sm">
                        <td colSpan={5} className="border border-gray-300 p-2.5 text-right uppercase">SỐ TIỀN THỰC CHI TRẢ VỀ TÀI KHOẢN NÔNG DÂN:</td>
                        <td className="border border-gray-300 p-2.5 text-right font-black text-[#10542C]">{formatVnd(currentTaxSettlement?.payoutAmount)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="italic text-gray-700">
                    Phương thức chi trả: Chuyển khoản ngân hàng <strong>{currentTaxSettlement?.bankName}</strong> • STK: <strong>{currentTaxSettlement?.bankAccount}</strong> • Mã giao dịch: <strong>{currentTaxSettlement?.bankReference}</strong>
                  </p>

                  {/* Chữ ký hai bên */}
                  <div className="grid grid-cols-2 pt-8 text-center">
                    <div className="space-y-16">
                      <p className="font-bold uppercase">NGƯỜI BÁN NÔNG SẢN</p>
                      <p className="font-bold">{profile?.farmName || currentTaxSettlement?.bankAccountName || 'Đại diện Hộ Nông Dân'}</p>
                    </div>
                    <div className="space-y-16">
                      <p className="font-bold uppercase">ĐẠI DIỆN SÀN HONA FRESH B2B</p>
                      <p className="font-bold">HoNa Fresh B2B Platform (Đã ký điện tử)</p>
                    </div>
                  </div>
                </>
              ) : (
                /* Hóa đơn KCT cho Hợp tác xã */
                <>
                  <div className="text-center space-y-1 border-b pb-4">
                    <h3 className="font-bold uppercase text-base text-[#10542C]">{profile?.farmName || 'HTX NÔNG NGHIỆP ĐÀ LẠT GAP'}</h3>
                    <p className="text-gray-600">Địa chỉ: {profile?.location || 'TP. Đà Lạt, Tỉnh Lâm Đồng'}</p>
                    <p>Mã số thuế: <strong>{profile?.taxCode || '5801459201'}</strong> | Hotline: 0988.100.222</p>
                    <div className="w-40 h-[1px] bg-[#10542C] mx-auto mt-2" />
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span>Ký hiệu mẫu số: <strong>1C26TND</strong></span><br />
                      <span>Ký hiệu hóa đơn: <strong>C26MHD</strong></span>
                    </div>
                    <div className="text-right">
                      <span>Số hóa đơn: <strong className="text-red-600 text-sm">{currentTaxSettlement?.settlementCode.replace('STL-', 'HD-KCT-')}</strong></span><br />
                      <span>Ngày lập: <strong>{currentTaxSettlement?.paidAt?.slice(0, 10) || '28/10/2026'}</strong></span>
                    </div>
                  </div>

                  <div className="text-center">
                    <h2 className="text-base sm:text-lg font-black uppercase text-[#10542C]">
                      HÓA ĐƠN BÁN HÀNG NÔNG SẢN (ĐỐI TƯỢNG KCT)
                    </h2>
                    <p className="italic text-gray-600">
                      (Nghị định 123/2020/NĐ-CP & Thông tư 78/2021/TT-BTC - Đối tượng không chịu thuế GTGT)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="space-y-1">
                      <p className="font-bold text-gray-900">Đơn vị bán hàng:</p>
                      <p><strong>{profile?.farmName || 'HTX NÔNG NGHIỆP ĐÀ LẠT GAP'}</strong></p>
                      <p>Mã vùng trồng (PUC): <strong className="font-mono text-[#10542C]">{profile?.pucCode || 'VN-LDO-PUC-0849'}</strong></p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-gray-900">Đơn vị thu mua / Sàn bảo chứng:</p>
                      <p><strong>CÔNG TY CỔ PHẦN NÔNG SẢN SỈ B2B HONA FRESH</strong></p>
                      <p>Hợp đồng tham chiếu: <strong>{currentTaxSettlement?.contractCode}</strong></p>
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-gray-300 text-center">
                    <thead>
                      <tr className="bg-gray-100 font-bold">
                        <th className="border border-gray-300 p-2">STT</th>
                        <th className="border border-gray-300 p-2 text-left">Tên Hàng Hóa Nông Sản</th>
                        <th className="border border-gray-300 p-2">ĐVT</th>
                        <th className="border border-gray-300 p-2">Số Lượng QC</th>
                        <th className="border border-gray-300 p-2">Đơn Giá</th>
                        <th className="border border-gray-300 p-2 text-right">Thành Tiền (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2">1</td>
                        <td className="border border-gray-300 p-2 text-left font-bold">
                          {currentTaxSettlement?.productName}
                          <br /><small className="text-gray-500 font-normal">(Nông sản trồng trọt sơ chế chưa chế biến - KCT)</small>
                        </td>
                        <td className="border border-gray-300 p-2">kg</td>
                        <td className="border border-gray-300 p-2 font-bold">{currentTaxSettlement?.qualifiedWeight.toLocaleString()}</td>
                        <td className="border border-gray-300 p-2">{formatVnd(currentTaxSettlement?.unitPrice)}</td>
                        <td className="border border-gray-300 p-2 text-right font-bold">{formatVnd(currentTaxSettlement?.grossAmount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="border border-gray-300 p-2 text-right font-semibold">Thuế suất GTGT:</td>
                        <td className="border border-gray-300 p-2 text-right font-bold text-emerald-800">KCT (Không chịu thuế)</td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="border border-gray-300 p-2 text-right">Khấu trừ phí sàn (3%):</td>
                        <td className="border border-gray-300 p-2 text-right font-bold text-red-600">- {formatVnd(currentTaxSettlement?.platformFee)}</td>
                      </tr>
                      <tr className="bg-emerald-50 font-bold text-sm">
                        <td colSpan={5} className="border border-gray-300 p-2.5 text-right uppercase text-[#10542C]">TỔNG TIỀN THỰC NHẬN:</td>
                        <td className="border border-gray-300 p-2.5 text-right font-black text-[#10542C]">{formatVnd(currentTaxSettlement?.payoutAmount)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="grid grid-cols-2 pt-6 text-center">
                    <div className="space-y-14">
                      <p className="font-bold uppercase">NGƯỜI MUA HÀNG</p>
                      <p className="font-bold">Đại diện Thương lái (Đã ký số)</p>
                    </div>
                    <div className="space-y-4">
                      <p className="font-bold uppercase">NGƯỜI BÁN HÀNG (HỢP TÁC XÃ)</p>
                      <div className="p-3 border-2 border-dashed border-[#10542C] rounded-xl text-left text-[11px] text-[#10542C] font-mono bg-emerald-50/50 inline-block">
                        ✓ CHỮ KÝ SỐ HỢP CHUẨN CKS<br />
                        Ký bởi: {profile?.farmName || 'HTX NÔNG NGHIỆP ĐÀ LẠT GAP'}<br />
                        MST: {profile?.taxCode || '5801459201'}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
