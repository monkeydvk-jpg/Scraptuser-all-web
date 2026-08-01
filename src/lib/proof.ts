/**
 * Shared contract for the "proof of use" entries: admin-published daily rank
 * screenshots that scroll across the landing page.
 *
 * Imported by both client components and route handlers, so it must stay free
 * of any server-only import.
 */

export const PROOF_BUCKET = 'proof';

/**
 * Hard server-side ceiling on one upload. The admin form downscales far below
 * this before sending; the cap exists so a hand-rolled request cannot park a
 * huge object in the bucket.
 */
export const PROOF_MAX_BYTES = 2 * 1024 * 1024;

/** Accepted upload types, mapped to the extension used for the object key. */
export const PROOF_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * How many entries the strip carries. It loops forever, so a longer list is
 * never read to the end — it only costs every visitor more image bytes.
 */
export const PROOF_LIMIT = 20;

/** Ranks above this are a typo, not a rank. */
export const PROOF_MAX_RANK = 100_000_000;

export interface ProofEntry {
  id: number;
  /** 'YYYY-MM-DD', exactly as stored — never a parsed Date, so no timezone can
   *  shift the day between the server and the browser. */
  day: string;
  rank: number;
  /** Public object URL, ready to drop into `<img src>`. */
  image_url: string;
}

/**
 * Stable error codes returned by the admin route. The client maps these to
 * translated copy, so the API never has to pick a language.
 */
export type ProofErrorCode =
  | 'forbidden'
  | 'bad_day'
  | 'bad_rank'
  | 'no_image'
  | 'too_big'
  | 'bad_type'
  | 'not_found'
  | 'server';

/** 'YYYY-MM-DD' and nothing else. */
export const PROOF_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when `day` is a real calendar date. The regex alone accepts 2026-02-31;
 * ISO parsing rejects out-of-range components, which is the check that matters.
 */
export function isValidDay(day: string): boolean {
  return PROOF_DAY_RE.test(day) && !Number.isNaN(Date.parse(day));
}

/** 'YYYY-MM-DD' -> 'DD/MM', by string surgery so no Date and no timezone. */
export function formatProofDay(day: string): string {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}
