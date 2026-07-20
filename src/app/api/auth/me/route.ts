import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/serverAuth';
import { isAdminEmail } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/** Session probe for the client-side header menu. Never exposes more than the email. */
export async function GET() {
  const user = await getUser();
  return NextResponse.json({
    email: user?.email ?? null,
    isAdmin: isAdminEmail(user?.email),
  });
}
