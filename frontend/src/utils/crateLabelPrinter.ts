export interface CrateLabelItem {
  contractCode: string;
  productName: string;
  buyerName: string;
  zoneName?: string;
  binCode: string;
  crateIndex: number;
  totalCrates: number;
  weightKg?: number;
}

export function getShortContractCode(contractCode: string): string {
  return String(contractCode || '')
    .trim()
    .replace(/^HD-\d{4}-/i, '')
    .toUpperCase() || 'HONA';
}

export function buildCrateBarcodeCode(contractCode: string, crateIndex: number): string {
  const shortCode = getShortContractCode(contractCode);
  return `${shortCode}-${String(crateIndex).padStart(2, '0')}`;
}

export function buildCrateQrPayload(contractCode: string, binCode: string, crateIndex: number): string {
  const shortCode = getShortContractCode(contractCode);
  return `HONAF|${contractCode}|${binCode}|${shortCode}-${String(crateIndex).padStart(2, '0')}`;
}

/**
 * Sinh chuỗi SVG Barcode (Code-style deterministic bars) không cần thư viện ngoài
 */
export function buildBarcodeSvgMarkup(code: string, width = 180, height = 38): string {
  const clean = String(code || 'HONA-01').toUpperCase();
  const bars: string[] = [];
  let x = 6;
  // Start guard
  bars.push(`<rect x="${x}" y="2" width="2" height="${height - 4}" fill="#0f172a"/>`);
  x += 4;
  bars.push(`<rect x="${x}" y="2" width="1" height="${height - 4}" fill="#0f172a"/>`);
  x += 3;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    for (let bit = 0; bit < 4; bit++) {
      const w = ((ch >> bit) & 1) === 1 ? 3 : 1.5;
      if (x + w < width - 10) {
        bars.push(`<rect x="${x.toFixed(1)}" y="2" width="${w}" height="${height - 4}" fill="#0f172a"/>`);
      }
      x += w + (((ch >> (bit + 1)) & 1) === 1 ? 2.5 : 1.5);
    }
  }

  // End guard
  if (x < width - 8) {
    bars.push(`<rect x="${x.toFixed(1)}" y="2" width="1" height="${height - 4}" fill="#0f172a"/>`);
    bars.push(`<rect x="${(x + 3).toFixed(1)}" y="2" width="2" height="${height - 4}" fill="#0f172a"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="display:block;max-width:100%;">${bars.join('')}</svg>`;
}

export function buildQrImageUrl(payload: string, size = 110): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
}

/**
 * Mở cửa sổ in tem nhãn QR + Barcode cho 1 thùng hoặc trọn bộ N thùng của hợp đồng
 */
export function printCrateLabels(items: CrateLabelItem[], title?: string): void {
  if (!items || items.length === 0) return;
  const win = window.open('', '_blank', 'width=920,height=760');
  if (!win) {
    window.print();
    return;
  }

  const cardsHtml = items
    .map((item) => {
      const barcode = buildCrateBarcodeCode(item.contractCode, item.crateIndex);
      const qrPayload = buildCrateQrPayload(item.contractCode, item.binCode, item.crateIndex);
      const qrUrl = buildQrImageUrl(qrPayload, 108);
      const barcodeSvg = buildBarcodeSvgMarkup(barcode, 190, 34);
      const perCrateKg =
        item.weightKg && item.totalCrates > 0
          ? (item.weightKg / item.totalCrates).toFixed(1)
          : '';

      return `
        <div class="label-card">
          <div class="label-top">
            <span class="brand">HONA FRESH · KHO LẠNH B2B</span>
            <span class="crate-badge">THÙNG #${item.crateIndex}/${item.totalCrates}</span>
          </div>
          <div class="product">${item.productName || 'Nông sản VietGAP'}</div>
          <div class="meta">
            <div>HĐ: <strong>${item.contractCode}</strong> · Kệ: <strong>${item.binCode}</strong></div>
            <div>Buyer: <strong>${item.buyerName || 'Khách sỉ HoNa'}</strong>${perCrateKg ? ` · ~${perCrateKg} kg/thùng` : ''}</div>
          </div>
          <div class="codes-row">
            <div class="barcode-box">
              ${barcodeSvg}
              <div class="barcode-text">${barcode}</div>
            </div>
            <img class="qr-img" src="${qrUrl}" alt="QR ${barcode}" />
          </div>
        </div>
      `;
    })
    .join('');

  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title || `In Tem QR & Barcode (${items.length} thùng)`}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 12px; }
          .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #cbd5e1; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .label-card { border: 1.5px solid #0f172a; border-radius: 10px; padding: 10px 12px; page-break-inside: avoid; background: #fff; }
          .label-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
          .brand { font-size: 10px; font-weight: 800; color: #10542c; letter-spacing: 0.04em; }
          .crate-badge { font-size: 11px; font-weight: 900; background: #10542c; color: #fff; padding: 2px 7px; border-radius: 5px; font-family: monospace; }
          .product { font-size: 13px; font-weight: 800; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .meta { font-size: 10.5px; color: #334155; line-height: 1.4; margin-bottom: 6px; }
          .codes-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
          .barcode-box { flex: 1; }
          .barcode-text { font-family: monospace; font-size: 12px; font-weight: 900; letter-spacing: 0.1em; margin-top: 2px; }
          .qr-img { width: 62px; height: 62px; border: 1px solid #e2e8f0; border-radius: 4px; }
          @media print { .toolbar { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <strong>${title || `Tem QR & Barcode HoNa Fresh (${items.length} tem)`}</strong>
          <button onclick="window.print()" style="padding:6px 14px;background:#10542c;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">In Ngay</button>
        </div>
        <div class="grid">${cardsHtml}</div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 450);
}
