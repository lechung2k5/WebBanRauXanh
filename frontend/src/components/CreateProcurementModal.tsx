'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, Megaphone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  createProcurementRequestApi,
  type ProcurementRequestItem,
} from '@/services/api';

interface CreateProcurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (request: ProcurementRequestItem) => void;
}

const CATEGORIES = [
  'Rau ăn lá',
  'Củ quả',
  'Nấm tươi',
  'Nông sản lạnh',
  'Rau gia vị & Thảo mộc',
];

export default function CreateProcurementModal({
  isOpen,
  onClose,
  onSubmitSuccess,
}: CreateProcurementModalProps) {
  const { currentUser } = useApp();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Rau ăn lá');
  const [volumeKg, setVolumeKg] = useState('');
  const [minPricePerKg, setMinPricePerKg] = useState('');
  const [maxPricePerKg, setMaxPricePerKg] = useState('');
  const [destination, setDestination] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || typeof document === 'undefined') return null;

  const isBuyer = Boolean(
    currentUser?.roles?.some((r) => ['ROLE_BUYER', 'BUYER', 'ROLE_ADMIN', 'ADMIN'].includes(r)),
  );

  const parsedKg = Number(volumeKg);
  const parsedMinPrice = Number(minPricePerKg);
  const parsedMaxPrice = Number(maxPricePerKg);

  const formatVndNumber = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  const formattedVolumePreview =
    parsedKg > 0
      ? parsedKg >= 1000
        ? `${formatVndNumber(parsedKg)} kg (${Number((parsedKg / 1000).toFixed(2))} Tấn)`
        : `${formatVndNumber(parsedKg)} kg`
      : '';

  const formattedPricePreview =
    parsedMinPrice > 0
      ? parsedMaxPrice > 0 && parsedMaxPrice > parsedMinPrice
        ? `${formatVndNumber(parsedMinPrice)} - ${formatVndNumber(parsedMaxPrice)} đ/kg`
        : `${formatVndNumber(parsedMinPrice)} đ/kg`
      : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!Number.isFinite(parsedKg) || parsedKg <= 0) {
      setError('Vui lòng nhập sản lượng cần thu mua hợp lệ (lớn hơn 0 kg).');
      return;
    }
    if (!Number.isFinite(parsedMinPrice) || parsedMinPrice < 100) {
      setError('Vui lòng nhập giá sỉ kỳ vọng tối thiểu từ 100 đ/kg.');
      return;
    }
    if (maxPricePerKg.trim() !== '' && parsedMaxPrice < parsedMinPrice) {
      setError('Giá sỉ tối đa phải lớn hơn hoặc bằng giá tối thiểu.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createProcurementRequestApi({
        title: title.trim(),
        category,
        volumeNeeded: formattedVolumePreview,
        targetPriceRange: formattedPricePreview,
        destination: destination.trim(),
      });
      setTitle('');
      setVolumeKg('');
      setMinPricePerKg('');
      setMaxPricePerKg('');
      setDestination('');
      window.dispatchEvent(new Event('b2b_procurement_updated'));
      if (onSubmitSuccess) onSubmitSuccess(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng tin thu mua');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#EAECE8] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#10542C] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Megaphone className="w-5 h-5 text-[#8BC34A]" />
            <div>
              <h2 className="font-heading font-bold text-base">Đăng Tin Cần Thu Mua B2B</h2>
              <p className="text-[11px] text-emerald-100/80">
                Tiếp cận trực tiếp các HTX &amp; Nhà vườn đạt chuẩn trên toàn quốc
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {!currentUser ? (
            <div className="text-center space-y-4 py-4">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-sm text-[#2C3E2E] font-medium">
                Vui lòng đăng nhập bằng tài khoản <strong>Thương lái</strong> để đăng tin tìm nguồn cung sỉ.
              </p>
              <Link
                href="/dang-nhap"
                className="inline-block px-5 py-2.5 bg-[#10542C] text-white text-xs font-bold rounded-xl"
              >
                Đăng nhập ngay
              </Link>
            </div>
          ) : !isBuyer ? (
            <div className="text-center space-y-4 py-4">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-sm text-[#2C3E2E] font-medium">
                Chức năng đăng tin tìm nguồn cung chỉ dành cho tài khoản <strong>Thương lái (Buyer)</strong>.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Đóng
              </button>
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
                  Tiêu đề nhu cầu thu mua *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Cần thu mua 200 kg Cà chua sạch Đà Lạt"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5DD] focus:outline-none focus:border-[#10542C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#2C3E2E] mb-1">Ngành hàng *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5DD] bg-white focus:outline-none focus:border-[#10542C]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#2C3E2E] mb-1">
                    Sản lượng cần (kg) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={volumeKg}
                      onChange={(e) => setVolumeKg(e.target.value)}
                      placeholder="VD: 200"
                      className="w-full pl-3.5 pr-12 py-2.5 rounded-xl border border-[#DCE5DD] focus:outline-none focus:border-[#10542C]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      kg
                    </span>
                  </div>
                  {formattedVolumePreview && (
                    <p className="mt-1 text-[10.5px] font-semibold text-emerald-700">
                      Hiển thị: {formattedVolumePreview}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2C3E2E] mb-1">
                  Giá sỉ kỳ vọng (VNĐ / kg) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <input
                      type="number"
                      min={100}
                      step={1}
                      required
                      value={minPricePerKg}
                      onChange={(e) => setMinPricePerKg(e.target.value)}
                      placeholder="Giá từ (VD: 15000)"
                      className="w-full pl-3.5 pr-16 py-2.5 rounded-xl border border-[#DCE5DD] focus:outline-none focus:border-[#10542C]"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10.5px] font-bold text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      đ/kg
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={100}
                      step={1}
                      value={maxPricePerKg}
                      onChange={(e) => setMaxPricePerKg(e.target.value)}
                      placeholder="Đến (không bắt buộc)"
                      className="w-full pl-3.5 pr-16 py-2.5 rounded-xl border border-[#DCE5DD] focus:outline-none focus:border-[#10542C]"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10.5px] font-bold text-[#6B7280] bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                      đ/kg
                    </span>
                  </div>
                </div>
                {formattedPricePreview && (
                  <p className="mt-1 text-[10.5px] font-semibold text-emerald-700">
                    Hiển thị: {formattedPricePreview}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#2C3E2E] mb-1">Địa điểm giao hàng *</label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="VD: Chợ Đầu Mối Thủ Đức, TP.HCM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5DD] focus:outline-none focus:border-[#10542C]"
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
                  <span>{submitting ? 'Đang đăng tin...' : 'Đăng tin thu mua'}</span>
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
