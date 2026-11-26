'use client';

import React, { useState } from 'react';
import {
  FileSignature,
  QrCode,
  ShieldCheck,
  Sprout,
  ThermometerSnowflake,
} from 'lucide-react';
import { RevealSection } from './RevealSection';

const FLOW_STEPS = [
  {
    step: '01',
    title: 'Chọn Lô Chuẩn PUC',
    desc: 'Tra cứu trực tiếp vùng trồng đạt chuẩn VietGAP/GlobalGAP, xem sản lượng thực tế và giá xuất vườn.',
    icon: Sprout,
    badge: 'Minh bạch 100%',
    layerTag: 'LAYER 01 · ORIGIN PUC',
    metric: '520+ HTX Đã Xác Thực',
    accent: 'from-emerald-400 to-emerald-700',
  },
  {
    step: '02',
    title: 'Đàm Phán & Cọc 30%',
    desc: 'Thương lượng giá sỉ trực tiếp với HTX và ký quỹ Escrow 30% trên hợp đồng điện tử bảo chứng.',
    icon: ShieldCheck,
    badge: 'Escrow An Toàn',
    layerTag: 'LAYER 02 · SMART ESCROW',
    metric: 'Bảo Chứng Hợp Đồng 100%',
    accent: 'from-amber-400 to-orange-600',
  },
  {
    step: '03',
    title: 'Kiểm Định QC & Chuỗi Lạnh',
    desc: 'Đóng gói mã QR tại vườn, kiểm tra Brix/Nitrat tại Hub và vận chuyển xe lạnh giám sát IoT 2–8°C.',
    icon: ThermometerSnowflake,
    badge: 'Cảm biến IoT',
    layerTag: 'LAYER 03 · COLD-CHAIN IOT',
    metric: '2.0°C – 4.0°C Realtime',
    accent: 'from-sky-400 to-blue-700',
  },
  {
    step: '04',
    title: 'Ký Nhận ePOD & Quyết Toán',
    desc: 'Thương lái kiểm hàng tại điểm nhận, ký biên bản ePOD điện tử và tất toán 70% còn lại minh bạch.',
    icon: FileSignature,
    badge: 'Nhanh & Chuẩn xác',
    layerTag: 'LAYER 04 · DIGITAL ePOD',
    metric: 'Tất Toán Tự Động',
    accent: 'from-lime-400 to-emerald-600',
  },
];

export const SupplyChain3DFlow: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <RevealSection>
      <section className="relative rounded-3xl bg-gradient-to-br from-[#071F11] via-[#0D381F] to-[#124B2A] text-white border border-emerald-500/25 p-6 sm:p-8 lg:p-10 shadow-xl overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-24 right-0 w-80 h-80 rounded-full bg-[#8BC34A]/15 blur-3xl pointer-events-none"
        />

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#B2FF59] bg-white/10 border border-white/15 px-3 py-1 rounded-full">
              <QrCode className="w-3.5 h-3.5" />
              Quy Trình Giao Dịch B2B Khép Kín
            </span>
            <h2 className="font-heading text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mt-2">
              Từ Nông Trại Tới Kho Thương Lái Trong 4 Bước
            </h2>
          </div>
          <p className="text-xs text-emerald-100/75 max-w-sm">
            Đồng bộ minh bạch từ lúc chốt lô tại vườn đến khi bàn giao và quyết toán tại kho thương lái.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Cột Trái (6 cột): 4 Bước Tương Tác */}
          <div className="lg:col-span-6 space-y-3">
            {FLOW_STEPS.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeIndex === idx;
              return (
                <button
                  key={item.step}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-start gap-4 cursor-pointer ${
                    isActive
                      ? 'bg-white/15 border-[#8BC34A] shadow-lg shadow-emerald-950/40 translate-x-1.5'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${item.accent} text-white flex items-center justify-center shrink-0 shadow-md transition-transform duration-300 ${
                      isActive ? 'scale-110' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-heading font-bold text-sm text-white">
                        {item.step}. {item.title}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isActive
                            ? 'bg-[#8BC34A] text-[#071F11]'
                            : 'bg-white/10 text-emerald-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100/80 leading-relaxed mt-1">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Cột Phải (6 cột): Sân Khấu Mô Phỏng 3D Isometric Layer Stack */}
          <div className="lg:col-span-6 flex items-center justify-center min-h-[340px] perspective-1200">
            <div
              className="relative w-64 sm:w-72 h-64 sm:h-72 preserve-3d transition-transform duration-700 ease-out"
              style={{
                transform: `rotateX(56deg) rotateZ(${-32 + activeIndex * 6}deg)`,
              }}
            >
              {FLOW_STEPS.map((layer, idx) => {
                const Icon = layer.icon;
                const isActive = activeIndex === idx;
                const baseZ = (3 - idx) * 42;
                const activeLift = isActive ? 26 : 0;
                return (
                  <div
                    key={layer.step}
                    onClick={() => setActiveIndex(idx)}
                    style={{
                      transform: `translateZ(${baseZ + activeLift}px) scale(${
                        isActive ? 1.05 : 1
                      })`,
                    }}
                    className={`absolute inset-0 rounded-3xl border p-5 flex flex-col justify-between transition-all duration-500 cursor-pointer backdrop-blur-md ${
                      isActive
                        ? 'bg-gradient-to-br from-[#1B6B3B]/95 to-[#0B301B]/95 border-[#B2FF59] shadow-[0_20px_50px_rgba(178,255,89,0.28)]'
                        : 'bg-[#092414]/80 border-emerald-400/25 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold tracking-wider text-[#B2FF59]">
                        {layer.layerTag}
                      </span>
                      <div
                        className={`w-8 h-8 rounded-xl bg-gradient-to-br ${layer.accent} flex items-center justify-center text-white shadow`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <p className="font-heading text-base font-extrabold text-white">
                        {layer.title}
                      </p>
                      <p className="text-[11px] text-emerald-200/90 mt-1 font-semibold">
                        {layer.metric}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </RevealSection>
  );
};
