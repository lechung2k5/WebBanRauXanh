'use client';

import React, { useState } from 'react';
import { X, Send, Megaphone, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { B2BProcurementRequest } from '@/types';

interface CreateProcurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (newReq: B2BProcurementRequest) => void;
}

export default function CreateProcurementModal({
  isOpen,
  onClose,
  onSubmitSuccess,
}: CreateProcurementModalProps) {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Củ quả');
  const [volumeNeeded, setVolumeNeeded] = useState('');
  const [targetPriceRange, setTargetPriceRange] = useState('');
  const [preferredRegion, setPreferredRegion] = useState('Lâm Đồng / Đà Lạt');
  const [destination, setDestination] = useState('Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM');
  const [traderName, setTraderName] = useState('');
  const [traderCompany, setTraderCompany] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !volumeNeeded || !traderName) {
      alert('Vui lòng điền các trường bắt buộc!');
      return;
    }

    const newReq: B2BProcurementRequest = {
      id: `rfq-${Date.now()}`,
      title,
      category,
      categorySlug: category === 'Nấm tươi' ? 'nam-tuoi' : category === 'Rau sạch' ? 'rau-sach' : 'cu',
      traderName,
      traderCompany: traderCompany || 'Đại lý Thu Mua Nông Sản',
      volumeNeeded,
      targetPriceRange: targetPriceRange || 'Thương lượng theo chất lượng',
      preferredRegion,
      destination,
      deadline: deadline ? `Cần nhận trước ${deadline}` : 'Cần hàng gấp trong tuần',
      status: 'OPEN',
      quoteCount: 0,
      createdAt: 'Vừa xong',
    };

    try {
      const stored = JSON.parse(localStorage.getItem('b2b_procurement_posts') || '[]');
      stored.unshift(newReq);
      localStorage.setItem('b2b_procurement_posts', JSON.stringify(stored));
    } catch {}

    setIsSuccess(true);
    if (onSubmitSuccess) onSubmitSuccess(newReq);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl z-10 border border-[#D7EED6]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#758A7A] hover:text-[#2C3E2E] rounded-full hover:bg-[#F4F5F1] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-[#10542C] mx-auto">
              <CheckCircle2 className="w-9 h-9 text-[#4CAF50]" />
            </div>
            <h3 className="font-heading text-xl font-black text-[#10542C]">
              Đăng Tin Thu Mua Thành Công!
            </h3>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              Yêu cầu thu mua của bạn đã được hiển thị trên Sàn Chào Mua B2B. Các Hợp Tác Xã & Nhà Vườn phù hợp sẽ nhận thông báo để gửi báo giá.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold"
            >
              Xem sàn chào mua
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10542C]/10 text-[#10542C] text-[11px] font-bold">
                <Megaphone className="w-3.5 h-3.5 text-[#4CAF50]" />
                <span>Dành Cho Thương Lái & Đơn Vị Thu Mua</span>
              </div>
              <h3 className="font-heading text-xl font-black text-[#10542C]">
                Đăng Yêu Cầu Thu Mua Nông Sản Số Lượng Lớn
              </h3>
              <p className="text-xs text-[#6B7280]">
                Tiếp cận hơn 500+ Hợp tác xã và Nhà vườn toàn quốc để nhận báo giá sỉ tận gốc.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                Tiêu đề nhu cầu thu mua *
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Cần thu mua 25 Tấn Cải Thảo Đà Lạt đóng sọt chuyển kho Thủ Đức"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Nhóm nông sản
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                >
                  <option value="Rau sạch">Rau Ăn Lá Sỉ</option>
                  <option value="Củ quả">Củ & Quả Lô</option>
                  <option value="Nấm tươi">Nấm Tươi Sỉ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Sản lượng cần mua (Tấn/Kg) *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 15 Tấn hoặc 5.000 kg"
                  value={volumeNeeded}
                  onChange={(e) => setVolumeNeeded(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Mức giá kỳ vọng (VNĐ/kg)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 10.000 - 12.000 đ/kg"
                  value={targetPriceRange}
                  onChange={(e) => setTargetPriceRange(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Khu vực ưu tiên tìm nguồn
                </label>
                <select
                  value={preferredRegion}
                  onChange={(e) => setPreferredRegion(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                >
                  <option value="Lâm Đồng / Đà Lạt">Lâm Đồng / Đà Lạt</option>
                  <option value="Đồng Bằng Sông Cửu Long">Đồng Bằng Sông Cửu Long</option>
                  <option value="Mộc Châu / Miền Bắc">Mộc Châu / Miền Bắc</option>
                  <option value="Tây Nguyên (Đắk Lắk, Gia Lai)">Tây Nguyên (Đắk Lắk, Gia Lai)</option>
                  <option value="Toàn quốc (Bao cước xe lạnh)">Toàn quốc (Bao cước xe lạnh)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                Kho nhận hàng / Điểm tập kết
              </label>
              <input
                type="text"
                placeholder="Chợ Đầu Mối Thủ Đức / Kho riêng thương lái"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Đại diện thương lái *
                </label>
                <input
                  type="text"
                  placeholder="Họ tên người liên hệ"
                  value={traderName}
                  onChange={(e) => setTraderName(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] mb-1">
                  Tên vựa / Doanh nghiệp
                </label>
                <input
                  type="text"
                  placeholder="Đại lý thu mua"
                  value={traderCompany}
                  onChange={(e) => setTraderCompany(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#10542C] hover:bg-[#0C3E20] text-white font-heading font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Đăng tin chào mua lên sàn</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
