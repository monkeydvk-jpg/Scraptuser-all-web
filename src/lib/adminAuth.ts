/**
 * Admin designation: an account is admin iff its email is listed in the
 * ADMIN_EMAILS env var (comma-separated, case-insensitive). Missing or empty
 * var means NOBODY is admin — fail closed.
 */
import type { User } from '@supabase/supabase-js';
import { getUser } from '@/lib/supabase/serverAuth';

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/** Session user when they are an admin, else null. Never throws. */
export async function getAdminUser(): Promise<User | null> {
  const user = await getUser();
  return user && isAdminEmail(user.email) ? user : null;
}
