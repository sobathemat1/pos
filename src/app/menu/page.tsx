'use client';

import React, { useMemo, useState } from 'react';
import { usePos } from '@/context/PosContext';
import { formatIDR } from '@/lib/pricing';
import { PLANS } from '@/lib/plans';
import { Product } from '@/types/pos';
import {
  ArrowDownUp,
  Download,
  Edit3,
  FolderPlus,
  Lock,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

export default function MenuAndStockPage() {
  const {
    categories,
    products,
    stockMovements,
    activeStaff,
    subscription,
    upsertProduct,
    deleteProduct,
    adjustProductStock,
    addCategory,
    deleteCategory,
    canFeature,
    openUpgradeModal,
    showToast,
  } = usePos();

  const isAdmin = activeStaff.role === 'admin';

  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Product Form Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState(categories[0]?.id || '');
  const [prodPrice, setProdPrice] = useState(25000);
  const [prodEmoji, setProdEmoji] = useState('☕');
  const [prodDesc, setProdDesc] = useState('');
  const [prodTrackStock, setProdTrackStock] = useState(true);
  const [prodStock, setProdStock] = useState(20);
  const [prodMinStock, setProdMinStock] = useState(5);

  // Stock Adjustment Modal
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState<number>(10);
  const [stockReason, setStockReason] = useState<string>('Restock bahan harian');

  // New Category Input
  const [newCategoryName, setNewCategoryName] = useState('');

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = selectedCat === 'all' || p.categoryId === selectedCat;
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [products, selectedCat, search]);

  const openNewProductModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCategory(categories[0]?.id || '');
    setProdPrice(25000);
    setProdEmoji('☕');
    setProdDesc('');
    setProdTrackStock(true);
    setProdStock(20);
    setProdMinStock(5);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdCategory(prod.categoryId);
    setProdPrice(prod.price);
    setProdEmoji(prod.emoji);
    setProdDesc(prod.description);
    setProdTrackStock(prod.trackStock);
    setProdStock(prod.stock);
    setProdMinStock(prod.minStock);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const res = upsertProduct({
      id: editingProduct?.id,
      name: prodName,
      categoryId: prodCategory || categories[0]?.id || 'cat-coffee',
      price: Number(prodPrice),
      emoji: prodEmoji || '☕',
      description: prodDesc,
      trackStock: prodTrackStock,
      stock: Number(prodStock),
      minStock: Number(prodMinStock),
      isActive: true,
      variants: editingProduct?.variants,
    });
    if (!res.ok) {
      showToast(res.error || 'Gagal menyimpan produk', { variant: 'error' });
      return;
    }
    setIsProductModalOpen(false);
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockTarget) return;
    const res = adjustProductStock(
      stockTarget.id,
      Number(stockDelta),
      stockReason
    );
    if (!res.ok) {
      showToast(res.error || 'Gagal menyesuaikan stok', { variant: 'error' });
      return;
    }
    setStockTarget(null);
  };

  const handleExportCsv = () => {
    if (!canFeature('csv_import_export')) {
      openUpgradeModal('csv_import_export');
      return;
    }
    const header = 'ID,Nama,Kategori,Harga,Stok,MinimumStok\n';
    const rows = products
      .map((p) => {
        const cat =
          categories.find((c) => c.id === p.categoryId)?.name || 'Umum';
        return `"${p.id}","${p.name}","${cat}",${p.price},${p.stock},${p.minStock}`;
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mypos-katalog-menu-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Katalog menu berhasil diekspor ke CSV');
  };

  const maxProdLimit = PLANS[subscription.planCode].limits.max_products;

  return (
    <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div>
          <h1 className="text-lg font-extrabold text-stone-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-400" />
            <span>Manajemen Menu</span>
          </h1>
          <p className="text-xs text-stone-400">
            Kuota produk aktif:{' '}
            <strong className="text-stone-200">{products.length}</strong> /{' '}
            {maxProdLimit > 9000 ? 'Tanpa Batas (Pro)' : `${maxProdLimit} (Basic)`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-200 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-brand-400" />
            <span>Ekspor CSV</span>
            {!canFeature('csv_import_export') && (
              <Lock className="w-3 h-3 text-amber-400" />
            )}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={openNewProductModal}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5 shadow-md shadow-brand-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Manager & Search */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-8 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCat('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
              selectedCat === 'all'
                ? 'bg-brand-600 text-white'
                : 'bg-stone-900 text-stone-400 border border-stone-800'
            }`}
          >
            Semua ({products.length})
          </button>
          {categories.map((cat) => (
            <div key={cat.id} className="inline-flex items-center">
              <button
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                  selectedCat === cat.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-stone-900 text-stone-400 border border-stone-800'
                }`}
              >
                {cat.name}
              </button>
              {isAdmin && categories.length > 1 && (
                <button
                  type="button"
                  title="Hapus kategori"
                  onClick={() => {
                    const res = deleteCategory(cat.id);
                    if (!res.ok && res.error) {
                      showToast(res.error, { variant: 'warning' });
                    }
                  }}
                  className="text-stone-600 hover:text-red-400 px-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="lg:col-span-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-brand-500"
            />
          </div>
          {isAdmin && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = addCategory(newCategoryName);
                if (!res.ok && res.error) {
                  showToast(res.error, { variant: 'warning' });
                } else {
                  setNewCategoryName('');
                }
              }}
              className="flex items-center gap-1"
            >
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="+ Kategori"
                className="w-28 bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
                title="Tambah Kategori"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Products Table & Stock Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950/90 text-stone-400 border-b border-stone-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Produk Menu</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3">Harga Jual</th>
                  <th className="py-3 px-3">Stok Saat Ini</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/70">
                {filteredProducts.map((prod) => {
                  const cat = categories.find((c) => c.id === prod.categoryId);
                  const isOut = prod.trackStock && prod.stock <= 0;
                  const isLow =
                    prod.trackStock &&
                    prod.stock > 0 &&
                    prod.stock <= prod.minStock;

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-stone-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{prod.emoji}</span>
                          <div>
                            <p className="font-bold text-stone-100">
                              {prod.name}
                            </p>
                            <p className="text-[11px] text-stone-500 line-clamp-1">
                              {prod.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-stone-300">
                        {cat?.name || '-'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-brand-400">
                        {formatIDR(prod.price)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                            !prod.trackStock
                              ? 'bg-stone-800 text-stone-300'
                              : isOut
                                ? 'bg-red-500/20 text-red-400'
                                : isLow
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/15 text-emerald-400'
                          }`}
                        >
                          {!prod.trackStock
                            ? 'Unlimited'
                            : isOut
                              ? 'Habis (0)'
                              : `${prod.stock} porsi`}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            {prod.trackStock && (
                              <button
                                type="button"
                                onClick={() => {
                                  setStockTarget(prod);
                                  setStockDelta(10);
                                  setStockReason('Restock bahan harian');
                                }}
                                title="Sesuaikan Stok (+ / -)"
                                className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold flex items-center gap-1 text-[11px]"
                              >
                                <ArrowDownUp className="w-3 h-3 text-brand-400" />
                                <span>Stok</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditProductModal(prod)}
                              title="Edit Produk"
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteProduct(prod.id)}
                              title="Hapus Produk"
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-red-500/20 text-stone-400 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Stock Movements Audit Log */}
        <div className="lg:col-span-4 bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 text-xs">
          <h2 className="font-extrabold text-stone-100 text-sm flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-brand-400" />
            <span>Riwayat Pergerakan Stok</span>
          </h2>
          <p className="text-[11px] text-stone-400">
            Mencatat setiap pemotongan otomatis saat order lunas, pengembalian
            void, dan restock manual.
          </p>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {stockMovements.slice(0, 25).map((sm) => (
              <div
                key={sm.id}
                className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-bold text-stone-200 truncate">
                    {sm.productName}
                  </p>
                  <p className="text-[10.5px] text-stone-400 truncate">
                    {sm.reason}
                  </p>
                  <p className="text-[10px] text-stone-500">
                    Oleh: {sm.actorName}
                  </p>
                </div>
                <div className="text-right shrink-0 font-mono">
                  <span
                    className={`font-extrabold text-xs ${
                      sm.delta > 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {sm.delta > 0 ? `+${sm.delta}` : sm.delta}
                  </span>
                  <p className="text-[10px] text-stone-500">
                    Sisa: {sm.stockAfter}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= PRODUCT MODAL ================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl p-5 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-extrabold text-stone-100 text-sm">
                {editingProduct ? 'Edit Produk Menu' : 'Tambah Produk Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-stone-400 mb-1">Ikon</label>
                <input
                  type="text"
                  value={prodEmoji}
                  onChange={(e) => setProdEmoji(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-center text-lg"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-stone-400 mb-1">
                  Nama Produk Menu *
                </label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Mis: Kopi Susu Gula Aren"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-400 mb-1">Kategori</label>
                <select
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-stone-400 mb-1">
                  Harga Jual (Rp) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={prodPrice}
                  onChange={(e) => setProdPrice(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-400 mb-1">
                Deskripsi Singkat
              </label>
              <input
                type="text"
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                placeholder="Komposisi atau rasa minuman..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-stone-400 mb-1">Stok Awal</label>
                <input
                  type="number"
                  min={0}
                  value={prodStock}
                  onChange={(e) => setProdStock(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-stone-400 mb-1">
                  Ambang Stok Menipis
                </label>
                <input
                  type="number"
                  min={0}
                  value={prodMinStock}
                  onChange={(e) => setProdMinStock(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl font-bold bg-stone-800 text-stone-300"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="flex-[2] py-2.5 rounded-xl font-extrabold bg-brand-600 hover:bg-brand-500 text-white"
              >
                Simpan Produk
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= STOCK ADJUSTMENT MODAL ================= */}
      {stockTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAdjustStock}
            className="bg-stone-900 border border-stone-800 w-full max-w-sm rounded-2xl p-5 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="font-extrabold text-stone-100 text-sm">
                  Penyesuaian Stok Manual
                </h3>
                <p className="text-[11px] text-stone-400">
                  {stockTarget.name} (Stok saat ini: {stockTarget.stock})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStockTarget(null)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-stone-400 mb-1">
                Perubahan Jumlah (+ Restock / - Koreksi)
              </label>
              <input
                type="number"
                value={stockDelta}
                onChange={(e) => setStockDelta(Number(e.target.value))}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-stone-400 mb-1">
                Alasan Penyesuaian (Wajib untuk Audit)
              </label>
              <input
                type="text"
                required
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="Mis: Restock dapur pagi / Bahan tumpah"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStockTarget(null)}
                className="flex-1 py-2.5 rounded-xl font-bold bg-stone-800 text-stone-300"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="flex-[2] py-2.5 rounded-xl font-extrabold bg-brand-600 hover:bg-brand-500 text-white"
              >
                Simpan Perubahan Stok
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
