'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Megaphone,
  PlusCircle,
  Clock,
  MapPin,
  Building2,
  Send,
  CheckCircle2,
  Eye,
  X,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  getProcurementQuotesApi,
  getProcurementRequestsApi,
  type ProcurementQuoteItem,
  type ProcurementRequestItem,
} from '@/services/api';
import { b2bWebSocket } from '@/services/websocketService';
import CreateProcurementModal from './CreateProcurementModal';
import QuoteProcurementModal from './QuoteProcurementModal';
import { Tilt3DCard } from '@/components/home/Tilt3DCard';

interface ProcurementBoardSectionProps {
  className?: string;
  onOpenCreate?: () => void;
}

export default function ProcurementBoardSection({
  className = '',
  onOpenCreate,
}: ProcurementBoardSectionProps) {
  const { currentUser } = useApp();
  const [requests, setRequests] = useState<ProcurementRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [quotingRequest, setQuotingRequest] = useState<ProcurementRequestItem | null>(null);
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState<string | null>(null);

  // Xem danh sách báo giá dành cho Thương lái chủ tin
  const [viewingQuotesFor, setViewingQuotesFor] = useState<ProcurementRequestItem | null>(null);
  const [quotesList, setQuotesList] = useState<ProcurementQuoteItem[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const loadProcurements = useCallback(async () => {
    try {
      const data = await getProcurementRequestsApi();
      setRequests(data);
    } catch {
      // Giữ nguyên state hiện tại nếu lỗi mạng tạm thời
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProcurements();
    const unsub = b2bWebSocket.subscribeProcurements(() => {
      void loadProcurements();
    });
    const handleLocalUpdate = () => void loadProcurements();
    window.addEventListener('b2b_procurement_updated', handleLocalUpdate);
    return () => {
      unsub();
      window.removeEventListener('b2b_procurement_updated', handleLocalUpdate);
    };
  }, [loadProcurements]);

  const handleOpenViewQuotes = async (req: ProcurementRequestItem) => {
    setViewingQuotesFor(req);
    setLoadingQuotes(true);
    try {
      const data = await getProcurementQuotesApi(req.id);
      setQuotesList(data);
    } catch {
      setQuotesList([]);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const formatTimeLabel = (iso: string) => {
    if (!iso) return 'Mới đăng';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Mới đăng';
    return d.toLocaleDateString('vi-VN');
  };

  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-br from-white via-[#F9FCF9] to-[#F1F8F3] rounded-3xl border border-[#D7EED6] p-6 sm:p-8 shadow-md space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E1EFE3]">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E53935]/10 text-[#E53935] text-[11px] font-bold border border-[#E53935]/15">
            <span className="w-2 h-2 rounded-full bg-[#E53935] animate-ping" />
            <Megaphone className="w-3.5 h-3.5" />
            <span>Sàn Chào Mua B2B Trực Tuyến</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-black text-[#10542C]">
            Thương Lái &amp; Chuỗi Bán Lẻ Đang Tìm Nguồn Cung
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280]">
            Nhà vườn đã có lô nông sản được duyệt (OPEN) có thể gửi chào giá trực tiếp cho Thương lái.
          </p>
        </div>

        <button
          type="button"
          onClick={() => (onOpenCreate ? onOpenCreate() : setIsCreateModalOpen(true))}
          className="relative overflow-hidden shimmer-hover px-5 py-3 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-2xl text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-[#8BC34A]" />
          <span>Đăng tin cần thu mua</span>
        </button>
      </div>

      {quoteSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-[#10542C] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#4CAF50] shrink-0" />
          <span>{quoteSuccessMsg}</span>
        </div>
      )}

      {/* Grid of Procurement Cards */}
      {loading ? (
        <div className="py-10 flex items-center justify-center gap-2 text-xs text-[#6B7280]">
          <Loader2 className="w-5 h-5 animate-spin text-[#10542C]" />
          <span>Đang tải danh sách tin thu mua B2B...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#CBE3D0] p-8 text-center space-y-2">
          <p className="font-heading font-bold text-sm text-[#10542C]">
            Chưa có tin cần thu mua nào được đăng
          </p>
          <p className="text-xs text-[#6B7280]">
            Thương lái có thể bấm &ldquo;Đăng tin cần thu mua&rdquo; để tìm nguồn cung nông sản sỉ từ các Nhà vườn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {requests.map((req) => {
            const isOwner = Boolean(currentUser && Number(currentUser.id) === Number(req.buyerId));
            return (
              <Tilt3DCard
                key={req.id}
                maxTilt={5}
                glowColor="rgba(16, 84, 44, 0.12)"
                className="p-5 sm:p-6 rounded-2xl border border-[#E3EDE5] bg-white shadow-xs hover:shadow-xl hover:border-[#4CAF50]/40 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="font-mono font-bold text-[#10542C] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      {req.category}
                    </span>
                    <span className="text-[#6B7280] flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-[#4CAF50]" />
                      {formatTimeLabel(req.createdAt)}
                    </span>
                  </div>

                  <h3 className="font-heading font-extrabold text-sm sm:text-base text-[#10542C] group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                    {req.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-[#F4F8F5] border border-emerald-100 p-2.5 rounded-xl">
                      <span className="text-[10px] text-[#6B7280] block">Sản lượng cần:</span>
                      <strong className="text-sm font-black text-[#10542C]">{req.volumeNeeded}</strong>
                    </div>
                    <div className="bg-[#FFF8F6] border border-rose-100 p-2.5 rounded-xl">
                      <span className="text-[10px] text-[#6B7280] block">Giá sỉ kỳ vọng:</span>
                      <strong className="text-xs sm:text-sm font-black text-[#E53935]">
                        {req.targetPriceRange}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#2C3E2E]">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                      <Building2 className="w-3.5 h-3.5 text-[#4CAF50] shrink-0" />
                      <span className="truncate">
                        Đơn vị: <strong className="text-[#2C3E2E]">{req.buyerCompany || req.buyerName}</strong> (
                        {req.buyerName})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                      <MapPin className="w-3.5 h-3.5 text-[#8BC34A] shrink-0" />
                      <span className="truncate">Giao tại: {req.destination}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F0F4F1] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#6B7280]">
                    Đã có <strong className="text-[#10542C]">{req.quoteCount}</strong> nhà vườn chào giá
                  </span>

                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => void handleOpenViewQuotes(req)}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-[#10542C] border border-emerald-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem báo giá ({req.quoteCount})</span>
                      </button>
                    )}

                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => setQuotingRequest(req)}
                        disabled={req.quotedByCurrentUser}
                        className={`relative overflow-hidden shimmer-hover px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          req.quotedByCurrentUser
                            ? 'bg-emerald-100 text-[#10542C] border border-emerald-300'
                            : 'bg-[#10542C] hover:bg-[#0C3E20] text-white active:scale-95'
                        }`}
                      >
                        {req.quotedByCurrentUser ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#4CAF50]" />
                            <span>Đã chào giá</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 text-[#8BC34A]" />
                            <span>Chào giá cung cấp</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </Tilt3DCard>
            );
          })}
        </div>
      )}

      <CreateProcurementModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmitSuccess={() => {
          setIsCreateModalOpen(false);
          setQuoteSuccessMsg('Đã đăng tin cần thu mua lên Sàn B2B thành công!');
          setTimeout(() => setQuoteSuccessMsg(null), 4000);
          void loadProcurements();
        }}
      />

      <QuoteProcurementModal
        request={quotingRequest}
        onClose={() => setQuotingRequest(null)}
        onSuccess={() => {
          setQuoteSuccessMsg('Đã gửi chào giá và tạo Đơn Đàm Phán (RFQ) tới Thương lái thành công!');
          setTimeout(() => setQuoteSuccessMsg(null), 5000);
          void loadProcurements();
        }}
      />

      {/* Modal xem danh sách báo giá dành cho Thương lái chủ tin */}
      {viewingQuotesFor &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-[#EAECE8] overflow-hidden">
            <div className="bg-[#10542C] text-white px-6 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-heading font-bold text-base truncate">
                  Báo Giá Từ Nhà Vườn
                </h3>
                <p className="text-[11px] text-emerald-100/80 truncate">{viewingQuotesFor.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingQuotesFor(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3">
              {loadingQuotes ? (
                <div className="py-8 flex items-center justify-center gap-2 text-xs text-[#6B7280]">
                  <Loader2 className="w-5 h-5 animate-spin text-[#10542C]" />
                  <span>Đang tải báo giá...</span>
                </div>
              ) : quotesList.length === 0 ? (
                <p className="text-center text-xs text-[#6B7280] py-8">
                  Chưa có nhà vườn nào gửi chào giá cho tin thu mua này.
                </p>
              ) : (
                quotesList.map((q) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl border border-[#E3EDE5] bg-[#F9FCF9] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm text-[#10542C]">{q.farmerName}</strong>
                      <span className="font-mono text-[10px] font-bold bg-emerald-100 text-[#10542C] px-2 py-0.5 rounded-full">
                        Lô: {q.lotCode}
                      </span>
                    </div>
                    <p className="text-[#2C3E2E] font-semibold">
                      Sản phẩm: {q.productName}
                    </p>
                    <div className="flex flex-wrap gap-3 text-[11px] text-[#6B7280]">
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        PUC: {q.pucCode || 'N/A'} · {q.certification || 'VietGAP'}
                      </span>
                      <span>
                        Giá chào:{' '}
                        <strong className="text-[#E53935]">
                          {new Intl.NumberFormat('vi-VN').format(q.offeredPricePerKg)} đ/kg
                        </strong>
                      </span>
                      <span>
                        Sản lượng:{' '}
                        <strong className="text-[#10542C]">
                          {new Intl.NumberFormat('vi-VN').format(q.offeredQuantityKg)} kg
                        </strong>
                      </span>
                    </div>
                    {q.notes && <p className="text-[11px] text-[#6B7280] italic">Ghi chú: {q.notes}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
