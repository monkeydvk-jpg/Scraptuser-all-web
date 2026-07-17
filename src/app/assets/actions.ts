'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getUser } from '@/lib/supabase/serverAuth';
import { fetchAssetById } from '@/lib/adobeStock';
import { USER_AGENT } from '@/lib/adobeStats';

/**
 * Add (or re-label) an asset on the signed-in user's asset watchlist.
 * Validates the id against Adobe first so a bad id is rejected at input time,
 * and stores the scraped title + thumbnail for display.
 */
export async function addAsset(formData: FormData): Promise<void> {
  const assetId = String(formData.get('asset_id') ?? '').trim();
  const memo = String(formData.get('memo_name') ?? '').trim();
  if (!assetId) return;

  const user = await getUser();
  if (!user) throw new Error('Chưa đăng nhập');

  const file = await fetchAssetById(assetId, {
    deadline: Date.now() + 10_000,
    headers: { 'User-Agent': USER_AGENT },
  });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('asset_watchlist').upsert(
    {
      user_id: user.id,
      asset_id: assetId,
      asset_title: file.title ?? null,
      thumbnail_url: file.thumbnail_240_url ?? null,
      memo_name: memo || null,
    },
    { onConflict: 'user_id,asset_id' },
  );
  if (error) throw new Error(`Không thêm được asset: ${error.message}`);

  revalidatePath('/assets');
}

/** Remove an asset from the signed-in user's asset watchlist. */
export async function removeAsset(formData: FormData): Promise<void> {
  const assetId = String(formData.get('asset_id') ?? '').trim();
  if (!assetId) return;

  const user = await getUser();
  if (!user) throw new Error('Chưa đăng nhập');

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('asset_watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('asset_id', assetId);
  if (error) throw new Error(`Không xoá được asset: ${error.message}`);

  revalidatePath('/assets');
}
