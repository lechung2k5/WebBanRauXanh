const fs = require('fs');
const path = require('path');

// Đọc dữ liệu từ bhx_products.json
const rawData = fs.readFileSync(path.join(__dirname, 'bhx_products.json'), 'utf8');
const products = JSON.parse(rawData);

console.log(`Bắt đầu chuyển đổi ${products.length} nông sản vào bảng harvest_lots...`);

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// Bảng ánh xạ category
const categoryEnumMap = {
  1: 'RAU_AN_LA',
  2: 'CU_QUA',
  3: 'NAM_TUOI',
  4: 'RAU_GIA_VI',
  6: 'RAU_TRONG_NHA_KINH'
};

const sqlStatements = [
  '-- Nạp 633 lô nông sản sỉ B2B vào PostgreSQL từ dữ liệu nông sản',
  'BEGIN;'
];

let count = 0;
for (let i = 0; i < products.length; i++) {
  const p = products[i];
  const lotIndex = i + 1;
  const lotCode = `LOT-B2B-${String(lotIndex).padStart(4, '0')}`;
  
  const productName = String(p.name || 'Nông sản sạch').substring(0, 100);
  const categoryId = p.categoryId || 1;
  const categoryEnum = categoryEnumMap[categoryId] || 'RAU_AN_LA';
  
  const farmerId = 1;
  const farmerName = String(p.farmName || 'HTX Nông Nghiệp Công Nghệ Cao Đơn Dương').substring(0, 150);
  const pucCode = String(p.pucCode || 'VN-LDO-04-100').substring(0, 50);
  
  let certification = 'VietGAP';
  if (Array.isArray(p.certification) && p.certification.length > 0) {
    certification = p.certification.join(', ');
  } else if (p.certification) {
    certification = String(p.certification);
  }
  certification = certification.substring(0, 100);

  // Ngày thu hoạch và hạn sử dụng FEFO
  const dayOffset = (i % 7);
  const harvestDay = 26 - dayOffset; // 2026-10-19 đến 2026-10-26
  const harvestDate = `2026-10-${String(harvestDay).padStart(2, '0')}`;
  const expiryDay = (harvestDay + 12);
  let expiryDate = `2026-11-${String(expiryDay - 31).padStart(2, '0')}`;
  if (expiryDay <= 31) {
    expiryDate = `2026-10-${String(expiryDay).padStart(2, '0')}`;
  } else {
    expiryDate = `2026-11-${String(expiryDay - 31 + 4).padStart(2, '0')}`;
  }

  // Khối lượng Tấn / Kg
  const totalWeightKg = typeof p.totalLotVolume === 'number' && p.totalLotVolume > 0 
    ? p.totalLotVolume 
    : (5000 + (i % 10) * 1000);
  
  let availableWeightKg = typeof p.availableVolume === 'number' && p.availableVolume > 0 
    ? p.availableVolume 
    : Math.round(totalWeightKg * 0.85);

  const basePricePerKg = typeof p.price === 'number' && p.price > 0 ? p.price : 15000;

  // Bảng giá sỉ bậc thang theo số lượng (Tier Pricing)
  let tierPricing = [];
  if (Array.isArray(p.tieredPricing) && p.tieredPricing.length > 0) {
    tierPricing = p.tieredPricing.map(t => ({
      minKg: t.minQuantity || 200,
      price: t.unitPrice || basePricePerKg
    }));
  } else {
    tierPricing = [
      { minKg: 200, price: basePricePerKg },
      { minKg: 2000, price: Math.round(basePricePerKg * 0.92) },
      { minKg: 5000, price: Math.round(basePricePerKg * 0.85) }
    ];
  }
  const tierPricingJson = JSON.stringify(tierPricing);

  // Nhiệt độ chuỗi lạnh
  let reqTempMin = 2.0;
  let reqTempMax = 6.0;
  if (categoryEnum === 'CU_QUA') {
    reqTempMin = 4.0;
    reqTempMax = 10.0;
  } else if (categoryEnum === 'NAM_TUOI') {
    reqTempMin = 2.0;
    reqTempMax = 5.0;
  }

  // Trạng thái lô hàng
  let status = 'OPEN';
  if (i % 25 === 0) {
    status = 'PENDING_APPROVAL';
  } else if (i % 40 === 0) {
    status = 'SOLD_OUT';
    availableWeightKg = 0;
  } else if (i % 70 === 0) {
    status = 'SUSPENDED';
  }

  const imageUrl = p.imageUrl ? String(p.imageUrl) : 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600';
  const warehouseLocation = String(p.farmLocation || 'Trạm Trung Chuyển Đức Trọng - Lâm Đồng').substring(0, 100);
  const region = String(p.regionName || 'Tây Nguyên & Lâm Đồng').substring(0, 100);
  const auditNote = String(p.description || 'Lô nông sản đạt chuẩn kiểm định VietGAP và chuỗi cung ứng lạnh B2B.').substring(0, 500);
  const rejectionReason = status === 'SUSPENDED' ? 'Cảnh báo kiểm định vi sinh hoặc dư lượng Nitrate' : null;

  const insertSql = `INSERT INTO harvest_lots (
    lot_code, farmer_id, farmer_name, product_name, category, category_id,
    puc_code, certification, harvest_date, expiry_date, total_weight_kg,
    available_weight_kg, base_price_per_kg, tier_pricing_json, req_temp_min,
    req_temp_max, status, image_url, warehouse_location, region, audit_note,
    rejection_reason, created_at, updated_at
  ) VALUES (
    ${escapeSql(lotCode)},
    ${farmerId},
    ${escapeSql(farmerName)},
    ${escapeSql(productName)},
    ${escapeSql(categoryEnum)},
    ${categoryId},
    ${escapeSql(pucCode)},
    ${escapeSql(certification)},
    '${harvestDate}',
    '${expiryDate}',
    ${totalWeightKg},
    ${availableWeightKg},
    ${basePricePerKg},
    ${escapeSql(tierPricingJson)},
    ${reqTempMin},
    ${reqTempMax},
    ${escapeSql(status)},
    ${escapeSql(imageUrl)},
    ${escapeSql(warehouseLocation)},
    ${escapeSql(region)},
    ${escapeSql(auditNote)},
    ${escapeSql(rejectionReason)},
    NOW(),
    NOW()
  ) ON CONFLICT (lot_code) DO UPDATE SET
    product_name = EXCLUDED.product_name,
    category = EXCLUDED.category,
    category_id = EXCLUDED.category_id,
    total_weight_kg = EXCLUDED.total_weight_kg,
    available_weight_kg = EXCLUDED.available_weight_kg,
    base_price_per_kg = EXCLUDED.base_price_per_kg,
    tier_pricing_json = EXCLUDED.tier_pricing_json,
    image_url = EXCLUDED.image_url,
    updated_at = NOW();`;

  sqlStatements.push(insertSql);
  count++;
}

sqlStatements.push('COMMIT;');

const outputPath = path.join(__dirname, 'import_harvest_lots.sql');
fs.writeFileSync(outputPath, sqlStatements.join('\n'), 'utf8');
console.log(`Đã xuất thành công ${count} lô hàng ra file ${outputPath}`);
