'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  ArrowRight,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  PlusCircle,
  QrCode,
  Scale,
  ThermometerSnowflake,
  TrendingUp,
} from 'lucide-react';
import { Product } from '@/types';
import { useAnimatedCounter } from '@/hooks/useScrollReveal';
import { Tilt3DCard } from './Tilt3DCard';

const Vietnam3DMap = dynamic(
  () => import('./Vietnam3DMap').then((mod) => mod.Vietnam3DMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[460px] sm:h-[520px] lg:h-[550px] flex items-center justify-center text-xs font-semibold text-emerald-200/80 animate-pulse">
        Đang khởi tạo bản đồ Việt Nam 3D...
      </div>
    ),
  },
);

interface Hero3DSceneProps {
  featuredLots: Product[];
  onOpenProcurement: () => void;
  onNegotiate: (lot: Product) => void;
  onDeposit: (lot: Product) => void;
}

const MARKET_TICKER = [
  { name: 'Bắp Cải Thảo Đà Lạt', price: '14.200đ/kg', change: '+3.4%', up: true },
  { name: 'Cà Chua Beef VietGAP', price: '22.500đ/kg', change: '+1.8%', up: true },
  { name: 'Xà Lách Lô Lô Thủy Canh', price: '28.000đ/kg', change: '+4.1%', up: true },
  { name: 'Cà Rốt Đơn Dương Loại 1', price: '16.800đ/kg', change: '-0.6%', up: false },
  { name: 'Nấm Kim Châm Hữu Cơ', price: '34.000đ/kg', change: '+2.5%', up: true },
  { name: 'Khoai Tây Hồng Lô 2 Tấn', price: '18.500đ/kg', change: '+1.2%', up: true },
];

export const Hero3DScene: React.FC<Hero3DSceneProps> = ({
  featuredLots,
  onOpenProcurement,
  onNegotiate,
  onDeposit,
}) => {
  const router = useRouter();
  const { currentUser } = useApp();
  const isBuyerAccount = Boolean(
    currentUser?.roles?.some((r) => ['ROLE_BUYER', 'BUYER'].includes(r)),
  );
  const [activeLotIndex, setActiveLotIndex] = useState(0);
  const [isLotHovered, setIsLotHovered] = useState(false);

  const safeLots = featuredLots.length > 0 ? featuredLots : [];
  const currentLot = safeLots[activeLotIndex % Math.max(1, safeLots.length)];

  useEffect(() => {
    setActiveLotIndex(0);
  }, [safeLots.length]);

  useEffect(() => {
    if (safeLots.length <= 1 || isLotHovered) return;
    const timer = setInterval(() => {
      setActiveLotIndex((prev) => (prev + 1) % safeLots.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [safeLots.length, isLotHovered]);

  const volumeCount = useAnimatedCounter(12500, 1500, true);
  const coopCount = useAnimatedCounter(520, 1400, true);
  const buyerCount = useAnimatedCounter(2800, 1450, true);
  const pucPercent = useAnimatedCounter(100, 1200, true);

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#061C0F] via-[#0B321B] to-[#104726] text-white border-b border-emerald-500/20">
      {/* Live Agri-Exchange Market Ticker */}
      <div className="w-full bg-black/35 border-b border-white/10 py-2 overflow-hidden backdrop-blur-md">
        <div className="animate-marquee items-center gap-8 text-[11px] font-medium">
          {[...MARKET_TICKER, ...MARKET_TICKER].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 shrink-0 px-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8BC34A]" />
              <span className="text-emerald-100/90 font-semibold">{item.name}</span>
              <span className="font-mono font-bold text-white">{item.price}</span>
              <span
                className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  item.up ? 'bg-emerald-500/20 text-[#8BC34A]' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {item.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Aurora & Spatial Grid (Tối ưu GPU: giảm blur lớn, bỏ animate-aurora-drift) */}
      <div
        aria-hidden="true"
        className="absolute -top-24 left-1/4 w-96 h-96 rounded-full bg-[#8BC34A]/12 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Full-Bleed Inner Container (Mở rộng 1360px để bản đồ Việt Nam 3D hiển thị to rõ) */}
      <div className="max-w-[1360px] mx-auto px-4 py-6 lg:py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Cột Trái (4 cột): Typography + CTA + KPI */}
          <div className="lg:col-span-4 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-[#8BC34A] text-[11px] font-bold border border-white/20 backdrop-blur-md">
              <Boxes className="w-3.5 h-3.5 text-[#8BC34A]" />
              <span>NỀN TẢNG THƯƠNG MẠI ĐIỆN TỬ NÔNG SẢN B2B</span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl xl:text-[42px] font-extrabold tracking-tight leading-[1.14]">
              Cầu Nối Số Trực Tiếp <br />
              <span className="bg-gradient-to-r from-[#8BC34A] via-[#C6FF00] to-[#4CAF50] bg-clip-text text-transparent">
                Nông Trại &amp; Thương Lái
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed">
              Chào bán nông sản theo lô thu hoạch với giá xuất vườn minh bạch, đàm phán trực tuyến, ký quỹ Escrow 30% và giám sát chuỗi lạnh IoT theo thời gian thực.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="#catalog-section"
                className="relative overflow-hidden shimmer-hover px-5 py-3 bg-[#4CAF50] hover:bg-[#43A047] text-white font-heading font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Khám phá lô đang thu hoạch</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={onOpenProcurement}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-heading font-bold text-xs rounded-xl backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-[#8BC34A]" />
                <span>Đăng tin tìm nguồn sỉ</span>
              </button>
            </div>

            {/* Live KPI Strip */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <span className="block font-heading text-lg font-black text-white tabular-nums">
                  {new Intl.NumberFormat('vi-VN').format(volumeCount)}+
                </span>
                <span className="text-[10px] text-emerald-200/80">Tấn/tháng</span>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <span className="block font-heading text-lg font-black text-[#8BC34A] tabular-nums">
                  {coopCount}+
                </span>
                <span className="text-[10px] text-emerald-200/80">Hợp tác xã</span>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <span className="block font-heading text-lg font-black text-white tabular-nums">
                  {new Intl.NumberFormat('vi-VN').format(buyerCount)}+
                </span>
                <span className="text-[10px] text-emerald-200/80">Thương lái</span>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <span className="block font-heading text-lg font-black text-[#8BC34A] tabular-nums">
                  {pucPercent}%
                </span>
                <span className="text-[10px] text-emerald-200/80">Mã PUC chuẩn</span>
              </div>
            </div>
          </div>

          {/* Cột Giữa (5 cột): Bản Đồ Việt Nam 3D WebGL (To, rõ nét) */}
          <div className="lg:col-span-5 relative flex flex-col items-center justify-center">
            <Vietnam3DMap />

            {/* 2 Floating Badges quanh bản đồ */}
            <div className="hidden sm:flex animate-float-slow absolute top-3 left-2 px-3 py-2 rounded-2xl bg-black/45 backdrop-blur-md border border-emerald-400/30 shadow-xl items-center gap-2 pointer-events-none">
              <ThermometerSnowflake className="w-4 h-4 text-[#8BC34A]" />
              <div>
                <p className="text-[9px] text-emerald-200/80">Chuỗi lạnh IoT</p>
                <p className="text-[11px] font-bold text-white">2°C – 4°C Live</p>
              </div>
            </div>

            <div className="hidden sm:flex animate-float-reverse absolute bottom-4 right-2 px-3 py-2 rounded-2xl bg-black/45 backdrop-blur-md border border-emerald-400/30 shadow-xl items-center gap-2 pointer-events-none">
              <QrCode className="w-4 h-4 text-amber-300" />
              <div>
                <p className="text-[9px] text-emerald-200/80">Truy xuất vùng trồng</p>
                <p className="text-[11px] font-bold text-white">34 Tỉnh Thành &amp; PUC</p>
              </div>
            </div>
          </div>

          {/* Cột Phải (3 cột): Danh sách Lô Đang Đăng Bán (Carousel) */}
          {currentLot && (
            <div
              className="lg:col-span-3"
              onMouseEnter={() => setIsLotHovered(true)}
              onMouseLeave={() => setIsLotHovered(false)}
            >
              <Tilt3DCard
                maxTilt={5}
                glowColor="rgba(178, 255, 89, 0.22)"
                className="rounded-3xl p-[1.5px] bg-gradient-to-br from-[#8BC34A]/60 via-emerald-500/20 to-[#4CAF50]/60 shadow-2xl"
              >
                <div className="relative z-10 bg-[#0A2917] rounded-[22px] overflow-hidden flex flex-col justify-between">
                  <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#B2FF59] animate-ping shrink-0" />
                      <span className="font-heading font-black text-[11px] uppercase tracking-wider text-[#B2FF59] truncate">
                        LÔ ĐANG ĐĂNG BÁN
                      </span>
                    </div>

                    {safeLots.length > 1 ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveLotIndex(
                              (prev) => (prev - 1 + safeLots.length) % safeLots.length,
                            )
                          }
                          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
                          title="Lô trước"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono font-bold text-emerald-100 px-1">
                          {(activeLotIndex % safeLots.length) + 1}/{safeLots.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveLotIndex((prev) => (prev + 1) % safeLots.length)}
                          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
                          title="Lô tiếp theo"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-emerald-100">
                        {currentLot.pucCode || 'VN-LD-74401'}
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="relative h-32 rounded-2xl overflow-hidden border border-white/10 group">
                      <img
                        src={currentLot.imageUrl}
                        alt={currentLot.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.includes('unsplash')) {
                            target.src =
                              'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80';
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                      <span className="absolute top-2 left-2 bg-[#10542C]/90 backdrop-blur-sm text-[#B2FF59] text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                        {currentLot.certification || 'VietGAP'}
                      </span>
                      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between">
                        <span className="font-heading text-base font-black text-white">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(currentLot.price)}
                          <span className="text-[10px] font-normal text-emerald-200">/kg</span>
                        </span>
                        <span className="text-[10px] font-bold text-amber-300 flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" /> MOQ {currentLot.moq || 500}kg
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-heading text-sm font-bold text-white line-clamp-1">
                        {currentLot.name}
                      </h4>
                      <p className="text-[11px] text-emerald-200/80 flex items-center gap-1 mt-0.5 truncate">
                        <Building2 className="w-3 h-3 text-[#8BC34A] shrink-0" />
                        <span className="truncate">{currentLot.farmName || 'HTX Đơn Dương'}</span>
                      </p>
                    </div>

                    {(() => {
                      const total = currentLot.totalLotVolume || 15;
                      const avail = currentLot.availableVolume ?? 9.5;
                      const pct = Math.max(
                        5,
                        Math.min(100, Math.round(((total - avail) / total) * 100)),
                      );
                      return (
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-emerald-100">
                            <span>Tổng lô: {total} Tấn</span>
                            <span className="text-[#B2FF59]">Còn: {avail} Tấn</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#8BC34A] to-[#B2FF59] rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {safeLots.length > 1 && (
                      <div className="flex items-center justify-center gap-1.5 pt-0.5">
                        {safeLots.map((lot, idx) => (
                          <button
                            key={lot.id}
                            type="button"
                            onClick={() => setActiveLotIndex(idx)}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              idx === activeLotIndex % safeLots.length
                                ? 'w-5 bg-[#B2FF59]'
                                : 'w-1.5 bg-white/25 hover:bg-white/50'
                            }`}
                            title={lot.name}
                          />
                        ))}
                      </div>
                    )}

                    {currentUser && !isBuyerAccount ? (
                      <div className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-center text-[11px] font-semibold text-emerald-100/75">
                        Đàm phán &amp; đặt cọc chỉ dành cho Thương lái (Buyer)
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentUser) {
                              router.push('/dang-nhap');
                              return;
                            }
                            onNegotiate(currentLot);
                          }}
                          className="py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-heading font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                        >
                          <Scale className="w-3.5 h-3.5 text-[#8BC34A]" />
                          <span>Đàm phán</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentUser) {
                              router.push('/dang-nhap');
                              return;
                            }
                            onDeposit(currentLot);
                          }}
                          className="py-2.5 bg-[#8BC34A] hover:bg-[#9CCC65] text-[#061C0F] font-heading font-extrabold rounded-xl text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shadow-lg"
                        >
                          <HeartHandshake className="w-3.5 h-3.5" />
                          <span>Đặt cọc</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Tilt3DCard>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
