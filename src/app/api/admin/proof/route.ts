import { NextResponse, type NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  PROOF_BUCKET,
  PROOF_MAX_BYTES,
  PROOF_MAX_RANK,
  PROOF_MIME,
  isValidDay,
  type ProofEntry,
  type ProofErrorCode,
} from '@/lib/proof';

export const dynamic = 'force-dynamic';
// The admin list must show what was just uploaded or deleted; without this it
// can serve the snapshot from the first request of the process.
export const fetchCache = 'force-no-store';

function fail(code: ProofErrorCode, status: number) {
  return NextResponse.json({ error: code }, { status });
}

/**
 * Publish one proof entry: a day, the rank reached that day, and a screenshot.
 *
 * Admin-only, gated by the same ADMIN_EMAILS check that guards the /admin page.
 * Errors come back as stable codes rather than prose so the bilingual admin UI
 * picks the language, not this handler.
 */
export async function POST(req: NextRequest) {
  if (!(await getAdminUser())) return fail('forbidden', 403);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('bad_type', 400);
  }

  const day = String(form.get('day') ?? '').trim();
  if (!isValidDay(day)) return fail('bad_day', 400);

  const rank = Number(String(form.get('rank') ?? '').trim());
  if (!Number.isInteger(rank) || rank < 1 || rank > PROOF_MAX_RANK) return fail('bad_rank', 400);

  const file = form.get('image');
  if (!(file instanceof File) || file.size === 0) return fail('no_image', 400);
  if (file.size > PROOF_MAX_BYTES) return fail('too_big', 400);

  const ext = PROOF_MIME[file.type];
  if (!ext) return fail('bad_type', 400);

  try {
    const supabase = getSupabaseAdmin();
    // Random key, not the row id: the object has to be written before the row
    // that would name it exists. Grouping by day keeps the bucket browsable.
    const path = `${day}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(PROOF_BUCKET)
      .upload(path, new Uint8Array(await file.arrayBuffer()), {
        contentType: file.type,
        // Keys are unique per upload, so the object at one key never changes.
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      console.error('[proof] upload failed:', uploadError.message);
      return fail('server', 502);
    }

    const { data, error } = await supabase
      .from('proof_entries')
      .insert({ day, rank, image_path: path })
      .select('id, day, rank, image_path')
      .single();

    if (error || !data) {
      // Roll the object back. An orphaned file is invisible but it is still
      // billed storage, and nothing else will ever come looking for it.
      await supabase.storage.from(PROOF_BUCKET).remove([path]);
      console.error('[proof] insert failed:', error?.message);
      return fail('server', 502);
    }

    const row = data as { id: number; day: string; rank: number; image_path: string };
    const entry: ProofEntry = {
      id: row.id,
      day: row.day,
      rank: row.rank,
      image_url: supabase.storage.from(PROOF_BUCKET).getPublicUrl(row.image_path).data.publicUrl,
    };

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    console.error('[proof] POST threw:', err instanceof Error ? err.message : err);
    return fail('server', 500);
  }
}

/**
 * Remove one entry — the escape hatch for a typo'd rank or the wrong
 * screenshot, since neither is editable in place.
 */
export async function DELETE(req: NextRequest) {
  if (!(await getAdminUser())) return fail('forbidden', 403);

  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id) || id < 1) return fail('not_found', 400);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error: readError } = await supabase
      .from('proof_entries')
      .select('image_path')
      .eq('id', id)
      .maybeSingle();

    if (readError) {
      console.error('[proof] delete lookup failed:', readError.message);
      return fail('server', 502);
    }
    if (!data) return fail('not_found', 404);

    const { error: deleteError } = await supabase.from('proof_entries').delete().eq('id', id);
    if (deleteError) {
      console.error('[proof] delete failed:', deleteError.message);
      return fail('server', 502);
    }

    // Row first, object second: the row is what the marquee reads, so this
    // order can only ever leak an unreferenced file. The reverse order would
    // leave a live entry pointing at a 404 image.
    const { error: removeError } = await supabase.storage
      .from(PROOF_BUCKET)
      .remove([(data as { image_path: string }).image_path]);
    if (removeError) {
      console.error('[proof] object remove failed, row already gone:', removeError.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[proof] DELETE threw:', err instanceof Error ? err.message : err);
    return fail('server', 500);
  }
}
