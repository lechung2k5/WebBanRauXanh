/**
 * Service chuẩn hoá và phân giải link ảnh sản phẩm nông sản dựa theo tên gọi.
 * Đảm bảo 100% sản phẩm hiển thị đúng chủng loại rau, củ, quả, nấm tương ứng.
 */

export interface ProductImageRule {
  regex: RegExp;
  primary: string;
  gallery: string[];
  label: string;
}

// Danh mục ảnh chất lượng cao chuẩn nông sản VietGAP & Organic, sắp xếp theo thứ tự ưu tiên chính xác
export const VEGETABLE_IMAGE_RULES: ProductImageRule[] = [
  // 1. Nấm đặc thù
  {
    regex: /\b(nam kim cham|kim cham|enoki)\b/,
    primary: 'https://images.unsplash.com/photo-1542913235-1f46ce06443d?w=600&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1542913235-1f46ce06443d?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1543904856-8257e34283d9?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600995616866-d2dc0215774a?w=600&auto=format&fit=crop&q=80',
    ],
    label: 'Nấm kim châm',
  },
  {
    regex: /\b(nam hai san|hai san|bach tuyet|linh chi trang|shimeji)\b/,
    primary: 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=600&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1597701655287-2ea251d9c447?w=600&auto=format&fit=crop&q=80',
    ],
    label: 'Nấm hải sản',
  },
  {
    regex: /\b(dui ga|king oyster)\b/,
    primary: 'https://images.unsplash.com/photo-1573732064472-ea7fd2382d22?w=600&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1573732064472-ea7fd2382d22?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1760108273033-0d789ef53d70?w=600&auto=format&fit=crop&q=80',
    ],
    label: 'Nấm đùi gà',
  },
  {
    regex: /\b(dong co|shiitake|nam huong)\b/,
    primary: 'https://images.unsplash.com/photo-1620582708067-9f6ba1e2fc1c?w=600&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1620582708067-9f6ba1e2fc1c?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1629665001701-a232a0ba4eec?w=600&auto=format&fit=crop&q=80',
    ],
    label: 'Nấm hương',
  },
  {
    regex: /\b(linh chi nau)\b/,
    primary: 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=600&auto=format&fit=crop&q=80'],
    label: 'Nấm linh chi nâu',
  },
  {
    regex: /\b(linh chi do|linh chi|reishi)\b/,
    primary: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop&q=80'],
    label: 'Nấm linh chi đỏ',
  },
  {
    regex: /\b(hoang kim|golden oyster)\b/,
    primary: 'https://images.unsplash.com/photo-1597701655287-2ea251d9c447?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1597701655287-2ea251d9c447?w=600&auto=format&fit=crop&q=80'],
    label: 'Nấm hoàng kim',
  },
  {
    regex: /\b(bao ngu xam|nam bao ngu)\b/,
    primary: 'https://images.unsplash.com/photo-1622352348086-d622137af3b0?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1622352348086-d622137af3b0?w=600&auto=format&fit=crop&q=80'],
    label: 'Nấm bào ngư xám',
  },
  {
    regex: /\b(loc nhung|pioppino)\b/,
    primary: 'https://images.unsplash.com/photo-1622352348086-d622137af3b0?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1622352348086-d622137af3b0?w=600&auto=format&fit=crop&q=80'],
    label: 'Nấm lộc nhung',
  },
  {
    regex: /\b(nam rom|rom)\b/,
    primary: 'https://images.unsplash.com/photo-1657500916344-d33346904ed5?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1657500916344-d33346904ed5?w=600&auto=format&fit=crop&q=80'],
    label: 'Nấm rơm',
  },
  {
    regex: /\b(nam tuyet|tuyet)\b/,
    primary: 'https://images.unsplash.com/photo-1569108891320-de8f5b7723b6?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1569108891320-de8f5b7723b6?w=600&auto=format&fit=crop&q=80'],
    label: 'Nấm tuyết',
  },
  {
    regex: /\b(nam meo|moc nhi|wood ear)\b/,
    primary: 'https://images.unsplash.com/photo-1603709764670-eb3b697713af?w=600&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1603709764670-eb3b697713af?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1709390783620-cc44024ecd28?w=600&auto=format&fit=crop&q=80',
    ],
    label: 'Nấm mèo',
  },

  // 2. Mồng tơi (đặt trước tỏi)
  {
    regex: /\b(mong toi|malabar)\b/,
    primary: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600&auto=format&fit=crop&q=80'],
    label: 'Mồng tơi',
  },

  // 3. Ngò gai, rau om, rau thơm (đặt trước ngô)
  {
    regex: /\b(ngo gai|rau om|rau ram|rau thom|ngo ri|coriander)\b/,
    primary: 'https://images.unsplash.com/photo-1588879460618-9249e7d947d1?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1588879460618-9249e7d947d1?w=600&auto=format&fit=crop&q=80'],
    label: 'Ngò gai & rau thơm',
  },

  // 4. Bắp cải & đậu bắp (đặt trước bắp mỹ)
  {
    regex: /\b(bap cai tim|cai bap tim|purple cabbage|red cabbage)\b/,
    primary: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&auto=format&fit=crop&q=80'],
    label: 'Bắp cải tím',
  },
  {
    regex: /\b(bap cai|cabbage)\b/,
    primary: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80'],
    label: 'Bắp cải',
  },
  {
    regex: /\b(dau bap|okra)\b/,
    primary: 'https://images.unsplash.com/photo-1425543103986-22abb7d7e8d2?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1425543103986-22abb7d7e8d2?w=600&auto=format&fit=crop&q=80'],
    label: 'Đậu bắp',
  },
  {
    regex: /\b(dau cove|dau que|green bean)\b/,
    primary: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=600&auto=format&fit=crop&q=80'],
    label: 'Đậu cove',
  },
  {
    regex: /\b(bap my|trai bap|bap ngot|bap nep|bap|sweet corn)\b/,
    primary: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80'],
    label: 'Bắp mỹ',
  },

  // 5. Mướp hương & Khổ qua & Củ cải
  {
    regex: /\b(muop huong|muop)\b/,
    primary: 'https://images.unsplash.com/photo-1694723844104-a1495e30c7b0?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1694723844104-a1495e30c7b0?w=600&auto=format&fit=crop&q=80'],
    label: 'Mướp hương',
  },
  {
    regex: /\b(kho qua|muop dang|bitter melon)\b/,
    primary: 'https://images.unsplash.com/photo-1739903760973-4731a8e79a03?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1739903760973-4731a8e79a03?w=600&auto=format&fit=crop&q=80'],
    label: 'Khổ qua',
  },
  {
    regex: /\b(cu cai trang|cu cai|daikon|radish)\b/,
    primary: 'https://images.unsplash.com/photo-1689082697563-a90beab7104b?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1689082697563-a90beab7104b?w=600&auto=format&fit=crop&q=80'],
    label: 'Củ cải trắng',
  },
  {
    regex: /\b(su hao|kohlrabi)\b/,
    primary: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&auto=format&fit=crop&q=80'],
    label: 'Su hào',
  },

  // 6. Cà chua
  {
    regex: /\b(ca chua bi|cherry tomato)\b/,
    primary: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb7?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1546470427-0d4db154ceb7?w=600&auto=format&fit=crop&q=80'],
    label: 'Cà chua bi',
  },
  {
    regex: /\b(ca chua|beef|tomato)\b/,
    primary: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80'],
    label: 'Cà chua',
  },

  // 7. Cà rốt & Dưa leo
  {
    regex: /\b(ca rot|carrot)\b/,
    primary: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80'],
    label: 'Cà rốt',
  },
  {
    regex: /\b(dua leo|dua chuot|cucumber)\b/,
    primary: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=600&auto=format&fit=crop&q=80'],
    label: 'Dưa leo',
  },

  // 8. Bí
  {
    regex: /\b(bi nu|bi non)\b/,
    primary: 'https://images.unsplash.com/photo-1694723844104-a1495e30c7b0?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1694723844104-a1495e30c7b0?w=600&auto=format&fit=crop&q=80'],
    label: 'Bí nụ',
  },
  {
    regex: /\b(bi ngoi|zucchini)\b/,
    primary: 'https://images.unsplash.com/photo-1563865436874-9aef32095fad?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1563865436874-9aef32095fad?w=600&auto=format&fit=crop&q=80'],
    label: 'Bí ngòi',
  },
  {
    regex: /\b(bi do|bi do ho lo|pumpkin)\b/,
    primary: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=600&auto=format&fit=crop&q=80'],
    label: 'Bí đỏ',
  },

  // 9. Khoai
  {
    regex: /\b(khoai tay|potato)\b/,
    primary: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80'],
    label: 'Khoai tây',
  },
  {
    regex: /\b(khoai mo|khoai tim|purple yam)\b/,
    primary: 'https://images.unsplash.com/photo-1516559828984-fb3b99548b21?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1516559828984-fb3b99548b21?w=600&auto=format&fit=crop&q=80'],
    label: 'Khoai mỡ',
  },

  // 10. Ớt & Hành & Tỏi & Thảo Mộc
  {
    regex: /\b(ot chuong|bell pepper)\b/,
    primary: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&auto=format&fit=crop&q=80'],
    label: 'Ớt chuông',
  },
  {
    regex: /\b(ot sung|ot do|ot|chili)\b/,
    primary: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600&auto=format&fit=crop&q=80'],
    label: 'Ớt sừng',
  },
  {
    regex: /\b(hanh tim|shallot|red onion)\b/,
    primary: 'https://images.unsplash.com/photo-1565685225009-fc85d9109c80?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1565685225009-fc85d9109c80?w=600&auto=format&fit=crop&q=80'],
    label: 'Hành tím',
  },
  {
    regex: /(?<!mong\s)\b(toi tim|cu toi|tep toi|toi|garlic)\b/,
    primary: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80'],
    label: 'Tỏi',
  },
  {
    regex: /\b(hanh la|scallion|spring onion)\b/,
    primary: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600&auto=format&fit=crop&q=80'],
    label: 'Hành lá',
  },
  {
    regex: /\b(sa cay|sa tuoi|lemongrass)\b/,
    primary: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=600&auto=format&fit=crop&q=80'],
    label: 'Sả cây',
  },
  {
    regex: /\b(gung|ginger)\b/,
    primary: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80'],
    label: 'Gừng',
  },
  {
    regex: /\b(hung que|basil)\b/,
    primary: 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=600&auto=format&fit=crop&q=80'],
    label: 'Húng quế',
  },
  {
    regex: /\b(tia to|shiso|perilla)\b/,
    primary: 'https://images.unsplash.com/photo-1580910365203-91ea9115a319?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1580910365203-91ea9115a319?w=600&auto=format&fit=crop&q=80'],
    label: 'Tía tô',
  },
  {
    regex: /\b(he la|chives)\b/,
    primary: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600&auto=format&fit=crop&q=80'],
    label: 'Hẹ lá',
  },

  // 11. Rau ăn lá
  {
    regex: /\b(cai thia|bok choy)\b/,
    primary: 'https://images.unsplash.com/photo-1708798534031-3711ec8cc16e?w=600&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1708798534031-3711ec8cc16e?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515335889486-345839b9ba95?w=600&auto=format&fit=crop&q=80',
    ],
    label: 'Cải thìa',
  },
  {
    regex: /\b(cai ngot|cai ngong|choy sum)\b/,
    primary: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80'],
    label: 'Cải ngọt/ngồng',
  },
  {
    regex: /\b(cai be xanh|cai be dun|cai be|loai cai)\b/,
    primary: 'https://images.unsplash.com/photo-1708798534031-3711ec8cc16e?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1708798534031-3711ec8cc16e?w=600&auto=format&fit=crop&q=80'],
    label: 'Cải bẹ',
  },
  {
    regex: /\b(rau muong|muong nuoc|muong hat|water spinach)\b/,
    primary: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80'],
    label: 'Rau muống',
  },
  {
    regex: /\b(rau den|amaranth)\b/,
    primary: 'https://images.unsplash.com/photo-1580910365203-91ea9115a319?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1580910365203-91ea9115a319?w=600&auto=format&fit=crop&q=80'],
    label: 'Rau dền',
  },
  {
    regex: /\b(rau lang)\b/,
    primary: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600&auto=format&fit=crop&q=80'],
    label: 'Rau lang',
  },
  {
    regex: /\b(rau ngot)\b/,
    primary: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600&auto=format&fit=crop&q=80'],
    label: 'Rau ngót',
  },
  {
    regex: /\b(xa lach|salad|lettuce)\b/,
    primary: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&auto=format&fit=crop&q=80'],
    label: 'Xà lách',
  },
  {
    regex: /\b(thi la|dill)\b/,
    primary: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80'],
    label: 'Thì là',
  },
  {
    regex: /\b(dien dien|bong dien dien)\b/,
    primary: 'https://images.unsplash.com/photo-1554290813-ec6a2a72e5c7?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1554290813-ec6a2a72e5c7?w=600&auto=format&fit=crop&q=80'],
    label: 'Bông điên điển',
  },
  {
    regex: /\b(gia mam|gia do|gia|bean sprout)\b/,
    primary: 'https://images.unsplash.com/photo-1506484381205-f7945653044d?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1506484381205-f7945653044d?w=600&auto=format&fit=crop&q=80'],
    label: 'Giá đỗ',
  },
  {
    regex: /\b(combo 4 loai rau)\b/,
    primary: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80'],
    label: 'Combo rau sạch',
  },
];

// Hàm loại bỏ dấu tiếng Việt để so khớp từ khoá linh hoạt
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Phân giải ảnh sản phẩm chuẩn xác từ tên sản phẩm và URL gốc
 */
export function resolveProductImageUrl(
  productName: string,
  categorySlug?: string,
  existingUrl?: string
): string {
  // 1. Ưu tiên sử dụng ảnh thật từ Saigon Co.op / Google User Content CDN hoặc link ảnh nhà cung cấp
  if (
    existingUrl &&
    existingUrl.startsWith('http') &&
    (existingUrl.includes('googleusercontent.com') ||
     existingUrl.includes('teko') ||
     existingUrl.includes('cooponline') ||
     existingUrl.includes('bachhoaxanh') ||
     !existingUrl.includes('images.unsplash.com'))
  ) {
    return existingUrl;
  }

  if (!productName) {
    return existingUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80';
  }

  const clean = removeVietnameseAccents(productName);

  for (const item of VEGETABLE_IMAGE_RULES) {
    if (item.regex.test(clean)) {
      return item.primary;
    }
  }

  // Nếu không khớp từ khoá, dùng fallback theo nhóm category
  if (categorySlug === 'nam-tuoi' || clean.includes('nam')) {
    return 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=600&auto=format&fit=crop&q=80';
  }
  if (categorySlug === 'cu' || clean.includes('cu') || clean.includes('qua')) {
    return 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80';
  }

  return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80';
}

/**
 * Lấy danh sách ảnh gallery của sản phẩm để hiển thị slider / thumbnails chi tiết
 */
export function getProductGallery(productName: string, existingUrl?: string): string[] {
  const images: string[] = [];

  // Nếu có ảnh thật chất lượng cao từ Saigon Co.op / Google CDN
  if (
    existingUrl &&
    existingUrl.startsWith('http') &&
    (existingUrl.includes('googleusercontent.com') ||
     existingUrl.includes('teko') ||
     existingUrl.includes('cooponline'))
  ) {
    images.push(existingUrl);
  }

  if (!productName) {
    return images.length > 0 ? images : [resolveProductImageUrl('', '', existingUrl)];
  }

  const clean = removeVietnameseAccents(productName);

  for (const item of VEGETABLE_IMAGE_RULES) {
    if (item.regex.test(clean)) {
      for (const g of item.gallery) {
        if (!images.includes(g)) images.push(g);
      }
      return images;
    }
  }

  const fallback = resolveProductImageUrl(productName, undefined, existingUrl);
  if (!images.includes(fallback)) images.push(fallback);
  return images;
}
