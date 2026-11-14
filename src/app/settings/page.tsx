'use client';

import React, { useMemo, useState } from 'react';
import { usePos } from '@/context/PosContext';
import { ThermalReceiptPreview } from '@/components/receipt/ThermalReceiptPreview';
import {
  createSamplePreviewOrder,
  pairHardwarePrinter,
  printOrderReceipt,
} from '@/lib/thermal-printer';
import { PLANS } from '@/lib/plans';
import {
  Building2,
  Check,
  Eye,
  KeyRound,
  Loader2,
  Lock,
  Percent,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Usb,
  Users,
  X,
} from 'lucide-react';
import { ReceiptTemplate, RoundingRule, StaffProfile, UserRole } from '@/types/pos';

type SettingsTab = 'identity' | 'receipt' | 'printer' | 'tax' | 'staff';

export default function SettingsAndReceiptCustomizerPage() {
  const {
    businessSettings,
    updateBusinessSettings,
    receiptSettings,
    updateReceiptSettings,
    resetReceiptToDefault,
    printerConfig,
    updatePrinterConfig,
    staffList,
    addStaff,
    toggleStaffActive,
    updateStaffPassword,
    deleteStaff,
    auditLogs,
    subscription,
    canFeature,
    openUpgradeModal,
    showToast,
  } = usePos();

  const [activeTab, setActiveTab] = useState<SettingsTab>('receipt');
  const [animateReceipt, setAnimateReceipt] = useState(false);
  const [printerFeedback, setPrinterFeedback] = useState<string>('');

  // Staff form state (Username + Password inside tenant)
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('1234');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  // Staff Password Modal state
  const [passwordModalStaff, setPasswordModalStaff] =
    useState<StaffProfile | null>(null);
  const [modalNewUsername, setModalNewUsername] = useState('');
  const [modalNewPassword, setModalNewPassword] = useState('');
  const [modalNewPin, setModalNewPin] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const sampleOrder = useMemo(
    () => createSamplePreviewOrder(businessSettings, receiptSettings),
    [businessSettings, receiptSettings]
  );

  const handleTestPrint = async () => {
    setAnimateReceipt(false);
    setTimeout(() => setAnimateReceipt(true), 20);
    const res = await printOrderReceipt(sampleOrder, printerConfig);
    setPrinterFeedback(res.message);
    showToast('Test Print ESC/POS berhasil dikirim!', {
      description: res.message,
      variant: 'success',
    });
  };

  const handlePairPrinter = async (conn: 'usb' | 'serial' | 'bluetooth') => {
    updatePrinterConfig({ connection: conn });
    const res = await pairHardwarePrinter(conn);
    updatePrinterConfig({
      connection: conn,
      isConnected: true,
      deviceName: res.deviceName,
    });
    setPrinterFeedback(res.message);
    showToast(res.message, { variant: 'info' });
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newStaffUsername.trim().toLowerCase();
    if (!newStaffName.trim() || !cleanUsername) {
      showToast('Nama dan username staf wajib diisi', { variant: 'warning' });
      return;
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(cleanUsername)) {
      showToast(
        'Username harus 3–32 karakter (huruf kecil, angka, titik, underscore, atau strip)',
        { variant: 'warning' }
      );
      return;
    }
    const chosenPassword =
      newStaffPassword.trim() || `Kasir#${newStaffPin || '1234'}`;
    if (chosenPassword.length < 6) {
      showToast('Kata sandi login minimal 6 karakter', { variant: 'warning' });
      return;
    }
    setIsAddingStaff(true);
    const res = await addStaff({
      fullName: newStaffName.trim(),
      username: cleanUsername,
      role: 'staff',
      pin: newStaffPin || '1234',
      password: chosenPassword,
      isActive: true,
    });
    setIsAddingStaff(false);
    if (!res.ok) {
      return;
    }
    showToast(`Staf "${newStaffName}" berhasil didaftarkan!`, {
      description: `Username: @${cleanUsername} | Password: ${chosenPassword}`,
      variant: 'success',
    });
    setNewStaffName('');
    setNewStaffUsername('');
    setNewStaffPassword('');
    setNewStaffPin('1234');
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalStaff) return;
    if (modalNewPassword.trim() && modalNewPassword.trim().length < 6) {
      showToast('Kata sandi baru minimal 6 karakter', { variant: 'warning' });
      return;
    }
    setIsUpdatingPassword(true);
    const res = await updateStaffPassword(
      passwordModalStaff.id,
      modalNewPassword.trim(),
      modalNewPin.trim() || undefined,
      modalNewUsername.trim() || undefined
    );
    setIsUpdatingPassword(false);
    if (res.ok) {
      setPasswordModalStaff(null);
      setModalNewUsername('');
      setModalNewPassword('');
      setModalNewPin('');
    }
  };

  const handleDeleteStaffClick = async (st: StaffProfile) => {
    if (
      confirm(
        `Yakin ingin menghapus akun staf "${st.fullName}" (@${st.username})?`
      )
    ) {
      await deleteStaff(st.id);
    }
  };

  return (
    <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-4 no-print">
        <div>
          <h1 className="text-lg font-extrabold text-stone-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-brand-400" />
            <span>Kustomisasi Identitas Bisnis, Template Struk & Sistem</span>
          </h1>
          <p className="text-xs text-stone-400">
            Seluruh perubahan langsung tampil pada simulasi kertas thermal di
            sebelah kanan. Struk lama tetap aman berkat{' '}
            <code className="text-brand-300 font-mono">receipt_snapshot</code>.
          </p>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800 overflow-x-auto no-scrollbar text-xs">
          {[
            { id: 'receipt', label: 'Desain Struk', icon: Receipt },
            { id: 'identity', label: 'Identitas Bisnis', icon: Building2 },
            { id: 'printer', label: 'Printer Thermal', icon: Printer },
            { id: 'tax', label: 'PPN & Pajak', icon: Percent },
            { id: 'staff', label: 'Staf & Audit', icon: Users },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as SettingsTab)}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  activeTab === t.id
                    ? 'bg-brand-600 text-white'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: CONFIGURATION PANELS (7 COLS) ================= */}
        <div className="lg:col-span-7 space-y-4 no-print">
          {/* TAB 1: RECEIPT TEMPLATE & CUSTOMIZATION */}
          {activeTab === 'receipt' && (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-stone-100">
                    Template & Kustomisasi Elemen Struk
                  </h2>
                  <p className="text-[11px] text-stone-400">
                    Pilih gaya struk, lebar kertas 58mm/80mm, dan elemen yang
                    ingin ditampilkan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetReceiptToDefault}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold flex items-center gap-1 text-[11px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              </div>

              {/* Template Selector (Minimal vs Klasik vs Modern) */}
              <div className="space-y-2">
                <label className="block text-stone-300 font-bold">
                  Pilih Gaya Template Struk:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      {
                        id: 'minimal',
                        title: 'Minimal',
                        desc: 'Bersih, garis putus-putus, hemat kertas',
                        proOnly: false,
                      },
                      {
                        id: 'classic',
                        title: 'Klasik',
                        desc: 'Garis ganda tegas, judul bergaris bawah',
                        proOnly: true,
                      },
                      {
                        id: 'modern',
                        title: 'Modern Badge',
                        desc: 'Emblem logo bulat, spasi modern rapi',
                        proOnly: true,
                      },
                    ] as {
                      id: ReceiptTemplate;
                      title: string;
                      desc: string;
                      proOnly: boolean;
                    }[]
                  ).map((tpl) => {
                    const locked =
                      tpl.proOnly && !canFeature('custom_receipt_templates');
                    const isSelected = receiptSettings.template === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() =>
                          updateReceiptSettings({ template: tpl.id })
                        }
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-brand-500 bg-brand-500/15 text-stone-100'
                            : 'border-stone-800 bg-stone-950 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="font-bold text-xs">{tpl.title}</span>
                          {locked ? (
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                              <Lock className="w-2.5 h-2.5" /> Pro
                            </span>
                          ) : isSelected ? (
                            <Check className="w-3.5 h-3.5 text-brand-400" />
                          ) : null}
                        </div>
                        <p className="text-[10.5px] text-stone-400 leading-snug">
                          {tpl.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paper Width & Font & Alignment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-800">
                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Lebar Kertas Thermal
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[58, 80].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          updateReceiptSettings({ paperWidth: w as 58 | 80 });
                          updatePrinterConfig({ paperWidth: w as 58 | 80 });
                        }}
                        className={`py-2 rounded-lg font-bold border ${
                          receiptSettings.paperWidth === w
                            ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                            : 'border-stone-800 bg-stone-950 text-stone-400'
                        }`}
                      >
                        {w} mm
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Ukuran Font Struk
                  </label>
                  <select
                    value={receiptSettings.fontSize}
                    onChange={(e) =>
                      updateReceiptSettings({
                        fontSize: e.target.value as 'small' | 'normal' | 'large',
                      })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="small">Kecil (Padat)</option>
                    <option value="normal">Normal (Standar)</option>
                    <option value="large">Besar (Mudah Dibaca)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Rata Teks Header
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'center', label: 'Tengah' },
                      { id: 'left', label: 'Rata Kiri' },
                    ].map((al) => (
                      <button
                        key={al.id}
                        type="button"
                        onClick={() =>
                          updateReceiptSettings({
                            alignHeader: al.id as 'left' | 'center',
                          })
                        }
                        className={`py-2 rounded-lg font-bold border ${
                          receiptSettings.alignHeader === al.id
                            ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                            : 'border-stone-800 bg-stone-950 text-stone-400'
                        }`}
                      >
                        {al.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Visibility Toggles */}
              <div className="space-y-2 pt-2 border-t border-stone-800">
                <label className="block text-stone-300 font-bold">
                  Elemen yang Ditampilkan di Struk:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'showLogo', label: 'Logo / Simbol Cafe' },
                    { key: 'showTagline', label: 'Tagline / Slogan Cafe' },
                    { key: 'showAddress', label: 'Alamat Lengkap Cafe' },
                    { key: 'showPhone', label: 'Nomor Telepon / WhatsApp' },
                    { key: 'showSocial', label: 'Akun Instagram' },
                    { key: 'showCashier', label: 'Nama Kasir Bertugas' },
                    { key: 'showTable', label: 'Nomor Meja / Tipe Order' },
                    { key: 'showCustomer', label: 'Nama Pelanggan' },
                    { key: 'showWifi', label: 'Info Wi-Fi & Password' },
                  ].map((item) => {
                    const checked = Boolean(
                      receiptSettings[item.key as keyof typeof receiptSettings]
                    );
                    return (
                      <label
                        key={item.key}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer hover:border-stone-700"
                      >
                        <span className="text-stone-300 font-medium">
                          {item.label}
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            updateReceiptSettings({
                              [item.key]: e.target.checked,
                            })
                          }
                          className="rounded border-stone-700 bg-stone-900 text-brand-600 focus:ring-0"
                        />
                      </label>
                    );
                  })}

                  {/* Pro Feature Toggle: QR Code on Receipt */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer hover:border-brand-500/50">
                    <span className="text-stone-300 font-medium flex items-center gap-1.5">
                      <span>QR Code di Bawah Struk</span>
                      {!canFeature('receipt_qr_code') && (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">
                          <Lock className="w-2.5 h-2.5" /> Pro
                        </span>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={receiptSettings.showQr}
                      onChange={(e) =>
                        updateReceiptSettings({ showQr: e.target.checked })
                      }
                      className="rounded border-stone-700 bg-stone-900 text-brand-600 focus:ring-0"
                    />
                  </label>
                </div>
              </div>

              {/* Custom Texts, Wi-Fi, Prefix & QR */}
              <div className="space-y-3 pt-2 border-t border-stone-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-400 mb-1 font-medium">
                      Nama Wi-Fi (SSID)
                    </label>
                    <input
                      type="text"
                      value={receiptSettings.wifiSsid}
                      onChange={(e) =>
                        updateReceiptSettings({ wifiSsid: e.target.value })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1 font-medium">
                      Password Wi-Fi Pelanggan
                    </label>
                    <input
                      type="text"
                      value={receiptSettings.wifiPassword}
                      onChange={(e) =>
                        updateReceiptSettings({ wifiPassword: e.target.value })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-400 mb-1 font-medium flex items-center justify-between">
                      <span>Prefix Nomor Invoice</span>
                      {!canFeature('receipt_custom_prefix') && (
                        <span className="text-[10px] text-amber-400 font-bold">
                          Pro
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={receiptSettings.numberPrefix}
                      onChange={(e) => {
                        if (!canFeature('receipt_custom_prefix')) {
                          openUpgradeModal('receipt_custom_prefix');
                          return;
                        }
                        updateReceiptSettings({
                          numberPrefix: e.target.value.toUpperCase(),
                        });
                      }}
                      placeholder="INV"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1 font-medium">
                      Tautan / Isi QR Code Struk
                    </label>
                    <input
                      type="text"
                      value={receiptSettings.qrContent}
                      onChange={(e) =>
                        updateReceiptSettings({ qrContent: e.target.value })
                      }
                      placeholder="https://instagram.com/kopisenja.id"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Teks Tambahan Header (Opsional)
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.headerText}
                    onChange={(e) =>
                      updateReceiptSettings({ headerText: e.target.value })
                    }
                    placeholder="Mis: Cabang Rinjani • Buka Setiap Hari 08.00 - 23.00"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Pesan Kaki Struk (Footer Message)
                  </label>
                  <textarea
                    rows={2}
                    value={receiptSettings.footerText}
                    onChange={(e) =>
                      updateReceiptSettings({ footerText: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUSINESS IDENTITY (KF-40) */}
          {activeTab === 'identity' && (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 text-xs">
              <div>
                <h2 className="text-sm font-extrabold text-stone-100">
                  Profil Identitas Bisnis Cafe
                </h2>
                <p className="text-[11px] text-stone-400">
                  Identitas ini muncul di aplikasi kasir dan dicetak di bagian
                  atas setiap struk.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-stone-400 font-medium">
                  Pilih Simbol / Ikon Logo Struk
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['☕', '🥐', '🍵', '🧋', '🍰', '🔥', '🌿', '✨'].map(
                    (icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() =>
                          updateBusinessSettings({ logoText: icon })
                        }
                        className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition-all ${
                          businessSettings.logoText === icon
                            ? 'border-brand-500 bg-brand-500/20'
                            : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                        }`}
                      >
                        {icon}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Nama Cafe / Bisnis *
                  </label>
                  <input
                    type="text"
                    value={businessSettings.businessName}
                    onChange={(e) =>
                      updateBusinessSettings({ businessName: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-bold focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Tagline / Slogan
                  </label>
                  <input
                    type="text"
                    value={businessSettings.tagline}
                    onChange={(e) =>
                      updateBusinessSettings({ tagline: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-stone-400 mb-1 font-medium">
                    Alamat Lengkap Outlet
                  </label>
                  <input
                    type="text"
                    value={businessSettings.address}
                    onChange={(e) =>
                      updateBusinessSettings({ address: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={businessSettings.phone}
                    onChange={(e) =>
                      updateBusinessSettings({ phone: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Instagram / Media Sosial
                  </label>
                  <input
                    type="text"
                    value={businessSettings.instagram}
                    onChange={(e) =>
                      updateBusinessSettings({ instagram: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    NPWP / Nomor Pajak Daerah (Opsional)
                  </label>
                  <input
                    type="text"
                    value={businessSettings.taxId}
                    onChange={(e) =>
                      updateBusinessSettings({ taxId: e.target.value })
                    }
                    placeholder="09.234.567.8-652.000"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Zona Waktu & Mata Uang
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${businessSettings.timezone} (${businessSettings.currency})`}
                    className="w-full bg-stone-950/50 border border-stone-800 rounded-xl px-3 py-2 text-stone-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: THERMAL PRINTER ESC/POS (KF-52, KF-53, KF-54) */}
          {activeTab === 'printer' && (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 text-xs">
              <div>
                <h2 className="text-sm font-extrabold text-stone-100">
                  Koneksi Printer Thermal Langsung (ESC/POS)
                </h2>
                <p className="text-[11px] text-stone-400">
                  Cetak struk langsung tanpa dialog browser melalui WebUSB, Web
                  Serial, atau Bluetooth di Chrome/Edge.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'usb',
                    label: 'WebUSB (Kabel USB)',
                    desc: 'Rekomendasi PC / Tablet Android OTG',
                  },
                  {
                    id: 'serial',
                    label: 'Web Serial (COM)',
                    desc: 'Untuk printer USB-Serial / Bluetooth COM',
                  },
                  {
                    id: 'bluetooth',
                    label: 'Web Bluetooth',
                    desc: 'Untuk printer thermal portable 58mm',
                  },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      handlePairPrinter(c.id as 'usb' | 'serial' | 'bluetooth')
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      printerConfig.connection === c.id
                        ? 'border-brand-500 bg-brand-500/15 text-stone-100'
                        : 'border-stone-800 bg-stone-950 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{c.label}</span>
                      <Usb className="w-3.5 h-3.5 text-brand-400" />
                    </div>
                    <p className="text-[10.5px] text-stone-400 mt-1">
                      {c.desc}
                    </p>
                  </button>
                ))}
              </div>

              {printerFeedback && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
                  {printerFeedback}
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-stone-800">
                <label className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer">
                  <div>
                    <p className="font-bold text-stone-200">
                      Cetak Struk Otomatis Setelah Pembayaran Lunas
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Begitu kasir menekan Terima Uang, struk langsung keluar
                      dari printer thermal.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={receiptSettings.autoPrint}
                    onChange={(e) =>
                      updateReceiptSettings({ autoPrint: e.target.checked })
                    }
                    className="rounded border-stone-700 bg-stone-900 text-brand-600 focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer">
                  <div>
                    <p className="font-bold text-stone-200">
                      Buka Laci Kasir Otomatis (Cash Drawer Kick Pulse)
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Mengirim sinyal ESC/POS{' '}
                      <code className="font-mono">0x1B 0x70</code> ke port RJ-11
                      printer saat bayar tunai.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={printerConfig.openDrawer}
                    onChange={(e) => {
                      updatePrinterConfig({ openDrawer: e.target.checked });
                      updateReceiptSettings({ openDrawer: e.target.checked });
                    }}
                    className="rounded border-stone-700 bg-stone-900 text-brand-600 focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer">
                  <div>
                    <p className="font-bold text-stone-200">
                      Potong Kertas Otomatis (Auto-Cut Command)
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Mengirim perintah <code className="font-mono">GS V</code>{' '}
                      di akhir struk untuk printer dengan pisau pemotong.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={printerConfig.autoCut}
                    onChange={(e) =>
                      updatePrinterConfig({ autoCut: e.target.checked })
                    }
                    className="rounded border-stone-700 bg-stone-900 text-brand-600 focus:ring-0"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: CONFIGURABLE TAX (PPN ON/OFF) & ROUNDING */}
          {activeTab === 'tax' && (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-extrabold text-stone-100">
                    Pengaturan PPN / Pajak Resto & Biaya Layanan
                  </h2>
                  <p className="text-[11px] text-stone-400">
                    Anda dapat mengaktifkan atau menonaktifkan perhitungan PPN
                    kapan saja sesuai kebutuhan outlet cafe Anda.
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full border text-[10px] font-extrabold uppercase whitespace-nowrap ${
                    businessSettings.taxEnabled
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-stone-800 text-stone-400 border-stone-700'
                  }`}
                >
                  {businessSettings.taxEnabled
                    ? `${businessSettings.taxName} Aktif (${businessSettings.taxRate}%)`
                    : `${businessSettings.taxName} Nonaktif`}
                </span>
              </div>

              {/* Master PPN Enable / Disable Switch Card */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-stone-100 text-xs">
                    Aktifkan Perhitungan {businessSettings.taxName || 'PPN'} pada Transaksi
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Jika diaktifkan, struk dan laporan kas akan memisahkan Dasar
                    Pengenaan Pajak (DPP) dan nilai pajak secara otomatis. Jika
                    dinonaktifkan, pajak bernilai Rp 0.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={businessSettings.taxEnabled}
                  onClick={() => {
                    const nextVal = !businessSettings.taxEnabled;
                    updateBusinessSettings({ taxEnabled: nextVal });
                    showToast(
                      nextVal
                        ? `${businessSettings.taxName} diaktifkan (${businessSettings.taxRate}%)`
                        : `${businessSettings.taxName} dinonaktifkan`
                    );
                  }}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs border transition-all shrink-0 ${
                    businessSettings.taxEnabled
                      ? 'bg-brand-600 text-white border-brand-500 shadow-sm'
                      : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-stone-600'
                  }`}
                >
                  {businessSettings.taxEnabled ? 'PPN: AKTIF' : 'PPN: NONAKTIF'}
                </button>
              </div>

              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity ${
                  businessSettings.taxEnabled ? 'opacity-100' : 'opacity-50'
                }`}
              >
                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Nama Pajak (Tampil di Struk)
                  </label>
                  <input
                    type="text"
                    value={businessSettings.taxName}
                    onChange={(e) =>
                      updateBusinessSettings({ taxName: e.target.value })
                    }
                    placeholder="PB1 / PPN"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Tarif Pajak (%) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={0.5}
                    disabled={!businessSettings.taxEnabled}
                    value={businessSettings.taxRate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const res = updateBusinessSettings({ taxRate: val });
                      if (!res.ok && res.error) {
                        showToast(res.error, { variant: 'warning' });
                      }
                    }}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono font-bold focus:outline-none focus:border-brand-500 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Mode Perhitungan Pajak
                  </label>
                  <select
                    value={
                      businessSettings.taxInclusive ? 'inclusive' : 'exclusive'
                    }
                    onChange={(e) =>
                      updateBusinessSettings({
                        taxInclusive: e.target.value === 'inclusive',
                      })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="exclusive">
                      Eksklusif (Ditambahkan di atas harga menu)
                    </option>
                    <option value="inclusive">
                      Inklusif (Harga menu sudah termasuk pajak)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-400 mb-1 font-medium">
                    Service Charge Opsional (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    value={businessSettings.serviceRate}
                    onChange={(e) =>
                      updateBusinessSettings({
                        serviceRate: Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-stone-400 mb-1 font-medium">
                    Aturan Pembulatan Tagihan Tunai
                  </label>
                  <select
                    value={businessSettings.roundingRule}
                    onChange={(e) =>
                      updateBusinessSettings({
                        roundingRule: e.target.value as RoundingRule,
                      })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="nearest_1">
                      Tanpa Pembulatan (Presisi 1 Rupiah)
                    </option>
                    <option value="nearest_100">
                      Bulatkan ke Rp 100 Terdekat
                    </option>
                    <option value="nearest_500">
                      Bulatkan ke Rp 500 Terdekat
                    </option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: STAFF RBAC & AUDIT LOGS */}
          {activeTab === 'staff' && (
            <div className="space-y-4 text-xs">
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-extrabold text-stone-100">
                      Manajemen Akun Staf & Hak Akses Role
                    </h2>
                    <p className="text-[11px] text-stone-400">
                      Kuota staf aktif:{' '}
                      <strong>
                        {staffList.filter((s) => s.isActive).length} /{' '}
                        {PLANS[subscription.planCode].limits.max_users}
                      </strong>{' '}
                      ({PLANS[subscription.planCode].name})
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleAddStaff}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1 bg-stone-950 p-3 rounded-xl border border-stone-800"
                >
                  <div>
                    <label className="block text-[10.5px] text-stone-400 font-semibold mb-1">
                      Nama Lengkap Staf *
                    </label>
                    <input
                      type="text"
                      required
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="Mis: Budi Santoso"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-stone-400 font-semibold mb-1">
                      Username Staf *
                    </label>
                    <input
                      type="text"
                      required
                      value={newStaffUsername}
                      onChange={(e) =>
                        setNewStaffUsername(
                          e.target.value.toLowerCase().replace(/\s+/g, '')
                        )
                      }
                      placeholder="kasir1"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-stone-400 font-semibold mb-1">
                      Kata Sandi Login *
                    </label>
                    <input
                      type="text"
                      value={newStaffPassword}
                      onChange={(e) => setNewStaffPassword(e.target.value)}
                      placeholder="Default: Kasir#[PIN]"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-stone-400 font-semibold mb-1">
                      Peran & PIN Otorisasi
                    </label>
                    <div className="flex gap-1.5">
                      <div className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-2 text-stone-300 text-[11px] font-semibold flex items-center">
                        Staff (Kasir/Barista)
                      </div>
                      <input
                        type="text"
                        maxLength={4}
                        value={newStaffPin}
                        onChange={(e) => setNewStaffPin(e.target.value)}
                        placeholder="PIN"
                        title="4 digit PIN otorisasi kasir"
                        className="w-16 bg-stone-900 border border-stone-800 rounded-xl px-2 py-2 text-stone-100 text-center font-mono text-xs focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-end sm:col-span-2 lg:col-span-1">
                    <button
                      type="submit"
                      disabled={isAddingStaff}
                      className="w-full py-2.5 px-3 rounded-xl font-bold bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white flex items-center justify-center gap-1.5 shadow-md shadow-brand-600/20"
                    >
                      {isAddingStaff ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Staf</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  {staffList.map((st) => (
                    <div
                      key={st.id}
                      className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 rounded-xl bg-stone-950 border border-stone-800"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-stone-100 flex items-center gap-1.5 flex-wrap">
                          <span>{st.fullName}</span>
                          <span
                            className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                              st.role === 'admin' || st.role === 'superadmin'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {st.role === 'admin' || st.role === 'superadmin'
                              ? 'Admin (Owner)'
                              : 'Staff (Kasir/Barista)'}
                          </span>
                        </p>
                        <p className="text-[11px] text-stone-400 truncate">
                          Username:{' '}
                          <code className="font-mono text-brand-300 bg-stone-900 px-1.5 py-0.5 rounded">
                            @{st.username}
                          </code>
                          {st.email ? ` (${st.email})` : ''} • PIN Otorisasi:{' '}
                          <code className="font-mono text-stone-300 bg-stone-900 px-1.5 py-0.5 rounded">
                            {st.pin}
                          </code>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordModalStaff(st);
                            setModalNewUsername(st.username || '');
                            setModalNewPassword('');
                            setModalNewPin(st.pin || '');
                          }}
                          title="Ubah Username / Kata Sandi Switch"
                          className="py-1.5 px-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-brand-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-brand-400" />
                          <span>Ganti Sandi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const res = toggleStaffActive(st.id);
                            if (!res.ok && res.error) {
                              showToast(res.error, { variant: 'warning' });
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${
                            st.isActive
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                          }`}
                        >
                          {st.isActive ? 'Aktif' : 'Nonaktif'}
                        </button>

                        {st.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStaffClick(st)}
                            title="Hapus akun staf"
                            className="p-1.5 rounded-lg bg-stone-900 hover:bg-red-500/20 border border-stone-800 hover:border-red-500/30 text-stone-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit Logs Table */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Jejak Audit Sistem (Audit Logs)</span>
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {auditLogs.slice(0, 20).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 flex items-start justify-between gap-2 text-[11px]"
                    >
                      <div>
                        <span className="font-mono font-bold text-brand-400 mr-2">
                          [{log.action}]
                        </span>
                        <span className="text-stone-200">{log.details}</span>
                        <p className="text-[10px] text-stone-500 mt-0.5">
                          Oleh: {log.actorName} ({log.actorRole})
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-stone-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN: LIVE THERMAL RECEIPT PREVIEW (5 COLS) ================= */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[370px] sticky top-20 space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-400 px-2 no-print">
              <span className="flex items-center gap-1.5 font-semibold text-stone-200">
                <Eye className="w-4 h-4 text-brand-400" />
                <span>Live Preview Struk Thermal</span>
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-brand-300">
                {receiptSettings.template.toUpperCase()} •{' '}
                {receiptSettings.paperWidth}mm
              </span>
            </div>

            <ThermalReceiptPreview
              order={sampleOrder}
              animateFeed={animateReceipt}
              showPrintActions={true}
              onPrintThermal={handleTestPrint}
              onPrintBrowser={() => window.print()}
            />
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {passwordModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-500/15 text-brand-400 border border-brand-500/30">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-100">
                    Ubah Kredensial Akun
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    {passwordModalStaff.fullName} (@{passwordModalStaff.username})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalStaff(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-stone-300 font-semibold mb-1">
                  Username Login / Switch
                </label>
                <input
                  type="text"
                  required
                  value={modalNewUsername}
                  onChange={(e) =>
                    setModalNewUsername(
                      e.target.value.toLowerCase().replace(/\s+/g, '')
                    )
                  }
                  placeholder="username"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-300 font-semibold mb-1">
                  Kata Sandi Baru (Min. 6 Karakter)
                </label>
                <input
                  type="text"
                  value={modalNewPassword}
                  onChange={(e) => setModalNewPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin mengubah sandi"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs focus:outline-none focus:border-brand-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-300 font-semibold mb-1">
                  PIN Otorisasi Kasir (4 Digit Angka)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={modalNewPin}
                  onChange={(e) => setModalNewPin(e.target.value)}
                  placeholder="1234"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs focus:outline-none focus:border-brand-500"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  PIN ini digunakan saat otorisasi void transaksi dan diskon di kasir.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setPasswordModalStaff(null)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white flex items-center gap-1.5 shadow-md shadow-brand-600/20"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Kata Sandi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
