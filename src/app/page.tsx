'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePos } from '@/context/PosContext';
import { ThermalReceiptPreview } from '@/components/receipt/ThermalReceiptPreview';
import { createSamplePreviewOrder } from '@/lib/thermal-printer';
import { PLANS } from '@/lib/plans';
import { formatIDR } from '@/lib/pricing';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_RECEIPT_SETTINGS,
} from '@/lib/seed-data';
import { ReceiptTemplate } from '@/types/pos';
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Cloud,
  Coffee,
  CreditCard,
  LayoutGrid,
  Loader2,
  Lock,
  LogIn,
  Menu,
  Moon,
  Percent,
  Printer,
  QrCode,
  Receipt,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Wand2,
  Wifi,
  X,
} from 'lucide-react';

export default function LandingPage() {
  const { theme, toggleTheme } = usePos();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Interactive Receipt Playground State on Landing Page
  const [demoCafeName, setDemoCafeName] = useState('Cafe Anda');
  const [demoTagline, setDemoTagline] = useState(
    'Seduhan Hangat di Setiap Cerita'
  );
  const [demoLogo, setDemoLogo] = useState('☕');
  const [demoTemplate, setDemoTemplate] = useState<ReceiptTemplate>('modern');
  const [demoPaperWidth, setDemoPaperWidth] = useState<58 | 80>(58);
  const [demoTaxEnabled, setDemoTaxEnabled] = useState(true);
  const [demoShowQr, setDemoShowQr] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly'
  );

  const previewOrder = useMemo(() => {
    return createSamplePreviewOrder(
      {
        ...DEFAULT_BUSINESS_SETTINGS,
        businessName: demoCafeName || 'Nama Cafe Anda',
        tagline: demoTagline,
        logoText: demoLogo,
        taxEnabled: demoTaxEnabled,
        taxRate: 10,
      },
      {
        ...DEFAULT_RECEIPT_SETTINGS,
        template: demoTemplate,
        paperWidth: demoPaperWidth,
        showQr: demoShowQr,
      }
    );
  }, [
    demoCafeName,
    demoTagline,
    demoLogo,
    demoTemplate,
    demoPaperWidth,
    demoTaxEnabled,
    demoShowQr,
  ]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* ================= STICKY TOP NAVBAR ================= */}
      <header className="sticky top-0 z-40 bg-stone-950/90 backdrop-blur border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center font-extrabold text-white text-lg shadow-md shadow-brand-600/20">
              ☕
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-stone-100 tracking-tight">
                  MyPOS
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30">
                  Universal Cafe SaaS
                </span>
              </div>
              <p className="text-[10.5px] text-stone-400 hidden sm:block">
                Point of Sales & Custom Thermal Receipt
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-stone-300">
            <a
              href="#fitur"
              className="hover:text-brand-400 transition-colors"
            >
              Fitur Unggulan
            </a>
            <a href="#alur" className="hover:text-brand-400 transition-colors">
              Alur Kasir Pay-First
            </a>
            <a
              href="#kustomisasi-struk"
              className="hover:text-brand-400 transition-colors"
            >
              Simulasi Struk
            </a>
            <a
              href="#harga"
              className="hover:text-brand-400 transition-colors"
            >
              Paket & Harga
            </a>
            <a href="#faq" className="hover:text-brand-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right CTAs & Theme Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              title={
                theme === 'dark'
                  ? 'Beralih ke Mode Terang'
                  : 'Beralih ke Mode Gelap'
              }
              className="p-2 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-200 flex items-center gap-1.5 text-xs font-bold transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-brand-500" />
                  <span className="hidden sm:inline">Gelap</span>
                </>
              )}
            </button>

            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-brand-400" />
              <span>Masuk</span>
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/25 transition-all"
            >
              <span>Daftar Gratis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300"
              aria-label="Menu Navigasi"
            >
              {mobileNavOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="lg:hidden bg-stone-900 border-t border-stone-800 px-4 py-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 font-bold">
              <a
                href="#fitur"
                onClick={() => setMobileNavOpen(false)}
                className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-200"
              >
                Fitur Unggulan
              </a>
              <a
                href="#alur"
                onClick={() => setMobileNavOpen(false)}
                className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-200"
              >
                Alur Pay-First
              </a>
              <a
                href="#kustomisasi-struk"
                onClick={() => setMobileNavOpen(false)}
                className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-200"
              >
                Simulasi Struk
              </a>
              <a
                href="#harga"
                onClick={() => setMobileNavOpen(false)}
                className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-200"
              >
                Paket & Harga
              </a>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-stone-800">
              <Link
                href="/login"
                className="flex-1 py-2.5 rounded-xl font-bold bg-stone-950 border border-stone-800 text-center text-stone-200"
              >
                Masuk Akun
              </Link>
              <Link
                href="/register"
                className="flex-1 py-2.5 rounded-xl font-extrabold bg-brand-600 text-center text-white"
              >
                Daftar Cafe Baru
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ================= HERO SECTION & INTERACTIVE RECEIPT SANDBOX ================= */}
      <section
        id="kustomisasi-struk"
        className="relative overflow-hidden py-10 sm:py-16 lg:py-20 border-b border-stone-800/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Hero Copy & Interactive Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                POS Universal untuk Semua Cafe • Cetak Thermal ESC/POS Langsung
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-100 leading-[1.15]">
              Kasir Cafe Cepat dengan{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-amber-400">
                Identitas Struk Milik Brand Anda Sendiri.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-stone-400 leading-relaxed max-w-2xl">
              Dirancang khusus untuk alur operasional cafe modern:{' '}
              <strong className="text-stone-200">
                Pelanggan memesan di kasir → Bayar di muka (Pay-First) → Cetak
                struk thermal otomatis → Masuk antrean barista real-time.
              </strong>{' '}
              Dilengkapi kustomisasi penuh struk, saklar PPN fleksibel
              (Aktif/Nonaktif), dan sinkronisasi cloud Supabase.
            </p>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/register"
                className="px-5 py-3.5 rounded-2xl text-sm font-extrabold bg-brand-600 hover:bg-brand-500 text-white shadow-xl shadow-brand-600/25 flex items-center gap-2 transition-all"
              >
                <span>Mulai Trial Gratis 14 Hari</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/login"
                className="px-5 py-3.5 rounded-2xl text-sm font-extrabold bg-stone-900 hover:bg-stone-800 text-stone-100 border border-stone-700 flex items-center gap-2 transition-all"
              >
                <LogIn className="w-4 h-4 text-brand-400" />
                <span>Masuk ke Akun Cafe</span>
              </Link>
            </div>

            {/* Live Receipt Customizer Sandbox Card */}
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-brand-400" />
                  <span className="text-xs font-extrabold text-stone-100 uppercase tracking-wider">
                    Coba Kustomisasi Struk Cafe Anda Sekarang (Live Preview)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-semibold">
                  ● Langsung berubah di struk kanan
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">
                    Nama Cafe Anda
                  </label>
                  <input
                    type="text"
                    value={demoCafeName}
                    onChange={(e) => setDemoCafeName(e.target.value)}
                    placeholder="Mis: Kopi Senja Utama"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-bold focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">
                    Tagline / Slogan Struk
                  </label>
                  <input
                    type="text"
                    value={demoTagline}
                    onChange={(e) => setDemoTagline(e.target.value)}
                    placeholder="Seduhan Hangat di Setiap Cerita"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                {/* Logo Icon Picker */}
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-400 font-semibold mr-1">
                    Logo:
                  </span>
                  {['☕', '🥐', '🍵', '🧋', '🍰'].map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setDemoLogo(ic)}
                      className={`w-8 h-8 rounded-lg border text-sm flex items-center justify-center transition-all ${
                        demoLogo === ic
                          ? 'border-brand-500 bg-brand-500/20'
                          : 'border-stone-800 bg-stone-950'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>

                {/* Template Picker */}
                <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
                  {(
                    [
                      { id: 'minimal', label: 'Minimal' },
                      { id: 'classic', label: 'Klasik' },
                      { id: 'modern', label: 'Modern' },
                    ] as { id: ReceiptTemplate; label: string }[]
                  ).map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setDemoTemplate(tpl.id)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        demoTemplate === tpl.id
                          ? 'bg-brand-600 text-white'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>

                {/* PPN ON/OFF & Paper Width Toggles */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDemoTaxEnabled(!demoTaxEnabled)}
                    className={`px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 transition-colors ${
                      demoTaxEnabled
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-stone-950 border-stone-800 text-stone-400'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>PPN 10%: {demoTaxEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDemoPaperWidth(demoPaperWidth === 58 ? 80 : 58)
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 font-mono font-bold"
                  >
                    {demoPaperWidth}mm
                  </button>

                  <button
                    type="button"
                    onClick={() => setDemoShowQr(!demoShowQr)}
                    className={`px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 ${
                      demoShowQr
                        ? 'bg-brand-500/15 border-brand-500/40 text-brand-400'
                        : 'bg-stone-950 border-stone-800 text-stone-400'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QR</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Live Thermal Receipt Preview (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[370px] space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-400 px-2">
                <span className="font-bold text-stone-200 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-brand-400" />
                  <span>Simulasi Kertas Thermal Real-Time</span>
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-brand-400">
                  {demoTemplate.toUpperCase()} • {demoPaperWidth}MM
                </span>
              </div>

              <ThermalReceiptPreview order={previewOrder} animateFeed={false} />
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4-STEP PAY-FIRST WORKFLOW SECTION ================= */}
      <section
        id="alur"
        className="py-14 sm:py-20 bg-stone-900/50 border-b border-stone-800/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-400">
              Alur Operasional Standar Cafe Modern
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-100">
              4 Langkah Alur Kasir Pay-First Tanpa Pesanan Terlewat
            </h2>
            <p className="text-xs sm:text-sm text-stone-400">
              Mengatasi masalah pencatatan manual, salah hitung diskon/pajak,
              dan antrean dapur yang berantakan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                title: 'Pelanggan Pesan di Kasir',
                desc: 'Kasir memilih menu, varian (Hot/Ice/Oat Milk), catatan khusus (less sugar), serta tipe pesanan Dine-In atau Takeaway.',
                icon: LayoutGrid,
              },
              {
                step: '02',
                title: 'Hitung Otomatis & Opsi PPN',
                desc: 'Sistem menghitung Subtotal, Promo Diskon, DPP, serta PPN (yang dapat diaktifkan atau dinonaktifkan kapan saja) secara akurat.',
                icon: Percent,
              },
              {
                step: '03',
                title: 'Bayar & Cetak Struk Thermal',
                desc: 'Terima pembayaran Tunai, QRIS, atau Transfer. Struk beridentitas cafe Anda langsung tercetak via printer thermal ESC/POS.',
                icon: Printer,
              },
              {
                step: '04',
                title: 'Antrean Barista & Antar',
                desc: 'Pesanan yang sudah lunas otomatis muncul di layar Antrean Barista secara real-time hingga siap diantar ke meja pelanggan.',
                icon: Coffee,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-xs font-extrabold text-stone-500">
                        LANGKAH {item.step}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-stone-100">
                      {item.title}
                    </h3>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= FEATURE BENTO GRID ================= */}
      <section
        id="fitur"
        className="py-14 sm:py-20 border-b border-stone-800/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-400">
              Fitur Lengkap Kelas Komersial
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-100">
              Semua yang Dibutuhkan Kedai Kopi & Cafe dalam Satu Sistem
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Receipt,
                title: 'Kustomisasi Identitas & Struk',
                desc: 'Atur logo simbol cafe, nama outlet, slogan, alamat, NPWP, password Wi-Fi pelanggan, pesan footer, hingga QR Code media sosial di struk.',
                badge: 'Signature Feature',
              },
              {
                icon: Printer,
                title: 'Cetak Langsung Thermal 58mm & 80mm',
                desc: 'Dukungan protokol ESC/POS melalui WebUSB, Web Serial, dan Bluetooth untuk cetak instan tanpa dialog browser + buka laci kasir otomatis.',
                badge: 'Hardware Ready',
              },
              {
                icon: Percent,
                title: 'PPN Fleksibel (ON / OFF 1-Klik)',
                desc: 'Bebas mengaktifkan atau menonaktifkan perhitungan PPN/PB1 kapan saja. Mendukung mode pajak Eksklusif maupun Inklusif serta pembulatan tunai.',
                badge: 'Pajak Akurat',
              },
              {
                icon: Coffee,
                title: 'Antrean Barista & Stok Real-Time',
                desc: 'Layar khusus barista untuk memproses pesanan dari Baru Masuk → Diproses → Siap Diantar, lengkap dengan pemotongan stok otomatis.',
                badge: 'Real-Time Sync',
              },
              {
                icon: BarChart3,
                title: 'Laporan Kas & Tutup Buku Terkunci',
                desc: 'Rekonsiliasi uang tunai fisik di laci vs perhitungan sistem di akhir shift. Laporan yang sudah dikunci bersifat immutable untuk audit.',
                badge: 'Anti Selisih Kas',
              },
              {
                icon: Users,
                title: 'Multi-Role RBAC & Cloud Supabase',
                desc: 'Hak akses terpisah untuk Owner/Admin, Kasir, dan Barista/Waiter, dilengkapi PIN otorisasi void transaksi dan sinkronisasi database Supabase.',
                badge: 'Multi-Tenant SaaS',
              },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="bg-stone-900 border border-stone-800 hover:border-brand-500/40 rounded-2xl p-5 space-y-3 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center text-brand-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-stone-950 border border-stone-800 text-stone-300">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-stone-100">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= PRICING SECTION (BASIC VS PRO) ================= */}
      <section
        id="harga"
        className="py-14 sm:py-20 bg-stone-900/40 border-b border-stone-800/80"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-400">
              Pilihan Paket Langganan SaaS
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-100">
              Mulai dengan Basic atau Buka Seluruh Fitur di Pro Plan
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 max-w-xl mx-auto">
              Setiap pendaftaran cafe baru mendapatkan{' '}
              <strong className="text-stone-200">
                Trial Gratis 14 Hari tanpa kartu kredit
              </strong>
              .
            </p>

            {/* Billing Cycle Switch */}
            <div className="inline-flex items-center gap-1 bg-stone-900 p-1.5 rounded-2xl border border-stone-800 text-xs mt-2">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-xl font-bold transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-brand-600 text-white'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Tagihan Bulanan
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-brand-600 text-white'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>Tagihan Tahunan</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-extrabold">
                  Hemat 2 Bulan
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Plan Card */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-extrabold text-stone-100">
                    {PLANS.basic.name}
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    {PLANS.basic.tagline}
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black font-mono text-stone-100">
                    {formatIDR(
                      billingCycle === 'monthly'
                        ? PLANS.basic.priceMonthly
                        : PLANS.basic.priceYearly
                    )}
                  </span>
                  <span className="text-xs text-stone-400">
                    / {billingCycle === 'monthly' ? 'bulan' : 'tahun'}
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-stone-300 pt-2 border-t border-stone-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Maksimal 3 Akun Staf (Admin, Kasir, Barista)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Hingga 50 Produk Menu & Stok Real-Time</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Kasir Pay-First, Opsi PPN ON/OFF & Antrean Barista</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cetak Thermal ESC/POS (58mm/80mm) & 1 Template Struk</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Laporan Kas Harian & Rekonsiliasi Tutup Buku</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/register?plan=basic"
                className="w-full py-3 rounded-xl text-xs font-extrabold bg-stone-800 hover:bg-stone-700 text-stone-100 text-center transition-colors"
              >
                Daftar dengan Basic Plan
              </Link>
            </div>

            {/* Pro Plan Card */}
            <div className="bg-stone-900 border-2 border-brand-500 rounded-3xl p-6 flex flex-col justify-between space-y-6 relative shadow-2xl shadow-brand-600/10">
              <div className="absolute -top-3 right-6 bg-brand-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider">
                Paling Populer • Semua Fitur
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-extrabold text-brand-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>{PLANS.pro.name}</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    {PLANS.pro.tagline}
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black font-mono text-brand-400">
                    {formatIDR(
                      billingCycle === 'monthly'
                        ? PLANS.pro.priceMonthly
                        : PLANS.pro.priceYearly
                    )}
                  </span>
                  <span className="text-xs text-stone-400">
                    / {billingCycle === 'monthly' ? 'bulan' : 'tahun'}
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-stone-200 pt-2 border-t border-stone-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-400 shrink-0" />
                    <span>
                      <strong>Produk Menu Tanpa Batas</strong> & Hingga 15 Akun
                      Staf
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-400 shrink-0" />
                    <span>
                      Semua 3 Template Struk (Minimal, Klasik, Modern Badge)
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-400 shrink-0" />
                    <span>
                      QR Code Kustom di Struk, Prefix Nomor Invoice & Struk
                      Digital Publik
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-400 shrink-0" />
                    <span>
                      Varian Produk (Hot/Ice/Size), Hold Order & Promo Diskon
                      Tanpa Batas
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-400 shrink-0" />
                    <span>
                      Analitik Produk Terlaris & Ekspor Laporan CSV / PDF
                    </span>
                  </li>
                </ul>
              </div>

              <Link
                href="/register?plan=pro"
                className="w-full py-3 rounded-xl text-xs font-extrabold bg-brand-600 hover:bg-brand-500 text-white text-center shadow-lg shadow-brand-600/30 transition-colors"
              >
                Mulai Trial Pro Plan Gratis 14 Hari
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FAQ SECTION ================= */}
      <section id="faq" className="py-14 sm:py-16 border-b border-stone-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-stone-100">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h2>
            <p className="text-xs text-stone-400">
              Informasi teknis seputar penggunaan MyPOS di outlet cafe Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {[
              {
                q: 'Apakah PPN wajib atau bisa dimatikan?',
                a: 'Sangat fleksibel! Anda dapat mengaktifkan atau menonaktifkan PPN hanya dengan 1 klik melalui tombol di bar atas, di keranjang kasir, maupun di menu Pengaturan.',
              },
              {
                q: 'Printer thermal apa saja yang didukung?',
                a: 'Semua printer thermal ukuran 58mm dan 80mm yang mendukung perintah standar ESC/POS baik melalui kabel USB (WebUSB/Serial) maupun Bluetooth.',
              },
              {
                q: 'Apakah perubahan nama cafe mengubah struk transaksi lama?',
                a: 'Tidak. Setiap transaksi yang sudah lunas menyimpan receipt_snapshot permanen sehingga cetakan ulang struk lama tetap menampilkan identitas dan tarif pajak saat transaksi terjadi.',
              },
              {
                q: 'Bagaimana jika koneksi internet cafe sedang terputus?',
                a: 'MyPOS menyimpan state operasional secara lokal dan menyinkronkannya otomatis ke database cloud Supabase ketika koneksi kembali stabil.',
              },
            ].map((item) => (
              <div
                key={item.q}
                className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-1.5"
              >
                <h3 className="font-extrabold text-stone-100 text-sm">
                  {item.q}
                </h3>
                <p className="text-stone-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="py-8 bg-stone-950 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">
              ☕
            </span>
            <span className="font-bold text-stone-300">MyPOS</span>
            <span>
              — Sistem POS Universal & Kustomisasi Struk Thermal untuk Cafe
            </span>
          </div>
          <div className="flex items-center gap-4 font-semibold text-stone-400">
            <Link href="/login" className="hover:text-brand-400">
              Masuk
            </Link>
            <Link href="/register" className="hover:text-brand-400">
              Daftar Cafe Baru
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
