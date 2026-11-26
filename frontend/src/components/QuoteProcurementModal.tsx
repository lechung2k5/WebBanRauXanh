'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  X,
  Send,
  AlertTriangle,
  Sprout,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { HarvestLot } from '@/types';
import { getFarmerHarvestLotsApi } from '@/services/farmerApi';
import {
  submitProcurementQuoteApi,
  type ProcurementRequestItem,
} from '@/services/api';

interface QuoteProcurementModalProps {
  request: ProcurementRequestItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuoteProcurementModal({
  request,
  onClose,
  onSuccess,
}: QuoteProcurementModalProps) {
  const { currentUser } = useApp();
  const [loadingLots, setLoadingLots] = useState(false);
  const [approvedLots, setApprovedLots] = useState<HarvestLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<number>(0);
  const [offeredPricePerKg, setOfferedPricePerKg] = useState('');
  const [offeredQuantityKg, setOfferedQuantityKg] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFarmer = Boolean(
    currentUser?.roles?.some((r) =>
      ['ROLE_FARMER', 'FARMER', 'ROLE_COOPERATIVE', 'COOPERATIVE', 'ROLE_ADMIN', 'ADMIN'].includes(r),
    ),
  );

  useEffect(() => {
    if (!request || !currentUser || !isFarmer) return;
    let active = true;
    setLoadingLots(true);
    setError(null);
    getFarmerHarvestLotsApi()
      .then((lots) => {
        if (!active) return;
        const openLots = (lots || []).filter(
          (l) =>
            String(l.status || '').toUpperCase() === 'OPEN' &&
            Number(l.availableWeightKg ?? l.remainingQuantity ?? 0) > 0,
        );
        setApprovedLots(openLots);
        if (openLots.length > 0) {
          setSelectedLotId(openLots[0].id);
          setOfferedPricePerKg(String(openLots[0].basePricePerKg || ''));
        }
      })
      .catch(() => {
        if (active) setApprovedLots([]);
      })
      .finally(() => {
        if (active) setLoadingLots(false);
      });

    return () => {
      active = false;
    };
  }, [request, currentUser, isFarmer]);

  if (!request || typeof document === 'undefined') return null;

  const selectedLot = approvedLots.find((l) => l.id === selectedLotId) || null;
  const maxAvailableKg = selectedLot
    ? Number(selectedLot.availableWeightKg ?? selectedLot.remainingQuantity ?? 0)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot) return;
    setError(null);
    setSubmitting(true);
    try {
      await submitProcurementQuoteApi(request.id, {
        harvestLotId: selectedLot.id,
        offeredPricePerKg: Number(offeredPricePerKg),
        offeredQuantityKg: Number(offeredQuantityKg),
        deliveryDate: deliveryDate || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi chào giá cung cấp');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#EAECE8] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#10542C] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Send className="w-5 h-5 text-[#8BC34A] shrink-0" />
            <div className="min-w-0">
              <h2 className="font-heading font-bold text-base truncate">Gửi Chào Giá Cung Cấp</h2>
              <p className="text-[11px] text-emerald-100/80 truncate">{request.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {!currentUser ? (
            <div className="text-center space-y-4 py-4">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-sm text-[#2C3E2E]">
                Vui lòng đăng nhập bằng tài khoản <strong>Nhà vườn / Hợp tác xã</strong> để chào giá cung cấp.
              </p>
              <Link
                href="/dang-nhap"
                className="inline-block px-5 py-2.5 bg-[#10542C] text-white text-xs font-bold rounded-xl"
              >
                Đăng nhập ngay
              </Link>
            </div>
          ) : !isFarmer ? (
            <div className="text-center space-y-4 py-4">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-sm text-[#2C3E2E]">
                Chức năng <strong>Chào giá cung cấp</strong> chỉ dành cho tài khoản <strong>Nhà vườn / Hợp tác xã</strong>.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          ) : loadingLots ? (
            <div className="py-10 flex flex-col items-center gap-2 text-xs text-[#6B7280]">
              <Loader2 className="w-6 h-6 animate-spin text-[#10542C]" />
              <span>Đang kiểm tra các lô nông sản đã được duyệt của bạn...</span>
            </div>
          ) : approvedLots.length === 0 ? (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
              <h3 className="font-heading font-bold text-sm text-amber-900">
                Chưa có lô nông sản nào được đăng &amp; duyệt
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Theo quy định B2B của HONA FRESH, Nhà vườn muốn chào giá cung cấp bắt buộc phải có ít nhất 1 lô nông sản đã được đăng và Ban Quản Trị phê duyệt mở bán (trạng thái <strong>OPEN</strong>).
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-amber-300 text-amber-900 text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <Link
                  href="/portal/farmer"
                  className="px-4 py-2 rounded-xl bg-[#10542C] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Sprout className="w-3.5 h-3.5 text-[#8BC34A]" />
                  <span>Tới Cổng Nông Trại đăng lô</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-bold text-[#2C3E2E] mb-1">
                  Chọn lô nông sản đã duyệt (OPEN) *
                </label>
                <select
                  value={selectedLotId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedLotId(id);
                    const found = approvedLots.find((l) => l.id === id);
                    if (found) setOfferedPricePerKg(String(found.basePricePerKg || ''));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5DD] bg-white focus:outline-none focus:border-[#10542C]"
                >
                  {approvedLots.map((lot) => {
                    const avail = Number(lot.availableWeightKg ?? lot.remainingQuantity ?? 0);
                    return (
                      <option key={lot.id} value={lot.id}>
                        [{lot.lotCode}] {lot.productName} (Còn {avail.toLocaleString('vi-VN')} kg)
                      </option>
                    );
                  })}
                </select>
                {selectedLot && (
                  <p className="mt-1.5 text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>
                      Mã PUC: {selectedLot.pucCode} · Chứng nhận: {selectedLot.certification || 'VietGAP'}
                    </span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#2C3E2E] mb-1">
                    Giá chào bán (đ/kg) *
                  </label>
                  <input
                    type="number"
                    min={100}
                    required
                    value={offeredPricePerKg}
                    onChange={(e) => setOfferedPricePerKg(e.target.value)}
                    placeholder="VD: 12000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5DD] focus:outline-none focus:border-[#10542C]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2C3E2E] mb-1">
                    Sản lượng cam kết (kg) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={maxAvailableKg}
                    required
                    value={offeredQuantityKg}
                    onChange={(e) => setOfferedQuantityKg(e.target.value)}
                    placeholder={`Tối đa ${maxAvailableKg} kg`}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5DD] focus:outline-none focus:border-[#10542C]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2C3E2E] mb-1">Ngày giao dự kiến</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5DD] focus:outline-none focus:border-[#10542C]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2C3E2E] mb-1">Ghi chú cho Thương lái</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Thông tin quy cách đóng gói, vận chuyển..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#DCE5DD] focus:outline-none focus:border-[#10542C]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAECE8]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[#DCE5DD] text-[#6B7280] font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-[#8BC34A]" />
                  )}
                  <span>{submitting ? 'Đang gửi...' : 'Gửi chào giá'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
