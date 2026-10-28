'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { getUsersApi, toggleUserStatusApi } from '@/services/api';
import {
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKw, setSearchKw] = useState('');
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

  const filteredUsers = users.filter((u) => {
    const cleanName = getCleanFullName(u);
    return (
      cleanName.toLowerCase().includes(searchKw.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(searchKw.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchKw.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchKw.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Banner Tiêu Đề Người Dùng - Đồng bộ chuẩn thiết kế */}
      <div className="bg-gradient-to-r from-[#10542C] via-[#1B6D3D] to-[#0A4020] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-[#8BC34A]" /> Quản Lý Người Dùng & Phân Quyền
          </h2>
          <p className="text-xs text-white/80 mt-1">
            Quản lý tài khoản thương lái, nông hộ liên kết, đại lý B2B và kiểm soát phân quyền truy cập hệ thống an toàn.
          </p>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAECE8] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Tìm theo họ tên, username, email..."
              value={searchKw}
              onChange={(e) => setSearchKw(e.target.value)}
              className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl pl-9 pr-8 py-2 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] transition-all"
            />
            <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchKw && (
              <button
                type="button"
                onClick={() => setSearchKw('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <span className="text-xs text-[#6B7280]">
            Hiển thị <strong className="text-[#10542C]">{filteredUsers.length}</strong> / {users.length} người dùng
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
            <p className="font-bold">Không tìm thấy người dùng phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F5] text-[#2C3E2E] uppercase font-bold text-[11px] border-b border-[#EAECE8]">
                <tr>
                  <th className="py-3 px-3">Họ và tên</th>
                  <th className="py-3 px-3">Username</th>
                  <th className="py-3 px-3">Email</th>
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
                    <td className="py-3 px-3 text-[#6B7280]">{u.email || '—'}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles?.map((role) => (
                          <span
                            key={role}
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              role === 'ROLE_ADMIN'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-[#F4F5F1] text-[#2C3E2E]'
                            }`}
                          >
                            {role}
                          </span>
                        )) || (
                          <span className="bg-[#F4F5F1] text-[#2C3E2E] px-2 py-0.5 rounded-md font-bold text-[10px]">
                            ROLE_USER
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {u.enabled ? (
                        <span className="text-[#4CAF50] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động
                        </span>
                      ) : (
                        <span className="text-[#E53935] font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Bị khóa
                        </span>
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
