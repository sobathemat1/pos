import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSuperadminUser } from '@/lib/staff-auth';
import { SuperadminTenantSummary } from '@/types/pos';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('your-project-id')) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function verifySuperadmin() {
  const serverClient = await createSupabaseServerClient();
  if (!serverClient) return null;
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  if (!isSuperadminUser(user, profile?.role)) {
    return null;
  }

  return { user, admin, profile };
}

export async function GET() {
  const ctx = await verifySuperadmin();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, reason: 'Akses ditolak. Khusus Superadmin Platform SaaS.' },
      { status: 403 }
    );
  }

  const { admin } = ctx;

  try {
    const [
      { data: tenants },
      { data: subscriptions },
      { data: profiles },
      { data: bizSettings },
      { data: products },
      { data: orders },
    ] = await Promise.all([
      admin.from('tenants').select('*').order('created_at', { ascending: false }),
      admin.from('subscriptions').select('*'),
      admin.from('profiles').select('id, tenant_id, full_name, email, role'),
      admin.from('business_settings').select('tenant_id, business_name, socials'),
      admin.from('products').select('id, tenant_id'),
      admin.from('orders').select('id, tenant_id, grand_total, status'),
    ]);

    const subByTenant = new Map<string, any>();
    for (const s of subscriptions || []) {
      subByTenant.set(s.tenant_id, s);
    }

    const bizByTenant = new Map<string, any>();
    for (const b of bizSettings || []) {
      bizByTenant.set(b.tenant_id, b);
    }

    const ownerByTenant = new Map<string, { name: string; email: string }>();
    const profileCountByTenant = new Map<string, number>();
    for (const p of profiles || []) {
      profileCountByTenant.set(
        p.tenant_id,
        (profileCountByTenant.get(p.tenant_id) || 0) + 1
      );
      if (p.role === 'admin' || !ownerByTenant.has(p.tenant_id)) {
        ownerByTenant.set(p.tenant_id, {
          name: p.full_name || 'Owner',
          email: p.email || '-',
        });
      }
    }

    const productCountByTenant = new Map<string, number>();
    for (const prod of products || []) {
      productCountByTenant.set(
        prod.tenant_id,
        (productCountByTenant.get(prod.tenant_id) || 0) + 1
      );
    }

    const orderStatsByTenant = new Map<
      string,
      { count: number; revenue: number }
    >();
    for (const ord of orders || []) {
      const prev = orderStatsByTenant.get(ord.tenant_id) || {
        count: 0,
        revenue: 0,
      };
      const isValid = ord.status !== 'voided';
      orderStatsByTenant.set(ord.tenant_id, {
        count: prev.count + 1,
        revenue: prev.revenue + (isValid ? Number(ord.grand_total) || 0 : 0),
      });
    }

    const tenantSummaries: SuperadminTenantSummary[] = (tenants || []).map(
      (t: any) => {
        const sub = subByTenant.get(t.id);
        const biz = bizByTenant.get(t.id);
        const owner = ownerByTenant.get(t.id) || { name: '-', email: '-' };
        const ordStat = orderStatsByTenant.get(t.id) || {
          count: 0,
          revenue: 0,
        };
        const staffAccountsCount = Array.isArray(biz?.socials?.staff_accounts)
          ? biz.socials.staff_accounts.length
          : 0;
        const staffCount =
          (profileCountByTenant.get(t.id) || 0) + staffAccountsCount;

        return {
          id: t.id,
          name: biz?.business_name || t.name,
          slug: t.slug,
          planCode: (sub?.plan_code || t.plan_code || 'basic') as
            | 'basic'
            | 'pro',
          subscriptionStatus: sub?.status || 'trial',
          billingCycle: sub?.billing_cycle || 'monthly',
          onboardingCompleted: Boolean(t.onboarding_completed),
          ownerName: owner.name,
          ownerEmail: owner.email,
          productsCount: productCountByTenant.get(t.id) || 0,
          ordersCount: ordStat.count,
          staffCount,
          totalRevenue: ordStat.revenue,
          createdAt: t.created_at,
        };
      }
    );

    const proCount = tenantSummaries.filter((t) => t.planCode === 'pro').length;
    const basicCount = tenantSummaries.filter(
      (t) => t.planCode === 'basic'
    ).length;
    const activeCount = tenantSummaries.filter(
      (t) => t.subscriptionStatus === 'active' || t.subscriptionStatus === 'trial'
    ).length;
    const totalOrdersPlatform = tenantSummaries.reduce(
      (acc, t) => acc + t.ordersCount,
      0
    );
    const totalGmvPlatform = tenantSummaries.reduce(
      (acc, t) => acc + t.totalRevenue,
      0
    );

    return NextResponse.json({
      ok: true,
      summary: {
        totalTenants: tenantSummaries.length,
        activeTenants: activeCount,
        proTenants: proCount,
        basicTenants: basicCount,
        totalOrders: totalOrdersPlatform,
        totalGmv: totalGmvPlatform,
      },
      tenants: tenantSummaries,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, reason: err?.message || 'Gagal memuat data superadmin.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const ctx = await verifySuperadmin();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, reason: 'Akses ditolak. Khusus Superadmin Platform SaaS.' },
      { status: 403 }
    );
  }

  const { admin } = ctx;

  try {
    const body = await req.json();

    if (
      body.type === 'UPDATE_TENANT_PLAN' &&
      body.tenantId &&
      (body.planCode === 'basic' || body.planCode === 'pro')
    ) {
      await Promise.all([
        admin
          .from('tenants')
          .update({ plan_code: body.planCode })
          .eq('id', body.tenantId),
        admin
          .from('subscriptions')
          .update({
            plan_code: body.planCode,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', body.tenantId),
      ]);
      return NextResponse.json({ ok: true });
    }

    if (
      body.type === 'UPDATE_TENANT_STATUS' &&
      body.tenantId &&
      ['trial', 'active', 'past_due', 'suspended'].includes(body.status)
    ) {
      await admin
        .from('subscriptions')
        .update({
          status: body.status,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', body.tenantId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, reason: 'Aksi tidak dikenal.' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, reason: err?.message || 'Gagal memproses permintaan.' },
      { status: 500 }
    );
  }
}
