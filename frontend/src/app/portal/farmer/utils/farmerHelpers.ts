// =====================================================================
// B2B FARMER PORTAL HELPERS & ADMINISTRATIVE DATA
// Hỗ trợ: Phân cấp địa giới hành chính, AI gợi ý dải nhiệt bảo quản lạnh,
// định dạng thời gian thực RFQ, và ràng buộc biểu mẫu hồ sơ vùng trồng.
// =====================================================================

export interface Ward {
  name: string;
  hamlets?: string[];
}

export interface District {
  name: string;
  wards: Ward[];
}

export interface Province {
  name: string;
  pucPrefix: string;
  districts: District[];
}

// 1. DỮ LIỆU ĐỊA GIỚI HÀNH CHÍNH VÙNG TRỒNG NÔNG SẢN VIỆT NAM
export const VIETNAM_ADMINISTRATIVE_DATA: Province[] = [
  {
    name: 'Tỉnh Lâm Đồng',
    pucPrefix: 'VN-LDO',
    districts: [
      {
        name: 'Thành phố Đà Lạt',
        wards: [
          { name: 'Phường 1', hamlets: ['Khu Hòa Bình', 'Đường Nguyễn Thị Minh Khai', 'Đường Phan Bội Châu'] },
          { name: 'Phường 3', hamlets: ['Đường Ba Tháng Tư', 'Đường Đống Đa', 'Tổ 1 An Bình'] },
          { name: 'Phường 7', hamlets: ['Thôn Đa Thành', 'Thôn Bạch Đằng', 'Khu Đất Mới'] },
          { name: 'Phường 8', hamlets: ['Tiểu khu 158', 'Thôn Phù Đổng Thiên Vương', 'Đường Mai Anh Đào', 'Khu Vườn Ươm'] },
          { name: 'Phường 9', hamlets: ['Thôn Hùng Vương', 'Đường Mê Linh', 'Thôn Trại Mát'] },
          { name: 'Phường 11', hamlets: ['Thôn Trại Mát', 'Thôn Nam Hồ', 'Khu Tự Tạo'] },
          { name: 'Phường 12', hamlets: ['Thôn Thái Phiên', 'Khu Làng Hoa Thái Phiên', 'Đường Ngô Gia Tự'] },
          { name: 'Xã Xuân Thọ', hamlets: ['Thôn Đa Lộc', 'Thôn Lạc Nghiệp', 'Thôn Túy Sơn'] },
          { name: 'Xã Xuân Trường', hamlets: ['Thôn Cầu Đất', 'Thôn Trường An', 'Thôn Trường Sơn'] },
          { name: 'Xã Tà Nung', hamlets: ['Thôn 1', 'Thôn 2', 'Thôn 3', 'Thôn 4'] },
          { name: 'Xã Trạm Hành', hamlets: ['Thôn Phát Chi', 'Thôn Trạm Hành 1', 'Thôn Trạm Hành 2'] },
        ],
      },
      {
        name: 'Huyện Đức Trọng',
        wards: [
          { name: 'Thị trấn Liên Nghĩa', hamlets: ['Khu phố 1', 'Khu phố 3', 'Khu phố 6', 'Đường Thống Nhất'] },
          { name: 'Xã Hiệp An', hamlets: ['Thôn K\'Long', 'Thôn Định An', 'Thôn Trung Hiệp'] },
          { name: 'Xã Hiệp Thạnh', hamlets: ['Thôn Quảng Hiệp', 'Thôn Bồng Lai', 'Thôn Phi Nôm'] },
          { name: 'Xã Liên Hiệp', hamlets: ['Thôn An Bình', 'Thôn Gần Reo', 'Thôn Hàng Hải'] },
          { name: 'Xã Phú Hội', hamlets: ['Thôn R\'Chai 1', 'Thôn R\'Chai 2', 'Thôn Phú Hòa'] },
          { name: 'Xã Ninh Gia', hamlets: ['Thôn Ninh Đại', 'Thôn Hiệp Hòa', 'Thôn Tân Lập'] },
        ],
      },
      {
        name: 'Huyện Đơn Dương',
        wards: [
          { name: 'Thị trấn Thạnh Mỹ', hamlets: ['Khu phố Thạnh Đức', 'Khu phố Nghĩa Đức', 'Khu phố Nghĩa Lập'] },
          { name: 'Thị trấn D\'Ran', hamlets: ['Khu phố Phú Thuận 1', 'Khu phố Lạc Thiện', 'Khu phố Quảng Lập'] },
          { name: 'Xã Lạc Xuân', hamlets: ['Thôn Lạc Xuân 1', 'Thôn Lạc Xuân 2', 'Thôn Diom'] },
          { name: 'Xã Lạc Lâm', hamlets: ['Thôn Lạc Lâm Tây', 'Thôn Lạc Lâm Đông', 'Thôn Yên Bình'] },
          { name: 'Xã Ka Đơn', hamlets: ['Thôn Ka Đơn', 'Thôn Próh', 'Thôn Krang Chơ'] },
          { name: 'Xã Tu Tra', hamlets: ['Thôn Bồng Lai', 'Thôn Lạc Sơn', 'Thôn Ma Đanh'] },
        ],
      },
      {
        name: 'Huyện Lạc Dương',
        wards: [
          { name: 'Thị trấn Lạc Dương', hamlets: ['Tổ dân phố B’Nơ C', 'Tổ dân phố Đăng Gia', 'Đường Langbiang'] },
          { name: 'Xã Lát', hamlets: ['Thôn Păng Tiêng', 'Thôn Đang Lăng', 'Thôn Đạ Nghịt'] },
          { name: 'Xã Đạ Sar', hamlets: ['Thôn 1', 'Thôn 2', 'Thôn 3', 'Thôn 4'] },
          { name: 'Xã Đạ Nhim', hamlets: ['Thôn Liêng Bông', 'Thôn Đa Chais'] },
        ],
      },
      {
        name: 'Thành phố Bảo Lộc',
        wards: [
          { name: 'Phường 1', hamlets: ['Đường Nguyễn Công Trứ', 'Đường Lê Thị Pha'] },
          { name: 'Phường 2', hamlets: ['Đường Phan Bội Châu', 'Đường Lý Thường Kiệt'] },
          { name: 'Phường B\'Lao', hamlets: ['Đường Trần Phú', 'Đường Huỳnh Thúc Kháng'] },
          { name: 'Xã Đam B\'ri', hamlets: ['Thôn 1', 'Thôn 2', 'Thôn 3', 'Thôn 4'] },
        ],
      },
    ],
  },
  {
    name: 'Tỉnh Đắk Lắk',
    pucPrefix: 'VN-DLK',
    districts: [
      {
        name: 'Thành phố Buôn Ma Thuột',
        wards: [
          { name: 'Phường Tân Lợi', hamlets: ['Khu phố 1', 'Đường Phan Chu Trinh'] },
          { name: 'Phường Tân An', hamlets: ['Khu công nghiệp Tân An', 'Đường Nguyễn Chí Thanh'] },
          { name: 'Xã Hòa Thuận', hamlets: ['Thôn 1', 'Thôn 2', 'Buôn Cuôr Đăng B'] },
          { name: 'Xã Cư Êbur', hamlets: ['Thôn 3', 'Buôn Akô Dhông', 'Buôn Dhă Prông'] },
        ],
      },
      {
        name: 'Huyện Krông Pắc',
        wards: [
          { name: 'Thị trấn Phước An', hamlets: ['Tổ dân phố 1', 'Tổ dân phố 5'] },
          { name: 'Xã Ea Yông', hamlets: ['Thôn Tân Lập', 'Thôn Phước Hòa', 'Buôn Dung'] },
          { name: 'Xã Ea Knuèc', hamlets: ['Buôn Kniêr', 'Thôn 1', 'Thôn 2'] },
        ],
      },
      {
        name: 'Huyện Cư M\'gar',
        wards: [
          { name: 'Thị trấn Quảng Phú', hamlets: ['Tổ dân phố 2', 'Tổ dân phố 3'] },
          { name: 'Xã Cuôr Đăng', hamlets: ['Buôn Cuôr Đăng A', 'Buôn Cuôr Đăng B'] },
          { name: 'Xã Ea Tul', hamlets: ['Buôn Sah', 'Buôn Tu'] },
        ],
      },
    ],
  },
  {
    name: 'Tỉnh Đồng Nai',
    pucPrefix: 'VN-DNA',
    districts: [
      {
        name: 'Thành phố Long Khánh',
        wards: [
          { name: 'Phường Xuân An', hamlets: ['Khu phố 1', 'Đường Hùng Vương'] },
          { name: 'Xã Bình Lộc', hamlets: ['Ấp 1', 'Ấp 2', 'Ấp 3', 'Ấp Cây Da'] },
          { name: 'Xã Bảo Quang', hamlets: ['Ấp Ruộng Lớn', 'Ấp Bàu Cối'] },
        ],
      },
      {
        name: 'Huyện Xuân Lộc',
        wards: [
          { name: 'Thị trấn Gia Ray', hamlets: ['Khu phố 2', 'Đường Trần Phú'] },
          { name: 'Xã Xuân Định', hamlets: ['Ấp Bảo Thị', 'Ấp Nông Doanh'] },
          { name: 'Xã Bảo Hòa', hamlets: ['Ấp Hòa Bình', 'Ấp Hòa Hợp'] },
        ],
      },
      {
        name: 'Huyện Cẩm Mỹ',
        wards: [
          { name: 'Xã Long Giao', hamlets: ['Ấp Suối Cả', 'Ấp Suối Râm'] },
          { name: 'Xã Xuân Đường', hamlets: ['Ấp 1', 'Ấp 2', 'Ấp 3'] },
        ],
      },
    ],
  },
  {
    name: 'Tỉnh Tiền Giang',
    pucPrefix: 'VN-TGG',
    districts: [
      {
        name: 'Huyện Cái Bè',
        wards: [
          { name: 'Thị trấn Cái Bè', hamlets: ['Khu phố 2', 'Khu phố 4'] },
          { name: 'Xã Đông Hòa Hiệp', hamlets: ['Ấp An Lợi', 'Ấp Phú Hòa'] },
          { name: 'Xã Hòa Khánh', hamlets: ['Ấp Hòa', 'Ấp Khu Phố'] },
        ],
      },
      {
        name: 'Huyện Chợ Gạo',
        wards: [
          { name: 'Thị trấn Chợ Gạo', hamlets: ['Khu 1', 'Khu 2'] },
          { name: 'Xã Quơn Long', hamlets: ['Ấp Bình Khương 1', 'Ấp Bình Khương 2'] },
          { name: 'Xã Đăng Hưng Phước', hamlets: ['Ấp Vĩnh Hòa', 'Ấp Bình Cách'] },
        ],
      },
      {
        name: 'Huyện Châu Thành',
        wards: [
          { name: 'Thị trấn Tân Hiệp', hamlets: ['Khu phố Ga', 'Khu phố Tân Hòa'] },
          { name: 'Xã Vĩnh Kim', hamlets: ['Ấp Vĩnh Thạnh', 'Ấp Vĩnh Bình'] },
          { name: 'Xã Long Định', hamlets: ['Ấp Đông', 'Ấp Tây'] },
        ],
      },
    ],
  },
  {
    name: 'Tỉnh Gia Lai',
    pucPrefix: 'VN-GLA',
    districts: [
      {
        name: 'Thành phố Pleiku',
        wards: [
          { name: 'Phường Diên Hồng', hamlets: ['Đường Lê Duẩn', 'Đường Trần Phú'] },
          { name: 'Xã Biển Hồ', hamlets: ['Thôn 1', 'Thôn 2', 'Làng Phung'] },
        ],
      },
      {
        name: 'Huyện Đắk Đoa',
        wards: [
          { name: 'Thị trấn Đắk Đoa', hamlets: ['Tổ dân phố 1', 'Tổ dân phố 2'] },
          { name: 'Xã Hneng', hamlets: ['Thôn 1', 'Thôn 2', 'Làng Brel'] },
        ],
      },
    ],
  },
  {
    name: 'Tỉnh Sơn La',
    pucPrefix: 'VN-SLA',
    districts: [
      {
        name: 'Huyện Mộc Châu',
        wards: [
          { name: 'Thị trấn Mộc Châu', hamlets: ['Tiểu khu 1', 'Tiểu khu 2', 'Tiểu khu 3'] },
          { name: 'Thị trấn Nông Trường Mộc Châu', hamlets: ['Tiểu khu Chè Đen', 'Tiểu khu Cờ Đỏ'] },
          { name: 'Xã Đông Sang', hamlets: ['Bản Áng', 'Bản Búa'] },
        ],
      },
      {
        name: 'Huyện Mai Sơn',
        wards: [
          { name: 'Thị trấn Hát Lót', hamlets: ['Tiểu khu 1', 'Tiểu khu 2'] },
          { name: 'Xã Cò Nòi', hamlets: ['Bản Cò Nòi', 'Bản Mé'] },
        ],
      },
    ],
  },
  {
    name: 'Tỉnh Hải Dương',
    pucPrefix: 'VN-HDU',
    districts: [
      {
        name: 'Huyện Nam Sách',
        wards: [
          { name: 'Thị trấn Nam Sách', hamlets: ['Khu phố 1', 'Khu phố 2'] },
          { name: 'Xã An Sơn', hamlets: ['Thôn Cổ Pháp', 'Thôn Thượng'] },
        ],
      },
      {
        name: 'Huyện Thanh Hà',
        wards: [
          { name: 'Thị trấn Thanh Hà', hamlets: ['Khu 1', 'Khu 2'] },
          { name: 'Xã Thanh Xá', hamlets: ['Thôn Tiên Kiều', 'Thôn Thúy Lâm'] },
        ],
      },
    ],
  },
  {
    name: 'Thành phố Hồ Chí Minh',
    pucPrefix: 'VN-HCM',
    districts: [
      {
        name: 'Huyện Củ Chi',
        wards: [
          { name: 'Thị trấn Củ Chi', hamlets: ['Khu phố 1', 'Khu phố 2'] },
          { name: 'Xã Nhuận Đức', hamlets: ['Ấp Ngã Tư', 'Ấp Đức Hiệp'] },
          { name: 'Xã Phú Hòa Đông', hamlets: ['Ấp Cây Trắc', 'Ấp Phú Lợi'] },
        ],
      },
      {
        name: 'Huyện Hóc Môn',
        wards: [
          { name: 'Thị trấn Hóc Môn', hamlets: ['Khu phố 1', 'Khu phố 2'] },
          { name: 'Xã Xuân Thới Thượng', hamlets: ['Ấp 1', 'Ấp 2', 'Ấp 3'] },
          { name: 'Xã Nhị Bình', hamlets: ['Ấp 1', 'Ấp 2'] },
        ],
      },
    ],
  },
  {
    name: 'Thành phố Hà Nội',
    pucPrefix: 'VN-HNI',
    districts: [
      {
        name: 'Huyện Đông Anh',
        wards: [
          { name: 'Thị trấn Đông Anh', hamlets: ['Tổ 1', 'Tổ 2'] },
          { name: 'Xã Vân Nội', hamlets: ['Thôn Đông Tây', 'Thôn Ba Chữ'] },
          { name: 'Xã Tiên Dương', hamlets: ['Thôn Cổ Dương', 'Thôn Lễ Pháp'] },
        ],
      },
      {
        name: 'Huyện Mê Linh',
        wards: [
          { name: 'Thị trấn Chi Đông', hamlets: ['Tổ 1', 'Tổ 2'] },
          { name: 'Xã Tiền Phong', hamlets: ['Thôn Do Hạ', 'Thôn Yên Nhân'] },
        ],
      },
    ],
  },
];

// 2. AI COLD-CHAIN TEMPERATURE PREDICTOR (Dự đoán dải nhiệt độ bảo quản lạnh nông sản)
export interface ColdChainRecommendation {
  minTemp: number;
  maxTemp: number;
  categoryName: string;
  advice: string;
  humidity: string;
  fefoDays: number;
}

export function predictColdChainTemp(productName: string): ColdChainRecommendation {
  const norm = (productName || '').toLowerCase().trim();

  // 1. Nhóm quả nhạy cảm tổn thương lạnh (Chilling Injury) - Cà chua, dưa leo, ớt chuông, cà tím, bầu, bí, mướp
  if (
    norm.includes('cà chua') ||
    norm.includes('ca chua') ||
    norm.includes('tomato') ||
    norm.includes('dưa leo') ||
    norm.includes('dưa chuột') ||
    norm.includes('cucumber') ||
    norm.includes('ớt chuông') ||
    norm.includes('ot chuong') ||
    norm.includes('cà tím') ||
    norm.includes('ca tim') ||
    norm.includes('bí đỏ') ||
    norm.includes('bí đao') ||
    norm.includes('mướp') ||
    norm.includes('đậu bắp')
  ) {
    return {
      minTemp: 8.0,
      maxTemp: 12.0,
      categoryName: 'Rau ăn quả nhạy cảm lạnh (Chilling Sensitive)',
      advice: 'Tuyệt đối KHÔNG bảo quản dưới 8.0°C để tránh sốc nhiệt (thâm tâm, rỗ vỏ, sũng nước). Nhiệt độ tối ưu là 8°C - 12°C.',
      humidity: '90% - 95%',
      fefoDays: 14,
    };
  }

  // 2. Nhóm củ quả họ rễ chịu lạnh sâu (Cà rốt, củ cải, củ dền, củ sắn)
  if (
    norm.includes('cà rốt') ||
    norm.includes('ca rot') ||
    norm.includes('carrot') ||
    norm.includes('củ cải') ||
    norm.includes('cu cai') ||
    norm.includes('củ dền') ||
    norm.includes('su hào')
  ) {
    return {
      minTemp: 1.0,
      maxTemp: 4.0,
      categoryName: 'Củ rễ chịu lạnh sâu (Root Vegetables)',
      advice: 'Nhiệt độ 1.0°C - 4.0°C giúp ức chế nảy mầm và giữ độ ngọt tự nhiên, ngăn thoát hơi nước làm teo tóp.',
      humidity: '95% - 98%',
      fefoDays: 28,
    };
  }

  // 3. Khoai tây, khoai lang (Tránh chuyển hóa đường và độc tố solanine)
  if (norm.includes('khoai tây') || norm.includes('khoai tay') || norm.includes('khoai lang')) {
    return {
      minTemp: 10.0,
      maxTemp: 14.0,
      categoryName: 'Củ chứa tinh bột (Starchy Tubers)',
      advice: 'Nhiệt độ từ 10°C - 14°C trong bóng tối để tránh tích lũy đường làm đen ruột khi chiên và không bị mọc mầm.',
      humidity: '85% - 90%',
      fefoDays: 45,
    };
  }

  // 4. Nhóm dâu tây, dưa lưới, quả mọng (Berry & Melons)
  if (
    norm.includes('dâu tây') ||
    norm.includes('dau tay') ||
    norm.includes('strawberry') ||
    norm.includes('việt quất') ||
    norm.includes('mâm xôi')
  ) {
    return {
      minTemp: 0.5,
      maxTemp: 2.5,
      categoryName: 'Quả mọng tươi nhạy cảm (Berries)',
      advice: 'Bảo quản sát điểm đóng băng (0.5°C - 2.5°C) ngay sau khi thu hái để chống nấm Botrytis cinereae làm thối hỏng.',
      humidity: '90% - 95%',
      fefoDays: 7,
    };
  }

  // 5. Nấm tươi sạch (Nấm rơm, nấm kim châm, nấm đùi gà, nấm bào ngư)
  if (norm.includes('nấm') || norm.includes('nam ') || norm.includes('mushroom')) {
    return {
      minTemp: 1.5,
      maxTemp: 4.5,
      categoryName: 'Nấm ăn tươi cao cấp (Fresh Mushrooms)',
      advice: 'Duy trì lạnh 1.5°C - 4.5°C, bao gói thoáng khí vi lỗ để nấm không bị nhầy, mở tán và biến màu.',
      humidity: '90% - 95%',
      fefoDays: 10,
    };
  }

  // 6. Trái cây nhiệt đới (Bơ, chuối, xoài, sầu riêng, chanh dây)
  if (
    norm.includes('chuối') ||
    norm.includes('bơ') ||
    norm.includes('avocado') ||
    norm.includes('xoài') ||
    norm.includes('sầu riêng') ||
    norm.includes('chanh dây')
  ) {
    return {
      minTemp: 12.0,
      maxTemp: 15.0,
      categoryName: 'Trái cây nhiệt đới hô hấp đột biến (Climacteric Fruit)',
      advice: 'Bảo quản từ 12°C - 15°C để trái chín tự nhiên đồng đều, giữ hương vị đặc trưng, không bị chai sượng vì lạnh.',
      humidity: '85% - 90%',
      fefoDays: 12,
    };
  }

  // 7. Nhóm rau ăn lá chuẩn (Mặc định cho hầu hết nông sản Đà Lạt / VietGAP)
  // Xà lách lolo, romain, bắp cải, cải thìa, cải ngọt, bó xôi, cần tây...
  return {
    minTemp: 2.0,
    maxTemp: 5.0,
    categoryName: 'Rau ăn lá tươi sạch (Leafy Greens)',
    advice: 'Khuyến nghị Cold-Chain 2.0°C - 5.0°C và độ ẩm 95% để giữ tế bào căng mọng, không bị úa vàng hay mất trọng lượng tươi.',
    humidity: '95%',
    fefoDays: 15,
  };
}

// Helper: Chuẩn hóa hiển thị thời gian tĩnh (Không gọi new Date để tránh lỗi Prerender/SSR Turbopack)
export function parseDateStringDeterministic(dateStr: string): string {
  if (!dateStr) return '08:00:00 • 28/10/2026';
  if (dateStr.includes('T')) {
    const [dPart, tPart] = dateStr.split('T');
    const [y, m, d] = (dPart || '').split('-');
    const tClean = (tPart || '').split('.')[0];
    const [hh, mm, ss] = tClean.split(':');
    return `${hh || '08'}:${mm || '00'}:${ss || '00'} • ${d || '28'}/${m || '10'}/${y || '2026'}`;
  }
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    return `08:00:00 • ${d || '28'}/${m || '10'}/${y || '2026'}`;
  }
  return dateStr;
}

// 3. ĐỊNH DẠNG THỜI GIAN THỰC (DYNAMIC REALTIME TIMESTAMP CHO RFQ & ĐÀM PHÁN)
// Tuân thủ Next.js 15/16: Nếu currentNow chưa được cung cấp từ Client effect thì chỉ dùng parse chuỗi tĩnh
export function formatRealtimeTimestamp(
  dateStr?: string,
  currentNow?: Date | null
): { full: string; relative: string; isRecent: boolean } {
  if (!dateStr) {
    return { full: 'Chưa cập nhật', relative: 'Hôm nay', isRecent: false };
  }

  const staticFull = parseDateStringDeterministic(dateStr);

  // Khi đang ở giai đoạn SSR/Prerender (currentNow là null hoặc undefined):
  // Trả về chuỗi tĩnh xác định, TUYỆT ĐỐI KHÔNG gọi new Date() trong render scope
  if (!currentNow) {
    return { full: staticFull, relative: 'Hôm nay', isRecent: false };
  }

  try {
    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) {
      return { full: staticFull, relative: 'Hôm nay', isRecent: false };
    }

    const diffMs = currentNow.getTime() - targetDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    // Format full: HH:mm:ss • DD/MM/YYYY
    const pad = (n: number) => String(n).padStart(2, '0');
    const hours = pad(targetDate.getHours());
    const minutes = pad(targetDate.getMinutes());
    const seconds = pad(targetDate.getSeconds());
    const day = pad(targetDate.getDate());
    const month = pad(targetDate.getMonth() + 1);
    const year = targetDate.getFullYear();
    const full = `${hours}:${minutes}:${seconds} • ${day}/${month}/${year}`;

    // Relative string
    let relative = 'Hôm nay';
    let isRecent = false;

    if (diffSec < 60 && diffSec >= -5) {
      relative = 'Vừa xong (Trực tuyến)';
      isRecent = true;
    } else if (diffMin < 60 && diffMin >= 1) {
      relative = `${diffMin} phút trước`;
      isRecent = diffMin <= 10;
    } else if (diffHour < 24 && diffHour >= 1) {
      relative = `${diffHour} giờ trước`;
      isRecent = false;
    } else if (diffDay === 1) {
      relative = `Hôm qua lúc ${hours}:${minutes}`;
      isRecent = false;
    } else if (diffDay > 1 && diffDay < 7) {
      relative = `${diffDay} ngày trước`;
      isRecent = false;
    } else {
      relative = `${day}/${month}/${year}`;
      isRecent = false;
    }

    return { full, relative, isRecent };
  } catch {
    return { full: staticFull, relative: 'Gần đây', isRecent: false };
  }
}

// 4. RÀNG BUỘC VALIDATION CHO HỒ SƠ VÙNG TRỒNG
export interface ProfileValidationErrors {
  farmName?: string;
  pucCode?: string;
  taxCode?: string;
  idCardNumber?: string;
  contactPhone?: string;
  bankAccount?: string;
  bankName?: string;
  bankAccountName?: string;
  farmAddress?: string;
  cultivatedArea?: string;
}

export function validateFarmerProfile(form: {
  farmName: string;
  farmerType: 'COOPERATIVE' | 'HOUSEHOLD';
  pucCode: string;
  taxCode: string;
  idCardNumber: string;
  contactPhone: string;
  bankAccount: string;
  bankName: string;
  bankAccountName: string;
  farmAddress: string;
  cultivatedArea?: string;
}): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};

  // Tên nông trại / HTX
  if (!form.farmName || form.farmName.trim().length < 3) {
    errors.farmName = 'Tên Nông Trại / Hợp Tác Xã phải có ít nhất 3 ký tự.';
  }

  // Mã số vùng trồng (PUC Code)
  const pucRegex = /^VN-[A-Z0-9]{3,4}-(?:PUC-)?[A-Z0-9-]{3,12}$/i;
  if (!form.pucCode || !pucRegex.test(form.pucCode.trim())) {
    errors.pucCode = 'Mã số PUC không đúng định dạng Chi cục cấp (VD: VN-LDO-PUC-0849 hoặc VN-DLK-0849).';
  }

  // Mã số thuế (MST) nếu là HTX
  if (form.farmerType === 'COOPERATIVE') {
    const taxClean = form.taxCode.replace(/\D/g, '');
    if (!taxClean || (taxClean.length !== 10 && taxClean.length !== 13)) {
      errors.taxCode = 'MST Doanh nghiệp/HTX phải gồm 10 chữ số hoặc 13 chữ số (chi nhánh).';
    }
  }

  // Số CCCD nếu là Hộ cá thể
  if (form.farmerType === 'HOUSEHOLD') {
    const idClean = form.idCardNumber.replace(/\D/g, '');
    if (!idClean || idClean.length !== 12) {
      errors.idCardNumber = 'Số Căn cước công dân (CCCD) phải đủ 12 chữ số hợp lệ.';
    }
  }

  // Số điện thoại liên hệ
  const phoneClean = form.contactPhone.replace(/\D/g, '');
  const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
  if (form.contactPhone && !phoneRegex.test(phoneClean)) {
    errors.contactPhone = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng đầu số di động VN (03, 05, 07, 08, 09).';
  }

  // Số tài khoản ngân hàng
  const bankAccClean = form.bankAccount.replace(/\s/g, '');
  if (!bankAccClean || bankAccClean.length < 6 || bankAccClean.length > 20 || !/^\d+$/.test(bankAccClean)) {
    errors.bankAccount = 'Số tài khoản ngân hàng phải từ 6 đến 20 chữ số (chỉ chứa số).';
  }

  // Ngân hàng thụ hưởng
  if (!form.bankName || form.bankName.trim().length < 2) {
    errors.bankName = 'Vui lòng chọn hoặc nhập tên Ngân hàng thụ hưởng.';
  }

  // Tên chủ tài khoản (In hoa không dấu)
  if (!form.bankAccountName || form.bankAccountName.trim().length < 3) {
    errors.bankAccountName = 'Vui lòng nhập Tên chủ tài khoản (in hoa không dấu).';
  }

  // Địa chỉ vườn trồng
  if (!form.farmAddress || form.farmAddress.trim().length < 5) {
    errors.farmAddress = 'Vui lòng chọn và nhập đầy đủ địa chỉ vườn trồng.';
  }

  return errors;
}
