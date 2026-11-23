import Link from 'next/link';
import AuthForm from '@/components/AuthForm';

export default function ActivatePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#F0F7F2] via-[#F9F9F5] to-[#EDF5EE] flex flex-col justify-center px-4 py-10">
      {/* Back link */}
      <div className="max-w-[460px] w-full mx-auto mb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10542C] hover:text-[#0d4524] transition-colors group"
        >
          <svg
            className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Trang chủ
        </Link>
      </div>

      {/* Form card */}
      <div className="max-w-[460px] w-full mx-auto">
        <section className="bg-white rounded-2xl border border-gray-200/80 px-7 py-8 shadow-[0_8px_32px_rgba(16,84,44,0.08)]">
          <AuthForm initialMode="activate" />
        </section>
      </div>
    </main>
  );
}
