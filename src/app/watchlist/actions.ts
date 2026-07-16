'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { DOGFOOD_USER_ID } from '@/lib/watchlist';

/** Add (or re-label) a contributor on the dogfooding user's watchlist. */
export async function addContributor(formData: FormData): Promise<void> {
  const contributorId = String(formData.get('contributor_id') ?? '').trim();
  const rawName = String(formData.get('contributor_name') ?? '').trim();
  if (!contributorId) return;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('watchlist').upsert(
    {
      user_id: DOGFOOD_USER_ID,
      contributor_id: contributorId,
      contributor_name: rawName || null,
    },
    { onConflict: 'user_id,contributor_id' },
  );
  if (error) throw new Error(`Không thêm được contributor: ${error.message}`);

  revalidatePath('/watchlist');
}

/** Remove a contributor from the dogfooding user's watchlist. */
export async function removeContributor(formData: FormData): Promise<void> {
  const contributorId = String(formData.get('contributor_id') ?? '').trim();
  if (!contributorId) return;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', DOGFOOD_USER_ID)
    .eq('contributor_id', contributorId);
  if (error) throw new Error(`Không xoá được contributor: ${error.message}`);

  revalidatePath('/watchlist');
}
