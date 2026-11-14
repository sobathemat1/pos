import {
  PlanCode,
  PlanDefinition,
  PlanLimits,
  ProFeatureKey,
} from '@/types/pos';

export const PLANS: Record<PlanCode, PlanDefinition> = {
  basic: {
    code: 'basic',
    name: 'Basic Plan',
    tagline: 'Untuk kedai kopi baru yang butuh operasional kasir, cetak thermal, & pajak rapi.',
    priceMonthly: 99000,
    priceYearly: 990000, // Hemat 2 bulan
    limits: {
      max_users: 3,
      max_products: 50,
      max_active_discounts: 1,
      history_days: 90,
    },
    features: {
      custom_receipt_templates: false, // Hanya template Minimal di Basic
      receipt_qr_code: false,
      receipt_custom_prefix: false,
      product_variants: false,
      csv_import_export: false,
      hold_and_split_bill: false,
      advanced_reports: false,
      digital_receipt_share: false,
      kitchen_ticket_printer: false,
    },
  },
  pro: {
    code: 'pro',
    name: 'Pro Plan',
    tagline: 'Untuk cafe berkembang dengan kustomisasi struk penuh, analitik mendalam, & skala besar.',
    priceMonthly: 249000,
    priceYearly: 2490000, // Hemat 2 bulan
    limits: {
      max_users: 15,
      max_products: 999999,
      max_active_discounts: 999,
      history_days: 9999,
    },
    features: {
      custom_receipt_templates: true,
      receipt_qr_code: true,
      receipt_custom_prefix: true,
      product_variants: true,
      csv_import_export: true,
      hold_and_split_bill: true,
      advanced_reports: true,
      digital_receipt_share: true,
      kitchen_ticket_printer: true,
    },
  },
};

export const PRO_FEATURE_LABELS: Record<
  ProFeatureKey,
  { title: string; description: string }
> = {
  custom_receipt_templates: {
    title: 'Template Struk Klasik & Modern',
    description:
      'Gunakan semua koleksi template struk (Minimal, Klasik, Modern) untuk menyesuaikan gaya brand cafe Anda.',
  },
  receipt_qr_code: {
    title: 'QR Code & Tautan Sosial di Struk',
    description:
      'Cetak QR Code otomatis di bawah struk untuk mengarahkan pelanggan ke Instagram, Google Review, atau menu digital.',
  },
  receipt_custom_prefix: {
    title: 'Prefix Nomor Invoice Kustom',
    description:
      'Atur kode awalan nomor struk sesuai brand cafe Anda (misal: SENJA-20261106-001).',
  },
  product_variants: {
    title: 'Varian & Modifier Produk',
    description:
      'Tambahkan pilihan ukuran (Regular/Large), level gula, atau ekstra shot espresso pada menu.',
  },
  csv_import_export: {
    title: 'Impor & Ekspor Data CSV',
    description:
      'Impor katalog menu sekaligus via CSV dan ekspor laporan keuangan/tutup buku untuk akuntansi.',
  },
  hold_and_split_bill: {
    title: 'Simpan Pesanan (Hold Order)',
    description:
      'Tahan sementara pesanan pelanggan di kasir dan lanjutkan kembali kapan saja.',
  },
  advanced_reports: {
    title: 'Analitik Produk Terlaris & Tren Waktu',
    description:
      'Pantau performa menu terlaris, kecepatan penyiapan barista, dan analisis margin harian.',
  },
  digital_receipt_share: {
    title: 'Struk Digital Publik & Kirim WhatsApp',
    description:
      'Bagikan tautan struk digital atau kirim langsung ke WhatsApp pelanggan tanpa kertas.',
  },
  kitchen_ticket_printer: {
    title: 'Cetak Tiket Dapur / Bar Terpisah',
    description:
      'Cetak tiket pesanan khusus barista (tanpa nominal harga) secara otomatis setelah pembayaran lunas.',
  },
};

export function canUseFeature(
  planCode: PlanCode,
  feature: ProFeatureKey
): boolean {
  return Boolean(PLANS[planCode]?.features[feature]);
}

export function checkPlanLimit(
  planCode: PlanCode,
  limitKey: keyof PlanLimits,
  currentCount: number
): { allowed: boolean; max: number; message?: string } {
  const plan = PLANS[planCode] ?? PLANS.basic;
  const max = plan.limits[limitKey];
  if (currentCount >= max) {
    const labelMap: Record<keyof PlanLimits, string> = {
      max_users: 'akun staf aktif',
      max_products: 'produk menu',
      max_active_discounts: 'promo diskon aktif',
      history_days: 'hari riwayat transaksi',
    };
    return {
      allowed: false,
      max,
      message: `Paket ${plan.name} mencakup maksimal ${max} ${labelMap[limitKey]}. Upgrade ke Pro untuk membuka batas.`,
    };
  }
  return { allowed: true, max };
}
