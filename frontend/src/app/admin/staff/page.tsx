'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserCog,
  Truck,
  ShieldCheck,
  Warehouse,
  Search,
  PlusCircle,
  Edit3,
  Trash2,
  RotateCw,
  CheckCircle2,
  Phone,
  Award,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  fleetDispatchApi,
  DEFAULT_OFFICIAL_HUBS,
  WarehouseHubDto,
  FleetDriverDto,
} from '@/services/fleetDispatchApi';

type StaffRole = 'DRIVER' | 'QC_TECH' | 'WH_STAFF' | 'DISPATCH' | 'ACCOUNTANT';

function getStaffRole(licenseClass?: string): StaffRole {
  const lc = String(licenseClass || '').toUpperCase();
  if (lc === 'QC_TECH') return 'QC_TECH';
  if (lc === 'WH_STAFF') return 'WH_STAFF';
  if (lc === 'DISPATCH') return 'DISPATCH';
  if (lc === 'ACCOUNTANT') return 'ACCOUNTANT';
  return 'DRIVER';
}

function formatStaffStatusVi(status?: string): string {
  const s = String(status || '').toUpperCase();
  if (s === 'AVAILABLE') return 'Sẵn sàng làm việc';
  if (s === 'ASSIGNED') return 'Đã phân công';
  if (s === 'ON_TRIP') return 'Đang chạy chuyến';
  if (s === 'OFF_DUTY') return 'Nghỉ phép / Tạm ngưng';
  return status || 'Sẵn sàng làm việc';
}

const ROLE_META: Record<
  StaffRole,
  { label: string; shortLabel: string; badgeClass: string; idLabel: string; prefix: string }
> = {
  DRIVER: {
    label: 'Tài xế xe lạnh',
    shortLabel: 'Tài xế',
    badgeClass: 'text-purple-800 bg-purple-50 border-purple-200',
    idLabel: 'Số GPLX',
    prefix: 'DRV',
  },
  QC_TECH: {
    label: 'KTV Kiểm định QC',
    shortLabel: 'KTV QC',
    badgeClass: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    idLabel: 'Mã chứng chỉ QC',
    prefix: 'KTV',
  },
  WH_STAFF: {
    label: 'Nhân viên kho',
    shortLabel: 'NV Kho',
    badgeClass: 'text-amber-800 bg-amber-50 border-amber-200',
    idLabel: 'Mã thẻ nhân viên kho',
    prefix: 'KHO',
  },
  DISPATCH: {
    label: 'Điều phối viên',
    shortLabel: 'Điều phối',
    badgeClass: 'text-sky-800 bg-sky-50 border-sky-200',
    idLabel: 'Mã thẻ điều phối',
    prefix: 'DPV',
  },
  ACCOUNTANT: {
    label: 'Kế toán đối soát',
    shortLabel: 'Kế toán',
    badgeClass: 'text-rose-800 bg-rose-50 border-rose-200',
    idLabel: 'Mã chứng chỉ kế toán',
    prefix: 'KTO',
  },
};

export default function AdminStaffPage() {
  const [hubs] = useState<WarehouseHubDto[]>(DEFAULT_OFFICIAL_HUBS);
  const [selectedHubId, setSelectedHubId] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hona_admin_selected_hub_id');
      if (saved) return Number(saved);
    }
    return 2;
  });

  const [staffList, setStaffList] = useState<FleetDriverDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'ALL' | StaffRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'BUSY' | 'OFF_DUTY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal Create / Edit
  const [formOpen, setFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<FleetDriverDto | null>(null);
  const [formWarehouseId, setFormWarehouseId] = useState<number>(selectedHubId);
  const [formRole, setFormRole] = useState<StaffRole>('DRIVER');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formLicenseNo, setFormLicenseNo] = useState('');
  const [formLicenseClass, setFormLicenseClass] = useState('C');
  const [formExperience, setFormExperience] = useState<number>(2);
  const [formStatus, setFormStatus] = useState<'AVAILABLE' | 'OFF_DUTY'>('AVAILABLE');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal Delete Confirm
  const [deletingStaff, setDeletingStaff] = useState<FleetDriverDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    const onHubChanged = (e: Event) => {
      const custom = e as CustomEvent<number>;
      if (custom.detail) {
        setSelectedHubId(Number(custom.detail));
      }
    };
    window.addEventListener('hona-admin-hub-changed', onHubChanged);
    return () => window.removeEventListener('hona-admin-hub-changed', onHubChanged);
  }, []);

  const loadStaff = useCallback(async (hubId: number) => {
    setLoading(true);
    try {
      const data = await fleetDispatchApi.getDrivers(hubId).catch(() => []);
      setStaffList(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff(selectedHubId);
  }, [selectedHubId, loadStaff]);

  const currentHub = useMemo(
    () => hubs.find((h) => h.id === selectedHubId) || hubs[0],
    [hubs, selectedHubId]
  );

  const handleHubSelectChange = (nextHubId: number) => {
    setSelectedHubId(nextHubId);
    try {
      sessionStorage.setItem('hona_admin_selected_hub_id', String(nextHubId));
      localStorage.setItem('hona_admin_selected_hub_id', String(nextHubId));
      window.dispatchEvent(new CustomEvent('hona-admin-hub-changed', { detail: nextHubId }));
    } catch {}
  };

  const openCreateModal = (defaultRole: StaffRole = 'DRIVER') => {
    setEditingStaff(null);
    setFormWarehouseId(selectedHubId);
    setFormRole(defaultRole);
    const autoCode = `${ROLE_META[defaultRole].prefix}-${Date.now().toString().slice(-4)}`;
    setFormCode(autoCode);
    setFormName('');
    setFormPhone('');
    setFormLicenseNo('');
    setFormLicenseClass(defaultRole === 'DRIVER' ? 'C' : defaultRole);
    setFormExperience(2);
    setFormStatus('AVAILABLE');
    const autoUser = autoCode.toLowerCase().replace(/-/g, '_');
    setFormUsername(autoUser);
    setFormEmail(`${autoUser}@honafresh.vn`);
    setFormPassword('');
    setFormOpen(true);
  };

  const openEditModal = (staff: FleetDriverDto) => {
    const role = getStaffRole(staff.licenseClass);
    setEditingStaff(staff);
    setFormWarehouseId(staff.warehouseId || selectedHubId);
    setFormRole(role);
    setFormCode(staff.driverCode);
    setFormName(staff.fullName);
    setFormPhone(staff.phone);
    setFormLicenseNo(staff.licenseNumber);
    setFormLicenseClass(role === 'DRIVER' ? staff.licenseClass : role);
    setFormExperience(staff.experienceYears || 1);
    setFormStatus(staff.status === 'OFF_DUTY' ? 'OFF_DUTY' : 'AVAILABLE');
    setFormUsername(staff.username || staff.driverCode.toLowerCase().replace(/-/g, '_'));
    setFormEmail(staff.email || `${staff.driverCode.toLowerCase().replace(/-/g, '.')}@honafresh.vn`);
    setFormPassword('');
    setFormOpen(true);
  };

  const handleSaveStaff = async () => {
    if (!formCode.trim() || !formName.trim() || !formPhone.trim() || !formUsername.trim() || !formEmail.trim()) {
      alert('Vui lòng nhập đầy đủ mã nhân viên, họ tên, số điện thoại, username và email.');
      return;
    }
    if (!editingStaff && formPassword.length < 6) {
      alert('Vui lòng nhập mật khẩu (tối thiểu 6 ký tự) khi tạo nhân viên mới.');
      return;
    }
    if (editingStaff && formPassword && formPassword.length < 6) {
      alert('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        warehouseId: formWarehouseId,
        driverCode: formCode.trim().toUpperCase(),
        fullName: formName.trim(),
        phone: formPhone.trim(),
        licenseNumber:
          formLicenseNo.trim() ||
          `${formRole === 'QC_TECH' ? 'QC' : formRole === 'WH_STAFF' ? 'WH' : 'GPLX'}-${Date.now().toString().slice(-6)}`,
        licenseClass: formRole === 'DRIVER' ? formLicenseClass : formRole,
        experienceYears: Number(formExperience) || 1,
        status: formStatus,
        username: formUsername.trim().toLowerCase(),
        email: formEmail.trim().toLowerCase(),
      };
      if (formPassword) {
        payload.password = formPassword;
      }
      if (editingStaff) {
        await fleetDispatchApi.updateDriver(editingStaff.id, payload);
        showToast(`Đã cập nhật thông tin nhân viên ${formName.trim()}!`);
      } else {
        await fleetDispatchApi.createDriver(payload);
        showToast(`Đã thêm ${ROLE_META[formRole].label} ${formName.trim()}!`);
      }
      setFormOpen(false);
      await loadStaff(selectedHubId);
    } catch (err: any) {
      alert(err?.message || 'Không thể lưu thông tin nhân viên.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (staff: FleetDriverDto) => {
    const nextStatus = staff.status === 'AVAILABLE' ? 'OFF_DUTY' : 'AVAILABLE';
    try {
      await fleetDispatchApi.updateDriverStatus(staff.id, nextStatus);
      showToast(
        `Đã chuyển ${staff.fullName} sang ${nextStatus === 'AVAILABLE' ? 'Sẵn sàng làm việc' : 'Nghỉ phép / Tạm ngưng'}`
      );
      await loadStaff(selectedHubId);
    } catch (err: any) {
      alert(err?.message || 'Không thể cập nhật trạng thái.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    setDeleting(true);
    try {
      await fleetDispatchApi.deleteDriver(deletingStaff.id);
      showToast(`Đã xóa nhân viên ${deletingStaff.fullName} khỏi hệ thống!`);
      setDeletingStaff(null);
      await loadStaff(selectedHubId);
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa nhân viên này.');
    } finally {
      setDeleting(false);
    }
  };

  const counts = useMemo(() => {
    const driverCount = staffList.filter((s) => getStaffRole(s.licenseClass) === 'DRIVER').length;
    const qcCount = staffList.filter((s) => getStaffRole(s.licenseClass) === 'QC_TECH').length;
    const whCount = staffList.filter((s) => getStaffRole(s.licenseClass) === 'WH_STAFF').length;
    const dispatchCount = staffList.filter((s) => getStaffRole(s.licenseClass) === 'DISPATCH').length;
    const accountantCount = staffList.filter((s) => getStaffRole(s.licenseClass) === 'ACCOUNTANT').length;
    return { total: staffList.length, driverCount, qcCount, whCount, dispatchCount, accountantCount };
  }, [staffList]);

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffList.filter((s) => {
      const role = getStaffRole(s.licenseClass);
      if (roleFilter !== 'ALL' && role !== roleFilter) return false;
      if (statusFilter === 'AVAILABLE' && s.status !== 'AVAILABLE') return false;
      if (statusFilter === 'OFF_DUTY' && s.status !== 'OFF_DUTY') return false;
      if (statusFilter === 'BUSY' && s.status !== 'ASSIGNED' && s.status !== 'ON_TRIP') return false;
      if (
        q &&
        !s.fullName.toLowerCase().includes(q) &&
        !s.driverCode.toLowerCase().includes(q) &&
        !s.phone.toLowerCase().includes(q) &&
        !(s.username || '').toLowerCase().includes(q) &&
        !(s.email || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [staffList, roleFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-20">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-700">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Header + Hub Switcher */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#10542C] text-white flex items-center justify-center shrink-0">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Quản Lý Nhân Viên Kho & Vận Hành
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý tập trung Tài xế xe lạnh, KTV Kiểm định QC và Nhân viên kho tại{' '}
              <strong className="text-[#10542C]">{currentHub.hubName}</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Warehouse className="w-4 h-4 text-[#10542C]" />
            <select
              value={selectedHubId}
              onChange={(e) => handleHubSelectChange(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.hubName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => openCreateModal('DRIVER')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10542C] hover:bg-[#0d4624] text-white text-xs font-bold transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Thêm Nhân Viên</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase block">Tổng nhân sự kho</span>
          <strong className="text-2xl font-black text-slate-900 font-mono">{counts.total}</strong>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-purple-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-600 uppercase block">Tài xế xe lạnh</span>
          <strong className="text-2xl font-black text-purple-900 font-mono">{counts.driverCount}</strong>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase block">KTV Kiểm định QC</span>
          <strong className="text-2xl font-black text-emerald-900 font-mono">{counts.qcCount}</strong>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase block">Nhân viên kho</span>
          <strong className="text-2xl font-black text-amber-900 font-mono">{counts.whCount}</strong>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-sky-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-sky-600 uppercase block">Điều phối & Kế toán</span>
          <strong className="text-2xl font-black text-sky-900 font-mono">
            {counts.dispatchCount + counts.accountantCount}
          </strong>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            {[
              { key: 'ALL' as const, label: `Tất cả (${counts.total})` },
              { key: 'DRIVER' as const, label: `Tài xế (${counts.driverCount})` },
              { key: 'QC_TECH' as const, label: `KTV QC (${counts.qcCount})` },
              { key: 'WH_STAFF' as const, label: `NV Kho (${counts.whCount})` },
              { key: 'DISPATCH' as const, label: `Điều phối (${counts.dispatchCount})` },
              { key: 'ACCOUNTANT' as const, label: `Kế toán (${counts.accountantCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setRoleFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  roleFilter === tab.key ? 'bg-white text-[#10542C] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="AVAILABLE">Sẵn sàng làm việc</option>
            <option value="BUSY">Đang chạy chuyến</option>
            <option value="OFF_DUTY">Nghỉ phép / Tạm ngưng</option>
          </select>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, mã NV, SĐT..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#10542C]"
          />
        </div>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 flex flex-col items-center gap-3">
          <RotateCw className="w-7 h-7 text-[#10542C] animate-spin" />
          <span className="text-xs font-bold text-slate-500">Đang tải danh sách nhân sự kho...</span>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <p className="text-sm font-bold text-slate-700">Chưa có nhân viên nào phù hợp với bộ lọc.</p>
          <button
            type="button"
            onClick={() => openCreateModal(roleFilter === 'ALL' ? 'DRIVER' : roleFilter)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10542C] text-white text-xs font-bold cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Thêm nhân viên mới</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((s) => {
            const role = getStaffRole(s.licenseClass);
            const meta = ROLE_META[role];
            const isAvail = s.status === 'AVAILABLE';
            const isBusy = s.status === 'ASSIGNED' || s.status === 'ON_TRIP';

            return (
              <div
                key={s.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3 hover:border-emerald-300 transition"
              >
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      {role === 'QC_TECH' ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-700" />
                      ) : role === 'WH_STAFF' ? (
                        <Warehouse className="w-5 h-5 text-amber-700" />
                      ) : (
                        <Truck className="w-5 h-5 text-purple-700" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <strong className="text-sm font-bold text-slate-900 block truncate">{s.fullName}</strong>
                      <span className="font-mono text-[10px] text-slate-500">{s.driverCode}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold shrink-0 ${
                      isAvail
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isBusy
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {formatStaffStatusVi(s.status)}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Vai trò:</span>
                    <span className={`font-bold px-2 py-0.5 rounded border ${meta.badgeClass}`}>
                      {role === 'DRIVER' ? `Tài xế (Hạng ${s.licenseClass})` : meta.label}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Số điện thoại:</span>
                    <strong className="font-mono text-slate-800 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {s.phone}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{meta.idLabel}:</span>
                    <span className="font-mono text-slate-700">{s.licenseNumber}</span>
                  </div>
                  {s.username && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tài khoản:</span>
                      <span className="font-mono font-bold text-[#10542C]">{s.username}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex justify-between gap-2 text-slate-600">
                      <span className="shrink-0">Email:</span>
                      <span className="text-slate-700 truncate">{s.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Kinh nghiệm:</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-500" />
                      {s.experienceYears} năm
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleToggleStatus(s)}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition cursor-pointer disabled:opacity-50 ${
                      isAvail
                        ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        : 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {isAvail ? 'Chuyển Nghỉ' : 'Kích Hoạt'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(s)}
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-[#10542C] hover:border-emerald-300 hover:bg-emerald-50 transition cursor-pointer"
                      title="Chỉnh sửa thông tin"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setDeletingStaff(s)}
                      className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition cursor-pointer"
                      title="Xóa nhân viên"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm / Sửa Nhân Viên */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingStaff ? `Cập Nhật Nhân Viên (${editingStaff.driverCode})` : 'Thêm Nhân Viên Mới'}
                </h3>
                <p className="text-xs text-slate-500">Phân bổ đúng vai trò và kho trực thuộc</p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-xl text-xs font-bold">
              {(['DRIVER', 'QC_TECH', 'WH_STAFF', 'DISPATCH', 'ACCOUNTANT'] as StaffRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setFormRole(role);
                    if (!editingStaff) {
                      setFormCode(`${ROLE_META[role].prefix}-${Date.now().toString().slice(-4)}`);
                    }
                    if (role === 'DRIVER' && ['QC_TECH', 'WH_STAFF', 'DISPATCH', 'ACCOUNTANT'].includes(formLicenseClass)) {
                      setFormLicenseClass('C');
                    }
                  }}
                  className={`py-2 px-2 rounded-lg transition cursor-pointer ${
                    formRole === role ? 'bg-[#10542C] text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {ROLE_META[role].shortLabel}
                </button>
              ))}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kho / Trạm công tác *</label>
                <select
                  value={formWarehouseId}
                  onChange={(e) => setFormWarehouseId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white font-semibold"
                >
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.hubName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mã nhân viên *</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số điện thoại *</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                    placeholder="0912.345.678"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Họ và tên *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Nhập họ tên đầy đủ..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Username đăng nhập *</label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                    placeholder="vd: drv_dt_04"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email *</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    placeholder="nhanvien@honafresh.vn"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {editingStaff ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu đăng nhập *'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder={editingStaff ? 'Nhập mật khẩu mới nếu muốn đổi...' : 'Tối thiểu 6 ký tự'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{ROLE_META[formRole].idLabel}</label>
                  <input
                    type="text"
                    value={formLicenseNo}
                    onChange={(e) => setFormLicenseNo(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                    placeholder="Tự sinh nếu để trống"
                  />
                </div>

                {formRole === 'DRIVER' ? (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Hạng bằng lái</label>
                    <select
                      value={formLicenseClass}
                      onChange={(e) => setFormLicenseClass(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white font-bold"
                    >
                      <option value="B2">Hạng B2</option>
                      <option value="C">Hạng C</option>
                      <option value="C1">Hạng C1</option>
                      <option value="CE">Hạng CE</option>
                      <option value="FC">Hạng FC</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kinh nghiệm (năm)</label>
                    <input
                      type="number"
                      min={1}
                      value={formExperience}
                      onChange={(e) => setFormExperience(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {formRole === 'DRIVER' && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kinh nghiệm (năm)</label>
                    <input
                      type="number"
                      min={1}
                      value={formExperience}
                      onChange={(e) => setFormExperience(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                    />
                  </div>
                )}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trạng thái làm việc</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'AVAILABLE' | 'OFF_DUTY')}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white font-bold"
                  >
                    <option value="AVAILABLE">Sẵn sàng làm việc</option>
                    <option value="OFF_DUTY">Nghỉ phép / Tạm ngưng</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveStaff}
                className="px-4 py-2 rounded-xl bg-[#10542C] hover:bg-[#0d4624] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : editingStaff ? 'Lưu Thay Đổi' : 'Thêm Nhân Viên'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Xóa Nhân Viên</h3>
                <p className="text-xs text-slate-500">Thao tác này không thể hoàn tác.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc muốn xóa nhân viên <strong>{deletingStaff.fullName}</strong> (
              <span className="font-mono">{deletingStaff.driverCode}</span>)? Nếu nhân viên đã từng chạy chuyến xe, hệ thống sẽ giữ lại lịch sử và gợi ý chuyển sang trạng thái <strong>Nghỉ phép / Tạm ngưng</strong>.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
