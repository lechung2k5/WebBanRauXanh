const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 1. Đọc dữ liệu từ bhx_products.json
const rawData = fs.readFileSync(path.join(__dirname, 'bhx_products.json'), 'utf8');
const products = JSON.parse(rawData);

console.log(`Đang cập nhật ${products.length} sản phẩm sang chuẩn nguồn hàng B2B...`);

function javaStringHashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function generateEmbedding(text) {
  const dim = 768;
  const vec = new Float64Array(dim);
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  for (const word of words) {
    const hashWord = javaStringHashCode(word);
    const sha = crypto.createHash('sha256').update(word, 'utf8').digest();
    for (let i = 0; i < sha.length; i++) {
      const idx = Math.abs((Math.imul(hashWord, 31) + i * 17) % dim);
      vec[idx] += (sha[i] - 128.0) / 128.0;
    }
  }

  let sumSq = 0;
  for (let i = 0; i < dim; i++) sumSq += vec[i] * vec[i];
  let norm = Math.sqrt(sumSq) || 1.0;

  const result = [];
  for (let i = 0; i < dim; i++) {
    result.push(Number((vec[i] / norm).toFixed(6)));
  }
  return '[' + result.join(',') + ']';
}

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

const sqlStatements = [
  '-- Cập nhật xuất xứ vùng trồng và vector ngữ nghĩa B2B cho toàn bộ nông sản',
  'BEGIN;'
];

for (const p of products) {
  const name = String(p.name || '').trim();
  const origin = p.farmLocation ? String(p.farmLocation).trim().substring(0, 100) : 'Đà Lạt, Lâm Đồng';
  const brand = p.farmName ? String(p.farmName).trim().substring(0, 100) : 'HTX Nông Nghiệp HoNa Fresh';
  const region = p.regionName || 'Tây Nguyên & Lâm Đồng';
  const harvest = p.harvestDate || 'Đang thu hái rộ xuất vườn';
  const cert = Array.isArray(p.certification) ? p.certification.join(', ') : 'VietGAP';
  const moq = p.moq || 200;
  const vol = p.totalLotVolume ? `${p.totalLotVolume} Tấn` : '5 Tấn';
  const price = p.price || 15000;

  // Ngữ nghĩa B2B thương mại sỉ cho AI & Vector Database
  const b2bSemanticText = `Lô nông sản sỉ: ${name}. Vùng trồng xuất xứ: ${origin} (Khu vực ${region}). Nông trại HTX sản xuất: ${brand}. Thời vụ thu hoạch mùa vụ: ${harvest}. Tiêu chuẩn kiểm định: ${cert}. Quy mô sản lượng lô chào bán: ${vol}. Số lượng đặt tối thiểu MOQ: ${moq} kg. Đơn giá sỉ xuất vườn: ${price} đồng/kg. Nguồn hàng sỉ số lượng lớn cho thương lái và chuỗi phân phối.`;
  const vectorStr = generateEmbedding(b2bSemanticText);

  // Update theo name và slug tương ứng
  const updateSql = `UPDATE products SET 
    origin = ${escapeSql(origin)},
    brand = ${escapeSql(brand)},
    embedding = cast('${vectorStr}' as vector)
  WHERE name = ${escapeSql(name)};`;

  sqlStatements.push(updateSql);
}

// Cập nhật cả 6 sản phẩm mẫu ban đầu với vùng trồng chuẩn
sqlStatements.push(`UPDATE products SET origin = 'Đà Lạt, Lâm Đồng', brand = 'HTX Nông Sản Rau Sạch Đà Lạt' WHERE id IN (1, 2, 3, 4, 5, 6);`);

sqlStatements.push('COMMIT;');
sqlStatements.push('REINDEX INDEX products_embedding_hnsw_idx;');

const outputFile = path.join(__dirname, 'update_b2b_origins.sql');
fs.writeFileSync(outputFile, sqlStatements.join('\n'), 'utf8');

console.log(`Đã tạo thành công file SQL: ${outputFile}!`);
