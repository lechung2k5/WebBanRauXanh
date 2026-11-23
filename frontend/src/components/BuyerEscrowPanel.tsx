'use client';

import { useEffect, useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { confirmBuyerDepositApi, getBuyerContractsApi, getBuyerDepositQrApi } from '@/services/api';

type Contract = { id: number; contract_code?: string; contractCode?: string; status?: string; deposit_30_amount?: number; depositAmount?: number; deposit_received?: number };

export default function BuyerEscrowPanel() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [qr, setQr] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState('');

  const load = () => getBuyerContractsApi().then((items) => { const list = items as Contract[]; setContracts(list); if (!selected && list.length) setSelected(list[0]); }).catch((error) => setMessage(error instanceof Error ? error.message : 'Không thể tải hợp đồng'));
  useEffect(() => { load(); }, []);

  async function openQr(contract: Contract) {
    try { setSelected(contract); setQr(await getBuyerDepositQrApi(contract.id)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể tạo QR đặt cọc'); }
  }

  async function confirm() {
    if (!selected) return;
    try { await confirmBuyerDepositApi(selected.id); setMessage('Đã xác nhận đặt cọc giả lập.'); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể xác nhận đặt cọc'); }
  }

  return <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm space-y-5"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Escrow / VietQR</p><h2 className="font-heading text-2xl font-black text-[#0C4A6E] mt-1">Ký quỹ bảo chứng 30%</h2><p className="text-sm text-slate-500 mt-1">Xác nhận cọc theo hợp đồng thật của Buyer.</p></div><button type="button" onClick={load} className="p-2 rounded-xl border border-slate-200"><RefreshCw className="w-4 h-4" /></button></div>{message && <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}<div className="space-y-3">{contracts.map((contract) => <div key={contract.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4"><div><p className="font-bold text-[#0C4A6E]">{contract.contract_code || contract.contractCode}</p><p className="text-xs text-slate-500 mt-1">Trạng thái: {contract.status} · Cọc: {Number(contract.deposit_30_amount || contract.depositAmount || 0).toLocaleString('vi-VN')} đ</p></div><button type="button" onClick={() => openQr(contract)} className="rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white">Xem QR cọc</button></div>)}{contracts.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Chưa có hợp đồng cần đặt cọc.</p>}</div>{selected && qr && <div className="grid md:grid-cols-2 items-center gap-5 rounded-2xl bg-orange-50 p-5"><div><p className="text-sm font-bold text-[#0C4A6E]">{String(qr.contractCode)}</p><p className="mt-2 text-2xl font-black text-orange-600">{Number(qr.amount || 0).toLocaleString('vi-VN')} đ</p><p className="mt-2 text-xs text-slate-600">{String(qr.bank)} · STK {String(qr.accountNumber)} · Nội dung {String(qr.transferContent)}</p><button type="button" onClick={confirm} className="mt-4 rounded-xl bg-[#0C4A6E] px-4 py-3 text-sm font-bold text-white">Xác nhận đã chuyển khoản giả lập</button></div><div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white text-center text-xs text-slate-500"><CreditCard className="mr-2 h-5 w-5" /> QR VietQR giả lập</div></div>}</div>;
}
