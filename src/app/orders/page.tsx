'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePos } from '@/context/PosContext';
import { formatIDR } from '@/lib/pricing';
import { printOrderReceipt } from '@/lib/thermal-printer';
import { ThermalReceiptPreview } from '@/components/receipt/ThermalReceiptPreview';
import { OrderRecord } from '@/types/pos';
import {
  Ban,
  ExternalLink,
  History,
  Printer,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

export default function OrderHistoryPage() {
  const {
    orders,
    printerConfig,
    voidOrder,
    canFeature,
    openUpgradeModal,
    showToast,
  } = usePos();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'voided'>(
    'all'
  );
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(
    orders[0] || null
  );

  // Void Modal state
  const [voidTarget, setVoidTarget] = useState<OrderRecord | null>(null);
  const [voidReason, setVoidReason] = useState('Salah input item pesanan');
  const [adminPin, setAdminPin] = useState('1111');

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'voided'
            ? o.status === 'voided'
            : o.status !== 'voided';
      const matchQ =
        !q ||
        o.orderNo.toLowerCase().includes(q) ||
        o.queueNo.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.tableNo.toLowerCase().includes(q);
      return matchStatus && matchQ;
    });
  }, [orders, search, statusFilter]);

  const handleConfirmVoid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget) return;
    const res = voidOrder(voidTarget.id, voidReason, adminPin);
    if (!res.ok) {
      showToast(res.error || 'Gagal melakukan void', { variant: 'error' });
      return;
    }
    setVoidTarget(null);
  };

  return (
    <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-4 no-print">
        <div>
          <h1 className="text-lg font-extrabold text-stone-100 flex items-center gap-2">
            <History className="w-5 h-5 text-brand-400" />
            <span>Riwayat Transaksi</span>
          </h1>
          <p className="text-xs text-stone-400">
            Setiap transaksi menyimpan snapshot struk saat dibayar sehingga
            identitas pada struk lama tidak pernah berubah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari struk / antrean..."
              className="bg-stone-900 border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-brand-500 w-full sm:w-60"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 shrink-0"
          >
            <option value="all">Semua Status ({orders.length})</option>
            <option value="paid">Lunas / Selesai</option>
            <option value="voided">Dibatalkan (Void)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Orders List (7 cols) */}
        <div className="lg:col-span-7 space-y-2.5 no-print">
          {filteredOrders.length === 0 ? (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl py-16 text-center text-stone-500 text-xs">
              Belum ada transaksi ditemukan.
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const isSelected = selectedOrder?.id === ord.id;
              const isVoid = ord.status === 'voided';
              return (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrder(ord)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-wrap items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-stone-900 border-brand-500 shadow-lg'
                      : 'bg-stone-900/70 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-xs text-stone-100">
                        {ord.orderNo}
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-bold">
                        #{ord.queueNo}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          isVoid
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {isVoid ? 'VOID' : ord.paymentMethod.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-stone-300">
                      {ord.tableNo} • Pelanggan:{' '}
                      <strong>{ord.customerName}</strong> • Kasir:{' '}
                      {ord.cashierName}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {new Date(ord.paidAt).toLocaleString('id-ID')} •{' '}
                      {ord.items.reduce((s, i) => s + i.qty, 0)} item
                    </p>
                    {ord.voidReason && (
                      <p className="text-[11px] text-red-400 italic">
                        Alasan Void: {ord.voidReason}
                      </p>
                    )}
                  </div>

                  <div className="text-right space-y-1.5">
                    <div
                      className={`font-mono text-sm font-extrabold ${
                        isVoid
                          ? 'line-through text-stone-500'
                          : 'text-brand-400'
                      }`}
                    >
                      {formatIDR(ord.grandTotal)}
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono">
                      DPP {formatIDR(ord.dppTotal)} + Pajak{' '}
                      {formatIDR(ord.taxTotal)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Immutable Receipt Snapshot & Actions (5 cols) */}
        <div className="lg:col-span-5">
          {selectedOrder ? (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4 sticky top-20">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3 no-print">
                <div>
                  <h3 className="text-xs font-extrabold text-stone-100">
                    Snapshot Struk #{selectedOrder.queueNo}
                  </h3>
                  <p className="text-[11px] text-stone-400 font-mono">
                    {selectedOrder.orderNo}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedOrder.status !== 'voided' && (
                    <button
                      type="button"
                      onClick={() => setVoidTarget(selectedOrder)}
                      className="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Void</span>
                    </button>
                  )}
                </div>
              </div>

              <ThermalReceiptPreview
                order={selectedOrder}
                isCopy={true}
                showPrintActions={true}
                onPrintThermal={async () => {
                  const res = await printOrderReceipt(
                    selectedOrder,
                    printerConfig,
                    { isCopy: true }
                  );
                  showToast('Salinan struk dikirim ke printer thermal', {
                    description: res.message,
                  });
                }}
                onPrintBrowser={() => window.print()}
              />

              <div className="pt-2 border-t border-stone-800 no-print">
                {canFeature('digital_receipt_share') ? (
                  <Link
                    href={`/r/${selectedOrder.id}`}
                    target="_blank"
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-stone-950 border border-stone-800 hover:border-stone-700 text-stone-200 flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-brand-400" />
                    <span>Buka Halaman Struk Digital Publik</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => openUpgradeModal('digital_receipt_share')}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-stone-950 border border-stone-800 text-stone-400 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Buka Struk Digital Publik (Fitur Pro)</span>
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ================= VOID AUTHORIZATION MODAL ================= */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <form
            onSubmit={handleConfirmVoid}
            className="bg-stone-900 border border-stone-800 w-full max-w-sm rounded-2xl p-5 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="font-extrabold text-red-400 text-sm">
                  Void Transaksi {voidTarget.orderNo}?
                </h3>
                <p className="text-[11px] text-stone-400">
                  Stok produk akan dikembalikan otomatis dan tercatat di audit
                  log.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-stone-400 mb-1">
                Alasan Void Transaksi *
              </label>
              <input
                type="text"
                required
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100"
              />
            </div>

            <div>
              <label className="block text-stone-400 mb-1">
                PIN Otorisasi Admin (Default: 1111) *
              </label>
              <input
                type="password"
                required
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono tracking-widest"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="flex-1 py-2.5 rounded-xl font-bold bg-stone-800 text-stone-300"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="flex-[2] py-2.5 rounded-xl font-extrabold bg-red-600 hover:bg-red-500 text-white"
              >
                Konfirmasi Void Transaksi
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
