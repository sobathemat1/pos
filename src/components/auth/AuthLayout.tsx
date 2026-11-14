'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Printer, Receipt, ShieldCheck } from 'lucide-react';

/** Split-screen frame shared by all authentication pages. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 grid lg:grid-cols-2">
      {/* Left: brand panel (hidden on small screens) */}
      <aside className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-brand-900 via-espresso to-stone-950 text-white relative overflow-hidden">
        <Link href="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-xl">
            ☕
          </div>
          <span className="font-extrabold text-xl tracking-tight">MyPOS</span>
        </Link>

        <div className="space-y-6 relative z-10 max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight">
            Kasir cafe yang struknya terasa seperti milik Anda sendiri.
          </h2>
          <ul className="space-y-3 text-sm text-white/80">
            {[
              { icon: Receipt, text: 'Logo, nama, Wi-Fi & pesan penutup di setiap struk' },
              { icon: Printer, text: 'Cetak langsung ke printer thermal 58mm / 80mm' },
              { icon: ShieldCheck, text: 'Bayar dulu, baru dibuat — tidak ada pesanan terlewat' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/50 relative z-10">
          © {new Date().getFullYear()} MyPOS • POS universal untuk cafe Indonesia
        </p>

        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-brand-600/20 blur-3xl" />
      </aside>

      {/* Right: form */}
      <main className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md mx-auto space-y-6">
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-lg">
              ☕
            </div>
            <span className="font-extrabold text-lg tracking-tight">MyPOS</span>
          </Link>

          <div>
            <h1 className="text-2xl font-extrabold text-stone-100">{title}</h1>
            <p className="text-sm text-stone-400 mt-1">{subtitle}</p>
          </div>

          {children}

          {footer && (
            <div className="text-sm text-stone-400 text-center">{footer}</div>
          )}
        </div>
      </main>
    </div>
  );
}

export function AuthAlert({
  variant,
  children,
}: {
  variant: 'error' | 'success' | 'info';
  children: React.ReactNode;
}) {
  const styles =
    variant === 'error'
      ? 'bg-red-500/10 border-red-500/30 text-red-400'
      : variant === 'success'
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : 'bg-sky-500/10 border-sky-500/30 text-sky-400';
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`p-3 rounded-xl border text-sm flex items-start gap-2 ${styles}`}
    >
      {variant === 'success' && <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

export const authInputClass =
  'w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors disabled:opacity-60';

export const authLabelClass = 'block text-xs font-semibold text-stone-300 mb-1.5';

export const authButtonClass =
  'w-full py-3 rounded-xl font-extrabold text-sm bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/25 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-colors';
