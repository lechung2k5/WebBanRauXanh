'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, LockKeyhole, Save, UserRound } from 'lucide-react';
import { getBuyerProfileApi, updateBuyerProfileApi, type BuyerProfile, type BuyerProfileUpdate } from '@/services/api';

const emptyForm: BuyerProfileUpdate = { companyName: '', fullName: '', taxCode: '', contactName: '', phone: '', address: '', warehouseAddress: '', contactPhone: '' };

export default function BuyerProfilePanel() {
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [form, setForm] = useState<BuyerProfileUpdate>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getBuyerProfileApi().then((data) => {
      setProfile(data);
      setForm({ companyName: data.companyName || '', fullName: data.fullName || '', taxCode: data.taxCode || '', contactName: data.contactName || data.fullName || '', phone: data.phone || '', address: data.address || '', warehouseAddress: data.warehouseAddress || '', contactPhone: data.contactPhone || data.phone || '' });
    }).catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải hồ sơ Buyer')).finally(() => setLoading(false));
  }, []);

  const setField = (key: keyof BuyerProfileUpdate, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setMessage(''); setError('');
    try {
      const updated = await updateBuyerProfileApi(form);
      setProfile(updated);
      setMessage('Đã cập nhật thông tin Buyer thành công.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật hồ sơ Buyer');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="bg-white rounded-3xl border border-sky-100 p-12 text-center text-slate-500">Đang tải hồ sơ Buyer...</div>;

  const inputClass = 'w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100';
  return <div className="space-y-5">
    <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center"><UserRound className="w-7 h-7" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">TÀI KHOẢN BUYER</p><h2 className="text-2xl font-black text-slate-800">Trang cá nhân</h2><p className="text-sm text-slate-500">Sửa thông tin nếu có sai sót để dùng đúng khi đặt hàng và nhận hàng.</p></div></div>
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-4 text-sm font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{message}</div>}
    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 p-4 text-sm font-bold">{error}</div>}
    <form onSubmit={submit} className="bg-white rounded-3xl border border-sky-100 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="grid md:grid-cols-2 gap-5">
        <label className="text-sm font-bold text-slate-700">Tên đăng nhập<input value={profile?.username || ''} disabled className={`${inputClass} mt-2 bg-slate-100 text-slate-500`} /><span className="text-[11px] font-normal text-slate-400 mt-1 block">Không thể sửa tên đăng nhập.</span></label>
        <label className="text-sm font-bold text-slate-700">Email<input value={profile?.email || ''} disabled className={`${inputClass} mt-2 bg-slate-100 text-slate-500`} /><span className="text-[11px] font-normal text-slate-400 mt-1 flex items-center gap-1"><LockKeyhole className="w-3 h-3" /> Email dùng để xác thực tài khoản.</span></label>
        <label className="text-sm font-bold text-slate-700">Họ và tên *<input required value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} className={`${inputClass} mt-2`} /></label>
        <label className="text-sm font-bold text-slate-700">Số điện thoại<input value={form.phone || ''} onChange={(e) => setField('phone', e.target.value)} className={`${inputClass} mt-2`} /></label>
        <label className="text-sm font-bold text-slate-700">Tên công ty / cửa hàng *<input required value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} className={`${inputClass} mt-2`} /></label>
        <label className="text-sm font-bold text-slate-700">Mã số thuế<input value={form.taxCode || ''} onChange={(e) => setField('taxCode', e.target.value)} className={`${inputClass} mt-2`} /></label>
        <label className="text-sm font-bold text-slate-700 md:col-span-2">Địa chỉ cá nhân / địa chỉ liên hệ<textarea rows={2} value={form.address || ''} onChange={(e) => setField('address', e.target.value)} className={`${inputClass} mt-2 resize-none`} /></label>
        <label className="text-sm font-bold text-slate-700 md:col-span-2">Địa chỉ kho nhận mặc định<textarea rows={2} value={form.warehouseAddress || ''} onChange={(e) => setField('warehouseAddress', e.target.value)} className={`${inputClass} mt-2 resize-none`} /></label>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-5"><p className="text-xs text-slate-500">Trạng thái KYC: <b className={profile?.kycStatus === 'VERIFIED' ? 'text-emerald-700' : 'text-amber-700'}>{profile?.kycStatus || 'PENDING'}</b></p><button disabled={saving} type="submit" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-700 text-white font-bold text-sm hover:bg-sky-800 disabled:opacity-60"><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Lưu thông tin'}</button></div>
    </form>
  </div>;
}
