import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_PRINTER_CONFIG,
  DEFAULT_RECEIPT_SETTINGS,
} from '@/lib/seed-data';
import {
  hashStaffPassword,
  isSuperadminUser,
  normalizeRole,
  verifyStaffPassword,
} from '@/lib/staff-auth';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(val?: string | null): val is string {
  return Boolean(val && UUID_REGEX.test(val));
}

function ensureUuid(val?: string | null): string {
  return isUuid(val) ? val : crypto.randomUUID();
}

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || 'cafe'}-${suffix}`;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('your-project-id')) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapOrderRowToRecord(
  ord: any,
  fallbackBusiness: any,
  fallbackReceipt: any
) {
  const payment = Array.isArray(ord.payments) ? ord.payments[0] : null;
  const items = Array.isArray(ord.order_items)
    ? ord.order_items.map((it: any) => ({
        id: it.id,
        productId: it.product_id || '',
        name: it.name_snapshot,
        unitPrice: Number(it.price_snapshot),
        qty: Number(it.qty),
        notes: it.notes || '',
        variantLabel: it.variant_label || undefined,
      }))
    : [];

  const snapshot =
    ord.receipt_snapshot &&
    ord.receipt_snapshot.business &&
    ord.receipt_snapshot.receipt
      ? ord.receipt_snapshot
      : {
          business: fallbackBusiness || DEFAULT_BUSINESS_SETTINGS,
          receipt: fallbackReceipt || DEFAULT_RECEIPT_SETTINGS,
          capturedAt: ord.paid_at || ord.created_at,
        };

  return {
    id: ord.id,
    orderNo: ord.order_no,
    queueNo: ord.queue_no,
    status: ord.status,
    orderType: ord.order_type,
    tableNo: ord.table_no || '',
    customerName: ord.customer_name || 'Pelanggan',
    items,
    subtotal: Number(ord.subtotal),
    discountTotal: Number(ord.discount_total),
    dppTotal: Number(ord.dpp_total),
    taxTotal: Number(ord.tax_total),
    serviceTotal: Number(ord.service_total),
    grandTotal: Number(ord.grand_total),
    discountId: ord.discount_id || undefined,
    discountName: ord.discount_name || undefined,
    paymentMethod: payment?.method || 'cash',
    paymentReceived: Number(payment?.received ?? ord.grand_total),
    paymentChange: Number(payment?.change ?? 0),
    cashierName: ord.cashier_name || 'Kasir',
    prepStatus: ord.prep_status,
    createdAt: ord.created_at,
    paidAt: ord.paid_at || ord.created_at,
    prepStartedAt: ord.prep_started_at || undefined,
    readyAt: ord.ready_at || undefined,
    deliveredAt: ord.delivered_at || undefined,
    voidReason: ord.void_reason || undefined,
    receiptSnapshot: snapshot,
  };
}

/**
 * Resolves the signed-in user (from the session cookie) and their tenant.
 * If the user is authenticated in Supabase Auth but doesn't have a profile/tenant yet,
 * provisions an empty tenant for them automatically.
 */
async function resolveAuthContext(admin: SupabaseClient): Promise<{
  userId: string;
  tenantId: string;
  profile: { id: string; fullName: string; email: string; role: string };
} | null> {
  const serverClient = await createSupabaseServerClient();
  if (!serverClient) return null;
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  if (!user) return null;

  const { data: profile } = await admin
    .from('profiles')
    .select('id, tenant_id, full_name, email, role')
    .eq('id', user.id)
    .maybeSingle();

  const superadminFlag = isSuperadminUser(user, profile?.role);

  if (profile && profile.tenant_id) {
    return {
      userId: user.id,
      tenantId: profile.tenant_id,
      profile: {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        role: superadminFlag ? 'superadmin' : normalizeRole(profile.role),
      },
    };
  }

  // Safety net 1: Check if profile exists by email (case-insensitive)
  if (user.email) {
    const { data: profileByEmail } = await admin
      .from('profiles')
      .select('id, tenant_id, full_name, email, role')
      .ilike('email', user.email.trim())
      .maybeSingle();

    if (profileByEmail && profileByEmail.tenant_id) {
      if (profileByEmail.id !== user.id) {
        await admin
          .from('profiles')
          .update({ id: user.id })
          .eq('id', profileByEmail.id);
      }
      return {
        userId: user.id,
        tenantId: profileByEmail.tenant_id,
        profile: {
          id: user.id,
          fullName: profileByEmail.full_name,
          email: profileByEmail.email,
          role: superadminFlag
            ? 'superadmin'
            : normalizeRole(profileByEmail.role),
        },
      };
    }
  }

  // Safety net 2: Check if user was registered with tenant_id in user_metadata
  if (user.user_metadata?.tenant_id) {
    const assignedTenantId = user.user_metadata.tenant_id as string;
    const staffRole = superadminFlag
      ? 'superadmin'
      : normalizeRole(user.user_metadata.role as string);
    const staffName =
      (user.user_metadata.full_name as string) ||
      user.email?.split('@')[0] ||
      'Owner';

    await admin.from('profiles').upsert({
      id: user.id,
      tenant_id: assignedTenantId,
      role: staffRole === 'superadmin' ? 'admin' : staffRole,
      full_name: staffName,
      email: user.email || '',
      is_active: true,
    });

    return {
      userId: user.id,
      tenantId: assignedTenantId,
      profile: {
        id: user.id,
        fullName: staffName,
        email: user.email || '',
        role: staffRole,
      },
    };
  }

  // Provision a clean, empty tenant for this authenticated user if missing
  const businessName =
    (user.user_metadata?.business_name as string) || 'Cafe Baru';
  const fullName =
    (user.user_metadata?.full_name as string) ||
    user.email?.split('@')[0] ||
    'Owner';

  const { data: createdTenant, error: tErr } = await admin
    .from('tenants')
    .insert({
      name: businessName,
      slug: slugify(businessName),
      plan_code: 'pro',
      onboarding_completed: false,
    })
    .select('*')
    .single();

  if (tErr || !createdTenant) return null;

  await Promise.all([
    admin.from('subscriptions').upsert({
      tenant_id: createdTenant.id,
      plan_code: 'pro',
      billing_cycle: 'monthly',
      status: 'trial',
    }),
    admin.from('business_settings').upsert({
      tenant_id: createdTenant.id,
      business_name: businessName,
      email: user.email || '',
      socials: { instagram: '', tax_enabled: true },
      tax_enabled: true,
    }),
    admin.from('receipt_settings').upsert({
      tenant_id: createdTenant.id,
      wifi_ssid: '',
      wifi_password: '',
      qr_content: '',
      show_wifi: false,
      show_qr: false,
    }),
    admin.from('profiles').upsert({
      id: user.id,
      tenant_id: createdTenant.id,
      role: 'admin',
      full_name: fullName,
      email: user.email || '',
      is_active: true,
    }),
  ]);

  return {
    userId: user.id,
    tenantId: createdTenant.id,
    profile: {
      id: user.id,
      fullName,
      email: user.email || '',
      role: 'admin',
    },
  };
}

export async function GET(req: Request) {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json({ connected: false, reason: 'No Supabase env' });
  }

  const url = new URL(req.url);
  const publicOrderId = url.searchParams.get('orderId');

  // Public Digital Receipt lookup by order ID or order_no
  if (publicOrderId) {
    try {
      const query = sb
        .from('orders')
        .select('*, order_items(*), payments(*)');
      const { data: ord } = isUuid(publicOrderId)
        ? await query.eq('id', publicOrderId).maybeSingle()
        : await query.eq('order_no', publicOrderId).maybeSingle();

      if (!ord) {
        return NextResponse.json({ ok: false, order: null }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        order: mapOrderRowToRecord(ord, null, null),
      });
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, reason: err?.message },
        { status: 500 }
      );
    }
  }

  const ctx = await resolveAuthContext(sb);
  if (!ctx) {
    return NextResponse.json(
      { connected: false, reason: 'unauthenticated' },
      { status: 401 }
    );
  }

  try {
    const { data: tenant, error: tenantErr } = await sb
      .from('tenants')
      .select('*')
      .eq('id', ctx.tenantId)
      .maybeSingle();

    if (tenantErr || !tenant) {
      return NextResponse.json({
        connected: false,
        reason: tenantErr?.message || 'Tenant not found',
      });
    }

    // Fetch ALL entity tables for this tenant in parallel from Supabase
    const [
      { data: bizRow },
      { data: recRow },
      { data: printerRow },
      { data: subRow },
      { data: invoiceRows },
      { data: profileRows },
      { data: categoryRows },
      { data: productRows },
      { data: discountRows },
      { data: orderRows },
      { data: movementRows },
      { data: closingRows },
      { data: auditRows },
    ] = await Promise.all([
      sb
        .from('business_settings')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle(),
      sb
        .from('receipt_settings')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle(),
      sb
        .from('printers')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      sb
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle(),
      sb
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false }),
      sb
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: true }),
      sb
        .from('categories')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('sort_order', { ascending: true }),
      sb
        .from('products')
        .select('*, product_variants(*)')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false }),
      sb
        .from('discounts')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false }),
      sb
        .from('orders')
        .select('*, order_items(*), payments(*)')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false }),
      sb
        .from('stock_movements')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(200),
      sb
        .from('daily_closings')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('locked_at', { ascending: false }),
      sb
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    const trialDaysLeft = subRow?.trial_ends_at
      ? Math.max(
          0,
          Math.ceil(
            (new Date(subRow.trial_ends_at).getTime() - Date.now()) / 86400000
          )
        )
      : 0;

    const businessSettings = bizRow
      ? {
          businessName: bizRow.business_name,
          tagline: bizRow.tagline || '',
          logoText: bizRow.logo_text || '☕',
          address: bizRow.address || '',
          phone: bizRow.phone || '',
          email: bizRow.email || '',
          website: bizRow.website || '',
          instagram: bizRow.socials?.instagram ?? '',
          taxEnabled:
            typeof bizRow.socials?.tax_enabled === 'boolean'
              ? bizRow.socials.tax_enabled
              : typeof bizRow.tax_enabled === 'boolean'
                ? bizRow.tax_enabled
                : true,
          taxId: bizRow.tax_id || '',
          timezone: bizRow.timezone || 'Asia/Jakarta',
          currency: bizRow.currency || 'IDR',
          taxName: bizRow.tax_name || 'PB1 / PPN',
          taxRate: Number(bizRow.tax_rate ?? 10),
          serviceRate: Number(bizRow.service_rate ?? 0),
          taxInclusive: Boolean(bizRow.tax_inclusive),
          roundingRule: bizRow.rounding_rule || 'nearest_1',
        }
      : {
          ...DEFAULT_BUSINESS_SETTINGS,
          businessName: tenant.name,
        };

    const receiptSettings = recRow
      ? {
          template: recRow.template,
          paperWidth: recRow.paper_width,
          fontSize: recRow.font_size,
          alignHeader: recRow.align_header,
          showLogo: recRow.show_logo,
          showTagline: recRow.show_tagline,
          showAddress: recRow.show_address,
          showPhone: recRow.show_phone,
          showSocial: recRow.show_social,
          showCashier: recRow.show_cashier,
          showTable: recRow.show_table,
          showCustomer: recRow.show_customer,
          showWifi: recRow.show_wifi,
          showQr: recRow.show_qr,
          headerText: recRow.header_text || '',
          footerText: recRow.footer_text || 'Terima kasih atas kunjungannya!',
          wifiSsid: recRow.wifi_ssid || '',
          wifiPassword: recRow.wifi_password || '',
          qrContent: recRow.qr_content || '',
          numberPrefix: recRow.number_prefix || 'INV',
          autoPrint: recRow.auto_print,
          openDrawer: recRow.open_drawer,
          language: recRow.language || 'id',
        }
      : DEFAULT_RECEIPT_SETTINGS;

    const printerConfig = printerRow
      ? {
          id: printerRow.id,
          name: printerRow.name,
          connection:
            printerRow.connection === 'agent' ? 'usb' : printerRow.connection,
          deviceName: printerRow.name,
          isConnected: false,
          paperWidth: printerRow.paper_width,
          autoCut: printerRow.auto_cut,
          openDrawer: printerRow.open_drawer,
          copies: printerRow.copies,
        }
      : DEFAULT_PRINTER_CONFIG;

    const staffPins: Record<string, string> =
      bizRow?.socials?.staff_pins &&
      typeof bizRow.socials.staff_pins === 'object'
        ? bizRow.socials.staff_pins
        : {};

    const adminUsername =
      (bizRow?.socials?.admin_username as string) ||
      (ctx.profile.email ? ctx.profile.email.split('@')[0] : 'admin');

    const profileStaffList = (profileRows || []).map((p: any) => {
      const normalized = normalizeRole(p.role);
      const isOwner = normalized === 'admin' || normalized === 'superadmin';
      return {
        id: p.id,
        fullName: p.full_name,
        username: isOwner
          ? (bizRow?.socials?.admin_username as string) ||
            (p.email ? p.email.split('@')[0] : 'admin')
          : (p.email ? p.email.split('@')[0] : p.full_name.toLowerCase().replace(/\s+/g, '')),
        email: p.email,
        role: isOwner ? 'admin' : ('staff' as const),
        pin: staffPins[p.id] || (isOwner ? '1111' : '1234'),
        isActive: Boolean(p.is_active),
        createdAt: p.created_at,
      };
    });

    const rawStaffAccounts: any[] = Array.isArray(bizRow?.socials?.staff_accounts)
      ? bizRow.socials.staff_accounts
      : [];

    const usernameStaffList = rawStaffAccounts.map((acc: any) => ({
      id: acc.id,
      fullName: acc.fullName,
      username: acc.username,
      email: '',
      role: 'staff' as const,
      pin: acc.pin || staffPins[acc.id] || '1234',
      isActive: acc.isActive !== false,
      createdAt: acc.createdAt || new Date().toISOString(),
    }));

    const seenStaffIds = new Set(usernameStaffList.map((s) => s.id));
    const staffList = [
      ...profileStaffList.filter((s) => !seenStaffIds.has(s.id)),
      ...usernameStaffList,
    ];

    const categories = (categoryRows || []).map((c: any) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      sortOrder: Number(c.sort_order ?? 0),
    }));

    const productNameById: Record<string, string> = {};
    const products = (productRows || []).map((p: any) => {
      productNameById[p.id] = p.name;
      return {
        id: p.id,
        categoryId: p.category_id,
        name: p.name,
        description: p.description || '',
        price: Number(p.price),
        emoji: p.emoji || '☕',
        trackStock: Boolean(p.track_stock),
        stock: Number(p.stock ?? 0),
        minStock: Number(p.min_stock ?? 5),
        isActive: Boolean(p.is_active),
        variants: Array.isArray(p.product_variants)
          ? p.product_variants.map((v: any) => ({
              id: v.id,
              name: v.name,
              priceDelta: Number(v.price_delta ?? 0),
            }))
          : [],
      };
    });

    const discounts = (discountRows || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      code: d.code || '',
      type: d.type,
      value: Number(d.value),
      minPurchase: Number(d.min_purchase ?? 0),
      isActive: Boolean(d.is_active),
    }));

    const orderNoById: Record<string, string> = {};
    const orders = (orderRows || []).map((ord: any) => {
      orderNoById[ord.id] = ord.order_no;
      return mapOrderRowToRecord(ord, businessSettings, receiptSettings);
    });

    const stockMovements = (movementRows || []).map((sm: any) => ({
      id: sm.id,
      productId: sm.product_id,
      productName: productNameById[sm.product_id] || 'Produk',
      delta: Number(sm.delta),
      stockAfter: Number(sm.stock_after),
      reason: sm.reason,
      refOrderNo: sm.ref_order_id ? orderNoById[sm.ref_order_id] : undefined,
      actorName: sm.actor_name || 'Sistem',
      createdAt: sm.created_at,
    }));

    const dailyClosings = (closingRows || []).map((c: any) => ({
      id: c.id,
      closingDate: String(c.closing_date).slice(0, 10),
      shiftLabel: c.shift_label,
      totalOrders: Number(c.total_orders),
      grossSales: Number(c.gross_sales),
      totalDiscount: Number(c.total_discount),
      totalDpp: Number(c.total_dpp),
      totalTax: Number(c.total_tax),
      totalService: Number(c.total_service),
      netRevenue: Number(c.net_revenue),
      cashSales: Number(c.cash_sales),
      qrisSales: Number(c.qris_sales),
      transferSales: Number(c.transfer_sales),
      expectedCash: Number(c.expected_cash),
      actualCash: Number(c.actual_cash),
      difference: Number(c.difference),
      notes: c.notes || '',
      closedBy: c.closed_by,
      lockedAt: c.locked_at,
    }));

    const auditLogs = (auditRows || []).map((a: any) => ({
      id: a.id,
      actorName: a.actor_name,
      actorRole: a.actor_role,
      action: a.action,
      entity: a.entity,
      entityId: a.entity_id || '',
      details: a.details || '',
      createdAt: a.created_at,
    }));

    const invoices = (invoiceRows || []).map((inv: any) => ({
      id: inv.id,
      invoiceNo: inv.invoice_no,
      planCode: inv.plan_code,
      billingCycle: inv.billing_cycle,
      amount: Number(inv.amount),
      status: inv.status === 'paid' ? 'paid' : 'pending',
      periodLabel: inv.period_label,
      paidAt: inv.paid_at || inv.created_at,
    }));

    return NextResponse.json({
      connected: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      planCode: tenant.plan_code,
      onboardingCompleted: Boolean(tenant.onboarding_completed),
      subscription: subRow
        ? {
            planCode: subRow.plan_code,
            billingCycle: subRow.billing_cycle,
            status: subRow.status,
            trialDaysLeft,
            currentPeriodEnd: String(subRow.current_period_end).slice(0, 10),
          }
        : null,
      profile: ctx.profile,
      authRole: ctx.profile.role,
      adminUsername,
      businessSettings,
      receiptSettings,
      printerConfig,
      staffList,
      categories,
      products,
      discounts,
      orders,
      stockMovements,
      dailyClosings,
      auditLogs,
      invoices,
      queueCounter: orders.length + 1,
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      reason: err?.message || 'Unexpected error',
    });
  }
}

export async function POST(req: Request) {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json({ ok: false, reason: 'No Supabase env' });
  }

  try {
    const ctx = await resolveAuthContext(sb);
    if (!ctx) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { data: tenant } = await sb
      .from('tenants')
      .select('id')
      .eq('id', ctx.tenantId)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json({ ok: false, reason: 'Tenant not found' });
    }

    const insertAudit = async (log?: any) => {
      if (!log) return;
      await sb.from('audit_logs').insert({
        id: ensureUuid(log.id),
        tenant_id: tenant.id,
        actor_name: log.actorName || ctx.profile.fullName || 'Admin',
        actor_role: log.actorRole || ctx.profile.role || 'admin',
        action: log.action || 'SYSTEM_ACTION',
        entity: log.entity || 'system',
        entity_id: String(log.entityId || ''),
        details: log.details || '',
      });
    };

    // 1. COMPLETE ONBOARDING
    if (body.type === 'COMPLETE_ONBOARDING') {
      await sb
        .from('tenants')
        .update({ onboarding_completed: true })
        .eq('id', tenant.id);
    }

    // 2. SYNC SETTINGS (Business, Receipt, Printer, Subscription Plan, Invoice)
    if (body.type === 'SYNC_SETTINGS') {
      const {
        businessSettings,
        receiptSettings,
        printerConfig,
        planCode,
        billingCycle,
        currentPeriodEnd,
        invoice,
        auditLog,
      } = body;

      if (planCode) {
        await sb
          .from('tenants')
          .update({ plan_code: planCode })
          .eq('id', tenant.id);
        await sb
          .from('subscriptions')
          .update({
            plan_code: planCode,
            billing_cycle: billingCycle || 'monthly',
            status: 'active',
            ...(currentPeriodEnd
              ? { current_period_end: currentPeriodEnd }
              : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenant.id);
      }

      if (invoice) {
        await sb.from('invoices').upsert(
          {
            id: ensureUuid(invoice.id),
            tenant_id: tenant.id,
            invoice_no: invoice.invoiceNo,
            plan_code: invoice.planCode,
            billing_cycle: invoice.billingCycle,
            amount: Number(invoice.amount) || 0,
            status: invoice.status === 'paid' ? 'paid' : 'pending',
            period_label: invoice.periodLabel,
            paid_at: invoice.paidAt || new Date().toISOString(),
          },
          { onConflict: 'invoice_no' }
        );
      }

      if (businessSettings) {
        const { data: existingBiz } = await sb
          .from('business_settings')
          .select('socials')
          .eq('tenant_id', tenant.id)
          .maybeSingle();

        await sb.from('business_settings').upsert({
          tenant_id: tenant.id,
          business_name: businessSettings.businessName,
          tagline: businessSettings.tagline || '',
          logo_text: businessSettings.logoText || '☕',
          address: businessSettings.address || '',
          phone: businessSettings.phone || '',
          email: businessSettings.email || '',
          website: businessSettings.website || '',
          socials: {
            ...(existingBiz?.socials || {}),
            instagram: businessSettings.instagram || '',
            tax_enabled: Boolean(businessSettings.taxEnabled),
          },
          tax_enabled: Boolean(businessSettings.taxEnabled),
          tax_id: businessSettings.taxId || '',
          timezone: businessSettings.timezone || 'Asia/Jakarta',
          currency: businessSettings.currency || 'IDR',
          tax_name: businessSettings.taxName || 'PB1 / PPN',
          tax_rate: Math.max(0.01, Number(businessSettings.taxRate) || 10),
          service_rate: Math.max(0, Number(businessSettings.serviceRate) || 0),
          tax_inclusive: Boolean(businessSettings.taxInclusive),
          rounding_rule: businessSettings.roundingRule || 'nearest_1',
          updated_at: new Date().toISOString(),
        });
      }

      if (receiptSettings) {
        await sb.from('receipt_settings').upsert({
          tenant_id: tenant.id,
          template: receiptSettings.template,
          paper_width: receiptSettings.paperWidth,
          font_size: receiptSettings.fontSize,
          align_header: receiptSettings.alignHeader,
          show_logo: receiptSettings.showLogo,
          show_tagline: receiptSettings.showTagline,
          show_address: receiptSettings.showAddress,
          show_phone: receiptSettings.showPhone,
          show_social: receiptSettings.showSocial,
          show_cashier: receiptSettings.showCashier,
          show_table: receiptSettings.showTable,
          show_customer: receiptSettings.showCustomer,
          show_wifi: receiptSettings.showWifi,
          show_qr: receiptSettings.showQr,
          header_text: receiptSettings.headerText || '',
          footer_text: receiptSettings.footerText || '',
          wifi_ssid: receiptSettings.wifiSsid || '',
          wifi_password: receiptSettings.wifiPassword || '',
          qr_content: receiptSettings.qrContent || '',
          number_prefix: receiptSettings.numberPrefix || 'INV',
          auto_print: receiptSettings.autoPrint,
          open_drawer: receiptSettings.openDrawer,
          language: receiptSettings.language || 'id',
          updated_at: new Date().toISOString(),
        });
      }

      if (printerConfig) {
        const { data: existingPrinter } = await sb
          .from('printers')
          .select('id')
          .eq('tenant_id', tenant.id)
          .limit(1)
          .maybeSingle();

        const conn =
          printerConfig.connection === 'browser'
            ? 'usb'
            : printerConfig.connection;

        if (existingPrinter) {
          await sb
            .from('printers')
            .update({
              name: printerConfig.deviceName || printerConfig.name,
              connection: conn,
              paper_width: printerConfig.paperWidth,
              auto_cut: printerConfig.autoCut,
              open_drawer: printerConfig.openDrawer,
              copies: Math.min(5, Math.max(1, Number(printerConfig.copies) || 1)),
            })
            .eq('id', existingPrinter.id);
        } else {
          await sb.from('printers').insert({
            id: ensureUuid(printerConfig.id),
            tenant_id: tenant.id,
            name: printerConfig.deviceName || printerConfig.name,
            connection: conn,
            paper_width: printerConfig.paperWidth,
            auto_cut: printerConfig.autoCut,
            open_drawer: printerConfig.openDrawer,
            copies: Math.min(5, Math.max(1, Number(printerConfig.copies) || 1)),
          });
        }
      }

      await insertAudit(auditLog);
    }

    // 3. CATEGORIES CRUD
    if (body.type === 'ADD_CATEGORY' && body.category) {
      const cat = body.category;
      const { data: insertedCat, error } = await sb
        .from('categories')
        .upsert(
          {
            id: ensureUuid(cat.id),
            tenant_id: tenant.id,
            slug: cat.slug,
            name: cat.name,
            sort_order: Number(cat.sortOrder ?? 1),
          },
          { onConflict: 'tenant_id,slug' }
        )
        .select('*')
        .single();
      if (error) {
        return NextResponse.json({ ok: false, reason: error.message });
      }
      return NextResponse.json({ ok: true, categoryId: insertedCat?.id });
    }

    if (body.type === 'DELETE_CATEGORY' && body.id) {
      if (isUuid(body.id)) {
        await sb
          .from('categories')
          .delete()
          .eq('id', body.id)
          .eq('tenant_id', tenant.id);
      }
    }

    // 4. PRODUCTS & VARIANTS CRUD
    if (body.type === 'UPSERT_PRODUCT' && body.product) {
      const prod = body.product;
      const prodId = ensureUuid(prod.id);

      // Ensure category exists in DB for this tenant
      let validCatId: string | null = isUuid(prod.categoryId)
        ? prod.categoryId
        : null;

      if (validCatId) {
        const { data: catCheck } = await sb
          .from('categories')
          .select('id')
          .eq('id', validCatId)
          .eq('tenant_id', tenant.id)
          .maybeSingle();
        if (!catCheck) validCatId = null;
      }

      if (!validCatId) {
        const { data: firstCat } = await sb
          .from('categories')
          .select('id')
          .eq('tenant_id', tenant.id)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstCat) {
          validCatId = firstCat.id;
        } else {
          const { data: defaultCat } = await sb
            .from('categories')
            .insert({
              tenant_id: tenant.id,
              slug: 'menu-utama',
              name: 'Menu Utama',
              sort_order: 1,
            })
            .select('id')
            .single();
          validCatId = defaultCat?.id ?? null;
        }
      }

      if (!validCatId) {
        return NextResponse.json({
          ok: false,
          reason: 'Gagal menyiapkan kategori untuk produk.',
        });
      }

      const { error: prodErr } = await sb.from('products').upsert({
        id: prodId,
        tenant_id: tenant.id,
        category_id: validCatId,
        name: prod.name,
        description: prod.description || '',
        price: Math.max(0, Number(prod.price) || 0),
        emoji: prod.emoji || '☕',
        track_stock: Boolean(prod.trackStock),
        stock: Math.max(0, Number(prod.stock) || 0),
        min_stock: Math.max(0, Number(prod.minStock) || 0),
        is_active: prod.isActive !== false,
      });

      if (prodErr) {
        return NextResponse.json({ ok: false, reason: prodErr.message });
      }

      // Sync variants if provided
      if (Array.isArray(prod.variants)) {
        await sb.from('product_variants').delete().eq('product_id', prodId);
        if (prod.variants.length > 0) {
          await sb.from('product_variants').insert(
            prod.variants.map((v: any) => ({
              id: ensureUuid(v.id),
              product_id: prodId,
              name: v.name,
              price_delta: Number(v.priceDelta) || 0,
            }))
          );
        }
      }

      await insertAudit(body.auditLog);
      return NextResponse.json({
        ok: true,
        productId: prodId,
        categoryId: validCatId,
      });
    }

    if (body.type === 'DELETE_PRODUCT' && body.id) {
      if (isUuid(body.id)) {
        await sb
          .from('products')
          .delete()
          .eq('id', body.id)
          .eq('tenant_id', tenant.id);
      }
    }

    if (body.type === 'ADJUST_STOCK' && isUuid(body.productId)) {
      const nextStock = Math.max(0, Number(body.stockAfter) || 0);
      await sb
        .from('products')
        .update({ stock: nextStock })
        .eq('id', body.productId)
        .eq('tenant_id', tenant.id);

      await sb.from('stock_movements').insert({
        id: ensureUuid(body.movementId),
        tenant_id: tenant.id,
        product_id: body.productId,
        delta: Number(body.delta) || 0,
        stock_after: nextStock,
        reason: body.reason || 'Penyesuaian stok manual',
        actor_name: body.actorName || ctx.profile.fullName || 'Admin',
      });

      await insertAudit(body.auditLog);
    }

    // 5. DISCOUNTS CRUD
    if (body.type === 'UPSERT_DISCOUNT' && body.discount) {
      const d = body.discount;
      const discId = ensureUuid(d.id);
      await sb.from('discounts').upsert({
        id: discId,
        tenant_id: tenant.id,
        name: d.name,
        code: d.code || '',
        type: d.type,
        value: Math.max(1, Number(d.value) || 1),
        min_purchase: Math.max(0, Number(d.minPurchase) || 0),
        is_active: Boolean(d.isActive),
      });
      return NextResponse.json({ ok: true, discountId: discId });
    }

    if (body.type === 'TOGGLE_DISCOUNT' && isUuid(body.id)) {
      await sb
        .from('discounts')
        .update({ is_active: Boolean(body.isActive) })
        .eq('id', body.id)
        .eq('tenant_id', tenant.id);
    }

    if (body.type === 'DELETE_DISCOUNT' && isUuid(body.id)) {
      await sb
        .from('discounts')
        .delete()
        .eq('id', body.id)
        .eq('tenant_id', tenant.id);
    }

    // 6. ORDERS, ITEMS, PAYMENTS, STOCK MOVEMENTS & QUEUE PROGRESSION
    if (body.type === 'RECORD_ORDER' && body.order) {
      const ord = body.order;
      const orderId = ensureUuid(ord.id);

      // Verify discount_id exists if provided
      let validDiscountId: string | null = isUuid(ord.discountId)
        ? ord.discountId
        : null;
      if (validDiscountId) {
        const { data: dCheck } = await sb
          .from('discounts')
          .select('id')
          .eq('id', validDiscountId)
          .eq('tenant_id', tenant.id)
          .maybeSingle();
        if (!dCheck) validDiscountId = null;
      }

      const { data: insertedOrder, error: ordErr } = await sb
        .from('orders')
        .upsert(
          {
            id: orderId,
            tenant_id: tenant.id,
            order_no: ord.orderNo,
            queue_no: ord.queueNo,
            status: ord.status,
            order_type: ord.orderType,
            table_no: ord.tableNo || '',
            customer_name: ord.customerName || 'Pelanggan',
            subtotal: Number(ord.subtotal) || 0,
            discount_total: Number(ord.discountTotal) || 0,
            dpp_total: Number(ord.dppTotal) || 0,
            tax_total: Number(ord.taxTotal) || 0,
            service_total: Number(ord.serviceTotal) || 0,
            grand_total: Number(ord.grandTotal) || 0,
            cashier_id: ctx.userId,
            cashier_name: ord.cashierName || ctx.profile.fullName || 'Kasir',
            discount_id: validDiscountId,
            discount_name: ord.discountName || null,
            prep_status: ord.prepStatus || 'new',
            receipt_snapshot: ord.receiptSnapshot || {},
            created_at: ord.createdAt || new Date().toISOString(),
            paid_at: ord.paidAt || new Date().toISOString(),
          },
          { onConflict: 'tenant_id,order_no' }
        )
        .select('id')
        .single();

      if (ordErr || !insertedOrder) {
        return NextResponse.json({
          ok: false,
          reason: ordErr?.message || 'Failed to insert order',
        });
      }

      const dbOrderId = insertedOrder.id;

      if (Array.isArray(ord.items) && ord.items.length > 0) {
        // Insert order_items
        await sb.from('order_items').insert(
          ord.items.map((item: any) => ({
            id: ensureUuid(item.id),
            order_id: dbOrderId,
            product_id: isUuid(item.productId) ? item.productId : null,
            name_snapshot: item.name,
            price_snapshot: Number(item.unitPrice) || 0,
            qty: Number(item.qty) || 1,
            notes: item.notes || '',
            variant_label: item.variantLabel || '',
          }))
        );

        // Deduct stock in DB and insert stock_movements
        const qtyByProd: Record<string, number> = {};
        for (const item of ord.items) {
          if (isUuid(item.productId)) {
            qtyByProd[item.productId] =
              (qtyByProd[item.productId] || 0) + (Number(item.qty) || 1);
          }
        }

        for (const [prodId, deductQty] of Object.entries(qtyByProd)) {
          const { data: prodRow } = await sb
            .from('products')
            .select('stock, track_stock')
            .eq('id', prodId)
            .eq('tenant_id', tenant.id)
            .maybeSingle();

          if (prodRow && prodRow.track_stock) {
            const nextStock = Math.max(0, Number(prodRow.stock) - deductQty);
            await sb
              .from('products')
              .update({ stock: nextStock })
              .eq('id', prodId)
              .eq('tenant_id', tenant.id);

            await sb.from('stock_movements').insert({
              tenant_id: tenant.id,
              product_id: prodId,
              delta: -deductQty,
              stock_after: nextStock,
              reason: `Penjualan ${ord.orderNo}`,
              ref_order_id: dbOrderId,
              actor_name: ord.cashierName || ctx.profile.fullName || 'Kasir',
            });
          }
        }
      }

      // Insert payment record
      await sb.from('payments').insert({
        order_id: dbOrderId,
        method: ord.paymentMethod || 'cash',
        amount: Number(ord.grandTotal) || 0,
        received: Number(ord.paymentReceived) || Number(ord.grandTotal) || 0,
        change: Number(ord.paymentChange) || 0,
      });

      await insertAudit(body.auditLog);
      return NextResponse.json({ ok: true, orderId: dbOrderId });
    }

    if (body.type === 'ADVANCE_PREP' && isUuid(body.orderId)) {
      const patch: Record<string, any> = {
        prep_status: body.prepStatus,
      };
      if (body.prepStartedAt) patch.prep_started_at = body.prepStartedAt;
      if (body.readyAt) patch.ready_at = body.readyAt;
      if (body.deliveredAt) patch.delivered_at = body.deliveredAt;
      if (body.status) patch.status = body.status;

      await sb
        .from('orders')
        .update(patch)
        .eq('id', body.orderId)
        .eq('tenant_id', tenant.id);
    }

    if (body.type === 'VOID_ORDER' && isUuid(body.orderId)) {
      await sb
        .from('orders')
        .update({
          status: 'voided',
          prep_status: 'delivered',
          void_reason: body.reason || 'Void oleh Admin',
        })
        .eq('id', body.orderId)
        .eq('tenant_id', tenant.id);

      // Restore stock in DB from order_items
      const { data: items } = await sb
        .from('order_items')
        .select('product_id, qty')
        .eq('order_id', body.orderId);

      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.product_id) {
            const { data: prodRow } = await sb
              .from('products')
              .select('stock, track_stock')
              .eq('id', item.product_id)
              .eq('tenant_id', tenant.id)
              .maybeSingle();

            if (prodRow && prodRow.track_stock) {
              const nextStock = Number(prodRow.stock) + Number(item.qty);
              await sb
                .from('products')
                .update({ stock: nextStock })
                .eq('id', item.product_id)
                .eq('tenant_id', tenant.id);

              await sb.from('stock_movements').insert({
                tenant_id: tenant.id,
                product_id: item.product_id,
                delta: Number(item.qty),
                stock_after: nextStock,
                reason: `Void ${body.orderNo || ''}: ${body.reason || ''}`,
                ref_order_id: body.orderId,
                actor_name: body.actorName || ctx.profile.fullName || 'Admin',
              });
            }
          }
        }
      }

      await insertAudit(body.auditLog);
    }

    // 7. DAILY CLOSING (Tutup Buku)
    if (body.type === 'CLOSE_DAILY_BOOK' && body.closing) {
      const c = body.closing;
      await sb.from('daily_closings').insert({
        id: ensureUuid(c.id),
        tenant_id: tenant.id,
        closing_date: c.closingDate,
        shift_label: c.shiftLabel,
        total_orders: Number(c.totalOrders) || 0,
        gross_sales: Number(c.grossSales) || 0,
        total_discount: Number(c.totalDiscount) || 0,
        total_dpp: Number(c.totalDpp) || 0,
        total_tax: Number(c.totalTax) || 0,
        total_service: Number(c.totalService) || 0,
        net_revenue: Number(c.netRevenue) || 0,
        cash_sales: Number(c.cashSales) || 0,
        qris_sales: Number(c.qrisSales) || 0,
        transfer_sales: Number(c.transferSales) || 0,
        expected_cash: Number(c.expectedCash) || 0,
        actual_cash: Number(c.actualCash) || 0,
        difference: Number(c.difference) || 0,
        notes: c.notes || '',
        closed_by: c.closedBy || ctx.profile.fullName || 'Admin',
        locked_at: c.lockedAt || new Date().toISOString(),
      });

      await insertAudit(body.auditLog);
    }

    // 8. STAFF MANAGEMENT (USERNAME & PASSWORD INSIDE TENANT)
    if (body.type === 'ADD_STAFF' && body.staff) {
      if (ctx.profile.role !== 'admin' && ctx.profile.role !== 'superadmin') {
        return NextResponse.json({
          ok: false,
          reason: 'Hanya Owner / Admin yang dapat menambahkan akun staf.',
        });
      }

      const st = body.staff;
      const fullName = String(st.fullName || '').trim();
      const username = String(st.username || '')
        .trim()
        .toLowerCase();
      const pin = String(st.pin || '1234').trim() || '1234';
      const password = String(st.password || '').trim();

      if (!fullName || !username) {
        return NextResponse.json({
          ok: false,
          reason: 'Nama lengkap dan username staf wajib diisi.',
        });
      }
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
        return NextResponse.json({
          ok: false,
          reason:
            'Username harus 3–32 karakter (huruf kecil, angka, titik, underscore, atau strip).',
        });
      }
      if (password.length < 6) {
        return NextResponse.json({
          ok: false,
          reason: 'Kata sandi staf minimal 6 karakter.',
        });
      }

      const { data: biz } = await sb
        .from('business_settings')
        .select('socials')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      const existingAccounts: any[] = Array.isArray(
        biz?.socials?.staff_accounts
      )
        ? biz.socials.staff_accounts
        : [];
      const adminUsername = (
        (biz?.socials?.admin_username as string) ||
        (ctx.profile.email ? ctx.profile.email.split('@')[0] : 'admin')
      ).toLowerCase();

      if (
        username === adminUsername ||
        existingAccounts.some(
          (a: any) => String(a.username || '').toLowerCase() === username
        )
      ) {
        return NextResponse.json({
          ok: false,
          reason: `Username "@${username}" sudah digunakan. Pilih username lain.`,
        });
      }

      const staffId = ensureUuid(st.id);
      const newAccount = {
        id: staffId,
        fullName,
        username,
        role: 'staff' as const,
        pin,
        passwordHash: hashStaffPassword(password),
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const nextSocials = {
        ...(biz?.socials || {}),
        staff_accounts: [...existingAccounts, newAccount],
        staff_pins: {
          ...(biz?.socials?.staff_pins || {}),
          [staffId]: pin,
        },
      };

      const { error: updErr } = await sb
        .from('business_settings')
        .update({ socials: nextSocials })
        .eq('tenant_id', tenant.id);

      if (updErr) {
        return NextResponse.json({
          ok: false,
          reason: `Gagal menyimpan akun staf: ${updErr.message}`,
        });
      }

      await insertAudit(body.auditLog);
      return NextResponse.json({ ok: true, staffId, username });
    }

    if (body.type === 'VERIFY_STAFF_SWITCH') {
      const inputUsername = String(body.username || '')
        .trim()
        .toLowerCase();
      const inputPassword = String(body.password || '');
      const targetStaffId = body.targetStaffId
        ? String(body.targetStaffId)
        : undefined;

      if (!inputUsername || !inputPassword) {
        return NextResponse.json({
          ok: false,
          reason: 'Username dan kata sandi wajib diisi.',
        });
      }

      const [{ data: biz }, { data: profileRows }] = await Promise.all([
        sb
          .from('business_settings')
          .select('socials')
          .eq('tenant_id', tenant.id)
          .maybeSingle(),
        sb
          .from('profiles')
          .select('id, full_name, email, role, is_active')
          .eq('tenant_id', tenant.id),
      ]);

      const staffAccounts: any[] = Array.isArray(biz?.socials?.staff_accounts)
        ? biz.socials.staff_accounts
        : [];

      // 1. Check staff_accounts first
      const matchedStaff = staffAccounts.find((acc: any) => {
        if (targetStaffId && acc.id !== targetStaffId) return false;
        return String(acc.username || '').toLowerCase() === inputUsername;
      });

      if (matchedStaff) {
        if (matchedStaff.isActive === false) {
          return NextResponse.json({
            ok: false,
            reason: 'Akun staf ini sedang dinonaktifkan oleh Owner.',
          });
        }
        if (!verifyStaffPassword(inputPassword, matchedStaff.passwordHash)) {
          return NextResponse.json({
            ok: false,
            reason: 'Username atau kata sandi staf salah.',
          });
        }
        return NextResponse.json({
          ok: true,
          staffId: matchedStaff.id,
          role: 'staff',
          fullName: matchedStaff.fullName,
          username: matchedStaff.username,
        });
      }

      // 2. Check Admin (Owner) account
      const ownerProfile = (profileRows || []).find(
        (p: any) => p.role === 'admin' || p.role === 'superadmin'
      );

      if (ownerProfile) {
        const adminUsername = (
          (biz?.socials?.admin_username as string) ||
          (ownerProfile.email ? ownerProfile.email.split('@')[0] : 'admin')
        ).toLowerCase();

        const isAdminTarget =
          (!targetStaffId || targetStaffId === ownerProfile.id) &&
          (inputUsername === adminUsername ||
            inputUsername === String(ownerProfile.email || '').toLowerCase());

        if (isAdminTarget) {
          let verified = false;
          if (biz?.socials?.admin_password_hash) {
            verified = verifyStaffPassword(
              inputPassword,
              biz.socials.admin_password_hash
            );
          }
          // Fallback: verify against Owner's Supabase Auth email + password
          if (!verified && ownerProfile.email) {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (url && anonKey) {
              const disposable = createClient(url, anonKey, {
                auth: { persistSession: false, autoRefreshToken: false },
              });
              const { error: signInErr } =
                await disposable.auth.signInWithPassword({
                  email: ownerProfile.email,
                  password: inputPassword,
                });
              if (!signInErr) verified = true;
            }
          }

          if (verified) {
            return NextResponse.json({
              ok: true,
              staffId: ownerProfile.id,
              role: normalizeRole(ownerProfile.role),
              fullName: ownerProfile.full_name,
              username: adminUsername,
            });
          }
        }
      }

      return NextResponse.json({
        ok: false,
        reason: 'Username atau kata sandi salah.',
      });
    }

    if (body.type === 'UPDATE_STAFF_PASSWORD' && isUuid(body.staffId)) {
      if (ctx.profile.role !== 'admin' && ctx.profile.role !== 'superadmin') {
        return NextResponse.json({
          ok: false,
          reason: 'Hanya Owner / Admin yang dapat mengubah kredensial akun.',
        });
      }

      const { staffId, password, pin, username } = body;
      if (password && String(password).trim().length < 6) {
        return NextResponse.json({
          ok: false,
          reason: 'Kata sandi baru minimal 6 karakter.',
        });
      }

      const { data: biz } = await sb
        .from('business_settings')
        .select('socials')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      const staffAccounts: any[] = Array.isArray(biz?.socials?.staff_accounts)
        ? biz.socials.staff_accounts
        : [];
      const isStaffAccount = staffAccounts.some((a: any) => a.id === staffId);

      let nextSocials = { ...(biz?.socials || {}) };

      if (isStaffAccount) {
        nextSocials.staff_accounts = staffAccounts.map((a: any) => {
          if (a.id !== staffId) return a;
          return {
            ...a,
            ...(username
              ? { username: String(username).trim().toLowerCase() }
              : {}),
            ...(password
              ? { passwordHash: hashStaffPassword(String(password).trim()) }
              : {}),
            ...(pin ? { pin: String(pin).trim() } : {}),
          };
        });
      } else {
        // Updating Owner / Admin switch credentials
        if (username) {
          nextSocials.admin_username = String(username).trim().toLowerCase();
        }
        if (password) {
          nextSocials.admin_password_hash = hashStaffPassword(
            String(password).trim()
          );
        }
      }

      if (pin) {
        nextSocials.staff_pins = {
          ...(nextSocials.staff_pins || {}),
          [staffId]: String(pin).trim(),
        };
      }

      await sb
        .from('business_settings')
        .update({ socials: nextSocials })
        .eq('tenant_id', tenant.id);

      await insertAudit(body.auditLog);
      return NextResponse.json({ ok: true });
    }

    if (body.type === 'DELETE_STAFF' && isUuid(body.id)) {
      if (ctx.profile.role !== 'admin' && ctx.profile.role !== 'superadmin') {
        return NextResponse.json({
          ok: false,
          reason: 'Hanya Owner / Admin yang dapat menghapus akun staf.',
        });
      }

      if (body.id === ctx.userId) {
        return NextResponse.json({
          ok: false,
          reason: 'Tidak dapat menghapus akun Owner / Admin.',
        });
      }

      const { data: biz } = await sb
        .from('business_settings')
        .select('socials')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      const staffAccounts: any[] = Array.isArray(biz?.socials?.staff_accounts)
        ? biz.socials.staff_accounts
        : [];
      const nextSocials = {
        ...(biz?.socials || {}),
        staff_accounts: staffAccounts.filter((a: any) => a.id !== body.id),
      };

      await sb
        .from('business_settings')
        .update({ socials: nextSocials })
        .eq('tenant_id', tenant.id);

      // Clean up legacy profile row if one existed
      await sb
        .from('profiles')
        .delete()
        .eq('id', body.id)
        .eq('tenant_id', tenant.id)
        .neq('role', 'admin');

      await insertAudit(body.auditLog);
      return NextResponse.json({ ok: true });
    }

    if (body.type === 'TOGGLE_STAFF' && isUuid(body.id)) {
      if (ctx.profile.role !== 'admin' && ctx.profile.role !== 'superadmin') {
        return NextResponse.json({
          ok: false,
          reason: 'Hanya Owner / Admin yang dapat mengubah status staf.',
        });
      }

      const { data: biz } = await sb
        .from('business_settings')
        .select('socials')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      const staffAccounts: any[] = Array.isArray(biz?.socials?.staff_accounts)
        ? biz.socials.staff_accounts
        : [];
      const nextSocials = {
        ...(biz?.socials || {}),
        staff_accounts: staffAccounts.map((a: any) =>
          a.id === body.id ? { ...a, isActive: Boolean(body.isActive) } : a
        ),
      };

      await sb
        .from('business_settings')
        .update({ socials: nextSocials })
        .eq('tenant_id', tenant.id);

      await sb
        .from('profiles')
        .update({ is_active: Boolean(body.isActive) })
        .eq('id', body.id)
        .eq('tenant_id', tenant.id);

      await insertAudit(body.auditLog);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, reason: err?.message });
  }
}
