/**
 * Shrink a picked screenshot before it is uploaded. Browser-only — import it
 * from client components exclusively.
 *
 * Why this exists: the landing-page marquee loads every entry's picture at
 * once. A handful of untouched 3-5MB phone screenshots would outweigh the rest
 * of the page combined, and the strip renders them 84x48. Re-encoding to at
 * most MAX_EDGE px typically lands around 40-80KB with no visible loss at that
 * size.
 *
 * Every failure path returns the original File. A cosmetic optimisation must
 * never be the reason an upload fails.
 */
import { PROOF_MIME } from '@/lib/proof';

const MAX_EDGE = 800;

/** Below this, re-encoding buys nothing worth the CPU. */
const ALREADY_SMALL_BYTES = 300 * 1024;

const WEBP_QUALITY = 0.85;

export async function downscaleImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Corrupt or unsupported source: let the server be the judge of it.
    return file;
  }

  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_EDGE / longestEdge);
    if (scale === 1 && file.size <= ALREADY_SMALL_BYTES) return file;

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
    );

    // toBlob silently falls back to PNG where WebP encoding is missing, so the
    // blob's own type is the only trustworthy answer. Labelling PNG bytes as
    // WebP would upload a file whose Content-Type lies about its contents.
    const ext = blob ? PROOF_MIME[blob.type] : undefined;
    if (!blob || !ext || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, '') || 'proof';
    return new File([blob], `${base}.${ext}`, { type: blob.type });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
