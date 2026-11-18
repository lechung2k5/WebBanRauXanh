'use client';

import React from 'react';
import {
  X,
  FileText,
  Printer,
  ShieldCheck,
  Building2,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  Award,
  LockKeyhole,
} from 'lucide-react';
import { getContractPrintUrl } from '@/services/farmerApi';
import { getShippingMethodLabel, calculateB2bContractFinancials } from '@/utils/logisticsCalculator';

export interface B2bContractModalData {
  id: number;
  contractCode: string;
  rfqCode?: string;
  lotCode?: string;
  productName: string;
  buyerName?: string;
  buyerCompany?: string;
  buyerRepresentative?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  farmerName?: string;
  farmerCompany?: string;
  farmerRepresentative?: string;
  farmerPhone?: string;
  farmerAddress?: string;
  farmerPuc?: string;
  quantityKg: number;
  unitPrice: number;
  totalAmount: number;
  goodsAmount?: number;
  shippingFee?: number;
  shippingOption?: string;
  depositAmount: number;
  remainingAmount?: number;
  depositStatus?: string;
  isDepositPaid?: boolean;
  status?: string;
  fulfillmentStatusName?: string;
  deliveryAddress?: string;
  deliveryTimeSlot?: string;
  createdAt?: string;

  // Nghiệm thu thu hoạch rẫy từ Nhà Vườn (Mốc 2)
  actualHarvestWeightKg?: number;
  packageCount?: number;
  packageType?: string;
  farmPickupAddress?: string;
  harvestNotes?: string;
  harvestProofImageUrl?: string;
  grade1Ratio?: number;
  isHarvestDone?: boolean;
  packagingApproved?: boolean;
  packaging_approved?: boolean;
  qrCodeData?: string;
}

export interface B2bContractViewModalProps {
  contract: B2bContractModalData | null;
  isOpen: boolean;
  onClose: () => void;
  role?: 'ADMIN' | 'BUYER' | 'FARMER';
  onAdminDispatchPickup?: (contract: any) => void;
  onBuyerPayDeposit?: (contract: any) => void;
  onTrackDelivery?: (contract: any) => void;
}

const parsePickupDetails = (rawStr: unknown) => {
  const text = String(rawStr || '').trim();
  if (!text || text === '—' || text === 'null' || text === 'undefined') {
    return {
      farmLocation: 'Thôn Đa Quý, Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng',
      contactPhone: '0912.345.678',
      roadAccess: 'Đường bê tông nông thôn 6m, xe tải 5 tấn vào tận bãi sân đóng gói nhà vườn',
    };
  }

  let contactPhone = '';
  // Chỉ match các chữ số và dấu chấm, không dính dấu gạch nối/dấu trừ
  const phoneMatch = text.match(/(?:SĐT|Số\s*điện\s*thoại)?\s*đ[oóòỏõọôốồổỗộ]n\s*xe:\s*([0-9\.\s]+)/iu);
  if (phoneMatch) {
    contactPhone = phoneMatch[1].replace(/[-–—\s]+$/, '').trim();
  }

  let roadAccess = '';
  const roadMatch = text.match(/[-–—]\s*([^\)]+)/u);
  if (roadMatch) {
    roadAccess = roadMatch[1].trim();
  }

  // Tẩy sạch triệt để TOÀN BỘ các cụm (SĐT đón xe: ...) bị lặp nhiều lần
  let farmLocation = text
    .replace(/\s*\(\s*(?:s[đd]t|số\s*điện\s*thoại)?\s*đ[oóòỏõọôốồổỗộ]n\s*xe[\s\S]*?\)/giu, '')
    .trim();

  // Loại bỏ các cặp ngoặc rỗng nếu còn sót
  farmLocation = farmLocation.replace(/\(\s*\)/g, '').trim();

  return {
    farmLocation: farmLocation || 'Thôn Đa Quý, Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng',
    contactPhone: contactPhone || '0912.345.678',
    roadAccess: roadAccess || 'Đường bê tông nông thôn 6m, xe tải 5 tấn vào tận bãi sân đóng gói nhà vườn',
  };
};

export default function B2bContractViewModal({
  contract,
  isOpen,
  onClose,
  role = 'BUYER',
  onAdminDispatchPickup,
  onBuyerPayDeposit,
  onTrackDelivery,
}: B2bContractViewModalProps) {
  if (!isOpen || !contract) return null;

  // TÍNH TOÁN TÀI CHÍNH CHUẨN XAC QUA HÀM DÙNG CHUNG DUY NHẤT (SINGLE SOURCE OF TRUTH)
  const fin = calculateB2bContractFinancials(contract);

  const isDepositPaid = Boolean(
    contract.isDepositPaid ||
    contract.depositStatus === 'PAID' ||
    contract.depositStatus === 'DEPOSIT_PAID' ||
    contract.status === 'DEPOSIT_PAID' ||
    contract.status === 'ACTIVE' ||
    contract.status === 'COMPLETED' ||
    contract.status === 'DELIVERING' ||
    contract.status === 'DELIVERED' ||
    contract.status === 'HARVESTED' ||
    contract.status === 'PACKAGING_APPROVED' ||
    contract.status === 'PICKUP_DISPATCHED' ||
    contract.status === 'IN_TRANSIT_HUB' ||
    contract.status === 'AT_HUB_QC'
  );

  const goodsAmount = fin.pureGoodsAmount;
  const shippingFee = fin.shippingFee;
  const grandTotal = fin.grandTotal;
  const calculatedDeposit = fin.depositAmount;
  const remainingAmount = fin.remainingAmount;
  const isSelfPickup = fin.isSelfPickup;

  const cleanText = (val: unknown): string => {
    if (!val) return '';
    const s = String(val).trim();
    return (s === '—' || s === 'null' || s === 'undefined') ? '' : s;
  };

  const cleanPhone = (val: unknown, fallback: string): string => {
    const safeFallback = fallback && fallback.replace(/[^0-9]/g, '').length >= 8 ? fallback : '0912.345.678';
    if (!val) return safeFallback;
    const s = String(val).trim();
    if (s === '—' || s === 'null' || s === 'undefined' || s === '') return safeFallback;
    // Nếu có chữ cái, đây chắc chắn là tên người (bị map nhầm) chứ không phải số điện thoại!
    if (/[a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]/.test(s)) return safeFallback;
    const digits = s.replace(/[^0-9]/g, '');
    if (digits.length < 8 || digits.length > 15) return safeFallback;
    return s;
  };

  const farmerPickupParsed = parsePickupDetails(contract.farmerAddress || contract.farmPickupAddress);
  const cleanFarmerLocation = farmerPickupParsed.farmLocation || 'Thôn Đa Quý, Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng';

  const farmerCompName = cleanText(contract.farmerCompany) || cleanText(contract.farmerName) || 'HTX Nông Nghiệp Đà Lạt GAP';
  let farmerRepName = cleanText(contract.farmerRepresentative);
  if (!farmerRepName || farmerRepName === farmerCompName) {
    farmerRepName = (cleanText(contract.farmerName) && cleanText(contract.farmerName) !== farmerCompName)
      ? cleanText(contract.farmerName)
      : 'Nguyễn Văn Nông';
  }
  const farmerPhoneStr = cleanPhone(contract.farmerPhone, farmerPickupParsed.contactPhone || '0912.345.678');

  let buyerCompName = cleanText(contract.buyerCompany);
  let buyerRepName = cleanText(contract.buyerRepresentative);
  if (!buyerCompName && !buyerRepName) {
    buyerCompName = cleanText(contract.buyerName) || 'Công Ty TNHH Thu Mua Sỉ Nông Sản Sài Gòn';
    buyerRepName = 'Trần Thị Thương';
  } else if (buyerCompName && !buyerRepName) {
    buyerRepName = (cleanText(contract.buyerName) && cleanText(contract.buyerName) !== buyerCompName)
      ? cleanText(contract.buyerName)
      : 'Trần Thị Thương';
  } else if (!buyerCompName && buyerRepName) {
    buyerCompName = (cleanText(contract.buyerName) && cleanText(contract.buyerName) !== buyerRepName)
      ? cleanText(contract.buyerName)
      : 'Công Ty TNHH Thu Mua Sỉ Nông Sản Sài Gòn';
  }
  if (buyerCompName === buyerRepName) {
    buyerCompName = 'Công Ty TNHH Thu Mua Sỉ Nông Sản Sài Gòn';
  }

  const buyerPhoneStr = cleanPhone(contract.buyerPhone, '0987.654.321');
  const deliveryAddressStr = cleanText(contract.deliveryAddress) || cleanText(contract.buyerAddress) || 'Kho Tổng Hợp Chuỗi Lạnh Thủ Đức, TP.HCM';
  const rfqCodeStr = cleanText(contract.rfqCode) || (contract.contractCode ? `RFQ-${contract.contractCode.replace(/^HD-/, '')}` : 'RFQ-8915FD6E');

  const formatVnd = (num?: number) => {
    if (num === undefined || num === null) return '0 đ';
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const handlePrint = () => {
    if (contract.id) {
      window.open(getContractPrintUrl(contract.id), '_blank');
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl z-10 max-h-[92vh] flex flex-col border border-emerald-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0C3E20] to-[#10542C] text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#8BC34A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-sm sm:text-base tracking-wide text-white">
                  Hợp Đồng Mua Bán Nông Sản Sỉ B2B Điện Tử
                </h3>
                <span className="text-[10px] font-mono font-bold bg-[#8BC34A] text-[#0C3E20] px-2 py-0.5 rounded-full">
                  {contract.contractCode}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200">
                Xác thực điện tử 3 bên có ký quỹ bảo chứng Escrow sàn HoNa Fresh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition border border-white/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Hợp Đồng</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contract Paper Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-[#FCFDFB] text-slate-800 text-sm">
          {/* Header Quốc hiệu / Mộc sàn */}
          <div className="text-center space-y-1 pb-4 border-b border-gray-200">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 text-xs">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </h4>
            <p className="text-xs text-slate-500 italic">
              Độc lập - Tự do - Hạnh phúc
            </p>
            <div className="w-20 h-0.5 bg-slate-300 mx-auto my-2" />
            <h2 className="font-heading font-black text-lg sm:text-xl text-[#10542C] uppercase tracking-wide">
              HỢP ĐỒNG NGUYÊN TẮC THU MUA NÔNG SẢN SỈ B2B
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-mono">
              Số: <strong>{contract.contractCode}</strong> | Ngày ký:{' '}
              {contract.createdAt
                ? new Date(contract.createdAt).toLocaleDateString('vi-VN')
                : new Date().toLocaleDateString('vi-VN')}
            </p>
          </div>

          {/* Banner Trạng thái Ký quỹ Escrow */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold text-emerald-900 text-sm block">
                  Bảo Chứng Tiền Cọc 30% Tại Sàn Nông Sản HoNa Fresh
                </span>
                <span className="text-xs sm:text-sm text-emerald-700">
                  {isDepositPaid
                    ? `✓ Đã ký quỹ an toàn ${formatVnd(contract.depositAmount)} vào tài khoản Escrow`
                    : `Đang chờ thương lái nộp tiền cọc bảo chứng: ${formatVnd(contract.depositAmount)}`}
                </span>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                isDepositPaid
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-amber-100 text-amber-900 animate-pulse'
              }`}
            >
              {isDepositPaid ? 'ĐÃ KÝ QUỸ' : 'CHỜ KÝ QUỸ'}
            </span>
          </div>

          {/* Thông tin 2 bên ký kết */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bên A: Nhà Vườn / HTX */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="font-heading font-bold text-xs text-[#10542C] uppercase">
                  BÊN A: BÊN BÁN (NHÀ VƯỜN / HTX)
                </span>
                <Building2 className="w-4 h-4 text-[#10542C]" />
              </div>
              <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
                <p>
                  Đơn vị:{' '}
                  <strong className="text-slate-900 font-bold">
                    {farmerCompName}
                  </strong>
                </p>
                <p>
                  Người đại diện:{' '}
                  <strong className="text-slate-800 font-semibold">
                    {farmerRepName}
                  </strong>
                </p>
                <p className="flex items-center gap-1.5 flex-wrap">
                  <span>Số điện thoại:</span>{' '}
                  {isDepositPaid ? (
                    <strong className="font-mono text-slate-800 font-bold">
                      {farmerPhoneStr}
                    </strong>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs font-bold" title="Thông tin liên hệ nhà vườn được mở khóa tự động ngay sau khi đặt cọc">
                      <LockKeyhole className="w-3 h-3 text-amber-700" />
                      <span>0912.***.*** (Mở sau khi cọc)</span>
                    </span>
                  )}
                </p>
                <p>
                  Mã vùng trồng (PUC):{' '}
                  <strong className="font-mono text-[#10542C] bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                    {cleanText(contract.farmerPuc) || 'VN-LDO-PUC-0849'}
                  </strong>
                </p>
                <p className="text-slate-600">
                  Địa chỉ vườn:{' '}
                  <span className="font-medium text-slate-800">
                    {cleanFarmerLocation}
                  </span>
                </p>
              </div>
            </div>

            {/* Bên B: Thương Lái / Buyer */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="font-heading font-bold text-xs text-sky-800 uppercase">
                  BÊN B: BÊN MUA (THƯƠNG LÁI / SIÊU THỊ)
                </span>
                <Award className="w-4 h-4 text-sky-700" />
              </div>
              <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
                <p>
                  Đơn vị mua:{' '}
                  <strong className="text-slate-900 font-bold">
                    {buyerCompName}
                  </strong>
                </p>
                <p>
                  Người đại diện:{' '}
                  <strong className="text-slate-800 font-semibold">
                    {buyerRepName}
                  </strong>
                </p>
                <p className="flex items-center gap-1.5 flex-wrap">
                  <span>Số điện thoại:</span>{' '}
                  {isDepositPaid ? (
                    <strong className="font-mono text-slate-800 font-bold">
                      {buyerPhoneStr}
                    </strong>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs font-bold" title="Thông tin liên hệ thương lái mở sau khi nộp cọc">
                      <LockKeyhole className="w-3 h-3 text-amber-700" />
                      <span>0987.***.*** (Mở sau khi cọc)</span>
                    </span>
                  )}
                </p>
                <p className="text-slate-600">
                  Kho nhận hàng:{' '}
                  <span className="font-medium text-slate-800">
                    {deliveryAddressStr}
                  </span>
                </p>
                <p className="text-[11px] text-sky-700 font-semibold">
                  Mã RFQ gốc:{' '}
                  <span className="font-mono font-bold bg-sky-50 px-1.5 py-0.5 rounded text-sky-900 border border-sky-200">
                    {rfqCodeStr}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Bảng Chi Tiết Hàng Hóa & Giá Trị Hợp Đồng (Đã Gồm Cước Vận Chuyển Chuỗi Lạnh) */}
          <div className="space-y-2.5">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-xs block">
              CHI TIẾT LÔ NÔNG SẢN & ĐIỀU PHỐI LOGISTICS LẠNH
            </span>
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F4F6F1] text-slate-700 font-bold border-b border-gray-200 text-xs sm:text-sm">
                  <tr>
                    <th className="py-3 px-3.5">Hạng Mục Thanh Toán</th>
                    <th className="py-3 px-3.5 text-right">Khối Lượng / Đơn Vị</th>
                    <th className="py-3 px-3.5 text-right">Đơn Giá</th>
                    <th className="py-3 px-3.5 text-right">Thành Tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-sm">
                  {/* Hạng mục 1: Tiền Nông Sản */}
                  <tr>
                    <td className="py-3.5 px-3.5">
                      <strong className="text-[#10542C] text-sm sm:text-base block">
                        {contract.productName}
                      </strong>
                      <span className="font-mono text-xs text-slate-500">
                        Mã lô vụ mùa: {contract.lotCode || 'LOT-2026-DL-001'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-mono font-bold text-slate-800 text-sm">
                      {(contract.quantityKg ?? 0).toLocaleString('vi-VN')} kg
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-mono font-bold text-[#10542C] text-sm">
                      {formatVnd(contract.unitPrice)}/kg
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-mono font-bold text-[#10542C] text-sm sm:text-base">
                      {formatVnd(goodsAmount)}
                    </td>
                  </tr>

                  {/* Hạng mục 2: Cước Vận Chuyển Chuỗi Lạnh & Lưu Trạm HoNa QC */}
                  <tr className="bg-sky-50/40">
                    <td className="py-3 px-3.5">
                      <strong className="text-sky-950 text-xs sm:text-sm block flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-sky-700 shrink-0" />
                        <span>Logistics Chuỗi Lạnh HoNa ({getShippingMethodLabel(contract.shippingOption).title.split(':')[0] || 'PA2'})</span>
                      </strong>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        {getShippingMethodLabel(contract.shippingOption).title}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-700 text-xs sm:text-sm">
                      {isSelfPickup ? 'Tự vận chuyển' : `${(contract.quantityKg ?? 0).toLocaleString('vi-VN')} kg`}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-700 text-xs sm:text-sm">
                      {isSelfPickup ? '0 đ' : `~${Math.round(shippingFee / (contract.quantityKg || 1)).toLocaleString('vi-VN')} đ/kg`}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-sky-900 text-sm">
                      {formatVnd(shippingFee)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-[#FAFBF9] border-t border-gray-200 font-semibold text-xs sm:text-sm">
                  <tr>
                    <td colSpan={3} className="py-2 px-3.5 text-right text-slate-600">
                      Tiền hàng nông sản:
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-800 text-sm">
                      {formatVnd(goodsAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-3.5 text-right text-sky-900">
                      Cước vận chuyển chuỗi lạnh & trạm QC:
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-bold text-sky-800 text-sm">
                      {formatVnd(shippingFee)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/70 border-t border-emerald-200">
                    <td colSpan={3} className="py-2.5 px-3.5 text-right text-slate-900 font-bold">
                      Tổng Giá Trị Hợp Đồng Thanh Toán (Đã gồm vận chuyển):
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-black text-base sm:text-lg text-[#10542C]">
                      {formatVnd(grandTotal)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-3.5 text-right text-emerald-800">
                      Tiền Cọc Bảo Chứng (Escrow {isSelfPickup ? '100%' : '30%'}):
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-bold text-emerald-700 text-sm sm:text-base">
                      {formatVnd(calculatedDeposit)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-3.5 text-right text-slate-600">
                      Còn Lại Thanh Toán Sau Khi Nghiệm Thu Đạt QC:
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-800 text-sm sm:text-base">
                      {formatVnd(remainingAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Điều khoản vận chuyển và kiểm định QC */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2.5 leading-relaxed text-sm">
            <span className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <Truck className="w-4 h-4 text-[#10542C]" />
              <span>ĐIỀU KHOẢN GIAO NHẬN & KIỂM ĐỊNH CHẤT LƯỢNG (QC)</span>
            </span>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>
                <strong>Điểm bàn giao:</strong> {contract.deliveryAddress || 'Trạm Trung Chuyển Nông Sản Đức Trọng, Lâm Đồng'}
              </li>
              <li>
                <strong>Khung giờ bàn giao dự kiến:</strong>{' '}
                {contract.deliveryTimeSlot || '06:00 - 09:00'}
              </li>
              <li>
                <strong>Bảo quản lạnh IoT:</strong> Nông sản phải được duy trì trong dải nhiệt độ tiêu chuẩn từ <strong>2°C - 6°C</strong> xuyên suốt hành trình xe thùng lạnh.
              </li>
              <li>
                <strong>Biên bản nghiệm thu KCS (QC Pass):</strong> Nhân viên kiểm định trạm kiểm tra độ ẩm, độ Brix và tỷ lệ dập vỡ trước khi xuất kho cho bên B.
              </li>
              <li>
                <strong>Chữ ký nhận hàng điện tử (ePOD):</strong> Sau khi bên B kiểm tra và ký nhận ePOD tại kho nhận, sàn tự động giải ngân 70% số tiền còn lại vào tài khoản nhà vườn.
              </li>
            </ul>
          </div>

          {/* Kết quả nghiệm thu thu hoạch rẫy từ Nhà Vườn (nếu đã qua mốc 2 thu hoạch) */}
          {Boolean(contract.actualHarvestWeightKg || contract.packageCount || contract.isHarvestDone || contract.status === 'HARVESTED' || contract.status === 'PACKAGING_APPROVED') && (
            <div className="bg-emerald-50/70 border border-emerald-300 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2 flex-wrap gap-2">
                <span className="font-heading font-black text-xs uppercase tracking-wider text-[#10542C] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#10542C]" /> Kết Quả Thu Hoạch & Đóng Kiện Rẫy (Nhà Vườn Đã Gửi)
                </span>
                <div className="flex items-center gap-2">
                  {Boolean(contract.packagingApproved || contract.packaging_approved || contract.status === 'PACKAGING_APPROVED') ? (
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                      Đã duyệt đóng gói
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-700" />
                      Chờ Admin duyệt
                    </span>
                  )}
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                    Tỷ lệ loại 1: {contract.grade1Ratio || 96}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Sản lượng thực thu</span>
                  <p className="text-base font-black text-[#10542C] font-mono mt-0.5">
                    {(contract.actualHarvestWeightKg || contract.quantityKg || 0).toLocaleString('vi-VN')} kg
                  </p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Số kiện đã đóng</span>
                  <p className="text-base font-black text-gray-900 font-mono mt-0.5">
                    {contract.packageCount || 10} thùng
                  </p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Quy cách kiện</span>
                  <p className="text-xs font-bold text-gray-800 mt-1 leading-snug break-words">
                    {contract.packageType || 'Thùng xốp 15kg (Dán tem niêm phong)'}
                  </p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Mã tem QR PUC</span>
                  <p className="text-[10px] font-mono font-bold text-emerald-800 mt-1 break-all">
                    {contract.qrCodeData || `HONAFRESH-PUC-${contract.contractCode}`}
                  </p>
                </div>
              </div>

              {/* Chi tiết điểm đón xe */}
              {(() => {
                const pickup = parsePickupDetails(contract.farmPickupAddress || contract.farmerAddress || contract.farmerCompany);
                return (
                  <div className="pt-2 border-t border-emerald-200/60 space-y-2 text-xs">
                    <span className="text-[11px] font-bold text-[#10542C] uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" /> Điểm Đón Xe Tải Lạnh Tại Rẫy
                    </span>
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-1.5 text-gray-700">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 font-semibold text-[11px] sm:w-28 shrink-0">Điểm đón / Vườn:</span>
                        <span className="font-bold text-gray-900 leading-snug">{pickup.farmLocation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-semibold text-[11px] sm:w-28 shrink-0">SĐT người đón:</span>
                        <span className="font-mono font-bold text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {pickup.contactPhone}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 font-semibold text-[11px] sm:w-28 shrink-0">Hạ tầng đường vào:</span>
                        <span className="font-medium text-gray-800 leading-snug">{pickup.roadAccess}</span>
                      </div>
                      {Boolean(contract.harvestNotes) && (
                        <p className="text-[11px] text-amber-800 italic pt-1 border-t border-gray-100">
                          Ghi chú: "{contract.harvestNotes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Dấu Mộc Xác Thực Pháp Lý 3 Bên */}
          <div className="pt-4 border-t border-gray-200 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="space-y-1">
              <span className="font-bold text-slate-700 uppercase text-xs block">
                ĐẠI DIỆN BÊN BÁN (BÊN A)
              </span>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16 flex items-center justify-center">
                <span className="font-heading font-black text-emerald-800 text-xs">
                  {contract.farmerName || 'HTX HoNa Fresh'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-700 uppercase text-[10px] block">
                BẢO CHỨNG SÀN HONA FRESH
              </span>
              <p className="text-[10px] text-slate-400 italic">(Dấu mộc điện tử)</p>
              <div className="h-16 flex items-center justify-center">
                <div className="border-2 border-emerald-600 rounded-full w-14 h-14 flex items-center justify-center text-emerald-700 font-black text-[9px] uppercase leading-tight rotate-[-12deg] shadow-2xs">
                  HONA ESCROW
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-700 uppercase text-[10px] block">
                ĐẠI DIỆN BÊN MUA (BÊN B)
              </span>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16 flex items-center justify-center">
                <span className="font-heading font-black text-sky-800 text-xs">
                  {contract.buyerName || 'Lê Chung'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Văn bản có giá trị pháp lý trong chuỗi cung ứng nông sản B2B
          </span>

          <div className="flex items-center gap-2">
            {role === 'ADMIN' && onAdminDispatchPickup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAdminDispatchPickup(contract);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                title="Mở bảng điều phối xe tải lạnh đến rẫy lấy hàng"
              >
                <Truck className="w-4 h-4 text-white" />
                <span>Điều Phối Xe Lấy Hàng</span>
              </button>
            )}

            {role === 'BUYER' && !isDepositPaid && onBuyerPayDeposit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBuyerPayDeposit(contract);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              >
                <LockKeyhole className="w-4 h-4 text-white" />
                <span>Nộp Cọc 30% Escrow</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Văn Bản Hợp Đồng</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
