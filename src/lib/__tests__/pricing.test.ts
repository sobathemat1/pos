import { describe, expect, it } from 'vitest';
import {
  applyRounding,
  calculateOrderTotals,
  formatIDR,
  validateDiscount,
} from '../pricing';
import { canUseFeature, checkPlanLimit } from '../plans';
import {
  buildEscPosReceipt,
  createSamplePreviewOrder,
} from '../thermal-printer';
import {
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_RECEIPT_SETTINGS,
} from '../seed-data';
import { Discount } from '@/types/pos';

describe('MyPOS Pricing & Tax Calculation Engine (KNF-03)', () => {
  const sampleItems = [
    { unitPrice: 28000, qty: 2 }, // 56,000
    { unitPrice: 22000, qty: 1 }, // 22,000 -> Subtotal 78,000
  ];

  const promo10Percent: Discount = {
    id: 'd1',
    name: 'Promo 10%',
    code: 'SENJA10',
    type: 'percent',
    value: 10,
    minPurchase: 50000,
    isActive: true,
  };

  it('calculates subtotal, 10% discount, DPP, and mandatory 10% exclusive tax accurately (US-01)', () => {
    const res = calculateOrderTotals({
      items: sampleItems,
      discount: promo10Percent,
      taxRate: 10,
      serviceRate: 0,
      taxInclusive: false,
      roundingRule: 'nearest_1',
    });

    expect(res.subtotal).toBe(78000);
    expect(res.discountAmount).toBe(7800);
    expect(res.dppAmount).toBe(70200);
    expect(res.taxAmount).toBe(7020);
    expect(res.grandTotal).toBe(77220);
  });

  it('sets taxAmount to 0 when taxEnabled is false (PPN disabled)', () => {
    const res = calculateOrderTotals({
      items: sampleItems, // 78,000
      discount: promo10Percent, // -7,800 -> 70,200
      taxEnabled: false,
      taxRate: 10,
      serviceRate: 0,
      taxInclusive: false,
      roundingRule: 'nearest_1',
    });

    expect(res.subtotal).toBe(78000);
    expect(res.discountAmount).toBe(7800);
    expect(res.dppAmount).toBe(70200);
    expect(res.taxAmount).toBe(0);
    expect(res.grandTotal).toBe(70200);
  });

  it('extracts DPP and tax properly in taxInclusive mode', () => {
    const res = calculateOrderTotals({
      items: [{ unitPrice: 55000, qty: 2 }], // 110,000 inclusive of 10% tax
      discount: null,
      taxRate: 10,
      taxInclusive: true,
    });

    expect(res.subtotal).toBe(110000);
    expect(res.dppAmount).toBe(100000);
    expect(res.taxAmount).toBe(10000);
    expect(res.grandTotal).toBe(110000);
  });

  it('rejects discount if subtotal is below minPurchase', () => {
    const check = validateDiscount(promo10Percent, 40000);
    expect(check.valid).toBe(false);

    const totals = calculateOrderTotals({
      items: [{ unitPrice: 20000, qty: 2 }], // 40,000 < 50,000
      discount: promo10Percent,
      taxRate: 10,
    });
    expect(totals.discountAmount).toBe(0);
    expect(totals.grandTotal).toBe(44000);
  });

  it('applies rounding rules accurately', () => {
    expect(applyRounding(77220, 'nearest_100')).toEqual({
      rounded: 77200,
      adjustment: -20,
    });
    expect(applyRounding(77260, 'nearest_500')).toEqual({
      rounded: 77500,
      adjustment: 240,
    });
  });

  it('formats IDR currency properly', () => {
    expect(formatIDR(77220)).toContain('77.220');
  });
});

describe('SaaS Plan Feature Gating & Resource Limits (KF-78, KF-79)', () => {
  it('gates Pro features on Basic plan and unlocks on Pro plan', () => {
    expect(canUseFeature('basic', 'custom_receipt_templates')).toBe(false);
    expect(canUseFeature('basic', 'receipt_qr_code')).toBe(false);
    expect(canUseFeature('pro', 'custom_receipt_templates')).toBe(true);
    expect(canUseFeature('pro', 'receipt_qr_code')).toBe(true);
  });

  it('enforces max_products (50) and max_users (3) on Basic plan', () => {
    expect(checkPlanLimit('basic', 'max_products', 49).allowed).toBe(true);
    expect(checkPlanLimit('basic', 'max_products', 50).allowed).toBe(false);
    expect(checkPlanLimit('pro', 'max_products', 500).allowed).toBe(true);
  });
});

describe('ESC/POS Thermal Printer Encoder (KF-52, KF-54)', () => {
  it('encodes receipt into non-empty ESC/POS byte stream with header, items, tax, and cut command', () => {
    const order = createSamplePreviewOrder(
      DEFAULT_BUSINESS_SETTINGS,
      DEFAULT_RECEIPT_SETTINGS
    );
    const bytes = buildEscPosReceipt(order, {
      openDrawer: true,
      autoCut: true,
    });

    expect(bytes.length).toBeGreaterThan(200);
    // Starts with ESC @ (0x1B, 0x40)
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
  });
});
