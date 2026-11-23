'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  searchAddressSuggestions,
  getPlaceDetail,
  reverseGeocode,
  GoongPrediction,
} from '@/services/goongMapService';
import { MapPin, Search, Loader2, X, Navigation, CheckCircle2 } from 'lucide-react';

export interface AddressSelectedData {
  address: string;
  lat?: number;
  lng?: number;
  compound?: {
    district?: string;
    commune?: string;
    province?: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectAddress?: (data: AddressSelectedData) => void;
  name?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  showCurrentLocationBtn?: boolean;
  autoFocus?: boolean;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onSelectAddress,
  name,
  placeholder = 'Nhập số nhà, tên đường, phường/xã, quận/huyện...',
  label,
  required = false,
  disabled = false,
  className = '',
  error,
  showCurrentLocationBtn = true,
  autoFocus = false,
}) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<GoongPrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Đồng bộ giá trị query khi prop value từ ngoài thay đổi
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Click outside để đóng dropdown gợi ý
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Gọi API gợi ý địa chỉ Goong khi người dùng nhập
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    onChange(text);
    setHighlightedIndex(-1);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await searchAddressSuggestions(text);
        setSuggestions(results);
        setIsOpen(results.length > 0);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  // Khi chọn một địa chỉ từ danh sách gợi ý
  const handleSelectPrediction = async (prediction: GoongPrediction) => {
    const fullAddress = prediction.description;
    setQuery(fullAddress);
    onChange(fullAddress);
    setIsOpen(false);
    setSuggestions([]);

    if (onSelectAddress) {
      // Lấy thêm tọa độ chi tiết từ Goong Place Detail API
      try {
        const detail = await getPlaceDetail(prediction.place_id);
        if (detail) {
          onSelectAddress({
            address: detail.formatted_address || fullAddress,
            lat: detail.location.lat,
            lng: detail.location.lng,
            compound: detail.compound,
          });
          return;
        }
      } catch {
        // Fallback nếu không lấy được detail
      }
      onSelectAddress({ address: fullAddress, compound: prediction.compound });
    }
  };

  // Định vị vị trí hiện tại qua GPS trình duyệt
  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const detectedAddress = await reverseGeocode(latitude, longitude);
          if (detectedAddress) {
            setQuery(detectedAddress);
            onChange(detectedAddress);
            if (onSelectAddress) {
              onSelectAddress({
                address: detectedAddress,
                lat: latitude,
                lng: longitude,
              });
            }
          } else {
            const fallback = `Vị trí GPS (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
            setQuery(fallback);
            onChange(fallback);
          }
        } catch {
          alert('Không thể chuyển đổi tọa độ GPS thành địa chỉ đường phố');
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        console.warn('Lỗi Geolocation:', err.message);
        alert('Không thể lấy vị trí GPS. Vui lòng cho phép quyền truy cập vị trí trên trình duyệt.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [onChange, onSelectAddress]);

  const handleClear = () => {
    setQuery('');
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        void handleSelectPrediction(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-[#2C3E2E] mb-1.5 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
          <span className="text-[10px] font-normal text-[#10542C] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Goong Map
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-[#758A7A] pointer-events-none">
          {loading ? (
            <Loader2 className="w-4 h-4 text-[#10542C] animate-spin" />
          ) : (
            <MapPin className="w-4 h-4 text-[#10542C]" />
          )}
        </div>

        <input
          ref={inputRef}
          name={name}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          required={required}
          className={`w-full pl-10 pr-20 py-2.5 bg-white text-xs sm:text-sm text-[#2C3E2E] placeholder-[#9CA3AF] border rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[#10542C]/20 focus:border-[#10542C] ${
            error ? 'border-rose-400 bg-rose-50/20' : 'border-[#EAECE8]'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
        />

        <div className="absolute right-2 flex items-center gap-1">
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              title="Xóa địa chỉ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {showCurrentLocationBtn && !disabled && (
            <button
              type="button"
              onClick={handleCurrentLocation}
              disabled={gpsLoading}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#10542C] bg-[#EAF6EE] hover:bg-[#D7EED6] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Định vị địa chỉ hiện tại qua GPS"
            >
              {gpsLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Navigation className="w-3 h-3 text-[#10542C]" />
              )}
              <span className="hidden sm:inline">Vị trí</span>
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-[11px] text-rose-500 mt-1 font-medium">{error}</p>}

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-[#EAECE8] overflow-hidden max-h-72 overflow-y-auto divide-y divide-[#F0F2ED] animate-in fade-in-50 duration-150">
          <div className="px-3.5 py-1.5 bg-[#F9FAF8] text-[10px] font-bold text-[#758A7A] uppercase tracking-wider flex items-center justify-between">
            <span>Gợi ý địa chỉ chuẩn Goong Maps</span>
            <span className="text-emerald-700 font-semibold">{suggestions.length} kết quả</span>
          </div>

          {suggestions.map((item, index) => {
            const isSelected = index === highlightedIndex;
            return (
              <button
                key={item.place_id || index}
                type="button"
                onClick={() => void handleSelectPrediction(item)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition-colors cursor-pointer ${
                  isSelected ? 'bg-[#EAF6EE]' : 'hover:bg-[#F9FAF8]'
                }`}
              >
                <div className="mt-0.5 w-6 h-6 rounded-lg bg-[#10542C]/10 text-[#10542C] flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#2C3E2E] truncate">
                    {item.structured_formatting?.main_text || item.description}
                  </p>
                  <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                    {item.structured_formatting?.secondary_text || item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
