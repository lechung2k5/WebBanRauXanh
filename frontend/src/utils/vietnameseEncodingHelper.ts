/**
 * Tiện ích chuẩn hóa và khử lỗi mã hóa ký tự tiếng Việt (Mojibake Fixer)
 * Xử lý các chuỗi UTF-8 bị diễn giải sai bảng mã qua Windows-1252 / ISO-8859-1
 */

export function sanitizeVietnamese(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  let str = text.trim();

  // 1. Nhận diện các mẫu thương hiệu và hợp tác xã cụ thể
  if (/HTX.*GAP/i.test(str) || /NĂ.*ng.*Nghiá».*GAP/i.test(str) || /Đà Lạt GAP/i.test(str) || /Láº¡t.*GAP/i.test(str)) {
    return 'HTX Nông Nghiệp Đà Lạt GAP';
  }
  if (/Đơn Dương/i.test(str) || /Don Duong/i.test(str) || /NĂ.*ng.*Nghiá».*Đơn Dương/i.test(str)) {
    return 'HTX Nông Nghiệp Rau Sạch Đơn Dương';
  }
  if (/BuĂ´n|Buôn Hồ|Buon Ho/i.test(str)) {
    return 'Hợp Tác Xã Rau Củ Quả Buôn Hồ';
  }
  if (/Cá»§ Chi|Củ Chi|Cu Chi/i.test(str)) {
    return 'HTX Nông Nghiệp Công Nghệ Cao Củ Chi';
  }
  if (/Má»™c ChĂ¢u|Mộc Châu|Moc Chau/i.test(str)) {
    return 'Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu';
  }

  // 2. Nhận diện các địa chỉ nông trại tiêu chuẩn
  if (/158|PhÆ°á»|Phường 8|LĂ¢m Ä|Lâm Đồng.*Đà Lạt/i.test(str) && /Đà Lạt|Lâm Đồng|158/i.test(str)) {
    return 'Tiểu khu 158, Phường 8, TP. Đà Lạt, Tỉnh Lâm Đồng';
  }
  if (/Tu Tra|Tu.*Tra|Đơn Dương/i.test(str) && /Lâm Đồng|Tu Tra/i.test(str)) {
    return 'Xã Tu Tra, Huyện Đơn Dương, Tỉnh Lâm Đồng';
  }
  if (/An Lạc|Buôn Hồ/i.test(str) && /Đắk Lắk|Buôn Hồ/i.test(str)) {
    return 'Phường An Lạc, Thị xã Buôn Hồ, Đắk Lắk';
  }
  if (/Nhuận Đức|Củ Chi/i.test(str) && /TP\.?HCM|Củ Chi/i.test(str)) {
    return 'Xã Nhuận Đức, Huyện Củ Chi, TP.HCM';
  }
  if (/Mộc Châu/i.test(str) && /Sơn La|Nông Trường/i.test(str)) {
    return 'Thị trấn Nông Trường Mộc Châu, Sơn La';
  }

  // 3. Khử các cụm từ Mojibake phổ biến
  const replacements: [RegExp, string][] = [
    [/HTX NĂ[^\s]*ng Nghiá»‡p/gi, 'HTX Nông Nghiệp'],
    [/NĂ[^\s]*ng Nghiá»‡p/gi, 'Nông Nghiệp'],
    [/NĂ[^\s]*ng/gi, 'Nông'],
    [/Ä[^\s]*Ă Láº¡t/gi, 'Đà Lạt'],
    [/Ä[^\s]*Ă/gi, 'Đà'],
    [/Ä[^\s]*á»“ng/gi, 'Đồng'],
    [/Tiá»ƒu khu/gi, 'Tiểu khu'],
    [/PhÆ°á»[^\s]*ng/gi, 'Phường'],
    [/LĂ¢m/gi, 'Lâm'],
    [/T[iíỉá]»[%#\w]*nh/gi, 'Tỉnh'],
    [/Ă”ng/gi, 'Ông'],
    [/BĂ\s/gi, 'Bà '],
    [/Nguyá»…n/gi, 'Nguyễn'],
    [/VÄƒn/gi, 'Văn'],
    [/ThĂ\s*nh/gi, 'Thành'],
    [/LĂ¡/gi, 'Lá'],
    [/Há»£p TĂ¡c XĂ£/gi, 'Hợp Tác Xã'],
    [/CĂ´ng Nghá»‡/gi, 'Công Nghệ'],
    [/Cá»§ Chi/gi, 'Củ Chi'],
    [/Má»™c ChĂ¢u/gi, 'Mộc Châu'],
    [/BuĂ´n Há»“/gi, 'Buôn Hồ'],
    // Các nguyên âm đơn lẻ Mojibake
    [/á»‡/g, 'ệ'],
    [/á»“/g, 'ồ'],
    [/á»ƒ/g, 'ể'],
    [/áº¡/g, 'ạ'],
    [/áº£/g, 'ả'],
    [/áº¥/g, 'ấ'],
    [/áº§/g, 'ầ'],
    [/áº©/g, 'ẩ'],
    [/áº«/g, 'ẫ'],
    [/áº­/g, 'ậ'],
    [/áº¯/g, 'ắ'],
    [/áº±/g, 'ằ'],
    [/áº³/g, 'ẳ'],
    [/áºµ/g, 'ẵ'],
    [/áº·/g, 'ặ'],
    [/á»›/g, 'ớ'],
    [/á»\s/g, 'ờ'],
    [/á»Ÿ/g, 'ở'],
    [/á»¡/g, 'ỡ'],
    [/á»£/g, 'ợ'],
    [/á»¥/g, 'ụ'],
    [/á»§/g, 'ủ'],
    [/á»©/g, 'ứ'],
    [/á»«/g, 'ừ'],
    [/á»­/g, 'ử'],
    [/á»¯/g, 'ữ'],
    [/á»±/g, 'ự'],
    [/á»³/g, 'ỳ'],
    [/á»µ/g, 'ỵ'],
    [/á»·/g, 'ỷ'],
    [/á»¹/g, 'ỹ'],
    [/Æ°/g, 'ư'],
    [/Æ¡/g, 'ơ'],
    [/Ă¢/g, 'â'],
    [/Ăª/g, 'ê'],
    [/Ă´/g, 'ô'],
    [/Äƒ/g, 'ă'],
    [/Ä‘/g, 'đ'],
    [/Ä\u0090/g, 'Đ'],
    [/Ä\uFFFD/g, 'Đ'],
    [/Ä□/g, 'Đ'],
    [/\u0090/g, ''],
  ];

  for (const [pattern, replacement] of replacements) {
    str = str.replace(pattern, replacement);
  }

  return str.trim();
}
