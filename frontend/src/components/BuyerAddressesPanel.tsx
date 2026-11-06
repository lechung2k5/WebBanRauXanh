'use client';

import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { deleteBuyerAddressApi, getBuyerAddressesApi, saveBuyerAddressApi, type BuyerAddress } from '@/services/api';

export default function BuyerAddressesPanel() {
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [form, setForm] = useState({ name: '', address: '', phone: '', defaultWarehouse: false });
  const [message, setMessage] = useState('');

  const load = () => getBuyerAddressesApi().then(setAddresses).catch((error) => setMessage(error instanceof Error ? error.message : 'Không thể tải địa chỉ'));
  useEffect(() => { load(); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const saved = await saveBuyerAddressApi(form);
      setAddresses((items) => form.defaultWarehouse
        ? [saved, ...items.filter((item) => item.id !== saved.id).map((item) => ({ ...item, defaultWarehouse: false }))]
        : [...items.filter((item) => item.id !== saved.id), saved]);
      setForm({ name: '', address: '', phone: '', defaultWarehouse: false });
      setMessage('Đã lưu địa chỉ nhận hàng.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể lưu địa chỉ'); }
  }

  async function remove(id: number) {
    try { await deleteBuyerAddressApi(id); setAddresses((items) => items.filter((item) => item.id !== id)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể xóa địa chỉ'); }
  }

  return <div className="grid lg:grid-cols-[1fr_360px] gap-5">
    <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-sky-600 uppercase tracking-wider">Delivery locations</p><h2 className="font-heading text-2xl font-black text-[#0C4A6E] mt-1">Địa chỉ nhận hàng</h2><p className="text-sm text-slate-500 mt-1">Lưu nhiều kho nhận và chọn địa chỉ mặc định.</p></div><MapPin className="w-7 h-7 text-sky-600" /></div>
      {message && <p className="mt-4 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800">{message}</p>}
      <div className="mt-5 space-y-3">{addresses.map((item) => <div key={item.id} className={`p-4 rounded-2xl border ${item.defaultWarehouse ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#0C4A6E]">{item.name} {item.defaultWarehouse && <span className="ml-2 text-[10px] px-2 py-1 rounded-full bg-emerald-200 text-emerald-800">Mặc định</span>}</p><p className="text-sm text-slate-600 mt-1">{item.address}</p><p className="text-xs text-slate-500 mt-1">{item.phone || 'Chưa có số điện thoại'}</p></div><button type="button" onClick={() => remove(item.id)} className="p-2 rounded-lg text-red-600 hover:bg-red-100" title="Xóa địa chỉ"><Trash2 className="w-4 h-4" /></button></div></div>)}{addresses.length === 0 && <div className="py-12 text-center text-sm text-slate-500">Chưa có địa chỉ nhận hàng.</div>}</div>
    </div>
    <form onSubmit={submit} className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-4"><h3 className="font-bold text-[#0C4A6E] flex items-center gap-2"><Plus className="w-4 h-4" /> Thêm địa chỉ</h3><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên kho / chi nhánh" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /><textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Địa chỉ chi tiết" rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Số điện thoại kho" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.defaultWarehouse} onChange={(e) => setForm({ ...form, defaultWarehouse: e.target.checked })} /> Đặt làm địa chỉ mặc định</label><button type="submit" className="w-full rounded-xl bg-[#0C4A6E] text-white py-3 font-bold">Lưu địa chỉ</button></form>
  </div>;
}
