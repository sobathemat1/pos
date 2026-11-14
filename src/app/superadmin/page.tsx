'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePos } from '@/context/PosContext';
import { formatIDR } from '@/lib/pricing';
import { PLANS } from '@/lib/plans';
import { PlanCode, SuperadminTenantSummary } from '@/types/pos';
import {
  Building2,
  CheckCircle2,
  Crown,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';

interface PlatformSummary {
  totalTenants: number;
  activeTenants: number;
  proTenants: number;
  basicTenants: number;
  totalOrders: number;
  totalGmv: number;
}

export default function SuperadminDashboardPage() {
  const { showToast } = usePos();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PlatformSummary>({
    totalTenants: 0,
    activeTenants: 0,
    proTenants: 0,
    basicTenants: 0,
    totalOrders: 0,
    totalGmv: 0,
  });
  const [tenants, setTenants] = useState<SuperadminTenantSummary[]>([]);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | PlanCode>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/superadmin', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.reason || 'Gagal memuat dashboard superadmin.');
        setLoading(false);
        return;
      }
      setSummary(data.summary);
      setTenants(data.tenants || []);
    } catch {
      setError('Terjadi kesalahan jaringan saat memuat data platform.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handlePlanChange = async (tenantId: string, planCode: PlanCode) => {
    setUpdatingId(tenantId);
    try {
      const res = await fetch('/api/superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'UPDATE_TENANT_PLAN',
          tenantId,
          planCode,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.reason || 'Gagal mengubah paket tenant', {
          variant: 'error',
        });
      } else {
        setTenants((prev) =>
          prev.map((t) => (t.id === tenantId ? { ...t, planCode } : t))
        );
        showToast(`Paket tenant berhasil diubah ke ${planCode.toUpperCase()}`, {
          variant: 'success',
        });
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (
    tenantId: string,
    status: SuperadminTenantSummary['subscriptionStatus']
  ) => {
    setUpdatingId(tenantId);
    try {
      const res = await fetch('/api/superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'UPDATE_TENANT_STATUS',
          tenantId,
          status,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.reason || 'Gagal mengubah status langganan', {
          variant: 'error',
        });
      } else {
        setTenants((prev) =>
          prev.map((t) =>
            t.id === tenantId ? { ...t, subscriptionStatus: status } : t
          )
        );
        showToast(`Status langganan tenant diperbarui ke ${status}`, {
          variant: 'success',
        });
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => {
      if (planFilter !== 'all' && t.planCode !== planFilter) return false;
      if (statusFilter !== 'all' && t.subscriptionStatus !== statusFilter)
        return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.ownerName.toLowerCase().includes(q) ||
        t.ownerEmail.toLowerCase().includes(q)
      );
    });
  }, [tenants, search, planFilter, statusFilter]);

  const estimatedMrr = useMemo(() => {
    return tenants.reduce((acc, t) => {
      if (t.subscriptionStatus !== 'active') return acc;
      const plan = PLANS[t.planCode];
      return acc + (plan ? plan.priceMonthly : 0);
    }, 0);
  }, [tenants]);

  return (
    <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SaaS Platform Control Center</span>
          </div>
          <h1 className="text-xl font-extrabold text-stone-100 flex items-center gap-2">
            <span>Dashboard Superadmin MyPOS</span>
          </h1>
          <p className="text-xs text-stone-400">
            Pantau seluruh usaha (tenant cafe) yang terdaftar, statistik
            transaksi platform, serta kelola paket & status langganan SaaS.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          <span>Segarkan Data</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold">Total Usaha (Tenant)</span>
            <Store className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-2xl font-extrabold text-stone-100 font-mono">
            {summary.totalTenants}
          </p>
          <p className="text-[11px] text-emerald-400 font-medium">
            {summary.activeTenants} aktif / trial
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold">Distribusi Paket</span>
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-stone-100 font-mono">
            {summary.proTenants}{' '}
            <span className="text-xs font-sans font-semibold text-amber-400">
              Pro
            </span>{' '}
            <span className="text-stone-600 text-base">/</span>{' '}
            {summary.basicTenants}{' '}
            <span className="text-xs font-sans font-semibold text-stone-400">
              Basic
            </span>
          </p>
          <p className="text-[11px] text-stone-400">
            Estimasi MRR:{' '}
            <strong className="text-stone-200">{formatIDR(estimatedMrr)}</strong>
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold">Transaksi Platform</span>
            <ShoppingBag className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-stone-100 font-mono">
            {summary.totalOrders.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-stone-400">
            Total pesanan tercatat di seluruh cafe
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold">Total GMV Platform</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono truncate">
            {formatIDR(summary.totalGmv)}
          </p>
          <p className="text-[11px] text-stone-400">
            Akumulasi omzet seluruh tenant
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama cafe, slug, owner, atau email..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as any)}
              className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Paket</option>
              <option value="pro">Pro Plan</option>
              <option value="basic">Basic Plan</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="past_due">Past Due</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Tenant Table */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
            <span className="text-xs">Memuat daftar usaha terdaftar...</span>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="py-10 text-center text-xs text-stone-500">
            Tidak ada usaha yang sesuai dengan filter pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-[10.5px] uppercase tracking-wider text-stone-400">
                  <th className="py-2.5 px-3">Usaha / Tenant</th>
                  <th className="py-2.5 px-3">Owner (Admin)</th>
                  <th className="py-2.5 px-3">Statistik</th>
                  <th className="py-2.5 px-3">Total Omzet</th>
                  <th className="py-2.5 px-3">Paket SaaS</th>
                  <th className="py-2.5 px-3">Status Langganan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/70">
                {filteredTenants.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-stone-950/60 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-stone-100">{t.name}</p>
                          <p className="text-[10.5px] font-mono text-stone-500">
                            /{t.slug} •{' '}
                            {new Date(t.createdAt).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-semibold text-stone-200">
                        {t.ownerName}
                      </p>
                      <p className="text-[11px] text-stone-400">
                        {t.ownerEmail}
                      </p>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3 text-[11px] text-stone-300">
                        <span title="Jumlah Produk">
                          📦 {t.productsCount} menu
                        </span>
                        <span
                          title="Jumlah Akun"
                          className="inline-flex items-center gap-1"
                        >
                          <Users className="w-3 h-3 text-stone-400" />
                          {t.staffCount}
                        </span>
                        <span title="Total Transaksi">
                          🧾 {t.ordersCount} trx
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {formatIDR(t.totalRevenue)}
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={t.planCode}
                        disabled={updatingId === t.id}
                        onChange={(e) =>
                          handlePlanChange(t.id, e.target.value as PlanCode)
                        }
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold border focus:outline-none cursor-pointer ${
                          t.planCode === 'pro'
                            ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                            : 'bg-stone-950 border-stone-700 text-stone-300'
                        }`}
                      >
                        <option value="basic" className="bg-stone-900">
                          Basic
                        </option>
                        <option value="pro" className="bg-stone-900">
                          Pro ✨
                        </option>
                      </select>
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={t.subscriptionStatus}
                        disabled={updatingId === t.id}
                        onChange={(e) =>
                          handleStatusChange(t.id, e.target.value as any)
                        }
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold border focus:outline-none cursor-pointer ${
                          t.subscriptionStatus === 'active'
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : t.subscriptionStatus === 'trial'
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                              : 'bg-red-500/15 border-red-500/40 text-red-300'
                        }`}
                      >
                        <option value="trial" className="bg-stone-900">
                          Trial
                        </option>
                        <option value="active" className="bg-stone-900">
                          Active
                        </option>
                        <option value="past_due" className="bg-stone-900">
                          Past Due
                        </option>
                        <option value="suspended" className="bg-stone-900">
                          Suspended
                        </option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 flex items-center gap-2.5 text-[11px] text-stone-400">
        <Sparkles className="w-4 h-4 text-brand-400 shrink-0" />
        <span>
          <strong className="text-stone-200">Catatan Arsitektur 3-Role:</strong>{' '}
          Email digunakan eksklusif untuk login <strong>Superadmin</strong> dan{' '}
          <strong>Admin (Owner Cafe)</strong>. Akun <strong>Staff</strong>{' '}
          (Kasir/Barista) dikelola per usaha menggunakan username & kata sandi.
        </span>
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-auto hidden sm:block" />
      </div>
    </main>
  );
}
