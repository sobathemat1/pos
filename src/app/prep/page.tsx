'use client';

import React, { useMemo, useState } from 'react';
import { usePos } from '@/context/PosContext';
import { formatIDR } from '@/lib/pricing';
import {
  Bell,
  Check,
  Clock,
  Coffee,
  Flame,
  Package,
  Search,
  ShoppingBag,
  Utensils,
} from 'lucide-react';

export default function BaristaPrepQueuePage() {
  const { orders, products, categories, advancePrepStatus, showToast } =
    usePos();

  const [activeTab, setActiveTab] = useState<'queue' | 'stock'>('queue');
  const [statusFilter, setStatusFilter] = useState<
    'active' | 'new' | 'preparing' | 'ready' | 'delivered'
  >('active');
  const [stockSearch, setStockSearch] = useState('');

  const filteredOrders = useMemo(() => {
    const valid = orders.filter((o) => o.status !== 'voided');
    if (statusFilter === 'active') {
      return valid.filter((o) => o.prepStatus !== 'delivered');
    }
    return valid.filter((o) => o.prepStatus === statusFilter);
  }, [orders, statusFilter]);

  const counts = useMemo(() => {
    const valid = orders.filter((o) => o.status !== 'voided');
    return {
      active: valid.filter((o) => o.prepStatus !== 'delivered').length,
      new: valid.filter((o) => o.prepStatus === 'new').length,
      preparing: valid.filter((o) => o.prepStatus === 'preparing').length,
      ready: valid.filter((o) => o.prepStatus === 'ready').length,
      delivered: valid.filter((o) => o.prepStatus === 'delivered').length,
    };
  }, [orders]);

  const filteredStockProducts = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    return products.filter(
      (p) => !q || p.name.toLowerCase().includes(q)
    );
  }, [products, stockSearch]);

  const formatElapsed = (iso: string) => {
    const diffSec = Math.max(
      0,
      Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    );
    if (diffSec < 60) return 'Baru saja';
    const min = Math.floor(diffSec / 60);
    if (min < 60) return `${min} mnt lalu`;
    const hr = Math.floor(min / 60);
    return `${hr} jam ${min % 60} mnt lalu`;
  };

  return (
    <main className="flex-1 p-4 lg:p-6 max-w-6xl mx-auto w-full space-y-5">
      {/* Header & Mode Switcher (Antrean vs Cek Stok Real-Time) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div>
          <h1 className="text-lg font-extrabold text-stone-100 flex items-center gap-2">
            <Coffee className="w-5 h-5 text-amber-500" />
            <span>Antrean & Cek Stok</span>
          </h1>
          <p className="text-xs text-stone-400">
            Hanya menampilkan pesanan yang{' '}
            <span className="text-emerald-400 font-semibold">
              sudah lunas bayar (Pay-First)
            </span>{' '}
            di kasir secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'queue'
                ? 'bg-brand-600 text-white'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Antrean Pesanan ({counts.active})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'stock'
                ? 'bg-brand-600 text-white'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Cek Stok Real-Time</span>
          </button>
        </div>
      </div>

      {activeTab === 'queue' ? (
        <>
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'active', label: `Aktif (${counts.active})` },
              { id: 'new', label: `Baru Masuk (${counts.new})` },
              { id: 'preparing', label: `Diproses (${counts.preparing})` },
              { id: 'ready', label: `Siap Diantar (${counts.ready})` },
              { id: 'delivered', label: `Selesai (${counts.delivered})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-stone-100 text-stone-950'
                    : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Queue Cards Grid */}
          {filteredOrders.length === 0 ? (
            <div className="bg-stone-900/60 border border-stone-800 rounded-2xl py-16 text-center text-stone-500">
              <Coffee className="w-10 h-10 mx-auto mb-2 stroke-1 text-stone-600" />
              <p className="text-xs font-semibold text-stone-400">
                Belum ada pesanan di kategori ini
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Pesanan yang sudah dibayar di kasir akan muncul otomatis di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => {
                const isNew = order.prepStatus === 'new';
                const isPrep = order.prepStatus === 'preparing';
                const isReady = order.prepStatus === 'ready';
                const isDone = order.prepStatus === 'delivered';

                return (
                  <div
                    key={order.id}
                    className={`bg-stone-900 border rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-all ${
                      isNew
                        ? 'border-amber-500/50'
                        : isPrep
                          ? 'border-sky-500/50'
                          : isReady
                            ? 'border-emerald-500/60'
                            : 'border-stone-800 opacity-75'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-stone-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black font-mono text-stone-100">
                              #{order.queueNo}
                            </span>
                            <span className="text-xs font-bold text-brand-400 flex items-center gap-1">
                              {order.orderType === 'dine_in' ? (
                                <Utensils className="w-3 h-3" />
                              ) : (
                                <ShoppingBag className="w-3 h-3" />
                              )}
                              <span>{order.tableNo}</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            Pelanggan: <strong>{order.customerName}</strong> •{' '}
                            <span className="font-mono">{order.orderNo}</span>
                          </p>
                        </div>

                        <span
                          className={`text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full border ${
                            isNew
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : isPrep
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                : isReady
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-stone-800 text-stone-400 border-stone-700'
                          }`}
                        >
                          {isNew
                            ? 'Baru Masuk'
                            : isPrep
                              ? 'Diproses'
                              : isReady
                                ? 'Siap Diantar'
                                : 'Selesai'}
                        </span>
                      </div>

                      {/* Order Items List */}
                      <ul className="space-y-2.5 mb-4 text-xs">
                        {order.items.map((it) => (
                          <li
                            key={it.id}
                            className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-2.5"
                          >
                            <div className="flex items-center justify-between font-bold text-stone-100">
                              <span>
                                <span className="text-brand-400 font-mono mr-1.5">
                                  {it.qty}×
                                </span>
                                {it.name}
                              </span>
                              {it.variantLabel && (
                                <span className="text-[10px] font-medium bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded">
                                  {it.variantLabel}
                                </span>
                              )}
                            </div>
                            {it.notes && (
                              <p className="text-[11px] text-amber-400 italic mt-1">
                                Catatan: &ldquo;{it.notes}&rdquo;
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Footer Time & 1-Tap Action Button */}
                    <div className="pt-2 border-t border-stone-800/80 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Lunas: {formatElapsed(order.paidAt)}</span>
                        </span>
                        <span>Kasir: {order.cashierName.split(' ')[0]}</span>
                      </div>

                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => {
                            advancePrepStatus(order.id);
                            if (isNew) {
                              showToast(
                                `Pesanan #${order.queueNo} mulai dibuat barista`,
                                { variant: 'info' }
                              );
                            } else if (isPrep) {
                              showToast(
                                `Pesanan #${order.queueNo} SIAP diantar ke ${order.tableNo}!`,
                                { variant: 'success' }
                              );
                            } else if (isReady) {
                              showToast(
                                `Pesanan #${order.queueNo} selesai diantar`,
                                { variant: 'success' }
                              );
                            }
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                            isNew
                              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-500/20'
                              : isPrep
                                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                          }`}
                        >
                          {isNew && (
                            <>
                              <Flame className="w-4 h-4" />
                              <span>Mulai Penyiapan</span>
                            </>
                          )}
                          {isPrep && (
                            <>
                              <Bell className="w-4 h-4" />
                              <span>Tandai Siap Diantar</span>
                            </>
                          )}
                          {isReady && (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Tandai Sudah Diantar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ================= REAL-TIME STOCK CHECK TAB (KF-06 / KF-13) ================= */
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              placeholder="Cari nama menu untuk cek sisa porsi..."
              className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStockProducts.map((prod) => {
              const cat = categories.find((c) => c.id === prod.categoryId);
              const isOut = prod.trackStock && prod.stock <= 0;
              const isLow =
                prod.trackStock && prod.stock > 0 && prod.stock <= prod.minStock;

              return (
                <div
                  key={prod.id}
                  className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{prod.emoji}</span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-stone-100 truncate">
                        {prod.name}
                      </h3>
                      <p className="text-[11px] text-stone-400">
                        {cat?.name} • {formatIDR(prod.price)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl font-mono text-xs font-extrabold whitespace-nowrap ${
                      !prod.trackStock
                        ? 'bg-stone-800 text-stone-300'
                        : isOut
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : isLow
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {!prod.trackStock
                      ? 'Unlimited'
                      : isOut
                        ? 'HABIS (0)'
                        : `${prod.stock} porsi`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
