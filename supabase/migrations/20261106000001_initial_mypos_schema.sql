-- ============================================================================
-- MyPOS: Universal Multi-Tenant SaaS POS for Cafes
-- Complete Database Schema, RLS Policies, Atomic RPCs & Initial Seed
-- Reference: docs/PRD.md (v0.4) & Proposal SiMoca
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. PLANS (Basic & Pro SaaS Tiers)
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code in ('basic', 'pro')),
  name text not null,
  price_monthly integer not null check (price_monthly >= 0),
  price_yearly integer not null check (price_yearly >= 0),
  limits jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. TENANTS (Cafes)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan_code text not null default 'pro' references public.plans(code),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3. SUBSCRIPTIONS (SaaS Billing Lifecycle)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  plan_code text not null references public.plans(code),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  status text not null default 'trial' check (status in ('trial', 'active', 'past_due', 'suspended')),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  current_period_end timestamptz not null default (now() + interval '14 days'),
  gateway_ref text,
  updated_at timestamptz not null default now()
);

-- 4. INVOICES (SaaS Billing History)
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_no text not null unique,
  plan_code text not null references public.plans(code),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  amount integer not null check (amount >= 0),
  status text not null default 'paid' check (status in ('pending', 'paid', 'failed')),
  period_label text not null,
  gateway_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- 5. PROFILES (RBAC: Admin/Owner, Cashier, Waiter/Barista)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null check (role in ('admin', 'cashier', 'waiter')),
  full_name text not null,
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 6. BUSINESS SETTINGS (Custom Business Identity)
create table if not exists public.business_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  business_name text not null,
  tagline text not null default '',
  logo_text text not null default '☕',
  logo_url text,
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  website text not null default '',
  socials jsonb not null default '{"instagram": ""}'::jsonb,
  tax_id text not null default '',
  timezone text not null default 'Asia/Jakarta',
  currency text not null default 'IDR',
  tax_name text not null default 'PB1 / PPN',
  tax_rate numeric(5,2) not null default 10.00 check (tax_rate > 0),
  service_rate numeric(5,2) not null default 0.00 check (service_rate >= 0),
  tax_inclusive boolean not null default false,
  rounding_rule text not null default 'nearest_1' check (rounding_rule in ('nearest_1', 'nearest_100', 'nearest_500')),
  updated_at timestamptz not null default now()
);

-- 7. RECEIPT SETTINGS (Custom Receipt Format & Template)
create table if not exists public.receipt_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  template text not null default 'minimal' check (template in ('minimal', 'classic', 'modern')),
  paper_width integer not null default 58 check (paper_width in (58, 80)),
  font_size text not null default 'normal' check (font_size in ('small', 'normal', 'large')),
  align_header text not null default 'center' check (align_header in ('left', 'center')),
  show_logo boolean not null default true,
  show_tagline boolean not null default true,
  show_address boolean not null default true,
  show_phone boolean not null default true,
  show_social boolean not null default true,
  show_cashier boolean not null default true,
  show_table boolean not null default true,
  show_customer boolean not null default true,
  show_wifi boolean not null default true,
  show_qr boolean not null default true,
  header_text text not null default '',
  footer_text text not null default 'Terima kasih atas kunjungannya!',
  wifi_ssid text not null default 'KopiSenja_Guest',
  wifi_password text not null default 'senja12345',
  qr_content text not null default 'https://instagram.com/kopisenja.id',
  number_prefix text not null default 'INV',
  auto_print boolean not null default true,
  open_drawer boolean not null default true,
  language text not null default 'id' check (language in ('id', 'en')),
  updated_at timestamptz not null default now()
);

-- 8. PRINTERS (Thermal Printer Configurations)
create table if not exists public.printers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null default 'Printer Kasir Utama',
  connection text not null default 'usb' check (connection in ('usb', 'serial', 'bluetooth', 'agent')),
  paper_width integer not null default 58 check (paper_width in (58, 80)),
  auto_cut boolean not null default true,
  open_drawer boolean not null default true,
  copies integer not null default 1 check (copies between 1 and 5),
  created_at timestamptz not null default now()
);

-- 9. CATEGORIES
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

-- 10. PRODUCTS (Enforces stock >= 0 encapsulation from SiMoca)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  emoji text not null default '☕',
  image_path text,
  track_stock boolean not null default true,
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 5 check (min_stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 11. PRODUCT VARIANTS
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price_delta integer not null default 0
);

-- 12. DISCOUNTS
create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  code text not null default '',
  type text not null check (type in ('percent', 'amount')),
  value integer not null check (value > 0),
  min_purchase integer not null default 0 check (min_purchase >= 0),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- 13. ORDERS (Pay-First Flow & Prep Queue + Immutable Receipt Snapshot)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_no text not null,
  queue_no text not null,
  status text not null default 'paid' check (status in ('draft', 'pending_payment', 'paid', 'completed', 'voided')),
  order_type text not null default 'dine_in' check (order_type in ('dine_in', 'takeaway')),
  table_no text not null default '',
  customer_name text not null default '',
  subtotal integer not null check (subtotal >= 0),
  discount_total integer not null default 0 check (discount_total >= 0),
  dpp_total integer not null default 0 check (dpp_total >= 0),
  tax_total integer not null default 0 check (tax_total >= 0),
  service_total integer not null default 0 check (service_total >= 0),
  grand_total integer not null check (grand_total >= 0),
  cashier_id uuid,
  cashier_name text not null default 'Kasir',
  discount_id uuid references public.discounts(id) on delete set null,
  discount_name text,
  prep_status text not null default 'new' check (prep_status in ('new', 'preparing', 'ready', 'delivered')),
  prep_started_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz,
  void_reason text,
  receipt_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz not null default now(),
  unique (tenant_id, order_no)
);

-- 14. ORDER ITEMS
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name_snapshot text not null,
  price_snapshot integer not null check (price_snapshot >= 0),
  qty integer not null check (qty > 0),
  notes text not null default '',
  variant_label text not null default ''
);

-- 15. PAYMENTS
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null check (method in ('cash', 'qris', 'transfer')),
  amount integer not null check (amount >= 0),
  received integer not null check (received >= 0),
  change integer not null default 0 check (change >= 0),
  reference text not null default '',
  created_at timestamptz not null default now()
);

-- 16. STOCK MOVEMENTS
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  delta integer not null,
  stock_after integer not null,
  reason text not null,
  ref_order_id uuid references public.orders(id) on delete set null,
  actor_name text not null default 'Sistem',
  created_at timestamptz not null default now()
);

-- 17. DAILY CLOSINGS (Tutup Buku Harian - Immutable Record)
create table if not exists public.daily_closings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  closing_date date not null,
  shift_label text not null default 'Shift Harian',
  total_orders integer not null default 0,
  gross_sales integer not null default 0,
  total_discount integer not null default 0,
  total_dpp integer not null default 0,
  total_tax integer not null default 0,
  total_service integer not null default 0,
  net_revenue integer not null default 0,
  cash_sales integer not null default 0,
  qris_sales integer not null default 0,
  transfer_sales integer not null default 0,
  expected_cash integer not null default 0,
  actual_cash integer not null default 0,
  difference integer not null default 0,
  notes text not null default '',
  closed_by text not null,
  locked_at timestamptz not null default now()
);

-- 18. AUDIT LOGS
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_name text not null,
  actor_role text not null,
  action text not null,
  entity text not null,
  entity_id text not null default '',
  details text not null default '',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE (KNF-01 & KNF-08)
-- ============================================================================
create index if not exists idx_products_tenant on public.products(tenant_id, is_active);
create index if not exists idx_orders_tenant_created on public.orders(tenant_id, created_at desc);
create index if not exists idx_orders_prep_status on public.orders(tenant_id, prep_status);
create index if not exists idx_stock_movements_tenant on public.stock_movements(tenant_id, created_at desc);
create index if not exists idx_daily_closings_tenant on public.daily_closings(tenant_id, closing_date desc);

-- ============================================================================
-- ATOMIC RPC: pay_order (Validates stock, deducts stock, snapshots receipt)
-- ============================================================================
create or replace function public.pay_order(
  p_tenant_id uuid,
  p_order_no text,
  p_queue_no text,
  p_order_type text,
  p_table_no text,
  p_customer_name text,
  p_subtotal integer,
  p_discount_total integer,
  p_dpp_total integer,
  p_tax_total integer,
  p_service_total integer,
  p_grand_total integer,
  p_cashier_name text,
  p_discount_id uuid,
  p_discount_name text,
  p_payment_method text,
  p_payment_received integer,
  p_payment_change integer,
  p_receipt_snapshot jsonb,
  p_items jsonb
) returns uuid
language plpgsql
security definer
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_prod_id uuid;
  v_qty integer;
  v_track boolean;
  v_stock_after integer;
begin
  -- 1. Create order in paid state & queue 'new'
  insert into public.orders (
    tenant_id, order_no, queue_no, status, order_type, table_no, customer_name,
    subtotal, discount_total, dpp_total, tax_total, service_total, grand_total,
    cashier_name, discount_id, discount_name, prep_status, receipt_snapshot, paid_at
  ) values (
    p_tenant_id, p_order_no, p_queue_no, 'paid', p_order_type, p_table_no, p_customer_name,
    p_subtotal, p_discount_total, p_dpp_total, p_tax_total, p_service_total, p_grand_total,
    p_cashier_name, p_discount_id, p_discount_name, 'new', p_receipt_snapshot, now()
  ) returning id into v_order_id;

  -- 2. Iterate items, deduct stock atomically, insert order_items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_prod_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'qty')::integer;

    select track_stock into v_track
    from public.products
    where id = v_prod_id and tenant_id = p_tenant_id
    for update;

    if v_track then
      update public.products
      set stock = stock - v_qty
      where id = v_prod_id and tenant_id = p_tenant_id and stock >= v_qty
      returning stock into v_stock_after;

      if not found then
        raise exception 'Stok produk % tidak mencukupi untuk jumlah %', (v_item->>'name'), v_qty;
      end if;

      insert into public.stock_movements (
        tenant_id, product_id, delta, stock_after, reason, ref_order_id, actor_name
      ) values (
        p_tenant_id, v_prod_id, -v_qty, v_stock_after, 'Penjualan ' || p_order_no, v_order_id, p_cashier_name
      );
    end if;

    insert into public.order_items (
      order_id, product_id, name_snapshot, price_snapshot, qty, notes, variant_label
    ) values (
      v_order_id,
      v_prod_id,
      v_item->>'name',
      (v_item->>'price')::integer,
      v_qty,
      coalesce(v_item->>'notes', ''),
      coalesce(v_item->>'variant_label', '')
    );
  end loop;

  -- 3. Record payment
  insert into public.payments (
    order_id, method, amount, received, change
  ) values (
    v_order_id, p_payment_method, p_grand_total, p_payment_received, p_payment_change
  );

  return v_order_id;
end;
$$;

-- ============================================================================
-- SEED PLANS (Basic & Pro)
-- ============================================================================
insert into public.plans (code, name, price_monthly, price_yearly, limits, features)
values
  (
    'basic',
    'Basic Plan',
    99000,
    990000,
    '{"max_users": 3, "max_products": 50, "max_active_discounts": 1, "history_days": 90}'::jsonb,
    '{
      "custom_receipt_templates": false,
      "receipt_qr_code": false,
      "receipt_custom_prefix": false,
      "product_variants": false,
      "csv_import_export": false,
      "hold_and_split_bill": false,
      "advanced_reports": false,
      "digital_receipt_share": false,
      "kitchen_ticket_printer": false
    }'::jsonb
  ),
  (
    'pro',
    'Pro Plan',
    249000,
    2490000,
    '{"max_users": 15, "max_products": 999999, "max_active_discounts": 999, "history_days": 9999}'::jsonb,
    '{
      "custom_receipt_templates": true,
      "receipt_qr_code": true,
      "receipt_custom_prefix": true,
      "product_variants": true,
      "csv_import_export": true,
      "hold_and_split_bill": true,
      "advanced_reports": true,
      "digital_receipt_share": true,
      "kitchen_ticket_printer": true
    }'::jsonb
  )
on conflict (code) do update
set
  price_monthly = excluded.price_monthly,
  price_yearly = excluded.price_yearly,
  limits = excluded.limits,
  features = excluded.features;
