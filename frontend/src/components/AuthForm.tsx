'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, X, ExternalLink, Copy, Check, HelpCircle } from 'lucide-react';
import { api, AuthResult, isChallenge, OtpChallenge, portalFor } from '@/services/auth';
import { useApp } from '@/context/AppContext';
import type { AuthResponse } from '@/types';
import ImageUploadField from './ImageUploadField';

type GoogleWindow = Window & {
  google?: {
    accounts: {
      id: {
        initialize: (options: { client_id: string; callback: (value: { credential: string }) => void }) => void;
        renderButton: (
          element: HTMLElement,
          options: {
            type?: string;
            theme?: string;
            size?: string;
            shape?: string;
            text?: string;
            width?: number | string;
            locale?: string;
            logo_alignment?: string;
          }
        ) => void;
      };
    };
  };
};

function GoogleSetupGuideModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const snippet = 'NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com';

  const copy = () => {
    void navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-gray-200">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Cấu hình Google Sign-In</h3>
              <p className="text-xs text-gray-500">Kích hoạt đăng nhập Google cho HoNa Fresh</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-3.5 text-xs text-gray-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
          <p>
            Hệ thống đã tích hợp đầy đủ tính năng Đăng nhập bằng Google kèm xác thực 2 lớp qua mã OTP Email. Để sử dụng, bạn chỉ cần tạo <strong>OAuth 2.0 Client ID</strong> trên Google Cloud:
          </p>

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3.5 space-y-2.5">
            <p className="font-semibold text-gray-800">Các bước thực hiện nhanh:</p>
            <ol className="list-decimal pl-4 space-y-2 text-gray-700">
              <li>
                Truy cập <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-[#10542C] font-semibold underline inline-flex items-center gap-0.5 hover:text-green-900">Google Cloud Credentials <ExternalLink size={11} /></a> và tạo dự án mới.
              </li>
              <li>
                Vào <strong>Create Credentials</strong> → chọn <strong>OAuth client ID</strong> (loại <em>Web application</em>).
              </li>
              <li>
                Tại <strong>Authorized JavaScript origins</strong>, thêm:
                <code className="block mt-1 bg-white px-2.5 py-1 rounded border border-gray-200 font-mono text-[11px] text-[#10542C] select-all">
                  http://localhost:3000
                </code>
              </li>
              <li>
                Tại <strong>Authorized redirect URIs</strong>, thêm:
                <code className="block mt-1 bg-white px-2.5 py-1 rounded border border-gray-200 font-mono text-[11px] text-[#10542C] select-all">
                  http://localhost:3000
                </code>
              </li>
              <li>
                Dán mã <strong>Client ID</strong> vào file <code className="font-semibold text-gray-900">frontend/.env.local</code>:
              </li>
            </ol>

            <div className="relative mt-2 rounded-lg bg-gray-900 p-2.5 text-gray-100 font-mono text-[11px] flex items-center justify-between">
              <span className="truncate pr-2 select-all">{snippet}</span>
              <button
                type="button"
                onClick={copy}
                className="shrink-0 p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors cursor-pointer"
                title="Sao chép cú pháp"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-900 flex items-start gap-2.5">
            <HelpCircle size={16} className="text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-[11.5px] leading-relaxed">
              <strong>Tài liệu chi tiết:</strong> Hãy mở file <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-[#10542C]">HUONG_DAN_CAU_HINH_GOOGLE_LOGIN.md</code> tại thư mục gốc của dự án để xem hướng dẫn từng bước chi tiết kèm cách khắc phục mọi sự cố.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#10542C] px-5 py-2 text-xs font-bold text-white hover:bg-[#0d4524] transition-all cursor-pointer shadow-xs"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}

export function GoogleButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    let mounted = true;
    let timer: NodeJS.Timeout | null = null;

    const renderBtn = () => {
      const google = (window as GoogleWindow).google;
      if (!mounted || !google?.accounts?.id || !element.current) return false;

      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (res) => {
            if (res?.credential) {
              callback.current(res.credential);
            }
          },
        });
        element.current.innerHTML = '';
        google.accounts.id.renderButton(element.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 320,
          locale: 'vi',
        });
        return true;
      } catch (err) {
        console.error('Lỗi khởi tạo Google Sign-In:', err);
        return false;
      }
    };

    // Khởi tạo ngay nếu SDK Google đã sẵn sàng, nếu chưa thì lắng nghe định kỳ
    if (!renderBtn()) {
      timer = setInterval(() => {
        if (renderBtn() && timer) {
          clearInterval(timer);
          timer = null;
        }
      }, 300);
    }

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [clientId, scriptLoaded]);

  return (
    <>
      <div className="flex flex-col items-center gap-1.5 w-full">
        {clientId ? (
          <>
            <Script
              src="https://accounts.google.com/gsi/client"
              strategy="afterInteractive"
              onLoad={() => setScriptLoaded(true)}
            />
            <div ref={element} className="w-full flex justify-center min-h-[44px]" />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowSetupModal(true)}
              className="w-full max-w-[320px] flex items-center justify-center gap-3 px-5 py-2.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 active:scale-[0.99] text-gray-700 font-semibold text-xs sm:text-sm shadow-xs hover:border-gray-400 transition-all cursor-pointer group"
              title="Nhấp để xem hướng dẫn cấu hình đăng nhập Google"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Đăng nhập bằng Google</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSetupModal(true)}
              className="text-[11px] text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100/70 border border-amber-200/80 rounded-full px-3 py-0.5 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Chưa cấu hình Google Client ID · Nhấp xem hướng dẫn
            </button>
          </>
        )}
      </div>

      {showSetupModal && <GoogleSetupGuideModal onClose={() => setShowSetupModal(false)} />}
    </>
  );
}

function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
}: {
  value: string;
  onChange: (s: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}) {
  const fields = useRef<(HTMLInputElement | null)[]>([]);

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    const code = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(code);
    const targetIdx = Math.min(code.length, 5);
    fields.current[targetIdx]?.focus();
    if (code.length === 6) {
      onComplete?.(code);
    }
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3 py-2" onPaste={handlePaste}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            fields.current[i] = el;
          }}
          disabled={disabled}
          aria-label={`Chữ số OTP ${i + 1}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={value[i] || ''}
          className="w-11 h-14 sm:w-12 sm:h-14 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold font-mono text-[#10542C] focus:border-[#10542C] focus:bg-green-50/30 focus:outline-none transition-all shadow-xs disabled:opacity-50"
          onChange={(e) => {
            if (disabled) return;
            const digit = e.target.value.replace(/\D/g, '').slice(-1);
            const chars = value.padEnd(6, ' ').split('');
            chars[i] = digit || ' ';
            const updated = chars.join('').trimEnd();
            onChange(updated);
            if (digit && i < 5) fields.current[i + 1]?.focus();
            const cleanDigits = updated.replace(/\s/g, '');
            if (cleanDigits.length === 6) {
              onComplete?.(cleanDigits);
            }
          }}
          onKeyDown={(e) => {
            if (disabled) return;
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

/* ─── Shared style tokens ─── */
const INPUT_BASE_CLS =
  'w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 py-2.5 text-sm text-gray-900 ' +
  'transition-all placeholder:text-gray-400 ' +
  'focus:outline-none focus:border-[#10542C] focus:ring-2 focus:ring-[#10542C]/15 focus:bg-white ' +
  'hover:border-gray-300';

const INPUT_CLS = `mt-1.5 ${INPUT_BASE_CLS}`;

const LABEL_CLS = 'block text-[13px] font-semibold text-gray-600 tracking-wide';

export default function AuthForm({
  initialMode = 'login',
  onSuccess,
}: {
  initialMode?: 'login' | 'register' | 'activate' | 'reset' | 'profile';
  onSuccess?: (u: AuthResponse) => void;
}) {
  const router = useRouter();
  const { setCurrentUser } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'reset' | 'activate' | 'profile'>(() => {
    if (typeof window !== 'undefined') {
      const paramMode = new URLSearchParams(window.location.search).get('mode');
      if (paramMode === 'reset' || paramMode === 'forgot') return 'reset';
      if (paramMode === 'register') return 'register';
      if (paramMode === 'login') return 'login';
      if (paramMode === 'activate') return 'activate';
      if (paramMode === 'profile') return 'profile';
    }
    return initialMode;
  });
  const [isGoogleLogin, setIsGoogleLogin] = useState(false);
  const [googleUser, setGoogleUser] = useState<AuthResponse | null>(null);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [role, setRole] = useState<'FARMER' | 'BUYER'>('BUYER');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
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
      // Nếu đăng nhập Google lần đầu (chưa hoàn thiện thông tin hồ sơ):
      if (
        isGoogleLogin &&
        !result.profileComplete &&
        (result.roles.includes('ROLE_FARMER') || result.roles.includes('ROLE_BUYER'))
      ) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('xanhfarm_user', JSON.stringify(result));
        }
        setCurrentUser(result);
        setGoogleUser(result);
        setChallenge(null);
        setMode('profile');
        if (result.roles.includes('ROLE_FARMER')) setRole('FARMER');
        if (result.roles.includes('ROLE_BUYER')) setRole('BUYER');
        setEmail(result.email);
        setMessage('Xác thực Google thành công! Vui lòng hoàn tất thông tin cá nhân bên dưới để kích hoạt tài khoản.');
        return;
      }
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

  const verifyOtp = (codeToVerify?: string) => {
    if (!challenge || busy) return;
    const cleanOtp = (codeToVerify ?? otp).replace(/\s/g, '');
    if (cleanOtp.length !== 6) return;

    void run(async () => {
      if (mode === 'reset' || mode === 'activate') {
        if (!password || password.length < 10) {
          setError('Vui lòng nhập mật khẩu mới (tối thiểu 10 ký tự)');
          return;
        }
        await api(`auth/${mode === 'reset' ? 'reset-password' : 'activate-staff'}`, 'POST', {
          email,
          otp: cleanOtp,
          password,
        });
        setChallenge(null);
        setMode('login');
        setPassword('');
        setMessage('Đã đặt mật khẩu thành công. Bạn có thể đăng nhập ngay.');
        return;
      }
      const endpoint = challenge.otpType === 'REGISTER_VERIFICATION' ? 'verify-register-otp' : 'gmail-otp/verify';
      accept(await api<AuthResult>(`auth/${endpoint}`, 'POST', { email, otp: cleanOtp, type: challenge.otpType }));
    });
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(async () => {
      // 0. Luồng Hoàn tất thông tin cá nhân (Google lần đầu)
      if (mode === 'profile') {
        const values = Object.fromEntries(form.entries());
        const resolvedBankName =
          role === 'FARMER' && !skipBank
            ? bankCode === 'OTHER'
              ? customBankName.trim()
              : VIETNAM_BANKS.find((b) => b.code === bankCode)?.name || bankCode
            : '';
        const resolvedBankAccount =
          role === 'FARMER' && !skipBank ? ((values.bankAccountNo as string) || '').trim() : '';

        const updated = await api<AuthResponse>('auth/profile', 'PUT', {
          companyName: ((values.companyName as string) || '').trim(),
          taxCode: ((values.taxCode as string) || '').trim(),
          isHouseholdFarmer: household,
          bankAccountNo: resolvedBankAccount,
          bankName: resolvedBankName,
          warehouseAddress: ((values.warehouseAddress as string) || '').trim(),
          pucCode: ((values.pucCode as string) || '').trim(),
          certification: ((values.certification as string) || '').trim(),
          certificationUrl: ((values.certificationUrl as string) || '').trim(),
          phone: ((values.phone as string) || '').trim(),
          address: ((values.address as string) || '').trim(),
        });

        handleSuccess(updated);
        return;
      }

      // 1. Luồng Xác thực OTP
      if (challenge) {
        verifyOtp();
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

      // 4. Đăng nhập
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

      // 5. Đăng ký tài khoản
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

  const field = (
    name: string,
    label: string,
    type = 'text',
    required = true,
    defaultValue = '',
    placeholder = '',
    hint = ''
  ) => (
    <label className="block" key={name}>
      <span className={LABEL_CLS}>
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={name === 'fullName' ? 100 : name === 'username' ? 50 : 150}
        className={INPUT_CLS}
      />
      {hint && <span className="text-[11px] text-gray-400 mt-1 block leading-snug">{hint}</span>}
    </label>
  );

  /* ─── Title map ─── */
  const pageTitle = challenge
    ? 'Xác thực OTP'
    : mode === 'profile'
    ? 'Thông tin cá nhân'
    : mode === 'register'
    ? 'Đăng ký tài khoản'
    : mode === 'reset'
    ? 'Quên mật khẩu'
    : mode === 'activate'
    ? 'Kích hoạt tài khoản'
    : 'Đăng nhập';

  return (
    <div className="space-y-6">
      {/* ─── Logo + Tiêu đề ─── */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <Image
            src="/assets/logo/Logo_full.png"
            alt="HoNa Fresh"
            width={148}
            height={56}
            priority
            className="object-contain h-12 w-auto"
          />
        </div>
        <div>
          <h1 className="text-[22px] font-black text-[#10542C] tracking-tight leading-tight">
            {pageTitle}
          </h1>
          {/* Thin accent line under title */}
          <div className="mt-1.5 mx-auto w-10 h-[3px] rounded-full bg-gradient-to-r from-[#10542C] to-[#8BC34A]" />
        </div>
      </div>

      {/* ─── Thông báo lỗi & thành công ─── */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-xs"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0 fill-current" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="flex-1 leading-snug">{error}</span>
        </div>
      )}
      {message && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-xs"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0 fill-current" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="flex-1 leading-snug">{message}</span>
        </div>
      )}

      {/* ─── Form chính ─── */}
      <form onSubmit={submit} className="space-y-4">
        {challenge ? (
          /* ══════ MÀN HÌNH NHẬP OTP 6 SỐ ══════ */
          <div className="rounded-2xl border border-green-100 bg-gradient-to-b from-green-50/60 to-white px-5 py-6 text-center space-y-4">
            {/* Email target */}
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Mã xác thực đã được gửi đến</p>
              <p className="text-[15px] font-bold text-[#10542C] break-all">{email}</p>
              {/* Timer */}
              <div className="inline-flex items-center gap-1.5 mt-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1">
                <svg className="h-3.5 w-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span className="text-xs font-semibold text-amber-700">
                  Hiệu lực: <strong className="tabular-nums">{formatTimer(expires)}</strong>
                </span>
              </div>
            </div>

            <OtpInput
              value={otp}
              onChange={setOtp}
              onComplete={(code) => {
                if ((mode === 'reset' || mode === 'activate') && (!password || password.length < 10)) {
                  return;
                }
                verifyOtp(code);
              }}
              disabled={busy}
            />

            {(mode === 'reset' || mode === 'activate') && (
              <label className="block text-left">
                <span className={LABEL_CLS}>Mật khẩu mới (tối thiểu 10 ký tự) *</span>
                <div className="relative mt-1.5">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={10}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${INPUT_BASE_CLS} pr-10`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowResetPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#10542C] transition-colors p-1 cursor-pointer focus:outline-none"
                    aria-label={showResetPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                    title={showResetPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  >
                    {showResetPassword ? <EyeOff size={18} className="text-[#10542C]" /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            )}

            <div className="pt-1 flex flex-col items-center gap-2">
              <button
                type="button"
                disabled={busy || cooldown > 0 || challenge.otpType === 'STAFF_ACTIVATION' || challenge.otpType === 'GOOGLE_LOGIN'}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10542C] hover:underline disabled:text-gray-400 disabled:no-underline cursor-pointer transition-colors"
                onClick={() =>
                  void run(async () => {
                    accept(await api<OtpChallenge>('auth/resend-otp', 'POST', { email, type: challenge.otpType }));
                  })
                }
              >
                {cooldown > 0 ? (
                  <>
                    <span className="tabular-nums">Gửi lại mã sau {formatTimer(cooldown)}</span>
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Gửi lại mã OTP
                  </>
                )}
              </button>
              {challenge.otpType === 'STAFF_ACTIVATION' && (
                <p className="text-xs text-gray-500">Mã kích hoạt nằm trong thư mời.</p>
              )}
            </div>
          </div>
        ) : (
          /* ══════ MÀN HÌNH ĐIỀN FORM ══════ */
          <>
            {mode === 'profile' && (
              <>
                {/* Welcome Google Verified Card */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#10542C]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10542C] text-white text-xs">✓</span>
                    Xác thực Google thành công
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    Tài khoản <strong className="text-gray-900">{email}</strong> đã liên kết thành công. Vui lòng hoàn tất thông tin cá nhân bên dưới để kích hoạt tài khoản.
                  </p>
                </div>

                {/* Lựa chọn vai trò */}
                <div className="space-y-2">
                  <span className={LABEL_CLS}>Vai trò tài khoản:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRole('FARMER')}
                      className={`relative text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                        role === 'FARMER'
                          ? 'border-[#10542C] bg-green-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/30'
                      }`}
                    >
                      {role === 'FARMER' && (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#10542C]">
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                      <span className="text-lg">🚜</span>
                      <p className="mt-1 font-bold text-sm text-[#10542C]">Nông dân / Hợp tác xã</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('BUYER')}
                      className={`relative text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                        role === 'BUYER'
                          ? 'border-[#10542C] bg-green-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/30'
                      }`}
                    >
                      {role === 'BUYER' && (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#10542C]">
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                      <span className="text-lg">🏢</span>
                      <p className="mt-1 font-bold text-sm text-[#10542C]">Thương lái / Mua sỉ</p>
                    </button>
                  </div>
                </div>

                {/* Thông tin định danh cơ bản */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {field('fullName', 'Họ và tên người đại diện', 'text', true, googleUser?.fullName || '')}
                  <label className="block">
                    <span className={LABEL_CLS}>Email tài khoản</span>
                    <div className="relative mt-1.5">
                      <input
                        type="email"
                        value={email}
                        disabled
                        className={`${INPUT_BASE_CLS} bg-gray-100/80 text-gray-500 cursor-not-allowed pr-28`}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Đã xác thực
                      </span>
                    </div>
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {field('phone', 'Số điện thoại', 'tel', true)}
                  {field('address', 'Địa chỉ', 'text', true)}
                </div>
              </>
            )}

            {mode === 'register' && (
              <>
                {/* Lựa chọn vai trò */}
                <div className="space-y-2">
                  <span className={LABEL_CLS}>Vai trò:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* FARMER */}
                    <button
                      type="button"
                      onClick={() => setRole('FARMER')}
                      className={`relative text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                        role === 'FARMER'
                          ? 'border-[#10542C] bg-green-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/30'
                      }`}
                    >
                      {role === 'FARMER' && (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#10542C]">
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                      <span className="text-lg">🚜</span>
                      <p className="mt-1 font-bold text-sm text-[#10542C]">Nông dân / Hợp tác xã</p>
                    </button>

                    {/* BUYER */}
                    <button
                      type="button"
                      onClick={() => setRole('BUYER')}
                      className={`relative text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                        role === 'BUYER'
                          ? 'border-[#10542C] bg-green-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/30'
                      }`}
                    >
                      {role === 'BUYER' && (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#10542C]">
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                      <span className="text-lg">🏢</span>
                      <p className="mt-1 font-bold text-sm text-[#10542C]">Thương lái / Mua sỉ</p>
                    </button>
                  </div>
                </div>

                {/* Thông tin định danh cơ bản */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {field('fullName', 'Họ và tên người đại diện', 'text', true)}
                  {field('username', 'Tên đăng nhập', 'text', true)}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className={LABEL_CLS}>Email <span className="text-red-500">*</span></span>
                    <input
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vidu@gmail.com"
                      className={INPUT_CLS}
                    />
                  </label>
                  {field('phone', 'Số điện thoại', 'tel', true)}
                </div>

                {field('address', 'Địa chỉ', 'text', true)}

                {/* Mật khẩu */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className={LABEL_CLS}>Mật khẩu (≥10 ký tự) <span className="text-red-500">*</span></span>
                    <div className="relative mt-1.5">
                      <input
                        name="password"
                        type={showRegisterPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={10}
                        maxLength={72}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${INPUT_BASE_CLS} pr-10`}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowRegisterPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#10542C] transition-colors p-1 cursor-pointer focus:outline-none"
                        aria-label={showRegisterPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                        title={showRegisterPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                      >
                        {showRegisterPassword ? <EyeOff size={18} className="text-[#10542C]" /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>
                  <label className="block">
                    <span className={LABEL_CLS}>Xác nhận mật khẩu <span className="text-red-500">*</span></span>
                    <div className="relative mt-1.5">
                      <input
                        name="confirmPassword"
                        type={showRegisterConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={10}
                        maxLength={72}
                        className={`${INPUT_BASE_CLS} pr-10`}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowRegisterConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#10542C] transition-colors p-1 cursor-pointer focus:outline-none"
                        aria-label={showRegisterConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                        title={showRegisterConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                      >
                        {showRegisterConfirmPassword ? <EyeOff size={18} className="text-[#10542C]" /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>
                </div>
              </>
            )}

            {(mode === 'register' || mode === 'profile') && (
              <>
                {/* Thông tin cơ sở đối tác */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 pt-3 pb-4 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Thông tin {role === 'FARMER' ? 'nông trại / hợp tác xã' : 'doanh nghiệp / vựa thu mua'}
                  </p>

                  {field(
                    'companyName',
                    role === 'FARMER' ? 'Tên nông trại / Hợp tác xã' : 'Tên doanh nghiệp / Vựa thu mua',
                    'text',
                    true,
                    '',
                    role === 'FARMER'
                      ? 'Nông trại Rau sạch Lạc Dương, HTX Nông nghiệp Đà Lạt'
                      : 'Công ty TNHH Rau Sạch hoặc Vựa thu mua'
                  )}

                  {role === 'BUYER' ? (
                    <div className="space-y-3">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={individualBuyer}
                          onChange={(e) => setIndividualBuyer(e.target.checked)}
                          className="rounded border-gray-300 text-[#10542C] focus:ring-[#10542C] w-4 h-4"
                        />
                        <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                          Thương lái cá thể / Bếp ăn (chưa có mã số thuế doanh nghiệp)
                        </span>
                      </label>

                      {field(
                        'taxCode',
                        individualBuyer ? 'Số CCCD / Mã định danh' : 'Mã số thuế doanh nghiệp',
                        'text',
                        !individualBuyer,
                        '',
                        individualBuyer ? 'CCCD (không bắt buộc)' : '10 hoặc 13 chữ số'
                      )}

                      {field(
                        'warehouseAddress',
                        'Địa chỉ kho tiếp nhận / Vựa nhận hàng',
                        'text',
                        true,
                        '',
                        'Địa chỉ tiếp nhận hàng hóa'
                      )}
                    </div>
                  ) : (
                    /* Vai trò FARMER */
                    <div className="space-y-3">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={household}
                          onChange={(e) => setHousehold(e.target.checked)}
                          className="rounded border-gray-300 text-[#10542C] focus:ring-[#10542C] w-4 h-4"
                        />
                        <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                          Đăng ký dưới hình thức Hộ nông dân cá thể
                        </span>
                      </label>

                      {field(
                        'taxCode',
                        household ? 'Số CCCD / Mã định danh (nếu có)' : 'Mã số thuế HTX / Doanh nghiệp',
                        'text',
                        !household,
                        '',
                        household ? 'Số CCCD (không bắt buộc)' : 'Mã số thuế'
                      )}

                      {/* Tài khoản ngân hàng nhận tiền */}
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-3.5 py-3 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                            Tài khoản ngân hàng nhận thanh toán
                          </span>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={skipBank}
                              onChange={(e) => setSkipBank(e.target.checked)}
                              className="rounded border-gray-300 text-[#10542C]"
                            />
                            <span className="text-xs text-gray-500">Bổ sung sau</span>
                          </label>
                        </div>

                        {!skipBank ? (
                          <div className="grid sm:grid-cols-2 gap-3">
                            <label className="block">
                              <span className={LABEL_CLS}>Ngân hàng thụ hưởng <span className="text-red-500">*</span></span>
                              <select
                                value={bankCode}
                                onChange={(e) => setBankCode(e.target.value)}
                                className={INPUT_CLS}
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
                                  placeholder="Nhập tên ngân hàng..."
                                  className={INPUT_CLS + ' mt-2'}
                                />
                              )}
                            </label>

                            <label className="block">
                              <span className={LABEL_CLS}>Số tài khoản ngân hàng <span className="text-red-500">*</span></span>
                              <input
                                name="bankAccountNo"
                                type="text"
                                required={!skipBank}
                                placeholder="Số tài khoản chính chủ"
                                className={INPUT_CLS}
                              />
                            </label>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Có thể bổ sung thông tin tài khoản ngân hàng sau trong trang quản trị.
                          </p>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        {field('pucCode', 'Mã số vùng trồng PUC', 'text', false, '', 'Ví dụ: PUC-VN-DL-0982')}
                        {field('certification', 'Tiêu chuẩn chất lượng', 'text', false, '', 'Ví dụ: VietGAP, GlobalGAP, Hữu cơ')}
                      </div>
                      <ImageUploadField
                        name="certificationUrl"
                        label="Ảnh chứng chỉ chất lượng (VietGAP / GlobalGAP)"
                        purpose="CERTIFICATE"
                        required={false}
                        hint="Hỗ trợ JPG, PNG, WebP ≤ 5MB"
                      />
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer group pt-0.5">
                  <input type="checkbox" required className="mt-0.5 rounded border-gray-300 text-[#10542C] focus:ring-[#10542C]" />
                  <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-700 transition-colors">
                    Tôi cam kết thông tin kê khai là chính xác và đồng ý với Quy chế hoạt động của HoNa Fresh.
                  </span>
                </label>
              </>
            )}

            {mode === 'login' && (
              <>
                {/* Tab phương thức đăng nhập */}
                <div className="flex bg-gray-100/80 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => { setLoginMethod('password'); setError(''); }}
                    className={`flex-1 py-2.5 rounded-lg transition-all cursor-pointer ${
                      loginMethod === 'password'
                        ? 'bg-white text-[#10542C] shadow-sm font-bold'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Mật khẩu
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginMethod('otp'); setError(''); }}
                    className={`flex-1 py-2.5 rounded-lg transition-all cursor-pointer ${
                      loginMethod === 'otp'
                        ? 'bg-white text-[#10542C] shadow-sm font-bold'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Mã OTP Email
                  </button>
                </div>

                {loginMethod === 'password' ? (
                  <div className="space-y-3.5">
                    <label className="block">
                      <span className={LABEL_CLS}>Tên đăng nhập hoặc Email</span>
                      <input
                        name="username"
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Tên đăng nhập hoặc email"
                        className={INPUT_CLS}
                      />
                    </label>

                    <label className="block">
                      <span className={LABEL_CLS}>Mật khẩu</span>
                      <div className="relative mt-1.5">
                        <input
                          name="password"
                          type={showLoginPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${INPUT_BASE_CLS} pr-10`}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowLoginPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#10542C] transition-colors p-1 cursor-pointer focus:outline-none"
                          aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                          title={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                        >
                          {showLoginPassword ? <EyeOff size={18} className="text-[#10542C]" /> : <Eye size={18} />}
                        </button>
                      </div>
                    </label>

                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          name="remember"
                          type="checkbox"
                          className="rounded border-gray-300 text-[#10542C] focus:ring-[#10542C]"
                        />
                        <span className="text-gray-500 group-hover:text-gray-700 transition-colors">
                          Ghi nhớ đăng nhập
                        </span>
                      </label>
                      <button
                        type="button"
                        className="font-semibold text-[#10542C] hover:underline cursor-pointer transition-colors"
                        onClick={() => {
                          setMode('reset');
                          setError('');
                        }}
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Đăng nhập bằng OTP */
                  <label className="block">
                    <span className={LABEL_CLS}>Email đã đăng ký</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className={INPUT_CLS}
                    />
                  </label>
                )}
              </>
            )}

            {(mode === 'reset' || mode === 'activate') && (
              <label className="block">
                <span className={LABEL_CLS}>Email tài khoản</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className={INPUT_CLS}
                />
              </label>
            )}
          </>
        )}

        {/* ─── Nút Submit chính ─── */}
        <button
          type="submit"
          disabled={busy || (!!challenge && otp.replace(/\s/g, '').length !== 6)}
          className="
            w-full relative overflow-hidden rounded-xl py-3 px-4
            bg-[#10542C] hover:bg-[#0d4524] active:scale-[0.98]
            text-white font-bold text-sm tracking-wide
            shadow-[0_4px_14px_rgba(16,84,44,0.3)] hover:shadow-[0_6px_20px_rgba(16,84,44,0.4)]
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100
            cursor-pointer
          "
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Đang xử lý…
            </span>
          ) : challenge ? (
            mode === 'reset' ? 'Đặt lại mật khẩu' : 'Xác nhận OTP'
          ) : mode === 'profile' ? (
            'Lưu thông tin & Bắt đầu'
          ) : mode === 'register' ? (
            'Đăng ký'
          ) : mode === 'activate' ? (
            'Tiếp tục'
          ) : mode === 'reset' ? (
            'Gửi mã xác thực'
          ) : loginMethod === 'otp' ? (
            'Gửi mã OTP'
          ) : (
            'Đăng nhập'
          )}
        </button>
      </form>

      {/* ─── Đăng nhập / Đăng ký nhanh với Google ─── */}
      {!challenge && mode !== 'profile' && (mode === 'login' || mode === 'register') && (
        <div className="space-y-3 pt-1">
          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Hoặc tiếp tục với
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {mode === 'login' && (
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="text-gray-500">Vai trò nếu tạo tài khoản mới:</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'FARMER' | 'BUYER')}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#10542C] focus:outline-none focus:border-[#10542C] cursor-pointer"
              >
                <option value="BUYER">Thương lái / Mua sỉ</option>
                <option value="FARMER">Nông dân / Hợp tác xã</option>
              </select>
            </div>
          )}

          <GoogleButton
            onCredential={(idToken) =>
              void run(async () => {
                setIsGoogleLogin(true);
                accept(
                  await api<OtpChallenge>('auth/google-login', 'POST', {
                    idToken,
                    roleIfNewUser: role,
                  })
                );
              })
            }
          />
        </div>
      )}

      {/* ─── Nút quay lại khi đang nhập OTP ─── */}
      {challenge && (
        <div className="text-center">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            onClick={() => { setChallenge(null); setOtp(''); setError(''); }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại
          </button>
        </div>
      )}

      {/* ─── Điều hướng chuyển trang ─── */}
      <div className="flex flex-wrap justify-between items-center gap-2 border-t border-gray-100 pt-4 text-xs">
        {mode === 'profile' ? (
          <button
            type="button"
            onClick={() => {
              void api('auth/logout', 'POST').catch(() => {});
              setCurrentUser(null);
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('xanhfarm_user');
                localStorage.removeItem('xanhfarm_user');
              }
              setMode('login');
              setChallenge(null);
              setError('');
            }}
            className="font-semibold text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            ← Đăng xuất tài khoản này
          </button>
        ) : mode === 'reset' ? (
          <button
            type="button"
            onClick={() => { setMode('login'); setChallenge(null); setError(''); }}
            className="font-semibold text-[#10542C] hover:underline cursor-pointer transition-colors"
          >
            ← Quay lại đăng nhập
          </button>
        ) : (
          <Link
            href={mode === 'register' ? '/dang-nhap' : '/dang-ky'}
            className="font-semibold text-[#10542C] hover:underline transition-colors"
          >
            {mode === 'register' ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
          </Link>
        )}

        <div className="flex items-center gap-3 text-gray-400">
          {mode !== 'login' && mode !== 'reset' && mode !== 'profile' && (
            <button
              type="button"
              onClick={() => { setMode('login'); setChallenge(null); setError(''); }}
              className="font-semibold text-[#10542C] hover:underline cursor-pointer transition-colors"
            >
              Về đăng nhập
            </button>
          )}
          {mode !== 'profile' && (
            <Link href="/kich-hoat" className="hover:underline hover:text-gray-600 transition-colors">
              Kích hoạt tài khoản
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
