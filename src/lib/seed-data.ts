import {
  AuditLog,
  BusinessSettings,
  Category,
  DailyClosing,
  Discount,
  OrderRecord,
  PrinterConfig,
  Product,
  ReceiptSettings,
  SaaSInvoice,
  StaffProfile,
  StockMovement,
  SubscriptionState,
} from '@/types/pos';

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: 'Cafe Baru',
  tagline: '',
  logoText: '☕',
  address: '',
  phone: '',
  email: '',
  website: '',
  instagram: '',
  taxId: '',
  timezone: 'Asia/Jakarta',
  currency: 'IDR',
  taxName: 'PB1 / PPN',
  taxEnabled: true,
  taxRate: 10,
  serviceRate: 0,
  taxInclusive: false,
  roundingRule: 'nearest_1',
};

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  template: 'minimal',
  paperWidth: 58,
  fontSize: 'normal',
  alignHeader: 'center',
  showLogo: true,
  showTagline: true,
  showAddress: true,
  showPhone: true,
  showSocial: true,
  showCashier: true,
  showTable: true,
  showCustomer: true,
  showWifi: false,
  showQr: false,
  headerText: '',
  footerText: 'Terima kasih atas kunjungannya!',
  wifiSsid: '',
  wifiPassword: '',
  qrContent: '',
  numberPrefix: 'INV',
  autoPrint: true,
  openDrawer: true,
  language: 'id',
};

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Printer Kasir Utama',
  connection: 'usb',
  deviceName: 'Printer Thermal 58mm/80mm',
  isConnected: false,
  paperWidth: 58,
  autoCut: true,
  openDrawer: true,
  copies: 1,
};

export const DEFAULT_CATEGORIES: Category[] = [];

export const DEFAULT_PRODUCTS: Product[] = [];

export const DEFAULT_DISCOUNTS: Discount[] = [];

export const DEFAULT_STAFF: StaffProfile[] = [];

export const DEFAULT_ORDERS: OrderRecord[] = [];

export const DEFAULT_STOCK_MOVEMENTS: StockMovement[] = [];

export const DEFAULT_DAILY_CLOSINGS: DailyClosing[] = [];

export const DEFAULT_AUDIT_LOGS: AuditLog[] = [];

export const DEFAULT_SUBSCRIPTION: SubscriptionState = {
  planCode: 'pro',
  billingCycle: 'monthly',
  status: 'trial',
  trialDaysLeft: 14,
  currentPeriodEnd: new Date(Date.now() + 14 * 86400000)
    .toISOString()
    .slice(0, 10),
};

export const DEFAULT_INVOICES: SaaSInvoice[] = [];
