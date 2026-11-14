'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  AuthAlert,
  AuthLayout,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '@/components/auth/AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError('Layanan autentikasi belum dikonfigurasi.');
      return;
    }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      }
    );
    setLoading(false);
    if (resetError && resetError.message.toLowerCase().includes('rate limit')) {
      setError('Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.');
      return;
    }
    // Always show success to avoid revealing which emails are registered
    setSent(true);
  };

  return (
    <AuthLayout
      title="Lupa kata sandi?"
      subtitle="Masukkan email akun Anda. Kami kirimkan tautan untuk membuat kata sandi baru."
      footer={
        <Link href="/login" className="font-bold text-brand-400 hover:underline">
          ← Kembali ke halaman masuk
        </Link>
      }
    >
      {error && <AuthAlert variant="error">{error}</AuthAlert>}

      {sent ? (
        <AuthAlert variant="success">
          Jika email tersebut terdaftar, tautan reset kata sandi sudah dikirim.
          Periksa kotak masuk (dan folder Spam) Anda.
        </AuthAlert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className={authLabelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@cafe.com"
              className={authInputClass}
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading || !email} className={authButtonClass}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            <span>{loading ? 'Mengirim...' : 'Kirim Tautan Reset'}</span>
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
