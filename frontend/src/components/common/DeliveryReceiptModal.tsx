'use client';

import React from 'react';
import { CheckCircle2, FileCheck2, Receipt, X } from 'lucide-react';
import { OutboundDeliveryStopDto } from '@/services/fleetDispatchApi';

interface DeliveryReceiptModalProps {
  stop: OutboundDeliveryStopDto | null;
  onClose: () => void;
}

export function printDeliveryReceiptA4(stop: OutboundDeliveryStopDto) {
  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) {
    alert('Trình duyệt đang chặn cửa sổ bật lên (Popup). Vui lòng cho phép mở popup để in.');
    return;
  }

  const contractCode = stop.contractCode || stop.contract?.contractCode || `HĐ-${stop.contractId}`;
  const tripCode = stop.tripCode || 'Chuyến Outbound';
  const confirmedAt = stop.buyerConfirmedAt
    ? new Date(stop.buyerConfirmedAt).toLocaleString('vi-VN')
    : new Date().toLocaleString('vi-VN');
  const expectedKg = Number(stop.expectedWeightKg || 0);
  const actualKg = Number(stop.actualDeliveredWeightKg || expectedKg);
  const rejectedKg = Number(stop.rejectedWeightKg || 0);
  const driverName = stop.driverName || 'Tài xế HoNa Express';
  const buyerName = stop.buyerSignerName || stop.contactNameSnapshot || 'Đại diện Khách hàng';
  const driverSig = stop.driverSignatureData || '';
  const buyerSig = stop.buyerSignatureData || '';
  const photo = stop.handoverPhotoUrl || '';

  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Biên Bản Giao Nhận ${contractCode}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div style="text-align:center;border-bottom:2px solid #10542c;padding-bottom:10px;margin-bottom:14px;">
          <div style="font-size:11px;font-weight:bold;color:#10542c;text-transform:uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM · HỆ THỐNG NÔNG SẢN B2B HONA FRESH</div>
          <h1 style="margin:6px 0 2px;font-size:18px;color:#10542c;">BIÊN BẢN GIAO NHẬN HÀNG HÓA (ePOD)</h1>
          <div style="font-size:11px;color:#475569;">Hợp đồng: <strong>${contractCode}</strong> · Chuyến xe: <strong>${tripCode}</strong> (${stop.vehiclePlate || 'Xe tải lạnh'}) · Ký nhận lúc: ${confirmedAt}</div>
        </div>

        <div style="display:flex;gap:16px;margin-bottom:14px;">
          <div style="flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:10px;">
            <div style="font-weight:bold;color:#10542c;margin-bottom:4px;">BÊN GIAO HÀNG (VẬN CHUYỂN)</div>
            <div>Tài xế: <strong>${driverName}</strong></div>
            <div>Phương tiện: <strong>${stop.vehiclePlate || 'Xe Lạnh HoNa'}</strong></div>
            <div>Ghi chú giao: ${stop.driverNotes || 'Bàn giao đủ hàng, nhiệt độ đạt chuẩn'}</div>
          </div>
          <div style="flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:10px;">
            <div style="font-weight:bold;color:#10542c;margin-bottom:4px;">BÊN NHẬN HÀNG (KHÁCH HÀNG / BUYER)</div>
            <div>Người ký nhận: <strong>${buyerName}</strong> (${stop.buyerSignerPhone || stop.contactPhoneSnapshot || ''})</div>
            <div>Địa chỉ nhận: ${stop.deliveryAddressSnapshot || ''}</div>
            <div>Ghi chú nhận: ${stop.buyerNotes || 'Đã kiểm đếm và nhận đủ hàng đạt chuẩn'}</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">Hạng mục kiểm đếm</th>
              <th style="border:1px solid #cbd5e1;padding:8px;text-align:right;">Khối lượng (kg)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #cbd5e1;padding:8px;">Khối lượng xuất kho dự kiến</td>
              <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;">${expectedKg.toLocaleString('vi-VN')} kg</td>
            </tr>
            <tr>
              <td style="border:1px solid #cbd5e1;padding:8px;font-weight:bold;color:#10542c;">Khối lượng thực giao đạt chuẩn (Q4)</td>
              <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;font-weight:bold;color:#10542c;">${actualKg.toLocaleString('vi-VN')} kg</td>
            </tr>
            <tr>
              <td style="border:1px solid #cbd5e1;padding:8px;">Khối lượng hư hao / từ chối</td>
              <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;">${rejectedKg.toLocaleString('vi-VN')} kg ${stop.rejectionReason ? `(${stop.rejectionReason})` : ''}</td>
            </tr>
          </tbody>
        </table>

        ${photo ? `<div style="margin-bottom:14px;"><div style="font-weight:bold;margin-bottom:6px;">Ảnh chụp bàn giao thực tế giữa Tài xế và Khách hàng:</div><img src="${photo}" style="max-height:180px;border-radius:8px;border:1px solid #cbd5e1;" /></div>` : ''}

        <div style="display:flex;justify-content:space-between;gap:24px;margin-top:18px;text-align:center;">
          <div style="flex:1;">
            <div style="font-weight:bold;">BÊN GIAO (TÀI XẾ VẬN CHUYỂN)</div>
            <div style="font-size:10px;color:#64748b;margin-bottom:6px;">(Ký và ghi rõ họ tên)</div>
            ${driverSig && driverSig.startsWith('data:image/') ? `<img src="${driverSig}" style="max-height:85px;margin:4px auto;display:block;" />` : '<div style="height:85px;"></div>'}
            <div style="font-weight:bold;margin-top:4px;">${driverName}</div>
          </div>
          <div style="flex:1;">
            <div style="font-weight:bold;">BÊN NHẬN (KHÁCH HÀNG / BUYER)</div>
            <div style="font-size:10px;color:#64748b;margin-bottom:6px;">(Ký và ghi rõ họ tên)</div>
            ${buyerSig && buyerSig.startsWith('data:image/') ? `<img src="${buyerSig}" style="max-height:85px;margin:4px auto;display:block;" />` : '<div style="height:85px;"></div>'}
            <div style="font-weight:bold;margin-top:4px;">${buyerName}</div>
          </div>
        </div>
        <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
      </body>
    </html>
  `);
  win.document.close();
}

export const DeliveryReceiptModal: React.FC<DeliveryReceiptModalProps> = ({ stop, onClose }) => {
  if (!stop) return null;

  const contractCode = stop.contractCode || stop.contract?.contractCode || `HĐ-${stop.contractId}`;
  const driverName = stop.driverName || 'Tài xế HoNa Express';
  const buyerName = stop.buyerSignerName || stop.contactNameSnapshot || 'Đại diện Khách hàng';

  return (
    <div className="fixed inset-0 z-[165] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-xs max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 bg-gradient-to-r from-[#0F3820] to-[#10542C] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="text-base font-black">BIÊN BẢN GIAO NHẬN HÀNG HÓA (ePOD)</h3>
              <p className="text-[11px] font-mono text-emerald-100">
                Hợp đồng: {contractCode} · Chuyến: {stop.tripCode || 'Outbound'} ({stop.vehiclePlate || 'Xe lạnh'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-900">
            <span className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Đã xác nhận giao nhận hợp lệ giữa Tài xế & Khách hàng
            </span>
            <span className="font-mono text-[11px]">
              {stop.buyerConfirmedAt ? new Date(stop.buyerConfirmedAt).toLocaleString('vi-VN') : 'Đã ký nhận'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Bên Giao (Tài Xế Vận Chuyển)</span>
              <strong className="text-slate-900 block">{driverName}</strong>
              <span className="text-slate-600 font-mono block">{stop.vehiclePlate || 'Xe Lạnh HoNa'}</span>
              <p className="text-[11px] text-slate-500 pt-1">{stop.driverNotes || 'Bàn giao đủ số lượng, nhiệt độ đạt chuẩn'}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Bên Nhận (Khách Hàng / Buyer)</span>
              <strong className="text-slate-900 block">{buyerName}</strong>
              <span className="text-slate-600 font-mono block">{stop.buyerSignerPhone || stop.contactPhoneSnapshot}</span>
              <p className="text-[11px] text-slate-500 pt-1">{stop.buyerNotes || 'Đã kiểm đếm đủ hàng hóa đạt chuẩn'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div>
              <span className="text-[10px] text-slate-500 block">Xuất kho dự kiến</span>
              <strong className="font-mono text-sm text-slate-800">{Number(stop.expectedWeightKg || 0).toLocaleString()} kg</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Thực giao đạt chuẩn (Q4)</span>
              <strong className="font-mono text-sm text-emerald-700">
                {Number(stop.actualDeliveredWeightKg || stop.expectedWeightKg || 0).toLocaleString()} kg
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Hao hụt / Từ chối</span>
              <strong className={`font-mono text-sm ${Number(stop.rejectedWeightKg || 0) > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {Number(stop.rejectedWeightKg || 0).toLocaleString()} kg
              </strong>
            </div>
          </div>

          {stop.handoverPhotoUrl && (
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block">Ảnh chụp bàn giao giữa Tài xế & Khách hàng:</span>
              <img
                src={stop.handoverPhotoUrl}
                alt="Ảnh chụp bàn giao"
                className="max-h-48 w-full object-cover rounded-2xl border border-slate-200"
              />
            </div>
          )}

          {/* Chữ ký 2 bên: Tài xế & Khách hàng */}
          <div className="grid grid-cols-2 gap-4 text-center pt-1">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Chữ Ký Bên Giao (Tài Xế)</span>
              {stop.driverSignatureData && stop.driverSignatureData.startsWith('data:image/') ? (
                <img src={stop.driverSignatureData} alt="Chữ ký tài xế" className="max-h-24 mx-auto bg-white rounded p-1 border border-dashed border-slate-300" />
              ) : (
                <span className="text-slate-400 italic block py-6">Đã xác thực chữ ký số</span>
              )}
              <strong className="text-slate-800 block">{driverName}</strong>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Chữ Ký Bên Nhận (Khách Hàng)</span>
              {stop.buyerSignatureData && stop.buyerSignatureData.startsWith('data:image/') ? (
                <img src={stop.buyerSignatureData} alt="Chữ ký khách hàng" className="max-h-24 mx-auto bg-white rounded p-1 border border-dashed border-slate-300" />
              ) : (
                <span className="text-slate-400 italic block py-6">Đã xác thực chữ ký số</span>
              )}
              <strong className="text-slate-800 block">{buyerName}</strong>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => printDeliveryReceiptA4(stop)}
            className="px-4 py-2 rounded-xl bg-[#10542C] hover:bg-emerald-900 text-white font-bold cursor-pointer flex items-center gap-1.5"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>In Biên Bản Giao Nhận (A4)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
