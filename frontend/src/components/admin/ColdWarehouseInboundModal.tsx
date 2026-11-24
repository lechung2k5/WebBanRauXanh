'use client';

import React, { useState } from 'react';
import {
  Building2,
  Scale,
  ThermometerSnowflake,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  X,
  RotateCw,
  FileCheck,
  AlertTriangle,
  Beaker,
} from 'lucide-react';

interface ColdWarehouseInboundModalProps {
  contract: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    zone: string;
    rackBin: string;
    maxStorageDays: number;
    qcCertUrl: string;
    grossWeightKg: number;
    tareWeightKg: number;
    netWeightKg: number;
    brix: number;
    nitratePpm: number;
    pesticideSafe: boolean;
  }) => Promise<void>;
}

export const ColdWarehouseInboundModal: React.FC<ColdWarehouseInboundModalProps> = ({
  contract,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const agreedWeight = Math.max(
    1,
    Number(
      contract.actual_harvest_weight_kg ||
      contract.offered_weight_kg ||
      contract.quantity_kg ||
      contract.quantity ||
      100
    )
  );

  // WMS Matrix
  const [zone, setZone] = useState('Zone A (Lạnh mát 2-6°C - Rau ăn lá)');
  const [rack, setRack] = useState('R-02');
  const [level, setLevel] = useState('L-1');
  const [bin, setBin] = useState('B-04');

  // Inbound Weighing
  const [grossWeight, setGrossWeight] = useState<number>(agreedWeight + 4200); // Tự trọng xe tải ~4.2T
  const [tareWeight, setTareWeight] = useState<number>(4200);
  const netWeight = Math.max(0, grossWeight - tareWeight);

  // FEFO SLA Calculation
  const deliveryDateStr = contract.hub_delivery_date || '2026-11-20';
  const calculateDefaultMaxDays = () => {
    try {
      const targetDate = new Date(deliveryDateStr).getTime();
      const now = Date.now();
      const diffDays = Math.max(1, Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24)) + 1);
      return Math.min(diffDays, 7); // Rau củ tối đa lưu 7 ngày
    } catch {
      return 5;
    }
  };
  const [maxStorageDays, setMaxStorageDays] = useState<number>(calculateDefaultMaxDays());

  // QC Lab Tests
  const [brix, setBrix] = useState<number>(12.8);
  const [nitratePpm, setNitratePpm] = useState<number>(240); // Tiêu chuẩn TCVN <= 500ppm
  const [pesticideSafe, setPesticideSafe] = useState<boolean>(true);
  const [qcCertUrl, setQcCertUrl] = useState<string>(
    `https://qc.honafresh.vn/cert-${String(contract.contract_code || '').toLowerCase()}`
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const rackBinCode = `Kệ ${rack} · Tầng ${level} · Ô ${bin}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (netWeight <= 0) {
      alert('Khối lượng tịnh nhập kho (Net Weight) phải lớn hơn 0 kg. Vui lòng kiểm tra lại Cân Tổng và Tự Trọng Xe.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        zone,
        rackBin: rackBinCode,
        maxStorageDays,
        qcCertUrl,
        grossWeightKg: grossWeight,
        tareWeightKg: tareWeight,
        netWeightKg: netWeight,
        brix,
        nitratePpm,
        pesticideSafe,
      });
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi khi nhập kho HoNa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-purple-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Nhập Kho Lạnh HoNa & Kiểm Định Lab QC
              </h2>
              <p className="text-xs text-gray-500 font-mono">
                Mã HĐ: <strong className="text-purple-800">{contract.contract_code}</strong> &bull; {contract.product_name}
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
        <form id="inbound-wms-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* 1. Trạm cân xe điện tử */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-[#10542C]" />
              1. Cân Tịnh Nhập Kho (Gross - Tare = Net Weight)
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Cân Tổng (kg)</label>
                <input
                  type="number"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-mono font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Tự Trọng Xe (kg)</label>
                <input
                  type="number"
                  value={tareWeight}
                  onChange={(e) => setTareWeight(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-mono font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#10542C] mb-1">Khối Lượng Tịnh (kg)</label>
                <div className="px-2.5 py-2 rounded-xl bg-emerald-100 text-emerald-900 font-mono font-bold text-sm">
                  {netWeight.toLocaleString('vi-VN')} kg
                </div>
              </div>
            </div>
          </div>

          {/* 2. Vị trí kho lạnh WMS */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block flex items-center gap-1.5">
              <ThermometerSnowflake className="w-4 h-4 text-blue-600" />
              2. Sơ Đồ Gán Vị Trí Lưu Kho (WMS Cold Matrix)
            </span>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Phân Khu Nhiệt Độ *</label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-purple-600"
              >
                <option value="Zone A (Lạnh mát 2-6°C - Rau ăn lá)">Zone A (Lạnh mát 2-6°C - Rau ăn lá & quả mềm)</option>
                <option value="Zone B (Lạnh sâu -2-2°C - Củ quả)">Zone B (Lạnh sâu -2 đến 2°C - Khoai, cà rốt, củ quả)</option>
                <option value="Zone C (Mát 8-12°C - Trái cây nhiệt đới)">Zone C (Mát 8-12°C - Trái cây nhiệt đới)</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Dãy Kệ (Rack)</label>
                <select
                  value={rack}
                  onChange={(e) => setRack(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-800"
                >
                  <option value="R-01">Kệ R-01</option>
                  <option value="R-02">Kệ R-02</option>
                  <option value="R-03">Kệ R-03</option>
                  <option value="R-04">Kệ R-04</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Tầng (Level)</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-800"
                >
                  <option value="L-1">Tầng 1 (Mặt sàn)</option>
                  <option value="L-2">Tầng 2 (Trung)</option>
                  <option value="L-3">Tầng 3 (Cao)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Ô Chứa (Bin)</label>
                <select
                  value={bin}
                  onChange={(e) => setBin(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-800"
                >
                  <option value="B-01">Ô B-01</option>
                  <option value="B-02">Ô B-02</option>
                  <option value="B-03">Ô B-03</option>
                  <option value="B-04">Ô B-04</option>
                </select>
              </div>
            </div>
            <div className="text-[11px] font-bold text-purple-900 bg-purple-100/70 px-3 py-1.5 rounded-lg flex justify-between items-center">
              <span>Mã tọa độ WMS:</span>
              <span className="font-mono">{rackBinCode} &bull; {zone.split(' ')[0]}</span>
            </div>
          </div>

          {/* 3. FEFO SLA Storage days */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              3. Quản Lý Hạn Lưu Kho Tối Đa (FEFO & Ngày Hẹn Buyer)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Số Ngày Được Phép Lưu Kho Tối Đa *
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  required
                  value={maxStorageDays}
                  onChange={(e) => setMaxStorageDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 font-mono font-bold text-sm text-gray-800 focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <div className="text-[11px] text-gray-600 space-y-1">
                <span>Ngày Buyer hẹn nhận: <strong className="font-mono text-gray-900">{deliveryDateStr}</strong></span>
                <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                  Hệ thống tự động kích hoạt cảnh báo SLA khi nông sản tồn kho vượt quá {maxStorageDays} ngày để ưu tiên xuất kho trước.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Kiểm định Lab QC */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block flex items-center gap-1.5">
              <Beaker className="w-4 h-4 text-emerald-600" />
              4. Biên Bản Kiểm Định Phòng Lab HoNa Fresh
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Độ Ngọt Brix (°Bx)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={brix}
                  onChange={(e) => setBrix(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-mono font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Dư Lượng Nitrate (ppm, TCVN ≤ 500)
                </label>
                <input
                  type="number"
                  value={nitratePpm}
                  onChange={(e) => setNitratePpm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-mono font-bold text-gray-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs font-bold text-emerald-900">
                Test nhanh dư lượng BVTV (Lân hữu cơ & Carbamate):
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-200/80 px-2 py-0.5 rounded">
                ÂM TÍNH (ĐẠT CHUẨN)
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Mã Chứng Thư Giám Định QC Passed *
              </label>
              <input
                type="text"
                required
                value={qcCertUrl}
                onChange={(e) => setQcCertUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-mono text-gray-700"
              />
            </div>
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
            form="inbound-wms-form"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xử lý nhập kho...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Xác Nhận Nhập Kho & Cấp QC Passed</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
