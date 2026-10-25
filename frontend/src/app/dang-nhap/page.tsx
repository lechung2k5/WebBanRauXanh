'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useApp } from '@/context/AppContext';
import { loginApi } from '@/services/api';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Leaf,
  ChevronRight,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await loginApi(username.trim(), password.trim(), rememberMe);
      setCurrentUser(res);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F5] flex flex-col justify-between">
      <Header />

      <main className="max-w-[1240px] mx-auto px-4 py-8 w-full flex-1 flex flex-col items-center justify-center">
        {/* Breadcrumb */}
        <div className="w-full max-w-md flex items-center gap-2 text-xs text-[#6B7280] mb-6">
          <Link href="/" className="hover:text-[#10542C]">Trang chủ</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#10542C] font-bold">Đăng nhập tài khoản</span>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#EAECE8] shadow-sm">
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
              Đăng Nhập Tài Khoản
            </h1>
            <p className="text-xs text-[#6B7280] mt-1">
              Truy cập để quản lý đơn hàng & nhận ưu đãi thành viên
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2C3E2E] mb-1.5">
                Tên đăng nhập / Email *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Nhập username hoặc email..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-3 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white transition-all"
                />
                <UserIcon className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-[#2C3E2E]">Mật khẩu *</label>
                <span className="text-[11px] text-[#10542C] hover:underline cursor-pointer font-bold">
                  Quên mật khẩu?
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F9F9F5] border border-[#E5E7EB] rounded-xl pl-10 pr-10 py-3 text-xs text-[#2C3E2E] focus:outline-none focus:border-[#10542C] focus:bg-white transition-all"
                />
                <Lock className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-[#6B7280] hover:text-[#10542C] absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#2C3E2E] font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-[#10542C] rounded"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Đang Đăng Nhập...' : 'Đăng Nhập Ngay'} <ArrowRight className="w-4 h-4 text-[#8BC34A]" />
            </button>
          </form>

          {/* Gợi ý test nhanh */}
          <div className="mt-4 p-3 rounded-xl bg-[#F9F9F5] border border-[#EAECE8] text-[11px] text-[#6B7280]">
            <p><strong>Tài khoản mẫu:</strong></p>
            <p>• Admin: <code>admin</code> / <code>admin123</code></p>
            <p>• Khách hàng: <code>user</code> / <code>user123</code></p>
          </div>

          {/* Chuyển sang Đăng ký */}
          <div className="mt-6 pt-5 border-t border-[#F0F2ED] text-center text-xs text-[#6B7280]">
            Chưa có tài khoản thành viên?{' '}
            <Link href="/dang-ky" className="font-bold text-[#10542C] hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
