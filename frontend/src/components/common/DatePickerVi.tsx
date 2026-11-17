'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerViProps {
  value: string; // ISO date format YYYY-MM-DD
  onChange: (isoValue: string) => void;
  required?: boolean;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

// Chuyển đổi YYYY-MM-DD -> dd/MM/yyyy
export function isoToDisplayVi(isoDate?: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }
  return isoDate;
}

// Chuyển đổi dd/MM/yyyy -> YYYY-MM-DD
export function displayViToIso(displayDate?: string): string {
  if (!displayDate) return '';
  const clean = displayDate.trim();
  const parts = clean.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let [day, month, year] = parts;
    if (day && month && year) {
      // Nếu năm 2 chữ số
      if (year.length === 2) year = `20${year}`;
      const d = parseInt(day, 10);
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }
  return '';
}

export default function DatePickerVi({
  value,
  onChange,
  required,
  min,
  max,
  className = '',
  placeholder = 'dd/mm/yyyy',
  disabled = false,
  id,
  name,
}: DatePickerViProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [displayText, setDisplayText] = useState<string>(isoToDisplayVi(value));

  // Đồng bộ display text khi value từ ngoài thay đổi
  useEffect(() => {
    setDisplayText(isoToDisplayVi(value));
  }, [value]);

  const handleOpenPicker = () => {
    if (disabled) return;
    try {
      if (hiddenInputRef.current) {
        if (typeof hiddenInputRef.current.showPicker === 'function') {
          hiddenInputRef.current.showPicker();
        } else {
          hiddenInputRef.current.focus();
          hiddenInputRef.current.click();
        }
      }
    } catch {
      hiddenInputRef.current?.focus();
    }
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setDisplayText(isoToDisplayVi(val));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputStr = e.target.value;
    setDisplayText(inputStr);

    // Nếu gõ đủ định dạng hợp lệ dd/mm/yyyy
    const iso = displayViToIso(inputStr);
    if (iso) {
      onChange(iso);
    }
  };

  const handleTextBlur = () => {
    const iso = displayViToIso(displayText);
    if (iso) {
      onChange(iso);
      setDisplayText(isoToDisplayVi(iso));
    } else if (!displayText.trim()) {
      onChange('');
    } else {
      // Revert về giá trị hợp lệ gần nhất
      setDisplayText(isoToDisplayVi(value));
    }
  };

  return (
    <div className="relative w-full inline-flex items-center">
      {/* Input hiển thị định dạng chuẩn Việt Nam dd/MM/yyyy */}
      <input
        type="text"
        id={id}
        name={name}
        disabled={disabled}
        required={required}
        value={displayText}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        onClick={handleOpenPicker}
        placeholder={placeholder}
        className={`w-full pr-10 cursor-pointer ${className}`}
      />

      {/* Nút bấm mở lịch DatePicker */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpenPicker}
        className="absolute right-3 p-1 text-gray-400 hover:text-[#10542C] transition-colors focus:outline-none"
        title="Chọn ngày"
      >
        <CalendarIcon className="w-4 h-4" />
      </button>

      {/* Input type="date" ẩn để mở popup lịch native trên mọi trình duyệt */}
      <input
        type="date"
        ref={hiddenInputRef}
        value={value || ''}
        min={min}
        max={max}
        onChange={handleNativeChange}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute top-0 right-0 w-0 h-0 opacity-0 pointer-events-none"
      />
    </div>
  );
}
