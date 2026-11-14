import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * Self-serve cafe registration.
 * Uses the Supabase Admin API to create the user with `email_confirm: true`
 * so newly registered cafe owners can sign in immediately and start the
 * onboarding wizard without getting blocked by development SMTP limits.
 */

const RegisterSchema = z.object({
  fullName: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter.').max(80),
  businessName: z
    .string()
    .trim()
    .min(2, 'Nama cafe minimal 2 karakter.')
    .max(80),
  email: z.string().trim().toLowerCase().email('Format email tidak valid.'),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter.')
    .max(72, 'Kata sandi maksimal 72 karakter.'),
  phone: z.string().trim().max(30).optional().default(''),
  planCode: z.enum(['basic', 'pro']).optional().default('pro'),
});

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

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: 'Layanan pendaftaran belum dikonfigurasi di server.' },
      { status: 503 }
    );
  }

  let parsed: z.infer<typeof RegisterSchema>;
  try {
    const json = await req.json();
    const result = RegisterSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error.issues[0]?.message || 'Data tidak valid.',
        },
        { status: 400 }
      );
    }
    parsed = result.data;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Format permintaan tidak valid.' },
      { status: 400 }
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Create confirmed auth user via Admin API
  const { data: createdAuth, error: createAuthError } =
    await admin.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.fullName,
        business_name: parsed.businessName,
      },
    });

  if (createAuthError || !createdAuth?.user) {
    const msg = (createAuthError?.message || '').toLowerCase();
    const friendly =
      msg.includes('already') || msg.includes('exists')
        ? 'Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.'
        : msg.includes('password')
          ? 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter.'
          : createAuthError?.message || 'Pendaftaran gagal. Silakan coba lagi.';
    return NextResponse.json({ ok: false, error: friendly }, { status: 400 });
  }

  const user = createdAuth.user;

  // 2. Provision tenant & related rows
  let tenantId: string | null = null;
  try {
    const { data: tenant, error: tenantErr } = await admin
      .from('tenants')
      .insert({
        name: parsed.businessName,
        slug: slugify(parsed.businessName),
        plan_code: parsed.planCode,
        onboarding_completed: false,
      })
      .select('id')
      .single();
    if (tenantErr || !tenant) throw tenantErr || new Error('tenant');
    tenantId = tenant.id;

    const results = await Promise.all([
      admin.from('subscriptions').insert({
        tenant_id: tenantId,
        plan_code: parsed.planCode,
        billing_cycle: 'monthly',
        status: 'trial',
      }),
      admin.from('business_settings').insert({
        tenant_id: tenantId,
        business_name: parsed.businessName,
        phone: parsed.phone,
        email: parsed.email,
        socials: { instagram: '', tax_enabled: true },
      }),
      admin.from('receipt_settings').insert({
        tenant_id: tenantId,
        wifi_ssid: '',
        wifi_password: '',
        qr_content: '',
        show_wifi: false,
        show_qr: false,
      }),
      admin.from('profiles').insert({
        id: user.id,
        tenant_id: tenantId,
        role: 'admin',
        full_name: parsed.fullName,
        email: parsed.email,
      }),
    ]);
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  } catch {
    if (tenantId) await admin.from('tenants').delete().eq('id', tenantId);
    await admin.auth.admin.deleteUser(user.id);
    return NextResponse.json(
      {
        ok: false,
        error:
          'Gagal menyiapkan akun cafe. Silakan coba lagi beberapa saat lagi.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    needsEmailConfirmation: false,
  });
}
