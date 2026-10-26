import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Truck, Clock, HeartHandshake, Phone, Mail, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[#EAECE8] pt-14 pb-8 mt-16 text-[#2C3E2E]">
      <div className="max-w-[1240px] mx-auto px-4">
        {/* 4 Cam kết B2B chính */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-b border-[#F0F2ED]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#D7EED6] flex items-center justify-center shrink-0 text-[#10542C]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-[#10542C]">Mã Vùng Trồng PUC</h4>
              <p className="text-xs text-[#6B7280]">100% Chuẩn VietGAP & GlobalGAP</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#D7EED6] flex items-center justify-center shrink-0 text-[#10542C]">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-[#10542C]">Logistics Chuỗi Lạnh</h4>
              <p className="text-xs text-[#6B7280]">Bảo quản 2-8°C từ kho đến chợ đầu mối</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#D7EED6] flex items-center justify-center shrink-0 text-[#10542C]">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-[#10542C]">Giá Sỉ Xuất Vườn</h4>
              <p className="text-xs text-[#6B7280]">Bỏ qua trung gian, đàm phán trực tiếp</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#D7EED6] flex items-center justify-center shrink-0 text-[#10542C]">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-[#10542C]">Hợp Đồng & Cọc Lô</h4>
              <p className="text-xs text-[#6B7280]">Bảo chứng thanh toán 30% minh bạch</p>
            </div>
          </div>
        </div>

        {/* Nội dung Footer 4 cột */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-10">
          <div>
            <div className="relative h-12 w-48 mb-4">
              <Image
                src="/assets/logo/Logo_full.png"
                alt="HoNa Fresh B2B"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
              <strong className="text-[#10542C]">HoNa Fresh B2B</strong> — Nền tảng thương mại điện tử nông sản số lượng lớn, cầu nối trực tiếp giữa Nông trại / HTX và Thương lái / Đơn vị thu mua sỉ toàn quốc.
            </p>
            <div className="flex flex-col gap-2 text-xs text-[#6B7280]">
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#10542C]" /> Trung tâm kết nối: Lâm Đồng, Đắk Lắk, Sơn La, Tiền Giang
              </span>
              <span className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#10542C]" /> Tổng đài điều phối thu mua: 1900 6868
              </span>
              <span className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#10542C]" /> b2b-trade@honafresh.vn
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-bold text-sm mb-4 text-[#10542C]">Sàn Giao Dịch Nông Sản</h4>
            <ul className="space-y-2.5 text-xs text-[#6B7280]">
              <li><Link href="/san-pham" className="hover:text-[#10542C] transition-colors">Tất cả lô hàng xuất vườn</Link></li>
              <li><Link href="/#san-chao-mua" className="hover:text-[#10542C] transition-colors">Sàn chào mua B2B (Đăng nhu cầu)</Link></li>
              <li><Link href="/#vung-trong-htx" className="hover:text-[#10542C] transition-colors">Mạng lưới Vùng trồng & Hợp tác xã</Link></li>
              <li><Link href="/san-pham?category=rau-sach" className="hover:text-[#10542C] transition-colors">Rau ăn lá xuất vườn (Sỉ tấn)</Link></li>
              <li><Link href="/san-pham?category=cu" className="hover:text-[#10542C] transition-colors">Củ quả vụ mùa thu hái rộ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold text-sm mb-4 text-[#10542C]">Quy Trình Giao Dịch B2B</h4>
            <ul className="space-y-2.5 text-xs text-[#6B7280]">
              <li><Link href="/don-hang" className="hover:text-[#10542C] transition-colors">Tra cứu hợp đồng & Lô cọc</Link></li>
              <li><Link href="/san-pham" className="hover:text-[#10542C] transition-colors">Kho lô nông sản chào bán</Link></li>
              <li><span className="hover:text-[#10542C] transition-colors cursor-pointer">Quy chế đàm phán giá sỉ (RFQ)</span></li>
              <li><span className="hover:text-[#10542C] transition-colors cursor-pointer">Kiểm định chất lượng tại vườn</span></li>
              <li><span className="hover:text-[#10542C] transition-colors cursor-pointer">Bảo hiểm chuỗi lạnh & Vận chuyển</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold text-sm mb-4 text-[#10542C]">Cổng Kết Nối & Quản Trị</h4>
            <ul className="space-y-2.5 text-xs text-[#6B7280]">
              <li>
                <Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10542C] text-white rounded-lg hover:bg-[#0C3E20] transition-colors font-bold">
                  Cổng Quản Trị Hệ Thống
                </Link>
              </li>
              <li><span className="text-[#6B7280]">Hỗ trợ kỹ thuật HTX: 08:00 - 18:00</span></li>
              <li><span className="text-[#6B7280]">Thời gian nhận báo giá B2B: 24/7</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#F0F2ED] text-center text-xs text-[#6B7280]">
          © 2026 HoNa Fresh B2B Marketplace. Nền tảng kết nối Nông trại & Thương lái số 1 Việt Nam.
        </div>
      </div>
    </footer>
  );
};
