'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AuditLog,
  BusinessSettings,
  CartItem,
  Category,
  DailyClosing,
  Discount,
  HeldOrder,
  OrderPricingBreakdown,
  OrderRecord,
  OrderType,
  PaymentMethod,
  PlanCode,
  PrinterConfig,
  Product,
  ProFeatureKey,
  ReceiptSettings,
  SaaSInvoice,
  StaffProfile,
  StockMovement,
  SubscriptionState,
  UserRole,
} from '@/types/pos';
import {
  DEFAULT_AUDIT_LOGS,
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_CATEGORIES,
  DEFAULT_DAILY_CLOSINGS,
  DEFAULT_DISCOUNTS,
  DEFAULT_INVOICES,
  DEFAULT_ORDERS,
  DEFAULT_PRINTER_CONFIG,
  DEFAULT_PRODUCTS,
  DEFAULT_RECEIPT_SETTINGS,
  DEFAULT_STAFF,
  DEFAULT_STOCK_MOVEMENTS,
  DEFAULT_SUBSCRIPTION,
} from '@/lib/seed-data';
import { calculateOrderTotals, validateDiscount } from '@/lib/pricing';
import { canUseFeature, checkPlanLimit, PLANS } from '@/lib/plans';

const LEGACY_STORAGE_KEY = 'mypos_state_v1';
const THEME_KEY = 'mypos_theme_v1';
const SYNC_CHANNEL = 'mypos_realtime_channel';

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const FALLBACK_OWNER_STAFF: StaffProfile = {
  id: '00000000-0000-0000-0000-000000000000',
  fullName: 'Admin Cafe',
  username: 'admin',
  email: '',
  role: 'admin',
  pin: '1111',
  isActive: true,
  createdAt: new Date().toISOString(),
};

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'warning' | 'error' | 'info';
}

interface PersistedState {
  businessSettings: BusinessSettings;
  receiptSettings: ReceiptSettings;
  printerConfig: PrinterConfig;
  categories: Category[];
  products: Product[];
  discounts: Discount[];
  staffList: StaffProfile[];
  orders: OrderRecord[];
  heldOrders: HeldOrder[];
  stockMovements: StockMovement[];
  dailyClosings: DailyClosing[];
  auditLogs: AuditLog[];
  subscription: SubscriptionState;
  invoices: SaaSInvoice[];
  queueCounter: number;
  onboardingCompleted: boolean;
}

interface PosContextValue extends PersistedState {
  isHydrated: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  supabaseConnected: boolean;
  isSyncingSupabase: boolean;
  authRole: UserRole;
  activeStaff: StaffProfile;
  switchStaffWithAuth: (
    username: string,
    password: string,
    targetStaffId?: string
  ) => Promise<{ ok: boolean; error?: string }>;

  // Cart & Active POS state
  cart: CartItem[];
  orderType: OrderType;
  setOrderType: (t: OrderType) => void;
  tableNo: string;
  setTableNo: (val: string) => void;
  customerName: string;
  setCustomerName: (val: string) => void;
  selectedDiscountId: string | null;
  setSelectedDiscountId: (id: string | null) => void;
  selectedDiscount: Discount | null;
  pricingBreakdown: OrderPricingBreakdown;
  nextQueueLabel: string;

  // Cart Actions
  addToCart: (
    product: Product,
    options?: { variantLabel?: string; variantDelta?: number; notes?: string }
  ) => boolean;
  updateCartQty: (cartItemId: string, delta: number) => void;
  updateCartItemNotes: (cartItemId: string, notes: string) => void;
  clearCart: () => void;
  holdCurrentOrder: (label?: string) => boolean;
  resumeHeldOrder: (heldId: string) => void;
  deleteHeldOrder: (heldId: string) => void;

  // Checkout & Order Actions
  processCheckout: (params: {
    paymentMethod: PaymentMethod;
    paymentReceived: number;
    isPracticeMode?: boolean;
  }) => { ok: boolean; order?: OrderRecord; error?: string };
  advancePrepStatus: (orderId: string) => void;
  voidOrder: (
    orderId: string,
    reason: string,
    adminPin: string
  ) => { ok: boolean; error?: string };

  // Menu & Stock Actions
  upsertProduct: (
    product: Omit<Product, 'id'> & { id?: string }
  ) => { ok: boolean; error?: string };
  deleteProduct: (id: string) => void;
  adjustProductStock: (
    productId: string,
    delta: number,
    reason: string
  ) => { ok: boolean; error?: string };
  addCategory: (name: string) => { ok: boolean; error?: string };
  deleteCategory: (id: string) => { ok: boolean; error?: string };

  // Discount Actions
  upsertDiscount: (
    discount: Omit<Discount, 'id'> & { id?: string }
  ) => { ok: boolean; error?: string };
  toggleDiscountActive: (id: string) => { ok: boolean; error?: string };
  deleteDiscount: (id: string) => void;

  // Settings & Receipt Customization
  updateBusinessSettings: (
    patch: Partial<BusinessSettings>
  ) => { ok: boolean; error?: string };
  updateReceiptSettings: (
    patch: Partial<ReceiptSettings>
  ) => { ok: boolean; error?: string };
  resetReceiptToDefault: () => void;
  updatePrinterConfig: (patch: Partial<PrinterConfig>) => void;

  // Staff & RBAC
  addStaff: (
    staff: Omit<StaffProfile, 'id' | 'createdAt'>
  ) => Promise<{ ok: boolean; error?: string }>;
  toggleStaffActive: (id: string) => { ok: boolean; error?: string };
  updateStaffPassword: (
    staffId: string,
    password: string,
    pin?: string,
    username?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteStaff: (staffId: string) => Promise<{ ok: boolean; error?: string }>;

  // Daily Closing (Tutup Buku)
  createDailyClosing: (params: {
    actualCash: number;
    shiftLabel: string;
    notes: string;
  }) => { ok: boolean; closing?: DailyClosing; error?: string };

  // SaaS Plan & Feature Gating
  canFeature: (feature: ProFeatureKey) => boolean;
  switchSubscriptionPlan: (
    planCode: PlanCode,
    billingCycle: 'monthly' | 'yearly'
  ) => void;
  upgradePromptFeature: ProFeatureKey | null;
  openUpgradeModal: (feature?: ProFeatureKey) => void;
  closeUpgradeModal: () => void;

  // Onboarding & Database Refresh
  completeOnboarding: () => void;
  resetDemoData: () => void;
  refreshFromDatabase: () => Promise<void>;

  // Toast
  toast: ToastMessage | null;
  showToast: (
    title: string,
    options?: {
      description?: string;
      variant?: ToastMessage['variant'];
    }
  ) => void;
  dismissToast: () => void;
}

const DEFAULT_PERSISTED_STATE: PersistedState = {
  businessSettings: DEFAULT_BUSINESS_SETTINGS,
  receiptSettings: DEFAULT_RECEIPT_SETTINGS,
  printerConfig: DEFAULT_PRINTER_CONFIG,
  categories: DEFAULT_CATEGORIES,
  products: DEFAULT_PRODUCTS,
  discounts: DEFAULT_DISCOUNTS,
  staffList: DEFAULT_STAFF,
  orders: DEFAULT_ORDERS,
  heldOrders: [],
  stockMovements: DEFAULT_STOCK_MOVEMENTS,
  dailyClosings: DEFAULT_DAILY_CLOSINGS,
  auditLogs: DEFAULT_AUDIT_LOGS,
  subscription: DEFAULT_SUBSCRIPTION,
  invoices: DEFAULT_INVOICES,
  queueCounter: 1,
  onboardingCompleted: true,
};

const PosContext = createContext<PosContextValue | null>(null);

export function PosProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(DEFAULT_PERSISTED_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState<boolean>(false);
  const [tenantId, setTenantId] = useState<string>('');
  const [authRole, setAuthRole] = useState<UserRole>('admin');
  const [activeStaffId, setActiveStaffId] = useState<string>('');

  // Active POS Cart (Initializes completely empty - no dummy items)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [tableNo, setTableNo] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [selectedDiscountId, setSelectedDiscountId] = useState<string | null>(
    null
  );

  // UI Modals & Toast
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [upgradePromptFeature, setUpgradePromptFeature] =
    useState<ProFeatureKey | null>(null);

  const showToast = useCallback(
    (
      title: string,
      options?: { description?: string; variant?: ToastMessage['variant'] }
    ) => {
      const id = `toast-${Date.now()}`;
      setToast({
        id,
        title,
        description: options?.description,
        variant: options?.variant ?? 'success',
      });
    },
    []
  );

  const dismissToast = useCallback(() => setToast(null), []);

  // Theme initialization & toggle
  useEffect(() => {
    try {
      // Purge any legacy localStorage state so old dummy data never resurfaces
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      window.localStorage.removeItem('mypos_tenant_id');

      const savedTheme = window.localStorage.getItem(THEME_KEY) as
        | 'dark'
        | 'light'
        | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
        document.documentElement.classList.toggle(
          'light',
          savedTheme === 'light'
        );
        document.documentElement.classList.toggle(
          'dark',
          savedTheme === 'dark'
        );
      } else {
        document.documentElement.classList.add('dark');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(THEME_KEY, next);
        } catch {
          // ignore
        }
        document.documentElement.classList.toggle('light', next === 'light');
        document.documentElement.classList.toggle('dark', next === 'dark');
      }
      return next;
    });
  }, []);

  // Push helper to Supabase API route
  const pushToSupabase = useCallback(
    async (payload: Record<string, unknown>): Promise<any> => {
      try {
        setIsSyncingSupabase(true);
        const res = await fetch('/api/supabase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok) {
          setSupabaseConnected(true);
        }
        return json;
      } catch {
        return null;
      } finally {
        setIsSyncingSupabase(false);
      }
    },
    []
  );

  // Pull all entities for the signed-in tenant from Supabase database
  const refreshFromDatabase = useCallback(async () => {
    try {
      setIsSyncingSupabase(true);
      const res = await fetch('/api/supabase-sync', { cache: 'no-store' });
      const data = await res.json();
      if (!data || !data.connected) {
        setIsHydrated(true);
        return;
      }
      setSupabaseConnected(true);
      const resolvedTenantId = String(data.tenantId || '');
      if (resolvedTenantId) setTenantId(resolvedTenantId);
      const resolvedAuthRole: UserRole =
        data.authRole || data.profile?.role || 'admin';
      setAuthRole(resolvedAuthRole);

      const dbStaffList: StaffProfile[] =
        Array.isArray(data.staffList) && data.staffList.length > 0
          ? data.staffList
          : data.profile
            ? [
                {
                  id: data.profile.id,
                  fullName: data.profile.fullName,
                  username:
                    data.adminUsername ||
                    (data.profile.email
                      ? data.profile.email.split('@')[0]
                      : 'admin'),
                  email: data.profile.email,
                  role:
                    data.profile.role === 'superadmin'
                      ? 'admin'
                      : data.profile.role,
                  pin: '1111',
                  isActive: true,
                  createdAt: new Date().toISOString(),
                },
              ]
            : [FALLBACK_OWNER_STAFF];

      setState((prev) => ({
        ...prev,
        businessSettings: data.businessSettings
          ? { ...DEFAULT_BUSINESS_SETTINGS, ...data.businessSettings }
          : prev.businessSettings,
        receiptSettings: data.receiptSettings
          ? { ...DEFAULT_RECEIPT_SETTINGS, ...data.receiptSettings }
          : prev.receiptSettings,
        printerConfig: data.printerConfig
          ? { ...DEFAULT_PRINTER_CONFIG, ...data.printerConfig }
          : prev.printerConfig,
        subscription: data.subscription
          ? { ...DEFAULT_SUBSCRIPTION, ...data.subscription }
          : data.planCode
            ? { ...DEFAULT_SUBSCRIPTION, planCode: data.planCode }
            : prev.subscription,
        staffList: dbStaffList,
        categories: Array.isArray(data.categories) ? data.categories : [],
        products: Array.isArray(data.products) ? data.products : [],
        discounts: Array.isArray(data.discounts) ? data.discounts : [],
        orders: Array.isArray(data.orders) ? data.orders : [],
        stockMovements: Array.isArray(data.stockMovements)
          ? data.stockMovements
          : [],
        dailyClosings: Array.isArray(data.dailyClosings)
          ? data.dailyClosings
          : [],
        auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs : [],
        invoices: Array.isArray(data.invoices) ? data.invoices : [],
        queueCounter:
          typeof data.queueCounter === 'number'
            ? data.queueCounter
            : (Array.isArray(data.orders) ? data.orders.length : 0) + 1,
        onboardingCompleted:
          typeof data.onboardingCompleted === 'boolean'
            ? data.onboardingCompleted
            : true,
      }));

      setActiveStaffId((prevId) => {
        if (typeof window !== 'undefined' && resolvedTenantId) {
          const savedId = window.sessionStorage.getItem(
            `mypos_active_staff_${resolvedTenantId}`
          );
          if (
            savedId &&
            dbStaffList.some((s) => s.id === savedId && s.isActive)
          ) {
            return savedId;
          }
        }
        if (
          data.profile?.id &&
          dbStaffList.some((s) => s.id === data.profile.id)
        ) {
          return data.profile.id;
        }
        if (prevId && dbStaffList.some((s) => s.id === prevId)) return prevId;
        return dbStaffList[0]?.id || FALLBACK_OWNER_STAFF.id;
      });
    } catch {
      // Network error
    } finally {
      setIsSyncingSupabase(false);
      setIsHydrated(true);
    }
  }, []);

  // Auto-hide toast after 3.8s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fetch live database state on mount & setup BroadcastChannel for multi-tab sync
  useEffect(() => {
    void refreshFromDatabase();

    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel(SYNC_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_SYNC') {
          setState(event.data.payload);
        }
      };
    }

    return () => {
      if (channel) channel.close();
    };
  }, [refreshFromDatabase]);

  // Helper to update in-memory state + broadcast across open tabs
  const commitState = useCallback(
    (updater: (prev: PersistedState) => PersistedState) => {
      setState((prev) => {
        const next = updater(prev);
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          try {
            const bc = new BroadcastChannel(SYNC_CHANNEL);
            bc.postMessage({ type: 'STATE_SYNC', payload: next });
            bc.close();
          } catch {
            // ignore
          }
        }
        return next;
      });
    },
    []
  );

  const activeStaff = useMemo(() => {
    return (
      state.staffList.find((s) => s.id === activeStaffId) ||
      state.staffList[0] ||
      FALLBACK_OWNER_STAFF
    );
  }, [state.staffList, activeStaffId]);

  const switchStaffWithAuth = useCallback(
    async (
      username: string,
      password: string,
      targetStaffId?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!username.trim() || !password) {
        return { ok: false, error: 'Username dan kata sandi wajib diisi.' };
      }
      const res = await pushToSupabase({
        type: 'VERIFY_STAFF_SWITCH',
        username: username.trim().toLowerCase(),
        password,
        targetStaffId,
      });

      if (!res?.ok || !res?.staffId) {
        return {
          ok: false,
          error: res?.reason || 'Username atau kata sandi salah.',
        };
      }

      setActiveStaffId(res.staffId);
      if (typeof window !== 'undefined' && tenantId) {
        window.sessionStorage.setItem(
          `mypos_active_staff_${tenantId}`,
          res.staffId
        );
      }

      showToast(`Beralih ke akun ${res.fullName}`, {
        description: `Hak akses aktif: ${String(res.role || 'staff').toUpperCase()} (@${res.username || username})`,
        variant: 'success',
      });
      return { ok: true };
    },
    [pushToSupabase, tenantId, showToast]
  );

  const canFeature = useCallback(
    (feature: ProFeatureKey) => {
      return canUseFeature(state.subscription.planCode, feature);
    },
    [state.subscription.planCode]
  );

  const openUpgradeModal = useCallback((feature?: ProFeatureKey) => {
    setUpgradePromptFeature(feature ?? 'custom_receipt_templates');
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setUpgradePromptFeature(null);
  }, []);

  const selectedDiscount = useMemo(() => {
    if (!selectedDiscountId) return null;
    return (
      state.discounts.find(
        (d) => d.id === selectedDiscountId && d.isActive
      ) || null
    );
  }, [state.discounts, selectedDiscountId]);

  const pricingBreakdown = useMemo(() => {
    return calculateOrderTotals({
      items: cart,
      discount: selectedDiscount,
      taxEnabled: state.businessSettings.taxEnabled,
      taxRate: state.businessSettings.taxRate,
      serviceRate: state.businessSettings.serviceRate,
      taxInclusive: state.businessSettings.taxInclusive,
      roundingRule: state.businessSettings.roundingRule,
    });
  }, [cart, selectedDiscount, state.businessSettings]);

  const nextQueueLabel = useMemo(() => {
    return `A-${String(state.queueCounter).padStart(3, '0')}`;
  }, [state.queueCounter]);

  // --- Cart Operations ---
  const addToCart = useCallback(
    (
      product: Product,
      options?: { variantLabel?: string; variantDelta?: number; notes?: string }
    ): boolean => {
      const variantDelta = options?.variantDelta ?? 0;
      const variantLabel = options?.variantLabel ?? '';
      const unitPrice = Math.max(0, product.price + variantDelta);

      const currentInCart = cart
        .filter((c) => c.productId === product.id)
        .reduce((sum, c) => sum + c.qty, 0);

      if (product.trackStock && currentInCart + 1 > product.stock) {
        showToast(`Stok ${product.name} tidak mencukupi`, {
          description: `Sisa stok tersedia: ${product.stock}`,
          variant: 'warning',
        });
        return false;
      }

      setCart((prev) => {
        const existingIdx = prev.findIndex(
          (c) =>
            c.productId === product.id &&
            (c.variantLabel || '') === variantLabel &&
            (c.notes || '') === (options?.notes || '')
        );

        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            qty: updated[existingIdx].qty + 1,
          };
          return updated;
        }

        return [
          ...prev,
          {
            cartItemId: makeUuid(),
            productId: product.id,
            name: product.name,
            emoji: product.emoji,
            basePrice: product.price,
            variantLabel: variantLabel || undefined,
            variantDelta: variantDelta || undefined,
            unitPrice,
            qty: 1,
            notes: options?.notes ?? '',
          },
        ];
      });
      return true;
    },
    [cart, showToast]
  );

  const updateCartQty = useCallback(
    (cartItemId: string, delta: number) => {
      setCart((prev) => {
        const target = prev.find((c) => c.cartItemId === cartItemId);
        if (!target) return prev;

        if (delta > 0) {
          const product = state.products.find((p) => p.id === target.productId);
          const totalInCart = prev
            .filter((c) => c.productId === target.productId)
            .reduce((s, c) => s + c.qty, 0);
          if (
            product &&
            product.trackStock &&
            totalInCart + delta > product.stock
          ) {
            showToast(`Batas stok ${product.name} tercapai (${product.stock})`, {
              variant: 'warning',
            });
            return prev;
          }
        }

        return prev
          .map((c) =>
            c.cartItemId === cartItemId ? { ...c, qty: c.qty + delta } : c
          )
          .filter((c) => c.qty > 0);
      });
    },
    [state.products, showToast]
  );

  const updateCartItemNotes = useCallback(
    (cartItemId: string, notes: string) => {
      setCart((prev) =>
        prev.map((c) => (c.cartItemId === cartItemId ? { ...c, notes } : c))
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedDiscountId(null);
  }, []);

  const holdCurrentOrder = useCallback(
    (label?: string): boolean => {
      if (!canFeature('hold_and_split_bill')) {
        openUpgradeModal('hold_and_split_bill');
        return false;
      }
      if (cart.length === 0) return false;

      const held: HeldOrder = {
        id: makeUuid(),
        label: label || tableNo || customerName || 'Pesanan Ditahan',
        tableNo,
        customerName,
        orderType,
        items: cart,
        discountId: selectedDiscountId || undefined,
        savedAt: new Date().toISOString(),
      };

      commitState((prev) => ({
        ...prev,
        heldOrders: [held, ...prev.heldOrders],
      }));
      clearCart();
      showToast('Pesanan disimpan sementara (Hold)', {
        description: `Dapat dilanjutkan kapan saja dari daftar Hold.`,
        variant: 'info',
      });
      return true;
    },
    [
      canFeature,
      openUpgradeModal,
      cart,
      tableNo,
      customerName,
      orderType,
      selectedDiscountId,
      commitState,
      clearCart,
      showToast,
    ]
  );

  const resumeHeldOrder = useCallback(
    (heldId: string) => {
      const target = state.heldOrders.find((h) => h.id === heldId);
      if (!target) return;
      setCart(target.items);
      setTableNo(target.tableNo);
      setCustomerName(target.customerName);
      setOrderType(target.orderType);
      setSelectedDiscountId(target.discountId || null);

      commitState((prev) => ({
        ...prev,
        heldOrders: prev.heldOrders.filter((h) => h.id !== heldId),
      }));
      showToast(`Melanjutkan pesanan "${target.label}"`, { variant: 'info' });
    },
    [state.heldOrders, commitState, showToast]
  );

  const deleteHeldOrder = useCallback(
    (heldId: string) => {
      commitState((prev) => ({
        ...prev,
        heldOrders: prev.heldOrders.filter((h) => h.id !== heldId),
      }));
    },
    [commitState]
  );

  // --- Atomic Pay-First Checkout ---
  const processCheckout = useCallback(
    (params: {
      paymentMethod: PaymentMethod;
      paymentReceived: number;
      isPracticeMode?: boolean;
    }): { ok: boolean; order?: OrderRecord; error?: string } => {
      if (cart.length === 0) {
        return { ok: false, error: 'Keranjang pesanan masih kosong.' };
      }

      if (selectedDiscount) {
        const discCheck = validateDiscount(
          selectedDiscount,
          pricingBreakdown.subtotal
        );
        if (!discCheck.valid) {
          return { ok: false, error: discCheck.reason };
        }
      }

      const { grandTotal } = pricingBreakdown;
      const received =
        params.paymentMethod === 'cash' ? params.paymentReceived : grandTotal;
      if (received < grandTotal) {
        return {
          ok: false,
          error: `Uang diterima kurang dari total tagihan.`,
        };
      }

      const qtyByProduct: Record<string, number> = {};
      for (const item of cart) {
        qtyByProduct[item.productId] =
          (qtyByProduct[item.productId] || 0) + item.qty;
      }

      for (const [productId, neededQty] of Object.entries(qtyByProduct)) {
        const prod = state.products.find((p) => p.id === productId);
        if (!prod) {
          return { ok: false, error: 'Produk tidak ditemukan di katalog.' };
        }
        if (prod.trackStock && prod.stock < neededQty) {
          return {
            ok: false,
            error: `Stok "${prod.name}" hanya tersisa ${prod.stock}, tidak cukup untuk ${neededQty}.`,
          };
        }
      }

      const now = new Date();
      const dateCode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}${String(now.getDate()).padStart(2, '0')}`;
      const prefix = state.receiptSettings.numberPrefix || 'INV';
      const seqStr = String(state.queueCounter).padStart(4, '0');
      const orderNo = params.isPracticeMode
        ? `CONTOH-${dateCode}-${seqStr}`
        : `${prefix}-${dateCode}-${seqStr}`;
      const queueNo = `A-${String(state.queueCounter).padStart(3, '0')}`;

      const newOrder: OrderRecord = {
        id: makeUuid(),
        orderNo,
        queueNo,
        status: 'paid',
        orderType,
        tableNo: orderType === 'dine_in' ? tableNo || 'Meja Umum' : 'Takeaway',
        customerName: customerName || 'Pelanggan',
        items: cart.map((c) => ({
          id: makeUuid(),
          productId: c.productId,
          name: c.name,
          unitPrice: c.unitPrice,
          qty: c.qty,
          notes: c.notes,
          variantLabel: c.variantLabel,
        })),
        subtotal: pricingBreakdown.subtotal,
        discountTotal: pricingBreakdown.discountAmount,
        dppTotal: pricingBreakdown.dppAmount,
        taxTotal: pricingBreakdown.taxAmount,
        serviceTotal: pricingBreakdown.serviceAmount,
        grandTotal: pricingBreakdown.grandTotal,
        discountId: selectedDiscount?.id,
        discountName: selectedDiscount?.name,
        paymentMethod: params.paymentMethod,
        paymentReceived: received,
        paymentChange: Math.max(0, received - grandTotal),
        cashierName: activeStaff.fullName,
        prepStatus: 'new',
        createdAt: now.toISOString(),
        paidAt: now.toISOString(),
        receiptSnapshot: {
          business: { ...state.businessSettings },
          receipt: { ...state.receiptSettings },
          capturedAt: now.toISOString(),
        },
      };

      if (params.isPracticeMode) {
        clearCart();
        return { ok: true, order: newOrder };
      }

      const newAudit: AuditLog = {
        id: makeUuid(),
        actorName: activeStaff.fullName,
        actorRole: activeStaff.role,
        action: 'PAY_ORDER',
        entity: 'orders',
        entityId: orderNo,
        details: `Order ${orderNo} (#${queueNo}) lunas via ${params.paymentMethod.toUpperCase()} sebesar Rp ${grandTotal.toLocaleString('id-ID')}.`,
        createdAt: now.toISOString(),
      };

      commitState((prev) => {
        const newMovements: StockMovement[] = [];
        const updatedProducts = prev.products.map((p) => {
          const deduct = qtyByProduct[p.id];
          if (!deduct || !p.trackStock) return p;
          const nextStock = Math.max(0, p.stock - deduct);
          newMovements.push({
            id: makeUuid(),
            productId: p.id,
            productName: p.name,
            delta: -deduct,
            stockAfter: nextStock,
            reason: `Penjualan ${orderNo}`,
            refOrderNo: orderNo,
            actorName: activeStaff.fullName,
            createdAt: now.toISOString(),
          });
          return { ...p, stock: nextStock };
        });

        return {
          ...prev,
          products: updatedProducts,
          orders: [newOrder, ...prev.orders],
          stockMovements: [...newMovements, ...prev.stockMovements],
          auditLogs: [newAudit, ...prev.auditLogs],
          queueCounter: prev.queueCounter + 1,
        };
      });

      void pushToSupabase({
        type: 'RECORD_ORDER',
        order: newOrder,
        auditLog: newAudit,
      });

      clearCart();
      return { ok: true, order: newOrder };
    },
    [
      cart,
      selectedDiscount,
      pricingBreakdown,
      state.products,
      state.receiptSettings,
      state.businessSettings,
      state.queueCounter,
      orderType,
      tableNo,
      customerName,
      activeStaff,
      commitState,
      clearCart,
      pushToSupabase,
    ]
  );

  // --- Barista / Waiter Queue Progression ---
  const advancePrepStatus = useCallback(
    (orderId: string) => {
      const nowIso = new Date().toISOString();
      const target = state.orders.find((o) => o.id === orderId);
      if (!target) return;

      let nextPrep: OrderRecord['prepStatus'] = target.prepStatus;
      let nextStatus: OrderRecord['status'] = target.status;
      const patchPayload: Record<string, unknown> = {
        type: 'ADVANCE_PREP',
        orderId,
      };

      if (target.prepStatus === 'new') {
        nextPrep = 'preparing';
        patchPayload.prepStatus = 'preparing';
        patchPayload.prepStartedAt = nowIso;
      } else if (target.prepStatus === 'preparing') {
        nextPrep = 'ready';
        patchPayload.prepStatus = 'ready';
        patchPayload.readyAt = nowIso;
      } else if (target.prepStatus === 'ready') {
        nextPrep = 'delivered';
        nextStatus = 'completed';
        patchPayload.prepStatus = 'delivered';
        patchPayload.status = 'completed';
        patchPayload.deliveredAt = nowIso;
      }

      commitState((prev) => ({
        ...prev,
        orders: prev.orders.map((ord) => {
          if (ord.id !== orderId) return ord;
          return {
            ...ord,
            prepStatus: nextPrep,
            status: nextStatus,
            ...(nextPrep === 'preparing' ? { prepStartedAt: nowIso } : {}),
            ...(nextPrep === 'ready' ? { readyAt: nowIso } : {}),
            ...(nextPrep === 'delivered' ? { deliveredAt: nowIso } : {}),
          };
        }),
      }));

      void pushToSupabase(patchPayload);
    },
    [state.orders, commitState, pushToSupabase]
  );

  // --- Void Transaction (Requires Admin Authorization, restores stock atomically) ---
  const voidOrder = useCallback(
    (
      orderId: string,
      reason: string,
      adminPin: string
    ): { ok: boolean; error?: string } => {
      if (!reason.trim()) {
        return { ok: false, error: 'Alasan void wajib diisi untuk audit.' };
      }

      const adminMatches = state.staffList.some(
        (s) => s.role === 'admin' && s.isActive && s.pin === adminPin.trim()
      );
      if (activeStaff.role !== 'admin' && !adminMatches) {
        return {
          ok: false,
          error: 'PIN Otorisasi Admin tidak sesuai (Default PIN Owner: 1111).',
        };
      }

      const targetOrder = state.orders.find((o) => o.id === orderId);
      if (!targetOrder) {
        return { ok: false, error: 'Transaksi tidak ditemukan.' };
      }
      if (targetOrder.status === 'voided') {
        return { ok: false, error: 'Transaksi ini sudah berstatus void.' };
      }

      const nowIso = new Date().toISOString();
      const audit: AuditLog = {
        id: makeUuid(),
        actorName: activeStaff.fullName,
        actorRole: activeStaff.role,
        action: 'VOID_ORDER',
        entity: 'orders',
        entityId: targetOrder.orderNo,
        details: `Void transaksi ${targetOrder.orderNo} (Rp ${targetOrder.grandTotal.toLocaleString('id-ID')}). Alasan: ${reason}. Stok dikembalikan otomatis.`,
        createdAt: nowIso,
      };

      commitState((prev) => {
        const restoreMap: Record<string, number> = {};
        for (const item of targetOrder.items) {
          restoreMap[item.productId] =
            (restoreMap[item.productId] || 0) + item.qty;
        }

        const returnMovements: StockMovement[] = [];
        const updatedProducts = prev.products.map((p) => {
          const restoreQty = restoreMap[p.id];
          if (!restoreQty || !p.trackStock) return p;
          const nextStock = p.stock + restoreQty;
          returnMovements.push({
            id: makeUuid(),
            productId: p.id,
            productName: p.name,
            delta: restoreQty,
            stockAfter: nextStock,
            reason: `Void ${targetOrder.orderNo}: ${reason}`,
            refOrderNo: targetOrder.orderNo,
            actorName: activeStaff.fullName,
            createdAt: nowIso,
          });
          return { ...p, stock: nextStock };
        });

        const updatedOrders = prev.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: 'voided' as const,
                prepStatus: 'delivered' as const,
                voidReason: reason,
              }
            : o
        );

        return {
          ...prev,
          products: updatedProducts,
          orders: updatedOrders,
          stockMovements: [...returnMovements, ...prev.stockMovements],
          auditLogs: [audit, ...prev.auditLogs],
        };
      });

      void pushToSupabase({
        type: 'VOID_ORDER',
        orderId,
        orderNo: targetOrder.orderNo,
        reason,
        actorName: activeStaff.fullName,
        auditLog: audit,
      });

      showToast(`Transaksi ${targetOrder.orderNo} telah di-void`, {
        description: 'Stok produk telah dikembalikan di database.',
        variant: 'warning',
      });
      return { ok: true };
    },
    [
      state.staffList,
      state.orders,
      activeStaff,
      commitState,
      showToast,
      pushToSupabase,
    ]
  );

  // --- Menu & Stock Management ---
  const upsertProduct = useCallback(
    (
      productInput: Omit<Product, 'id'> & { id?: string }
    ): { ok: boolean; error?: string } => {
      const isEdit = Boolean(productInput.id);
      if (!isEdit) {
        const limitCheck = checkPlanLimit(
          state.subscription.planCode,
          'max_products',
          state.products.length
        );
        if (!limitCheck.allowed) {
          openUpgradeModal();
          return { ok: false, error: limitCheck.message };
        }
      }

      if (!productInput.name.trim()) {
        return { ok: false, error: 'Nama produk wajib diisi.' };
      }
      if (productInput.price < 0) {
        return { ok: false, error: 'Harga produk tidak boleh negatif.' };
      }
      if (productInput.stock < 0) {
        return { ok: false, error: 'Stok produk tidak boleh negatif.' };
      }

      const nowIso = new Date().toISOString();
      const prodId = productInput.id || makeUuid();

      // Ensure a valid category exists if tenant hasn't created any category yet
      let targetCatId = productInput.categoryId;
      let autoCreatedCat: Category | null = null;
      if (
        !targetCatId ||
        !state.categories.some((c) => c.id === targetCatId)
      ) {
        if (state.categories.length > 0) {
          targetCatId = state.categories[0].id;
        } else {
          autoCreatedCat = {
            id: makeUuid(),
            slug: 'menu-utama',
            name: 'Menu Utama',
            sortOrder: 1,
          };
          targetCatId = autoCreatedCat.id;
        }
      }

      const savedProduct: Product = {
        ...productInput,
        id: prodId,
        categoryId: targetCatId,
      };

      const auditLog: AuditLog = {
        id: makeUuid(),
        actorName: activeStaff.fullName,
        actorRole: activeStaff.role,
        action: isEdit ? 'UPDATE_PRODUCT' : 'CREATE_PRODUCT',
        entity: 'products',
        entityId: savedProduct.name,
        details: isEdit
          ? `Memperbarui produk "${savedProduct.name}" (Rp ${savedProduct.price.toLocaleString('id-ID')}).`
          : `Menambahkan produk baru "${savedProduct.name}" dengan stok awal ${savedProduct.stock}.`,
        createdAt: nowIso,
      };

      commitState((prev) => ({
        ...prev,
        categories: autoCreatedCat
          ? [...prev.categories, autoCreatedCat]
          : prev.categories,
        products: isEdit
          ? prev.products.map((p) => (p.id === prodId ? savedProduct : p))
          : [savedProduct, ...prev.products],
        auditLogs: [auditLog, ...prev.auditLogs],
      }));

      void (async () => {
        if (autoCreatedCat) {
          await pushToSupabase({
            type: 'ADD_CATEGORY',
            category: autoCreatedCat,
          });
        }
        await pushToSupabase({
          type: 'UPSERT_PRODUCT',
          product: savedProduct,
          auditLog,
        });
      })();

      showToast(
        isEdit
          ? `Produk "${productInput.name}" diperbarui`
          : `Produk "${productInput.name}" ditambahkan ke database`
      );
      return { ok: true };
    },
    [
      state.subscription.planCode,
      state.products.length,
      state.categories,
      openUpgradeModal,
      commitState,
      activeStaff,
      showToast,
      pushToSupabase,
    ]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      const target = state.products.find((p) => p.id === id);
      commitState((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== id),
      }));
      void pushToSupabase({ type: 'DELETE_PRODUCT', id });
      if (target) {
        showToast(`Produk "${target.name}" dihapus dari database`, {
          variant: 'info',
        });
      }
    },
    [state.products, commitState, showToast, pushToSupabase]
  );

  const adjustProductStock = useCallback(
    (
      productId: string,
      delta: number,
      reason: string
    ): { ok: boolean; error?: string } => {
      if (delta === 0) {
        return { ok: false, error: 'Masukkan perubahan jumlah stok (+ atau -).' };
      }
      if (!reason.trim()) {
        return { ok: false, error: 'Alasan penyesuaian stok wajib diisi.' };
      }

      const target = state.products.find((p) => p.id === productId);
      if (!target) {
        return { ok: false, error: 'Produk tidak ditemukan.' };
      }

      const nextStock = target.stock + delta;
      if (nextStock < 0) {
        return {
          ok: false,
          error: `Stok tidak boleh minus (stok saat ini ${target.stock}).`,
        };
      }

      const nowIso = new Date().toISOString();
      const movementId = makeUuid();
      const auditLog: AuditLog = {
        id: makeUuid(),
        actorName: activeStaff.fullName,
        actorRole: activeStaff.role,
        action: 'ADJUST_STOCK',
        entity: 'products',
        entityId: target.name,
        details: `Penyesuaian stok "${target.name}" (${delta > 0 ? '+' : ''}${delta} → ${nextStock}). Alasan: ${reason}`,
        createdAt: nowIso,
      };

      commitState((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === productId ? { ...p, stock: nextStock } : p
        ),
        stockMovements: [
          {
            id: movementId,
            productId,
            productName: target.name,
            delta,
            stockAfter: nextStock,
            reason,
            actorName: activeStaff.fullName,
            createdAt: nowIso,
          },
          ...prev.stockMovements,
        ],
        auditLogs: [auditLog, ...prev.auditLogs],
      }));

      void pushToSupabase({
        type: 'ADJUST_STOCK',
        productId,
        movementId,
        delta,
        stockAfter: nextStock,
        reason,
        actorName: activeStaff.fullName,
        auditLog,
      });

      showToast(`Stok "${target.name}" diperbarui menjadi ${nextStock}`);
      return { ok: true };
    },
    [state.products, activeStaff, commitState, showToast, pushToSupabase]
  );

  const addCategory = useCallback(
    (name: string): { ok: boolean; error?: string } => {
      const clean = name.trim();
      if (!clean) return { ok: false, error: 'Nama kategori wajib diisi.' };
      const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (state.categories.some((c) => c.slug === slug)) {
        return { ok: false, error: 'Kategori tersebut sudah ada.' };
      }
      const newCategory: Category = {
        id: makeUuid(),
        slug,
        name: clean,
        sortOrder: state.categories.length + 1,
      };
      commitState((prev) => ({
        ...prev,
        categories: [...prev.categories, newCategory],
      }));
      void pushToSupabase({
        type: 'ADD_CATEGORY',
        category: newCategory,
      });
      showToast(`Kategori "${clean}" ditambahkan`);
      return { ok: true };
    },
    [state.categories, commitState, showToast, pushToSupabase]
  );

  const deleteCategory = useCallback(
    (id: string): { ok: boolean; error?: string } => {
      const usedCount = state.products.filter((p) => p.categoryId === id).length;
      if (usedCount > 0) {
        return {
          ok: false,
          error: `Kategori masih dipakai oleh ${usedCount} produk.`,
        };
      }
      commitState((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
      }));
      void pushToSupabase({ type: 'DELETE_CATEGORY', id });
      showToast('Kategori dihapus', { variant: 'info' });
      return { ok: true };
    },
    [state.products, commitState, showToast, pushToSupabase]
  );

  // --- Discounts Management ---
  const upsertDiscount = useCallback(
    (
      discountInput: Omit<Discount, 'id'> & { id?: string }
    ): { ok: boolean; error?: string } => {
      const isEdit = Boolean(discountInput.id);
      if (!isEdit && discountInput.isActive) {
        const activeCount = state.discounts.filter((d) => d.isActive).length;
        const limitCheck = checkPlanLimit(
          state.subscription.planCode,
          'max_active_discounts',
          activeCount
        );
        if (!limitCheck.allowed) {
          openUpgradeModal();
          return { ok: false, error: limitCheck.message };
        }
      }

      if (!discountInput.name.trim()) {
        return { ok: false, error: 'Nama promo diskon wajib diisi.' };
      }
      if (discountInput.value <= 0) {
        return { ok: false, error: 'Nilai diskon harus lebih dari 0.' };
      }
      if (discountInput.type === 'percent' && discountInput.value > 100) {
        return { ok: false, error: 'Diskon persentase maksimal 100%.' };
      }

      const savedDiscount: Discount = {
        ...discountInput,
        id: discountInput.id || makeUuid(),
      };

      commitState((prev) => ({
        ...prev,
        discounts: isEdit
          ? prev.discounts.map((d) =>
              d.id === savedDiscount.id ? savedDiscount : d
            )
          : [savedDiscount, ...prev.discounts],
      }));

      void pushToSupabase({
        type: 'UPSERT_DISCOUNT',
        discount: savedDiscount,
      });

      showToast(`Promo "${discountInput.name}" disimpan ke database`);
      return { ok: true };
    },
    [
      state.discounts,
      state.subscription.planCode,
      openUpgradeModal,
      commitState,
      showToast,
      pushToSupabase,
    ]
  );

  const toggleDiscountActive = useCallback(
    (id: string): { ok: boolean; error?: string } => {
      const target = state.discounts.find((d) => d.id === id);
      if (!target) return { ok: false, error: 'Diskon tidak ditemukan.' };

      const nextActive = !target.isActive;
      if (nextActive) {
        const activeCount = state.discounts.filter((d) => d.isActive).length;
        const limitCheck = checkPlanLimit(
          state.subscription.planCode,
          'max_active_discounts',
          activeCount
        );
        if (!limitCheck.allowed) {
          openUpgradeModal();
          return { ok: false, error: limitCheck.message };
        }
      }

      commitState((prev) => ({
        ...prev,
        discounts: prev.discounts.map((d) =>
          d.id === id ? { ...d, isActive: nextActive } : d
        ),
      }));

      void pushToSupabase({
        type: 'TOGGLE_DISCOUNT',
        id,
        isActive: nextActive,
      });

      return { ok: true };
    },
    [
      state.discounts,
      state.subscription.planCode,
      openUpgradeModal,
      commitState,
      pushToSupabase,
    ]
  );

  const deleteDiscount = useCallback(
    (id: string) => {
      commitState((prev) => ({
        ...prev,
        discounts: prev.discounts.filter((d) => d.id !== id),
      }));
      if (selectedDiscountId === id) setSelectedDiscountId(null);
      void pushToSupabase({ type: 'DELETE_DISCOUNT', id });
      showToast('Aturan diskon dihapus dari database', { variant: 'info' });
    },
    [commitState, selectedDiscountId, showToast, pushToSupabase]
  );

  // --- Business & Receipt Customization ---
  const updateBusinessSettings = useCallback(
    (patch: Partial<BusinessSettings>): { ok: boolean; error?: string } => {
      const nextTaxEnabled =
        patch.taxEnabled !== undefined
          ? patch.taxEnabled
          : state.businessSettings.taxEnabled;
      if (
        nextTaxEnabled &&
        patch.taxRate !== undefined &&
        patch.taxRate <= 0
      ) {
        return {
          ok: false,
          error:
            'Saat PPN aktif, tarif pajak harus lebih dari 0%. Matikan opsi PPN jika tidak mengenakan pajak.',
        };
      }
      const nowIso = new Date().toISOString();
      const mergedBusiness = { ...state.businessSettings, ...patch };
      const auditLog: AuditLog = {
        id: makeUuid(),
        actorName: activeStaff.fullName,
        actorRole: activeStaff.role,
        action: 'UPDATE_BUSINESS_IDENTITY',
        entity: 'business_settings',
        entityId: patch.businessName || state.businessSettings.businessName,
        details: `Memperbarui pengaturan bisnis / PPN (${
          mergedBusiness.taxEnabled
            ? `Aktif ${mergedBusiness.taxRate}%`
            : 'Nonaktif'
        }).`,
        createdAt: nowIso,
      };
      commitState((prev) => ({
        ...prev,
        businessSettings: mergedBusiness,
        auditLogs: [auditLog, ...prev.auditLogs],
      }));
      void pushToSupabase({
        type: 'SYNC_SETTINGS',
        businessSettings: mergedBusiness,
        auditLog,
      });
      return { ok: true };
    },
    [state.businessSettings, commitState, activeStaff, pushToSupabase]
  );

  const updateReceiptSettings = useCallback(
    (patch: Partial<ReceiptSettings>): { ok: boolean; error?: string } => {
      if (
        patch.template &&
        patch.template !== 'minimal' &&
        !canFeature('custom_receipt_templates')
      ) {
        openUpgradeModal('custom_receipt_templates');
        return {
          ok: false,
          error: 'Template Klasik & Modern adalah fitur Paket Pro.',
        };
      }
      if (patch.showQr && !canFeature('receipt_qr_code')) {
        openUpgradeModal('receipt_qr_code');
        return {
          ok: false,
          error: 'QR Code di struk adalah fitur Paket Pro.',
        };
      }
      const mergedReceipt = { ...state.receiptSettings, ...patch };
      commitState((prev) => ({
        ...prev,
        receiptSettings: mergedReceipt,
      }));
      void pushToSupabase({
        type: 'SYNC_SETTINGS',
        receiptSettings: mergedReceipt,
      });
      return { ok: true };
    },
    [
      state.receiptSettings,
      canFeature,
      openUpgradeModal,
      commitState,
      pushToSupabase,
    ]
  );

  const resetReceiptToDefault = useCallback(() => {
    commitState((prev) => ({
      ...prev,
      receiptSettings: DEFAULT_RECEIPT_SETTINGS,
    }));
    void pushToSupabase({
      type: 'SYNC_SETTINGS',
      receiptSettings: DEFAULT_RECEIPT_SETTINGS,
    });
    showToast('Pengaturan struk dikembalikan ke default');
  }, [commitState, showToast, pushToSupabase]);

  const updatePrinterConfig = useCallback(
    (patch: Partial<PrinterConfig>) => {
      const mergedPrinter = { ...state.printerConfig, ...patch };
      commitState((prev) => ({
        ...prev,
        printerConfig: mergedPrinter,
      }));
      void pushToSupabase({
        type: 'SYNC_SETTINGS',
        printerConfig: mergedPrinter,
      });
    },
    [state.printerConfig, commitState, pushToSupabase]
  );

  // --- Staff Management ---
  const addStaff = useCallback(
    async (
      staffInput: Omit<StaffProfile, 'id' | 'createdAt'>
    ): Promise<{ ok: boolean; error?: string }> => {
      const activeStaffCount = state.staffList.filter((s) => s.isActive).length;
      const limitCheck = checkPlanLimit(
        state.subscription.planCode,
        'max_users',
        activeStaffCount
      );
      if (!limitCheck.allowed) {
        openUpgradeModal();
        return { ok: false, error: limitCheck.message };
      }

      if (!staffInput.fullName.trim() || !staffInput.username.trim()) {
        return { ok: false, error: 'Nama lengkap dan username staf wajib diisi.' };
      }

      const tempId = makeUuid();
      const created: StaffProfile = {
        ...staffInput,
        username: staffInput.username.trim().toLowerCase(),
        role: 'staff',
        id: tempId,
        createdAt: new Date().toISOString(),
      };

      const res = await pushToSupabase({
        type: 'ADD_STAFF',
        staff: created,
        auditLog: {
          id: makeUuid(),
          action: 'create',
          entity: 'staff',
          actorName: activeStaff.fullName,
          details: `Mendaftarkan staf ${created.fullName} (staff) @${created.username}`,
          timestamp: new Date().toISOString(),
        },
      });

      if (!res?.ok) {
        const errorMsg =
          res?.reason || 'Gagal mendaftarkan akun staf ke database.';
        showToast(errorMsg, { variant: 'error' });
        return { ok: false, error: errorMsg };
      }

      const finalId = res.staffId || tempId;
      const finalStaff: StaffProfile = {
        ...created,
        id: finalId,
        password: '',
      };

      commitState((prev) => {
        const filtered = prev.staffList.filter(
          (s) =>
            s.id !== finalId &&
            s.username.toLowerCase() !== created.username.toLowerCase()
        );
        return {
          ...prev,
          staffList: [...filtered, finalStaff],
        };
      });

      showToast(`Staf "${created.fullName}" berhasil ditambahkan ke database`, {
        variant: 'success',
      });
      return { ok: true };
    },
    [
      state.staffList,
      state.subscription.planCode,
      openUpgradeModal,
      commitState,
      showToast,
      pushToSupabase,
      activeStaff.fullName,
    ]
  );

  const updateStaffPassword = useCallback(
    async (
      staffId: string,
      password: string,
      pin?: string,
      username?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      if (password && password.trim().length < 6) {
        return { ok: false, error: 'Kata sandi minimal 6 karakter.' };
      }

      const targetStaff = state.staffList.find((s) => s.id === staffId);
      const res = await pushToSupabase({
        type: 'UPDATE_STAFF_PASSWORD',
        staffId,
        password: password ? password.trim() : undefined,
        pin: pin?.trim(),
        username: username ? username.trim().toLowerCase() : undefined,
        auditLog: {
          id: makeUuid(),
          action: 'update',
          entity: 'staff',
          actorName: activeStaff.fullName,
          details: `Mengubah kredensial akun ${targetStaff?.fullName || staffId}`,
          timestamp: new Date().toISOString(),
        },
      });

      if (!res?.ok) {
        const errorMsg = res?.reason || 'Gagal mengubah kredensial akun.';
        showToast(errorMsg, { variant: 'error' });
        return { ok: false, error: errorMsg };
      }

      commitState((prev) => ({
        ...prev,
        staffList: prev.staffList.map((s) =>
          s.id === staffId
            ? {
                ...s,
                ...(pin ? { pin: pin.trim() } : {}),
                ...(username
                  ? { username: username.trim().toLowerCase() }
                  : {}),
              }
            : s
        ),
      }));

      showToast('Kredensial akun berhasil diperbarui', { variant: 'success' });
      return { ok: true };
    },
    [
      state.staffList,
      pushToSupabase,
      activeStaff.fullName,
      commitState,
      showToast,
    ]
  );

  const deleteStaff = useCallback(
    async (staffId: string): Promise<{ ok: boolean; error?: string }> => {
      const targetStaff = state.staffList.find((s) => s.id === staffId);
      if (!targetStaff) {
        return { ok: false, error: 'Staf tidak ditemukan.' };
      }
      if (
        targetStaff.role === 'admin' &&
        state.staffList.filter((s) => s.role === 'admin').length <= 1
      ) {
        return {
          ok: false,
          error: 'Tidak dapat menghapus satu-satunya akun admin.',
        };
      }

      const res = await pushToSupabase({
        type: 'DELETE_STAFF',
        id: staffId,
        auditLog: {
          id: makeUuid(),
          action: 'delete',
          entity: 'staff',
          actorName: activeStaff.fullName,
          details: `Menghapus akun staf ${targetStaff.fullName} (${targetStaff.email})`,
          timestamp: new Date().toISOString(),
        },
      });

      if (!res?.ok) {
        const errorMsg = res?.reason || 'Gagal menghapus staf dari database.';
        showToast(errorMsg, { variant: 'error' });
        return { ok: false, error: errorMsg };
      }

      commitState((prev) => ({
        ...prev,
        staffList: prev.staffList.filter((s) => s.id !== staffId),
      }));

      showToast(`Staf "${targetStaff.fullName}" berhasil dihapus`, {
        variant: 'info',
      });
      return { ok: true };
    },
    [
      state.staffList,
      pushToSupabase,
      activeStaff.fullName,
      commitState,
      showToast,
    ]
  );

  const toggleStaffActive = useCallback(
    (id: string): { ok: boolean; error?: string } => {
      const target = state.staffList.find((s) => s.id === id);
      if (!target) return { ok: false, error: 'Staf tidak ditemukan.' };

      const nextActive = !target.isActive;
      if (nextActive) {
        const activeCount = state.staffList.filter((s) => s.isActive).length;
        const limitCheck = checkPlanLimit(
          state.subscription.planCode,
          'max_users',
          activeCount
        );
        if (!limitCheck.allowed) {
          openUpgradeModal();
          return { ok: false, error: limitCheck.message };
        }
      }

      commitState((prev) => ({
        ...prev,
        staffList: prev.staffList.map((s) =>
          s.id === id ? { ...s, isActive: nextActive } : s
        ),
      }));

      void pushToSupabase({
        type: 'TOGGLE_STAFF',
        id,
        isActive: nextActive,
      });

      return { ok: true };
    },
    [
      state.staffList,
      state.subscription.planCode,
      openUpgradeModal,
      commitState,
      pushToSupabase,
    ]
  );

  // --- Daily Closing / Tutup Buku ---
  const createDailyClosing = useCallback(
    (params: {
      actualCash: number;
      shiftLabel: string;
      notes: string;
    }): { ok: boolean; closing?: DailyClosing; error?: string } => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const validOrders = state.orders.filter((o) => o.status !== 'voided');

      const grossSales = validOrders.reduce((s, o) => s + o.subtotal, 0);
      const totalDiscount = validOrders.reduce((s, o) => s + o.discountTotal, 0);
      const totalDpp = validOrders.reduce((s, o) => s + o.dppTotal, 0);
      const totalTax = validOrders.reduce((s, o) => s + o.taxTotal, 0);
      const totalService = validOrders.reduce((s, o) => s + o.serviceTotal, 0);
      const netRevenue = validOrders.reduce((s, o) => s + o.grandTotal, 0);

      const cashSales = validOrders
        .filter((o) => o.paymentMethod === 'cash')
        .reduce((s, o) => s + o.grandTotal, 0);
      const qrisSales = validOrders
        .filter((o) => o.paymentMethod === 'qris')
        .reduce((s, o) => s + o.grandTotal, 0);
      const transferSales = validOrders
        .filter((o) => o.paymentMethod === 'transfer')
        .reduce((s, o) => s + o.grandTotal, 0);

      const expectedCash = cashSales;
      const difference = Math.round(params.actualCash) - expectedCash;

      if (difference !== 0 && !params.notes.trim()) {
        return {
          ok: false,
          error:
            'Terdapat selisih kas fisik vs sistem. Catatan penjelasan wajib diisi.',
        };
      }

      const nowIso = new Date().toISOString();
      const closing: DailyClosing = {
        id: makeUuid(),
        closingDate: todayStr,
        shiftLabel: params.shiftLabel || 'Tutup Buku Harian',
        totalOrders: validOrders.length,
        grossSales,
        totalDiscount,
        totalDpp,
        totalTax,
        totalService,
        netRevenue,
        cashSales,
        qrisSales,
        transferSales,
        expectedCash,
        actualCash: Math.round(params.actualCash),
        difference,
        notes:
          params.notes.trim() || 'Rekap kas sesuai, tidak ditemukan selisih.',
        closedBy: activeStaff.fullName,
        lockedAt: nowIso,
      };

      const auditLog: AuditLog = {
        id: makeUuid(),
        actorName: activeStaff.fullName,
        actorRole: activeStaff.role,
        action: 'CLOSE_DAILY_BOOK',
        entity: 'daily_closings',
        entityId: closing.closingDate,
        details: `Tutup buku "${closing.shiftLabel}" dikunci. Total pendapatan: Rp ${netRevenue.toLocaleString('id-ID')}, Selisih kas: Rp ${difference.toLocaleString('id-ID')}.`,
        createdAt: nowIso,
      };

      commitState((prev) => ({
        ...prev,
        dailyClosings: [closing, ...prev.dailyClosings],
        auditLogs: [auditLog, ...prev.auditLogs],
      }));

      void pushToSupabase({
        type: 'CLOSE_DAILY_BOOK',
        closing,
        auditLog,
      });

      showToast('Laporan Tutup Buku berhasil dikunci ke database!', {
        description: `Total bersih Rp ${netRevenue.toLocaleString('id-ID')}`,
        variant: 'success',
      });
      return { ok: true, closing };
    },
    [state.orders, activeStaff, commitState, showToast, pushToSupabase]
  );

  // --- SaaS Plan Switching (Basic vs Pro) ---
  const switchSubscriptionPlan = useCallback(
    (planCode: PlanCode, billingCycle: 'monthly' | 'yearly') => {
      const planDef = PLANS[planCode];
      const amount =
        billingCycle === 'monthly' ? planDef.priceMonthly : planDef.priceYearly;
      const now = new Date();
      const periodEnd = new Date(
        now.getTime() + (billingCycle === 'monthly' ? 30 : 365) * 86400000
      )
        .toISOString()
        .slice(0, 10);

      const newInvoice: SaaSInvoice = {
        id: makeUuid(),
        invoiceNo: `MYPOS-${planCode.toUpperCase()}-${now.getFullYear()}${String(
          now.getMonth() + 1
        ).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`,
        planCode,
        billingCycle,
        amount,
        status: 'paid',
        periodLabel: `${planDef.name} (${billingCycle === 'monthly' ? 'Bulanan' : 'Tahunan'})`,
        paidAt: now.toISOString(),
      };

      const auditLog: AuditLog = {
        id: makeUuid(),
        actorName: activeStaff.fullName,
        actorRole: activeStaff.role,
        action: 'CHANGE_PLAN',
        entity: 'subscriptions',
        entityId: planCode,
        details: `Mengubah paket langganan ke ${planDef.name} (${billingCycle}).`,
        createdAt: now.toISOString(),
      };

      commitState((prev) => {
        const adjustedReceipt =
          planCode === 'basic'
            ? {
                ...prev.receiptSettings,
                template: 'minimal' as const,
                showQr: false,
              }
            : prev.receiptSettings;

        return {
          ...prev,
          receiptSettings: adjustedReceipt,
          subscription: {
            planCode,
            billingCycle,
            status: 'active',
            trialDaysLeft: 0,
            currentPeriodEnd: periodEnd,
          },
          invoices: [newInvoice, ...prev.invoices],
          auditLogs: [auditLog, ...prev.auditLogs],
        };
      });

      void pushToSupabase({
        type: 'SYNC_SETTINGS',
        planCode,
        billingCycle,
        currentPeriodEnd: periodEnd,
        invoice: newInvoice,
        auditLog,
      });

      setUpgradePromptFeature(null);
      showToast(`Paket ${planDef.name} berhasil diaktifkan!`, {
        description:
          planCode === 'pro'
            ? 'Seluruh fitur kustomisasi struk, QR, varian, & laporan lanjutan kini terbuka.'
            : 'Berlaku fitur dasar Basic Plan. Seluruh data lama Anda tetap tersimpan aman.',
        variant: 'success',
      });
    },
    [commitState, activeStaff, showToast, pushToSupabase]
  );

  const completeOnboarding = useCallback(() => {
    commitState((prev) => ({
      ...prev,
      onboardingCompleted: true,
    }));
    void pushToSupabase({ type: 'COMPLETE_ONBOARDING' });
  }, [commitState, pushToSupabase]);

  const resetDemoData = useCallback(() => {
    void refreshFromDatabase();
    showToast('Data berhasil disegarkan dari database Supabase', {
      variant: 'info',
    });
  }, [refreshFromDatabase, showToast]);

  const value = useMemo<PosContextValue>(
    () => ({
      ...state,
      isHydrated,
      theme,
      toggleTheme,
      supabaseConnected,
      isSyncingSupabase,
      authRole,
      activeStaff,
      switchStaffWithAuth,
      cart,
      orderType,
      setOrderType,
      tableNo,
      setTableNo,
      customerName,
      setCustomerName,
      selectedDiscountId,
      setSelectedDiscountId,
      selectedDiscount,
      pricingBreakdown,
      nextQueueLabel,
      addToCart,
      updateCartQty,
      updateCartItemNotes,
      clearCart,
      holdCurrentOrder,
      resumeHeldOrder,
      deleteHeldOrder,
      processCheckout,
      advancePrepStatus,
      voidOrder,
      upsertProduct,
      deleteProduct,
      adjustProductStock,
      addCategory,
      deleteCategory,
      upsertDiscount,
      toggleDiscountActive,
      deleteDiscount,
      updateBusinessSettings,
      updateReceiptSettings,
      resetReceiptToDefault,
      updatePrinterConfig,
      addStaff,
      toggleStaffActive,
      updateStaffPassword,
      deleteStaff,
      createDailyClosing,
      canFeature,
      switchSubscriptionPlan,
      upgradePromptFeature,
      openUpgradeModal,
      closeUpgradeModal,
      completeOnboarding,
      resetDemoData,
      refreshFromDatabase,
      toast,
      showToast,
      dismissToast,
    }),
    [
      state,
      isHydrated,
      theme,
      toggleTheme,
      supabaseConnected,
      isSyncingSupabase,
      authRole,
      activeStaff,
      switchStaffWithAuth,
      cart,
      orderType,
      tableNo,
      customerName,
      selectedDiscountId,
      selectedDiscount,
      pricingBreakdown,
      nextQueueLabel,
      addToCart,
      updateCartQty,
      updateCartItemNotes,
      clearCart,
      holdCurrentOrder,
      resumeHeldOrder,
      deleteHeldOrder,
      processCheckout,
      advancePrepStatus,
      voidOrder,
      upsertProduct,
      deleteProduct,
      adjustProductStock,
      addCategory,
      deleteCategory,
      upsertDiscount,
      toggleDiscountActive,
      deleteDiscount,
      updateBusinessSettings,
      updateReceiptSettings,
      resetReceiptToDefault,
      updatePrinterConfig,
      addStaff,
      toggleStaffActive,
      updateStaffPassword,
      deleteStaff,
      createDailyClosing,
      canFeature,
      switchSubscriptionPlan,
      upgradePromptFeature,
      openUpgradeModal,
      closeUpgradeModal,
      completeOnboarding,
      resetDemoData,
      refreshFromDatabase,
      toast,
      showToast,
      dismissToast,
    ]
  );

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return ctx;
}
