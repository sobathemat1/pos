'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  AuthAlert,
  AuthLayout,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '@/components/auth/AuthLayout';

function mapLoginError(message: string) {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials'))
    return 'Email atau kata sandi salah.';
  if (m.includes('email not confirmed'))
    return 'Email belum dikonfirmasi. Cek kotak masuk Anda untuk tautan konfirmasi.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
  return 'Gagal masuk. Periksa koneksi internet lalu coba lagi.';
}

function LoginForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/pos';
  const next =
    nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/pos';
  const urlError = searchParams.get('error');
  const justRegistered = searchParams.get('registered') === '1';
  const passwordReset = searchParams.get('reset') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError('Konfigurasi database Supabase belum ditemukan.');
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signInError) {
      setError(mapLoginError(signInError.message));
      setLoading(false);
      return;
    }
    window.location.assign(next);
  };

  return (
    <AuthLayout
      title="Masuk Owner / Superadmin"
      subtitle="Login menggunakan email khusus untuk Owner Cafe (Admin) & Superadmin. Akun Staff (Kasir/Barista) masuk di dalam aplikasi menggunakan username & kata sandi."
      footer={
        <div className="space-y-2">
          <div>
            Belum punya akun?{' '}
            <Link
              href="/register"
              className="font-bold text-brand-400 hover:underline"
            >
              Daftar gratis 14 hari
            </Link>
          </div>
          <div>
            <Link
              href="/"
              className="text-xs text-stone-500 hover:text-stone-300"
            >
              ← Kembali ke Beranda Landing Page
            </Link>
          </div>
        </div>
      }
    >
      {justRegistered && (
        <AuthAlert variant="success">
          Akun berhasil dibuat di database. Silakan masuk di bawah ini.
        </AuthAlert>
      )}
      {passwordReset && (
        <AuthAlert variant="success">
          Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru.
        </AuthAlert>
      )}
      {error && <AuthAlert variant="error">{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className={authLabelClass}>
            Email Owner / Superadmin
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@cafeanda.com"
            className={authInputClass}
            disabled={loading}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-stone-300"
            >
              Kata Sandi
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-brand-400 hover:underline"
            >
              Lupa kata sandi?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${authInputClass} pr-11`}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
              aria-label={
                showPassword
                  ? 'Sembunyikan kata sandi'
                  : 'Tampilkan kata sandi'
              }
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className={authButtonClass}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          <span>{loading ? 'Memproses...' : 'Masuk ke Kasir'}</span>
        </button>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
