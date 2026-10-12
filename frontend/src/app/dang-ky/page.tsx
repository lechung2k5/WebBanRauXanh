'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useApp } from '@/context/AppContext';
import { registerApi } from '@/services/api';
import {
  Lock,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Leaf,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setCurrentUser } = useApp();

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.username.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*).');
      return;
    }

    if (form.password.length < 6) {
      setError('Mật khẩu phải chứa ít nhất 6 ký tự.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (!agreeTerms) {
      setError('Vui lòng đồng ý với Điều khoản sử dụng của HoNa Fresh.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await registerApi({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        password: form.password,
      });

      localStorage.setItem('xanhfarm_user', JSON.stringify(res));
      setCurrentUser(res);
      router.push('/');
    } catch (err: any) {
      // Demo mock fallback if backend is offline
      const mockUser = {
        id: Date.now(),
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        roles: ['ROLE_USER'],
        enabled: true,
        token: 'token-' + Date.now(),
      };
      localStorage.setItem('xanhfarm_user', JSON.stringify(mockUser));
      setCurrentUser(mockUser);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F5] flex flex-col justify-between">
      <Header />

      <main className="max-w-[1240px] mx-auto px-4 py-8 w-full flex-1 flex flex-col items-center justify-center">
        {/* Breadcrumb */}
        <div className="w-full max-w-lg flex items-center gap-2 text-xs text-[#6B7280] mb-6">
          <Link href="/" className="hover:text-[#10542C]">Trang chủ</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#10542C] font-bold">Đăng ký thành viên</span>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-lg bg-white rounded-3xl p-8 border border-[#EAECE8] shadow-sm">
          {/* Logo & Tiêu đề */}
          <div className="text-center mb-6">
            <div className="relative h-12 w-44 mx-auto mb-3">
              <Image
                src="/assets/logo/Logo_full.png"
                alt="HoNa Fresh"
                fill
                priority
                className="object-contain"
              />
            </div>
            <h1 className="font-heading text-2xl font-black text-[#10542C]">
              Đăng Ký Thành Viên
            </h1>
            <p className="text-xs text-[#6B7280] mt-1">
              Trở thành thành viên HoNa Fresh nhận ưu đãi 10% đơn hàng đầu tiên
            </p>
          </div>

          {/* Thông báo lỗi */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-[#E53935] text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#2C3E2E] mb-1.5">Họ và tên *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white transition-all"
                  />
                  <UserIcon className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2C3E2E] mb-1.5">Tên đăng nhập *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="nguyenvana"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white transition-all"
                  />
                  <UserIcon className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#2C3E2E] mb-1.5">Email *</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="vana@gmail.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white transition-all"
                  />
                  <Mail className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2C3E2E] mb-1.5">Số điện thoại</label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="0912 345 678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white transition-all"
                  />
                  <Phone className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#2C3E2E] mb-1.5">Địa chỉ giao hàng mặc định</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Số nhà, đường, phường, quận/huyện..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white transition-all"
                />
                <MapPin className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#2C3E2E] mb-1.5">Mật khẩu *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl pl-9 pr-9 py-2.5 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white transition-all"
                  />
                  <Lock className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-[#6B7280] hover:text-[#10542C] absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2C3E2E] mb-1.5">Xác nhận mật khẩu *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập lại mật khẩu"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white transition-all"
                  />
                  <Lock className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-[#2C3E2E] font-medium">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="accent-[#10542C] rounded"
                />
                <span>Tôi đồng ý với các Điều khoản & Chính sách bảo mật của HoNa Fresh</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
            >
              {loading ? 'Đang Tạo Tài Khoản...' : 'Đăng Ký Tài Khoản'} <ArrowRight className="w-4 h-4 text-[#8BC34A]" />
            </button>
          </form>

          {/* Chuyển sang Đăng nhập */}
          <div className="mt-6 pt-5 border-t border-[#F0F2ED] text-center text-xs text-[#6B7280]">
            Đã có tài khoản thành viên?{' '}
            <Link href="/dang-nhap" className="font-bold text-[#10542C] hover:underline">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
