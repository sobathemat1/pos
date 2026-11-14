# MyPOS — Universal Multi-Tenant SaaS POS untuk Cafe

Aplikasi Point of Sales (POS) full-stack menggunakan **Next.js (App Router + TypeScript)** dan **Supabase (Postgres + RLS + Atomic RPC)** yang dikembangkan berdasarkan acuan:
- [docs/PRD.md](file:///mnt/MazedevUbuntu/projects/pos/docs/PRD.md) (PRD v0.4 berbasis Proposal SiMoca)
- [docs/UX.md](file:///mnt/MazedevUbuntu/projects/pos/docs/UX.md) (Perencanaan Alur & Fondasi UX)
- [docs/prototype.html](file:///mnt/MazedevUbuntu/projects/pos/docs/prototype.html) (Prototipe Interaktif)

---

## Fitur Utama yang Diimplementasikan

1. **Alur Kasir Pay-First (`/pos`)**:
   - Konsumen memesan di kasir $\rightarrow$ kasir memilih menu (beserta varian & catatan item) $\rightarrow$ sistem menghitung subtotal, diskon promo, **DPP**, dan **Pajak Wajib (PPN/PB1)** secara otomatis $\rightarrow$ konsumen membayar (Tunai dengan nominal cepat / QRIS / Transfer) $\rightarrow$ struk dicetak $\rightarrow$ pesanan otomatis masuk ke antrean penyiapan.
   - Mendukung fitur **Hold Order** (tahan & lanjutkan pesanan).

2. **Antrean Penyiapan Barista & Cek Stok Real-Time (`/prep`)**:
   - Pesanan yang sudah lunas langsung tampil secara *real-time* (sinkronisasi instan antar-tab via `BroadcastChannel` & Supabase).
   - Transisi 1-tap: `Baru Masuk` $\rightarrow$ `Diproses` $\rightarrow$ `Siap Diantar` $\rightarrow$ `Selesai`.
   - Tab **Cek Stok Real-Time** untuk pelayan/barista tanpa perlu mengecek ke dapur.

3. **Kustomisasi Identitas Bisnis & Editor Template Struk (`/settings`)**:
   - **Identitas Bisnis**: Nama cafe, ikon/logo, tagline, alamat, telepon, Instagram, NPWP.
   - **Editor Struk dengan Live Thermal Preview**:
     - 3 gaya template struk (`Minimal`, `Klasik`, `Modern Badge`).
     - Pilihan lebar kertas printer thermal **58 mm** dan **80 mm**.
     - Toggle tampil/sembunyikan untuk setiap elemen (logo, tagline, alamat, kasir, meja, Wi-Fi, QR Code).
     - Kustomisasi SSID & Password Wi-Fi, teks header, catatan kaki (footer), dan prefix nomor invoice.
     - **Immutable Receipt Snapshot**: setiap transaksi menyimpan snapshot identitas & pengaturan struk pada saat dibayar sehingga struk lama tidak pernah berubah.

4. **Cetak Langsung Printer Thermal ESC/POS (`src/lib/thermal-printer.ts`)**:
   - Byte-stream encoder ESC/POS (58mm 32 kolom / 80mm 48 kolom) lengkap dengan perintah *Cash Drawer Kick Pulse* (`0x1B 0x70`) dan *Auto-Cut* (`GS V`).
   - Koneksi langsung **WebUSB / Web Serial / Web Bluetooth** (Chrome/Edge) serta *fallback* cetak browser `@media print` / PDF.

5. **Manajemen Menu, Kategori & Stok (`/menu`) + Diskon (`/discounts`)**:
   - CRUD produk & kategori, indikator stok menipis & habis, penyesuaian stok manual dengan alasan wajib, dan log riwayat pergerakan stok (`stock_movements`).

6. **Riwayat Transaksi, Cetak Ulang & Void Berotorisasi (`/orders` & `/r/[id]`)**:
   - Lihat dan cetak ulang struk (`*** SALINAN CETAK ULANG ***`), buka tautan struk digital publik (`/r/[id]`), serta **Void Transaksi** dengan PIN Admin (`1111`) yang mengembalikan stok secara atomik.

7. **Laporan Kas Harian & Rekonsiliasi Tutup Buku (`/reports`)**:
   - Rekapitulasi penjualan harian dengan pemisahan DPP dan Pajak Wajib, rincian per metode bayar, analitik produk terlaris, serta formulir **Tutup Shift / Tutup Buku** yang menghitung selisih kas fisik vs sistem dan mengunci laporan secara *immutable*.

8. **Pemilihan Paket SaaS Basic vs Pro (`/billing`) & Onboarding Wizard (`/onboarding`)**:
   - Perbandingan **Basic Plan (Rp 99.000/bln)** vs **Pro Plan (Rp 249.000/bln)** lengkap dengan *feature gating* dan batas kuota produk/staf/diskon.
   - Wizard Onboarding 4 langkah menuju *First Win* (melihat struk pertama berlogo cafe sendiri).

---

## Cara Menjalankan Proyek

```bash
# 1. Jalankan server development
npm run dev

# 2. Jalankan unit test (Vitest)
npm test

# 3. Build produksi
npm run build
```

Untuk menghubungkan ke database cloud Supabase, salin `.env.example` menjadi `.env.local` dan jalankan migrasi SQL di [supabase/migrations/20261106000001_initial_mypos_schema.sql](file:///mnt/MazedevUbuntu/projects/pos/supabase/migrations/20261106000001_initial_mypos_schema.sql).
