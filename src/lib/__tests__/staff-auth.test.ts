import { describe, expect, it } from 'vitest';
import {
  hashStaffPassword,
  isSuperadminUser,
  normalizeRole,
  verifyStaffPassword,
} from '../staff-auth';

describe('Staff Auth & 3-Role Model (superadmin, admin, staff)', () => {
  it('normalizes legacy roles (cashier, waiter) into staff', () => {
    expect(normalizeRole('superadmin')).toBe('superadmin');
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('cashier')).toBe('staff');
    expect(normalizeRole('waiter')).toBe('staff');
    expect(normalizeRole('staff')).toBe('staff');
    expect(normalizeRole(undefined)).toBe('staff');
  });

  it('hashes and verifies staff passwords safely with scrypt', () => {
    const hash = hashStaffPassword('Kasir#2026');
    expect(hash).toContain(':');
    expect(verifyStaffPassword('Kasir#2026', hash)).toBe(true);
    expect(verifyStaffPassword('Salah123', hash)).toBe(false);
    expect(verifyStaffPassword('', hash)).toBe(false);
  });

  it('detects superadmin from profile role or app_metadata', () => {
    expect(isSuperadminUser({ email: 'a@b.com' }, 'superadmin')).toBe(true);
    expect(
      isSuperadminUser(
        { email: 'a@b.com', app_metadata: { role: 'superadmin' } },
        'admin'
      )
    ).toBe(true);
    expect(isSuperadminUser({ email: 'owner@cafe.com' }, 'admin')).toBe(false);
  });
});
