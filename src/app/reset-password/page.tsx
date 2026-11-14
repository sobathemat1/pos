'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { KeyRound, Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  AuthAlert,
  AuthLayout,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '@/components/auth/AuthLayout';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // The recovery link (via /auth/callback) creates a temporary session
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setHasSession(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => setHasSession(Boolean(data.user)));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }
    if (password !== confirm) {
      setError('Konfirmasi kata sandi tidak sama.');
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(
        updateError.message.toLowerCase().includes('different')
          ? 'Kata sandi baru harus berbeda dari kata sandi lama.'
          : 'Gagal memperbarui kata sandi. Minta tautan reset baru lalu coba lagi.'
      );
      setLoading(false);
      return;
    }
    await supabase.auth.signOut();
    window.location.assign('/login?reset=1');
  };

  return (
    <AuthLayout
      title="Buat kata sandi baru"
      subtitle="Gunakan minimal 8 karakter yang belum pernah Anda pakai."
      footer={
        <Link href="/login" className="font-bold text-brand-400 hover:underline">
          ← Kembali ke halaman masuk
        </Link>
      }
    >
      {hasSession === false && (
        <AuthAlert variant="error">
          Tautan reset tidak valid atau sudah kedaluwarsa.{' '}
          <Link href="/forgot-password" className="underline font-bold">
            Minta tautan baru
          </Link>
          .
        </AuthAlert>
      )}
      {error && <AuthAlert variant="error">{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="password" className={authLabelClass}>
            Kata sandi baru
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            disabled={loading || hasSession === false}
          />
        </div>
        <div>
          <label htmlFor="confirm" className={authLabelClass}>
            Ulangi kata sandi baru
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={authInputClass}
            disabled={loading || hasSession === false}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !password || !confirm || hasSession === false}
          className={authButtonClass}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          <span>{loading ? 'Menyimpan...' : 'Simpan Kata Sandi'}</span>
        </button>
      </form>
    </AuthLayout>
  );
}
