-- ============================================================================
-- Migration: Add optional PPN / Tax Toggle (tax_enabled)
-- Allows cafe owners to enable or disable PPN calculation per tenant
-- ============================================================================

alter table public.business_settings
  add column if not exists tax_enabled boolean not null default true;

alter table public.business_settings
  drop constraint if exists business_settings_tax_rate_check;

alter table public.business_settings
  add constraint business_settings_tax_rate_check check (tax_rate >= 0);
