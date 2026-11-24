'use client';

import React, { useState } from 'react';
import {
  Truck,
  MapPin,
  Calendar,
  Package,
  RotateCw,
  CheckCircle2,
  X,
  User,
  Phone,
  ThermometerSnowflake,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface OutboundDispatchManifestModalProps {
  contract: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    truckPlate: string;
    driverName: string;
    manifestCode: string;
    deliveryAddress: string;
    deliveryRouteStops: string;
  }) => Promise<void>;
}

export const OutboundDispatchManifestModal: React.FC<OutboundDispatchManifestModalProps> = ({
  contract,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [manifestCode, setManifestCode] = useState(
    `MNF-2026-${String(contract.contract_code || '').slice(-4)}-LASTMILE`
  );
  const [truckPlate, setTruckPlate] = useState('51D-921.88 (Xe lạnh Isuzu 5 Tấn chuyên tuyến)');
  const [driverName, setDriverName] = useState('Trần Quốc Bảo (Tài xế HoNa Chặng Cuối)');
  const [driverPhone, setDriverPhone] = useState('0903.882.114');
  const [deliveryAddress, setDeliveryAddress] = useState(
    contract.delivery_address || 'Tổng Kho Bách Hóa Xanh, Số 12 Đường Song Hành, Q.12, TP.HCM'
  );
  const [buyerContactName, setBuyerContactName] = useState(
    contract.buyer_contact || contract.buyer_name || 'Nguyễn Hoàng Nam'
  );
  const [buyerPhone, setBuyerPhone] = useState(
    contract.buyer_phone || '0909.123.456'
  );
  const [stopsNote, setStopsNote] = useState(
    'Điểm 1: Kho Phân Phối Trung Tâm (Hàng xuất kho đợt 1) -> Điểm 2: Kho Chi Nhánh Thủ Đức'
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        truckPlate,
        driverName: `${driverName} (${driverPhone})`,
        manifestCode,
        deliveryAddress: `${deliveryAddress} (Người nhận: ${buyerContactName} - ${buyerPhone})`,
        deliveryRouteStops: stopsNote,
      });
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi khi xuất lệnh điều xe.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentKg = Number(contract.offered_weight_kg || contract.quantity || 100);

  return (
    <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#10542C] flex items-center justify-center font-bold">
              <Truck className="w-5 h-5 text-[#10542C]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Lập Chuyến Xe Xuất Kho & Phân Tuyến Giao Hàng
              </h2>
              <p className="text-xs text-gray-500 font-mono">
                Mã Chuyến: <strong className="text-[#10542C]">{manifestCode}</strong>
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
        <form id="outbound-dispatch-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* 1. Kiểm soát gom đơn trên xe */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2.5">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#10542C]" />
              1. Bảng Kê Gom Đơn Trên Chuyến Xe (Manifest Cargo)
            </span>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[11px]">
                  <tr>
                    <th className="p-2.5">Hợp Đồng</th>
                    <th className="p-2.5">Sản Phẩm</th>
                    <th className="p-2.5">Khối Lượng</th>
                    <th className="p-2.5">Bên Mua (Buyer)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  <tr>
                    <td className="p-2.5 font-mono font-bold text-gray-900">{contract.contract_code}</td>
                    <td className="p-2.5 font-bold text-[#10542C]">{contract.product_name}</td>
                    <td className="p-2.5 font-mono font-bold">{currentKg.toLocaleString('vi-VN')} kg</td>
                    <td className="p-2.5">{contract.buyer_name}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1">
              <span>Tải trọng khả dụng của xe: <strong>5.000 kg</strong></span>
              <span>Đã xếp: <strong className="text-emerald-700 font-mono font-bold">{currentKg} kg</strong> (An toàn tải trọng)</span>
            </div>
          </div>

          {/* 2. Phương tiện & Tài xế */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Phương Tiện Xe Tải Lạnh Chuyên Tuyến *
              </label>
              <select
                value={truckPlate}
                onChange={(e) => setTruckPlate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-gray-800 text-xs font-medium focus:ring-2 focus:ring-[#10542C]"
              >
                <option value="51D-921.88 (Xe lạnh Isuzu 5 Tấn chuyên tuyến)">51D-921.88 (Xe lạnh Isuzu 5 Tấn - Kho lạnh HoNa Hub)</option>
                <option value="51D-678.90 (Xe lạnh Hino 3.5 Tấn)">51D-678.90 (Xe lạnh Hino 3.5 Tấn - Chuyên giao nội thành)</option>
                <option value="49C-334.12 (Xe lạnh Hyundai 2.5 Tấn)">49C-334.12 (Xe lạnh Hyundai 2.5 Tấn - Linh hoạt)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tài Xế Chặng Cuối *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-gray-800 text-xs focus:ring-2 focus:ring-[#10542C]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Số Điện Thoại Tài Xế *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-gray-800 text-xs font-mono focus:ring-2 focus:ring-[#10542C]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Lộ trình giao hàng từng điểm */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-500" />
              2. Điểm Dỡ Hàng Của Buyer (Delivery Destination)
            </span>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Địa Chỉ Kho Nhận Hàng Của Buyer *
              </label>
              <input
                type="text"
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs focus:ring-2 focus:ring-[#10542C]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Đại Diện Nhận Hàng Tại Kho Buyer *
                </label>
                <input
                  type="text"
                  required
                  value={buyerContactName}
                  onChange={(e) => setBuyerContactName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  SĐT Người Nhận *
                </label>
                <input
                  type="text"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Lộ Trình / Thứ Tự Giao Các Điểm (Route Stops)
              </label>
              <input
                type="text"
                value={stopsNote}
                onChange={(e) => setStopsNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
            <ThermometerSnowflake className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Cảm biến IoT thùng xe kích hoạt giám sát 24/7 nhiệt độ <strong>2°C - 6°C</strong>, dữ liệu truyền liên tục về ứng dụng của Buyer.
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
            form="outbound-dispatch-form"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xuất lệnh...</span>
              </>
            ) : (
              <>
                <Truck className="w-3.5 h-3.5" />
                <span>Xuất Lệnh Xe Lạnh Giao Hàng</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
