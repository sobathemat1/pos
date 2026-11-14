-- ============================================================================
-- Migration: 3 Roles (superadmin, admin, staff) & Username-based Staff Auth
-- ============================================================================

-- 1. Normalize existing legacy roles ('cashier', 'waiter') to 'staff'
update public.profiles
set role = 'staff'
where role in ('cashier', 'waiter');

-- 2. Update role check constraint on public.profiles to allow only 3 roles
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('superadmin', 'admin', 'staff'));

-- 3. Add optional username column on profiles for owner/superadmin switch
alter table public.profiles
  add column if not exists username text;
