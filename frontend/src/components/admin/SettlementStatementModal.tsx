'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  Receipt,
  Building2,
  CheckCircle2,
  X,
  RotateCw,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface SettlementStatementModalProps {
  contract: any;
  quote: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSettlement: (data: {
    reference: string;
    amount: number;
    bankTransferRef: string;
    farmerBankName: string;
    farmerBankAccount: string;
    farmerBankOwner: string;
  }) => Promise<void>;
}

export const SettlementStatementModal: React.FC<SettlementStatementModalProps> = ({
  contract,
  quote,
  isOpen,
  onClose,
  onConfirmSettlement,
}) => {
  const [bankRef, setBankRef] = useState(
    `VCB-${Date.now().toString().slice(-6)}-FT`
  );
  const [farmerBankName, setFarmerBankName] = useState(
    contract.farmer_bank_name || 'Vietcombank (Chi nhánh Lâm Đồng)'
  );
  const [farmerBankAccount, setFarmerBankAccount] = useState(
    contract.farmer_bank_account || '0071001234567'
  );
  const [farmerBankOwner, setFarmerBankOwner] = useState(
    contract.farmer_bank_owner || contract.farmer_name || 'NGUYEN VAN HAI'
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const weight = Number(contract.offered_weight_kg || contract.quantityKg) || 0;
  const unitPrice = Number(contract.offered_price_per_kg || contract.price_per_kg || contract.agreedPricePerKg) || 0;
  const calculatedGoods = (weight > 0 && unitPrice > 0) ? (weight * unitPrice) : 0;
  const totalGoods = Number(quote?.goods || calculatedGoods || contract.total_goods_amount || contract.total_amount || 0);
  const depositPaid = Number(contract.deposit_received || contract.deposit_30_amount || (totalGoods * 0.3));
  const serviceFee = Number(quote?.serviceFee || (totalGoods * 0.03));
  const vat = Number(quote?.vat || (serviceFee * 0.1));
  const finalPayout = Number(quote?.payout || (totalGoods - serviceFee - vat));

  const formatVnd = (val: number) =>
    val.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' ₫';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirmSettlement({
        reference: bankRef,
        amount: finalPayout,
        bankTransferRef: bankRef,
        farmerBankName,
        farmerBankAccount,
        farmerBankOwner,
      });
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi khi quyết toán giải ngân.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#10542C] flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5 text-[#10542C]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Bảng Kê Quyết Toán Tài Chính & Giải Ngân Cho Nông Dân
              </h2>
              <p className="text-xs text-gray-500 font-mono">
                Hợp đồng: <strong className="text-[#10542C]">{contract.contract_code}</strong> &bull; {contract.product_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form id="settlement-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* 1. Bảng kê đối soát tài chính */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#10542C]" />
              1. Bảng Kê Đối Soát 4 Bên (Buyer · HoNa · Logistics · Farmer)
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-200 text-gray-700">
                <span>Khối lượng thực nhận tại kho Buyer:</span>
                <span className="font-mono font-bold text-gray-900">
                  {Number(contract.delivered_weight_kg || contract.offered_weight_kg || contract.quantity || 100).toLocaleString('vi-VN')} kg
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200 text-gray-700">
                <span>Tổng giá trị tiền hàng thực tế:</span>
                <span className="font-mono font-bold text-gray-900">{formatVnd(totalGoods)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200 text-gray-600">
                <span>Tiền cọc 30% Escrow sàn đã thu giữ:</span>
                <span className="font-mono text-emerald-700 font-bold">{formatVnd(depositPaid)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200 text-gray-600">
                <span>Phí dịch vụ sàn HoNa Fresh (3%):</span>
                <span className="font-mono text-rose-600">- {formatVnd(serviceFee)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200 text-gray-600">
                <span>Thuế GTGT dịch vụ sàn (10%):</span>
                <span className="font-mono text-rose-600">- {formatVnd(vat)}</span>
              </div>

              {/* Tổng giải ngân ròng */}
              <div className="p-3 bg-emerald-100/70 rounded-xl border border-emerald-300 flex justify-between items-center mt-2">
                <span className="font-bold text-emerald-950 text-xs sm:text-sm">
                  Số Tiền Thực Tế Giải Ngân Về STK Farmer:
                </span>
                <span className="font-mono font-black text-[#10542C] text-base sm:text-lg">
                  {formatVnd(finalPayout)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Thông tin tài khoản ngân hàng của Nông Dân */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" />
              2. Tài Khoản Ngân Hàng Thụ Hưởng Của Nông Dân
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Ngân Hàng Thụ Hưởng *
                </label>
                <input
                  type="text"
                  required
                  value={farmerBankName}
                  onChange={(e) => setFarmerBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-800 focus:ring-2 focus:ring-[#10542C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Số Tài Khoản Ngân Hàng *
                </label>
                <input
                  type="text"
                  required
                  value={farmerBankAccount}
                  onChange={(e) => setFarmerBankAccount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#10542C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Tên Chủ Tài Khoản *
                </label>
                <input
                  type="text"
                  required
                  value={farmerBankOwner}
                  onChange={(e) => setFarmerBankOwner(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs uppercase font-bold text-gray-800 focus:ring-2 focus:ring-[#10542C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Mã Giao Dịch Chuyển Tiền (Ref) *
                </label>
                <input
                  type="text"
                  required
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-mono font-bold text-blue-900 focus:ring-2 focus:ring-[#10542C]"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-[11px] text-blue-950 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Bút toán kế toán VAS sẽ tự động ghi Có tài khoản 112 (Tiền gửi ngân hàng) và ghi Nợ tài khoản 3388 (Ký quỹ cọc Escrow), hoàn tất hồ sơ pháp lý giao dịch B2B.
            </span>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-white text-xs font-bold transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="settlement-form"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang thực hiện giải ngân...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Xác Nhận Giải Ngân & Đóng Hoàn Tất Hợp Đồng</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
