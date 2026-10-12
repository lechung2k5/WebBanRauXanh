import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Truck, Clock, HeartHandshake, Phone, Mail, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[#EAECE8] pt-14 pb-8 mt-16 text-[#2C3E2E]">
      <div className="max-w-[1240px] mx-auto px-4">
        {/* 4 Cam kết chính */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-b border-[#F0F2ED]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#D7EED6] flex items-center justify-center shrink-0 text-[#10542C]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-[#10542C]">100% VietGAP & Organic</h4>
              <p className="text-xs text-[#6B7280]">Kiểm định chuẩn ATVSTP</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#D7EED6] flex items-center justify-center shrink-0 text-[#10542C]">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-[#10542C]">Giao Siêu Tốc 2 Giờ</h4>
              <p className="text-xs text-[#6B7280]">Đảm bảo độ tươi ngon nguyên vẹn</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#D7EED6] flex items-center justify-center shrink-0 text-[#10542C]">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-[#10542C]">Hái 4h Sáng Mỗi Ngày</h4>
              <p className="text-xs text-[#6B7280]">Từ nông trại Đà Lạt & Mộc Châu</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#D7EED6] flex items-center justify-center shrink-0 text-[#10542C]">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-[#10542C]">Đổi Trả Miễn Phí</h4>
              <p className="text-xs text-[#6B7280]">Đổi mới 100% nếu dập úa</p>
            </div>
          </div>
        </div>

        {/* Nội dung Footer 4 cột */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-10">
          <div>
            <div className="relative h-12 w-48 mb-4">
              <Image
                src="/assets/logo/Logo_full.png"
                alt="HoNa Fresh"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
              Hệ thống cung cấp rau sạch hữu cơ, chuẩn VietGAP từ nông trại Đà Lạt, Mộc Châu đến từng bữa cơm gia đình Việt.
            </p>
            <div className="flex flex-col gap-2 text-xs text-[#6B7280]">
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#10542C]" /> 123 Nông Trại Xanh, TP. Đà Lạt
              </span>
              <span className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#10542C]" /> Hotline: 1900 6868 (7:00 - 21:00)
              </span>
              <span className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#10542C]" /> contact@honafresh.vn
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-bold text-sm mb-4 text-[#10542C]">Khám Phá Danh Mục</h4>
            <ul className="space-y-2.5 text-xs text-[#6B7280]">
              <li><Link href="/san-pham" className="hover:text-[#10542C] transition-colors">Tất cả sản phẩm</Link></li>
              <li><Link href="/san-pham?category=nam-tuoi" className="hover:text-[#10542C] transition-colors">Nấm tươi cao cấp</Link></li>
              <li><Link href="/san-pham?category=rau-sach" className="hover:text-[#10542C] transition-colors">Rau ăn lá chuẩn VietGAP</Link></li>
              <li><Link href="/san-pham?category=cu" className="hover:text-[#10542C] transition-colors">Củ quả tươi ngon</Link></li>
              <li><Link href="/hom-nay-an-gi" className="hover:text-[#10542C] transition-colors">Hôm nay ăn gì?</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold text-sm mb-4 text-[#10542C]">Dịch Vụ & Hỗ Trợ</h4>
            <ul className="space-y-2.5 text-xs text-[#6B7280]">
              <li><Link href="/don-hang" className="hover:text-[#10542C] transition-colors">Tra cứu đơn hàng</Link></li>
              <li><Link href="/gio-hang" className="hover:text-[#10542C] transition-colors">Giỏ hàng</Link></li>
              <li><Link href="/thanh-toan" className="hover:text-[#10542C] transition-colors">Thanh toán</Link></li>
              <li><span className="hover:text-[#10542C] transition-colors cursor-pointer">Chính sách giao hàng 2h</span></li>
              <li><span className="hover:text-[#10542C] transition-colors cursor-pointer">Chính sách đổi trả 24h</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold text-sm mb-4 text-[#10542C]">Quản Trị & Thông Tin</h4>
            <ul className="space-y-2.5 text-xs text-[#6B7280]">
              <li><Link href="/admin" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10542C] text-white rounded-lg hover:bg-[#0C3E20] transition-colors font-bold">Trang Quản Trị (Admin)</Link></li>
              <li><span className="text-[#6B7280]">Giờ mở cửa: 06:00 - 22:00</span></li>
              <li><span className="text-[#6B7280]">Giao hàng từ thứ 2 đến Chủ nhật</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#F0F2ED] text-center text-xs text-[#6B7280]">
          © 2026 HoNa Fresh. Bản quyền thuộc về WebBanRau. Tươi Ngon Chuẩn VietGAP.
        </div>
      </div>
    </footer>
  );
};
