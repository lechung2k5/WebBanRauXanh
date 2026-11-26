/**
 * Tiện ích tính toán dự toán chi phí vận chuyển & điều phối chuỗi lạnh B2B HoNa Fresh
 * Dựa trên: Khối lượng (kg), Khoảng cách (km), Nhiệt độ chuỗi lạnh (°C) và Phương án vận hành.
 */

export type ShippingMethodCode = 'DIRECT_FARM_TO_BUYER' | 'CROSS_DOCKING_HUB' | 'BUYER_SELF_TRANSPORT';

export interface ShippingBreakdownItem {
  label: string;
  amount: number;
}

export interface ShippingMethodOption {
  code: ShippingMethodCode;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  estimatedFee: number;
  ratePerKg: number;
  distanceKm: number;
  breakdown: ShippingBreakdownItem[];
  suitability: string;
  isRecommended?: boolean;
  requiresFullPayment?: boolean;
  riskPolicy?: string;
}

export interface LogisticsCalculationParams {
  weightKg: number;
  distanceKm?: number;
  minTemp?: number;
  maxTemp?: number;
}

export function calculateLogisticsEstimates(
  params: LogisticsCalculationParams
): Record<ShippingMethodCode, ShippingMethodOption> {
  const weight = Math.max(100, Number(params.weightKg) || 1000);
  const distance = Math.max(10, Math.round(Number(params.distanceKm) || 300)); // Tuyến tiêu chuẩn mặc định ~300km hoặc km tính động theo Goong API
  const isDeepCold = (params.minTemp ?? 2) < 2 || (params.maxTemp ?? 6) < 4;
  const tempMultiplier = isDeepCold ? 1.12 : 1.0; // Phụ phí điện lạnh sâu +12%

  // 1. Phương án 1: Vận chuyển thẳng riêng chuyến từ Kho HoNa Fresh đến khách hàng
  // Quy trình: Xe nhỏ gom vườn về kho HoNa Fresh -> Kiểm định chất lượng QC & lưu buồng lạnh mát -> Điều riêng 1 xe tải lạnh HoNa Fresh chở thẳng hỏa tốc tới kho khách hàng (Dedicated Charter Trip)
  let minDirectCharterFee = 4500000;
  if (distance < 50) {
    minDirectCharterFee = 1800000;
  } else if (distance < 150) {
    minDirectCharterFee = 2800000;
  } else {
    minDirectCharterFee = 4500000 + Math.max(0, distance - 300) * 16000;
  }
  const directLineRatePerKg = Math.round((distance * 7.5 + 400) * tempMultiplier); // Đơn giá theo cự ly thực tế
  const directLoadingFee = Math.round(weight * 150); // Phí bốc xếp tại kho & dán tem niêm phong độc quyền
  const calculatedDirectFee = directLoadingFee + Math.round(weight * directLineRatePerKg);
  const directTotal = Math.max(minDirectCharterFee, calculatedDirectFee);

  // 2. Phương án 2: Qua kho HoNa Fresh kiểm định QC, xe lạnh chở thẳng đến tận tay khách hàng (Tiêu chuẩn ghép tuyến)
  // Quy trình: Xe nhỏ (1-2.5T) gom tại vườn về kho HoNa Fresh -> Kiểm định chất lượng QC & lưu buồng lạnh mát -> Xe lạnh HoNa Fresh chở thẳng từ kho tới tận tay khách hàng
  const leg1RatePerKg = 350; // Xe nhỏ gom từ vườn đồi dốc về kho huyện/tỉnh
  const coldRoomStorageRatePerKg = Math.round(200 * tempMultiplier); // Lưu kho buồng lạnh + kiểm định chất lượng QC
  // Cước chặng 2: Xe lạnh HoNa Fresh xuất kho giao tới kho nhận của Buyer, tính theo cự ly thực tế (km)
  const baseKmRate = distance <= 100 ? 3.0 : distance <= 400 ? 2.5 : 2.0; // đ/kg/km tùy cự ly ngắn/dài
  const leg2LineHaulRatePerKg = Math.max(200, Math.round((distance * baseKmRate + 100) * tempMultiplier));
  const hubLeg1Fee = Math.round(weight * leg1RatePerKg);
  const hubStorageFee = Math.round(weight * coldRoomStorageRatePerKg);
  const hubLeg2Fee = Math.round(weight * leg2LineHaulRatePerKg);
  const minHubFee = distance < 50 ? 200000 : 350000;
  const hubTotal = Math.max(minHubFee, hubLeg1Fee + hubStorageFee + hubLeg2Fee);

  // 3. Phương án 3: Khách hàng tự lấy tại Kho HoNa Fresh sau khi kiểm định QC
  // Quy trình: Xe nhỏ gom tại vườn về kho HoNa Fresh -> Kiểm định chất lượng QC & lưu buồng lạnh mát -> Khách hàng tự điều xe tải lạnh đến Kho HoNa Fresh bốc hàng
  // Vẫn tính chi phí Chặng 1 (gom từ vườn về kho) + Phí lưu kho lạnh & QC, nhưng miễn phí Chặng 2 (rẻ hơn PA2).
  const minSelfPickupFee = distance < 50 ? 80000 : 120000;
  const selfPickupTotal = Math.max(minSelfPickupFee, hubLeg1Fee + hubStorageFee);

  return {
    DIRECT_FARM_TO_BUYER: {
      code: 'DIRECT_FARM_TO_BUYER',
      title: 'Phương án 1: Giao hỏa tốc bao xe từ Kho HoNa (Sau kiểm định QC)',
      badge: 'Giao riêng từ kho (Bao trọn xe)',
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
      description:
        `Gom về kho HoNa kiểm định QC ➔ Điều riêng xe lạnh HoNa Fresh chở thẳng hỏa tốc tới kho khách hàng (~${distance} km).`,
      estimatedFee: directTotal,
      ratePerKg: Math.round(directTotal / weight),
      distanceKm: distance,
      breakdown: [
        { label: 'Gom tận vườn về kho HoNa & Kiểm định chất lượng QC', amount: Math.round(weight * 350) },
        { label: `Bao trọn xe lạnh chuyên tuyến từ kho HoNa (~${distance} km)`, amount: Math.max(minDirectCharterFee, Math.round(weight * directLineRatePerKg)) },
        { label: 'Phí bốc xếp tại kho & dán tem niêm phong độc quyền', amount: directLoadingFee },
      ],
      suitability: 'Phù hợp khi cần giao khẩn cấp trong ngày sau kiểm định QC hoặc đơn hàng số lượng rất lớn bao trọn xe.',
      isRecommended: false,
      requiresFullPayment: false,
    },
    CROSS_DOCKING_HUB: {
      code: 'CROSS_DOCKING_HUB',
      title: 'Phương án 2: Giao tiêu chuẩn từ Kho HoNa (Sau kiểm định QC)',
      badge: '⭐ Kiểm định QC & Tiết kiệm',
      badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-400 font-bold',
      description:
        `Gom về kho HoNa kiểm định QC ➔ Xe lạnh HoNa Fresh chở thẳng từ kho tới tận tay khách hàng (~${distance} km). Tiết kiệm chi phí.`,
      estimatedFee: hubTotal,
      ratePerKg: Math.round(hubTotal / weight),
      distanceKm: distance,
      breakdown: [
        { label: 'Chặng 1: Xe nhỏ thu gom tận vườn về kho HoNa Fresh', amount: hubLeg1Fee },
        { label: 'Phí lưu buồng lạnh kho & kiểm định chất lượng QC đạt chuẩn', amount: hubStorageFee },
        { label: `Chặng 2: Xe lạnh HoNa Fresh chở thẳng từ kho tới tận tay khách hàng (~${distance} km)`, amount: hubLeg2Fee },
      ],
      suitability:
        'Tối ưu chi phí nhất cho mọi quy mô đơn hàng (từ vài tạ đến hàng chục tấn). Chất lượng được kiểm soát an toàn qua buồng lạnh kho.',
      isRecommended: true,
      requiresFullPayment: false,
    },
    BUYER_SELF_TRANSPORT: {
      code: 'BUYER_SELF_TRANSPORT',
      title: 'Phương án 3: Khách tự lấy tại Kho HoNa Fresh (Sau kiểm định QC)',
      badge: 'Lấy tại kho HoNa (Thanh toán 100%)',
      badgeColor: 'bg-rose-50 text-rose-900 border-rose-300',
      description:
        'Nông sản được gom về Kho HoNa kiểm định QC đạt chuẩn ➔ Khách hàng tự điều xe tải lạnh đến Kho HoNa nhận hàng. Bắt buộc thanh toán 100% trước khi xuất kho.',
      estimatedFee: selfPickupTotal,
      ratePerKg: Math.round(selfPickupTotal / weight),
      distanceKm: distance,
      breakdown: [
        { label: 'Chặng 1: Xe nhỏ thu gom tận vườn về kho HoNa Fresh', amount: hubLeg1Fee },
        { label: 'Phí lưu buồng lạnh kho & kiểm định chất lượng QC tại kho', amount: hubStorageFee },
        { label: 'Chặng 2: Cước giao tận nơi (Khách tự điều xe đến Kho HoNa lấy)', amount: 0 },
      ],
      suitability:
        'Dành cho khách hàng có sẵn xe tải lạnh, muốn tự đến Kho HoNa Fresh nghiệm thu kết quả kiểm định QC và bốc hàng.',
      isRecommended: false,
      requiresFullPayment: true,
      riskPolicy:
        'Khách hàng kiểm tra và ký nhận biên bản đạt chuẩn QC tại Kho HoNa Fresh. Sau khi xe lăn bánh rời khỏi cổng Kho HoNa Fresh, khách hàng tự chịu 100% trách nhiệm về bảo quản nhiệt độ, chất lượng và hao hụt trên đường vận chuyển.',
    },
  };
}

/**
 * Mạng lưới Trạm Lạnh & Buồng Lạnh HoNa Fresh phủ khắp các thủ phủ nông sản cả nước
 */
export interface ColdHubInfo {
  id: string;
  name: string;
  region: 'Tây Nguyên' | 'ĐBSCL' | 'Đông Nam Bộ' | 'Duyên Hải & Miền Trung' | 'Miền Bắc';
  province: string;
  address: string;
  lat: number;
  lng: number;
  tempRange: string;
  capacityTon: number;
  smallTruckFleets: string;
}

export const COLD_STORAGE_HUBS_NATIONWIDE: ColdHubInfo[] = [
  // 1. Tây Nguyên
  {
    id: 'HUB-TN-01',
    name: 'Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng - Buồng Lạnh A1',
    region: 'Tây Nguyên',
    province: 'Lâm Đồng',
    address: 'Km 215 Quốc lộ 20, TT. Liên Nghĩa, H. Đức Trọng, Lâm Đồng',
    lat: 11.7335,
    lng: 108.3752,
    tempRange: '0°C - 4°C',
    capacityTon: 450,
    smallTruckFleets: 'Đội 12 xe nhỏ 1.5T gom rau củ cụm Đức Trọng, Đà Lạt, Đơn Dương',
  },
  {
    id: 'HUB-TN-02',
    name: 'Trạm Lạnh Đơn Dương - Ka Đô, Lâm Đồng - Buồng Lạnh B1',
    region: 'Tây Nguyên',
    province: 'Lâm Đồng',
    address: 'Đường 2/4, Xã Ka Đô, H. Đơn Dương, Lâm Đồng (Thủ phủ rau ăn lá)',
    lat: 11.8386,
    lng: 108.5714,
    tempRange: '2°C - 5°C',
    capacityTon: 350,
    smallTruckFleets: 'Đội 8 xe nhỏ gom trực tiếp các nhà kính, trang trại VietGAP',
  },
  {
    id: 'HUB-TN-03',
    name: 'Trạm Lạnh Nông Sản Buôn Hồ, Đắk Lắk - Buồng Lạnh C1',
    region: 'Tây Nguyên',
    province: 'Đắk Lắk',
    address: 'Quốc lộ 14, P. An Lạc, TX. Buôn Hồ, Đắk Lắk',
    lat: 12.9248,
    lng: 108.2612,
    tempRange: '4°C - 8°C',
    capacityTon: 600,
    smallTruckFleets: 'Đội xe gom sầu riêng, bơ, mít, chanh dây các nông hộ Krông Pắc, Buôn Hồ',
  },
  {
    id: 'HUB-TN-04',
    name: 'Trạm Lạnh Chư Sê - Pleiku, Gia Lai - Buồng Lạnh D1',
    region: 'Tây Nguyên',
    province: 'Gia Lai',
    address: 'Thị trấn Chư Sê, Huyện Chư Sê, Gia Lai',
    lat: 13.7381,
    lng: 108.0531,
    tempRange: '4°C - 8°C',
    capacityTon: 400,
    smallTruckFleets: 'Đội xe nhỏ gom củ quả, chuối tiêu hồng, chanh dây Tây Nguyên',
  },

  // 2. Đồng bằng Sông Cửu Long (Miền Tây)
  {
    id: 'HUB-MT-01',
    name: 'Trạm Lạnh Nông Sản Cái Bè - Cai Lậy, Tiền Giang - Buồng Lạnh TB1',
    region: 'ĐBSCL',
    province: 'Tiền Giang',
    address: 'Quốc lộ 1A, Xã Hòa Khánh, H. Cái Bè, Tiền Giang',
    lat: 10.3394,
    lng: 105.9961,
    tempRange: '2°C - 8°C',
    capacityTon: 500,
    smallTruckFleets: 'Đội xe thu gom trái cây xoài Cát Hòa Lộc, sầu riêng, thanh long',
  },
  {
    id: 'HUB-MT-02',
    name: 'Trạm Lạnh Nông Sản Thốt Nốt, Cần Thơ - Buồng Lạnh CT1',
    region: 'ĐBSCL',
    province: 'Cần Thơ',
    address: 'Khu công nghiệp Thốt Nốt, P. Thới Thuận, Q. Thốt Nốt, TP. Cần Thơ',
    lat: 10.1557,
    lng: 105.5292,
    tempRange: '0°C - 6°C',
    capacityTon: 550,
    smallTruckFleets: 'Đội xe gom rau màu, nấm rơm, bắp ngọt, nông sản Sông Hậu',
  },
  {
    id: 'HUB-MT-03',
    name: 'Trạm Lạnh Lấp Vò - Sa Đéc, Đồng Tháp - Buồng Lạnh DT1',
    region: 'ĐBSCL',
    province: 'Đồng Tháp',
    address: 'Đường ĐT 848, Xã Tân Khánh Trung, H. Lấp Vò, Đồng Tháp',
    lat: 10.3297,
    lng: 105.5186,
    tempRange: '2°C - 7°C',
    capacityTon: 400,
    smallTruckFleets: 'Đội xe nhỏ gom khoai môn, củ sen, rau màu Đồng Tháp Mười',
  },
  {
    id: 'HUB-MT-04',
    name: 'Trạm Lạnh Bến Tre - Châu Thành, Bến Tre - Buồng Lạnh BT1',
    region: 'ĐBSCL',
    province: 'Bến Tre',
    address: 'Quốc lộ 60, Xã Hữu Định, Huyện Châu Thành, Bến Tre',
    lat: 10.2743,
    lng: 106.3762,
    tempRange: '4°C - 10°C',
    capacityTon: 350,
    smallTruckFleets: 'Đội xe gom bưởi da xanh, dừa xiêm, chôm chôm Chợ Lách',
  },

  // 3. Đông Nam Bộ & Trung Tâm Tiêu Thụ
  {
    id: 'HUB-DNB-01',
    name: 'Tổng Kho Lạnh Cross-docking Củ Chi, TP.HCM - Hub Trung Tâm',
    region: 'Đông Nam Bộ',
    province: 'TP.HCM',
    address: 'Khu công nghiệp Tân Phú Trung, Quốc lộ 22, Củ Chi, TP.HCM',
    lat: 10.9744,
    lng: 106.4938,
    tempRange: '-2°C - 5°C',
    capacityTon: 1500,
    smallTruckFleets: 'Tổng kho tiếp nhận xe lạnh lớn 20T liên tỉnh và phân phối khắp TP.HCM & Đông Nam Bộ',
  },
  {
    id: 'HUB-DNB-02',
    name: 'Trạm Lạnh Long Khánh, Đồng Nai - Buồng Lạnh DN1',
    region: 'Đông Nam Bộ',
    province: 'Đồng Nai',
    address: 'Đường Hùng Vương, P. Xuân Trung, TP. Long Khánh, Đồng Nai',
    lat: 10.9388,
    lng: 107.2407,
    tempRange: '2°C - 8°C',
    capacityTon: 450,
    smallTruckFleets: 'Đội xe gom sầu riêng Long Khánh, măng cụt, chôm chôm',
  },

  // 4. Duyên Hải & Miền Trung
  {
    id: 'HUB-MT-CENTRAL-01',
    name: 'Trạm Lạnh Hòa Vang, Đà Nẵng - Buồng Lạnh ĐN1',
    region: 'Duyên Hải & Miền Trung',
    province: 'Đà Nẵng',
    address: 'Quốc lộ 14B, Xã Hòa Nhơn, H. Hòa Vang, TP. Đà Nẵng',
    lat: 15.9868,
    lng: 108.1524,
    tempRange: '0°C - 5°C',
    capacityTon: 700,
    smallTruckFleets: 'Kho trung chuyển Bắc - Nam và phân phối miền Trung',
  },
  {
    id: 'HUB-MT-CENTRAL-02',
    name: 'Trạm Lạnh Cam Ranh, Khánh Hòa - Buồng Lạnh KH1',
    region: 'Duyên Hải & Miền Trung',
    province: 'Khánh Hòa',
    address: 'Quốc lộ 1A, Phường Cam Phú, TP. Cam Ranh, Khánh Hòa',
    lat: 11.9214,
    lng: 109.1591,
    tempRange: '4°C - 8°C',
    capacityTon: 350,
    smallTruckFleets: 'Đội xe gom xoài Úc Cam Lâm, tỏi Cam Ranh, mãng cầu',
  },
  {
    id: 'HUB-MT-CENTRAL-03',
    name: 'Trạm Lạnh Chợ Lầu - Bắc Bình, Bình Thuận - Buồng Lạnh BT1',
    region: 'Duyên Hải & Miền Trung',
    province: 'Bình Thuận',
    address: 'Quốc lộ 1A, Thị trấn Chợ Lầu, H. Bắc Bình, Bình Thuận',
    lat: 11.2333,
    lng: 108.5333,
    tempRange: '2°C - 6°C',
    capacityTon: 500,
    smallTruckFleets: 'Đội xe gom thanh long ruột đỏ, dưa lưới Bắc Bình',
  },

  // 5. Miền Bắc & Tây Bắc
  {
    id: 'HUB-MB-01',
    name: 'Trạm Lạnh Cross-docking Mộc Châu, Sơn La - Buồng Lạnh MC1',
    region: 'Miền Bắc',
    province: 'Sơn La',
    address: 'Tiểu khu Cờ Đỏ, TT. Nông Trường Mộc Châu, Sơn La',
    lat: 20.8443,
    lng: 104.6465,
    tempRange: '0°C - 4°C',
    capacityTon: 600,
    smallTruckFleets: 'Đội xe nhỏ gom bắp cải, su su, dâu tây, cải xoăn Mộc Châu',
  },
  {
    id: 'HUB-MB-02',
    name: 'Trạm Lạnh Nông Sản Lục Ngạn, Bắc Giang - Buồng Lạnh BG1',
    region: 'Miền Bắc',
    province: 'Bắc Giang',
    address: 'Quốc lộ 31, Xã Hồng Giang, Huyện Lục Ngạn, Bắc Giang',
    lat: 21.3653,
    lng: 106.5786,
    tempRange: '1°C - 5°C',
    capacityTon: 800,
    smallTruckFleets: 'Đội xe gom vải thiều Lục Ngạn, cam đường canh, bưởi ngọt',
  },
  {
    id: 'HUB-MB-03',
    name: 'Trạm Lạnh Sa Pa, Lào Cai - Buồng Lạnh SP1',
    region: 'Miền Bắc',
    province: 'Lào Cai',
    address: 'Phường Ô Quý Hồ, Thị xã Sa Pa, Lào Cai',
    lat: 22.3364,
    lng: 103.8438,
    tempRange: '0°C - 4°C',
    capacityTon: 300,
    smallTruckFleets: 'Đội xe gom rau mầm đá, su su, nấm hương đặc sản xứ tuyết',
  },
  {
    id: 'HUB-MB-04',
    name: 'Tổng Kho Lạnh Phân Phối Mê Linh, Hà Nội - Hub Miền Bắc',
    region: 'Miền Bắc',
    province: 'Hà Nội',
    address: 'Khu công nghiệp Quang Minh, Huyện Mê Linh, Hà Nội',
    lat: 21.1963,
    lng: 105.7483,
    tempRange: '-2°C - 5°C',
    capacityTon: 1800,
    smallTruckFleets: 'Tổng kho tiếp nhận xe lạnh lớn liên tỉnh và phân phối khắp Hà Nội & Đồng Bằng Sông Hồng',
  },
];

// Danh sách trạm phổ biến dạng chuỗi tương thích ngược
export const POPULAR_COLD_HUBS = COLD_STORAGE_HUBS_NATIONWIDE.map((h) => `${h.name} (${h.tempRange})`);

/**
 * Tra cứu thông tin Kho / Trạm buồng lạnh HoNa Fresh phụ trách kiểm định lô hàng
 */
export function findColdHubInfo(hubNameOrLocation?: string): ColdHubInfo {
  if (!hubNameOrLocation) return COLD_STORAGE_HUBS_NATIONWIDE[0];
  const q = hubNameOrLocation.toLowerCase().trim();
  const found = COLD_STORAGE_HUBS_NATIONWIDE.find((h) => {
    return (
      q.includes(h.id.toLowerCase()) ||
      q.includes(h.name.toLowerCase()) ||
      q.includes(h.province.toLowerCase()) ||
      h.name.toLowerCase().includes(q) ||
      h.address.toLowerCase().includes(q)
    );
  });
  return found || COLD_STORAGE_HUBS_NATIONWIDE[0];
}

/**
 * Tính cự ly đường bộ ước lượng (km) giữa 2 tọa độ theo công thức Haversine có hệ số uốn lượn đường sá VN (1.35x)
 */
export function calculateHaversineDistanceKm(
  c1: { lat: number; lng: number },
  c2: { lat: number; lng: number }
): number {
  if (!c1?.lat || !c1?.lng || !c2?.lat || !c2?.lng) return 300;
  const R = 6371; // Earth radius in km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const roadWindingFactor = 1.35; // Hệ số uốn lượn đường bộ Việt Nam
  return Math.max(10, Math.round(R * c * roadWindingFactor));
}

export function getShippingMethodLabel(method?: ShippingMethodCode | string): {
  title: string;
  badge: string;
  badgeClass: string;
} {
  const m = String(method || '').toUpperCase();
  if (
    m === 'DIRECT_FARM_TO_BUYER' ||
    m === 'COLD_STORAGE_TRUCK' ||
    m.includes('DIRECT') ||
    m.includes('COLD_STORAGE') ||
    m.includes('TRUCK')
  ) {
    return {
      title: 'PA1: Giao hỏa tốc bao xe từ Kho HoNa (Sau kiểm định QC)',
      badge: 'PA1: Giao riêng từ kho HoNa',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    };
  }
  if (
    m === 'BUYER_SELF_TRANSPORT' ||
    m === 'FARM_PICKUP' ||
    m.includes('PICKUP') ||
    m.includes('SELF')
  ) {
    return {
      title: 'PA3: Khách tự lấy tại Kho HoNa (Sau kiểm định QC, thanh toán 100%)',
      badge: 'PA3: Lấy tại kho HoNa',
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
    };
  }
  // Mặc định: PA2 (CROSS_DOCKING_HUB, farm_delivery, v.v.)
  return {
    title: 'PA2: Giao tiêu chuẩn từ Kho HoNa (Sau kiểm định QC)',
    badge: 'PA2: Giao tiêu chuẩn từ kho HoNa',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold',
  };
}

export interface B2bContractFinancials {
  quantityKg: number;
  unitPrice: number;
  pureGoodsAmount: number;
  shippingFee: number;
  shippingOption: string;
  shippingMethodLabel: string;
  isSelfPickup: boolean;
  grandTotal: number;
  depositAmount: number;
  remainingAmount: number;
}

/**
 * Single Source of Truth cho toàn bộ tính toán tài chính Hợp đồng B2B
 * Đảm bảo 100% khớp giá trị tiền nông sản, cước xe lạnh, cọc 30%, và quyết toán 70% giữa Admin, Buyer và Farmer.
 */
export function calculateB2bContractFinancials(contract: any): B2bContractFinancials {
  if (!contract) {
    return {
      quantityKg: 0,
      unitPrice: 0,
      pureGoodsAmount: 0,
      shippingFee: 0,
      shippingOption: 'CROSS_DOCKING_HUB',
      shippingMethodLabel: 'PA2: Xe lạnh HoNa Fresh giao tiêu chuẩn qua kho',
      isSelfPickup: false,
      grandTotal: 0,
      depositAmount: 0,
      remainingAmount: 0,
    };
  }

  const quantityKg = Number(
    contract.quantityKg ||
    contract.offered_weight_kg ||
    contract.actual_harvest_weight_kg ||
    contract.quantity ||
    0
  );

  const unitPrice = Number(
    contract.unitPrice ||
    contract.offered_price_per_kg ||
    contract.agreedPricePerKg ||
    contract.price_per_kg ||
    0
  );

  // 1. Tiền nông sản thuần (Chưa tính cước VC)
  const pureGoodsAmount = (quantityKg > 0 && unitPrice > 0)
    ? (quantityKg * unitPrice)
    : Number(contract.goodsAmount || contract.goods_amount || contract.total_goods_amount || 0);

  // 2. Xác định phương thức vận chuyển
  const rawOpt = String(
    contract.shippingOption ||
    contract.shipping_option ||
    ''
  ).trim().toUpperCase();

  const isSelfPickup =
    rawOpt === 'PA3' ||
    rawOpt === 'FARM_PICKUP' ||
    rawOpt === 'BUYER_SELF_TRANSPORT' ||
    rawOpt.includes('PICKUP') ||
    rawOpt.includes('SELF') ||
    rawOpt.includes('TỰ VẬN CHUYỂN') ||
    rawOpt.includes('TỰ CHỞ') ||
    rawOpt.includes('TỰ LẤY');

  // 3. Cước vận chuyển chuỗi lạnh HoNa Fresh
  let shippingFee = 0;
  if (Number(contract.shippingFee || contract.logistics_fee_amount) > 0) {
    shippingFee = Number(contract.shippingFee || contract.logistics_fee_amount);
  } else if (isSelfPickup) {
    // PA3: Gom từ vườn về kho HoNa + lưu kho lạnh & QC (rẻ hơn PA2 do miễn chặng 2)
    shippingFee = Math.max(120000, Math.round(quantityKg * 550));
  } else if (rawOpt.includes('DIRECT') || rawOpt === 'PA1') {
    shippingFee = Math.round(quantityKg * 1200 + 450000);
  } else {
    // Mặc định: Tuyến tiêu chuẩn qua Kho HoNa Fresh (PA2)
    shippingFee = Math.round(quantityKg * 850 + 250000);
  }

  // 4. Tổng giá trị thanh toán hợp đồng (Gồm cước VC)
  const grandTotal = pureGoodsAmount + shippingFee;

  // 5. Tiền cọc bảo chứng Escrow (Tự chở cọc 100%, Qua xe lạnh HoNa cọc 30%)
  const depositAmount = isSelfPickup ? grandTotal : Math.round(grandTotal * 0.3);

  // 6. Số tiền còn lại quyết toán sau khi ký nhận ePOD
  const remainingAmount = Math.max(0, grandTotal - depositAmount);

  const shippingOption = isSelfPickup
    ? 'BUYER_SELF_TRANSPORT'
    : (rawOpt.includes('DIRECT') || rawOpt === 'PA1')
    ? 'DIRECT_FARM_TO_BUYER'
    : 'CROSS_DOCKING_HUB';

  const shippingMethodLabel = isSelfPickup
    ? 'PA3: Khách tự lấy tại Kho HoNa (Gom vườn & lưu kho lạnh)'
    : (rawOpt.includes('DIRECT') || rawOpt === 'PA1')
    ? 'PA1: Xe lạnh HoNa Fresh giao riêng hỏa tốc'
    : 'PA2: Xe lạnh HoNa Fresh giao tiêu chuẩn qua kho';

  return {
    quantityKg,
    unitPrice,
    pureGoodsAmount,
    shippingFee,
    shippingOption,
    shippingMethodLabel,
    isSelfPickup,
    grandTotal,
    depositAmount,
    remainingAmount,
  };
}
