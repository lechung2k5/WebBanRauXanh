'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AuthResponse } from '@/types';
import { loginApi, registerApi } from '@/services/api';
import { X, Lock, User as UserIcon, Mail, Phone, MapPin, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthResponse) => void;
  initialTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialTab = 'login',
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);

  // Khóa cuộn background khi AuthModal mở
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await loginApi(loginUsername.trim(), loginPassword, rememberMe);
      onAuthSuccess(user);
      onClose();
      if (user.roles?.includes('ROLE_ADMIN')) {
        window.location.href = '/admin/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công!');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword.trim() || !regFullName.trim() || !regEmail.trim()) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await registerApi({
        username: regUsername.trim(),
        password: regPassword,
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || undefined,
        address: regAddress.trim() || undefined,
      });
      setSuccessMsg('Đăng ký tài khoản thành công! Đang tự động đăng nhập...');
      setTimeout(() => {
        onAuthSuccess(user);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Đăng ký không thành công!');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (u: string, p: string) => {
    setTab('login');
    setLoginUsername(u);
    setLoginPassword(p);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto overscroll-contain border border-[#EAECE8] animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#758A7A] hover:text-[#2C3E2E] rounded-full hover:bg-[#F4F5F1] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="relative w-14 h-14 mb-2">
            <Image
              src="/assets/logo/logo_rutGon.png"
              alt="HoNa Fresh"
              fill
              className="object-contain"
            />
          </div>
          <h3 className="font-heading text-xl font-bold text-[#10542C]">HoNa Fresh</h3>
          <p className="text-xs text-[#758A7A]">Rau sạch từ nông trại đến bàn ăn</p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#F4F5F1] p-1.5 rounded-2xl mb-6 border border-[#EAECE8]">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-[#10542C] text-white shadow-xs'
                : 'text-[#758A7A] hover:text-[#2C3E2E]'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-[#10542C] text-white shadow-xs'
                : 'text-[#758A7A] hover:text-[#2C3E2E]'
            }`}
          >
            Đăng Ký
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3.5 bg-[#E53935]/10 border border-[#E53935]/20 text-[#E53935] text-xs rounded-2xl flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="font-semibold">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-[#10542C]/10 border border-[#4CAF50]/30 text-[#10542C] text-xs rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#4CAF50] shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] uppercase tracking-wider mb-1.5">
                Tên đăng nhập hoặc Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="admin hoặc user..."
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F9F9F5] border border-[#EAECE8] rounded-xl text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white transition-all"
                />
                <UserIcon className="w-4 h-4 text-[#758A7A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] uppercase tracking-wider mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu..."
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F9F9F5] border border-[#EAECE8] rounded-xl text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white transition-all"
                />
                <Lock className="w-4 h-4 text-[#758A7A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#758A7A] pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-[#10542C] rounded"
                />
                <span>Ghi nhớ đăng nhập (7 ngày)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
            </button>

            {/* Quick Demo Helper Box */}
            <div className="pt-4 border-t border-[#EAECE8] text-[11px] text-[#758A7A] space-y-1.5">
              <span className="font-bold text-[#2C3E2E] block">Tài khoản demo sẵn có:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => fillQuickAccount('admin', 'admin123')}
                  className="px-2.5 py-1 bg-[#10542C]/10 hover:bg-[#10542C]/20 text-[#10542C] rounded-lg font-bold border border-[#10542C]/20 cursor-pointer"
                >
                  Admin (admin/admin123)
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickAccount('user', 'user123')}
                  className="px-2.5 py-1 bg-[#FB8C00]/10 hover:bg-[#FB8C00]/20 text-[#FB8C00] rounded-lg font-bold border border-[#FB8C00]/20 cursor-pointer"
                >
                  User (user/user123)
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] uppercase tracking-wider mb-1">
                Tên đăng nhập *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: khachhang01"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F9F9F5] border border-[#EAECE8] rounded-xl text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] uppercase tracking-wider mb-1">
                Họ và tên *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Nguyễn Văn An"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F9F9F5] border border-[#EAECE8] rounded-xl text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] uppercase tracking-wider mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                placeholder="email@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F9F9F5] border border-[#EAECE8] rounded-xl text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] uppercase tracking-wider mb-1">
                  Mật khẩu *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 ký tự"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F9F9F5] border border-[#EAECE8] rounded-xl text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2C3E2E] uppercase tracking-wider mb-1">
                  Xác nhận *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Nhập lại"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F9F9F5] border border-[#EAECE8] rounded-xl text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] uppercase tracking-wider mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                placeholder="0987654321"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F9F9F5] border border-[#EAECE8] rounded-xl text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] uppercase tracking-wider mb-1">
                Địa chỉ giao hàng
              </label>
              <input
                type="text"
                placeholder="Số nhà, đường, quận/huyện..."
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F9F9F5] border border-[#EAECE8] rounded-xl text-sm text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Đang tạo tài khoản...' : 'Hoàn tất Đăng Ký'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
