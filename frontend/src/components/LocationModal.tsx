'use client';

import React, { useState } from 'react';
import { X, MapPin, Check, Navigation } from 'lucide-react';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: string;
  onSelectLocation: (loc: string) => void;
}

const PRESET_LOCATIONS = [
  'Phường Bến Nghé, Quận 1, TP.HCM',
  'Phường Tân Định, Quận 1, TP.HCM',
  'Phường Thảo Điền, TP. Thủ Đức, TP.HCM',
  'Phường 25, Quận Bình Thạnh, TP.HCM',
  'Phường Võ Thị Sáu, Quận 3, TP.HCM',
  'Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
  'Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội',
];

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
}) => {
  const [customInput, setCustomInput] = useState('');

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onSelectLocation(customInput.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 border border-[#EAECE8]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#758A7A] hover:text-[#2C3E2E] rounded-full hover:bg-[#F4F5F1] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#10542C]/10 text-[#10542C] flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-[#10542C]">Chọn Khu Vực Giao Hàng</h3>
            <p className="text-xs text-[#758A7A]">Định tuyến kho HoNa Fresh gần nhất để giao siêu tốc 2h</p>
          </div>
        </div>

        {/* Input search / custom */}
        <form onSubmit={handleCustomSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập phường/xã, quận/huyện..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-[#F9F9F5] border border-[#EAECE8] rounded-xl text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#10542C] text-white text-xs font-bold rounded-xl hover:bg-[#0C3E20] transition-colors cursor-pointer"
            >
              Chọn
            </button>
          </div>
        </form>

        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          <span className="text-[11px] font-bold text-[#758A7A] uppercase tracking-wider block mb-1">
            Khu vực phổ biến được hỗ trợ giao 2h:
          </span>
          {PRESET_LOCATIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => {
                onSelectLocation(loc);
                onClose();
              }}
              className={`w-full text-left p-3 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
                currentLocation === loc
                  ? 'bg-[#10542C]/10 border-[#10542C] text-[#10542C] font-bold'
                  : 'bg-[#F9F9F5] border-transparent hover:border-[#EAECE8] text-[#2C3E2E]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-[#4CAF50] shrink-0" />
                <span className="line-clamp-1">{loc}</span>
              </div>
              {currentLocation === loc && <Check className="w-4 h-4 text-[#10542C]" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
