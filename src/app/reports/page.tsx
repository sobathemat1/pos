'use client';

import React, { useMemo, useState } from 'react';
import { usePos } from '@/context/PosContext';
import { formatIDR } from '@/lib/pricing';
import {
  BarChart3,
  CheckCircle2,
  Download,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';

export default function ReportsAndDailyClosingPage() {
  const {
    orders,
    dailyClosings,
    businessSettings,
    createDailyClosing,
    canFeature,
    openUpgradeModal,
    showToast,
  } = usePos();

  const validOrders = useMemo(
    () => orders.filter((o) => o.status !== 'voided'),
    [orders]
  );

  const metrics = useMemo(() => {
    const grossSales = validOrders.reduce((s, o) => s + o.subtotal, 0);
    const totalDiscount = validOrders.reduce((s, o) => s + o.discountTotal, 0);
    const totalDpp = validOrders.reduce((s, o) => s + o.dppTotal, 0);
    const totalTax = validOrders.reduce((s, o) => s + o.taxTotal, 0);
    const netRevenue = validOrders.reduce((s, o) => s + o.grandTotal, 0);

    const cashSales = validOrders
      .filter((o) => o.paymentMethod === 'cash')
      .reduce((s, o) => s + o.grandTotal, 0);
    const qrisSales = validOrders
      .filter((o) => o.paymentMethod === 'qris')
      .reduce((s, o) => s + o.grandTotal, 0);
    const transferSales = validOrders
      .filter((o) => o.paymentMethod === 'transfer')
      .reduce((s, o) => s + o.grandTotal, 0);

    // Top products aggregation
    const prodMap: Record<
      string,
      { name: string; qty: number; revenue: number }
    > = {};
    for (const ord of validOrders) {
      for (const item of ord.items) {
        if (!prodMap[item.name]) {
          prodMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
        }
        prodMap[item.name].qty += item.qty;
        prodMap[item.name].revenue += item.qty * item.unitPrice;
      }
    }
    const topProducts = Object.values(prodMap).sort(
      (a, b) => b.qty - a.qty
    );

    return {
      totalOrders: validOrders.length,
      grossSales,
      totalDiscount,
      totalDpp,
      totalTax,
      netRevenue,
      cashSales,
      qrisSales,
      transferSales,
      topProducts,
    };
  }, [validOrders]);

  // Tutup Buku Form State
  const [shiftLabel, setShiftLabel] = useState('Shift Reguler Hari Ini');
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState('');

  const actualCashNum =
    actualCashInput === '' ? metrics.cashSales : Number(actualCashInput);
  const cashDifference = Math.round(actualCashNum) - metrics.cashSales;

  const handleLockClosing = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createDailyClosing({
      actualCash: actualCashNum,
      shiftLabel,
      notes: closingNotes,
    });
    if (!res.ok) {
      showToast(res.error || 'Gagal mengunci tutup buku', {
        variant: 'warning',
      });
      return;
    }
    setClosingNotes('');
  };

  const handleExportReportCsv = () => {
    if (!canFeature('csv_import_export')) {
      openUpgradeModal('csv_import_export');
      return;
    }
    const header =
      'NoOrder,Antrean,WaktuLunas,Metode,Subtotal,Diskon,DPP,Pajak,GrandTotal,Kasir\n';
    const rows = validOrders
      .map(
        (o) =>
          `"${o.orderNo}","${o.queueNo}","${o.paidAt}","${o.paymentMethod}",${o.subtotal},${o.discountTotal},${o.dppTotal},${o.taxTotal},${o.grandTotal},"${o.cashierName}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mypos-laporan-kas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Laporan kas harian berhasil diekspor ke CSV');
  };

  return (
    <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div>
          <h1 className="text-lg font-extrabold text-stone-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-400" />
            <span>Laporan Kas Harian, Pajak & Rekonsiliasi Tutup Buku</span>
          </h1>
          <p className="text-xs text-stone-400">
            Akurasi matematis 100% dengan rekap DPP dan{' '}
            {businessSettings.taxName} (
            {businessSettings.taxEnabled
              ? `Aktif ${businessSettings.taxRate}%`
              : 'Nonaktif'}
            ).
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportReportCsv}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-200 flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-brand-400" />
          <span>Ekspor Laporan CSV</span>
          {!canFeature('csv_import_export') && (
            <Lock className="w-3 h-3 text-amber-400" />
          )}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <p className="text-[11px] text-stone-400">Total Pendapatan (Gross)</p>
          <p className="text-base font-extrabold font-mono text-stone-100 mt-1">
            {formatIDR(metrics.grossSales)}
          </p>
          <p className="text-[10px] text-stone-500 mt-0.5">
            {metrics.totalOrders} transaksi lunas
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <p className="text-[11px] text-stone-400">Total Potongan Diskon</p>
          <p className="text-base font-extrabold font-mono text-emerald-400 mt-1">
            - {formatIDR(metrics.totalDiscount)}
          </p>
          <p className="text-[10px] text-stone-500 mt-0.5">Promo diterapkan</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <p className="text-[11px] text-stone-400">
            DPP (Dasar Pengenaan Pajak)
          </p>
          <p className="text-base font-extrabold font-mono text-stone-100 mt-1">
            {formatIDR(metrics.totalDpp)}
          </p>
          <p className="text-[10px] text-stone-500 mt-0.5">
            Penjualan bersih sebelum pajak
          </p>
        </div>

        <div className="bg-stone-900 border border-amber-500/30 rounded-2xl p-4">
          <p className="text-[11px] text-amber-300 font-semibold">
            {businessSettings.taxName} Terkumpul ({businessSettings.taxRate}%)
          </p>
          <p className="text-base font-extrabold font-mono text-amber-400 mt-1">
            {formatIDR(metrics.totalTax)}
          </p>
          <p className="text-[10px] text-stone-500 mt-0.5">
            Wajib disetorkan / dilaporkan
          </p>
        </div>

        <div className="bg-stone-900 border border-brand-500/40 rounded-2xl p-4 col-span-2 lg:col-span-1">
          <p className="text-[11px] text-brand-300 font-semibold">
            Total Kas Masuk (Grand Total)
          </p>
          <p className="text-lg font-black font-mono text-brand-400 mt-1">
            {formatIDR(metrics.netRevenue)}
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">
            Tunai {formatIDR(metrics.cashSales)} • Non-tunai{' '}
            {formatIDR(metrics.qrisSales + metrics.transferSales)}
          </p>
        </div>
      </div>

      {/* Main Content: Tutup Buku Reconciliation + Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Tutup Shift / Tutup Buku Form & Locked History (7 cols) */}
        <div className="lg:col-span-7 space-y-5 text-xs">
          <form
            onSubmit={handleLockClosing}
            className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-stone-100 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-brand-400" />
                  <span>Formulir Rekonsiliasi Tutup Shift / Tutup Buku</span>
                </h2>
                <p className="text-[11px] text-stone-400">
                  Bandingkan uang tunai di laci kasir dengan perhitungan sistem,
                  lalu kunci laporan.
                </p>
              </div>
            </div>

            {/* Method Breakdown */}
            <div className="grid grid-cols-3 gap-2.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
              <div>
                <span className="text-[10.5px] text-stone-400">
                  Kas Tunai Sistem
                </span>
                <p className="font-mono font-bold text-stone-100 mt-0.5">
                  {formatIDR(metrics.cashSales)}
                </p>
              </div>
              <div>
                <span className="text-[10.5px] text-stone-400">Total QRIS</span>
                <p className="font-mono font-bold text-stone-100 mt-0.5">
                  {formatIDR(metrics.qrisSales)}
                </p>
              </div>
              <div>
                <span className="text-[10.5px] text-stone-400">
                  Transfer / EDC
                </span>
                <p className="font-mono font-bold text-stone-100 mt-0.5">
                  {formatIDR(metrics.transferSales)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-400 mb-1 font-medium">
                  Nama Shift / Periode Tutup Buku
                </label>
                <input
                  type="text"
                  value={shiftLabel}
                  onChange={(e) => setShiftLabel(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-bold"
                />
              </div>
              <div>
                <label className="block text-stone-400 mb-1 font-medium">
                  Uang Tunai Fisik di Laci Kasir (Rp) *
                </label>
                <input
                  type="number"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  placeholder={String(metrics.cashSales)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono font-bold"
                />
              </div>
            </div>

            {/* Difference Alert */}
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <span className="text-stone-400 font-medium">
                Selisih Kas (Fisik vs Sistem):
              </span>
              <span
                className={`font-mono text-sm font-extrabold ${
                  cashDifference === 0
                    ? 'text-emerald-400'
                    : cashDifference < 0
                      ? 'text-red-400'
                      : 'text-amber-400'
                }`}
              >
                {cashDifference === 0
                  ? 'Rp 0 (Akurat 100%)'
                  : `${cashDifference > 0 ? '+' : ''}${formatIDR(cashDifference)}`}
              </span>
            </div>

            <div>
              <label className="block text-stone-400 mb-1 font-medium">
                Catatan Tutup Buku{' '}
                {cashDifference !== 0 && (
                  <span className="text-amber-400 font-bold">
                    (Wajib diisi karena ada selisih)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Mis: Kas fisik sesuai / selisih uang kembalian receh..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-extrabold bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Kunci & Simpan Laporan Tutup Buku</span>
            </button>
          </form>

          {/* Locked Daily Closings History */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-stone-100">
              Arsip Laporan Tutup Buku Terkunci (Immutable)
            </h3>
            <div className="space-y-2.5">
              {dailyClosings.map((dc) => (
                <div
                  key={dc.id}
                  className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-stone-100">
                        {dc.shiftLabel} ({dc.closingDate})
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1">
                      {dc.totalOrders} order • DPP {formatIDR(dc.totalDpp)} •
                      Pajak {formatIDR(dc.totalTax)} • Ditutup oleh:{' '}
                      {dc.closedBy}
                    </p>
                    <p className="text-[11px] text-stone-500 italic mt-0.5">
                      Catatan: &ldquo;{dc.notes}&rdquo;
                    </p>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm font-extrabold text-brand-400">
                      {formatIDR(dc.netRevenue)}
                    </div>
                    <div
                      className={`text-[10.5px] ${
                        dc.difference === 0
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      Selisih Kas: {formatIDR(dc.difference)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Top Selling Products Analytics (Pro Feature) (5 cols) */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-stone-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              <span>Analitik Produk Terlaris</span>
            </h2>
            {!canFeature('advanced_reports') && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" /> Pro
              </span>
            )}
          </div>

          {canFeature('advanced_reports') ? (
            <div className="space-y-2.5">
              {metrics.topProducts.map((tp, idx) => (
                <div
                  key={tp.name}
                  className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-brand-500/20 text-brand-300 font-mono font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-stone-100">{tp.name}</p>
                      <p className="text-[11px] text-stone-400">
                        Terjual {tp.qty} porsi
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-brand-400">
                    {formatIDR(tp.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-stone-950 border border-stone-800 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
              <div>
                <p className="font-bold text-stone-100 text-sm">
                  Buka Analitik Menu Terlaris & Tren Penjualan
                </p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Fitur analitik produk terlaris dan ekspor CSV tersedia di
                  Paket Pro.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openUpgradeModal('advanced_reports')}
                className="py-2.5 px-4 rounded-xl font-bold bg-brand-600 hover:bg-brand-500 text-white"
              >
                Lihat Paket Pro
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
