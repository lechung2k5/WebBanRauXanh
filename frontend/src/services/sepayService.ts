/**
 * Dịch vụ Thanh toán Quét Mã VietQR SePay dành cho HoNa Fresh
 */

export interface BankAccountInfo {
  bankName: string;
  bankCode: string;
  bankBin: string;
  accountNumber: string;
  accountName: string;
}

export const DEFAULT_BANK_INFO: BankAccountInfo = {
  bankName: 'MB Bank (Ngân Hàng Quân Đội)',
  bankCode: 'MB',
  bankBin: '970422',
  accountNumber: '0987654321',
  accountName: 'CONG TY HO NA FRESH',
};

/**
 * Tạo link ảnh mã VietQR chuẩn ngân hàng
 */
export function generateVietQrUrl({
  accountNumber = DEFAULT_BANK_INFO.accountNumber,
  bankBin = DEFAULT_BANK_INFO.bankBin,
  amount,
  content,
  accountName = DEFAULT_BANK_INFO.accountName,
}: {
  accountNumber?: string;
  bankBin?: string;
  amount: number;
  content: string;
  accountName?: string;
}): string {
  const cleanContent = encodeURIComponent(content.trim().toUpperCase());
  const cleanName = encodeURIComponent(accountName.trim());
  return `https://api.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?amount=${Math.round(
    amount
  )}&addInfo=${cleanContent}&accountName=${cleanName}`;
}

/**
 * Kiểm tra trạng thái thanh toán của Đơn hàng từ máy chủ
 */
export async function checkOrderPaymentStatus(orderCode: string): Promise<{
  found: boolean;
  isPaid: boolean;
  status: string;
  totalAmount?: number;
}> {
  try {
    const res = await fetch(`/api/backend/sepay/check-order/${encodeURIComponent(orderCode)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return { found: false, isPaid: false, status: 'UNKNOWN' };
    return await res.json();
  } catch {
    return { found: false, isPaid: false, status: 'UNKNOWN' };
  }
}

/**
 * Kiểm tra trạng thái nộp cọc của Hợp đồng sỉ từ máy chủ
 */
export async function checkContractDepositStatus(contractCode: string): Promise<{
  found: boolean;
  isDepositPaid: boolean;
  depositStatus: string;
  status: string;
  depositAmount?: number;
}> {
  try {
    const res = await fetch(`/api/backend/sepay/check-contract/${encodeURIComponent(contractCode)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return { found: false, isDepositPaid: false, depositStatus: 'UNKNOWN', status: 'UNKNOWN' };
    return await res.json();
  } catch {
    return { found: false, isDepositPaid: false, depositStatus: 'UNKNOWN', status: 'UNKNOWN' };
  }
}

