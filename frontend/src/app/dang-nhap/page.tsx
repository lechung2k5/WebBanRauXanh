import Link from 'next/link';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F9F9F5] px-4 py-8 sm:py-12 flex flex-col justify-center">
      <div className="max-w-xl w-full mx-auto">
        <div className="mb-4">
          <Link
            href="/"
            className="font-bold text-green-900 inline-flex items-center gap-1.5 hover:text-green-800 transition-colors"
          >
            ← HoNa Fresh
          </Link>
        </div>
        <section className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <AuthForm initialMode="login" />
        </section>
      </div>
    </main>
  );
}
