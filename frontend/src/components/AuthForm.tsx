'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, AuthResult, isChallenge, OtpChallenge, portalFor } from '@/services/auth';
import { useApp } from '@/context/AppContext';
import type { AuthResponse } from '@/types';
import ImageUploadField from './ImageUploadField';

type GoogleWindow = Window & {
  google?: {
    accounts: {
      id: {
        initialize: (options: { client_id: string; callback: (value: { credential: string }) => void }) => void;
        renderButton: (element: HTMLElement, options: { theme: string; size: string; width?: string; text?: string }) => void;
      };
    };
  };
};

export function GoogleButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const init = () => {
    const google = (window as GoogleWindow).google;
    if (google && element.current && clientId) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (value) => callback.current(value.credential),
      });
      google.accounts.id.renderButton(element.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
      });
    }
  };

  return clientId ? (
    <div className="flex flex-col items-center">
      <Script src="https://accounts.google.com/gsi/client" onReady={init} strategy="afterInteractive" />
      <div ref={element} className="w-full flex justify-center min-h-[44px]" />
    </div>
  ) : (
    <p className="text-xs text-center text-gray-400 py-1">
      💡 Google Sign-In khả dụng khi biến môi trường <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> được thiết lập.
    </p>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const fields = useRef<(HTMLInputElement | null)[]>([]);

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const code = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(code);
    const targetIdx = Math.min(code.length, 5);
    fields.current[targetIdx]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3 py-2" onPaste={handlePaste}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            fields.current[i] = el;
          }}
          aria-label={`Chữ số OTP ${i + 1}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={value[i] || ''}
          className="w-11 h-14 sm:w-12 sm:h-14 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold font-mono text-[#10542C] focus:border-[#10542C] focus:bg-green-50/30 focus:outline-none transition-all shadow-xs"
          onChange={(e) => {
            const digit = e.target.value.replace(/\D/g, '').slice(-1);
            const chars = value.padEnd(6, ' ').split('');
            chars[i] = digit || ' ';
            const updated = chars.join('').trimEnd();
            onChange(updated);
            if (digit && i < 5) fields.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) {
              fields.current[i - 1]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}

const VIETNAM_BANKS = [
  { code: 'AGRIBANK', name: 'Agribank - Ngân hàng Nông nghiệp & PTNT' },
  { code: 'VIETCOMBANK', name: 'Vietcombank - Ngoại thương Việt Nam' },
  { code: 'VIETINBANK', name: 'VietinBank - Công thương Việt Nam' },
  { code: 'BIDV', name: 'BIDV - Đầu tư & Phát triển Việt Nam' },
  { code: 'MBBANK', name: 'MB Bank - Quân đội' },
  { code: 'TECHCOMBANK', name: 'Techcombank - Kỹ thương Việt Nam' },
  { code: 'VPBANK', name: 'VPBank - Việt Nam Thịnh Vượng' },
  { code: 'ACB', name: 'ACB - Á Châu' },
  { code: 'SACOMBANK', name: 'Sacombank - Sài Gòn Thương Tín' },
  { code: 'TPBANK', name: 'TPBank - Tiên Phong' },
  { code: 'HDBANK', name: 'HDBank - Phát triển TP.HCM' },
  { code: 'VIB', name: 'VIB - Quốc tế Việt Nam' },
  { code: 'OTHER', name: 'Ngân hàng khác (Nhập tên thủ công)' },
];

export default function AuthForm({
  initialMode = 'login',
  onSuccess,
}: {
  initialMode?: 'login' | 'register' | 'activate';
  onSuccess?: (u: AuthResponse) => void;
}) {
  const router = useRouter();
  const { setCurrentUser } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'reset' | 'activate'>(initialMode);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [role, setRole] = useState<'FARMER' | 'BUYER'>('BUYER');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [expires, setExpires] = useState(0);
  const [household, setHousehold] = useState(true);
  const [individualBuyer, setIndividualBuyer] = useState(false);
  const [skipBank, setSkipBank] = useState(false);
  const [bankCode, setBankCode] = useState('AGRIBANK');
  const [customBankName, setCustomBankName] = useState('');

  // Bộ đếm thời gian OTP
  useEffect(() => {
    if (!challenge) return;
    const timer = setInterval(() => {
      setCooldown((x) => Math.max(0, x - 1));
      setExpires((x) => Math.max(0, x - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [challenge]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSuccess = (user: AuthResponse) => {
    setCurrentUser(user);
    const channel = new BroadcastChannel('hona-auth');
    channel.postMessage('login');
    channel.close();
    if (onSuccess) {
      onSuccess(user);
      return;
    }
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    const safe =
      redirect &&
      redirect.startsWith('/') &&
      !redirect.startsWith('//') &&
      !/[\\\r\n]/.test(redirect) &&
      !redirect.startsWith('/dang-')
        ? redirect
        : portalFor(user.roles);
    router.replace(safe);
    router.refresh();
  };

  const accept = (result: AuthResult) => {
    if (isChallenge(result)) {
      setChallenge(result);
      setEmail(result.email);
      setOtp('');
      setCooldown(result.resendAfterSeconds);
      setExpires(result.otpExpirySeconds);
    } else {
      handleSuccess(result);
    }
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yêu cầu thất bại');
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(async () => {
      // 1. Luồng Xác thực OTP
      if (challenge) {
        if (mode === 'reset' || mode === 'activate') {
          await api(`auth/${mode === 'reset' ? 'reset-password' : 'activate-staff'}`, 'POST', {
            email,
            otp,
            password,
          });
          setChallenge(null);
          setMode('login');
          setPassword('');
          setMessage('Đã đặt mật khẩu thành công. Bạn có thể đăng nhập ngay.');
          return;
        }
        const endpoint = challenge.otpType === 'REGISTER_VERIFICATION' ? 'verify-register-otp' : 'gmail-otp/verify';
        accept(await api<AuthResult>(`auth/${endpoint}`, 'POST', { email, otp, type: challenge.otpType }));
        return;
      }

      // 2. Kích hoạt nhân sự nội bộ
      if (mode === 'activate') {
        setChallenge({
          email,
          requireOtp: true,
          otpType: 'STAFF_ACTIVATION',
          otpExpirySeconds: 300,
          resendAfterSeconds: 60,
        });
        setExpires(300);
        return;
      }

      // 3. Quên mật khẩu
      if (mode === 'reset') {
        accept(await api<OtpChallenge>('auth/forgot-password', 'POST', { email }));
        return;
      }

      // 4. Đăng nhập truyền thống
      if (mode === 'login') {
        if (loginMethod === 'otp') {
          accept(await api<OtpChallenge>('auth/gmail-otp/request', 'POST', { email }));
          return;
        }
        accept(
          await api<AuthResult>('auth/login', 'POST', {
            username: form.get('username') || username,
            password,
            rememberMe: form.get('remember') === 'on',
          })
        );
        return;
      }

      // 5. Đăng ký B2B mới
      if (password !== form.get('confirmPassword')) {
        throw new Error('Mật khẩu xác nhận không khớp');
      }
      const values = Object.fromEntries(form.entries());
      const resolvedBankName =
        role === 'FARMER' && !skipBank
          ? bankCode === 'OTHER'
            ? customBankName.trim()
            : VIETNAM_BANKS.find((b) => b.code === bankCode)?.name || bankCode
          : '';
      const resolvedBankAccount =
        role === 'FARMER' && !skipBank ? ((values.bankAccountNo as string) || '').trim() : '';

      accept(
        await api<OtpChallenge>('auth/register', 'POST', {
          ...values,
          email,
          password,
          registerRole: role,
          isHouseholdFarmer: household,
          isIndividualBuyer: individualBuyer,
          bankName: resolvedBankName,
          bankAccountNo: resolvedBankAccount,
        })
      );
    });
  };

  // Nạp tài khoản mẫu cho việc kiểm thử trên IntelliJ
  const fillDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setLoginMethod('password');
    setError('');
  };

  const field = (
    name: string,
    label: string,
    type = 'text',
    required = true,
    defaultValue = '',
    placeholder = '',
    hint = ''
  ) => (
    <label className="block text-sm" key={name}>
      <span className="font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={name === 'fullName' ? 100 : name === 'username' ? 50 : 150}
        className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-[#10542C] focus:ring-1 focus:ring-[#10542C] text-sm placeholder:text-gray-400"
      />
      {hint && <span className="text-[11px] text-gray-500 mt-1 block">{hint}</span>}
    </label>
  );

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Giới thiệu */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🌱</span>
          <h1 className="text-2xl font-black text-[#10542C] tracking-tight">
            {challenge
              ? 'Xác thực Email OTP'
              : mode === 'register'
              ? 'Đăng ký Tài khoản Đối tác B2B'
              : mode === 'activate'
              ? 'Kích hoạt Tài khoản Nhân sự'
              : mode === 'reset'
              ? 'Đặt lại Mật khẩu'
              : 'Đăng nhập Sàn HoNa Fresh'}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-600">
          Hệ thống sàn giao dịch nông sản B2B trung gian ký quỹ & điều phối chuỗi cung ứng lạnh.
        </p>
      </div>

      {/* Thông báo lỗi & thành công */}
      {error && (
        <div role="alert" className="bg-red-50 text-red-700 border border-red-200 p-3.5 rounded-xl text-sm flex items-start gap-2 animate-fadeIn">
          <span className="text-base">⚠️</span>
          <div className="flex-1">{error}</div>
        </div>
      )}
      {message && (
        <div role="status" className="bg-green-50 text-green-800 border border-green-200 p-3.5 rounded-xl text-sm flex items-start gap-2">
          <span className="text-base">✅</span>
          <div className="flex-1">{message}</div>
        </div>
      )}

      {/* Form chính */}
      <form onSubmit={submit} className="space-y-4">
        {challenge ? (
          /* ==================== MÀN HÌNH NHẬP OTP 6 SỐ ==================== */
          <div className="bg-green-50/50 border border-green-100 rounded-2xl p-5 text-center space-y-4">
            <div className="w-12 h-12 bg-[#10542C]/10 text-[#10542C] rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✉️
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Mã xác thực OTP đã gửi đến email:
              </p>
              <p className="text-base font-bold text-[#10542C] break-all">{email}</p>
              <p className="text-xs text-gray-500 mt-1">
                ⏱️ Mã có hiệu lực trong <strong>{formatTimer(expires)}</strong> (tối đa 5 lần nhập sai).
              </p>
              <div className="mt-2.5 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-800 text-xs text-left">
                <p className="font-semibold flex items-center gap-1.5">
                  <span>💡</span> <span>Lưu ý kiểm tra hộp thư:</span>
                </p>
                <p className="mt-0.5 text-gray-600">
                  Vui lòng kiểm tra <strong>Hộp thư đến (Inbox)</strong> hoặc thư mục <strong>Thư rác (Spam)</strong> trong email của bạn để nhận mã xác thực OTP 6 số.
                </p>
              </div>
            </div>

            <OtpInput value={otp} onChange={setOtp} />

            {(mode === 'reset' || mode === 'activate') && (
              <label className="block text-left text-sm mt-3">
                <span className="font-semibold text-gray-700">Mật khẩu mới (tối thiểu 10 ký tự)</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 border border-gray-300 rounded-xl px-3.5 py-2.5 w-full text-sm focus:border-[#10542C] focus:outline-none"
                />
              </label>
            )}

            <div className="pt-2 flex flex-col items-center gap-2">
              <button
                type="button"
                disabled={busy || cooldown > 0 || challenge.otpType === 'STAFF_ACTIVATION' || challenge.otpType === 'GOOGLE_LOGIN'}
                className="text-xs sm:text-sm font-bold text-[#10542C] hover:underline disabled:text-gray-400 disabled:no-underline cursor-pointer"
                onClick={() =>
                  void run(async () => {
                    accept(await api<OtpChallenge>('auth/resend-otp', 'POST', { email, type: challenge.otpType }));
                  })
                }
              >
                {cooldown > 0 ? `Gửi lại mã sau ${formatTimer(cooldown)}` : '🔄 Gửi lại mã OTP'}
              </button>
              {challenge.otpType === 'STAFF_ACTIVATION' && (
                <p className="text-xs text-gray-500">Mã kích hoạt nằm trong thư mời. Nếu hết hạn hãy liên hệ Admin.</p>
              )}
            </div>
          </div>
        ) : (
          /* ==================== MÀN HÌNH ĐIỀN FORM B2B ==================== */
          <>
            {mode === 'register' && (
              <>
                {/* 1.1 Thẻ chọn Vai trò B2B nổi bật */}
                <div className="space-y-2">
                  <span className="block text-sm font-bold text-gray-800">Chọn loại hình đối tác B2B:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('FARMER')}
                      className={`text-left p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                        role === 'FARMER'
                          ? 'border-[#10542C] bg-green-50/50 shadow-xs ring-1 ring-[#10542C]'
                          : 'border-gray-200 bg-white hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-2xl">🚜</span>
                        {role === 'FARMER' && (
                          <span className="bg-[#10542C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Đã chọn
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-sm text-[#10542C]">Nông dân / Hợp tác xã</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Đăng bán lô vụ mùa, mã PUC, chứng nhận VietGAP</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('BUYER')}
                      className={`text-left p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                        role === 'BUYER'
                          ? 'border-[#10542C] bg-green-50/50 shadow-xs ring-1 ring-[#10542C]'
                          : 'border-gray-200 bg-white hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-2xl">🏢</span>
                        {role === 'BUYER' && (
                          <span className="bg-[#10542C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Đã chọn
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-sm text-[#10542C]">Thương lái / Mua sỉ</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Đàm phán giá theo bậc, ký quỹ 30%, nhận hàng tại kho</p>
                    </button>
                  </div>
                </div>

                {/* Thông tin định danh cơ bản */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {field('fullName', 'Họ và tên người đại diện', 'text', true)}
                  {field('username', 'Tên đăng nhập (3-50 ký tự)', 'text', true)}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="font-medium text-gray-700">Email (Gmail nhận mã OTP) <span className="text-red-500">*</span></span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vidu@gmail.com"
                      className="mt-1 border border-gray-300 rounded-xl px-3.5 py-2.5 w-full text-sm focus:border-[#10542C] focus:outline-none"
                    />
                  </label>
                  {field('phone', 'Số điện thoại', 'tel', true)}
                </div>

                {field('address', 'Địa chỉ trụ sở / Trại sản xuất', 'text', true)}

                {/* Mật khẩu */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="font-medium text-gray-700">Mật khẩu (≥10 ký tự) <span className="text-red-500">*</span></span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={10}
                      maxLength={72}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 border border-gray-300 rounded-xl px-3.5 py-2.5 w-full text-sm focus:border-[#10542C] focus:outline-none"
                    />
                  </label>
                  {field('confirmPassword', 'Xác nhận lại mật khẩu', 'password', true)}
                </div>

                {/* Hồ sơ doanh nghiệp B2B theo vai trò */}
                <div className="border-t border-gray-200 pt-3 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#10542C]">
                      📋 Hồ sơ B2B {role === 'FARMER' ? 'Nông Trại / HTX Xuất Vườn' : 'Đối Tác Thu Mua Sỉ'}
                    </p>
                    <span className="text-[11px] text-gray-500">
                      {role === 'FARMER' ? '🌱 Bên Bán' : '🏢 Bên Mua'}
                    </span>
                  </div>

                  {field(
                    'companyName',
                    role === 'FARMER' ? 'Tên nông trại / Hợp tác xã' : 'Tên doanh nghiệp / Vựa thu mua',
                    'text',
                    true,
                    '',
                    role === 'FARMER'
                      ? 'Ví dụ: Nông trại Rau sạch Lạc Dương, HTX Nông nghiệp Đà Lạt'
                      : 'Ví dụ: Vựa rau Tư Hùng - Chợ Đầu Mối Bình Điền hoặc Công ty TNHH Rau Sạch',
                    role === 'FARMER'
                      ? 'Tên trang trại, vườn rau hoặc HTX xuất hóa đơn/bảng kê thu mua.'
                      : 'Tên pháp nhân công ty hoặc biển hiệu vựa thu mua tại chợ/kho tiếp nhận.'
                  )}

                  {/* Lựa chọn loại hình pháp nhân (Có MST vs Không có MST) */}
                  {role === 'BUYER' ? (
                    <div className="space-y-3">
                      <label className="flex items-start gap-2.5 text-sm text-gray-800 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 cursor-pointer transition-all hover:bg-emerald-50">
                        <input
                          type="checkbox"
                          checked={individualBuyer}
                          onChange={(e) => setIndividualBuyer(e.target.checked)}
                          className="mt-0.5 rounded text-[#10542C] focus:ring-[#10542C] w-4 h-4"
                        />
                        <div>
                          <span className="font-semibold text-emerald-900">
                            Tôi là Thương lái cá thể / Vựa thu mua / Bếp ăn
                          </span>
                          <span className="block text-xs text-emerald-700 mt-0.5">
                            (Chưa có Mã số thuế doanh nghiệp — Sử dụng số CCCD hoặc bổ sung sau khi xác thực ký quỹ)
                          </span>
                        </div>
                      </label>

                      {field(
                        'taxCode',
                        individualBuyer ? 'Số CCCD / Mã định danh / MST cá nhân' : 'Mã số thuế doanh nghiệp',
                        'text',
                        !individualBuyer,
                        '',
                        individualBuyer
                          ? 'Ví dụ: 079123456789 (12 số CCCD) hoặc để trống bổ sung sau'
                          : 'Ví dụ: 0101234567 hoặc 5801234567 (10 hoặc 13 số)',
                        individualBuyer
                          ? '💡 Thương lái cá thể có thể kê khai 12 số CCCD hoặc hoàn thiện hồ sơ KYC sau khi kích hoạt tài khoản.'
                          : 'Mã số thuế doanh nghiệp được cấp bởi Tổng cục Thuế để xuất hóa đơn dịch vụ sàn VAS.'
                      )}

                      {field(
                        'warehouseAddress',
                        'Địa chỉ kho tiếp nhận / Vựa nhận hàng (Xe lạnh TMS giao tận nơi)',
                        'text',
                        true,
                        '',
                        'Ví dụ: Ô sạp A12 Chợ Đầu Mối Bình Điền, Q.8, TP.HCM hoặc Kho KCN Sóng Thần',
                        'Địa chỉ tiếp nhận hàng để hệ thống điều phối xe tải lạnh giao hàng tận nơi và ký nhận điện tử ePOD.'
                      )}
                    </div>
                  ) : (
                    /* Vai trò FARMER */
                    <div className="space-y-3">
                      <label className="flex items-start gap-2.5 text-sm text-gray-800 bg-gray-50 p-3 rounded-xl border border-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={household}
                          onChange={(e) => setHousehold(e.target.checked)}
                          className="mt-0.5 rounded text-[#10542C] focus:ring-[#10542C] w-4 h-4"
                        />
                        <div>
                          <span className="font-semibold text-gray-800">
                            Đăng ký dưới hình thức Hộ nông dân cá thể
                          </span>
                          <span className="block text-xs text-gray-500 mt-0.5">
                            (Bán nông sản tự sản xuất theo Bảng kê 01/TNDN, không bắt buộc Mã số thuế doanh nghiệp)
                          </span>
                        </div>
                      </label>

                      {field(
                        'taxCode',
                        household ? 'Số CCCD / Mã định danh chủ hộ (nếu có)' : 'Mã số thuế HTX / Doanh nghiệp nông nghiệp',
                        'text',
                        !household,
                        '',
                        household ? 'Ví dụ: 058195001234 (12 số CCCD) hoặc để trống' : 'Ví dụ: 5801234567',
                        household
                          ? 'Hộ nông dân cá thể có thể để trống hoặc điền CCCD để làm thủ tục chứng từ thuế nông sản.'
                          : 'Mã số thuế hợp tác xã hoặc công ty nông nghiệp.'
                      )}

                      {/* Thông tin tài khoản ngân hàng nhận tiền giải ngân */}
                      <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-bold text-[#10542C] uppercase tracking-wider flex items-center gap-1.5">
                            <span>🏦</span> <span>Tài khoản nhận tiền bán hàng (Giải ngân Escrow)</span>
                          </span>
                          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                            <input
                              type="checkbox"
                              checked={skipBank}
                              onChange={(e) => setSkipBank(e.target.checked)}
                              className="rounded text-[#10542C]"
                            />
                            <span>Bổ sung sau trong Portal</span>
                          </label>
                        </div>

                        {!skipBank ? (
                          <div className="grid sm:grid-cols-2 gap-3 pt-1">
                            <label className="block text-sm">
                              <span className="font-medium text-gray-700">
                                Ngân hàng thụ hưởng <span className="text-red-500">*</span>
                              </span>
                              <select
                                value={bankCode}
                                onChange={(e) => setBankCode(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-[#10542C] text-sm"
                              >
                                {VIETNAM_BANKS.map((b) => (
                                  <option key={b.code} value={b.code}>
                                    {b.name}
                                  </option>
                                ))}
                              </select>
                              {bankCode === 'OTHER' && (
                                <input
                                  type="text"
                                  required
                                  value={customBankName}
                                  onChange={(e) => setCustomBankName(e.target.value)}
                                  placeholder="Nhập tên ngân hàng của bạn..."
                                  className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 bg-white text-sm focus:border-[#10542C] focus:outline-none"
                                />
                              )}
                              <span className="text-[11px] text-gray-500 mt-1 block">
                                Chuẩn liên ngân hàng VietQR / Napas247 để nhận giải ngân tự động.
                              </span>
                            </label>

                            <label className="block text-sm">
                              <span className="font-medium text-gray-700">
                                Số tài khoản ngân hàng <span className="text-red-500">*</span>
                              </span>
                              <input
                                name="bankAccountNo"
                                type="text"
                                required={!skipBank}
                                placeholder="Số tài khoản chính chủ"
                                className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-[#10542C] text-sm"
                              />
                              <span className="text-[11px] text-gray-500 mt-1 block">
                                Tiền đặt cọc 30% và thanh toán 70% sẽ được chuyển về tài khoản này.
                              </span>
                            </label>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                            💡 Bạn có thể đăng ký tài khoản trước và cập nhật số tài khoản ngân hàng trong <strong>Portal Nông Trại</strong> trước khi tạo lô bán hàng đầu tiên.
                          </p>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        {field(
                          'pucCode',
                          'Mã số vùng trồng PUC (nếu có)',
                          'text',
                          false,
                          '',
                          'Ví dụ: PUC-VN-DL-0982',
                          'Mã định danh vùng trồng phục vụ truy xuất nguồn gốc.'
                        )}
                        {field(
                          'certification',
                          'Tiêu chuẩn chất lượng (VietGAP / GlobalGAP)',
                          'text',
                          false,
                          '',
                          'Ví dụ: VietGAP, GlobalGAP, Hữu cơ Organic',
                          'Chứng nhận nông sản sạch để được gắn nhãn kiểm định uy tín.'
                        )}
                      </div>
                      <ImageUploadField
                        name="certificationUrl"
                        label="Ảnh chứng chỉ chất lượng (VietGAP / GlobalGAP)"
                        purpose="CERTIFICATE"
                        required={false}
                        hint="Chọn tệp ảnh chụp chứng nhận từ thiết bị (JPEG, PNG, WebP ≤ 5MB) thay vì nhập link."
                      />
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-2 text-xs text-gray-600 pt-1 cursor-pointer">
                  <input type="checkbox" required className="mt-0.5 rounded text-[#10542C] focus:ring-[#10542C]" />
                  <span>Tôi cam kết thông tin kê khai là chính xác và đồng ý với Quy chế hoạt động & Cơ chế Ký quỹ Escrow của HoNa Fresh.</span>
                </label>
              </>
            )}

            {mode === 'login' && (
              <>
                {/* Tabs phương thức đăng nhập */}
                <div className="flex bg-gray-100 p-1 rounded-xl mb-3 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('password');
                      setError('');
                    }}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      loginMethod === 'password' ? 'bg-white text-[#10542C] shadow-xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    🔑 Mật khẩu truyền thống
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('otp');
                      setError('');
                    }}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      loginMethod === 'otp' ? 'bg-white text-[#10542C] shadow-xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    ✉️ Đăng nhập Gmail OTP
                  </button>
                </div>

                {loginMethod === 'password' ? (
                  <>
                    <label className="block text-sm">
                      <span className="font-medium text-gray-700">Tên đăng nhập hoặc Email</span>
                      <input
                        name="username"
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="admin hoặc email@domain.com"
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 bg-white text-gray-900 text-sm focus:outline-none focus:border-[#10542C]"
                      />
                    </label>

                    <label className="block text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">Mật khẩu</span>
                        <button
                          type="button"
                          className="text-xs text-[#10542C] hover:underline"
                          onClick={() => {
                            setMode('reset');
                            setError('');
                          }}
                        >
                          Quên mật khẩu?
                        </button>
                      </div>
                      <input
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 bg-white text-gray-900 text-sm focus:outline-none focus:border-[#10542C]"
                      />
                    </label>

                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input name="remember" type="checkbox" className="rounded text-[#10542C]" />
                      <span>Ghi nhớ đăng nhập trên thiết bị này (30 ngày)</span>
                    </label>
                  </>
                ) : (
                  /* Đăng nhập bằng Gmail OTP */
                  <div className="space-y-2">
                    <label className="block text-sm">
                      <span className="font-medium text-gray-700">Địa chỉ Gmail đã đăng ký</span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="thuonglai.sg@gmail.com"
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 bg-white text-gray-900 text-sm focus:outline-none focus:border-[#10542C]"
                      />
                    </label>
                    <p className="text-xs text-gray-500">
                      Hệ thống sẽ gửi mã OTP 6 số vào Gmail này để bạn đăng nhập không cần nhớ mật khẩu.
                    </p>
                  </div>
                )}
              </>
            )}

            {(mode === 'reset' || mode === 'activate') && (
              <label className="block text-sm">
                <span className="font-medium text-gray-700">Email tài khoản</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 bg-white text-gray-900 text-sm focus:outline-none focus:border-[#10542C]"
                />
              </label>
            )}
          </>
        )}

        {/* Nút bấm Submit chính */}
        <button
          type="submit"
          disabled={busy || (!!challenge && otp.replace(/\s/g, '').length !== 6)}
          className="w-full bg-[#10542C] hover:bg-[#0c3e20] text-white rounded-xl py-3 font-bold text-sm tracking-wide shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {busy
            ? 'Đang kết nối hệ thống…'
            : challenge
            ? 'Xác nhận & Kích hoạt'
            : mode === 'register'
            ? 'Đăng ký & Nhận mã OTP'
            : mode === 'activate'
            ? 'Nhập mã kích hoạt nhân sự'
            : mode === 'reset'
            ? 'Gửi mã đặt lại mật khẩu'
            : loginMethod === 'otp'
            ? 'Gửi mã OTP vào Gmail'
            : 'Đăng nhập'}
        </button>
      </form>

      {/* Đăng nhập nhanh bằng Google (Khi ở chế độ login) */}
      {!challenge && mode === 'login' && (
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div className="relative flex items-center justify-center">
            <span className="bg-white px-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">
              Hoặc tiếp tục với Google
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="text-gray-500">Vai trò nếu tạo tài khoản mới:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'FARMER' | 'BUYER')}
              className="border border-gray-300 rounded-lg px-2 py-1 text-xs font-semibold text-[#10542C]"
            >
              <option value="BUYER">🏢 Thương lái / Thu mua (BUYER)</option>
              <option value="FARMER">🚜 Nông dân / Hợp tác xã (FARMER)</option>
            </select>
          </div>

          <GoogleButton
            onCredential={(idToken) =>
              void run(async () =>
                accept(
                  await api<OtpChallenge>('auth/google-login', 'POST', {
                    idToken,
                    roleIfNewUser: role,
                  })
                )
              )
            }
          />

          {/* Quick Demo Accounts Helper dành cho việc Test trên IntelliJ */}
          <div className="bg-gray-50 rounded-2xl p-3.5 border border-dashed border-gray-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700">⚡ Tài khoản Demo Test (Click để điền nhanh):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin', 'Admin@123456')}
                className="text-[11px] font-semibold px-2 py-1 bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
              >
                👑 Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('farmer_dalat', 'Farmer@123456')}
                className="text-[11px] font-semibold px-2 py-1 bg-green-100 text-green-800 rounded-lg hover:bg-green-200"
              >
                🚜 Nông dân
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('buyer_sg', 'Buyer@123456')}
                className="text-[11px] font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200"
              >
                🏢 Thương lái
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('qc_tram1', 'Qcstaff@123456')}
                className="text-[11px] font-semibold px-2 py-1 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200"
              >
                🔬 Trạm QC
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('driver_tms', 'Driver@123456')}
                className="text-[11px] font-semibold px-2 py-1 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200"
              >
                🚚 Tài xế
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('accountant_vas', 'Account@123456')}
                className="text-[11px] font-semibold px-2 py-1 bg-teal-100 text-teal-800 rounded-lg hover:bg-teal-200"
              >
                📊 Kế toán
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nút quay lại khi đang nhập OTP */}
      {challenge && (
        <div className="text-center">
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-900 underline cursor-pointer"
            onClick={() => {
              setChallenge(null);
              setOtp('');
              setError('');
            }}
          >
            ← Quay lại form thông tin
          </button>
        </div>
      )}

      {/* Điều hướng chuyển qua lại giữa Đăng nhập / Đăng ký */}
      <div className="text-xs sm:text-sm flex flex-wrap justify-between items-center gap-2 border-t border-gray-200 pt-4 text-gray-600">
        <Link
          href={mode === 'register' ? '/dang-nhap' : '/dang-ky'}
          className="font-semibold text-[#10542C] hover:underline"
        >
          {mode === 'register' ? 'Đã có tài khoản B2B? Đăng nhập ngay' : 'Chưa có tài khoản? Đăng ký đối tác B2B'}
        </Link>
        <div className="flex gap-3">
          <Link href="/kich-hoat" className="hover:underline text-gray-500">
            Kích hoạt nhân sự
          </Link>
          {mode !== 'login' && (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setChallenge(null);
                setError('');
              }}
              className="font-semibold text-[#10542C] hover:underline cursor-pointer"
            >
              Về đăng nhập
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
