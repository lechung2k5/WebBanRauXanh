'use client';

import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  PlusCircle,
  Clock,
  MapPin,
  Building2,
  DollarSign,
  Scale,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { B2BProcurementRequest } from '@/types';
import { MOCK_PROCUREMENT_REQUESTS } from '@/services/api';
import CreateProcurementModal from './CreateProcurementModal';

interface ProcurementBoardSectionProps {
  className?: string;
  onOpenCreate?: () => void;
}

export default function ProcurementBoardSection({
  className = '',
  onOpenCreate,
}: ProcurementBoardSectionProps) {
  const [requests, setRequests] = useState<B2BProcurementRequest[]>(MOCK_PROCUREMENT_REQUESTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quotedIds, setQuotedIds] = useState<string[]>([]);
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('b2b_procurement_posts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRequests([...parsed, ...MOCK_PROCUREMENT_REQUESTS]);
        }
      }
    } catch {}
  }, []);

  const handleSendQuote = (req: B2BProcurementRequest) => {
    if (quotedIds.includes(req.id)) return;
    setQuotedIds([...quotedIds, req.id]);
    setQuoteSuccessMsg(`Đã gửi hồ sơ năng lực & báo giá nông sản tới ${req.traderCompany}!`);
    setTimeout(() => setQuoteSuccessMsg(null), 4000);
  };

  return (
    <section className={`bg-white rounded-3xl border border-[#D7EED6] p-5 sm:p-7 shadow-xs space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E1EFE3]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E53935]/10 text-[#E53935] text-[11px] font-bold">
            <Megaphone className="w-3.5 h-3.5" />
            <span>Sàn Chào Mua B2B Trực Tuyến</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-black text-[#10542C]">
            Thương Lái & Chuỗi Bán Lẻ Đang Tìm Nguồn Cung
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280]">
            Nhà vườn & Hợp Tác Xã có thể gửi báo giá trực tiếp để ký hợp đồng thu mua bao tiêu ngay hôm nay.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenCreate ? onOpenCreate() : setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-[#8BC34A]" />
          <span>Đăng tin cần thu mua</span>
        </button>
      </div>

      {quoteSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-[#10542C] flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#4CAF50] shrink-0" />
          <span>{quoteSuccessMsg}</span>
        </div>
      )}

      {/* Grid of Procurement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requests.map((req) => {
          const isQuoted = quotedIds.includes(req.id);
          return (
            <div
              key={req.id}
              className="p-4 sm:p-5 rounded-2xl border border-[#EAECE8] bg-[#FDFEFC] hover:border-[#10542C]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-mono font-bold text-[#10542C] bg-[#10542C]/10 px-2 py-0.5 rounded-md">
                    {req.category}
                  </span>
                  <span className="text-[#6B7280] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#4CAF50]" />
                    {req.createdAt}
                  </span>
                </div>

                <h3 className="font-heading font-bold text-sm sm:text-base text-[#10542C] group-hover:text-emerald-800 transition-colors line-clamp-2">
                  {req.title}
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-[#F4F7F4] p-2 rounded-xl">
                    <span className="text-[10px] text-[#6B7280] block">Sản lượng cần:</span>
                    <strong className="text-sm font-black text-[#10542C]">{req.volumeNeeded}</strong>
                  </div>
                  <div className="bg-[#F4F7F4] p-2 rounded-xl">
                    <span className="text-[10px] text-[#6B7280] block">Giá sỉ kỳ vọng:</span>
                    <strong className="text-xs font-bold text-[#E53935]">{req.targetPriceRange}</strong>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-[#2C3E2E] pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                    <Building2 className="w-3.5 h-3.5 text-[#4CAF50] shrink-0" />
                    <span>Đơn vị: <strong className="text-[#2C3E2E]">{req.traderCompany}</strong> ({req.traderName})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                    <MapPin className="w-3.5 h-3.5 text-[#8BC34A] shrink-0" />
                    <span className="truncate">Giao tại: {req.destination}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#6B7280]">
                  Đã có <strong className="text-[#10542C]">{req.quoteCount + (isQuoted ? 1 : 0)}</strong> nhà vườn chào giá
                </span>

                <button
                  type="button"
                  onClick={() => handleSendQuote(req)}
                  disabled={isQuoted}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isQuoted
                      ? 'bg-emerald-100 text-[#10542C] border border-emerald-300'
                      : 'bg-[#10542C] hover:bg-[#0C3E20] text-white active:scale-95'
                  }`}
                >
                  {isQuoted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#4CAF50]" />
                      <span>Đã gửi báo giá</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-[#8BC34A]" />
                      <span>Chào giá cung cấp</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <CreateProcurementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitSuccess={(newReq) => {
          setRequests([newReq, ...requests]);
          setIsModalOpen(false);
        }}
      />
    </section>
  );
}
