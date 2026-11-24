'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Truck,
  Route,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  Phone,
  User,
  Thermometer,
  Layers,
  ChevronDown,
  Navigation,
  Sparkles,
  ExternalLink,
  Boxes,
  Warehouse,
  History,
  Activity,
  Calendar,
  AlertCircle,
  Eye,
  X,
  XCircle,
  RefreshCw,
  PlusCircle,
  QrCode,
  CreditCard,
  FileCheck2,
  PenTool,
  Camera,
  Check,
  Receipt,
} from 'lucide-react';
import {
  fleetDispatchApi,
  WarehouseHubDto,
  FleetVehicleDto,
  FleetDriverDto,
  EligibleOutboundContractDto,
  OutboundDeliveryTripDto,
  OutboundDeliveryStopDto,
  DEFAULT_OFFICIAL_HUBS,
} from '@/services/fleetDispatchApi';
import { b2bWebSocket } from '@/services/websocketService';
import { api } from '@/services/auth';

export default function AdminOutboundDispatchPage() {
  const [hubs] = useState<WarehouseHubDto[]>(DEFAULT_OFFICIAL_HUBS);
  const [selectedHubId, setSelectedHubId] = useState<number>(2); // Mặc định Hub Đức Trọng
  const [activeTab, setActiveTab] = useState<'ELIGIBLE' | 'TRIPS' | 'COMPLETED'>('ELIGIBLE');

  const [eligibleContracts, setEligibleContracts] = useState<EligibleOutboundContractDto[]>([]);
  const [trips, setTrips] = useState<OutboundDeliveryTripDto[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<OutboundDeliveryStopDto[]>([]);
  const [vehicles, setVehicles] = useState<FleetVehicleDto[]>([]);
  const [drivers, setDrivers] = useState<FleetDriverDto[]>([]);
  const [coldAssets, setColdAssets] = useState<any[]>([]);
  const [coldAlerts, setColdAlerts] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Chọn hợp đồng để ghép chuyến
  const [selectedContractIds, setSelectedContractIds] = useState<number[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [tripNotes, setTripNotes] = useState<string>('');

  // Modal hủy chuyến
  const [cancellingTrip, setCancellingTrip] = useState<OutboundDeliveryTripDto | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Thay đổi kế hoạch giao hàng');

  // Modal Tài xế bàn giao ePOD (GĐ 8.3)
  const [driverEpodStop, setDriverEpodStop] = useState<any | null>(null);
  const [actualDeliveredWeight, setActualDeliveredWeight] = useState<string>('150');
  const [rejectedWeight, setRejectedWeight] = useState<string>('0');
  const [driverNotes, setDriverNotes] = useState<string>('Bàn giao đủ số lượng, nhiệt độ buồng xe đạt chuẩn VietGAP.');
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Modal Buyer xác nhận nhận hàng (GĐ 8.4)
  const [buyerConfirmStop, setBuyerConfirmStop] = useState<any | null>(null);
  const [buyerSignerName, setBuyerSignerName] = useState<string>('Trần Thị Thương (Kho Nachy)');
  const [buyerSignerPhone, setBuyerSignerPhone] = useState<string>('0987654321');
  const [buyerNotes, setBuyerNotes] = useState<string>('Đã kiểm tra tem niêm phong và nhận đủ 150 kg Lá É đạt chuẩn VietGAP.');

  // Modal Quyết toán 70% còn lại (GĐ 9.1 & 9.2)
  const [settlementQuote, setSettlementQuote] = useState<any | null>(null);
  const [settlementBankRef, setSettlementBankRef] = useState<string>('');

  // Modal Xem Hóa Đơn / Chứng từ B2B
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null);

  // Modal Xem Chi Tiết Biên Bản Bàn Giao ePOD
  const [viewEpodStop, setViewEpodStop] = useState<any | null>(null);

  const currentHub = useMemo(
    () => hubs.find((h) => h.id === selectedHubId) || hubs[0],
    [hubs, selectedHubId]
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [eligibleRes, tripsRes, vehRes, drvRes, completedRes, coldAssetRes, coldAlertRes] = await Promise.all([
        fleetDispatchApi.getEligibleOutboundContracts(selectedHubId),
        fleetDispatchApi.getOutboundTrips(selectedHubId),
        fleetDispatchApi.getVehicles(selectedHubId, 'AVAILABLE'),
        fleetDispatchApi.getDrivers(selectedHubId, 'AVAILABLE'),
        fleetDispatchApi.getCompletedDeliveries(selectedHubId).catch(() => []),
        api<any[]>('admin/cold-assets').catch(() => []),
        api<any[]>('admin/iot/alerts').catch(() => []),
      ]);

      setEligibleContracts(Array.isArray(eligibleRes) ? eligibleRes : []);
      setTrips(Array.isArray(tripsRes) ? tripsRes : []);
      setVehicles(Array.isArray(vehRes) ? vehRes : []);
      setDrivers(Array.isArray(drvRes) ? drvRes : []);
      setCompletedDeliveries(Array.isArray(completedRes) ? completedRes : []);
      setColdAssets(Array.isArray(coldAssetRes) ? coldAssetRes : []);
      setColdAlerts(Array.isArray(coldAlertRes) ? coldAlertRes : []);
      setSelectedContractIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu điều phối Outbound');
    } finally {
      setLoading(false);
    }
  }, [selectedHubId]);

  useEffect(() => {
    loadData();
    const unsub = b2bWebSocket.subscribeDispatch(() => {
      loadData();
    });
    return () => unsub();
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      Promise.all([
        api<any[]>('admin/cold-assets').catch(() => []),
        api<any[]>('admin/iot/alerts').catch(() => []),
      ]).then(([assets, alerts]) => {
        setColdAssets(Array.isArray(assets) ? assets : []);
        setColdAlerts(Array.isArray(alerts) ? alerts : []);
      });
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  const handleAcknowledgeAlert = async (alertId: number) => {
    const note = window.prompt('Ghi chú tiếp nhận cảnh báo:', 'Đã liên hệ tài xế và kiểm tra hệ thống làm lạnh.');
    if (note === null) return;
    try {
      await api(`admin/iot/alerts/${alertId}/acknowledge`, 'POST', { note });
      setSuccessMsg('Đã ghi nhận người tiếp nhận và thời điểm xử lý cảnh báo.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tiếp nhận cảnh báo');
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    const note = window.prompt('Mô tả biện pháp khắc phục:', 'Đã phục hồi máy lạnh, nhiệt độ trở lại ngưỡng 2°C - 6°C.');
    if (note === null) return;
    try {
      await api(`admin/iot/alerts/${alertId}/resolve`, 'POST', { note });
      setSuccessMsg('Đã đóng cảnh báo và lưu lịch sử khắc phục.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đóng cảnh báo');
    }
  };

  // Hợp đồng được chọn để gom chuyến
  const selectedContracts = useMemo(
    () => eligibleContracts.filter((c) => selectedContractIds.includes(c.contractId)),
    [eligibleContracts, selectedContractIds]
  );

  const totalSelectedWeight = useMemo(
    () => selectedContracts.reduce((sum, c) => sum + (c.qualifiedWeightKg || 0), 0),
    [selectedContracts]
  );

  const totalSelectedVolume = useMemo(
    () => selectedContracts.reduce((sum, c) => sum + (c.volumeM3 || 0), 0),
    [selectedContracts]
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  const weightLoadPct = selectedVehicle && selectedVehicle.capacityKg > 0
    ? Math.round((totalSelectedWeight / selectedVehicle.capacityKg) * 100)
    : 0;

  const volumeLoadPct = selectedVehicle && selectedVehicle.volumeM3 > 0
    ? Math.round((totalSelectedVolume / selectedVehicle.volumeM3) * 100)
    : 0;

  const toggleSelectContract = (id: number) => {
    setSelectedContractIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedContractIds.length === eligibleContracts.length) {
      setSelectedContractIds([]);
    } else {
      setSelectedContractIds(eligibleContracts.map((c) => c.contractId));
    }
  };

  // Xác nhận phân công chuyến Outbound
  const handleConfirmTrip = async () => {
    if (!selectedVehicleId || !selectedDriverId) {
      setError('Vui lòng chọn phương tiện và tài xế phụ trách');
      return;
    }
    if (selectedContractIds.length === 0) {
      setError('Vui lòng chọn ít nhất một hợp đồng để giao hàng');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const stops = selectedContracts.map((c, idx) => ({
        contractId: c.contractId,
        buyerWarehouseId: c.buyerWarehouseId,
        stopSequence: idx + 1,
        deliveryAddress: c.deliveryAddress,
        contactName: c.buyerName,
        contactPhone: c.buyerPhone,
      }));

      await fleetDispatchApi.confirmOutboundTrip(selectedHubId, {
        vehicleId: selectedVehicleId,
        driverId: selectedDriverId,
        notes: tripNotes || undefined,
        stops,
      });

      setSuccessMsg('Đã xác nhận phân công chuyến xe Outbound giao hàng thành công!');
      setSelectedContractIds([]);
      setSelectedVehicleId(null);
      setSelectedDriverId(null);
      setTripNotes('');
      setActiveTab('TRIPS');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xác nhận chuyến xe Outbound');
    } finally {
      setSubmitting(false);
    }
  };

  // Giai đoạn 8.1: Xuất bến chuyến xe Outbound
  const handleDepartTrip = async (tripId: number) => {
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.departOutboundTrip(tripId);
      setSuccessMsg('Chuyến xe Outbound đã xuất bến và đang di chuyển giao hàng cho Buyer!');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xuất bến chuyến xe');
    } finally {
      setSubmitting(false);
    }
  };

  // Giai đoạn 8.2: Ghi nhận đã tới địa điểm của điểm dừng
  const handleArriveStop = async (stopId: number) => {
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.arriveOutboundStop(stopId);
      setSuccessMsg('Đã ghi nhận xe tải lạnh đã đến địa điểm của điểm dừng!');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi ghi nhận xe đến điểm dừng');
    } finally {
      setSubmitting(false);
    }
  };

  // Giai đoạn 8.3: Mở modal và nộp ePOD tài xế
  const openDriverEpodModal = (stop: any) => {
    setDriverEpodStop(stop);
    setActualDeliveredWeight(String(stop.actualDeliveredWeightKg || stop.expectedWeightKg || 150));
    setRejectedWeight(String(stop.rejectedWeightKg || 0));
    setRejectionReason(stop.rejectionReason || '');
    setDriverNotes(stop.driverNotes || 'Bàn giao đủ số lượng, nhiệt độ buồng xe đạt chuẩn VietGAP.');
  };

  const handleSubmitDriverEpod = async () => {
    if (!driverEpodStop) return;
    const actual = parseFloat(actualDeliveredWeight);
    if (isNaN(actual) || actual <= 0) {
      setError('Khối lượng thực nhận không hợp lệ');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.submitDriverOutboundEpod(driverEpodStop.id, {
        actualDeliveredWeightKg: actual,
        rejectedWeightKg: parseFloat(rejectedWeight) || 0,
        rejectionReason: rejectionReason || undefined,
        driverSignatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        driverNotes,
        handoverPhotoUrl: 'https://images.honafresh.vn/epod/proof-handover.jpg',
      });
      setSuccessMsg('Tài xế đã hoàn tất lập biên bản bàn giao ePOD! Đang chờ Buyer kiểm đếm và ký nhận.');
      setDriverEpodStop(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi nộp biên bản bàn giao ePOD');
    } finally {
      setSubmitting(false);
    }
  };

  // Giai đoạn 8.4: Mở modal và Buyer ký nhận hàng
  const openBuyerConfirmModal = (stop: any) => {
    setBuyerConfirmStop(stop);
    setBuyerSignerName(stop.contactNameSnapshot || 'Trần Thị Thương (Kho Nachy)');
    setBuyerSignerPhone(stop.contactPhoneSnapshot || '0987654321');
    setBuyerNotes(stop.buyerNotes || 'Đã kiểm tra tem niêm phong và nhận đủ 150 kg Lá É đạt chuẩn VietGAP.');
  };

  const handleBuyerConfirmEpod = async () => {
    if (!buyerConfirmStop) return;
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.confirmBuyerEpod(buyerConfirmStop.id, {
        buyerSignerName,
        buyerSignerPhone,
        buyerSignatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        buyerNotes,
      });
      setSuccessMsg('Buyer đã ký nhận hàng thành công! Hợp đồng đã chuyển sang trạng thái ĐÃ GIAO (DELIVERED).');
      setBuyerConfirmStop(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi Buyer ký nhận hàng');
    } finally {
      setSubmitting(false);
    }
  };

  // Giai đoạn 9.1: Lấy thông tin thanh toán nốt 70% còn lại
  const openSettlementModal = async (contractId: number) => {
    try {
      setSubmitting(true);
      setError(null);
      const quote = await fleetDispatchApi.getSettlementQuote(contractId);
      setSettlementQuote(quote);
      setSettlementBankRef('TT70-' + Date.now().toString().slice(-6));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được báo giá quyết toán');
    } finally {
      setSubmitting(false);
    }
  };

  // Giai đoạn 9.2: Xác nhận thanh toán nốt 70% & Hoàn tất hợp đồng
  const handleConfirmSettlement = async () => {
    if (!settlementQuote) return;
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.confirmSettlement(settlementQuote.contractId, {
        reference: settlementBankRef,
        farmerBankName: 'Vietcombank',
        farmerBankAccount: '0123456789',
        farmerBankOwner: 'NGUYEN VAN NONG',
      });
      setSuccessMsg('Đã thanh toán nốt 70% và hoàn tất quyết toán hợp đồng (SETTLED) thành công!');
      setSettlementQuote(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi quyết toán hợp đồng');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở hóa đơn / chứng từ quyết toán
  const openInvoiceModal = (stop: any) => {
    const contractCode = stop.contractCode || `HĐ-${stop.contractId}`;
    const buyerName = stop.contactNameSnapshot || 'Kho Buyer';
    const weight = stop.actualDeliveredWeightKg || stop.expectedWeightKg || 150;
    const price = 45000;
    const total = weight * price;
    const deposit = Math.round(total * 0.3);
    const balance = total - deposit;

    setInvoiceHtml(`
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 2px solid #10542c; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #10542c; margin: 0; font-size: 20px;">HỆ THỐNG NÔNG SẢN B2B HONA FRESH</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">CHỨNG TỪ QUYẾT TOÁN TÀI CHÍNH & BIÊN BẢN BÀN GIAO</p>
        </div>
        <div style="font-size: 13px; margin-bottom: 16px; line-height: 1.6;">
          <p><strong>Mã hợp đồng:</strong> <span style="color: #10542c; font-family: monospace;">${contractCode}</span></p>
          <p><strong>Khách hàng (Buyer):</strong> ${buyerName}</p>
          <p><strong>Địa chỉ kho nhận:</strong> ${stop.deliveryAddressSnapshot || 'Kho Buyer tiếp nhận'}</p>
          <p><strong>Sản phẩm nông sản:</strong> Lá É Phú Yên VietGAP</p>
          <p><strong>Khối lượng thực nhận (Q4):</strong> <strong>${weight} kg</strong></p>
          <p><strong>Đơn giá:</strong> 45.000 VNĐ / kg</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
          <tr style="background: #f1f5f9;">
            <th style="padding: 10px; text-align: left; border: 1px solid #cbd5e1;">Hạng mục hạch toán</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">Số tiền (VNĐ)</th>
          </tr>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Tổng giá trị hàng thực nhận (150 kg)</td>
            <td style="padding: 8px 10px; text-align: right; border: 1px solid #cbd5e1; font-weight: bold;">${total.toLocaleString('vi-VN')} đ</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Đã thanh toán ký quỹ cọc (30%)</td>
            <td style="padding: 8px 10px; text-align: right; border: 1px solid #cbd5e1; color: #10542c;">- ${deposit.toLocaleString('vi-VN')} đ</td>
          </tr>
          <tr style="background: #ecfdf5; font-weight: bold;">
            <td style="padding: 10px; border: 1px solid #cbd5e1; color: #047857;">Số tiền còn lại đã thanh toán (70%)</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #cbd5e1; color: #047857; font-size: 14px;">${balance.toLocaleString('vi-VN')} đ</td>
          </tr>
        </table>
        <div style="text-align: center; padding: 14px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; font-size: 12px;">
          <span style="color: #047857; font-weight: bold; font-size: 13px;">✓ ĐÃ QUYẾT TOÁN HOÀN TẤT 100% (TRẠNG THÁI: SETTLED)</span>
          <p style="margin: 6px 0 0; color: #64748b; font-size: 11px;">Bút toán kế toán: Nợ TK 112 / Có TK 3388 -> Đã giải ngân Payout cho Nhà vườn</p>
        </div>
      </div>
    `);
  };

  // Hủy chuyến Outbound
  const handleCancelTrip = async () => {
    if (!cancellingTrip) return;
    try {
      setSubmitting(true);
      setError(null);
      await fleetDispatchApi.cancelOutboundTrip(cancellingTrip.id, cancelReason);
      setSuccessMsg(`Đã hủy chuyến ${cancellingTrip.tripCode} và giải phóng phương tiện thành công.`);
      setCancellingTrip(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi hủy chuyến xe Outbound');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. BANNER HEADER ĐIỀU PHỐI OUTBOUND */}
      <div className="bg-gradient-to-r from-[#10542C] via-[#166534] to-[#0B381E] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Truck className="w-4 h-4 text-emerald-300 animate-pulse" />
              <span>Điều phối · Chuỗi lạnh · ePOD · Thanh toán</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
              <Navigation className="w-7 h-7 text-[#8BC34A]" /> Điều Phối Giao Buyer & Hoàn Tất Đơn Hàng
            </h1>
            <p className="text-xs text-white/80 mt-1 max-w-2xl">
              Theo dõi tập trung từ lúc lô đạt QC và xuất kho, vận chuyển chuỗi lạnh, bàn giao ePOD, Buyer ký nhận đến khi thanh toán và quyết toán hoàn tất.
            </p>
          </div>

          {/* Nút hành động nhanh */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/qc"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1.5 border border-white/20"
            >
              <Warehouse className="w-4 h-4 text-emerald-300" />
              <span>Trạm QC & FEFO</span>
            </Link>

            <Link
              href="/admin/inbound-dispatch"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1.5 border border-white/20"
            >
              <Boxes className="w-4 h-4 text-emerald-300" />
              <span>Lấy Hàng Rẫy (Inbound)</span>
            </Link>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 transition cursor-pointer flex items-center gap-1"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-xs font-bold text-white">Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Trung tâm giám sát hợp nhất: thay thế hai module IoT và Phiếu giao hàng cũ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Đang điều phối / vận chuyển</p>
          <p className="mt-1 text-2xl font-black text-blue-900">
            {trips.filter((trip) => ['ASSIGNED', 'ON_DELIVERY'].includes(trip.status)).length}
          </p>
          <p className="text-[11px] text-blue-700">chuyến cần theo dõi liên tục</p>
        </div>
        <div className={`rounded-2xl border p-4 ${coldAssets.some((asset) => asset.status === 'TEMP_WARNING' || Number(asset.current_temp) < 2 || Number(asset.current_temp) > 6) ? 'border-rose-300 bg-rose-50' : 'border-emerald-200 bg-emerald-50/70'}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Cảm biến chuỗi lạnh</p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {coldAssets.filter((asset) => asset.asset_type === 'REFRIGERATED_TRUCK').length}
          </p>
          <p className="text-[11px] text-slate-600">
            {coldAssets.some((asset) => asset.status === 'TEMP_WARNING' || Number(asset.current_temp) < 2 || Number(asset.current_temp) > 6)
              ? 'Có thiết bị vượt ngưỡng 2°C - 6°C'
              : 'Tự động làm mới mỗi 10 giây'}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Chờ bàn giao / ký ePOD</p>
          <p className="mt-1 text-2xl font-black text-amber-900">
            {trips.flatMap((trip) => trip.stops || []).filter((stop) => ['ARRIVED', 'PENDING_BUYER_CONFIRMATION'].includes(stop.status)).length}
          </p>
          <p className="text-[11px] text-amber-700">điểm giao cần xử lý</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Chờ thanh toán cuối</p>
          <p className="mt-1 text-2xl font-black text-violet-900">
            {completedDeliveries.filter((stop) => stop.contract?.status !== 'SETTLED').length}
          </p>
          <p className="text-[11px] text-violet-700">đơn đã nhận nhưng chưa quyết toán</p>
        </div>
      </div>

      {coldAssets.filter((asset) => asset.asset_type === 'REFRIGERATED_TRUCK').length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-[#10542C]" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Giám sát nhiệt độ xe lạnh đang phục vụ giao Buyer</h2>
            </div>
            <span className="text-[10px] text-slate-500">Ngưỡng an toàn 2°C - 6°C</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {coldAssets.filter((asset) => asset.asset_type === 'REFRIGERATED_TRUCK').map((asset) => {
              const temperature = Number(asset.current_temp || 0);
              const warning = asset.status === 'TEMP_WARNING' || temperature < 2 || temperature > 6;
              return (
                <div key={asset.id} className={`min-w-56 rounded-xl border px-3 py-2.5 ${warning ? 'border-rose-300 bg-rose-50' : 'border-emerald-200 bg-emerald-50/50'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-800">{asset.asset_code}</span>
                    <span className={`text-[10px] font-bold ${warning ? 'text-rose-700' : 'text-emerald-700'}`}>{warning ? 'CẢNH BÁO' : 'AN TOÀN'}</span>
                  </div>
                  <p className={`mt-1 text-lg font-black ${warning ? 'text-rose-700' : 'text-emerald-800'}`}>{temperature.toFixed(1)}°C</p>
                  <p className="text-[10px] text-slate-500">Độ ẩm {Number(asset.current_humidity || 0).toFixed(0)}% · {asset.asset_name}</p>
                  <div className="flex gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => void api('admin/iot/inject-fault', 'POST', { assetId: asset.id, mode: 'TEMP_SPIKE' }).then(loadData).catch((err) => setError(err instanceof Error ? err.message : 'Không tạo được cảnh báo thử'))}
                      className="px-2 py-1 rounded-md border border-rose-200 bg-white text-rose-700 text-[10px] font-bold"
                    >
                      Kiểm thử cảnh báo
                    </button>
                    <button
                      type="button"
                      onClick={() => void api('admin/iot/reset-fault', 'POST', { assetId: asset.id }).then(loadData).catch((err) => setError(err instanceof Error ? err.message : 'Không phục hồi được cảm biến'))}
                      className="px-2 py-1 rounded-md border border-emerald-200 bg-white text-emerald-700 text-[10px] font-bold"
                    >
                      Phục hồi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {coldAlerts.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Nhật ký xử lý cảnh báo chuỗi lạnh</h2>
              <p className="text-[11px] text-slate-500">Lưu người tiếp nhận, thời gian và biện pháp khắc phục; cảnh báo chỉ đóng khi thiết bị đã về ngưỡng an toàn.</p>
            </div>
            <span className="text-[11px] font-bold text-rose-700">{coldAlerts.filter((alert) => alert.status !== 'RESOLVED').length} cảnh báo chưa đóng</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {coldAlerts.slice(0, 20).map((alert) => (
              <div key={alert.id} className={`rounded-xl border p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${alert.status === 'RESOLVED' ? 'border-slate-200 bg-slate-50' : alert.status === 'ACKNOWLEDGED' ? 'border-amber-200 bg-amber-50/60' : 'border-rose-300 bg-rose-50/70'}`}>
                <div className="min-w-0 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{alert.asset_code}</span>
                    <span className="font-mono text-[10px] text-slate-500">{alert.contract_code || 'Chưa gắn hợp đồng'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${alert.status === 'RESOLVED' ? 'bg-slate-200 text-slate-700' : alert.status === 'ACKNOWLEDGED' ? 'bg-amber-200 text-amber-900' : 'bg-rose-200 text-rose-900'}`}>{alert.status}</span>
                  </div>
                  <p className="font-semibold text-slate-800 mt-1">{alert.alert_message}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Tạo lúc {alert.created_at ? new Date(alert.created_at).toLocaleString('vi-VN') : '—'}
                    {alert.acknowledged_by_name ? ` · Tiếp nhận: ${alert.acknowledged_by_name}` : ''}
                    {alert.resolved_by_name ? ` · Khắc phục: ${alert.resolved_by_name}` : ''}
                  </p>
                  {(alert.acknowledge_note || alert.resolution_note) && <p className="text-[11px] text-slate-600 mt-1">{alert.resolution_note || alert.acknowledge_note}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {alert.status === 'OPEN' && (
                    <button type="button" onClick={() => void handleAcknowledgeAlert(Number(alert.id))} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-bold">Tiếp nhận</button>
                  )}
                  {alert.status !== 'RESOLVED' && (
                    <button type="button" onClick={() => void handleResolveAlert(Number(alert.id))} className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-bold">Xác nhận khắc phục</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. THANH CHỌN TRẠM TRUNG CHUYỂN (5 HUB CHÍNH THỨC) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <MapPin className="w-4 h-4 text-[#10542C]" />
            <span>Mạng Lưới 5 Trạm Trung Chuyển Lạnh — Xuất Phát Chặng Outbound</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Đang chọn: <strong className="text-[#10542C]">{currentHub.hubName}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {hubs.map((hub) => {
            const isSelected = hub.id === selectedHubId;
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => setSelectedHubId(hub.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#10542C] bg-emerald-50/50 shadow-xs ring-2 ring-[#10542C]/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-[#10542C] text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {hub.hubCode}
                  </span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />}
                </div>
                <strong className="text-xs font-bold text-slate-900 block mt-2 line-clamp-1">
                  {hub.hubName}
                </strong>
                <span className="text-[11px] text-slate-500 block mt-0.5 line-clamp-1">{hub.address}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-5">
        {/* Banner thông báo */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 font-bold">×</button>
          </div>
        )}

        {/* 4. TAB 3: DANH SÁCH ĐƠN HÀNG ĐÃ KÝ NHẬN & QUYẾT TOÁN HOÀN TẤT */}
        {activeTab === 'COMPLETED' && (
          <div className="space-y-4">
            {completedDeliveries.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  Chưa có đơn hàng nào hoàn tất tại {currentHub.hubName}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Khi tài xế giao hàng đến kho Buyer, Buyer kiểm đếm và ký nhận biên bản điện tử ePOD, đơn hàng sẽ hiển thị tại đây kèm biên bản và chứng từ quyết toán.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-xs">
                  <span className="font-bold text-slate-700">
                    Tổng cộng: <strong className="text-emerald-800 font-mono text-sm">{completedDeliveries.length}</strong> đơn hàng đã ký nhận & hoàn tất bàn giao
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Sắp xếp theo thời gian ký nhận gần nhất
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {completedDeliveries.map((stop) => {
                    const isContractSettled = stop.contract?.status === 'SETTLED' || stop.contract?.fulfillmentStatus === 'SETTLED';
                    const weight = stop.actualDeliveredWeightKg || stop.expectedWeightKg || 150;
                    return (
                      <div
                        key={stop.id}
                        className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-xs space-y-4 hover:border-emerald-300 transition"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-[#10542C] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                  {stop.contractCode || stop.contract?.contractCode || `HĐ-${stop.contractId}`}
                                </span>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  {isContractSettled ? '✓ ĐÃ QUYẾT TOÁN 100% (SETTLED)' : '✓ BUYER ĐÃ KÝ NHẬN (DELIVERED)'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 mt-0.5 block">
                                Thời điểm ký nhận: {stop.buyerConfirmedAt ? new Date(stop.buyerConfirmedAt).toLocaleString('vi-VN') : 'Đã xác nhận'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setViewEpodStop(stop)}
                              className="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            >
                              <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Xem Biên Bản ePOD</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openInvoiceModal(stop)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#10542C] hover:bg-[#0B381E] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Xem Chứng Từ Quyết Toán B2B</span>
                            </button>
                          </div>
                        </div>

                        {/* Chi tiết người nhận, địa chỉ, khối lượng Q4 */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Khách Hàng (Buyer)</span>
                            <strong className="text-slate-900 block">{stop.contactNameSnapshot || stop.contract?.buyerName || 'Kho Buyer'}</strong>
                            <span className="text-slate-500 font-mono text-[11px] block">{stop.contactPhoneSnapshot || '0987654321'}</span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kho Tiếp Nhận</span>
                            <span className="text-slate-700 text-[11px] line-clamp-2 block">{stop.deliveryAddressSnapshot}</span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sản Phẩm & Khối Lượng</span>
                            <strong className="text-slate-900 block">Lá É Phú Yên VietGAP</strong>
                            <span className="text-emerald-800 font-mono font-bold text-xs block">Thực nhận Q4: {weight} kg</span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vận Chuyển & Ký Nhận</span>
                            <span className="text-slate-700 font-mono block">Chuyến: {(stop as any).tripCode || 'Chuyến Outbound'}</span>
                            <span className="text-slate-500 text-[11px] block">Người ký: {stop.buyerSignerName || 'Đại diện kho'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 font-bold">×</button>
          </div>
        )}

        {/* 4. TAB 3: DANH SÁCH ĐƠN HÀNG ĐÃ KÝ NHẬN & QUYẾT TOÁN HOÀN TẤT */}
        {activeTab === 'COMPLETED' && (
          <div className="space-y-4">
            {completedDeliveries.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  Chưa có đơn hàng nào hoàn tất tại {currentHub.hubName}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Khi tài xế giao hàng đến kho Buyer, Buyer kiểm đếm và ký nhận biên bản điện tử ePOD, đơn hàng sẽ hiển thị tại đây kèm biên bản và chứng từ quyết toán.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-xs">
                  <span className="font-bold text-slate-700">
                    Tổng cộng: <strong className="text-emerald-800 font-mono text-sm">{completedDeliveries.length}</strong> đơn hàng đã ký nhận & hoàn tất bàn giao
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Sắp xếp theo thời gian ký nhận gần nhất
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {completedDeliveries.map((stop) => {
                    const isContractSettled = stop.contract?.status === 'SETTLED' || stop.contract?.fulfillmentStatus === 'SETTLED';
                    const weight = stop.actualDeliveredWeightKg || stop.expectedWeightKg || 150;
                    return (
                      <div
                        key={stop.id}
                        className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-xs space-y-4 hover:border-emerald-300 transition"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-[#10542C] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                  {stop.contractCode || stop.contract?.contractCode || `HĐ-${stop.contractId}`}
                                </span>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  {isContractSettled ? '✓ ĐÃ QUYẾT TOÁN 100% (SETTLED)' : '✓ BUYER ĐÃ KÝ NHẬN (DELIVERED)'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 mt-0.5 block">
                                Thời điểm ký nhận: {stop.buyerConfirmedAt ? new Date(stop.buyerConfirmedAt).toLocaleString('vi-VN') : 'Đã xác nhận'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setViewEpodStop(stop)}
                              className="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            >
                              <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Xem Biên Bản ePOD</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openInvoiceModal(stop)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#10542C] hover:bg-[#0B381E] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Xem Chứng Từ Quyết Toán B2B</span>
                            </button>
                          </div>
                        </div>

                        {/* Chi tiết người nhận, địa chỉ, khối lượng Q4 */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Khách Hàng (Buyer)</span>
                            <strong className="text-slate-900 block">{stop.contactNameSnapshot || stop.contract?.buyerName || 'Kho Buyer'}</strong>
                            <span className="text-slate-500 font-mono text-[11px] block">{stop.contactPhoneSnapshot || '0987654321'}</span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kho Tiếp Nhận</span>
                            <span className="text-slate-700 text-[11px] line-clamp-2 block">{stop.deliveryAddressSnapshot}</span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sản Phẩm & Khối Lượng</span>
                            <strong className="text-slate-900 block">Lá É Phú Yên VietGAP</strong>
                            <span className="text-emerald-800 font-mono font-bold text-xs block">Thực nhận Q4: {weight} kg</span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vận Chuyển & Ký Nhận</span>
                            <span className="text-slate-700 font-mono block">Chuyến: {(stop as any).tripCode || 'Chuyến Outbound'}</span>
                            <span className="text-slate-500 text-[11px] block">Người ký: {stop.buyerSignerName || 'Đại diện kho'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab selector */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('ELIGIBLE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'ELIGIBLE'
                ? 'bg-[#10542C] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Chờ Xuất Kho ({eligibleContracts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TRIPS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'TRIPS'
                ? 'bg-[#10542C] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Route className="w-4 h-4" />
            <span>Giám Sát Giao & Chuỗi Lạnh ({trips.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'COMPLETED'
                ? 'bg-[#10542C] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Đã Nhận & Thanh Toán ({completedDeliveries.length})</span>
          </button>
        </div>

        {/* 2. TAB 1: DANH SÁCH LÔ SẴN SÀNG GIAO & GHÉP CHUYẾN (MULTI) */}
        {activeTab === 'ELIGIBLE' && (
          <div className="space-y-4">
            {eligibleContracts.length === 0 ? (
              <div className="space-y-4">
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                  <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800">
                    Không có lô hàng mới đang chờ ghép chuyến tại {currentHub.hubName}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Tất cả các lô hàng nông sản đã kiểm định QC tại Trạm đều đã được phân công Outbound hoặc đã giao hoàn tất cho Thương lái.
                  </p>
                </div>

                {/* Danh sách các đơn vừa ký nhận hoàn tất gần đây */}
                {completedDeliveries.length > 0 && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                            Đơn Hàng Đã Ký Nhận & Quyết Toán Hoàn Tất Tại {currentHub.hubName} ({completedDeliveries.length})
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            Hàng hóa đã được tài xế giao tận kho Buyer, hoàn tất ký số điện tử ePOD và thanh toán 100%
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('COMPLETED')}
                        className="text-xs font-bold text-[#10542C] hover:underline cursor-pointer"
                      >
                        Xem tất cả lịch sử ({completedDeliveries.length}) →
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {completedDeliveries.slice(0, 4).map((stop) => {
                        const isContractSettled = stop.contract?.status === 'SETTLED' || stop.contract?.fulfillmentStatus === 'SETTLED';
                        return (
                          <div
                            key={stop.id}
                            className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-2xl space-y-2.5 transition hover:shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-xs text-[#10542C] bg-white px-2.5 py-0.5 rounded-md border border-emerald-300">
                                {stop.contractCode || stop.contract?.contractCode || `HĐ-${stop.contractId}`}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                {isContractSettled ? '✓ ĐÃ QUYẾT TOÁN 100% (SETTLED)' : '✓ BUYER ĐÃ KÝ NHẬN (DELIVERED)'}
                              </span>
                            </div>

                            <div className="text-xs text-slate-700 space-y-1">
                              <p><strong>Khách hàng:</strong> {stop.contactNameSnapshot || stop.contract?.buyerName || 'Kho Buyer'}</p>
                              <p className="text-slate-500 text-[11px] truncate">
                                <strong>Kho nhận:</strong> {stop.deliveryAddressSnapshot}
                              </p>
                              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                                <span>Khối lượng thực nhận (Q4):</span>
                                <strong className="font-mono text-emerald-900 text-xs">
                                  {stop.actualDeliveredWeightKg || stop.expectedWeightKg} kg
                                </strong>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => setViewEpodStop(stop)}
                                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                              >
                                <PenTool className="w-3.5 h-3.5" />
                                <span>Xem Biên Bản ePOD</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openInvoiceModal(stop)}
                                className="text-xs font-bold text-[#10542C] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Chứng Từ B2B</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Cột trái (2/3): Danh sách hợp đồng */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between px-1 text-xs text-slate-600 font-bold">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="flex items-center gap-2 hover:text-slate-900 cursor-pointer"
                    >
                      {selectedContractIds.length === eligibleContracts.length ? (
                        <CheckSquare className="w-4 h-4 text-[#10542C]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>
                        Chọn tất cả ({selectedContractIds.length}/{eligibleContracts.length} hợp đồng)
                      </span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {eligibleContracts.map((c) => {
                      const isSelected = selectedContractIds.includes(c.contractId);
                      return (
                        <div
                          key={c.contractId}
                          onClick={() => toggleSelectContract(c.contractId)}
                          className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-xs space-y-3 ${
                            isSelected
                              ? 'border-[#10542C] bg-emerald-50/30 ring-2 ring-emerald-100'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="pt-0.5">
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-[#10542C]" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-300" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-900 text-sm">
                                    {c.contractCode}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    QC ĐẠT
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-emerald-950">{c.productName}</h4>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-mono font-black text-emerald-800 text-base">
                                {c.qualifiedWeightKg} kg
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                ~{c.volumeM3} m³ ({c.packageCount} kiện)
                              </span>
                            </div>
                          </div>

                          {/* Thông tin kho Buyer & vị trí lưu mát */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Thương Lái & Kho Nhận
                              </span>
                              <strong className="text-slate-900 block truncate">{c.buyerName}</strong>
                              <p className="text-[11px] text-slate-600 truncate">{c.deliveryAddress}</p>
                              <span className="text-[10px] font-mono text-emerald-800 font-bold block">
                                SĐT: {c.buyerPhone}
                              </span>
                            </div>

                            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Vị Trí Lưu Kho Mát Tại Hub
                              </span>
                              <strong className="text-slate-900 block">{c.coldZone}</strong>
                              <span className="text-[11px] font-mono text-blue-800 font-bold block">
                                Kệ/Ô: {c.rackBin}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cột phải (1/3): Form ghép chuyến Outbound (MULTI stops) */}
                <div className="space-y-4">
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4 sticky top-20">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <Truck className="w-5 h-5 text-[#10542C]" />
                      <h3 className="font-bold text-sm text-slate-900">
                        Thiết Lập Chuyến Xe Outbound
                      </h3>
                    </div>

                    {/* Tóm tắt lô đã chọn */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Hợp đồng đã chọn:</span>
                        <strong className="font-mono text-slate-900">{selectedContracts.length} đơn</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Tổng khối lượng:</span>
                        <strong className="font-mono text-emerald-800 text-sm">{totalSelectedWeight} kg</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Tổng thể tích:</span>
                        <strong className="font-mono text-blue-800">{totalSelectedVolume.toFixed(2)} m³</strong>
                      </div>
                    </div>

                    {/* Chọn xe */}
                    <div className="space-y-1 text-xs">
                      <label className="font-bold text-slate-700 block">
                        Chọn xe tải lạnh trực thuộc {currentHub.hubName} *
                      </label>
                      <select
                        value={selectedVehicleId || ''}
                        onChange={(e) => setSelectedVehicleId(Number(e.target.value) || null)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-emerald-600"
                      >
                        <option value="">-- Chọn xe tải sẵn sàng --</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.plateNumber} ({v.vehicleModel}) — Tối đa: {v.capacityKg} kg / {v.volumeM3} m³
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Chọn tài xế */}
                    <div className="space-y-1 text-xs">
                      <label className="font-bold text-slate-700 block">
                        Chọn tài xế phụ trách *
                      </label>
                      <select
                        value={selectedDriverId || ''}
                        onChange={(e) => setSelectedDriverId(Number(e.target.value) || null)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-emerald-600"
                      >
                        <option value="">-- Chọn tài xế sẵn sàng --</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.fullName} (Bằng {d.licenseClass}) — {d.phone}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Thước đo kép tải trọng & thể tích */}
                    {selectedVehicle && (
                      <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2 text-xs">
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span>Tải trọng (kg):</span>
                            <span className={weightLoadPct > 100 ? 'text-rose-600' : 'text-emerald-800'}>
                              {totalSelectedWeight}/{selectedVehicle.capacityKg} kg ({weightLoadPct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all ${
                                weightLoadPct > 100 ? 'bg-rose-600' : 'bg-emerald-600'
                              }`}
                              style={{ width: `${Math.min(weightLoadPct, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span>Thể tích (m³):</span>
                            <span className={volumeLoadPct > 100 ? 'text-rose-600' : 'text-blue-800'}>
                              {totalSelectedVolume.toFixed(2)}/{selectedVehicle.volumeM3} m³ ({volumeLoadPct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all ${
                                volumeLoadPct > 100 ? 'bg-rose-600' : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.min(volumeLoadPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ghi chú */}
                    <div className="space-y-1 text-xs">
                      <label className="font-bold text-slate-700 block">Ghi chú chuyến xe</label>
                      <textarea
                        rows={2}
                        value={tripNotes}
                        onChange={(e) => setTripNotes(e.target.value)}
                        placeholder="Ví dụ: Ưu tiên giao trước kho Thủ Đức..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-emerald-600"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmTrip}
                      disabled={submitting || selectedContractIds.length === 0 || !selectedVehicleId || !selectedDriverId}
                      className="w-full py-2.5 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Xác Nhận Phân Công Chuyến</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. TAB 2: DANH SÁCH CHUYẾN XE OUTBOUND ĐÃ PHÂN CÔNG */}
        {activeTab === 'TRIPS' && (
          <div className="space-y-4">
            {trips.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                <Route className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  Chưa có chuyến Outbound nào được tạo tại {currentHub.hubName}
                </h3>
              </div>
            ) : (
              <div className="space-y-4">
                {trips.map((trip) => {
                  const isCancelled = trip.status === 'CANCELLED';
                  const isCompleted = trip.status === 'COMPLETED';
                  const canCancel = trip.status === 'ASSIGNED';

                  const stops = trip.stops || [];
                  const confirmedStops = stops.filter((s) => s.status === 'BUYER_CONFIRMED').length;
                  const progressPct = stops.length > 0 ? Math.round((confirmedStops / stops.length) * 100) : 0;

                  return (
                    <div
                      key={trip.id}
                      className={`bg-white rounded-3xl p-5 border transition-all shadow-xs space-y-4 ${
                        isCancelled
                          ? 'border-rose-200 bg-rose-50/20 opacity-80'
                          : isCompleted
                          ? 'border-emerald-200 bg-emerald-50/10'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Header Chuyến */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                            isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-slate-900">{trip.tripCode}</span>
                              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : isCancelled
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : trip.status === 'ON_DELIVERY'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {isCompleted
                                  ? 'HOÀN TẤT GIAO HÀNG'
                                  : isCancelled
                                  ? 'ĐÃ HỦY CHUYẾN'
                                  : trip.status === 'ON_DELIVERY'
                                  ? 'ĐANG GIAO HÀNG TRÊN ĐƯỜNG'
                                  : 'ĐÃ PHÂN CÔNG (CHỜ XUẤT BẾN)'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              Khởi tạo: {trip.createdAt ? new Date(trip.createdAt).toLocaleString('vi-VN') : 'Mới tạo'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {trip.status === 'ASSIGNED' && (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold">
                              <Truck className="w-3.5 h-3.5" />
                              <span>Chờ tài xế xác nhận xuất bến</span>
                            </span>
                          )}

                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancellingTrip(trip);
                                setCancelReason('Xe gặp sự cố kỹ thuật hoặc thay đổi lịch kho');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Hủy Chuyến</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Thông tin Xe, Tài xế, Tiến độ */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Xe Giao Hàng</span>
                          <strong className="text-slate-900 font-mono">{trip.vehicle?.plateNumber}</strong>
                          <span className="text-slate-500 text-[11px] block">({trip.vehicle?.vehicleModel})</span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tài Xế Phụ Trách</span>
                          <strong className="text-slate-900 block">{trip.driver?.fullName}</strong>
                          <span className="text-slate-600 font-mono text-[11px] block">{trip.driver?.phone}</span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Tải Chuyến</span>
                          <strong className="font-mono text-emerald-800 block text-sm">{trip.totalLoadedWeightKg} kg</strong>
                          <span className="text-[11px] text-slate-500 block">{stops.length} điểm kho Buyer</span>
                        </div>
                      </div>

                      {/* Tiến độ giao hàng */}
                      {!isCancelled && (
                        <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-semibold">
                              Tiến độ giao nhận: <strong className="text-[#10542C] font-mono">{confirmedStops}/{stops.length} kho đã ký nhận</strong>
                            </span>
                            <span className="font-mono font-bold text-emerald-800">{progressPct}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Danh sách điểm dừng kho Buyer (MULTI) */}
                      {stops.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Chi tiết các điểm dừng giao hàng ({stops.length} kho Thương Lái)
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Quy trình: Đến điểm dừng $\rightarrow$ Tài xế lập ePOD $\rightarrow$ Buyer ký nhận $\rightarrow$ Quyết toán 70%
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            {stops.map((stop) => {
                              const isContractSettled = stop.contract?.status === 'SETTLED' || stop.contract?.fulfillmentStatus === 'SETTLED';
                              const isStopConfirmed = stop.status === 'BUYER_CONFIRMED' || isContractSettled;
                              const isStopPendingBuyer = stop.status === 'PENDING_BUYER_CONFIRMATION';
                              const isStopArrived = stop.status === 'ARRIVED';
                              const isStopAssigned = stop.status === 'ASSIGNED' || stop.status === 'PLANNED';

                              return (
                                <div
                                  key={stop.id}
                                  className={`p-4 rounded-2xl border transition-all text-xs space-y-3 ${
                                    isContractSettled
                                      ? 'border-emerald-300 bg-emerald-50/50'
                                      : isStopConfirmed
                                      ? 'border-emerald-200 bg-emerald-50/30'
                                      : isStopPendingBuyer
                                      ? 'border-amber-300 bg-amber-50/30'
                                      : isStopArrived
                                      ? 'border-blue-300 bg-blue-50/30'
                                      : 'border-slate-200 bg-slate-50/50'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`w-6 h-6 rounded-full font-mono text-xs flex items-center justify-center font-bold ${
                                        isContractSettled || isStopConfirmed ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
                                      }`}>
                                        {stop.stopSequence}
                                      </span>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <strong className="text-slate-900 text-sm">{stop.contactNameSnapshot || 'Kho Buyer'}</strong>
                                          <span className="text-slate-500 font-mono text-xs">({stop.contactPhoneSnapshot || '0987654321'})</span>
                                          <span className="font-mono text-xs font-bold text-[#10542C] bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                                            {stop.contractCode || `HĐ-${stop.contractId}`}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span>{stop.deliveryAddressSnapshot}</span>
                                        </p>
                                      </div>
                                    </div>

                                    {/* Trạng thái điểm dừng */}
                                    <div className="text-right">
                                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                        isContractSettled
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold'
                                          : isStopConfirmed
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                          : isStopPendingBuyer
                                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                                          : isStopArrived
                                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                                          : 'bg-slate-100 text-slate-700 border-slate-300'
                                      }`}>
                                        {isContractSettled
                                          ? '✓ GĐ 9: ĐÃ QUYẾT TOÁN HOÀN TẤT (SETTLED)'
                                          : isStopConfirmed
                                          ? 'GĐ 8.4: BUYER ĐÃ KÝ NHẬN HÀNG (DELIVERED)'
                                          : isStopPendingBuyer
                                          ? 'GĐ 8.3: TÀI XẾ ĐÃ NỘP EPOD - CHỜ BUYER KÝ'
                                          : isStopArrived
                                          ? 'GĐ 8.2: XE ĐÃ ĐẾN ĐỊA ĐIỂM KHO'
                                          : 'GĐ 8.1: ĐANG TRÊN ĐƯỜNG ĐẾN ĐIỂM DỪNG'}
                                      </span>
                                      <div className="text-[11px] text-slate-500 mt-1">
                                        Khối lượng: <strong className="font-mono text-slate-900">{stop.actualDeliveredWeightKg || stop.expectedWeightKg} kg</strong>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Admin chỉ giám sát; thao tác nghiệp vụ thuộc đúng cổng Driver/Buyer. */}
                                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60">
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs">
                                      {isStopAssigned || isStopArrived ? 'Thao tác tiếp theo: Tài xế thực hiện tại Portal Tài xế' : isStopPendingBuyer ? 'Thao tác tiếp theo: Buyer ký nhận tại Portal Buyer' : isStopConfirmed && !isContractSettled ? 'Thao tác tiếp theo: Buyer thanh toán phần còn lại' : 'Admin đang giám sát trạng thái'}
                                    </span>

                                    {/* Trạng thái đã quyết toán 100% */}
                                    {isContractSettled && (
                                      <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-xs flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Đã Quyết Toán 100% (SETTLED)</span>
                                      </span>
                                    )}

                                    {/* Xem chứng từ hóa đơn B2B */}
                                    {(isStopConfirmed || isContractSettled) && (
                                      <button
                                        type="button"
                                        onClick={() => openInvoiceModal(stop)}
                                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ml-auto"
                                      >
                                        <Receipt className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Xem Chứng Từ Quyết Toán B2B</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. TAB 3: DANH SÁCH ĐƠN HÀNG ĐÃ KÝ NHẬN & QUYẾT TOÁN HOÀN TẤT */}
        {activeTab === 'COMPLETED' && (
          <div className="space-y-4">
            {completedDeliveries.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  Chưa có đơn hàng nào hoàn tất tại {currentHub.hubName}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Khi tài xế giao hàng đến kho Buyer, Buyer kiểm đếm và ký nhận biên bản điện tử ePOD, đơn hàng sẽ hiển thị tại đây kèm biên bản và chứng từ quyết toán.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-xs">
                  <span className="font-bold text-slate-700">
                    Tổng cộng: <strong className="text-emerald-800 font-mono text-sm">{completedDeliveries.length}</strong> đơn hàng đã ký nhận & hoàn tất bàn giao
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Sắp xếp theo thời gian ký nhận gần nhất
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {completedDeliveries.map((stop) => {
                    const isContractSettled = stop.contract?.status === 'SETTLED' || stop.contract?.fulfillmentStatus === 'SETTLED';
                    const weight = stop.actualDeliveredWeightKg || stop.expectedWeightKg || 150;
                    return (
                      <div
                        key={stop.id}
                        className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-xs space-y-4 hover:border-emerald-300 transition"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-[#10542C] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                  {stop.contractCode || stop.contract?.contractCode || `HĐ-${stop.contractId}`}
                                </span>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  {isContractSettled ? '✓ ĐÃ QUYẾT TOÁN 100% (SETTLED)' : '✓ BUYER ĐÃ KÝ NHẬN (DELIVERED)'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 mt-0.5 block">
                                Thời điểm ký nhận: {stop.buyerConfirmedAt ? new Date(stop.buyerConfirmedAt).toLocaleString('vi-VN') : 'Đã xác nhận'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setViewEpodStop(stop)}
                              className="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            >
                              <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Xem Biên Bản ePOD</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openInvoiceModal(stop)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#10542C] hover:bg-[#0B381E] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Xem Chứng Từ Quyết Toán B2B</span>
                            </button>
                          </div>
                        </div>

                        {/* Chi tiết người nhận, địa chỉ, khối lượng Q4 */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Khách Hàng (Buyer)</span>
                            <strong className="text-slate-900 block">{stop.contactNameSnapshot || stop.contract?.buyerName || 'Kho Buyer'}</strong>
                            <span className="text-slate-500 font-mono text-[11px] block">{stop.contactPhoneSnapshot || '0987654321'}</span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kho Tiếp Nhận</span>
                            <span className="text-slate-700 text-[11px] line-clamp-2 block">{stop.deliveryAddressSnapshot}</span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sản Phẩm & Khối Lượng</span>
                            <strong className="text-slate-900 block">Lá É Phú Yên VietGAP</strong>
                            <span className="text-emerald-800 font-mono font-bold text-xs block">Thực nhận Q4: {weight} kg</span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vận Chuyển & Ký Nhận</span>
                            <span className="text-slate-700 font-mono block">Chuyến: {(stop as any).tripCode || 'Chuyến Outbound'}</span>
                            <span className="text-slate-500 text-[11px] block">Người ký: {stop.buyerSignerName || 'Đại diện kho'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. MODAL HỦY CHUYẾN OUTBOUND */}
      {cancellingTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-800">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Hủy Chuyến Outbound {cancellingTrip.tripCode}
                </h3>
              </div>
              <button
                onClick={() => setCancellingTrip(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Khi hủy chuyến xe này, các hợp đồng sẽ được hoàn trả về hàng đợi xuất kho của Hub và phương tiện/tài xế sẽ được giải phóng về trạng thái sẵn sàng.
            </p>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700 block">Lý do hủy chuyến *</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-emerald-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingTrip(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleCancelTrip}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Xác Nhận Hủy Chuyến</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL TÀI XẾ LẬP BIÊN BẢN BÀN GIAO EPOD (GĐ 8.3) */}
      {driverEpodStop && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800">
                <PenTool className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Lập Biên Bản Bàn Giao ePOD (Tài Xế Xe Lạnh)
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Điểm #{driverEpodStop.stopSequence} · {driverEpodStop.contractCode || `HĐ-${driverEpodStop.contractId}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDriverEpodStop(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs space-y-1">
              <p><strong>Bên nhận hàng:</strong> {driverEpodStop.contactNameSnapshot} ({driverEpodStop.contactPhoneSnapshot})</p>
              <p><strong>Địa chỉ giao:</strong> {driverEpodStop.deliveryAddressSnapshot}</p>
              <p><strong>Khối lượng dự kiến:</strong> <span className="font-mono text-emerald-800 font-bold">{driverEpodStop.expectedWeightKg} kg</span> Lá É Phú Yên</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Khối lượng thực giao (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={actualDeliveredWeight}
                  onChange={(e) => setActualDeliveredWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Hao hụt / Từ chối (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={rejectedWeight}
                  onChange={(e) => setRejectedWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-900 focus:outline-emerald-600"
                />
              </div>
            </div>

            {parseFloat(rejectedWeight) > 0 && (
              <div className="space-y-1 text-xs">
                <label className="font-bold text-amber-800 block">Lý do hư hao / từ chối hàng *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 2kg bị dập lá trong quá trình bốc xếp..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 text-xs focus:outline-amber-600"
                />
              </div>
            )}

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700 block">Ghi chú bàn giao của tài xế</label>
              <textarea
                rows={2}
                value={driverNotes}
                onChange={(e) => setDriverNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-emerald-600"
              />
            </div>

            {/* Chữ ký số tài xế & Bằng chứng dock */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Chữ ký số điện tử của Tài xế (Driver Signature)</span>
                <span className="text-[10px] text-emerald-700 font-normal">Đã xác thực định danh tài xế</span>
              </label>
              <div className="h-20 bg-slate-50 border border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 font-mono italic text-sm">
                ✍️ [Chữ Ký Số Điện Tử: Tài Xế Nguyễn Văn Tài - Đã ký xác thực]
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDriverEpodStop(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitDriverEpod}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Nộp Biên Bản Bàn Giao ePOD</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL BUYER KIỂM ĐẾM & KÝ NHẬN HÀNG (GĐ 8.4) */}
      {buyerConfirmStop && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-800">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Buyer Kiểm Đếm & Ký Nhận Hàng (ePOD Acceptance)
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Điểm #{buyerConfirmStop.stopSequence} · {buyerConfirmStop.contractCode || `HĐ-${buyerConfirmStop.contractId}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setBuyerConfirmStop(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Khối lượng tài xế đã bàn giao:</span>
                <strong className="font-mono text-indigo-900 text-sm">
                  {buyerConfirmStop.actualDeliveredWeightKg || buyerConfirmStop.expectedWeightKg} kg
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Quy cách:</span>
                <span>10 thùng xốp bảo ôn VietGAP</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Địa điểm nhận hàng:</span>
                <span className="font-medium text-slate-800">{buyerConfirmStop.deliveryAddressSnapshot}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Người ký nhận đại diện (Buyer) *</label>
                <input
                  type="text"
                  value={buyerSignerName}
                  onChange={(e) => setBuyerSignerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Số điện thoại liên hệ *</label>
                <input
                  type="text"
                  value={buyerSignerPhone}
                  onChange={(e) => setBuyerSignerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-900 focus:outline-indigo-600"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700 block">Ghi chú nghiệm thu của bên mua</label>
              <textarea
                rows={2}
                value={buyerNotes}
                onChange={(e) => setBuyerNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-indigo-600"
              />
            </div>

            {/* Khung chữ ký số Buyer */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Chữ ký số điện tử của Bên Mua (Buyer Signature Pad)</span>
                <span className="text-[10px] text-indigo-700 font-normal">Ký số xác nhận biên bản bàn giao</span>
              </label>
              <div className="h-20 bg-slate-50 border border-slate-300 rounded-2xl flex items-center justify-center text-indigo-900 font-mono italic text-sm">
                ✍️ [Đại diện Bên Mua: {buyerSignerName} - Đã ký nhận số điện tử]
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBuyerConfirmStop(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleBuyerConfirmEpod}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ký Nhận Hàng (Chuyển HĐ DELIVERED)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL THANH TOÁN NỐT 70% & HOÀN TẤT ĐƠN (GĐ 9.1 & 9.2) */}
      {settlementQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-800">
                <CreditCard className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Quyết Toán & Thanh Toán Nốt 70% Tiền Hàng
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Hợp đồng: {settlementQuote.contractCode || `HĐ-${settlementQuote.contractId}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSettlementQuote(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Chi tiết tài chính */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Tổng giá trị hàng thực nhận (150 kg):</span>
                <strong className="font-mono text-slate-900">
                  {Number(settlementQuote.goods || 6750000).toLocaleString('vi-VN')} đ
                </strong>
              </div>
              <div className="flex items-center justify-between text-emerald-800">
                <span>Đã thanh toán cọc ký quỹ (30%):</span>
                <strong className="font-mono">
                  - {Math.round(Number(settlementQuote.goods || 6750000) * 0.3).toLocaleString('vi-VN')} đ
                </strong>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                <strong className="text-amber-900">Số tiền 70% còn lại phải thanh toán:</strong>
                <strong className="font-mono text-amber-700 text-base">
                  {Number(settlementQuote.remainingAmount || settlementQuote.balanceDue || 4725000).toLocaleString('vi-VN')} đ
                </strong>
              </div>
            </div>

            {/* Mã VietQR động */}
            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-amber-700" />
                Quét Mã VietQR Chuyển Khoản Ngân Hàng
              </span>
              <div className="w-44 h-44 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settlementQuote.qrUrl || `https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=${settlementQuote.remainingAmount || 4725000}&addInfo=TT70%20${settlementQuote.contractCode}`}
                  alt="VietQR Final Payment"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div className="text-xs text-slate-700 space-y-0.5">
                <p>Ngân hàng: <strong>{settlementQuote.bank || 'MB Bank'}</strong> · STK: <strong className="font-mono text-slate-900">{settlementQuote.accountNumber || '0987654321'}</strong></p>
                <p>Nội dung CK: <strong className="font-mono text-[#10542C]">{settlementQuote.transferContent || `TT70 ${settlementQuote.contractCode}`}</strong></p>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700 block">Mã bút toán chuyển khoản (Reference)</label>
              <input
                type="text"
                value={settlementBankRef}
                onChange={(e) => setSettlementBankRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-amber-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSettlementQuote(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={handleConfirmSettlement}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Xác Nhận Đã Thanh Toán 70% & Hoàn Tất Đơn (SETTLED)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL XEM HÓA ĐƠN & CHỨNG TỪ B2B */}
      {invoiceHtml && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <Receipt className="w-5 h-5 text-[#10542C]" />
                <h3 className="font-bold text-base text-slate-900">
                  Chứng Từ Quyết Toán & Hóa Đơn B2B
                </h3>
              </div>
              <button
                onClick={() => setInvoiceHtml(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div
              className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50"
              dangerouslySetInnerHTML={{ __html: invoiceHtml }}
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                In Chứng Từ
              </button>
              <button
                type="button"
                onClick={() => setInvoiceHtml(null)}
                className="px-5 py-2 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold text-xs transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL XEM CHI TIẾT BIÊN BẢN BÀN GIAO EPOD */}
      {viewEpodStop && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800">
                <PenTool className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Biên Bản Bàn Giao Điện Tử (ePOD)
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Hợp đồng: {viewEpodStop.contractCode || viewEpodStop.contract?.contractCode || `HĐ-${viewEpodStop.contractId}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewEpodStop(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Trạng thái xác thực:</span>
                  <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold text-[10px]">
                    ✓ ĐÃ KÝ NHẬN HỢP LỆ
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Thời điểm ký nhận: {viewEpodStop.buyerConfirmedAt ? new Date(viewEpodStop.buyerConfirmedAt).toLocaleString('vi-VN') : 'Đã xác nhận'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Người Ký Nhận (Buyer)</span>
                  <strong className="text-slate-800 block">{viewEpodStop.buyerSignerName || 'Đại diện kho Nachy'}</strong>
                  <span className="text-slate-500 font-mono text-[11px]">{viewEpodStop.buyerSignerPhone || '0987654321'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Khối Lượng Bàn Giao (Q4)</span>
                  <strong className="text-emerald-800 font-mono text-base block">
                    {viewEpodStop.actualDeliveredWeightKg || viewEpodStop.expectedWeightKg} kg
                  </strong>
                  <span className="text-slate-500 text-[11px]">Hao hụt/Từ chối: {viewEpodStop.rejectedWeightKg || 0} kg</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">Ghi chú xác nhận của Buyer:</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                  {viewEpodStop.buyerNotes || 'Đã nhận đủ 100% hàng hóa đạt tiêu chuẩn chất lượng VietGAP.'}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">Chữ ký điện tử xác nhận:</label>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                  {viewEpodStop.buyerSignatureData ? (
                    <img
                      src={viewEpodStop.buyerSignatureData}
                      alt="Chữ ký điện tử"
                      className="max-h-24 mx-auto border border-dashed border-slate-300 rounded p-1"
                    />
                  ) : (
                    <span className="text-slate-400 italic">Đã xác thực chữ ký điện tử số</span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono block mt-1">
                    Ký số bởi: {viewEpodStop.buyerSignerName || 'Trần Thị Thương'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewEpodStop(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
