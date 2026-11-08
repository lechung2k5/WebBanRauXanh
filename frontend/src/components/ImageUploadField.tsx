'use client';

import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/services/auth';

export interface ImageUploadResponse {
  assetId: string;
  url: string;
  publicId: string;
  resourceType: string;
}

interface ImageUploadFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  value?: string;
  onChange?: (url: string, assetId?: string) => void;
  purpose?: 'CERTIFICATE' | 'PRODUCT' | 'AVATAR' | 'CATEGORY' | 'LOT' | 'EPOD';
  hint?: string;
  className?: string;
  onUploadingChange?: (isUploading: boolean) => void;
}

export default function ImageUploadField({
  name,
  label,
  required = false,
  value,
  onChange,
  purpose = 'CERTIFICATE',
  hint,
  className = '',
  onUploadingChange,
}: ImageUploadFieldProps) {
  const [currentUrl, setCurrentUrl] = useState(value || '');
  const [previewUrl, setPreviewUrl] = useState(value || '');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localBlobUrlRef = useRef<string | null>(null);

  const prevPropValueRef = useRef(value);
  const currentUrlRef = useRef(currentUrl);
  currentUrlRef.current = currentUrl;

  // Chỉ đồng bộ khi props.value được truyền vào và thực sự thay đổi từ bên ngoài (ví dụ component cha nạp dữ liệu hoặc reset form)
  useEffect(() => {
    if (value !== undefined && value !== prevPropValueRef.current) {
      prevPropValueRef.current = value;
      if (value !== currentUrlRef.current) {
        setCurrentUrl(value);
        if (!localBlobUrlRef.current) {
          setPreviewUrl(value);
        }
        if (!value) {
          setFileName('');
        }
      }
    }
  }, [value]);

  const cleanBlobUrl = () => {
    if (localBlobUrlRef.current) {
      URL.revokeObjectURL(localBlobUrlRef.current);
      localBlobUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanBlobUrl();
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Kiểm tra định dạng cơ bản trên client
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['jpg', 'jpeg', 'png', 'webp'];

    if (!validTypes.includes(file.type) && (!ext || !validExts.includes(ext))) {
      setError('Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh JPEG, PNG, WebP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Giới hạn dung lượng 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Dung lượng ảnh vượt quá 5 MB. Vui lòng chọn tệp nhỏ hơn.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    cleanBlobUrl();
    const blobUrl = URL.createObjectURL(file);
    localBlobUrlRef.current = blobUrl;
    setPreviewUrl(blobUrl);
    setFileName(file.name);

    setUploading(true);
    onUploadingChange?.(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', purpose);

      const res = await api<ImageUploadResponse>('uploads/images', 'POST', formData);
      if (!res?.url) {
        throw new Error('Máy chủ không trả về URL ảnh hợp lệ');
      }
      setCurrentUrl(res.url);
      currentUrlRef.current = res.url;
      cleanBlobUrl();
      setPreviewUrl(res.url);
      onChange?.(res.url, res.assetId);
    } catch (err) {
      console.error('Lỗi tải ảnh lên Cloudinary:', err);
      const msg = err instanceof Error ? err.message : 'Tải ảnh lên thất bại';
      setError(msg);
      // Giữ lại URL cũ nếu tải thất bại
      setPreviewUrl(currentUrl);
      cleanBlobUrl();
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    cleanBlobUrl();
    setPreviewUrl('');
    setCurrentUrl('');
    currentUrlRef.current = '';
    setFileName('');
    setError('');
    onChange?.('', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Hidden input lưu URL ảnh cho form FormData */}
      <input
        type="hidden"
        name={name}
        value={currentUrl}
        required={required && !uploading && !currentUrl}
      />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={uploading}
      />

      {/* Khung hiển thị / chọn ảnh */}
      <div className="border border-gray-300 rounded-xl p-2.5 bg-white transition-all hover:border-gray-400">
        {previewUrl ? (
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Ảnh xem trước"
                className="w-full h-full object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {uploading ? (
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Đang tải lên Cloudinary...
                  </span>
                ) : (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <span>✅</span> Đã tải ảnh lên
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5" title={fileName || currentUrl}>
                {fileName || (currentUrl.length > 40 ? currentUrl.slice(0, 37) + '...' : currentUrl)}
              </p>

              <div className="flex items-center gap-3 mt-1.5">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[#10542C] font-semibold hover:underline disabled:opacity-50 cursor-pointer"
                >
                  🔄 Đổi ảnh
                </button>
                {!required && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleClear}
                    className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    🗑️ Xóa
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-gray-600 min-w-0">
              <span className="text-lg">📷</span>
              <span className="truncate">
                {uploading ? 'Đang xử lý tải ảnh...' : 'Chưa chọn tệp ảnh từ thiết bị'}
              </span>
            </div>

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-[#10542C] text-white text-xs font-semibold hover:bg-[#0d4423] transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {uploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải...</span>
                </>
              ) : (
                <>
                  <span>📁</span>
                  <span>Chọn ảnh</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Thông báo lỗi upload */}
        {error && (
          <div className="mt-2 text-xs text-red-700 bg-red-50 p-2 rounded-lg border border-red-200 flex items-start justify-between gap-2">
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-red-800 font-bold underline shrink-0 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}
      </div>

      {hint && <span className="text-[11px] text-gray-500 block">{hint}</span>}
    </div>
  );
}
