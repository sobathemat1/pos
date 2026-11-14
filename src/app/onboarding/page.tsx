'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePos } from '@/context/PosContext';
import { ThermalReceiptPreview } from '@/components/receipt/ThermalReceiptPreview';
import {
  createSamplePreviewOrder,
  pairHardwarePrinter,
} from '@/lib/thermal-printer';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Percent,
  Printer,
  Sparkles,
  Wand2,
} from 'lucide-react';

export default function OnboardingWizardPage() {
  const router = useRouter();
  const {
    businessSettings,
    updateBusinessSettings,
    receiptSettings,
    updateReceiptSettings,
    updatePrinterConfig,
    completeOnboarding,
    showToast,
  } = usePos();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const sampleOrder = useMemo(
    () => createSamplePreviewOrder(businessSettings, receiptSettings),
    [businessSettings, receiptSettings]
  );

  const handleFinishFirstWin = () => {
    completeOnboarding();
    showToast(
      `Selamat! Struk pertama ${businessSettings.businessName} telah siap.`,
      {
        description: 'Anda kini siap menerima pesanan pelanggan di layar POS.',
        variant: 'success',
      }
    );
    router.push('/pos');
  };

  return (
    <main className="flex-1 p-4 lg:p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Header & Stepper */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-400 mb-1">
            <Wand2 className="w-3.5 h-3.5" />
            <span>Identity-to-Habit Onboarding Wizard</span>
          </div>
          <h1 className="text-lg font-extrabold text-stone-100">
            Siapkan Kasir & Struk Brand Cafe Anda dalam 4 Langkah Singkat
          </h1>
          <p className="text-xs text-stone-400">
            Target First Win: melihat struk pertama berlogo dan bernama cafe
            Anda sendiri.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs">
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s as any)}
              className={`w-8 h-8 rounded-xl font-mono font-extrabold flex items-center justify-center border transition-all ${
                step === s
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : step > s
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-stone-950 border-stone-800 text-stone-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Wizard Step Content (7 cols) */}
        <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-5 text-xs">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-brand-400 font-bold">
                <Building2 className="w-4 h-4" />
                <span>Langkah 1 dari 4 • Kenalan dengan Cafe Anda</span>
              </div>
              <h2 className="text-base font-extrabold text-stone-100">
                Apa nama cafe dan pesan yang ingin tampil di struk?
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-stone-400 mb-1">
                    Pilih Ikon Brand di Struk
                  </label>
                  <div className="flex gap-2">
                    {['☕', '🥐', '🍵', '🧋', '🍰', '🔥'].map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => updateBusinessSettings({ logoText: ic })}
                        className={`w-10 h-10 rounded-xl text-lg border ${
                          businessSettings.logoText === ic
                            ? 'border-brand-500 bg-brand-500/20'
                            : 'border-stone-800 bg-stone-950'
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">
                    Nama Cafe *
                  </label>
                  <input
                    type="text"
                    value={businessSettings.businessName}
                    onChange={(e) =>
                      updateBusinessSettings({ businessName: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-stone-100 font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">
                    Tagline / Slogan Singkat
                  </label>
                  <input
                    type="text"
                    value={businessSettings.tagline}
                    onChange={(e) =>
                      updateBusinessSettings({ tagline: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">
                    Alamat Singkat Outlet
                  </label>
                  <input
                    type="text"
                    value={businessSettings.address}
                    onChange={(e) =>
                      updateBusinessSettings({ address: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-100"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl font-extrabold bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center gap-2"
              >
                <span>Lanjut ke Pengaturan Pajak Wajib</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-brand-400 font-bold">
                <Percent className="w-4 h-4" />
                <span>Langkah 2 dari 4 • Pengaturan PPN / Pajak</span>
              </div>
              <h2 className="text-base font-extrabold text-stone-100">
                Apakah cafe Anda mengenakan PPN / Pajak Resto?
              </h2>
              <p className="text-stone-400">
                Anda dapat mengaktifkan atau menonaktifkan PPN kapan saja. Saat
                aktif, MyPOS memisahkan DPP dan Pajak secara otomatis di struk.
              </p>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer">
                <div>
                  <p className="font-bold text-stone-100">
                    Aktifkan Perhitungan PPN / Pajak
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Matikan jika harga menu belum dikenakan pajak.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={businessSettings.taxEnabled}
                  onChange={(e) =>
                    updateBusinessSettings({ taxEnabled: e.target.checked })
                  }
                  className="rounded border-stone-700 bg-stone-900 text-brand-600 focus:ring-0"
                />
              </label>

              <div
                className={`grid grid-cols-2 gap-3 ${
                  businessSettings.taxEnabled ? '' : 'opacity-50'
                }`}
              >
                <div>
                  <label className="block text-stone-400 mb-1">
                    Nama Pajak (PB1 / PPN)
                  </label>
                  <input
                    type="text"
                    value={businessSettings.taxName}
                    onChange={(e) =>
                      updateBusinessSettings({ taxName: e.target.value })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-100 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">
                    Tarif Pajak (%) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    disabled={!businessSettings.taxEnabled}
                    value={businessSettings.taxRate}
                    onChange={(e) =>
                      updateBusinessSettings({
                        taxRate: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 mb-1">
                  Info Wi-Fi di Struk Pelanggan
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={receiptSettings.wifiSsid}
                    onChange={(e) =>
                      updateReceiptSettings({ wifiSsid: e.target.value })
                    }
                    placeholder="Nama Wi-Fi"
                    className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100"
                  />
                  <input
                    type="text"
                    value={receiptSettings.wifiPassword}
                    onChange={(e) =>
                      updateReceiptSettings({ wifiPassword: e.target.value })
                    }
                    placeholder="Password Wi-Fi"
                    className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl font-bold bg-stone-800 text-stone-300"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-[2] py-3 rounded-xl font-extrabold bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center gap-2"
                >
                  <span>Lanjut ke Koneksi Printer</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-brand-400 font-bold">
                <Printer className="w-4 h-4" />
                <span>Langkah 3 dari 4 • Koneksi Printer Thermal</span>
              </div>
              <h2 className="text-base font-extrabold text-stone-100">
                Hubungkan printer thermal 58mm / 80mm (Boleh dilewati dulu)
              </h2>
              <p className="text-stone-400">
                Belum memegang printer fisik saat ini? Lewati dulu — struk tetap
                bisa dilihat, diuji, dan diunduh sebagai PDF.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await pairHardwarePrinter('usb');
                    updatePrinterConfig({
                      connection: 'usb',
                      isConnected: true,
                      deviceName: res.deviceName,
                    });
                    showToast(res.message, { variant: 'info' });
                  }}
                  className="p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-brand-500 text-left space-y-1"
                >
                  <p className="font-bold text-stone-100">
                    Hubungkan Printer USB / Bluetooth
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Cetak langsung ESC/POS tanpa dialog
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-stone-700 text-left space-y-1"
                >
                  <p className="font-bold text-brand-400">
                    Lewati Dulu (Gunakan Simulasi)
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Langsung menuju struk pertama Anda
                  </p>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl font-bold bg-stone-800 text-stone-300"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex-[2] py-3 rounded-xl font-extrabold bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center gap-2"
                >
                  <span>Lanjut ke Transaksi Pertama (First Win)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Langkah 4 dari 4 • First Win: Struk Pertama Anda!</span>
              </div>
              <h2 className="text-base font-extrabold text-stone-100">
                {businessSettings.businessName} kini punya sistem POS & struk
                sendiri!
              </h2>
              <p className="text-stone-400">
                Lihat pratinjau struk di sebelah kanan. Ini adalah tampilan
                struk yang akan diterima pelanggan Anda setiap kali transaksi
                selesai.
              </p>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Semua siap digunakan:</span>
                </p>
                <ul className="text-[11px] text-stone-300 list-disc list-inside space-y-1 pt-1">
                  <li>
                    Identitas: <strong>{businessSettings.businessName}</strong>
                  </li>
                  <li>
                    Pajak wajib: <strong>{businessSettings.taxName}</strong> (
                    {businessSettings.taxRate}%)
                  </li>
                  <li>
                    Database: <strong>Tersinkronisasi langsung dengan Supabase Cloud</strong>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleFinishFirstWin}
                className="w-full py-3.5 rounded-xl font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mulai Gunakan Kasir MyPOS Sekarang</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Live First-Win Receipt Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <ThermalReceiptPreview
            order={sampleOrder}
            isPracticeMode={true}
            animateFeed={true}
          />
        </div>
      </div>
    </main>
  );
}
