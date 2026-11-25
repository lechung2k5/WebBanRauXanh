'use client';

import React, { useState } from 'react';
import {
  Truck,
  MapPin,
  ThermometerSnowflake,
  User,
  Phone,
  CheckCircle2,
  X,
  FileText,
  RotateCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface DispatchFarmPickupModalProps {
  contract: any;
  isOpen: boolean;
  mode: 'DISPATCH' | 'HANDOVER';
  onClose: () => void;
  onConfirmDispatch: (data: {
    truckPlate: string;
    driverName: string;
    driverPhone: string;
    estimatedPickupTime: string;
    pickupAddress: string;
  }) => Promise<void>;
  onConfirmHandover: (data: {
    handoverTemp: number;
    packageCount: number;
    notes: string;
  }) => Promise<void>;
}

export const DispatchFarmPickupModal: React.FC<DispatchFarmPickupModalProps> = ({
  contract,
  isOpen,
  mode,
  onClose,
  onConfirmDispatch,
  onConfirmHandover,
}) => {
  const [truckPlate, setTruckPlate] = useState(
    contract.pickup_truck_plate || '49C-678.90 (Xe thùng lạnh HoNa Express 8 tấn)'
  );
  const [driverName, setDriverName] = useState(
    contract.pickup_driver_name || 'Nguyễn Văn Tài (Tài xế chuyên trách Lâm Đồng)'
  );
  const [driverPhone, setDriverPhone] = useState(
    contract.pickup_driver_phone || '0944.556.677'
  );
  const [estimatedPickupTime, setEstimatedPickupTime] = useState(
    '14:00 - 15:30 Hôm nay'
  );
  const [pickupAddress, setPickupAddress] = useState(
    contract.farm_pickup_address || contract.farmer_address || 'Vườn Nông Dân VietGAP, Xã Xuân Thọ, Đà Lạt'
  );

  // Handover state
  const [handoverTemp, setHandoverTemp] = useState<number>(12.5);
  const [actualPackageCount, setActualPackageCount] = useState<number>(
    Number(contract.package_count || 10)
  );
  const [handoverNotes, setHandoverNotes] = useState(
    'Rau cuống tươi ráo mủ, thùng xốp niêm phong tem QR nguyên vẹn, xếp vào thùng xe lạnh an toàn'
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'DISPATCH') {
        await onConfirmDispatch({
          truckPlate,
          driverName,
          driverPhone,
          estimatedPickupTime,
          pickupAddress,
        });
      } else {
        await onConfirmHandover({
          handoverTemp,
          packageCount: actualPackageCount,
          notes: handoverNotes,
        });
      }
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi khi xử lý thao tác.');
    } finally {
      setSubmitting(false);
    }
  };

  const isDispatch = mode === 'DISPATCH';

  return (
    <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isDispatch
                  ? 'Điều Phối Xe Tải Lạnh Lấy Hàng Tại Farm'
                  : 'Biên Bản Nghiệm Thu & Lấy Hàng Tại Vườn'}
              </h2>
              <p className="text-xs text-gray-500 font-mono">
                Hợp đồng: <strong className="text-blue-800">{contract.contract_code}</strong> &bull; {contract.product_name}
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
        <form id="dispatch-modal-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {isDispatch ? (
            <>
              {/* Thông tin nhà vườn */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Điểm Đến Lấy Hàng (Nhà Vườn Đã Khai Báo)
                </span>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-gray-900 font-medium text-xs leading-relaxed">{pickupAddress}</span>
                </div>
                <div className="text-[11px] text-gray-500 flex justify-between pt-1 border-t border-gray-200">
                  <span>Chủ vườn: <strong>{contract.farmer_name}</strong></span>
                  <span>Sản lượng đã duyệt: <strong className="font-mono text-[#10542C]">{contract.actual_harvest_weight_kg || contract.offered_weight_kg || contract.quantity} kg ({contract.package_count || 10} thùng)</strong></span>
                </div>
              </div>

              {/* Chọn phương tiện & tài xế */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Phương Tiện Xe Tải Lạnh Chuyên Dụng *
                  </label>
                  <select
                    value={truckPlate}
                    onChange={(e) => setTruckPlate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-gray-800 text-xs font-medium focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="49C-198.86 (Xe thùng lạnh HoNa Express 5 tấn)">49C-198.86 (Xe thùng lạnh HoNa Express 5 tấn - Đang ở Trạm Đức Trọng)</option>
                    <option value="49C-245.12 (Xe lạnh Isuzu 3.5 tấn)">49C-245.12 (Xe lạnh Isuzu 3.5 tấn - Sẵn sàng)</option>
                    <option value="51D-892.34 (Xe lạnh Hino 8 tấn)">51D-892.34 (Xe lạnh Hino 8 tấn - Tuyến Quốc Lộ 20)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tài Xế Phụ Trách *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-gray-800 text-xs focus:ring-2 focus:ring-blue-600"
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
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-gray-800 text-xs font-mono focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Khung Giờ Dự Kiến Có Mặt Tại Vườn *
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={estimatedPickupTime}
                      onChange={(e) => setEstimatedPickupTime(e.target.value)}
                      placeholder="VD: 14:00 - 15:30 Hôm nay"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-gray-800 text-xs focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
                  <ThermometerSnowflake className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Thùng xe lạnh sẽ được khởi động làm mát trước 30 phút đạt dải <strong>2°C - 6°C</strong> trước khi tiếp nhận nông sản tại farm.
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Chế độ Handover tại vườn */
            <>
              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1.5">
                <span className="text-xs font-bold text-[#10542C] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Xe lạnh đã đến vườn của Farmer: {contract.farmer_name}
                </span>
                <p className="text-[11px] text-gray-600">
                  Tài xế và kiểm đếm viên HoNa Fresh tiến hành đo nhiệt độ cuống rau, kiểm tra ngoại quan và đếm số thùng trước khi bốc dỡ lên xe.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nhiệt Độ Cuống Rau Tại Farm (°C) *
                  </label>
                  <div className="relative">
                    <ThermometerSnowflake className="w-4 h-4 text-blue-600 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      step="0.1"
                      min="-5"
                      max="35"
                      required
                      value={handoverTemp}
                      onChange={(e) => setHandoverTemp(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 font-mono font-bold text-sm text-gray-900 focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <span className={`text-[10px] block mt-1 ${handoverTemp <= 15 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}`}>
                    {handoverTemp <= 15 ? '✓ Đạt chuẩn tiền làm mát (≤ 15°C)' : '⚠️ Cảnh báo: Nhiệt độ cuống cao hơn 15°C!'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Số Kiện/Thùng Thực Nhận Lên Xe *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={actualPackageCount}
                    onChange={(e) => setActualPackageCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono font-bold text-sm text-gray-900 focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="text-[10px] text-gray-500 block mt-1">
                    Khai báo nông dân: {contract.package_count || '10'} thùng
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Biên Bản Kiểm Đếm & Tình Trạng Hàng Xuất Vườn
                </label>
                <textarea
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-800 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-700 flex items-center justify-between">
                <span>Chữ ký số biên bản giao nhận:</span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Đã xác thực OTP hai bên
                </span>
              </div>
            </>
          )}
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
            form="dispatch-modal-form"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : isDispatch ? (
              <>
                <Truck className="w-3.5 h-3.5" />
                <span>Phát Lệnh Điều Xe Đến Farm</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ký Nhận Hàng & Về Kho HoNa</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
