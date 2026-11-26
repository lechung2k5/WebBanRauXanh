'use client';

import React from 'react';
import {
  X,
  FileText,
  Printer,
  ShieldCheck,
  Building2,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  Award,
  LockKeyhole,
} from 'lucide-react';
import { getContractPrintUrl } from '@/services/farmerApi';
import { getShippingMethodLabel, calculateB2bContractFinancials } from '@/utils/logisticsCalculator';

export interface B2bContractModalData {
  id: number;
  contractCode: string;
  rfqCode?: string;
  lotCode?: string;
  productName: string;
  buyerName?: string;
  buyerCompany?: string;
  buyerRepresentative?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  farmerName?: string;
  farmerCompany?: string;
  farmerRepresentative?: string;
  farmerPhone?: string;
  farmerAddress?: string;
  farmerPuc?: string;
  quantityKg: number;
  unitPrice: number;
  totalAmount: number;
  goodsAmount?: number;
  shippingFee?: number;
  shippingOption?: string;
  depositAmount: number;
  remainingAmount?: number;
  depositStatus?: string;
  isDepositPaid?: boolean;
  status?: string;
  fulfillmentStatusName?: string;
  deliveryAddress?: string;
  deliveryTimeSlot?: string;
  createdAt?: string;

  // Nghiệm thu thu hoạch rẫy từ Nhà Vườn (Mốc 2)
  actualHarvestWeightKg?: number;
  packageCount?: number;
  packageType?: string;
  farmPickupAddress?: string;
  harvestNotes?: string;
  harvestProofImageUrl?: string;
  grade1Ratio?: number;
  isHarvestDone?: boolean;
  packagingApproved?: boolean;
  packaging_approved?: boolean;
  qrCodeData?: string;
}

export interface B2bContractViewModalProps {
  contract: B2bContractModalData | null;
  isOpen: boolean;
  onClose: () => void;
  role?: 'ADMIN' | 'BUYER' | 'FARMER';
  onAdminDispatchPickup?: (contract: any) => void;
  onBuyerPayDeposit?: (contract: any) => void;
  onTrackDelivery?: (contract: any) => void;
}

const parsePickupDetails = (rawStr: unknown) => {
  const text = String(rawStr || '').trim();
  if (!text || text === '—' || text === 'null' || text === 'undefined') {
    return {
      farmLocation: 'Thôn Đa Quý, Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng',
      contactPhone: '0912.345.678',
      roadAccess: 'Đường bê tông nông thôn 6m, xe tải 5 tấn vào tận bãi sân đóng gói nhà vườn',
    };
  }

  let contactPhone = '';
  // Chỉ match các chữ số và dấu chấm, không dính dấu gạch nối/dấu trừ
  const phoneMatch = text.match(/(?:SĐT|Số\s*điện\s*thoại)?\s*đ[oóòỏõọôốồổỗộ]n\s*xe:\s*([0-9\.\s]+)/iu);
  if (phoneMatch) {
    contactPhone = phoneMatch[1].replace(/[-–—\s]+$/, '').trim();
  }

  let roadAccess = '';
  const roadMatch = text.match(/[-–—]\s*([^\)]+)/u);
  if (roadMatch) {
    roadAccess = roadMatch[1].trim();
  }

  // Tẩy sạch triệt để TOÀN BỘ các cụm (SĐT đón xe: ...) bị lặp nhiều lần
  let farmLocation = text
    .replace(/\s*\(\s*(?:s[đd]t|số\s*điện\s*thoại)?\s*đ[oóòỏõọôốồổỗộ]n\s*xe[\s\S]*?\)/giu, '')
    .trim();

  // Loại bỏ các cặp ngoặc rỗng nếu còn sót
  farmLocation = farmLocation.replace(/\(\s*\)/g, '').trim();

  return {
    farmLocation: farmLocation || 'Thôn Đa Quý, Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng',
    contactPhone: contactPhone || '0912.345.678',
    roadAccess: roadAccess || 'Đường bê tông nông thôn 6m, xe tải 5 tấn vào tận bãi sân đóng gói nhà vườn',
  };
};

export default function B2bContractViewModal({
  contract,
  isOpen,
  onClose,
  role = 'BUYER',
  onAdminDispatchPickup,
  onBuyerPayDeposit,
  onTrackDelivery,
}: B2bContractViewModalProps) {
  if (!isOpen || !contract) return null;

  // TÍNH TOÁN TÀI CHÍNH CHUẨN XAC QUA HÀM DÙNG CHUNG DUY NHẤT (SINGLE SOURCE OF TRUTH)
  const fin = calculateB2bContractFinancials(contract);

  const isDepositPaid = Boolean(
    contract.isDepositPaid ||
    contract.depositStatus === 'PAID' ||
    contract.depositStatus === 'DEPOSIT_PAID' ||
    contract.status === 'DEPOSIT_PAID' ||
    contract.status === 'ACTIVE' ||
    contract.status === 'COMPLETED' ||
    contract.status === 'DELIVERING' ||
    contract.status === 'DELIVERED' ||
    contract.status === 'HARVESTED' ||
    contract.status === 'PACKAGING_APPROVED' ||
    contract.status === 'PICKUP_DISPATCHED' ||
    contract.status === 'IN_TRANSIT_HUB' ||
    contract.status === 'AT_HUB_QC'
  );

  const goodsAmount = fin.pureGoodsAmount;
  const shippingFee = fin.shippingFee;
  const grandTotal = fin.grandTotal;
  const calculatedDeposit = fin.depositAmount;
  const remainingAmount = fin.remainingAmount;
  const isSelfPickup = fin.isSelfPickup;

  const cleanText = (val: unknown): string => {
    if (!val) return '';
    const s = String(val).trim();
    return (s === '—' || s === 'null' || s === 'undefined') ? '' : s;
  };

  const cleanPhone = (val: unknown, fallback: string): string => {
    const safeFallback = fallback && fallback.replace(/[^0-9]/g, '').length >= 8 ? fallback : '0912.345.678';
    if (!val) return safeFallback;
    const s = String(val).trim();
    if (s === '—' || s === 'null' || s === 'undefined' || s === '') return safeFallback;
    // Nếu có chữ cái, đây chắc chắn là tên người (bị map nhầm) chứ không phải số điện thoại!
    if (/[a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]/.test(s)) return safeFallback;
    const digits = s.replace(/[^0-9]/g, '');
    if (digits.length < 8 || digits.length > 15) return safeFallback;
    return s;
  };

  const farmerPickupParsed = parsePickupDetails(contract.farmerAddress || contract.farmPickupAddress);
  const rawFarmerAddr = cleanText(contract.farmerAddress);
  const cleanFarmerLocation =
    (rawFarmerAddr && !rawFarmerAddr.startsWith('Bốc hàng tại') ? rawFarmerAddr : '') ||
    (farmerPickupParsed.farmLocation !== 'Thôn Đa Quý, Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng' ? farmerPickupParsed.farmLocation : '') ||
    'Chưa cập nhật địa chỉ vườn';

  const farmerCompName = cleanText(contract.farmerCompany) || cleanText(contract.farmerName) || 'Chưa cập nhật';
  const farmerRepName = cleanText(contract.farmerRepresentative) || cleanText(contract.farmerName) || farmerCompName;
  const farmerPhoneStr = cleanPhone(contract.farmerPhone, farmerPickupParsed.contactPhone || '');

  const buyerCompName = cleanText(contract.buyerCompany) || cleanText(contract.buyerName) || 'Chưa cập nhật';
  const buyerRepName = cleanText(contract.buyerRepresentative) || cleanText(contract.buyerName) || buyerCompName;

  const buyerPhoneStr = cleanPhone(contract.buyerPhone, '');
  const deliveryAddressStr = cleanText(contract.deliveryAddress) || cleanText(contract.buyerAddress) || 'Chưa cập nhật địa chỉ nhận';
  const rfqCodeStr = cleanText(contract.rfqCode) || (contract.contractCode ? `RFQ-${contract.contractCode.replace(/^HD-/, '')}` : '');

  const formatVnd = (num?: number) => {
    if (num === undefined || num === null) return '0 đ';
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const createdDate = contract.createdAt ? new Date(contract.createdAt) : new Date();
  const dayStr = String(createdDate.getDate()).padStart(2, '0');
  const monthStr = String(createdDate.getMonth() + 1).padStart(2, '0');
  const yearStr = String(createdDate.getFullYear());

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=900,height=780');
    if (!win) {
      if (contract.id) window.open(getContractPrintUrl(contract.id), '_blank');
      else window.print();
      return;
    }

    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Hợp Đồng Mua Bán Hàng Hóa ${contract.contractCode}</title>
          <style>
            @page { size: A4; margin: 16mm; }
            body { font-family: "Times New Roman", Times, serif; color: #0f172a; font-size: 13px; line-height: 1.55; max-width: 820px; margin: 0 auto; padding: 16px; }
            .no-print { display: flex; justify-content: flex-end; gap: 8px; padding-bottom: 12px; margin-bottom: 14px; border-bottom: 1px dashed #cbd5e1; font-family: Arial, sans-serif; }
            @media print { .no-print { display: none !important; } body { padding: 0; max-width: none; } }
            h2.art { font-size: 13px; font-weight: bold; margin: 12px 0 4px; }
            p { margin: 4px 0; text-align: justify; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0 10px; font-size: 12.5px; }
            th, td { border: 1px solid #334155; padding: 6px 8px; }
            th { background: #f1f5f9; text-align: center; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button onclick="window.print()" style="background:#10542c;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:bold;cursor:pointer;">In Hợp Đồng (A4)</button>
            <button onclick="window.close()" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:8px 14px;border-radius:8px;font-weight:bold;cursor:pointer;">Đóng</button>
          </div>

          <div style="text-align:center;margin-bottom:14px;">
            <div style="font-weight:bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div style="font-weight:bold;">Độc lập – Tự do – Hạnh phúc</div>
            <div>——————-</div>
            <h1 style="margin:8px 0 2px;font-size:18px;font-weight:bold;">HỢP ĐỒNG MUA BÁN HÀNG HÓA</h1>
            <div><strong>Số: ${contract.contractCode}/HĐMB</strong></div>
          </div>

          <p><strong>Căn cứ:</strong></p>
          <p>– Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015 và các văn bản pháp luật liên quan;</p>
          <p>– Luật Thương mại số 36/2005/QH11 ngày 14/06/2005 và các văn bản pháp luật liên quan;</p>
          <p>– Nhu cầu và khả năng của các bên;</p>
          <p style="margin-top:6px;">Hôm nay, ngày <strong>${dayStr}</strong> tháng <strong>${monthStr}</strong> năm <strong>${yearStr}</strong>, tại Sàn giao dịch nông sản B2B HoNa Fresh.</p>
          <p>Chúng tôi gồm có:</p>

          <div style="margin:8px 0;">
            <p><strong>BÊN BÁN (Bên A): ${farmerCompName}</strong></p>
            <p>Mã số / Mã vùng trồng (PUC): ${cleanText(contract.farmerPuc) || 'VN-PUC-VIETGAP'}</p>
            <p>Địa chỉ trụ sở chính: ${cleanFarmerLocation}</p>
            <p>Điện thoại: ${farmerPhoneStr}</p>
            <p>Đại diện theo pháp luật: <strong>${farmerRepName}</strong> &nbsp;&nbsp;&nbsp; Chức vụ: Chủ trang trại / Giám đốc HTX</p>
          </div>

          <div style="margin:8px 0 12px;">
            <p><strong>BÊN MUA (Bên B): ${buyerCompName}</strong></p>
            <p>Địa chỉ trụ sở chính: ${deliveryAddressStr}</p>
            <p>Điện thoại: ${buyerPhoneStr}</p>
            <p>Đại diện theo pháp luật: <strong>${buyerRepName}</strong> &nbsp;&nbsp;&nbsp; Chức vụ: Giám đốc thu mua</p>
          </div>

          <p>Trên cơ sở thỏa thuận, hai bên thống nhất ký kết hợp đồng mua bán hàng hóa với các điều khoản như sau:</p>

          <h2 class="art">Điều 1: TÊN HÀNG – SỐ LƯỢNG – CHẤT LƯỢNG – GIÁ TRỊ HỢP ĐỒNG</h2>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên hàng hóa</th>
                <th>Đơn vị</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align:center;">1</td>
                <td><strong>${contract.productName}</strong> (${contract.lotCode || rfqCodeStr})</td>
                <td style="text-align:center;">kg</td>
                <td style="text-align:right;font-weight:bold;">${Number(contract.quantityKg || 0).toLocaleString('vi-VN')}</td>
                <td style="text-align:right;">${formatVnd(contract.unitPrice)}</td>
                <td style="text-align:right;font-weight:bold;">${formatVnd(goodsAmount)}</td>
                <td>Đạt chuẩn VietGAP / KCT (Không chịu VAT nông sản)</td>
              </tr>
              ${shippingFee > 0 ? `
              <tr>
                <td style="text-align:center;">2</td>
                <td>Cước vận tải lạnh (${getShippingMethodLabel(contract.shippingOption).title})</td>
                <td style="text-align:center;">Chuyến</td>
                <td style="text-align:right;">1</td>
                <td style="text-align:right;">${formatVnd(shippingFee)}</td>
                <td style="text-align:right;">${formatVnd(shippingFee)}</td>
                <td>Theo biểu phí sàn (Dịch vụ chịu VAT 8%)</td>
              </tr>` : ''}
            </tbody>
          </table>
          <p><strong>Tổng giá trị thanh toán hợp đồng: ${formatVnd(grandTotal)}</strong> (Đã bao gồm đặt cọc 30% Escrow: <strong>${formatVnd(calculatedDeposit)}</strong>; Số tiền còn lại 70%: <strong>${formatVnd(remainingAmount)}</strong>).</p>

          <h2 class="art">Điều 2: THANH TOÁN</h2>
          <p>1. Bên B phải thanh toán cọc 30% bảo chứng Escrow (${formatVnd(calculatedDeposit)}) ngay khi ký kết hợp đồng và thanh toán 70% phần còn lại (${formatVnd(remainingAmount)}) sau khi kiểm đếm, ký nhận Biên bản giao nhận điện tử (ePOD) tại kho Bên B.</p>
          <p>2. Bên B thanh toán qua cổng VietQR / Chuyển khoản ngân hàng vào tài khoản ký quỹ bảo chứng của Sàn HoNa Fresh.</p>

          <h2 class="art">Điều 3: THỜI GIAN, ĐỊA ĐIỂM VÀ PHƯƠNG THỨC GIAO HÀNG</h2>
          <p>1. Địa điểm giao hàng: ${deliveryAddressStr} (${cleanText(contract.deliveryTimeSlot) || 'Theo lịch điều phối sàn'}).</p>
          <p>2. Phương tiện vận chuyển và chi phí vận chuyển: ${getShippingMethodLabel(contract.shippingOption).title}.</p>
          <p>3. Quy định lịch giao nhận hàng hóa: Nếu Bên B không đến nhận hàng đúng lịch thì phải chịu chi phí lưu kho lạnh; nếu Bên A không có hàng giao đúng cam kết thì phải chịu bồi hoàn theo quy định của Sàn.</p>
          <p>4. Khi nhận hàng, Bên B có trách nhiệm kiểm nhận phẩm chất, quy cách hàng hóa tại chỗ và lập Biên bản giao nhận ePOD. Nếu phát hiện hàng thiếu hoặc không đúng tiêu chuẩn chất lượng thì ghi nhận ngay trên ePOD để đối soát.</p>
          <p>5. Trường hợp giao nhận hàng theo nguyên đai, nguyên kiện, nếu phát hiện vi phạm chất lượng khi kiểm định KCS tại trạm trung chuyển, Bên A chịu trách nhiệm xử lý hoàn hàng hoặc bù hàng theo quy trình QC của HoNa Fresh.</p>
          <p>6. Mỗi lô hàng khi giao nhận phải có xác nhận chất lượng bằng Biên bản kiểm định QA/QC và Phiếu xuất kho / Hợp đồng vận chuyển kèm theo.</p>

          <h2 class="art">Điều 4: TRÁCH NHIỆM CỦA CÁC BÊN</h2>
          <p>1. Bên bán chịu trách nhiệm đảm bảo chất lượng nông sản đúng tiêu chuẩn VietGAP và sản lượng đã cam kết; không chịu trách nhiệm về khiếm khuyết mà Bên mua đã biết tại thời điểm giao kết.</p>
          <p>2. Trong thời hạn khiếu nại theo quy định của Luật Thương mại 2005, Bên bán chịu trách nhiệm về khiếm khuyết của hàng hóa phát sinh trước thời điểm chuyển rủi ro.</p>
          <p>3. Bên mua có trách nhiệm thanh toán đầy đủ và nhận hàng theo đúng thời gian đã thỏa thuận.</p>

          <h2 class="art">Điều 5: BẢO HÀNH VÀ HƯỚNG DẪN BẢO QUẢN HÀNG HÓA</h2>
          <p>1. Bên A chịu trách nhiệm đảm bảo độ tươi, chỉ số an toàn thực phẩm (Brix, Nitrate, thuốc BVTV âm tính) của lô hàng <strong>${contract.productName}</strong> trong suốt thời gian lưu kho lạnh tiêu chuẩn (FEFO).</p>
          <p>2. Quy cách đóng gói & bảo quản: ${cleanText(contract.packageType) || 'Thùng xốp niêm phong giữ nhiệt 2°C - 6°C'}.</p>

          <h2 class="art">Điều 6: ĐIỀU KHOẢN PHẠT VI PHẠM HỢP ĐỒNG</h2>
          <p>Hai bên cam kết thực hiện nghiêm túc các điều khoản đã thỏa thuận trên, không được đơn phương thay đổi hoặc hủy bỏ hợp đồng. Bên nào vi phạm hoặc đơn phương đình chỉ hợp đồng không có lý do chính đáng sẽ chịu phạt <strong>8%</strong> giá trị phần hợp đồng bị vi phạm theo Luật Thương mại.</p>

          <h2 class="art">Điều 7: BẤT KHẢ KHÁNG VÀ GIẢI QUYẾT TRANH CHẤP</h2>
          <p>1. Bất khả kháng là các sự kiện khách quan không thể lường trước (thiên tai, bão lụt, hỏa hoạn, chiến tranh, phong tỏa giao thông). Khi xảy ra bất khả kháng, bên gặp phải phải thông báo ngay cho bên kia để phối hợp giảm thiểu thiệt hại.</p>
          <p>2. Mọi tranh chấp phát sinh ưu tiên giải quyết thông qua thương lượng và hòa giải trên Sàn HoNa Fresh; trường hợp không tự giải quyết được sẽ đưa ra Tòa án có thẩm quyền giải quyết.</p>

          <h2 class="art">Điều 8: ĐIỀU KHOẢN CHUNG</h2>
          <p>1. Hợp đồng này có hiệu lực từ ngày ký và tự động thanh lý kể từ khi Bên B đã nhận đủ hàng (ký ePOD) và Bên A đã nhận đủ tiền quyết toán.</p>
          <p>2. Hợp đồng này thay thế mọi thỏa thuận trước đây giữa hai bên; mọi sửa đổi phải lập thành văn bản Phụ lục hợp đồng.</p>
          <p>3. Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau (lưu trữ bản điện tử trên hệ thống HoNa Fresh), mỗi bên giữ 01 bản.</p>

          <div style="display:flex;justify-content:space-between;gap:24px;margin-top:24px;text-align:center;">
            <div style="flex:1;">
              <div style="font-weight:bold;">ĐẠI DIỆN BÊN A (BÊN BÁN)</div>
              <div style="font-size:11px;color:#475569;margin-bottom:46px;">(Ký tên, đóng dấu)</div>
              <div style="font-weight:bold;">${farmerRepName}</div>
            </div>
            <div style="flex:1;">
              <div style="font-weight:bold;">ĐẠI DIỆN BÊN B (BÊN MUA)</div>
              <div style="font-size:11px;color:#475569;margin-bottom:46px;">(Ký tên, đóng dấu)</div>
              <div style="font-weight:bold;">${buyerRepName}</div>
            </div>
          </div>
          <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl z-10 max-h-[92vh] flex flex-col border border-emerald-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0C3E20] to-[#10542C] text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#8BC34A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-sm sm:text-base tracking-wide text-white">
                  Hợp Đồng Mua Bán Nông Sản Sỉ B2B Điện Tử
                </h3>
                <span className="text-[10px] font-mono font-bold bg-[#8BC34A] text-[#0C3E20] px-2 py-0.5 rounded-full">
                  {contract.contractCode}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200">
                Xác thực điện tử 3 bên có ký quỹ bảo chứng Escrow sàn HoNa Fresh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition border border-white/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Hợp Đồng</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contract Paper Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-[#FCFDFB] text-slate-800 text-sm">
          {/* Header Quốc hiệu / Mộc sàn */}
          <div className="text-center space-y-1 pb-4 border-b border-gray-200">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 text-xs">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </h4>
            <p className="text-xs text-slate-500 italic">
              Độc lập - Tự do - Hạnh phúc
            </p>
            <div className="w-20 h-0.5 bg-slate-300 mx-auto my-2" />
            <h2 className="font-heading font-black text-lg sm:text-xl text-[#10542C] uppercase tracking-wide">
              HỢP ĐỒNG NGUYÊN TẮC THU MUA NÔNG SẢN SỈ B2B
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-mono">
              Số: <strong>{contract.contractCode}</strong> | Ngày ký:{' '}
              {contract.createdAt
                ? new Date(contract.createdAt).toLocaleDateString('vi-VN')
                : new Date().toLocaleDateString('vi-VN')}
            </p>
          </div>

          {/* Banner Trạng thái Ký quỹ Escrow */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold text-emerald-900 text-sm block">
                  Bảo Chứng Tiền Cọc 30% Tại Sàn Nông Sản HoNa Fresh
                </span>
                <span className="text-xs sm:text-sm text-emerald-700">
                  {isDepositPaid
                    ? `✓ Đã ký quỹ an toàn ${formatVnd(contract.depositAmount)} vào tài khoản Escrow`
                    : `Đang chờ thương lái nộp tiền cọc bảo chứng: ${formatVnd(contract.depositAmount)}`}
                </span>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                isDepositPaid
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-amber-100 text-amber-900 animate-pulse'
              }`}
            >
              {isDepositPaid ? 'ĐÃ KÝ QUỸ' : 'CHỜ KÝ QUỸ'}
            </span>
          </div>

          {/* Thông tin 2 bên ký kết */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bên A: Nhà Vườn / HTX */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="font-heading font-bold text-xs text-[#10542C] uppercase">
                  BÊN A: BÊN BÁN (NHÀ VƯỜN / HTX)
                </span>
                <Building2 className="w-4 h-4 text-[#10542C]" />
              </div>
              <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
                <p>
                  Đơn vị:{' '}
                  <strong className="text-slate-900 font-bold">
                    {farmerCompName}
                  </strong>
                </p>
                <p>
                  Người đại diện:{' '}
                  <strong className="text-slate-800 font-semibold">
                    {farmerRepName}
                  </strong>
                </p>
                <p className="flex items-center gap-1.5 flex-wrap">
                  <span>Số điện thoại:</span>{' '}
                  {isDepositPaid ? (
                    <strong className="font-mono text-slate-800 font-bold">
                      {farmerPhoneStr}
                    </strong>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs font-bold" title="Thông tin liên hệ nhà vườn được mở khóa tự động ngay sau khi đặt cọc">
                      <LockKeyhole className="w-3 h-3 text-amber-700" />
                      <span>{farmerPhoneStr ? `${farmerPhoneStr.slice(0, 4)}.***.***` : '0***.***.***'} (Mở sau khi cọc)</span>
                    </span>
                  )}
                </p>
                <p>
                  Mã vùng trồng (PUC):{' '}
                  <strong className="font-mono text-[#10542C] bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                    {cleanText(contract.farmerPuc) || 'Đang cập nhật'}
                  </strong>
                </p>
                <p className="text-slate-600">
                  Địa chỉ vườn:{' '}
                  <span className="font-medium text-slate-800">
                    {cleanFarmerLocation}
                  </span>
                </p>
              </div>
            </div>

            {/* Bên B: Thương Lái / Buyer */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="font-heading font-bold text-xs text-sky-800 uppercase">
                  BÊN B: BÊN MUA (THƯƠNG LÁI / SIÊU THỊ)
                </span>
                <Award className="w-4 h-4 text-sky-700" />
              </div>
              <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
                <p>
                  Đơn vị mua:{' '}
                  <strong className="text-slate-900 font-bold">
                    {buyerCompName}
                  </strong>
                </p>
                <p>
                  Người đại diện:{' '}
                  <strong className="text-slate-800 font-semibold">
                    {buyerRepName}
                  </strong>
                </p>
                <p className="flex items-center gap-1.5 flex-wrap">
                  <span>Số điện thoại:</span>{' '}
                  {isDepositPaid ? (
                    <strong className="font-mono text-slate-800 font-bold">
                      {buyerPhoneStr}
                    </strong>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs font-bold" title="Thông tin liên hệ thương lái mở sau khi nộp cọc">
                      <LockKeyhole className="w-3 h-3 text-amber-700" />
                      <span>{buyerPhoneStr ? `${buyerPhoneStr.slice(0, 4)}.***.***` : '0***.***.***'} (Mở sau khi cọc)</span>
                    </span>
                  )}
                </p>
                <p className="text-slate-600">
                  Kho nhận hàng:{' '}
                  <span className="font-medium text-slate-800">
                    {deliveryAddressStr}
                  </span>
                </p>
                <p className="text-[11px] text-sky-700 font-semibold">
                  Mã RFQ gốc:{' '}
                  <span className="font-mono font-bold bg-sky-50 px-1.5 py-0.5 rounded text-sky-900 border border-sky-200">
                    {rfqCodeStr}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Bảng Chi Tiết Hàng Hóa & Giá Trị Hợp Đồng (Đã Gồm Cước Vận Chuyển Chuỗi Lạnh) */}
          <div className="space-y-2.5">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-xs block">
              ĐIỀU 1: TÊN HÀNG – SỐ LƯỢNG – CHẤT LƯỢNG – GIÁ TRỊ HỢP ĐỒNG
            </span>
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F4F6F1] text-slate-700 font-bold border-b border-gray-200 text-xs sm:text-sm">
                  <tr>
                    <th className="py-3 px-3.5">Hạng Mục Thanh Toán</th>
                    <th className="py-3 px-3.5 text-right">Khối Lượng / Đơn Vị</th>
                    <th className="py-3 px-3.5 text-right">Đơn Giá</th>
                    <th className="py-3 px-3.5 text-right">Thành Tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-sm">
                  {/* Hạng mục 1: Tiền Nông Sản */}
                  <tr>
                    <td className="py-3.5 px-3.5">
                      <strong className="text-[#10542C] text-sm sm:text-base block">
                        {contract.productName}
                      </strong>
                      <span className="font-mono text-xs text-slate-500">
                        Mã lô vụ mùa: {contract.lotCode || 'LOT-2026-DL-001'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-mono font-bold text-slate-800 text-sm">
                      {(contract.quantityKg ?? 0).toLocaleString('vi-VN')} kg
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-mono font-bold text-[#10542C] text-sm">
                      {formatVnd(contract.unitPrice)}/kg
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-mono font-bold text-[#10542C] text-sm sm:text-base">
                      {formatVnd(goodsAmount)}
                    </td>
                  </tr>

                  {/* Hạng mục 2: Cước Vận Chuyển Chuỗi Lạnh & Lưu Trạm HoNa QC */}
                  <tr className="bg-sky-50/40">
                    <td className="py-3 px-3.5">
                      <strong className="text-sky-950 text-xs sm:text-sm block flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-sky-700 shrink-0" />
                        <span>Logistics Chuỗi Lạnh HoNa ({getShippingMethodLabel(contract.shippingOption).title.split(':')[0] || 'PA2'})</span>
                      </strong>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        {getShippingMethodLabel(contract.shippingOption).title}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-700 text-xs sm:text-sm">
                      {isSelfPickup ? 'Tự vận chuyển' : `${(contract.quantityKg ?? 0).toLocaleString('vi-VN')} kg`}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-700 text-xs sm:text-sm">
                      {shippingFee <= 0 ? '0 đ' : `~${Math.round(shippingFee / (contract.quantityKg || 1)).toLocaleString('vi-VN')} đ/kg`}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-sky-900 text-sm">
                      {formatVnd(shippingFee)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-[#FAFBF9] border-t border-gray-200 font-semibold text-xs sm:text-sm">
                  <tr>
                    <td colSpan={3} className="py-2 px-3.5 text-right text-slate-600">
                      Tiền hàng nông sản:
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-800 text-sm">
                      {formatVnd(goodsAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-3.5 text-right text-sky-900">
                      Cước vận chuyển chuỗi lạnh & trạm QC:
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-bold text-sky-800 text-sm">
                      {formatVnd(shippingFee)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/70 border-t border-emerald-200">
                    <td colSpan={3} className="py-2.5 px-3.5 text-right text-slate-900 font-bold">
                      Tổng Giá Trị Hợp Đồng Thanh Toán (Đã gồm vận chuyển):
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-black text-base sm:text-lg text-[#10542C]">
                      {formatVnd(grandTotal)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-3.5 text-right text-emerald-800">
                      Tiền Cọc Bảo Chứng (Escrow {isSelfPickup ? '100%' : '30%'}):
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-bold text-emerald-700 text-sm sm:text-base">
                      {formatVnd(calculatedDeposit)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-3.5 text-right text-slate-600">
                      Còn Lại Thanh Toán Sau Khi Nghiệm Thu Đạt QC:
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-800 text-sm sm:text-base">
                      {formatVnd(remainingAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Điều 2 - Điều 8 theo mẫu Hợp đồng mua bán hàng hóa */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-4 leading-relaxed text-xs sm:text-sm text-slate-700">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <Truck className="w-4 h-4 text-[#10542C]" />
              <span className="font-bold text-slate-800 uppercase tracking-wide text-xs sm:text-sm">
                CÁC ĐIỀU KHOẢN THỎA THUẬN (ĐIỀU 2 – ĐIỀU 8)
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-900">Điều 2: THANH TOÁN</h4>
              <p>
                1. Bên B phải thanh toán cọc {isSelfPickup ? '100%' : '30%'} bảo chứng Escrow (
                <strong>{formatVnd(calculatedDeposit)}</strong>) ngay khi ký kết hợp đồng và thanh toán phần còn lại (
                <strong>{formatVnd(remainingAmount)}</strong>) sau khi kiểm đếm, ký nhận Biên bản giao nhận điện tử (ePOD) tại kho Bên B.
              </p>
              <p>
                2. Bên B thanh toán qua cổng VietQR / Chuyển khoản ngân hàng vào tài khoản ký quỹ bảo chứng của Sàn HoNa Fresh.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-900">Điều 3: THỜI GIAN, ĐỊA ĐIỂM VÀ PHƯƠNG THỨC GIAO HÀNG</h4>
              <p>
                1. Địa điểm giao hàng: <strong>{deliveryAddressStr}</strong> ({cleanText(contract.deliveryTimeSlot) || 'Theo lịch điều phối sàn'}).
              </p>
              <p>
                2. Phương tiện vận chuyển và chi phí vận chuyển: <strong>{getShippingMethodLabel(contract.shippingOption).title}</strong>.
              </p>
              <p>
                3. Quy định lịch giao nhận hàng hóa: Nếu Bên B không đến nhận hàng đúng lịch thì phải chịu chi phí lưu kho lạnh; nếu Bên A không có hàng giao đúng cam kết thì phải chịu bồi hoàn theo quy định của Sàn.
              </p>
              <p>
                4. Khi nhận hàng, Bên B có trách nhiệm kiểm nhận phẩm chất, quy cách hàng hóa tại chỗ và lập Biên bản giao nhận ePOD. Nếu phát hiện hàng thiếu hoặc không đúng tiêu chuẩn chất lượng thì ghi nhận ngay trên ePOD để đối soát.
              </p>
              <p>
                5. Trường hợp giao nhận hàng theo nguyên đai, nguyên kiện, nếu phát hiện vi phạm chất lượng khi kiểm định KCS tại trạm trung chuyển, Bên A chịu trách nhiệm xử lý hoàn hàng hoặc bù hàng theo quy trình QC của HoNa Fresh.
              </p>
              <p>
                6. Mỗi lô hàng khi giao nhận phải có xác nhận chất lượng bằng Biên bản kiểm định QA/QC và Phiếu xuất kho / Hợp đồng vận chuyển kèm theo.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-900">Điều 4: TRÁCH NHIỆM CỦA CÁC BÊN</h4>
              <p>
                1. Bên bán chịu trách nhiệm đảm bảo chất lượng nông sản đúng tiêu chuẩn VietGAP và sản lượng đã cam kết; không chịu trách nhiệm về khiếm khuyết mà Bên mua đã biết tại thời điểm giao kết.
              </p>
              <p>
                2. Trong thời hạn khiếu nại theo quy định của Luật Thương mại 2005, Bên bán chịu trách nhiệm về khiếm khuyết của hàng hóa phát sinh trước thời điểm chuyển rủi ro.
              </p>
              <p>
                3. Bên mua có trách nhiệm thanh toán đầy đủ và nhận hàng theo đúng thời gian đã thỏa thuận.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-900">Điều 5: BẢO HÀNH VÀ HƯỚNG DẪN BẢO QUẢN HÀNG HÓA</h4>
              <p>
                1. Bên A chịu trách nhiệm đảm bảo độ tươi, chỉ số an toàn thực phẩm (Brix, Nitrate, thuốc BVTV âm tính) của lô hàng{' '}
                <strong>{contract.productName}</strong> trong suốt thời gian lưu kho lạnh tiêu chuẩn (FEFO).
              </p>
              <p>
                2. Quy cách đóng gói & bảo quản: <strong>{cleanText(contract.packageType) || 'Thùng xốp niêm phong giữ nhiệt 2°C - 6°C'}</strong>.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-900">Điều 6: ĐIỀU KHOẢN PHẠT VI PHẠM HỢP ĐỒNG</h4>
              <p>
                Hai bên cam kết thực hiện nghiêm túc các điều khoản đã thỏa thuận trên, không được đơn phương thay đổi hoặc hủy bỏ hợp đồng. Bên nào vi phạm hoặc đơn phương đình chỉ hợp đồng không có lý do chính đáng sẽ chịu phạt <strong>8%</strong> giá trị phần hợp đồng bị vi phạm theo Luật Thương mại.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-900">Điều 7: BẤT KHẢ KHÁNG VÀ GIẢI QUYẾT TRANH CHẤP</h4>
              <p>
                1. Bất khả kháng là các sự kiện khách quan không thể lường trước (thiên tai, bão lụt, hỏa hoạn, chiến tranh, phong tỏa giao thông). Khi xảy ra bất khả kháng, bên gặp phải phải thông báo ngay cho bên kia để phối hợp giảm thiểu thiệt hại.
              </p>
              <p>
                2. Mọi tranh chấp phát sinh ưu tiên giải quyết thông qua thương lượng và hòa giải trên Sàn HoNa Fresh; trường hợp không tự giải quyết được sẽ đưa ra Tòa án có thẩm quyền giải quyết.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-900">Điều 8: ĐIỀU KHOẢN CHUNG</h4>
              <p>
                1. Hợp đồng này có hiệu lực từ ngày ký và tự động thanh lý kể từ khi Bên B đã nhận đủ hàng (ký ePOD) và Bên A đã nhận đủ tiền quyết toán.
              </p>
              <p>
                2. Hợp đồng này thay thế mọi thỏa thuận trước đây giữa hai bên; mọi sửa đổi phải lập thành văn bản Phụ lục hợp đồng.
              </p>
              <p>
                3. Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau (lưu trữ bản điện tử trên hệ thống HoNa Fresh), mỗi bên giữ 01 bản.
              </p>
            </div>
          </div>

          {/* Kết quả nghiệm thu thu hoạch rẫy từ Nhà Vườn (nếu đã qua mốc 2 thu hoạch) */}
          {Boolean(contract.actualHarvestWeightKg || contract.packageCount || contract.isHarvestDone || contract.status === 'HARVESTED' || contract.status === 'PACKAGING_APPROVED') && (
            <div className="bg-emerald-50/70 border border-emerald-300 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2 flex-wrap gap-2">
                <span className="font-heading font-black text-xs uppercase tracking-wider text-[#10542C] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#10542C]" /> Kết Quả Thu Hoạch & Đóng Kiện Rẫy (Nhà Vườn Đã Gửi)
                </span>
                <div className="flex items-center gap-2">
                  {Boolean(contract.packagingApproved || contract.packaging_approved || contract.status === 'PACKAGING_APPROVED') ? (
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                      Đã duyệt đóng gói
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-700" />
                      Chờ Admin duyệt
                    </span>
                  )}
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                    Tỷ lệ loại 1: {contract.grade1Ratio || 96}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Sản lượng thực thu</span>
                  <p className="text-base font-black text-[#10542C] font-mono mt-0.5">
                    {(contract.actualHarvestWeightKg || contract.quantityKg || 0).toLocaleString('vi-VN')} kg
                  </p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Số kiện đã đóng</span>
                  <p className="text-base font-black text-gray-900 font-mono mt-0.5">
                    {contract.packageCount || 10} thùng
                  </p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Quy cách kiện</span>
                  <p className="text-xs font-bold text-gray-800 mt-1 leading-snug break-words">
                    {contract.packageType || 'Thùng xốp 15kg (Dán tem niêm phong)'}
                  </p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Mã tem QR PUC</span>
                  <p className="text-[10px] font-mono font-bold text-emerald-800 mt-1 break-all">
                    {contract.qrCodeData || `HONAFRESH-PUC-${contract.contractCode}`}
                  </p>
                </div>
              </div>

              {/* Chi tiết điểm đón xe */}
              {(() => {
                const pickup = parsePickupDetails(contract.farmPickupAddress || contract.farmerAddress || contract.farmerCompany);
                return (
                  <div className="pt-2 border-t border-emerald-200/60 space-y-2 text-xs">
                    <span className="text-[11px] font-bold text-[#10542C] uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" /> Điểm Đón Xe Tải Lạnh Tại Rẫy
                    </span>
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-1.5 text-gray-700">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 font-semibold text-[11px] sm:w-28 shrink-0">Điểm đón / Vườn:</span>
                        <span className="font-bold text-gray-900 leading-snug">{pickup.farmLocation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-semibold text-[11px] sm:w-28 shrink-0">SĐT người đón:</span>
                        <span className="font-mono font-bold text-[#10542C] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {pickup.contactPhone}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 font-semibold text-[11px] sm:w-28 shrink-0">Hạ tầng đường vào:</span>
                        <span className="font-medium text-gray-800 leading-snug">{pickup.roadAccess}</span>
                      </div>
                      {Boolean(contract.harvestNotes) && (
                        <p className="text-[11px] text-amber-800 italic pt-1 border-t border-gray-100">
                          Ghi chú: "{contract.harvestNotes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Dấu Mộc Xác Thực Pháp Lý 3 Bên */}
          <div className="pt-4 border-t border-gray-200 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="space-y-1">
              <span className="font-bold text-slate-700 uppercase text-xs block">
                ĐẠI DIỆN BÊN BÁN (BÊN A)
              </span>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16 flex items-center justify-center">
                <span className="font-heading font-black text-emerald-800 text-xs">
                  {contract.farmerName || 'HTX HoNa Fresh'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-700 uppercase text-[10px] block">
                BẢO CHỨNG SÀN HONA FRESH
              </span>
              <p className="text-[10px] text-slate-400 italic">(Dấu mộc điện tử)</p>
              <div className="h-16 flex items-center justify-center">
                <div className="border-2 border-emerald-600 rounded-full w-14 h-14 flex items-center justify-center text-emerald-700 font-black text-[9px] uppercase leading-tight rotate-[-12deg] shadow-2xs">
                  HONA ESCROW
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-700 uppercase text-[10px] block">
                ĐẠI DIỆN BÊN MUA (BÊN B)
              </span>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16 flex items-center justify-center">
                <span className="font-heading font-black text-sky-800 text-xs">
                  {contract.buyerName || 'Lê Chung'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Văn bản có giá trị pháp lý trong chuỗi cung ứng nông sản B2B
          </span>

          <div className="flex items-center gap-2">
            {role === 'ADMIN' && onAdminDispatchPickup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAdminDispatchPickup(contract);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                title="Mở bảng điều phối xe tải lạnh đến rẫy lấy hàng"
              >
                <Truck className="w-4 h-4 text-white" />
                <span>Điều Phối Xe Lấy Hàng</span>
              </button>
            )}

            {role === 'BUYER' && !isDepositPaid && onBuyerPayDeposit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBuyerPayDeposit(contract);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              >
                <LockKeyhole className="w-4 h-4 text-white" />
                <span>Nộp Cọc 30% Escrow</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Văn Bản Hợp Đồng</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
