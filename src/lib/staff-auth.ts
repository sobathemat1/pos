import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { UserRole } from '@/types/pos';

/**
 * Normalizes any legacy role string ('cashier', 'waiter', etc.) into the 3-role model:
 * 'superadmin' | 'admin' | 'staff'.
 */
export function normalizeRole(role?: string | null): UserRole {
  if (role === 'superadmin') return 'superadmin';
  if (role === 'admin') return 'admin';
  return 'staff';
}

/**
 * Hashes a plain-text password using scrypt with a random 16-byte salt.
 */
export function hashStaffPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * Timing-safe verification of a plain-text password against a stored `salt:hash` string.
 */
export function verifyStaffPassword(
  password: string,
  storedHash?: string | null
): boolean {
  if (!password || !storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  try {
    const keyBuffer = Buffer.from(keyHex, 'hex');
    const derivedBuffer = scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedBuffer.length) return false;
    return timingSafeEqual(keyBuffer, derivedBuffer);
  } catch {
    return false;
  }
}

/**
 * Checks whether an authenticated Supabase user holds the 'superadmin' SaaS platform role.
 */
export function isSuperadminUser(
  user?: {
    email?: string | null;
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
  } | null,
  profileRole?: string | null
): boolean {
  if (profileRole === 'superadmin') return true;
  if (user?.app_metadata?.role === 'superadmin') return true;
  const envList = (process.env.SUPERADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (user?.email && envList.includes(user.email.trim().toLowerCase())) {
    return true;
  }
  return false;
}
