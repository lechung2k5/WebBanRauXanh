'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MapPin,
  ShieldCheck,
  Loader2,
  Sprout,
  User as UserIcon,
  X,
  Package,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { b2bWebSocket } from '@/services/websocketService';
import { subscribeB2bSyncEvents } from '@/services/b2bSyncService';
import { Tilt3DCard } from '@/components/home/Tilt3DCard';

interface FarmerLotSummary {
  id: number;
  lotCode: string;
  productName: string;
  basePricePerKg: number;
  availableWeightKg: number;
  totalWeightKg?: number;
  status?: string;
  pucCode?: string;
}

interface FarmerPublicProfile {
  id: number;
  farmName: string;
  ownerName: string;
  householdFarmer: boolean;
  pucCode?: string;
  certification?: string;
  kycStatus?: string;
  address?: string;
  openLotCount: number;
  pastLotCount?: number;
  totalAvailableKg: number;
  mainProduce: string[];
  coverImageUrl?: string;
  openLots: FarmerLotSummary[];
}

const DEFAULT_FARM_IMAGE =
  'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80';

const LOTS_PER_PAGE = 4;

export default function FarmCooperativesSection() {
  const [farmers, setFarmers] = useState<FarmerPublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerPublicProfile | null>(null);
  const [lotPage, setLotPage] = useState(1);

  const loadFarmers = useCallback(async () => {
    try {
      const res = await fetch('/api/backend/harvest-lots/farmers', {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      setFarmers(Array.isArray(json?.result) ? json.result : []);
    } catch {
      setFarmers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFarmers();
    const unsubLots = b2bWebSocket.subscribeLots(() => {
      void loadFarmers();
    });
    const unsubSync = subscribeB2bSyncEvents(() => {
      void loadFarmers();
    });
    return () => {
      unsubLots();
      unsubSync();
    };
  }, [loadFarmers]);

  const handleOpenFarmer = (farmer: FarmerPublicProfile) => {
    setSelectedFarmer(farmer);
    setLotPage(1);
  };

  const formatVolume = (kg: number) => {
    if (!kg || kg <= 0) return 'Chưa có lô mở bán';
    if (kg >= 1000) return `${Number((kg / 1000).toFixed(1))} Tấn`;
    return `${new Intl.NumberFormat('vi-VN').format(kg)} kg`;
  };

  const totalLotsForModal = selectedFarmer?.openLots?.length || 0;
  const totalLotPages = Math.max(1, Math.ceil(totalLotsForModal / LOTS_PER_PAGE));
  const pagedLots = selectedFarmer
    ? selectedFarmer.openLots.slice((lotPage - 1) * LOTS_PER_PAGE, lotPage * LOTS_PER_PAGE)
    : [];

  return (
    <section className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10542C]/10 text-[#10542C] text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4CAF50]" />
            <span>Hồ Sơ Nhà Vườn &amp; Hợp Tác Xã</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-black text-[#10542C]">
            Hợp Tác Xã &amp; Vùng Chuyên Canh Trọng Điểm
          </h2>
          <p className="text-xs text-[#6B7280]">
            Danh sách các Nhà vườn &amp; Hợp tác xã trên hệ thống. Bấm vào từng thẻ để xem chi tiết hồ sơ và nguồn hàng.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex items-center justify-center gap-2 text-xs text-[#6B7280]">
          <Loader2 className="w-5 h-5 animate-spin text-[#10542C]" />
          <span>Đang tải hồ sơ Nhà vườn từ máy chủ...</span>
        </div>
      ) : farmers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-[#CBE3D0] p-8 text-center space-y-2">
          <Sprout className="w-8 h-8 text-[#4CAF50] mx-auto opacity-80" />
          <p className="font-heading font-bold text-sm text-[#10542C]">
            Chưa có hồ sơ Nhà vườn / Hợp tác xã nào trong hệ thống
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {farmers.map((farmer) => {
            const certs = String(farmer.certification || 'VietGAP')
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean)
              .slice(0, 2);

            return (
              <Tilt3DCard
                key={farmer.id}
                maxTilt={7}
                glowColor="rgba(16, 84, 44, 0.14)"
                onClick={() => handleOpenFarmer(farmer)}
                className="rounded-3xl border border-[#EAECE8] bg-white shadow-xs hover:shadow-xl hover:border-[#4CAF50]/40 transition-all flex flex-col justify-between overflow-hidden group cursor-pointer"
              >
                <div>
                  <div className="relative h-36 w-full overflow-hidden bg-gray-100">
                    <img
                      src={farmer.coverImageUrl || DEFAULT_FARM_IMAGE}
                      alt={farmer.farmName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== DEFAULT_FARM_IMAGE) {
                          target.src = DEFAULT_FARM_IMAGE;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    <span className="absolute top-3 left-3 bg-black/55 backdrop-blur-md text-white text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border border-white/20">
                      {farmer.pucCode || 'PUC-CHƯA CẬP NHẬT'}
                    </span>
                    <span className="absolute bottom-3 right-3 bg-[#4CAF50] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                      {farmer.openLotCount > 0
                        ? `${farmer.openLotCount} lô đang mở`
                        : `${farmer.pastLotCount || 0} lô đã mở`}
                    </span>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div>
                      <h3 className="font-heading font-extrabold text-sm text-[#10542C] line-clamp-1 group-hover:text-emerald-700 transition-colors">
                        {farmer.farmName}
                      </h3>
                      <div className="text-[11px] text-[#6B7280] flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-[#8BC34A] shrink-0" />
                        <span className="truncate">{farmer.address || 'Vùng trồng liên kết'}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {certs.map((c) => (
                        <span
                          key={c}
                          className="text-[9.5px] font-bold bg-emerald-50 text-[#10542C] border border-emerald-200 px-2 py-0.5 rounded-full"
                        >
                          ✓ {c}
                        </span>
                      ))}
                      {farmer.kycStatus === 'VERIFIED' && (
                        <span className="text-[9.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                          Đã xác thực
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#2C3E2E] space-y-1 pt-2 border-t border-[#F0F4F1]">
                      <div className="text-[#6B7280] flex justify-between gap-2">
                        <span className="shrink-0">Đại diện:</span>
                        <strong className="text-[#2C3E2E] truncate">{farmer.ownerName}</strong>
                      </div>
                      <div className="text-[#6B7280] truncate">
                        Nông sản:{' '}
                        <strong className="text-[#10542C]">
                          {farmer.mainProduce.length > 0
                            ? farmer.mainProduce.join(', ')
                            : 'Đang cập nhật vụ mùa'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFarmer(farmer);
                    }}
                    className="w-full py-2.5 bg-[#F4F8F5] hover:bg-[#10542C] text-[#10542C] hover:text-white border border-[#D7EED6] hover:border-[#10542C] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Xem chi tiết hồ sơ</span>
                  </button>
                </div>
              </Tilt3DCard>
            );
          })}
        </div>
      )}

      {/* Modal Chi Tiết Hồ Sơ Nhà Vườn (render qua Portal để luôn nổi trên cùng) */}
      {selectedFarmer &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setSelectedFarmer(null)}
          >
            <div
              className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-[#EAECE8] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-40 w-full bg-[#10542C]">
                <img
                  src={selectedFarmer.coverImageUrl || DEFAULT_FARM_IMAGE}
                  alt={selectedFarmer.farmName}
                  className="w-full h-full object-cover opacity-85"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#061C0F]/90 via-black/30 to-transparent" />
                <button
                  type="button"
                  onClick={() => setSelectedFarmer(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-4 left-5 right-5 text-white">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#8BC34A] text-[#061C0F] px-2.5 py-0.5 rounded-full">
                      {selectedFarmer.householdFarmer ? 'Hộ Nông Dân' : 'Hợp Tác Xã'}
                    </span>
                    {selectedFarmer.kycStatus === 'VERIFIED' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/25">
                        <CheckCircle2 className="w-3 h-3 text-[#8BC34A]" /> Đã xác thực KYC
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading text-lg font-extrabold mt-1">
                    {selectedFarmer.farmName}
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-4 text-xs max-h-[68vh] overflow-y-auto">
                {/* Thông tin hồ sơ (ẩn hoàn toàn số điện thoại) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F7FBF8] p-4 rounded-2xl border border-[#E1EFE3]">
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5 text-[#4CAF50]" /> Người đại diện:
                    </span>
                    <p className="font-bold text-[#10542C]">{selectedFarmer.ownerName}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#4CAF50]" /> Kênh giao dịch:
                    </span>
                    <p className="font-bold text-[#10542C]">
                      Bảo mật trực tiếp qua Sàn HONA FRESH
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-[#4CAF50]" /> Mã vùng trồng (PUC) &amp; Chuẩn:
                    </span>
                    <p className="font-bold text-[#10542C]">
                      {selectedFarmer.pucCode || 'Chưa cập nhật'} ·{' '}
                      {selectedFarmer.certification || 'VietGAP'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#4CAF50]" /> Địa chỉ vùng trồng:
                    </span>
                    <p className="font-bold text-[#2C3E2E]">
                      {selectedFarmer.address || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>

                {/* Danh sách lô đang mở & đã mở bán (có phân trang) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-heading font-bold text-sm text-[#10542C] flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-[#4CAF50]" />
                      <span>
                        Lô nông sản đang mở &amp; đã mở bán ({totalLotsForModal})
                      </span>
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="text-emerald-700">
                        Đang mở: {selectedFarmer.openLotCount}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-slate-600">
                        Đã mở: {selectedFarmer.pastLotCount || 0}
                      </span>
                    </div>
                  </div>

                  {totalLotsForModal === 0 ? (
                    <p className="text-xs text-[#6B7280] bg-gray-50 p-3 rounded-xl border border-gray-200">
                      Nhà vườn hiện chưa có lô nông sản nào được mở bán trên sàn.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {pagedLots.map((lot) => {
                          const isOpen = String(lot.status || '').toUpperCase() === 'OPEN';
                          return (
                            <div
                              key={lot.id}
                              className="p-3 rounded-xl border border-[#EAECE8] bg-white flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-[#10542C] truncate">
                                    {lot.productName}
                                  </p>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold shrink-0 ${
                                      isOpen
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {isOpen ? 'Đang mở bán' : 'Đã mở bán'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#6B7280] font-mono">
                                  Mã lô: {lot.lotCode} ·{' '}
                                  {isOpen
                                    ? `Còn ${new Intl.NumberFormat('vi-VN').format(lot.availableWeightKg)} kg`
                                    : `Tổng lô ${new Intl.NumberFormat('vi-VN').format(lot.totalWeightKg || lot.availableWeightKg)} kg`}
                                </p>
                              </div>
                              <span className="font-heading font-black text-sm text-[#10542C] shrink-0">
                                {new Intl.NumberFormat('vi-VN').format(lot.basePricePerKg)} đ/kg
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {totalLotPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[11px] text-[#6B7280]">
                            Trang <strong className="text-[#10542C]">{lotPage}</strong> /{' '}
                            {totalLotPages}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={lotPage <= 1}
                              onClick={() => setLotPage((p) => Math.max(1, p - 1))}
                              className="px-2.5 py-1 rounded-lg border border-[#DCE5DD] text-[#10542C] font-bold disabled:opacity-40 cursor-pointer hover:bg-emerald-50 flex items-center gap-1"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              <span>Trước</span>
                            </button>
                            <button
                              type="button"
                              disabled={lotPage >= totalLotPages}
                              onClick={() => setLotPage((p) => Math.min(totalLotPages, p + 1))}
                              className="px-2.5 py-1 rounded-lg border border-[#DCE5DD] text-[#10542C] font-bold disabled:opacity-40 cursor-pointer hover:bg-emerald-50 flex items-center gap-1"
                            >
                              <span>Sau</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#EAECE8]">
                  <button
                    type="button"
                    onClick={() => setSelectedFarmer(null)}
                    className="px-5 py-2.5 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
