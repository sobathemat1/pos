export type PlanCode = 'basic' | 'pro';
export type UserRole = 'superadmin' | 'admin' | 'staff';
export type OrderType = 'dine_in' | 'takeaway';
export type PaymentMethod = 'cash' | 'qris' | 'transfer';
export type PrepStatus = 'new' | 'preparing' | 'ready' | 'delivered';
export type OrderStatus = 'paid' | 'completed' | 'voided';
export type ReceiptTemplate = 'minimal' | 'classic' | 'modern';
export type RoundingRule = 'nearest_1' | 'nearest_100' | 'nearest_500';
export type PrinterConnectionType = 'usb' | 'serial' | 'bluetooth' | 'browser';

export type ProFeatureKey =
  | 'custom_receipt_templates'
  | 'receipt_qr_code'
  | 'receipt_custom_prefix'
  | 'product_variants'
  | 'csv_import_export'
  | 'hold_and_split_bill'
  | 'advanced_reports'
  | 'digital_receipt_share'
  | 'kitchen_ticket_printer';

export interface PlanLimits {
  max_users: number;
  max_products: number;
  max_active_discounts: number;
  history_days: number;
}

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  limits: PlanLimits;
  features: Record<ProFeatureKey, boolean>;
}

export interface StaffProfile {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  role: UserRole;
  pin: string;
  password?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SuperadminTenantSummary {
  id: string;
  name: string;
  slug: string;
  planCode: PlanCode;
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'suspended';
  billingCycle: 'monthly' | 'yearly';
  onboardingCompleted: boolean;
  ownerName: string;
  ownerEmail: string;
  productsCount: number;
  ordersCount: number;
  staffCount: number;
  totalRevenue: number;
  createdAt: string;
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  logoText: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  taxId: string;
  timezone: string;
  currency: string;
  taxName: string;
  taxEnabled: boolean; // Toggleable PPN / Pajak Resto (Aktif / Nonaktif)
  taxRate: number; // Default 10%
  serviceRate: number;
  taxInclusive: boolean;
  roundingRule: RoundingRule;
}

export interface ReceiptSettings {
  template: ReceiptTemplate;
  paperWidth: 58 | 80;
  fontSize: 'small' | 'normal' | 'large';
  alignHeader: 'left' | 'center';
  showLogo: boolean;
  showTagline: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showSocial: boolean;
  showCashier: boolean;
  showTable: boolean;
  showCustomer: boolean;
  showWifi: boolean;
  showQr: boolean;
  headerText: string;
  footerText: string;
  wifiSsid: string;
  wifiPassword: string;
  qrContent: string;
  numberPrefix: string;
  autoPrint: boolean;
  openDrawer: boolean;
  language: 'id' | 'en';
}

export interface PrinterConfig {
  id: string;
  name: string;
  connection: PrinterConnectionType;
  deviceName?: string;
  isConnected: boolean;
  paperWidth: 58 | 80;
  autoCut: boolean;
  openDrawer: boolean;
  copies: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  priceDelta: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  trackStock: boolean;
  stock: number;
  minStock: number;
  isActive: boolean;
  variants?: ProductVariant[];
}

export interface Discount {
  id: string;
  name: string;
  code: string;
  type: 'percent' | 'amount';
  value: number;
  minPurchase: number;
  isActive: boolean;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  name: string;
  emoji: string;
  basePrice: number;
  variantLabel?: string;
  variantDelta?: number;
  unitPrice: number;
  qty: number;
  notes: string;
}

export interface OrderPricingBreakdown {
  subtotal: number;
  discountAmount: number;
  dppAmount: number;
  taxAmount: number;
  serviceAmount: number;
  roundingAdjustment: number;
  grandTotal: number;
}

export interface ReceiptSnapshot {
  business: BusinessSettings;
  receipt: ReceiptSettings;
  capturedAt: string;
}

export interface OrderItemRecord {
  id: string;
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
  notes: string;
  variantLabel?: string;
}

export interface OrderRecord {
  id: string;
  orderNo: string;
  queueNo: string;
  status: OrderStatus;
  orderType: OrderType;
  tableNo: string;
  customerName: string;
  items: OrderItemRecord[];
  subtotal: number;
  discountTotal: number;
  dppTotal: number;
  taxTotal: number;
  serviceTotal: number;
  grandTotal: number;
  discountId?: string;
  discountName?: string;
  paymentMethod: PaymentMethod;
  paymentReceived: number;
  paymentChange: number;
  cashierName: string;
  prepStatus: PrepStatus;
  createdAt: string;
  paidAt: string;
  prepStartedAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  voidReason?: string;
  receiptSnapshot: ReceiptSnapshot;
}

export interface HeldOrder {
  id: string;
  label: string;
  tableNo: string;
  customerName: string;
  orderType: OrderType;
  items: CartItem[];
  discountId?: string;
  savedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  delta: number;
  stockAfter: number;
  reason: string;
  refOrderNo?: string;
  actorName: string;
  createdAt: string;
}

export interface DailyClosing {
  id: string;
  closingDate: string;
  shiftLabel: string;
  totalOrders: number;
  grossSales: number;
  totalDiscount: number;
  totalDpp: number;
  totalTax: number;
  totalService: number;
  netRevenue: number;
  cashSales: number;
  qrisSales: number;
  transferSales: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  notes: string;
  closedBy: string;
  lockedAt: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface SubscriptionState {
  planCode: PlanCode;
  billingCycle: 'monthly' | 'yearly';
  status: 'trial' | 'active' | 'past_due' | 'suspended';
  trialDaysLeft: number;
  currentPeriodEnd: string;
}

export interface SaaSInvoice {
  id: string;
  invoiceNo: string;
  planCode: PlanCode;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  status: 'paid' | 'pending';
  periodLabel: string;
  paidAt: string;
}
