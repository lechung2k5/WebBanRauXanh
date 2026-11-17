'use client';

import React, { useState, useId } from 'react';
import {
  Scale,
  Package,
  QrCode,
  MapPin,
  CheckCircle2,
  X,
  RotateCw,
  Printer,
  FileCheck,
  AlertCircle,
  Truck,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import ImageUploadField from '@/components/ImageUploadField';
import { B2bSyncContract } from '@/services/b2bSyncService';

interface HarvestPackagingModalProps {
  contract: B2bSyncContract;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    actualHarvestWeightKg: number;
    grade1Ratio: number;
    packageType: string;
    packageCount: number;
    qrCodeData: string;
    farmPickupAddress: string;
    harvestProofImageUrl: string;
    notes: string;
  }) => Promise<void>;
}

export const HarvestPackagingModal: React.FC<HarvestPackagingModalProps> = ({
  contract,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const defaultQty = contract.quantityKg || 100;
  const [actualWeight, setActualWeight] = useState<number>(contract.actualHarvestWeightKg || defaultQty);
  const [grade1Ratio, setGrade1Ratio] = useState<number>(96); // 96%
  const [packageType, setPackageType] = useState<string>(
    contract.packageType || 'Thùng xốp 15kg (Dán tem niêm phong)'
  );
  const [boxCapacity, setBoxCapacity] = useState<number>(15);
  const [boxCount, setBoxCount] = useState<number>(
    contract.packageCount || Math.ceil(defaultQty / 15)
  );
  const [proofImage, setProofImage] = useState<string>(
    contract.harvestProofImageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600'
  );
  const [farmPickupAddress, setFarmPickupAddress] = useState<string>(
    contract.farmPickupAddress || contract.farmerCompany || 'Thôn Đa Quý, Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng'
  );
  const [truckAccessNote, setTruckAccessNote] = useState<string>(
    'Đường bê tông nông thôn 6m, xe tải 5 tấn vào tận bãi sân đóng gói nhà vườn'
  );
  const [pickupContactPhone, setPickupContactPhone] = useState<string>(
    contract.farmerPhone || '0912.849.688'
  );
  const [notes, setNotes] = useState<string>(
    'Rau thu hoạch sáng sớm 5h30 ráo sương, tỷ lệ cuống chuẩn, cuống ráo mủ tự nhiên'
  );
  const [activeTab, setActiveTab] = useState<'FORM' | 'QR_LABELS'>('FORM');
  const [submitting, setSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  if (!isOpen) return null;

  const grade1Weight = Math.round((actualWeight * grade1Ratio) / 100);
  const grade2Weight = actualWeight - grade1Weight;

  const handlePackageTypeChange = (val: string) => {
    setPackageType(val);
    let cap = 15;
    if (val.includes('20kg')) cap = 20;
    else if (val.includes('25kg')) cap = 25;
    else if (val.includes('10kg')) cap = 10;
    setBoxCapacity(cap);
    setBoxCount(Math.max(1, Math.ceil(actualWeight / cap)));
  };

  const handleActualWeightChange = (val: number) => {
    setActualWeight(val);
    setBoxCount(Math.max(1, Math.ceil(val / boxCapacity)));
  };

  const handlePrintLabels = (targetBoxIndex?: number) => {
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const boxesToPrint = targetBoxIndex !== undefined
      ? [targetBoxIndex]
      : Array.from({ length: boxCount }, (_, i) => i + 1);

    const todayStr = new Date().toLocaleDateString('vi-VN');
    const harvestTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const labelHtml = boxesToPrint
      .map((boxNum) => {
        const boxCode = `BOX-${String(boxNum).padStart(3, '0')}`;
        const fullCode = `${contract.contractCode}-${boxCode}`;
        const qrData = `https://honafresh.vn/tra-cuu?contract=${contract.contractCode}&box=${boxCode}&lot=${contract.lotCode || ''}&sp=${encodeURIComponent(contract.productName)}`;
        const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

        return `
          <div class="label-sheet">
            <div class="label-header">
              <div class="brand">
                <span class="brand-title">SÀN NÔNG SẢN HONA FRESH</span>
                <span class="brand-sub">HỆ THỐNG TRUY XUẤT NGUỒN GỐC NÔNG SẢN (PUC)</span>
              </div>
              <div class="badge-vietgap">TIÊU CHUẨN VIETGAP</div>
            </div>

            <div class="label-body">
              <div class="qr-col">
                <img src="${qrImg}" alt="${fullCode}" class="qr-code-img" />
                <div class="box-code">${fullCode}</div>
              </div>
              <div class="info-col">
                <div class="product-title">${contract.productName}</div>
                <div class="info-row"><b>Nông trại:</b> ${contract.farmerCompany || contract.farmerName || 'HTX Nông Nghiệp HoNa'}</div>
                <div class="info-row"><b>Mã lô vùng trồng:</b> ${contract.lotCode || 'LOT-2026-GAP'}</div>
                <div class="info-row"><b>Quy cách đóng thùng:</b> ${packageType}</div>
                <div class="info-row"><b>Khối lượng tịnh:</b> <span class="highlight">${boxCapacity} kg</span> (Tỷ lệ loại 1: ${grade1Ratio}%)</div>
                <div class="info-row"><b>Ngày đóng gói:</b> ${todayStr} lúc ${harvestTimeStr}</div>
                <div class="info-row"><b>Nơi nhận:</b> ${contract.deliveryAddress || 'Kho Chuỗi Lạnh HoNa'}</div>
              </div>
            </div>

            <div class="label-footer">
              <span>* Quét mã QR để kiểm tra nguồn gốc & chứng thư chất lượng phòng Lab HoNa Fresh</span>
              <span class="page-num">Kiện ${boxNum}/${boxCount}</span>
            </div>
          </div>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tem Nhãn Dán Thùng - ${contract.contractCode}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              background: #fff;
              color: #111;
              padding: 10px;
            }
            .grid-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8mm 6mm;
            }
            .label-sheet {
              border: 2px solid #10542C;
              border-radius: 8px;
              padding: 10px 12px;
              background: #fff;
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              min-height: 220px;
            }
            .label-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1.5px solid #10542C;
              padding-bottom: 5px;
              margin-bottom: 8px;
            }
            .brand-title {
              display: block;
              font-size: 13px;
              font-weight: 900;
              color: #10542C;
              letter-spacing: 0.5px;
            }
            .brand-sub {
              display: block;
              font-size: 8.5px;
              font-weight: 700;
              color: #555;
            }
            .badge-vietgap {
              border: 1px solid #10542C;
              background: #E8F5E9;
              color: #10542C;
              font-size: 8.5px;
              font-weight: 800;
              padding: 3px 6px;
              border-radius: 4px;
            }
            .label-body {
              display: flex;
              gap: 12px;
              align-items: center;
              flex: 1;
            }
            .qr-col {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 125px;
              flex-shrink: 0;
            }
            .qr-code-img {
              width: 115px;
              height: 115px;
              display: block;
              border: 1px solid #ddd;
              border-radius: 4px;
              padding: 3px;
              background: #fff;
            }
            .box-code {
              font-family: monospace;
              font-size: 9px;
              font-weight: 800;
              margin-top: 4px;
              color: #10542C;
              text-align: center;
              word-break: break-all;
            }
            .info-col {
              flex: 1;
              font-size: 10px;
              line-height: 1.45;
            }
            .product-title {
              font-size: 13px;
              font-weight: 900;
              color: #10542C;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .info-row {
              color: #333;
              margin-bottom: 2px;
            }
            .highlight {
              font-weight: 800;
              color: #000;
              font-size: 11px;
            }
            .label-footer {
              margin-top: 6px;
              padding-top: 4px;
              border-top: 1px dashed #ccc;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 8px;
              color: #666;
              font-style: italic;
            }
            .page-num {
              font-weight: 800;
              font-style: normal;
              color: #10542C;
            }
            @media print {
              body {
                padding: 0;
              }
              .label-sheet {
                border: 2px solid #000;
              }
              .brand-title, .box-code, .product-title, .page-num {
                color: #000 !important;
              }
              .badge-vietgap {
                border-color: #000;
                color: #000;
              }
            }
          </style>
        </head>
        <body>
          <div class="grid-container">
            ${labelHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actualWeight <= 0) return;
    setSubmitting(true);
    try {
      const qrData = `HONAFRESH-PUC-${contract.contractCode}-PACK-${boxCount}`;
      await onSubmit({
        actualHarvestWeightKg: actualWeight,
        grade1Ratio,
        packageType,
        packageCount: boxCount,
        qrCodeData: qrData,
        farmPickupAddress: `${farmPickupAddress} (SĐT đón xe: ${pickupContactPhone} - ${truckAccessNote})`,
        harvestProofImageUrl: proofImage,
        notes,
      });
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi khi gửi biên bản nghiệm thu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#10542C] flex items-center justify-center font-bold">
              <Scale className="w-5 h-5 text-[#10542C]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Nghiệm Thu Thu Hoạch & Quy Cách Đóng Gói
              </h2>
              <p className="text-xs text-gray-500 font-mono">
                Mã HĐ: <strong className="text-[#10542C]">{contract.contractCode}</strong> &bull; {contract.productName}
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

        {/* Sub-tabs: Nhập biên bản vs Xem tem dán thùng */}
        <div className="px-6 pt-3 flex gap-2 border-b border-gray-100 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('FORM')}
            className={`pb-2 text-xs font-bold transition border-b-2 ${
              activeTab === 'FORM'
                ? 'border-[#10542C] text-[#10542C]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            1. Khai Báo Nghiệm Thu & Đóng Kiện
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('QR_LABELS')}
            className={`pb-2 text-xs font-bold transition border-b-2 flex items-center gap-1 ${
              activeTab === 'QR_LABELS'
                ? 'border-[#10542C] text-[#10542C]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>2. Danh Sách Tem Nhãn ({boxCount} kiện)</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {activeTab === 'FORM' ? (
            <form id="harvest-form" onSubmit={handleFormSubmit} className="space-y-4">
              {/* 1. Phân loại sản lượng */}
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-3">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                  1. Sản Lượng Cắt Thực Tế & Phân Loại Tại Rẫy
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">
                      Sản Lượng Chốt HĐ
                    </label>
                    <div className="px-3 py-2 rounded-xl bg-gray-200/70 text-gray-700 font-mono font-bold text-sm">
                      {(contract.quantityKg || 0).toLocaleString('vi-VN')} kg
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#10542C] mb-1">
                      Cân Thực Tế (kg) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      required
                      value={actualWeight}
                      onChange={(e) => handleActualWeightChange(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-mono font-bold text-sm focus:ring-2 focus:ring-[#10542C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Tỷ Lệ Loại 1 (%)
                    </label>
                    <input
                      type="number"
                      min="80"
                      max="100"
                      value={grade1Ratio}
                      onChange={(e) => setGrade1Ratio(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 font-mono text-sm focus:ring-2 focus:ring-[#10542C]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 px-1 text-gray-600">
                  <span>
                    Loại 1 (Xuất siêu thị): <strong className="text-emerald-700 font-mono">{grade1Weight} kg</strong> ({grade1Ratio}%)
                  </span>
                  <span>
                    Loại 2 (Hao cuống/lá già): <strong className="text-amber-700 font-mono">{grade2Weight} kg</strong> ({100 - grade1Ratio}%)
                  </span>
                </div>
              </div>

              {/* 2. Quy cách đóng gói */}
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-3">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                  2. Quy Cách Đóng Gói & Số Kiện Hàng Xuất Kho
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Quy Cách Kiện / Thùng *
                    </label>
                    <select
                      value={packageType}
                      onChange={(e) => handlePackageTypeChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs font-medium focus:ring-2 focus:ring-[#10542C]"
                    >
                      <option value="Thùng xốp 15kg (Dán tem niêm phong)">Thùng xốp 15kg (Lót giấy rơm giữ ẩm)</option>
                      <option value="Thùng carton 5 lớp 20kg (Lỗ thoáng)">Thùng carton 5 lớp 20kg (Lỗ thông khí)</option>
                      <option value="Sọt nhựa 25kg (Lót lá chuối tươi)">Sọt nhựa 25kg (Lót lá chuối tươi)</option>
                      <option value="Túi lưới chuyên dụng 10kg">Túi lưới chuyên dụng 10kg</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Tổng Số Thùng Đã Đóng (Kiện) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={boxCount}
                      onChange={(e) => setBoxCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 font-mono font-bold text-sm focus:ring-2 focus:ring-[#10542C]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Địa chỉ đón xe tại farm */}
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-3">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                  3. Địa Chỉ Cụ Thể Để Xe Lạnh HoNa Đến Lấy Hàng
                </span>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Địa Chỉ Vườn / Nhà Lưới Đón Xe *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={farmPickupAddress}
                      onChange={(e) => setFarmPickupAddress(e.target.value)}
                      placeholder="Số nhà, đường, thôn rẫy, xã, huyện, tỉnh"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs focus:ring-2 focus:ring-[#10542C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      SĐT Người Đón Xe Tại Vườn *
                    </label>
                    <input
                      type="text"
                      required
                      value={pickupContactPhone}
                      onChange={(e) => setPickupContactPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs font-mono focus:ring-2 focus:ring-[#10542C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Cung Đường & Cầu Tải Trọng Xe
                    </label>
                    <input
                      type="text"
                      value={truckAccessNote}
                      onChange={(e) => setTruckAccessNote(e.target.value)}
                      placeholder="VD: Xe tải 5 tấn vào tận sân, cầu không cấm tải"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs focus:ring-2 focus:ring-[#10542C]"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Ảnh minh chứng cân và cắt rau */}
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                    4. Ảnh Minh Chứng Cân & Đóng Thùng
                  </span>
                  <span className="text-[11px] text-gray-500">Hỗ trợ JPG, PNG, WEBP tối đa 10MB</span>
                </div>

                <ImageUploadField
                  name="harvestProofImageUrl"
                  label="Tải ảnh chụp thực tế cân bàn / đóng kiện từ thiết bị"
                  purpose="LOT"
                  value={proofImage}
                  onChange={(url) => setProofImage(url)}
                  onUploadingChange={setIsUploadingImage}
                  hint="Ảnh chụp rõ màn hình cân điện tử rẫy hoặc kiện hàng dán tem niêm phong"
                />

                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">
                    Hoặc dán trực tiếp liên kết URL ảnh (nếu có sẵn):
                  </label>
                  <input
                    type="text"
                    value={proofImage}
                    onChange={(e) => setProofImage(e.target.value)}
                    placeholder="https://images.unsplash.com/... hoặc link ảnh online"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-mono text-xs focus:ring-2 focus:ring-[#10542C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Ghi Chú Đóng Kiện & Tình Trạng Thu Hoạch
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ghi chú thêm về chất lượng rau sau thu hoạch..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs focus:ring-2 focus:ring-[#10542C]"
                  />
                </div>
              </div>
            </form>
          ) : (
            /* Sub-tab 2: Danh sách tem QR in dán từng thùng */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#10542C] text-white flex items-center justify-center shrink-0">
                    <Printer className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      Tem Truy Xuất Nguồn Gốc HoNa Fresh PUC ({boxCount} Thùng)
                    </span>
                    <span className="text-[11px] text-emerald-700 block">
                      Mã QR thật chuẩn ISO/IEC 18004 · Quét được bằng camera điện thoại, Zalo và máy quét kho lạnh
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePrintLabels()}
                  className="px-4 py-2 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 shrink-0"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>In Toàn Bộ {boxCount} Tem (A4 / Decal)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[50vh] overflow-y-auto pr-1">
                {Array.from({ length: boxCount }).map((_, i) => {
                  const boxCode = `BOX-${String(i + 1).padStart(3, '0')}`;
                  const fullCode = `${contract.contractCode}-${boxCode}`;
                  const qrData = `https://honafresh.vn/tra-cuu?contract=${contract.contractCode}&box=${boxCode}&lot=${contract.lotCode || ''}&sp=${encodeURIComponent(contract.productName)}`;
                  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

                  return (
                    <div
                      key={boxCode}
                      className="p-3 bg-white border border-gray-200 hover:border-green-600 rounded-2xl shadow-2xs flex gap-3 items-center transition"
                    >
                      {/* Ảnh QR Thật Scannable */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-20 h-20 p-1 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrImg}
                            alt={fullCode}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                        <span className="text-[9px] font-mono font-bold text-[#10542C] mt-1 text-center">
                          {boxCode}
                        </span>
                      </div>

                      {/* Thông tin tem */}
                      <div className="flex-1 min-w-0 text-left space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                            Kiện {i + 1}/{boxCount}
                          </span>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                            VietGAP
                          </span>
                        </div>
                        <strong className="text-xs font-bold text-gray-900 block truncate" title={contract.productName}>
                          {contract.productName}
                        </strong>
                        <p className="text-[10px] text-gray-600 font-mono truncate">
                          Mã: {fullCode}
                        </p>
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-gray-100">
                          <span className="font-semibold text-emerald-800">
                            Quy cách: {boxCapacity}kg
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePrintLabels(i + 1)}
                            className="text-[#10542C] hover:text-[#0C3E20] font-bold text-[10px] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>In tem này</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-white text-xs font-bold transition cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="submit"
            form="harvest-form"
            disabled={submitting || actualWeight <= 0 || isUploadingImage}
            className="px-5 py-2.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang gửi biên bản...</span>
              </>
            ) : isUploadingImage ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tải ảnh lên...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Nộp Nghiệm Thu & Gửi Admin Điều Xe</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
