import {
  CartItem,
  Discount,
  OrderPricingBreakdown,
  RoundingRule,
} from '@/types/pos';

/**
 * Formats integer Rupiah into standard Indonesian currency format (e.g. "Rp 77.220")
 */
export function formatIDR(amount: number): string {
  const safe = Math.round(Number.isFinite(amount) ? amount : 0);
  const sign = safe < 0 ? '-' : '';
  const abs = Math.abs(safe);
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`;
}

/**
 * Formats integer Rupiah without prefix (e.g. "77.220") for thermal receipt alignment
 */
export function formatNumberID(amount: number): string {
  const safe = Math.round(Number.isFinite(amount) ? amount : 0);
  return safe.toLocaleString('id-ID');
}

/**
 * Validates whether a discount can be applied to the given subtotal
 */
export function validateDiscount(
  discount: Discount | null | undefined,
  subtotal: number
): { valid: boolean; reason?: string } {
  if (!discount) return { valid: true };
  if (!discount.isActive) {
    return { valid: false, reason: 'Diskon sedang tidak aktif.' };
  }
  if (subtotal < discount.minPurchase) {
    return {
      valid: false,
      reason: `Minimal belanja ${formatIDR(discount.minPurchase)} untuk memakai diskon "${discount.name}".`,
    };
  }
  return { valid: true };
}

/**
 * Applies rounding rule to a raw total
 */
export function applyRounding(
  rawAmount: number,
  rule: RoundingRule = 'nearest_1'
): { rounded: number; adjustment: number } {
  const clean = Math.round(rawAmount);
  if (rule === 'nearest_100') {
    const rounded = Math.round(clean / 100) * 100;
    return { rounded, adjustment: rounded - clean };
  }
  if (rule === 'nearest_500') {
    const rounded = Math.round(clean / 500) * 500;
    return { rounded, adjustment: rounded - clean };
  }
  return { rounded: clean, adjustment: 0 };
}

/**
 * Single source of truth for POS order calculation (KF-21, KF-21a, KNF-03).
 * Uses integer Rupiah math, supports enabling/disabling PPN (taxEnabled), and separates DPP and Tax.
 */
export function calculateOrderTotals(params: {
  items: Pick<CartItem, 'unitPrice' | 'qty'>[];
  discount?: Discount | null;
  taxEnabled?: boolean; // Can be enabled or disabled by user
  taxRate: number; // e.g. 10 for 10%
  serviceRate?: number; // Optional, e.g. 5 for 5%
  taxInclusive?: boolean;
  roundingRule?: RoundingRule;
}): OrderPricingBreakdown {
  const {
    items,
    discount,
    taxEnabled = true,
    taxRate,
    serviceRate = 0,
    taxInclusive = false,
    roundingRule = 'nearest_1',
  } = params;

  const effectiveTaxRate = taxEnabled ? Math.max(0, taxRate) : 0;
  const effectiveServiceRate = Math.max(0, serviceRate);

  const subtotal = items.reduce(
    (sum, item) => sum + Math.round(item.unitPrice) * Math.max(0, Math.round(item.qty)),
    0
  );

  if (subtotal <= 0) {
    return {
      subtotal: 0,
      discountAmount: 0,
      dppAmount: 0,
      taxAmount: 0,
      serviceAmount: 0,
      roundingAdjustment: 0,
      grandTotal: 0,
    };
  }

  // Discount calculation
  let discountAmount = 0;
  const check = validateDiscount(discount, subtotal);
  if (discount && check.valid) {
    if (discount.type === 'percent') {
      const pct = Math.min(100, Math.max(0, discount.value));
      discountAmount = Math.round((subtotal * pct) / 100);
    } else {
      discountAmount = Math.min(subtotal, Math.max(0, Math.round(discount.value)));
    }
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);

  let dppAmount = 0;
  let serviceAmount = 0;
  let taxAmount = 0;
  let rawGrandTotal = 0;

  if (!taxEnabled || effectiveTaxRate <= 0) {
    // Tax is disabled (PPN Nonaktif)
    dppAmount = afterDiscount;
    serviceAmount = Math.round((dppAmount * effectiveServiceRate) / 100);
    taxAmount = 0;
    rawGrandTotal = dppAmount + serviceAmount;
  } else if (taxInclusive) {
    // Inclusive mode: price after discount already includes tax; extract DPP and tax
    serviceAmount = Math.round((afterDiscount * effectiveServiceRate) / 100);
    dppAmount = Math.round((afterDiscount * 100) / (100 + effectiveTaxRate));
    taxAmount = afterDiscount - dppAmount;
    rawGrandTotal = afterDiscount + serviceAmount;
  } else {
    // Exclusive mode (standard): DPP = subtotal - discount; tax & service added on top
    dppAmount = afterDiscount;
    serviceAmount = Math.round((dppAmount * effectiveServiceRate) / 100);
    taxAmount = Math.round(((dppAmount + serviceAmount) * effectiveTaxRate) / 100);
    rawGrandTotal = dppAmount + serviceAmount + taxAmount;
  }

  const { rounded: grandTotal, adjustment: roundingAdjustment } = applyRounding(
    rawGrandTotal,
    roundingRule
  );

  return {
    subtotal,
    discountAmount,
    dppAmount,
    taxAmount,
    serviceAmount,
    roundingAdjustment,
    grandTotal,
  };
}
