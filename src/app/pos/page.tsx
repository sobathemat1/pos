'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePos } from '@/context/PosContext';
import { formatIDR, validateDiscount } from '@/lib/pricing';
import { printOrderReceipt } from '@/lib/thermal-printer';
import { ThermalReceiptPreview } from '@/components/receipt/ThermalReceiptPreview';
import { OrderRecord, PaymentMethod, Product } from '@/types/pos';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Lock,
  MessageSquarePlus,
  PackageSearch,
  PauseCircle,
  PlayCircle,
  Printer,
  QrCode,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';

export default function PosCashierPage() {
  const {
    categories,
    products,
    discounts,
    cart,
    orderType,
    setOrderType,
    tableNo,
    setTableNo,
    customerName,
    setCustomerName,
    selectedDiscountId,
    setSelectedDiscountId,
    pricingBreakdown,
    nextQueueLabel,
    businessSettings,
    updateBusinessSettings,
    printerConfig,
    heldOrders,
    addToCart,
    updateCartQty,
    updateCartItemNotes,
    clearCart,
    holdCurrentOrder,
    resumeHeldOrder,
    deleteHeldOrder,
    processCheckout,
    canFeature,
    openUpgradeModal,
    showToast,
  } = usePos();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');

  // Variant selector modal state
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [variantNotes, setVariantNotes] = useState<string>('');

  // Payment Sheet Modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);

  // Completed Receipt Modal state
  const [lastCompletedOrder, setLastCompletedOrder] =
    useState<OrderRecord | null>(null);
  const [printStatusText, setPrintStatusText] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts: '/' for search, 'Escape' to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsPaymentOpen(false);
        setVariantProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.isActive) return false;
      const matchesCat =
        activeCategory === 'all' || p.categoryId === activeCategory;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  const activeDiscounts = useMemo(
    () => discounts.filter((d) => d.isActive),
    [discounts]
  );

  const cartTotalCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  // Handle clicking a product card
  const handleSelectProduct = (product: Product) => {
    if (product.trackStock && product.stock <= 0) return;

    // If product has variants and plan supports variants, allow choosing variant
    if (
      product.variants &&
      product.variants.length > 0 &&
      canFeature('product_variants')
    ) {
      setVariantProduct(product);
      setSelectedVariantId(product.variants[0].id);
      setVariantNotes('');
      return;
    }

    const added = addToCart(product);
    if (added) {
      showToast(`+1 ${product.name}`, { variant: 'success' });
    }
  };

  const handleConfirmVariantAdd = () => {
    if (!variantProduct) return;
    const variant = variantProduct.variants?.find(
      (v) => v.id === selectedVariantId
    );
    const added = addToCart(variantProduct, {
      variantLabel: variant?.name,
      variantDelta: variant?.priceDelta ?? 0,
      notes: variantNotes.trim(),
    });
    if (added) {
      showToast(
        `+1 ${variantProduct.name}${variant ? ` (${variant.name})` : ''}`,
        { variant: 'success' }
      );
      setVariantProduct(null);
    }
  };

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setPayMethod('cash');
    setCashReceived(pricingBreakdown.grandTotal);
    setIsPaymentOpen(true);
  };

  const cashChange = useMemo(() => {
    if (payMethod !== 'cash') return 0;
    return cashReceived - pricingBreakdown.grandTotal;
  }, [payMethod, cashReceived, pricingBreakdown.grandTotal]);

  const handleCompletePayment = async () => {
    const result = processCheckout({
      paymentMethod: payMethod,
      paymentReceived:
        payMethod === 'cash' ? cashReceived : pricingBreakdown.grandTotal,
    });

    if (!result.ok || !result.order) {
      showToast(result.error || 'Pembayaran gagal diproses', {
        variant: 'error',
      });
      return;
    }

    setIsPaymentOpen(false);
    setLastCompletedOrder(result.order);

    // Trigger direct thermal ESC/POS print if autoPrint is enabled
    if (result.order.receiptSnapshot.receipt.autoPrint) {
      const printRes = await printOrderReceipt(result.order, printerConfig);
      setPrintStatusText(printRes.message);
    } else {
      setPrintStatusText(
        'Cetak otomatis dimatikan. Tekan tombol cetak di bawah untuk mencetak struk.'
      );
    }

    showToast(
      `Pembayaran Lunas • Masuk Antrean #${result.order.queueNo}`,
      {
        description: `Pesanan diteruskan real-time ke layar Antrean Barista.`,
        variant: 'success',
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Mobile / Tablet Segmented View Switcher (Hidden on Desktop) */}
      <div className="lg:hidden bg-stone-900 border-b border-stone-800 p-2 flex items-center gap-2 sticky md:top-[5.25rem] z-20 no-print">
        <button
          type="button"
          onClick={() => setMobileTab('menu')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'menu'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-stone-950 text-stone-400 hover:text-stone-200'
          }`}
        >
          <Utensils className="w-3.5 h-3.5" />
          <span>Katalog Menu</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'cart'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-stone-950 text-stone-400 hover:text-stone-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Keranjang ({cartTotalCount})</span>
          {cartTotalCount > 0 && (
            <span className="font-mono text-[10px] bg-amber-500 text-stone-950 px-1.5 py-0.2 rounded-full font-black ml-1">
              {formatIDR(pricingBreakdown.grandTotal)}
            </span>
          )}
        </button>
      </div>

      <main className="flex-1 flex flex-col lg:flex-row lg:h-[calc(100vh-5.5rem)] min-h-[calc(100vh-5.5rem)] overflow-y-auto lg:overflow-hidden relative">
        {/* ================= LEFT COLUMN: MENU CATALOG ================= */}
        <section
          className={`flex-1 flex-col bg-stone-950 border-r border-stone-800 overflow-y-auto lg:overflow-hidden no-print ${
            mobileTab === 'menu' ? 'flex' : 'hidden lg:flex'
          }`}
        >
        {/* Search & Category Bar */}
        <div className="p-3 bg-stone-900/60 border-b border-stone-800 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kopi, manual brew, pastry... (Tekan /)"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-8 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Order Type Segmented Control */}
            <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
              <button
                type="button"
                onClick={() => setOrderType('dine_in')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  orderType === 'dine_in'
                    ? 'bg-brand-600 text-white'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Utensils className="w-3 h-3" />
                <span>Dine-In</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('takeaway')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  orderType === 'takeaway'
                    ? 'bg-brand-600 text-white'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <ShoppingBag className="w-3 h-3" />
                <span>Takeaway</span>
              </button>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-stone-800/90 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Semua Menu ({products.filter((p) => p.isActive).length})
            </button>
            {categories.map((cat) => {
              const count = products.filter(
                (p) => p.isActive && p.categoryId === cat.id
              ).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeCategory === cat.id
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-stone-800/90 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Held Orders Bar (if any) */}
          {heldOrders.length > 0 && (
            <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar">
              <span className="text-[11px] text-amber-400 font-semibold whitespace-nowrap flex items-center gap-1">
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Pesanan Ditahan ({heldOrders.length}):</span>
              </span>
              {heldOrders.map((h) => (
                <div
                  key={h.id}
                  className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1 text-[11px] text-amber-200 whitespace-nowrap"
                >
                  <button
                    type="button"
                    onClick={() => resumeHeldOrder(h.id)}
                    className="font-semibold hover:underline flex items-center gap-1"
                  >
                    <PlayCircle className="w-3 h-3 text-amber-400" />
                    <span>
                      {h.label} ({h.items.reduce((s, i) => s + i.qty, 0)} item)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteHeldOrder(h.id)}
                    className="text-stone-400 hover:text-red-400 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Grid */}
        <div className="flex-1 p-3 mb-20 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 content-start">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-stone-500 text-xs text-center">
              <PackageSearch className="w-10 h-10 mb-2 stroke-1 text-stone-600" />
              <p className="font-semibold text-stone-300">
                {products.length === 0
                  ? 'Belum ada produk menu di database cafe Anda'
                  : 'Menu tidak ditemukan'}
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5 max-w-xs">
                {products.length === 0
                  ? 'Tambahkan kategori dan produk menu cafe Anda terlebih dahulu di halaman Menu & Stok.'
                  : 'Coba kata kunci lain atau pilih kategori "Semua Menu"'}
              </p>
              {products.length === 0 && (
                <Link
                  href="/menu"
                  className="mt-3 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs transition-colors"
                >
                  + Tambah Produk di Menu & Stok
                </Link>
              )}
            </div>
          ) : (
            filteredProducts.map((item) => {
              const isOutOfStock = item.trackStock && item.stock <= 0;
              const isLowStock =
                item.trackStock && item.stock > 0 && item.stock <= item.minStock;
              const inCartQty = cart
                .filter((c) => c.productId === item.id)
                .reduce((s, c) => s + c.qty, 0);

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => handleSelectProduct(item)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all min-h-[118px] relative group ${
                    isOutOfStock
                      ? 'bg-stone-950/40 border-stone-800/50 opacity-45 cursor-not-allowed'
                      : inCartQty > 0
                        ? 'bg-stone-900 border-brand-500/80 shadow-md shadow-brand-500/5 active:scale-[0.98]'
                        : 'bg-stone-900/90 border-stone-800 hover:border-brand-500/50 hover:bg-stone-900 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 w-full mb-2">
                    <span className="text-2xl select-none">{item.emoji}</span>
                    <div className="flex items-center gap-1">
                      {inCartQty > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-brand-600 text-white font-mono text-[10px] font-bold">
                          {inCartQty}x
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                          isOutOfStock
                            ? 'bg-red-500/20 text-red-400 font-bold'
                            : isLowStock
                              ? 'bg-amber-500/20 text-amber-300 font-semibold'
                              : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {!item.trackStock
                          ? '∞'
                          : isOutOfStock
                            ? 'Habis'
                            : isLowStock
                              ? `Sisa ${item.stock}`
                              : `Stok ${item.stock}`}
                      </span>
                    </div>
                  </div>

                  <div className="w-full">
                    <h3 className="font-bold text-xs text-stone-100 line-clamp-1 group-hover:text-brand-300 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-mono text-xs font-extrabold text-brand-400">
                        {formatIDR(item.price)}
                      </span>
                      {item.variants && item.variants.length > 0 && (
                        <span className="text-[9.5px] text-stone-400 bg-stone-800/90 px-1.5 py-0.5 rounded">
                          +{item.variants.length} varian
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Floating Quick Cart Bar on Mobile when browsing Menu */}
        {cartTotalCount > 0 && (
          <div className="lg:hidden fixed bottom-14 left-0 right-0 p-3 bg-stone-900/95 backdrop-blur border-t border-stone-800 flex items-center justify-between gap-3 shadow-2xl z-20 animate-in slide-in-from-bottom-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-100 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-mono font-black flex items-center justify-center">
                  {cartTotalCount}
                </span>
                <span>Pesanan (#{nextQueueLabel})</span>
              </p>
              <p className="text-xs font-extrabold text-brand-400 font-mono mt-0.5">
                {formatIDR(pricingBreakdown.grandTotal)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className="py-2 px-3.5 rounded-xl text-xs font-extrabold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30 flex items-center gap-1.5 shrink-0"
            >
              <span>Lihat & Bayar</span>
              <CreditCard className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* ================= RIGHT COLUMN: CART & PAY-FIRST PANEL ================= */}
      <section
        className={`w-full lg:w-[400px] xl:w-[430px] bg-stone-900 flex-col h-auto lg:h-full border-t lg:border-t-0 border-stone-800 shadow-2xl no-print ${
          mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Order Header */}
        <div className="p-3 bg-stone-900 border-b border-stone-800 space-y-2">
          {/* Mobile Back to Menu button */}
          <div className="lg:hidden flex items-center justify-between pb-1">
            <button
              type="button"
              onClick={() => setMobileTab('menu')}
              className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              ← Kembali Pilih Menu
            </button>
            <span className="text-[11px] text-stone-400">
              {cartTotalCount} item dipilih
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-stone-100">
                Pesanan Aktif
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
                #{nextQueueLabel}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => holdCurrentOrder()}
                disabled={cart.length === 0}
                title="Tahan Pesanan (Hold Order)"
                className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 flex items-center gap-1 transition-colors"
              >
                <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Hold</span>
                {!canFeature('hold_and_split_bill') && (
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                )}
              </button>
              <button
                type="button"
                onClick={clearCart}
                disabled={cart.length === 0}
                title="Kosongkan Keranjang"
                className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 disabled:opacity-40 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table & Customer Inputs */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {orderType === 'dine_in' ? (
              <input
                type="text"
                value={tableNo}
                onChange={(e) => setTableNo(e.target.value)}
                placeholder="Nomor Meja (mis: Meja 04)"
                className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 font-medium focus:outline-none focus:border-brand-500"
              />
            ) : (
              <div className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Bungkus / Takeaway</span>
              </div>
            )}
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nama Pelanggan"
              className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 font-medium focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
              <ShoppingBag className="w-10 h-10 mb-2 stroke-1 text-stone-600" />
              <p className="text-xs font-semibold text-stone-400">
                Belum ada pesanan
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Pilih menu di sebelah kiri untuk memulai transaksi Pay-First.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.cartItemId}
                className="bg-stone-950 border border-stone-800 rounded-xl p-2.5 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span>{item.emoji}</span>
                      <h4 className="font-bold text-stone-100 truncate">
                        {item.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
                      <span>{formatIDR(item.unitPrice)}</span>
                      {item.variantLabel && (
                        <span className="text-[10px] font-sans bg-stone-800 text-stone-300 px-1.5 py-0.2 rounded">
                          {item.variantLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Qty Stepper */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.cartItemId, -1)}
                      className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center font-bold font-mono transition-colors"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold font-mono text-stone-100">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.cartItemId, 1)}
                      className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center font-bold font-mono transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right min-w-[78px]">
                    <span className="font-mono font-bold text-stone-100">
                      {formatIDR(item.unitPrice * item.qty)}
                    </span>
                  </div>
                </div>

                {/* Item Note Row */}
                {editingNoteId === item.cartItemId || item.notes ? (
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) =>
                        updateCartItemNotes(item.cartItemId, e.target.value)
                      }
                      onBlur={() => setEditingNoteId(null)}
                      placeholder="Catatan khusus (mis: less sugar, es sedikit)..."
                      className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 text-[11px] text-amber-300 placeholder-stone-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingNoteId(item.cartItemId)}
                    className="text-[10.5px] text-stone-500 hover:text-stone-300 flex items-center gap-1"
                  >
                    <MessageSquarePlus className="w-3 h-3" />
                    <span>Tambah catatan item</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Order Totals & Mandatory Tax Panel */}
        <div className="p-3.5 bg-stone-950 border-t border-stone-800 space-y-2 text-xs">
          {/* Promo Discount Selector */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <span className="text-stone-400 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-brand-400" />
              <span>Promo Diskon</span>
            </span>
            <select
              aria-label="Pilih Promo Diskon"
              value={selectedDiscountId || ''}
              onChange={(e) => setSelectedDiscountId(e.target.value || null)}
              className="bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 text-[11px] text-stone-200 focus:outline-none focus:border-brand-500 max-w-[210px]"
            >
              <option value="">Tanpa Diskon</option>
              {activeDiscounts.map((d) => {
                const check = validateDiscount(d, pricingBreakdown.subtotal);
                return (
                  <option key={d.id} value={d.id}>
                    {d.name} (
                    {d.type === 'percent' ? `${d.value}%` : formatIDR(d.value)})
                    {!check.valid ? ` — Min ${formatIDR(d.minPurchase)}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex justify-between text-stone-400">
            <span>Subtotal</span>
            <span className="font-mono text-stone-200">
              {formatIDR(pricingBreakdown.subtotal)}
            </span>
          </div>

          {pricingBreakdown.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Potongan Diskon</span>
              <span className="font-mono font-semibold">
                - {formatIDR(pricingBreakdown.discountAmount)}
              </span>
            </div>
          )}

          {businessSettings.taxEnabled && (
            <div className="flex justify-between text-stone-500 text-[11px]">
              <span>DPP (Dasar Pengenaan Pajak)</span>
              <span className="font-mono">
                {formatIDR(pricingBreakdown.dppAmount)}
              </span>
            </div>
          )}

          {pricingBreakdown.serviceAmount > 0 && (
            <div className="flex justify-between text-stone-400">
              <span>Service Charge ({businessSettings.serviceRate}%)</span>
              <span className="font-mono text-stone-200">
                {formatIDR(pricingBreakdown.serviceAmount)}
              </span>
            </div>
          )}

          {/* Configurable PPN / Tax Row with Inline Toggle */}
          <div className="flex items-center justify-between text-stone-300">
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={businessSettings.taxEnabled}
                onClick={() =>
                  updateBusinessSettings({
                    taxEnabled: !businessSettings.taxEnabled,
                  })
                }
                title="Klik untuk mengaktifkan atau menonaktifkan PPN"
                className={`w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center ${
                  businessSettings.taxEnabled
                    ? 'bg-brand-600 justify-end'
                    : 'bg-stone-700 justify-start'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
              </button>
              <span className="flex items-center gap-1.5">
                <span
                  className={
                    businessSettings.taxEnabled
                      ? 'text-stone-200 font-medium'
                      : 'text-stone-500 line-through'
                  }
                >
                  {businessSettings.taxName} ({businessSettings.taxRate}%)
                </span>
                <span
                  className={`text-[9.5px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                    businessSettings.taxEnabled
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-stone-800 text-stone-400 border-stone-700'
                  }`}
                >
                  {businessSettings.taxEnabled
                    ? businessSettings.taxInclusive
                      ? 'Inklusif'
                      : 'Aktif'
                    : 'Nonaktif'}
                </span>
              </span>
            </div>
            <span
              className={`font-mono font-semibold ${
                businessSettings.taxEnabled
                  ? 'text-stone-200'
                  : 'text-stone-500'
              }`}
            >
              {formatIDR(pricingBreakdown.taxAmount)}
            </span>
          </div>

          <div className="border-t border-stone-800 pt-2 flex justify-between items-baseline">
            <span className="text-sm font-extrabold text-stone-100">
              Total Tagihan
            </span>
            <span className="text-xl font-black text-brand-400 font-mono">
              {formatIDR(pricingBreakdown.grandTotal)}
            </span>
          </div>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleOpenPayment}
            className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:pointer-events-none text-white shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <CreditCard className="w-4 h-4" />
            <span>
              {cart.length === 0
                ? 'Pilih Menu untuk Memulai'
                : `Bayar ${formatIDR(pricingBreakdown.grandTotal)}`}
            </span>
          </button>
        </div>
      </section>

      {/* ================= VARIANT PICKER MODAL (PRO) ================= */}
      {variantProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{variantProduct.emoji}</span>
                <div>
                  <h3 className="font-bold text-stone-100 text-sm">
                    {variantProduct.name}
                  </h3>
                  <p className="text-xs text-stone-400 font-mono">
                    Harga Dasar: {formatIDR(variantProduct.price)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVariantProduct(null)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-stone-400 font-semibold">
                Pilih Varian / Penyajian:
              </label>
              <div className="space-y-1.5">
                {variantProduct.variants?.map((v) => (
                  <label
                    key={v.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      selectedVariantId === v.id
                        ? 'bg-brand-500/15 border-brand-500 text-stone-100'
                        : 'bg-stone-950 border-stone-800 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="variant"
                        checked={selectedVariantId === v.id}
                        onChange={() => setSelectedVariantId(v.id)}
                        className="text-brand-600 focus:ring-0"
                      />
                      <span className="font-semibold">{v.name}</span>
                    </div>
                    <span className="font-mono text-brand-300">
                      {v.priceDelta > 0
                        ? `+${formatIDR(v.priceDelta)}`
                        : 'Gratis'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-stone-400 mb-1 font-medium">
                Catatan Khusus (Opsional)
              </label>
              <input
                type="text"
                value={variantNotes}
                onChange={(e) => setVariantNotes(e.target.value)}
                placeholder="Mis: less sugar, extra hot..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setVariantProduct(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-800 text-stone-300"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleConfirmVariantAdd}
                className="flex-[2] py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white"
              >
                Tambah ke Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PAYMENT SHEET MODAL (S05) ================= */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="font-extrabold text-stone-100 text-base">
                  Konfirmasi Pembayaran (Pay-First)
                </h3>
                <p className="text-xs text-stone-400">
                  Antrean{' '}
                  <span className="font-mono text-brand-400 font-bold">
                    #{nextQueueLabel}
                  </span>{' '}
                  • {orderType === 'dine_in' ? tableNo : 'Takeaway'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="text-stone-400 hover:text-stone-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grand Total Banner */}
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-3.5 text-center">
              <span className="text-xs text-stone-400 font-medium">
                {businessSettings.taxEnabled
                  ? `Total Tagihan (Termasuk ${businessSettings.taxName} ${businessSettings.taxRate}%)`
                  : `Total Tagihan (${businessSettings.taxName} Nonaktif)`}
              </span>
              <div className="text-2xl font-black text-brand-400 font-mono mt-0.5">
                {formatIDR(pricingBreakdown.grandTotal)}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPayMethod('cash')}
                className={`p-2.5 rounded-xl border font-bold flex flex-col items-center gap-1 transition-all ${
                  payMethod === 'cash'
                    ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                    : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Tunai (Cash)</span>
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('qris')}
                className={`p-2.5 rounded-xl border font-bold flex flex-col items-center gap-1 transition-all ${
                  payMethod === 'qris'
                    ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                    : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QRIS Manual</span>
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('transfer')}
                className={`p-2.5 rounded-xl border font-bold flex flex-col items-center gap-1 transition-all ${
                  payMethod === 'transfer'
                    ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                    : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Transfer / EDC</span>
              </button>
            </div>

            {/* Cash Input & Fast Denominations */}
            {payMethod === 'cash' ? (
              <div className="space-y-2.5">
                <label className="block text-xs text-stone-400 font-medium">
                  Nominal Uang Diterima (Rp)
                </label>
                <input
                  type="number"
                  value={cashReceived || ''}
                  onChange={(e) =>
                    setCashReceived(Math.max(0, Number(e.target.value)))
                  }
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-2.5 text-stone-100 font-mono text-base font-bold focus:outline-none focus:border-brand-500"
                />

                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCashReceived(pricingBreakdown.grandTotal)}
                    className="py-1.5 px-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[11px] font-bold font-mono"
                  >
                    Uang Pas
                  </button>
                  {[50000, 100000, 200000].map((nom) => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => setCashReceived(nom)}
                      className="py-1.5 px-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[11px] font-bold font-mono"
                    >
                      {nom.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-stone-400 font-medium">Kembalian:</span>
                  <span
                    className={`text-base font-extrabold font-mono ${
                      cashChange < 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {cashChange < 0
                      ? `Kurang ${formatIDR(Math.abs(cashChange))}`
                      : formatIDR(cashChange)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl text-center space-y-2">
                <QrCode className="w-16 h-16 mx-auto text-brand-400 stroke-[1.5]" />
                <p className="text-xs font-semibold text-stone-200">
                  Pastikan pelanggan telah menyelesaikan pembayaran{' '}
                  {payMethod.toUpperCase()} sebesar{' '}
                  <span className="font-mono text-brand-300">
                    {formatIDR(pricingBreakdown.grandTotal)}
                  </span>
                </p>
                <p className="text-[11px] text-stone-500">
                  Klik tombol di bawah setelah pembayaran terverifikasi oleh
                  kasir.
                </p>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-300"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={payMethod === 'cash' && cashChange < 0}
                onClick={handleCompletePayment}
                className="flex-[2] py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Terima Uang & Cetak Struk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= COMPLETED ORDER & THERMAL RECEIPT MODAL ================= */}
      {lastCompletedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 no-print">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-extrabold text-stone-100 text-sm">
                    Transaksi Lunas • Antrean #{lastCompletedOrder.queueNo}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Pesanan otomatis masuk ke layar Antrean Barista
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLastCompletedOrder(null)}
                className="text-stone-400 hover:text-stone-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {printStatusText && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-2 rounded-xl text-[11px] font-mono flex items-center gap-2 no-print">
                <Printer className="w-4 h-4 shrink-0" />
                <span>{printStatusText}</span>
              </div>
            )}

            {/* Thermal Receipt Output */}
            <div className="max-h-[58vh] overflow-y-auto py-3">
              <ThermalReceiptPreview
                order={lastCompletedOrder}
                animateFeed={true}
              />
            </div>

            {/* Post-Payment Actions */}
            <div className="space-y-2 pt-2 border-t border-stone-800 no-print">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await printOrderReceipt(
                      lastCompletedOrder,
                      printerConfig
                    );
                    setPrintStatusText(res.message);
                    showToast('Struk dikirim ulang ke printer thermal');
                  }}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-100 flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-brand-400" />
                  <span>Cetak Ulang Thermal</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-100 flex items-center justify-center gap-1.5"
                >
                  <span>Cetak Browser / PDF</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {canFeature('digital_receipt_share') ? (
                  <Link
                    href={`/r/${lastCompletedOrder.id}`}
                    target="_blank"
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-stone-950 border border-stone-800 hover:border-stone-700 text-stone-300 flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-brand-400" />
                    <span>Buka Tautan Struk Digital</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => openUpgradeModal('digital_receipt_share')}
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-stone-950 border border-stone-800 text-stone-400 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Struk Digital (Fitur Pro)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setLastCompletedOrder(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold bg-brand-600 hover:bg-brand-500 text-white"
                >
                  Pesanan Baru
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  </div>
  );
}
