import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/serverAuth';
import { isAdminEmail } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
// Same Data-Cache trap as /api/proof and /api/stats/visitors: the Supabase
// auth call goes through Next's patched fetch. A cached session probe would
// keep telling the header "signed out" after a real login. Not reproduced
// here — added because the mechanism is identical and the failure is silent.
export const fetchCache = 'force-no-store';

/** Session probe for the client-side header menu. Never exposes more than the email. */
export async function GET() {
  const user = await getUser();
  return NextResponse.json({
    email: user?.email ?? null,
    isAdmin: isAdminEmail(user?.email),
  });
}
