'use client';

import React, { useState } from 'react';
import { usePos } from '@/context/PosContext';
import { formatIDR } from '@/lib/pricing';
import { PLANS } from '@/lib/plans';
import { Percent, Plus, Tag, Trash2 } from 'lucide-react';

export default function DiscountsManagementPage() {
  const {
    discounts,
    subscription,
    upsertDiscount,
    toggleDiscountActive,
    deleteDiscount,
    showToast,
  } = usePos();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'amount'>('percent');
  const [value, setValue] = useState(10);
  const [minPurchase, setMinPurchase] = useState(50000);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const res = upsertDiscount({
      name,
      code: code.toUpperCase().trim() || 'PROMO',
      type,
      value: Number(value),
      minPurchase: Number(minPurchase),
      isActive: true,
    });
    if (!res.ok) {
      showToast(res.error || 'Gagal menyimpan diskon', { variant: 'warning' });
      return;
    }
    setName('');
    setCode('');
  };

  const activeCount = discounts.filter((d) => d.isActive).length;
  const maxActive = PLANS[subscription.planCode].limits.max_active_discounts;

  return (
    <main className="flex-1 p-4 lg:p-6 max-w-5xl mx-auto w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div>
          <h1 className="text-lg font-extrabold text-stone-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-400" />
            <span>Manajemen Aturan Promo & Diskon</span>
          </h1>
          <p className="text-xs text-stone-400">
            Promo aktif saat ini:{' '}
            <strong className="text-stone-200">{activeCount}</strong> /{' '}
            {maxActive > 100 ? 'Tanpa Batas (Pro)' : `${maxActive} (Basic)`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Create Discount */}
        <form
          onSubmit={handleCreate}
          className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3.5 text-xs"
        >
          <h2 className="font-extrabold text-stone-100 text-sm">
            Buat Aturan Promo Baru
          </h2>

          <div>
            <label className="block text-stone-400 mb-1">
              Nama Promo Diskon *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mis: Diskon Happy Hour 15%"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 mb-1">Kode Promo</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="HAPPY15"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-stone-400 mb-1">Tipe Potongan</label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as 'percent' | 'amount')
                }
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200"
              >
                <option value="percent">Persentase (%)</option>
                <option value="amount">Nominal Tetap (Rp)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 mb-1">
                Besar Potongan ({type === 'percent' ? '%' : 'Rp'}) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-stone-400 mb-1">
                Minimal Belanja (Rp)
              </label>
              <input
                type="number"
                min={0}
                value={minPurchase}
                onChange={(e) => setMinPurchase(Number(e.target.value))}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl font-extrabold bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Simpan Aturan Diskon</span>
          </button>
        </form>

        {/* Discount List */}
        <div className="lg:col-span-7 space-y-3 text-xs">
          {discounts.map((d) => (
            <div
              key={d.id}
              className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-stone-100 text-sm">
                      {d.name}
                    </h3>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-stone-800 text-brand-300">
                      {d.code}
                    </span>
                  </div>
                  <p className="text-stone-400 mt-0.5">
                    Potongan{' '}
                    <strong className="text-emerald-400 font-mono">
                      {d.type === 'percent' ? `${d.value}%` : formatIDR(d.value)}
                    </strong>{' '}
                    • Min. belanja{' '}
                    <span className="font-mono">
                      {formatIDR(d.minPurchase)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const res = toggleDiscountActive(d.id);
                    if (!res.ok && res.error) {
                      showToast(res.error, { variant: 'warning' });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors ${
                    d.isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {d.isActive ? 'Aktif' : 'Nonaktif'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteDiscount(d.id)}
                  className="p-2 rounded-xl bg-stone-800 hover:bg-red-500/20 text-stone-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
