'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePos } from '@/context/PosContext';
import { PLANS, PRO_FEATURE_LABELS } from '@/lib/plans';
import { formatIDR } from '@/lib/pricing';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  Cloud,
  Coffee,
  CreditCard,
  Grid,
  History,
  Info,
  KeyRound,
  LayoutGrid,
  Loader2,
  Lock,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Package,
  Percent,
  Printer,
  Receipt,
  ShieldCheck,
  Sparkles,
  Sun,
  Tag,
  UserCheck,
  Wand2,
  X,
} from 'lucide-react';
import { UserRole } from '@/types/pos';

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: number;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    isHydrated,
    theme,
    toggleTheme,
    supabaseConnected,
    isSyncingSupabase,
    authRole,
    businessSettings,
    updateBusinessSettings,
    receiptSettings,
    printerConfig,
    orders,
    activeStaff,
    staffList,
    switchStaffWithAuth,
    subscription,
    switchSubscriptionPlan,
    upgradePromptFeature,
    openUpgradeModal,
    closeUpgradeModal,
    toast,
    showToast,
    dismissToast,
  } = usePos();

  const [billingCycleModal, setBillingCycleModal] = useState<
    'monthly' | 'yearly'
  >(subscription.billingCycle);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authenticated Switch Account Modal State
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [switchTargetId, setSwitchTargetId] = useState<string | undefined>(
    undefined
  );
  const [switchUsername, setSwitchUsername] = useState('');
  const [switchPassword, setSwitchPassword] = useState('');
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const openSwitchModal = (presetTargetId?: string, presetUsername?: string) => {
    setSwitchTargetId(presetTargetId);
    setSwitchUsername(presetUsername || '');
    setSwitchPassword('');
    setSwitchError(null);
    setSwitchModalOpen(true);
  };

  const handleSwitchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwitchError(null);
    setIsSwitching(true);
    const res = await switchStaffWithAuth(
      switchUsername,
      switchPassword,
      switchTargetId
    );
    setIsSwitching(false);
    if (!res.ok) {
      setSwitchError(res.error || 'Username atau kata sandi salah.');
      return;
    }
    setSwitchModalOpen(false);
    setSwitchPassword('');
  };

  // Count active orders in barista preparation queue
  const activePrepCount = orders.filter(
    (o) => o.status === 'paid' && o.prepStatus !== 'delivered'
  ).length;

  const navItems: NavItem[] = [
    {
      href: '/pos',
      label: 'Kasir (POS)',
      shortLabel: 'Kasir',
      icon: LayoutGrid,
      roles: ['superadmin', 'admin', 'staff'],
    },
    {
      href: '/prep',
      label: 'Antrean Barista',
      shortLabel: 'Antrean',
      icon: Coffee,
      roles: ['superadmin', 'admin', 'staff'],
      badge: activePrepCount,
    },
    {
      href: '/orders',
      label: 'Riwayat Transaksi',
      shortLabel: 'Riwayat',
      icon: History,
      roles: ['superadmin', 'admin', 'staff'],
    },
    {
      href: '/menu',
      label: 'Menu & Stok',
      shortLabel: 'Menu',
      icon: Package,
      roles: ['superadmin', 'admin', 'staff'],
    },
    {
      href: '/discounts',
      label: 'Promo & Diskon',
      shortLabel: 'Diskon',
      icon: Tag,
      roles: ['superadmin', 'admin'],
    },
    {
      href: '/reports',
      label: 'Laporan & Tutup Buku',
      shortLabel: 'Laporan',
      icon: BarChart3,
      roles: ['superadmin', 'admin', 'staff'],
    },
    {
      href: '/settings',
      label: 'Struk & Identitas',
      shortLabel: 'Struk',
      icon: Receipt,
      roles: ['superadmin', 'admin'],
    },
    {
      href: '/billing',
      label: 'Paket & Harga',
      shortLabel: 'Paket',
      icon: CreditCard,
      roles: ['superadmin', 'admin'],
    },
    {
      href: '/onboarding',
      label: 'Wizard Onboarding',
      shortLabel: 'Onboarding',
      icon: Wand2,
      roles: ['superadmin', 'admin'],
    },
    {
      href: '/superadmin',
      label: 'Superadmin SaaS',
      shortLabel: 'Superadmin',
      icon: ShieldCheck,
      roles: ['superadmin'],
    },
  ];

  const effectiveRole: UserRole =
    activeStaff.role === 'staff'
      ? 'staff'
      : authRole === 'superadmin'
        ? 'superadmin'
        : activeStaff.role;

  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(effectiveRole)
  );

  const handleQuickTogglePpn = () => {
    const nextState = !businessSettings.taxEnabled;
    updateBusinessSettings({ taxEnabled: nextState });
    showToast(
      nextState
        ? `${businessSettings.taxName} (${businessSettings.taxRate}%) Diaktifkan`
        : `${businessSettings.taxName} Dinonaktifkan`,
      {
        description: nextState
          ? 'Pajak otomatis dihitung pada transaksi berikutnya.'
          : 'Transaksi berikutnya bebas pajak (Rp 0).',
        variant: 'info',
      }
    );
  };

  const handleSignOut = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // ignore
    }
    window.location.assign('/login');
  };

  // Public landing page, auth pages, and digital receipt route render without POS chrome
  const isStandaloneRoute =
    pathname === '/' ||
    pathname?.startsWith('/r/') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  if (isStandaloneRoute) {
    return <>{children}</>;
  }

  // Quick items for bottom navigation on mobile (Kasir, Antrean, Riwayat, Menu)
  const bottomPrimaryItems = visibleNavItems.slice(0, 4);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* ================= TOP HEADER (NO SIDEBAR) ================= */}
      <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur border-b border-stone-800 shadow-sm no-print">
        {/* Tier 1: Brand & Global System Controls */}
        <div className="px-3 sm:px-4 lg:px-6 py-2 flex items-center justify-between gap-2">
          {/* Left: Brand Identity & Plan Badge */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/pos"
              className="flex items-center gap-2 group min-w-0"
              title="Kembali ke Layar Kasir"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center font-extrabold text-white text-base sm:text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
                {businessSettings.logoText || '☕'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-stone-100 text-sm sm:text-base tracking-tight truncate">
                    MyPOS
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      openUpgradeModal();
                    }}
                    className={`hidden md:inline-flex text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md border shrink-0 transition-colors ${
                      subscription.planCode === 'pro'
                        ? 'bg-brand-500/15 text-brand-400 border-brand-500/30 hover:bg-brand-500/25'
                        : 'bg-stone-800 text-stone-300 border-stone-700 hover:border-amber-500/50'
                    }`}
                  >
                    {subscription.status === 'trial'
                      ? `TRIAL (${subscription.trialDaysLeft}H)`
                      : subscription.planCode.toUpperCase()}
                  </button>
                </div>
                <p className="text-[10px] sm:text-[11px] text-stone-400 font-medium truncate max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
                  {businessSettings.businessName}
                </p>
              </div>
            </Link>
          </div>

          {/* Right: Quick PPN Toggle, Cloud Sync, Theme, Staff Switcher, Mobile Hamburger */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Supabase Cloud Status Indicator (hidden on small screens, available in hamburger menu) */}
            <div
              title={
                supabaseConnected
                  ? 'Terhubung ke database Supabase Cloud'
                  : 'Mode Lokal (Offline-ready)'
              }
              className={`hidden md:inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] sm:text-[11px] font-semibold ${
                supabaseConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-stone-950 border-stone-800 text-stone-400'
              }`}
            >
              <Cloud className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden sm:inline">
                {isSyncingSupabase
                  ? 'Sinkron...'
                  : supabaseConnected
                    ? 'Cloud Aktif'
                    : 'Lokal'}
              </span>
            </div>

            {/* Quick PPN ON/OFF Toggle Button (hidden on small screens, available in hamburger menu) */}
            <button
              type="button"
              onClick={handleQuickTogglePpn}
              title="Klik untuk mengaktifkan atau menonaktifkan PPN/Pajak secara instan"
              className={`hidden md:flex px-2 sm:px-2.5 py-1 rounded-lg border text-[10px] sm:text-[11px] font-bold items-center gap-1 transition-all ${
                businessSettings.taxEnabled
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Percent className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>
                {businessSettings.taxName}:{' '}
                <strong
                  className={
                    businessSettings.taxEnabled
                      ? 'text-amber-400'
                      : 'text-stone-400'
                  }
                >
                  {businessSettings.taxEnabled
                    ? `ON (${businessSettings.taxRate}%)`
                    : 'OFF'}
                </strong>
              </span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              title={
                theme === 'dark'
                  ? 'Beralih ke Mode Terang (Light Mode)'
                  : 'Beralih ke Mode Gelap (Dark Mode)'
              }
              className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-stone-950 border border-stone-800 hover:border-stone-700 text-stone-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden md:inline">Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                  <span className="hidden md:inline">Gelap</span>
                </>
              )}
            </button>

            {/* Authenticated Staff / Role Switcher */}
            <button
              type="button"
              onClick={() => openSwitchModal()}
              title="Ganti Akun (Memerlukan Username & Password)"
              className="flex items-center gap-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-brand-500/40 rounded-lg px-2.5 py-1 max-w-[165px] sm:max-w-[210px] transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span className="text-[11px] font-semibold text-stone-200 truncate">
                {activeStaff.fullName}
              </span>
              <span
                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                  effectiveRole === 'superadmin'
                    ? 'bg-amber-500/20 text-amber-300'
                    : effectiveRole === 'admin'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-blue-500/20 text-blue-300'
                }`}
              >
                {effectiveRole === 'superadmin'
                  ? 'SUPER'
                  : effectiveRole === 'admin'
                    ? 'ADMIN'
                    : 'STAFF'}
              </span>
              <KeyRound className="w-3 h-3 text-stone-500 shrink-0 hidden sm:inline" />
            </button>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              title="Keluar dari Sesi Akun (Logout)"
              className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-stone-950 border border-stone-800 hover:border-red-500/40 text-stone-400 hover:text-red-400 text-[11px] font-bold flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Keluar</span>
            </button>

            {/* Mobile / Tablet Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
              aria-label="Buka Menu Navigasi Lengkap"
              title="Daftar Fitur Lengkap"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4 text-stone-200" />
              ) : (
                <Menu className="w-4 h-4 text-stone-200" />
              )}
            </button>
          </div>
        </div>

        {/* Tier 2: Responsive Full Navigation Ribbon (Desktop & Tablets; hidden on small screens in favor of bottom nav) */}
        <div className="hidden md:flex bg-stone-950/70 border-t border-stone-800/80 px-2 sm:px-4 lg:px-6 py-1.5 items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1 min-w-max">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/pos' && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold font-mono ${
                        isActive
                          ? 'bg-white text-brand-700'
                          : 'bg-amber-500 text-stone-950'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick Hardware Printer Status */}
          <Link
            href="/settings"
            className="hidden md:flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-stone-200 px-2 py-1 rounded-lg hover:bg-stone-900 border border-transparent hover:border-stone-800 transition-colors shrink-0"
            title="Pengaturan Printer Thermal"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                printerConfig.isConnected
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <Printer className="w-3 h-3 text-brand-400" />
            <span className="font-mono text-[10.5px]">
              {receiptSettings.paperWidth}mm
            </span>
          </Link>
        </div>
      </header>

      {/* ================= MOBILE EXPANDED MENU DRAWER (ALL SCREENS) ================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end lg:hidden no-print animate-in fade-in duration-150">
          <div
            className="flex-1"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup Menu"
          />
          <div className="bg-stone-900 border-t border-stone-800 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center font-bold text-white text-base">
                  {businessSettings.logoText || '☕'}
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-100 text-sm">
                    {businessSettings.businessName}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Semua Menu & Fitur Sistem MyPOS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & Status in Mobile Drawer */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Status Cloud */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  supabaseConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-stone-950 border-stone-800 text-stone-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 shrink-0" />
                  <span className="font-bold">Status Cloud</span>
                </div>
                <span className="text-[10px] font-mono font-bold">
                  {isSyncingSupabase
                    ? 'Sinkron...'
                    : supabaseConnected
                      ? 'Aktif'
                      : 'Lokal'}
                </span>
              </div>

              {/* Informasi Paket / Trial */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openUpgradeModal();
                }}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between ${
                  subscription.planCode === 'pro'
                    ? 'bg-brand-500/15 border-brand-500/30 text-brand-300'
                    : 'bg-stone-950 border-stone-800 text-stone-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400 shrink-0" />
                  <span className="font-bold">Paket SaaS</span>
                </div>
                <span className="text-[10px] font-mono font-extrabold uppercase">
                  {subscription.status === 'trial'
                    ? `TRIAL ${subscription.trialDaysLeft}H`
                    : subscription.planCode}
                </span>
              </button>

              {/* Toggle PPN */}
              <button
                type="button"
                onClick={handleQuickTogglePpn}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between ${
                  businessSettings.taxEnabled
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-stone-950 border-stone-800 text-stone-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-amber-400" />
                  <span className="font-bold">
                    {businessSettings.taxName}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold">
                  {businessSettings.taxEnabled
                    ? `${businessSettings.taxRate}% ON`
                    : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-left flex items-center justify-between text-stone-200"
              >
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-brand-400" />
                  )}
                  <span className="font-bold">Tema Tampilan</span>
                </div>
                <span className="text-[10px] font-semibold text-stone-400">
                  {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                </span>
              </button>
            </div>

            {/* All 9 Navigation Grid Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/pos' && pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      isActive
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-stone-950 border-stone-800 text-stone-200 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="font-bold text-xs truncate">
                        {item.label}
                      </span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                          isActive
                            ? 'bg-white text-brand-700'
                            : 'bg-amber-500 text-stone-950'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* SaaS Plan Pill & Logout in Drawer */}
            <div className="pt-2 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openUpgradeModal();
                }}
                className="text-brand-400 font-bold hover:underline"
              >
                Paket: {PLANS[subscription.planCode].name} (Ubah →)
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MAIN APPLICATION WORKSPACE ================= */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {isHydrated &&
        pathname?.startsWith('/superadmin') &&
        authRole !== 'superadmin' ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-base font-extrabold text-stone-100">
                Akses Khusus Superadmin Platform
              </h2>
              <p className="text-xs text-stone-400">
                Halaman ini hanya dapat diakses oleh pemilik platform SaaS
                (role <code className="text-amber-300">superadmin</code>).
              </p>
              <Link
                href="/pos"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white"
              >
                Kembali ke Kasir (POS)
              </Link>
            </div>
          </div>
        ) : isHydrated &&
          activeStaff.role === 'staff' &&
          ['/settings', '/discounts', '/billing', '/onboarding'].some((p) =>
            pathname?.startsWith(p)
          ) ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-base font-extrabold text-stone-100">
                Akses Terbatas — Khusus Admin / Owner
              </h2>
              <p className="text-xs text-stone-400 leading-relaxed">
                Anda sedang masuk sebagai akun{' '}
                <strong className="text-stone-200">
                  {activeStaff.fullName} (STAFF)
                </strong>
                . Untuk membuka halaman pengaturan atau manajemen cafe, masukkan
                username dan kata sandi Admin terlebih dahulu.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Link
                  href="/pos"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200"
                >
                  Ke Layar Kasir
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const owner = staffList.find((s) => s.role === 'admin');
                    openSwitchModal(owner?.id, owner?.username || '');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Masuk sebagai Admin</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          children
        )}
      </div>

      {/* ================= MOBILE BOTTOM NAVIGATION BAR (STICKY FOR TOUCH) ================= */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-stone-900/95 backdrop-blur border-t border-stone-800 px-2 py-1.5 flex items-center justify-around md:hidden no-print">
        {bottomPrimaryItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/pos' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold rounded-lg transition-colors relative ${
                isActive ? 'text-brand-400' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-amber-500 text-stone-950 rounded-full font-mono text-[8px] font-black flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="truncate">{item.shortLabel}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-stone-400 hover:text-stone-200"
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>Lainnya</span>
        </button>
      </nav>

      {/* ================= GLOBAL TOAST NOTIFICATION ================= */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-5 right-4 z-50 max-w-sm bg-stone-900/95 backdrop-blur border border-stone-700 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 no-print"
        >
          <div className="mt-0.5 shrink-0">
            {toast.variant === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            {toast.variant === 'warning' && (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
            {toast.variant === 'error' && (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
            {toast.variant === 'info' && (
              <Info className="w-5 h-5 text-sky-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-stone-100">{toast.title}</p>
            {toast.description && (
              <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">
                {toast.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={dismissToast}
            className="text-stone-500 hover:text-stone-300 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= PLAN UPGRADE & COMPARISON MODAL ================= */}
      {upgradePromptFeature && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-2xl rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full mb-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>Pilihan Paket SaaS MyPOS</span>
                </div>
                <h3 className="font-extrabold text-stone-100 text-base">
                  {PRO_FEATURE_LABELS[upgradePromptFeature]?.title ||
                    'Bandingkan Paket Basic vs Pro'}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  {PRO_FEATURE_LABELS[upgradePromptFeature]?.description}
                </p>
              </div>
              <button
                type="button"
                onClick={closeUpgradeModal}
                className="text-stone-400 hover:text-stone-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="flex items-center justify-between bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-xs">
              <span className="text-stone-300 font-medium">
                Siklus Tagihan Langganan:
              </span>
              <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-lg border border-stone-800">
                <button
                  type="button"
                  onClick={() => setBillingCycleModal('monthly')}
                  className={`px-3 py-1 rounded-md font-bold transition-colors ${
                    billingCycleModal === 'monthly'
                      ? 'bg-brand-600 text-white'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycleModal('yearly')}
                  className={`px-3 py-1 rounded-md font-bold transition-colors flex items-center gap-1 ${
                    billingCycleModal === 'yearly'
                      ? 'bg-brand-600 text-white'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <span>Tahunan</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 rounded">
                    Hemat 2 Bln
                  </span>
                </button>
              </div>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Basic Card */}
              <div
                className={`bg-stone-950 rounded-xl p-4 flex flex-col justify-between space-y-4 border ${
                  subscription.planCode === 'basic'
                    ? 'border-stone-500'
                    : 'border-stone-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-stone-100 text-sm">
                      {PLANS.basic.name}
                    </h4>
                    {subscription.planCode === 'basic' && (
                      <span className="text-[10px] font-bold bg-stone-800 text-stone-300 px-2 py-0.5 rounded">
                        Paket Aktif
                      </span>
                    )}
                  </div>
                  <div className="mt-2 font-mono text-lg font-extrabold text-stone-100">
                    {formatIDR(
                      billingCycleModal === 'monthly'
                        ? PLANS.basic.priceMonthly
                        : PLANS.basic.priceYearly
                    )}
                    <span className="text-xs font-normal text-stone-400">
                      /{billingCycleModal === 'monthly' ? 'bln' : 'thn'}
                    </span>
                  </div>
                  <p className="text-stone-400 text-[11px] mt-1">
                    {PLANS.basic.tagline}
                  </p>

                  <ul className="mt-3 space-y-2 text-stone-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Maks 3 Akun Staf & 50 Produk Menu</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Alur Kasir Pay-First & Antrean Barista</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Cetak Thermal Langsung & Opsi PPN Fleksibel</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Identitas Bisnis & 1 Template Struk (Minimal)</span>
                    </li>
                    <li className="flex items-center gap-2 text-stone-500">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>Tanpa Template Klasik/Modern, QR & Ekspor CSV</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    switchSubscriptionPlan('basic', billingCycleModal)
                  }
                  className="w-full py-2.5 rounded-xl font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
                >
                  {subscription.planCode === 'basic'
                    ? 'Tetap di Basic Plan'
                    : 'Pindah ke Basic Plan'}
                </button>
              </div>

              {/* Pro Card */}
              <div className="bg-stone-950 border-2 border-brand-500 rounded-xl p-4 flex flex-col justify-between space-y-4 relative shadow-lg shadow-brand-500/10">
                <div className="absolute -top-2.5 right-4 bg-brand-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                  Semua Fitur Terbuka
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-brand-400 text-sm">
                      {PLANS.pro.name}
                    </h4>
                    {subscription.planCode === 'pro' && (
                      <span className="text-[10px] font-bold bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded">
                        Paket Aktif
                      </span>
                    )}
                  </div>
                  <div className="mt-2 font-mono text-lg font-extrabold text-brand-400">
                    {formatIDR(
                      billingCycleModal === 'monthly'
                        ? PLANS.pro.priceMonthly
                        : PLANS.pro.priceYearly
                    )}
                    <span className="text-xs font-normal text-stone-400">
                      /{billingCycleModal === 'monthly' ? 'bln' : 'thn'}
                    </span>
                  </div>
                  <p className="text-stone-400 text-[11px] mt-1">
                    {PLANS.pro.tagline}
                  </p>

                  <ul className="mt-3 space-y-2 text-stone-200">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                      <span>
                        <strong>Produk Tanpa Batas</strong> & Hingga 15 Staf
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                      <span>
                        Semua Template Struk (Minimal, Klasik, Modern)
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                      <span>QR Code di Struk, Prefix Invoice & Struk Digital</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                      <span>Varian Menu, Hold Order & Diskon Tanpa Batas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                      <span>Laporan Analitik Lanjutan & Ekspor CSV/PDF</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    switchSubscriptionPlan('pro', billingCycleModal)
                  }
                  className="w-full py-2.5 rounded-xl font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30 transition-colors"
                >
                  {subscription.planCode === 'pro'
                    ? 'Perbarui Siklus Pro Plan'
                    : 'Upgrade ke Pro Sekarang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= AUTHENTICATED SWITCH ACCOUNT MODAL ================= */}
      {switchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-stone-100">
                    Ganti Akun / Autentikasi Peran
                  </h2>
                  <p className="text-[11px] text-stone-400">
                    Masukkan username & kata sandi untuk beralih ke Admin atau Staff.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSwitchModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Quick-pick list of accounts to auto-fill username */}
              <div>
                <p className="text-[10.5px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                  Pilih Akun Tujuan (Lalu Masukkan Sandi)
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {staffList
                    .filter((s) => s.isActive)
                    .map((s) => {
                      const isCurrent = s.id === activeStaff.id;
                      const isSelected = switchTargetId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSwitchTargetId(s.id);
                            setSwitchUsername(s.username || '');
                            setSwitchError(null);
                          }}
                          className={`text-left p-2 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-brand-600/20 border-brand-500 text-stone-100'
                              : isCurrent
                                ? 'bg-stone-950 border-emerald-500/40 text-stone-200'
                                : 'bg-stone-950 border-stone-800 hover:border-stone-700 text-stone-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-bold truncate">
                              {s.fullName}
                            </span>
                            <span
                              className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                s.role === 'admin'
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {s.role === 'admin' ? 'ADMIN' : 'STAFF'}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-stone-400 truncate mt-0.5">
                            @{s.username || 'admin'}
                            {isCurrent ? ' • Aktif' : ''}
                          </p>
                        </button>
                      );
                    })}
                </div>
              </div>

              {switchError && (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium">
                  {switchError}
                </div>
              )}

              <form onSubmit={handleSwitchSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                    Username Akun
                  </label>
                  <input
                    type="text"
                    required
                    value={switchUsername}
                    onChange={(e) => setSwitchUsername(e.target.value)}
                    placeholder="Mis: kasir1 atau username admin"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:border-brand-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                    Kata Sandi
                  </label>
                  <input
                    type="password"
                    required
                    value={switchPassword}
                    onChange={(e) => setSwitchPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => setSwitchModalOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSwitching}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white flex items-center gap-1.5 shadow-md shadow-brand-600/20"
                  >
                    {isSwitching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Memverifikasi...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Verifikasi & Masuk</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
