'use client';

import React from 'react';
import { Building2, MapPin, Award, Phone, Users, ShieldCheck } from 'lucide-react';
import { MOCK_B2B_COOPERATIVES } from '@/services/api';

export default function FarmCooperativesSection() {
  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10542C]/10 text-[#10542C] text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4CAF50]" />
            <span>Vùng Trồng Xác Thực & Nguồn Hàng Tận Gốc</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-black text-[#10542C]">
            Hợp Tác Xã & Vùng Chuyên Canh Trọng Điểm
          </h2>
          <p className="text-xs text-[#6B7280]">
            Các đơn vị sản xuất quy mô lớn đạt chuẩn VietGAP, GlobalGAP có mã số vùng trồng PUC kiểm định.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_B2B_COOPERATIVES.map((coop) => (
          <div
            key={coop.id}
            className="p-4 rounded-2xl border border-[#EAECE8] bg-white hover:border-[#10542C]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2.5">
              <div className="relative h-28 w-full rounded-xl overflow-hidden bg-gray-100">
                <img src={coop.avatarUrl} alt={coop.name} className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono px-2 py-0.5 rounded-md font-bold">
                  {coop.pucCode}
                </span>
                <span className="absolute bottom-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                  {coop.monthlyCapacity}
                </span>
              </div>

              <div>
                <h3 className="font-heading font-bold text-sm text-[#10542C] line-clamp-1">
                  {coop.name}
                </h3>
                <div className="text-[11px] text-[#6B7280] flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-[#8BC34A] shrink-0" />
                  <span className="truncate">{coop.location}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {coop.certifications.map((c) => (
                  <span
                    key={c}
                    className="text-[9px] font-bold bg-[#F0F7F2] text-[#10542C] border border-[#D7EED6] px-1.5 py-0.5 rounded"
                  >
                    ✓ {c}
                  </span>
                ))}
              </div>

              <div className="text-[11px] text-[#2C3E2E] space-y-0.5 pt-1 border-t border-[#F0F0F0]">
                <div className="text-[#6B7280]">
                  Quy mô: <strong>{coop.cultivatedArea}</strong>
                </div>
                <div className="text-[#6B7280] truncate">
                  Nông sản chính: <strong className="text-[#10542C]">{coop.mainProduce.join(', ')}</strong>
                </div>
              </div>
            </div>

            <a
              href={`tel:${coop.phone}`}
              className="w-full py-2 bg-[#F9F9F5] hover:bg-[#F0F7F2] text-[#10542C] border border-[#D7EED6] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#4CAF50]" />
              <span>Liên hệ: {coop.phone}</span>
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
