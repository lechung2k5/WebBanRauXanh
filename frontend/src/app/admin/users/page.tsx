'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { User } from '@/types';
import { getUsersApi, toggleUserStatusApi } from '@/services/api';
import {
  Users,
  Loader2,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'ROLE_FARMER', label: 'Nông trại' },
  { value: 'ROLE_BUYER', label: 'Thương lái' },
  { value: 'ROLE_WAREHOUSE_QC', label: 'QC Trạm' },
  { value: 'ROLE_DRIVER', label: 'Tài xế' },
  { value: 'ROLE_ACCOUNTANT', label: 'Kế toán' },
  { value: 'ROLE_ADMIN', label: 'Admin' },
  { value: 'ROLE_USER', label: 'Khách hàng' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKw, setSearchKw] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsersApi();
      setUsers(res || []);
    } catch (err) {
      console.error('Error fetching admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = async (userId: number) => {
    setTogglingId(userId);
    try {
      await toggleUserStatusApi(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, enabled: !u.enabled } : u))
      );
    } catch {
      alert('Không thể thay đổi trạng thái người dùng này.');
    } finally {
      setTogglingId(null);
    }
  };

  const getCleanFullName = (u: User) => {
    if (u.username === 'buyer_coop' || (u.fullName && u.fullName.includes('?'))) {
      if (u.username === 'buyer_coop') return 'Nguyễn Thị Minh Hạnh';
      if (u.username === 'buyer_winmart') return 'Phạm Hoàng Nam';
      if (u.username === 'buyer_lotte') return 'Lê Trọng Đạt';
    }
    return u.fullName || '—';
  };

  // Bộ lọc tổng hợp (Từ khóa + Loại tài khoản + Trạng thái hoạt động)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const cleanName = getCleanFullName(u);
      const kw = searchKw.trim().toLowerCase();
      const matchesKw =
        !kw ||
        cleanName.toLowerCase().includes(kw) ||
        (u.fullName && u.fullName.toLowerCase().includes(kw)) ||
        (u.username && u.username.toLowerCase().includes(kw)) ||
        (u.email && u.email.toLowerCase().includes(kw)) ||
        (u.phone && u.phone.toLowerCase().includes(kw));

      const userRoles = u.roles && u.roles.length > 0 ? u.roles : ['ROLE_USER'];
      const matchesRole =
        selectedRole === 'ALL' || userRoles.includes(selectedRole);

      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'ACTIVE' && u.enabled) ||
        (selectedStatus === 'LOCKED' && !u.enabled);

      return matchesKw && matchesRole && matchesStatus;
    });
  }, [users, searchKw, selectedRole, selectedStatus]);

  const renderRoleBadge = (roleName: string) => {
    const roleConfig: Record<string, { label: string; className: string }> = {
      ROLE_ADMIN: { label: 'Admin', className: 'bg-amber-100 text-amber-900 border border-amber-300' },
      ROLE_FARMER: { label: 'Nông trại', className: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
      ROLE_BUYER: { label: 'Thương lái', className: 'bg-blue-100 text-blue-800 border border-blue-300' },
      ROLE_WAREHOUSE_QC: { label: 'QC Trạm', className: 'bg-purple-100 text-purple-800 border border-purple-300' },
      ROLE_DRIVER: { label: 'Tài xế', className: 'bg-orange-100 text-orange-800 border border-orange-300' },
      ROLE_ACCOUNTANT: { label: 'Kế toán', className: 'bg-indigo-100 text-indigo-800 border border-indigo-300' },
      ROLE_USER: { label: 'Khách hàng', className: 'bg-gray-100 text-gray-700 border border-gray-200' },
    };
    const config = roleConfig[roleName] || { label: roleName, className: 'bg-[#F4F5F1] text-[#2C3E2E]' };
    return (
      <span
        key={roleName}
        className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner Tiêu Đề Người Dùng */}
      <div className="bg-gradient-to-r from-[#10542C] via-[#1B6D3D] to-[#0A4020] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-[#8BC34A]" /> Quản Lý Tài Khoản & KYC (Phân Quyền)
          </h2>
          <p className="text-xs text-white/80 mt-1">
            Quản lý tài khoản nông trại, thương lái B2B, kiểm định QC, tài xế vận tải và kiểm soát phân quyền truy cập hệ thống.
          </p>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
        {/* Thanh Bộ Lọc & Tìm Kiếm Đơn Giản */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Tìm theo họ tên, username, email, SĐT..."
              value={searchKw}
              onChange={(e) => setSearchKw(e.target.value)}
              className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-lg pl-8 pr-8 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchKw && (
              <button
                type="button"
                onClick={() => setSearchKw('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                title="Xóa tìm kiếm"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Các nút lọc dropdown đơn giản */}
          <div className="flex items-center gap-2">
            <select
              aria-label="Lọc theo vai trò"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-[#F9F9F5] border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] cursor-pointer"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo trạng thái"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#F9F9F5] border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Bị khóa</option>
            </select>
          </div>
        </div>

        {/* Thanh đếm kết quả */}
        <div className="flex items-center justify-between text-xs text-[#6B7280] pt-2 border-t border-[#F0F2ED]">
          <span>
            Hiển thị <strong className="text-[#10542C] font-semibold">{filteredUsers.length}</strong> / {users.length} người dùng
            {selectedRole !== 'ALL' && (
              <span className="ml-1 text-gray-500">
                (vai trò: <strong>{ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label}</strong>)
              </span>
            )}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-[#6B7280] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-[#10542C] animate-spin" />
            <span>Đang tải danh sách người dùng...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#6B7280] space-y-2">
            <AlertCircle className="w-8 h-8 text-[#9CA3AF] mx-auto" />
            <p className="font-bold">Không tìm thấy người dùng phù hợp với điều kiện lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F5] text-[#2C3E2E] uppercase font-bold text-[11px] border-b border-[#EAECE8]">
                <tr>
                  <th className="py-3 px-3">Họ và tên</th>
                  <th className="py-3 px-3">Username</th>
                  <th className="py-3 px-3">Email & SĐT</th>
                  <th className="py-3 px-3">Vai trò phân quyền</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2ED]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F9F9F5]/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-[#2C3E2E]">
                      {getCleanFullName(u)}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#10542C] font-semibold">
                      {u.username}
                    </td>
                    <td className="py-3 px-3 text-[#6B7280]">
                      <div>{u.email || '—'}</div>
                      {u.phone && <div className="text-[11px] text-gray-500 font-mono mt-0.5">{u.phone}</div>}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles && u.roles.length > 0 ? (
                          u.roles.map((role) => renderRoleBadge(role))
                        ) : (
                          renderRoleBadge('ROLE_USER')
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {u.enabled ? (
                        <span className="text-[#2E7D32] font-medium">Hoạt động</span>
                      ) : (
                        <span className="text-[#C62828] font-medium">Bị khóa</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        disabled={togglingId === u.id || u.username === 'admin'}
                        onClick={() => handleToggleUser(u.id)}
                        className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                          u.username === 'admin'
                            ? 'text-gray-400 cursor-not-allowed'
                            : u.enabled
                            ? 'text-rose-600 hover:bg-rose-50 border border-rose-200'
                            : 'text-[#10542C] hover:bg-[#EAF5E9] border border-[#CDE5CB]'
                        }`}
                        title={u.username === 'admin' ? 'Không thể khóa Root Admin' : ''}
                      >
                        {togglingId === u.id ? (
                          <Loader2 className="w-3 h-3 animate-spin inline" />
                        ) : u.enabled ? (
                          'Khóa'
                        ) : (
                          'Mở khóa'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
