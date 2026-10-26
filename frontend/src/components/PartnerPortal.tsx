'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { api, portalFor } from '@/services/auth';
import { GoogleButton } from './AuthForm';
import { DataTable, FormDialog, lotFields, epodFields, type Row, type Field } from './admin/AdminConsole';
import type { AuthResponse } from '@/types';

const titles: Record<string, string> = { farmer: 'Portal Nông trại', buyer: 'Portal Thương lái', 'warehouse-qc': 'Portal Trạm QC', driver: 'Portal Tài xế', accountant: 'Portal Kế toán' };
export default function PartnerPortal({ role }: { role: string }) {
  const { currentUser, authLoading, setCurrentUser, logout } = useApp(); const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]); const [contracts, setContracts] = useState<Row[]>([]); const [error, setError] = useState(''); const [dialog, setDialog] = useState<{ title: string; fields: Field[]; submit: (values: Row) => Promise<unknown> } | null>(null);
  const expected = `ROLE_${role.toUpperCase().replaceAll('-', '_')}`; const permitted = currentUser?.roles.includes(expected);
  useEffect(() => { if (!authLoading && !currentUser) router.replace('/dang-nhap'); else if (!authLoading && currentUser && !permitted) router.replace(portalFor(currentUser.roles)); }, [authLoading, currentUser, permitted, router]);
  const load = useCallback(async () => {
    if (!permitted) return;
    try {
      if (role === 'farmer') { setRows(await api<Row[]>('harvest-lots/my-lots')); setContracts(await api<Row[]>('portal/contracts')); }
      if (role === 'buyer') { setRows(await api<Row[]>('buyer/shipments')); setContracts(await api<Row[]>('portal/contracts')); }
      if (role === 'driver') setRows(await api<Row[]>('driver/shipments'));
      if (role === 'warehouse-qc') setRows(await api<Row[]>('hub-inspections'));
      if (role === 'accountant') { const report = await api<{ entries: Row[]; documents: Row[] }>('accounting/reports'); setRows(report.entries); setContracts(report.documents); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được dữ liệu'); }
  }, [permitted, role]);
  useEffect(() => { void load(); }, [load]);
  const open = (title: string, endpoint: string, fields: Field[], method = 'POST', extra: Row = {}) => setDialog({ title, fields, submit: values => api(endpoint, method, { ...values, ...extra }) });
  const btn = (text: string, action: () => void) => <button className="rounded-lg border border-green-200 text-green-900 text-sm px-3 py-2" onClick={action}>{text}</button>;
  if (authLoading || !currentUser || !permitted) return <main className="p-12">Đang xác thực tài khoản…</main>;
  const profile = () => {
    const fields: Field[] = [{ name: 'companyName', label: 'Tên đơn vị / Nông trại', value: currentUser.companyName || '' }, { name: 'phone', label: 'Điện thoại', value: currentUser.phone || '' }, { name: 'address', label: 'Địa chỉ', value: currentUser.address || '' }, { name: 'taxCode', label: 'Mã số thuế', value: currentUser.taxCode || '', optional: role === 'farmer' && currentUser.householdFarmer }];
    if (role === 'buyer') fields.push({ name: 'warehouseAddress', label: 'Kho tiếp nhận', value: currentUser.warehouseAddress || '' });
    else fields.push({ name: 'bankName', label: 'Ngân hàng', value: currentUser.bankName || '' }, { name: 'bankAccountNo', label: 'Số tài khoản', value: currentUser.bankAccountNo || '' }, { name: 'pucCode', label: 'Mã vùng trồng PUC', value: currentUser.pucCode || '', optional: true }, { name: 'certification', label: 'Chứng nhận', value: currentUser.certification || '', optional: true }, { name: 'householdType', label: 'Loại hình', options: ['Hộ nông dân', 'HTX / Doanh nghiệp'], value: currentUser.householdFarmer ? 'Hộ nông dân' : 'HTX / Doanh nghiệp' });
    fields.push({ name: 'certificationUrl', label: 'Ảnh / Tài liệu chứng nhận (HTTPS)', type: 'url', value: currentUser.certificationUrl || '', optional: true });
    setDialog({ title: 'Cập nhật hồ sơ B2B', fields, submit: async values => { const user = await api<AuthResponse>('auth/profile', 'PUT', { ...values, isHouseholdFarmer: values.householdType === 'Hộ nông dân' }); setCurrentUser(user); } });
  };
  return <main className="min-h-screen bg-[#F5F6F2] p-4 sm:p-8"><div className="max-w-6xl mx-auto space-y-6"><header className="flex flex-wrap justify-between gap-4 items-center"><div><Link href="/" className="text-green-800 font-bold">← HoNa Fresh</Link><h1 className="text-2xl font-bold mt-3">{titles[role]}</h1><p className="text-sm mt-1">Xin chào {currentUser.fullName}</p></div>{btn('Đăng xuất', () => void logout().then(() => router.replace('/dang-nhap')))}</header>
    {error && <p role="alert" className="bg-red-50 text-red-800 p-3 rounded-xl">{error}</p>}
    {['farmer', 'buyer'].includes(role) && <section className="bg-white p-5 border rounded-2xl space-y-3"><h2 className="font-semibold">Hồ sơ đối tác · {currentUser.kycStatus}</h2><p className="text-sm">{currentUser.companyName || 'Chưa bổ sung tên đơn vị'} · {currentUser.profileComplete ? 'Đã đủ thông tin' : 'Cần hoàn thiện hồ sơ'}</p>{currentUser.kycNote && <p className="text-sm">Ghi chú kiểm duyệt: {currentUser.kycNote}</p>}{btn('Cập nhật hồ sơ', profile)}<p className="text-xs text-gray-500">Hồ sơ cập nhật sẽ được gửi Admin xét duyệt lại trước giao dịch.</p></section>}
    <div className="flex flex-wrap gap-3">{btn('Tải lại', () => void load())}{role === 'farmer' && btn('Đăng lô vụ mùa', () => open('Đăng lô nông sản', 'farmer/lots', lotFields))}{role === 'buyer' && <Link href="/lo-hang" className="rounded-xl px-4 py-2 bg-green-900 text-white">Xem lô và gửi RFQ</Link>}{role === 'warehouse-qc' && btn('Lập kiểm định QC', () => open('Kiểm định tại trạm', 'hub-inspections', [{ name: 'contractId', label: 'ID hợp đồng đã nhận cọc', type: 'number' }, { name: 'coldRoomId', label: 'ID buồng lạnh', type: 'number' }, { name: 'receivedWeightKg', label: 'Khối lượng nhận (kg)', type: 'number' }, { name: 'qualifiedWeightKg', label: 'Khối lượng đạt (kg)', type: 'number' }, { name: 'brix', label: 'Brix', type: 'number', value: 0 }, { name: 'moisture', label: 'Độ ẩm (%)', type: 'number', value: 85 }, { name: 'note', label: 'Ghi chú' }]))}{role === 'accountant' && btn('In / Lưu PDF', () => window.print())}</div>
    <DataTable rows={rows} columns={role === 'farmer' ? [['id', 'ID'], ['lot_code', 'Mã lô'], ['product_name', 'Nông sản'], ['available_weight_kg', 'Còn lại (kg)'], ['status', 'Trạng thái']] : role === 'warehouse-qc' ? [['inspection_code', 'Biên bản'], ['contract_code', 'Hợp đồng'], ['qualified_weight_kg', 'Đạt (kg)'], ['expiry_date', 'Hết hạn'], ['fefo_priority_score', 'Số ngày còn lại']] : role === 'accountant' ? [['contract_code', 'Hợp đồng'], ['event', 'Nghiệp vụ'], ['reference', 'Tham chiếu'], ['created_at', 'Thời gian']] : [['id', 'ID'], ['shipment_code', 'Mã chuyến'], ['contract_id', 'ID hợp đồng'], ['delivery_address', 'Kho giao'], ['loaded_weight_kg', 'Khối lượng (kg)'], ['status', 'Trạng thái']]} actions={role === 'buyer' ? row => row.status === 'IN_TRANSIT' && btn('Ký ePOD', () => open('Xác nhận nhận hàng', `buyer/shipments/${row.id}/epod`, epodFields)) : undefined} />
    {!!contracts.length && <><h2 className="font-semibold">{role === 'accountant' ? 'Bảng kê nội bộ' : 'Hợp đồng của tôi'}</h2><DataTable rows={contracts} columns={role === 'accountant' ? [['contract_code', 'Hợp đồng'], ['company_name', 'Đơn vị'], ['document_type', 'Bảng kê'], ['payout_amount', 'Giải ngân']] : [['id', 'ID'], ['contract_code', 'Hợp đồng'], ['offered_weight_kg', 'Khối lượng'], ['total_goods_amount', 'Giá trị'], ['status', 'Trạng thái']]} actions={role === 'farmer' ? row => row.status === 'RFQ_SENT' && btn('Chấp nhận RFQ', () => open('Chấp nhận khối lượng và đơn giá RFQ', `farmer/contracts/${row.id}/agree`, [])) : role === 'accountant' ? undefined : undefined} /></>}
    <section className="border rounded-2xl p-5 bg-white space-y-3"><h2 className="font-semibold">Bảo mật tài khoản</h2><GoogleButton onCredential={idToken => { api('auth/google-link', 'POST', { idToken }).then(() => setError('Đã liên kết Google')).catch(e => setError(String(e))); }} />{btn('Thu hồi tất cả phiên', () => open('Đăng xuất mọi thiết bị', 'auth/logout-all', []))}</section>
    {dialog && <FormDialog value={dialog} onClose={() => setDialog(null)} onDone={() => { setDialog(null); void load(); }} />}
  </div></main>;
}
