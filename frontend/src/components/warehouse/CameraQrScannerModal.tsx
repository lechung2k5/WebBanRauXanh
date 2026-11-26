'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CameraQrScannerModalProps {
  isOpen: boolean;
  title?: string;
  scannedCount?: number;
  totalCount?: number;
  lastError?: string | null;
  lastSuccessCode?: string | null;
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function CameraQrScannerModal({
  isOpen,
  title = 'Quét Mã QR / Barcode Thùng Hàng',
  scannedCount = 0,
  totalCount = 0,
  lastError,
  lastSuccessCode,
  onScan,
  onClose,
}: CameraQrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCodeTimeRef = useRef<{ code: string; ts: number }>({ code: '', ts: 0 });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectorSupported, setDetectorSupported] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    let rafId = 0;

    const stopCamera = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    const startCamera = async () => {
      setCameraError(null);
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Trình duyệt không hỗ trợ truy cập camera (cần HTTPS hoặc localhost).');
        return;
      }

      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      setDetectorSupported(Boolean(BarcodeDetectorCtor));

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (!BarcodeDetectorCtor) return;

        const detector = new BarcodeDetectorCtor({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13'],
        });

        const tick = async () => {
          if (cancelled) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            try {
              const results = await detector.detect(video);
              if (Array.isArray(results) && results.length > 0) {
                const raw = String(results[0]?.rawValue || '').trim();
                const now = Date.now();
                if (
                  raw &&
                  (raw !== lastCodeTimeRef.current.code || now - lastCodeTimeRef.current.ts > 1400)
                ) {
                  lastCodeTimeRef.current = { code: raw, ts: now };
                  onScan(raw);
                }
              }
            } catch {
              // bỏ qua lỗi frame đơn lẻ
            }
          }
          rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
      } catch (err) {
        setCameraError(
          err instanceof Error
            ? `Không mở được camera: ${err.message}`
            : 'Không mở được camera. Vui lòng cấp quyền Camera cho trình duyệt.'
        );
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 text-white w-full max-w-md rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold truncate">{title}</h4>
              {totalCount > 0 && (
                <span className="text-[10px] text-emerald-300 font-mono">
                  Tiến độ: {scannedCount}/{totalCount} thùng
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative bg-black aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Khung ngắm QR/Barcode */}
          {!cameraError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-40 border-2 border-emerald-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.42)] relative">
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-300 whitespace-nowrap">
                  Đưa mã QR / Barcode vào giữa khung
                </span>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 bg-slate-900/95 p-5 flex flex-col items-center justify-center text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <p className="text-xs text-slate-200">{cameraError}</p>
            </div>
          )}
        </div>

        <div className="p-4 space-y-2 text-xs">
          {!detectorSupported && !cameraError && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-[11px]">
              Trình duyệt này chưa hỗ trợ API `BarcodeDetector` tự động. Hãy dùng Chrome/Edge trên Android hoặc đóng camera để nhập/bấm mã thủ công.
            </div>
          )}

          {lastError && (
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/50 text-rose-200 text-[11px] font-bold">
              {lastError}
            </div>
          )}

          {lastSuccessCode && !lastError && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-[11px] font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Đã quét thành công: {lastSuccessCode}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
          >
            Xong / Đóng Camera
          </button>
        </div>
      </div>
    </div>
  );
}
