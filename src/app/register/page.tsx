'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Eye, EyeOff, Loader2, MailCheck, Sparkles } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { PLANS } from '@/lib/plans';
import { formatIDR } from '@/lib/pricing';
import {
  AuthAlert,
  AuthLayout,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '@/components/auth/AuthLayout';

function passwordScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get('plan') === 'basic' ? 'basic' : 'pro';

  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [planCode, setPlanCode] = useState<'basic' | 'pro'>(initialPlan);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  const score = useMemo(() => passwordScore(password), [password]);
  const scoreLabel = ['Terlalu pendek', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'][score];
  const scoreColor = ['bg-stone-700', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-400'][score];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }
    if (!agree) {
      setError('Setujui Syarat & Ketentuan untuk melanjutkan.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          businessName,
          phone,
          email,
          password,
          planCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Pendaftaran gagal. Silakan coba lagi.');
        setLoading(false);
        return;
      }

      if (data.needsEmailConfirmation) {
        setConfirmationSentTo(email.trim().toLowerCase());
        setLoading(false);
        return;
      }

      // Email confirmation disabled on the project: sign in right away
      const supabase = createSupabaseBrowserClient();
      if (supabase) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (!signInError) {
          window.location.assign('/onboarding');
          return;
        }
      }
      window.location.assign('/login?registered=1');
    } catch {
      setError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      setLoading(false);
    }
  };

  if (confirmationSentTo) {
    return (
      <AuthLayout
        title="Cek email Anda"
        subtitle="Satu langkah lagi sebelum kasir Anda siap dipakai."
        footer={
          <>
            Sudah konfirmasi?{' '}
            <Link href="/login" className="font-bold text-brand-400 hover:underline">
              Masuk sekarang
            </Link>
          </>
        }
      >
        <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 text-center space-y-3">
          <MailCheck className="w-10 h-10 text-emerald-400 mx-auto" />
          <p className="text-sm text-stone-300">
            Kami mengirim tautan konfirmasi ke{' '}
            <strong className="text-stone-100">{confirmationSentTo}</strong>. Klik
            tautan tersebut untuk mengaktifkan akun dan memulai wizard
            pengaturan cafe.
          </p>
          <p className="text-xs text-stone-500">
            Tidak menemukan email? Periksa folder Spam atau Promosi.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Daftarkan cafe Anda"
      subtitle="Gratis 14 hari. Tanpa kartu kredit."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link href="/login" className="font-bold text-brand-400 hover:underline">
            Masuk
          </Link>
        </>
      }
    >
      {error && <AuthAlert variant="error">{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Plan picker */}
        <fieldset>
          <legend className={authLabelClass}>Pilih paket</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['basic', 'pro'] as const).map((code) => {
              const plan = PLANS[code];
              const selected = planCode === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setPlanCode(code)}
                  aria-pressed={selected}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selected
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-stone-800 bg-stone-900 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-stone-100 flex items-center gap-1">
                      {code === 'pro' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      {plan.name}
                    </span>
                    {selected && <Check className="w-4 h-4 text-brand-400" />}
                  </div>
                  <p className="text-xs font-mono text-stone-400 mt-1">
                    {formatIDR(plan.priceMonthly)}/bln
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-stone-500 mt-1.5">
            Paket dapat diubah kapan saja setelah masa trial.
          </p>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fullName" className={authLabelClass}>
              Nama lengkap
            </label>
            <input
              id="fullName"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Raka Pratama"
              className={authInputClass}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="businessName" className={authLabelClass}>
              Nama cafe
            </label>
            <input
              id="businessName"
              autoComplete="organization"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Kopi Senja"
              className={authInputClass}
              disabled={loading}
            />
          </div>
        </div>

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

        <div>
          <label htmlFor="phone" className={authLabelClass}>
            No. WhatsApp <span className="text-stone-500 font-normal">(opsional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0812-3456-7890"
            className={authInputClass}
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className={authLabelClass}>
            Kata sandi
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className={`${authInputClass} pr-11`}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 grid grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full ${i <= score ? scoreColor : 'bg-stone-800'}`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-stone-400 w-20 text-right">{scoreLabel}</span>
            </div>
          )}
        </div>

        <label className="flex items-start gap-2.5 text-xs text-stone-400 cursor-pointer">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 rounded border-stone-700 bg-stone-900 text-brand-600 focus:ring-0"
          />
          <span>
            Saya menyetujui Syarat & Ketentuan serta Kebijakan Privasi MyPOS.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !fullName || !businessName || !email || !password}
          className={authButtonClass}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{loading ? 'Menyiapkan cafe Anda...' : 'Buat Akun & Mulai Trial'}</span>
        </button>
      </form>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
