import Link from 'next/link';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F9F9F5] px-4 py-12">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="font-bold text-green-900">
          ← HoNa Fresh
        </Link>
        <section className="bg-white border rounded-3xl p-6 sm:p-8 mt-6 shadow-sm">
          <AuthForm initialMode="login" />
        </section>
      </div>
    </main>
  );
}
