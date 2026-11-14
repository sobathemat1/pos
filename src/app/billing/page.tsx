'use client';

import React, { useState } from 'react';
import { usePos } from '@/context/PosContext';
import { PLANS } from '@/lib/plans';
import { formatIDR } from '@/lib/pricing';
import {
  Check,
  CreditCard,
  FileText,
  Lock,
  Sparkles,
} from 'lucide-react';

export default function PlanAndBillingPage() {
  const {
    subscription,
    invoices,
    products,
    staffList,
    discounts,
    switchSubscriptionPlan,
  } = usePos();

  const [cycle, setCycle] = useState<'monthly' | 'yearly'>(
    subscription.billingCycle
  );

  const activePlan = PLANS[subscription.planCode];
  const activeUsersCount = staffList.filter((s) => s.isActive).length;
  const activeDiscountsCount = discounts.filter((d) => d.isActive).length;

  const featureMatrix = [
    {
      category: 'Kapasitas & Batas',
      name: 'Jumlah Akun Staf (Admin, Kasir, Barista)',
      basic: 'Maks 3 staf',
      pro: 'Hingga 15 staf',
    },
    {
      category: 'Kapasitas & Batas',
      name: 'Jumlah Produk Menu Aktif',
      basic: 'Maks 50 produk',
      pro: 'Tanpa Batas',
    },
    {
      category: 'Kapasitas & Batas',
      name: 'Riwayat Transaksi Tersimpan',
      basic: '90 hari terakhir',
      pro: 'Tanpa Batas',
    },
    {
      category: 'Operasional Kasir & Dapur',
      name: 'Kasir Pay-First, Pajak Wajib & Antrean Barista Real-time',
      basic: true,
      pro: true,
    },
    {
      category: 'Operasional Kasir & Dapur',
      name: 'Cetak Langsung Printer Thermal (ESC/POS 58mm & 80mm)',
      basic: true,
      pro: true,
    },
    {
      category: 'Operasional Kasir & Dapur',
      name: 'Varian Menu, Hold Order & Diskon Tanpa Batas',
      basic: false,
      pro: true,
    },
    {
      category: 'Branding & Kustomisasi Struk',
      name: 'Identitas Bisnis (Nama, Logo, Alamat, Telepon, Wi-Fi, Footer)',
      basic: true,
      pro: true,
    },
    {
      category: 'Branding & Kustomisasi Struk',
      name: 'Koleksi Template Struk (Minimal, Klasik, Modern)',
      basic: '1 (Minimal)',
      pro: 'Semua Template',
    },
    {
      category: 'Branding & Kustomisasi Struk',
      name: 'QR Code di Struk, Prefix Nomor Invoice & Struk Digital Publik',
      basic: false,
      pro: true,
    },
    {
      category: 'Laporan & Data',
      name: 'Laporan Kas Harian (DPP & Pajak) + Rekonsiliasi Tutup Buku',
      basic: true,
      pro: true,
    },
    {
      category: 'Laporan & Data',
      name: 'Analitik Produk Terlaris & Ekspor CSV/PDF',
      basic: false,
      pro: true,
    },
  ];

  return (
    <main className="flex-1 p-4 lg:p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Header & Current Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h1 className="text-lg font-extrabold text-stone-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand-400" />
            <span>Paket Langganan & Tagihan SaaS MyPOS</span>
          </h1>
          <p className="text-xs text-stone-400">
            Pilih antara <strong>Basic Plan</strong> (fitur dasar operasional)
            dan <strong>Pro Plan</strong> (semua fitur kustomisasi & skala
            penuh).
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              cycle === 'monthly'
                ? 'bg-brand-600 text-white'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Bulanan
          </button>
          <button
            type="button"
            onClick={() => setCycle('yearly')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              cycle === 'yearly'
                ? 'bg-brand-600 text-white'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <span>Tahunan</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded">
              Hemat 2 Bulan
            </span>
          </button>
        </div>
      </div>

      {/* Usage Meters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <span className="text-stone-400">Paket Aktif Saat Ini</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-base font-extrabold text-brand-400">
              {activePlan.name}
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300">
              {subscription.status}
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Berlaku s/d: {subscription.currentPeriodEnd}
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <span className="text-stone-400">Kuota Produk Menu</span>
          <p className="text-base font-extrabold font-mono text-stone-100 mt-1">
            {products.length} /{' '}
            {activePlan.limits.max_products > 9000
              ? '∞ (Tanpa Batas)'
              : activePlan.limits.max_products}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">
            Staf aktif: {activeUsersCount} / {activePlan.limits.max_users}
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <span className="text-stone-400">Kuota Promo Diskon Aktif</span>
          <p className="text-base font-extrabold font-mono text-stone-100 mt-1">
            {activeDiscountsCount} /{' '}
            {activePlan.limits.max_active_discounts > 100
              ? '∞ (Tanpa Batas)'
              : activePlan.limits.max_active_discounts}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">
            Gating fitur diterapkan langsung di sistem
          </p>
        </div>
      </div>

      {/* Pricing Cards: Basic vs Pro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {/* Basic Plan */}
        <div
          className={`bg-stone-900 rounded-2xl p-6 flex flex-col justify-between space-y-5 border-2 transition-all ${
            subscription.planCode === 'basic'
              ? 'border-stone-400'
              : 'border-stone-800'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-stone-100">
                {PLANS.basic.name}
              </h2>
              {subscription.planCode === 'basic' && (
                <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-200 font-bold text-[10px]">
                  SEDANG AKTIF
                </span>
              )}
            </div>
            <p className="text-stone-400">{PLANS.basic.tagline}</p>
            <div className="font-mono text-2xl font-black text-stone-100 pt-1">
              {formatIDR(
                cycle === 'monthly'
                  ? PLANS.basic.priceMonthly
                  : PLANS.basic.priceYearly
              )}
              <span className="text-xs font-normal text-stone-400">
                {' '}
                / {cycle === 'monthly' ? 'bulan' : 'tahun'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => switchSubscriptionPlan('basic', cycle)}
            className="w-full py-3 rounded-xl font-extrabold bg-stone-800 hover:bg-stone-700 text-stone-100 transition-colors"
          >
            {subscription.planCode === 'basic'
              ? `Perbarui Basic (${cycle === 'monthly' ? 'Bulanan' : 'Tahunan'})`
              : 'Pindah ke Basic Plan'}
          </button>
        </div>

        {/* Pro Plan */}
        <div
          className={`bg-stone-900 rounded-2xl p-6 flex flex-col justify-between space-y-5 border-2 relative shadow-xl transition-all ${
            subscription.planCode === 'pro'
              ? 'border-brand-500 shadow-brand-500/10'
              : 'border-brand-500/60'
          }`}
        >
          <div className="absolute -top-3 right-5 bg-brand-600 text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Rekomendasi Terbaik</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-brand-400">
                {PLANS.pro.name}
              </h2>
              {subscription.planCode === 'pro' && (
                <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-bold text-[10px]">
                  SEDANG AKTIF
                </span>
              )}
            </div>
            <p className="text-stone-300">{PLANS.pro.tagline}</p>
            <div className="font-mono text-2xl font-black text-brand-400 pt-1">
              {formatIDR(
                cycle === 'monthly'
                  ? PLANS.pro.priceMonthly
                  : PLANS.pro.priceYearly
              )}
              <span className="text-xs font-normal text-stone-400">
                {' '}
                / {cycle === 'monthly' ? 'bulan' : 'tahun'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => switchSubscriptionPlan('pro', cycle)}
            className="w-full py-3 rounded-xl font-extrabold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/25 transition-colors"
          >
            {subscription.planCode === 'pro'
              ? `Perbarui Pro (${cycle === 'monthly' ? 'Bulanan' : 'Tahunan'})`
              : 'Aktifkan Pro Plan Sekarang'}
          </button>
        </div>
      </div>

      {/* Feature Matrix Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden text-xs">
        <div className="p-4 border-b border-stone-800">
          <h3 className="font-extrabold text-stone-100 text-sm">
            Matriks Perbandingan Fitur Lengkap Basic vs Pro
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-950 text-stone-400 border-b border-stone-800 text-[10.5px] uppercase">
              <tr>
                <th className="py-3 px-4">Fitur & Kapabilitas</th>
                <th className="py-3 px-4 text-center">Basic Plan</th>
                <th className="py-3 px-4 text-center text-brand-400">
                  Pro Plan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/70">
              {featureMatrix.map((row) => (
                <tr key={row.name} className="hover:bg-stone-800/30">
                  <td className="py-3 px-4">
                    <span className="text-[10px] uppercase tracking-wider text-stone-500 block">
                      {row.category}
                    </span>
                    <span className="font-semibold text-stone-200">
                      {row.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    {typeof row.basic === 'boolean' ? (
                      row.basic ? (
                        <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <Lock className="w-4 h-4 text-stone-600 mx-auto" />
                      )
                    ) : (
                      <span className="text-stone-300">{row.basic}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    {typeof row.pro === 'boolean' ? (
                      row.pro ? (
                        <Check className="w-4 h-4 text-brand-400 mx-auto" />
                      ) : (
                        '-'
                      )
                    ) : (
                      <span className="font-bold text-brand-300">
                        {row.pro}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices History */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3 text-xs">
        <h3 className="font-extrabold text-stone-100 text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-400" />
          <span>Riwayat Faktur Langganan SaaS</span>
        </h3>
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between"
            >
              <div>
                <span className="font-mono font-bold text-stone-100">
                  {inv.invoiceNo}
                </span>
                <p className="text-[11px] text-stone-400">{inv.periodLabel}</p>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-emerald-400">
                  {formatIDR(inv.amount)}
                </span>
                <p className="text-[10px] text-stone-500">
                  LUNAS • {new Date(inv.paidAt).toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
