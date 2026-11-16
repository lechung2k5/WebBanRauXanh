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
  Truck,
  Award,
} from 'lucide-react';
import { getContractPrintUrl } from '@/services/farmerApi';

export interface B2bContractModalData {
  id: number;
  contractCode: string;
  rfqCode?: string;
  lotCode?: string;
  productName: string;
  buyerName?: string;
  buyerCompany?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  farmerName?: string;
  farmerCompany?: string;
  farmerPhone?: string;
  farmerAddress?: string;
  farmerPuc?: string;
  quantityKg: number;
  unitPrice: number;
  totalAmount: number;
  depositAmount: number;
  remainingAmount?: number;
  depositStatus?: string;
  fulfillmentStatusName?: string;
  deliveryAddress?: string;
  deliveryTimeSlot?: string;
  createdAt?: string;
}

interface B2bContractViewModalProps {
  contract: B2bContractModalData | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function B2bContractViewModal({
  contract,
  isOpen,
  onClose,
}: B2bContractViewModalProps) {
  if (!isOpen || !contract) return null;

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

  const isDepositPaid =
    contract.depositStatus === 'DEPOSIT_PAID' ||
    contract.depositStatus === 'PAID';

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
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-[#FCFDFB] text-slate-800 text-xs">
          {/* Header Quốc hiệu / Mộc sàn */}
          <div className="text-center space-y-1 pb-4 border-b border-gray-200">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </h4>
            <p className="text-[10px] text-slate-500 italic">
              Độc lập - Tự do - Hạnh phúc
            </p>
            <div className="w-20 h-0.5 bg-slate-300 mx-auto my-2" />
            <h2 className="font-heading font-black text-base sm:text-lg text-[#10542C] uppercase tracking-wide">
              HỢP ĐỒNG NGUYÊN TẮC THU MUA NÔNG SẢN SỈ B2B
            </h2>
            <p className="text-[11px] text-slate-600 font-mono">
              Số: <strong>{contract.contractCode}</strong> | Ngày ký:{' '}
              {contract.createdAt
                ? new Date(contract.createdAt).toLocaleDateString('vi-VN')
                : new Date().toLocaleDateString('vi-VN')}
            </p>
          </div>

          {/* Banner Trạng thái Ký quỹ Escrow */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold text-emerald-900 text-xs block">
                  Bảo Chứng Tiền Cọc 30% Tại Sàn Nông Sản HoNa Fresh
                </span>
                <span className="text-[11px] text-emerald-700">
                  {isDepositPaid
                    ? `✓ Đã ký quỹ an toàn ${formatVnd(contract.depositAmount)} vào tài khoản Escrow`
                    : `Đang chờ thương lái nộp tiền cọc bảo chứng: ${formatVnd(contract.depositAmount)}`}
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
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
              <div className="space-y-1 leading-relaxed">
                <p>
                  Đơn vị:{' '}
                  <strong className="text-slate-900">
                    {contract.farmerCompany ||
                      contract.farmerName ||
                      'HTX Nông Nghiệp Đà Lạt GAP'}
                  </strong>
                </p>
                <p>
                  Người đại diện:{' '}
                  <strong className="text-slate-800">
                    {contract.farmerName || 'Nguyễn Văn Nông Dân'}
                  </strong>
                </p>
                <p>
                  Số điện thoại:{' '}
                  <strong className="font-mono text-slate-800">
                    {contract.farmerPhone || '0988.100.222'}
                  </strong>
                </p>
                <p>
                  Mã vùng trồng (PUC):{' '}
                  <strong className="font-mono text-[#10542C] bg-emerald-50 px-1.5 py-0.5 rounded">
                    {contract.farmerPuc || 'VN-LDO-PUC-0849'}
                  </strong>
                </p>
                <p className="text-slate-500">
                  Địa chỉ vườn:{' '}
                  {contract.farmerAddress || 'Đơn Dương, Lâm Đồng'}
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
              <div className="space-y-1 leading-relaxed">
                <p>
                  Đơn vị mua:{' '}
                  <strong className="text-slate-900">
                    {contract.buyerCompany ||
                      contract.buyerName ||
                      'Công Ty Thu Mua Nông Sản Sài Gòn'}
                  </strong>
                </p>
                <p>
                  Người đại diện:{' '}
                  <strong className="text-slate-800">
                    {contract.buyerName || 'Lê Chung'}
                  </strong>
                </p>
                <p>
                  Số điện thoại:{' '}
                  <strong className="font-mono text-slate-800">
                    {contract.buyerPhone || '0901.234.567'}
                  </strong>
                </p>
                <p className="text-slate-500">
                  Kho nhận hàng:{' '}
                  {contract.deliveryAddress ||
                    contract.buyerAddress ||
                    'Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM'}
                </p>
                <p className="text-[11px] text-sky-700 font-semibold">
                  Mã RFQ gốc:{' '}
                  <span className="font-mono">{contract.rfqCode || 'N/A'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Bảng Chi Tiết Hàng Hóa & Giá Trị Hợp Đồng */}
          <div className="space-y-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              CHI TIẾT LÔ NÔNG SẢN & GIÁ TRỊ GIAO DỊCH
            </span>
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F4F6F1] text-slate-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Tên Nông Sản & Mã Lô</th>
                    <th className="py-2.5 px-3 text-right">Sản Lượng (kg)</th>
                    <th className="py-2.5 px-3 text-right">Đơn Giá Chốt</th>
                    <th className="py-2.5 px-3 text-right">Thành Tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td className="py-3 px-3">
                      <strong className="text-[#10542C] text-sm block">
                        {contract.productName}
                      </strong>
                      <span className="font-mono text-[11px] text-slate-500">
                        Mã lô: {contract.lotCode || 'LOT-2026-DL-001'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                      {contract.quantityKg.toLocaleString('vi-VN')} kg
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#10542C]">
                      {formatVnd(contract.unitPrice)}/kg
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#10542C] text-sm">
                      {formatVnd(contract.totalAmount)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-[#FAFBF9] border-t border-gray-200 font-semibold text-xs">
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-right text-slate-600">
                      Tổng Giá Trị Hợp Đồng:
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-base text-[#10542C]">
                      {formatVnd(contract.totalAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-right text-emerald-800">
                      Tiền Cọc Bảo Chứng 30% (Escrow):
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatVnd(contract.depositAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-right text-slate-600">
                      Còn Lại Thanh Toán Sau Khi Nghiệm Thu Đạt QC (70%):
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                      {formatVnd(
                        contract.remainingAmount ||
                          contract.totalAmount - contract.depositAmount
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Điều khoản vận chuyển và kiểm định QC */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 leading-relaxed">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Truck className="w-4 h-4 text-[#10542C]" />
              <span>ĐIỀU KHOẢN GIAO NHẬN & KIỂM ĐỊNH CHẤT LƯỢNG (QC)</span>
            </span>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
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

          {/* Dấu Mộc Xác Thực Pháp Lý 3 Bên */}
          <div className="pt-4 border-t border-gray-200 grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <span className="font-bold text-slate-700 uppercase text-[10px] block">
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
