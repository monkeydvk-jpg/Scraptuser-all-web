'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/useT';
import { formatProofDay, type ProofEntry } from '@/lib/proof';

/**
 * Seconds of travel per card. Scaling the duration by the card count keeps a
 * three-entry strip from sprinting and a twenty-entry one from crawling.
 */
const SEC_PER_CARD = 6;

/**
 * The landing page's proof strip: real daily ranks the owner published, each
 * with the screenshot it came from.
 *
 * Deliberately does NOT use the `.lp-reveal` class. The landing page collects
 * those elements in a one-shot IntersectionObserver on mount, and this section
 * only exists after its fetch resolves — it would be observed by nobody and sit
 * at opacity 0 forever. `.anim-up` is a self-contained CSS animation instead.
 */
export default function ProofMarquee() {
  const t = useT();
  const [items, setItems] = useState<ProofEntry[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch('/api/proof');
        const data: unknown = await res.json();
        if (alive && Array.isArray(data)) setItems(data as ProofEntry[]);
      } catch {
        // Stay hidden. A decorative strip must never surface an error on the
        // landing page.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (items.length === 0) return null;

  // The track carries the list twice, so translating it exactly -50% lands on
  // the copy's first card and the loop has no seam. This depends on every card
  // occupying identical width including its spacing, which is why .lp-proof
  // uses margin-right and the track has no flex `gap`.
  const track = [...items, ...items];

  return (
    <section className="lp-section lp-proof-wrap anim-up">
      <div className="lp-section-head">
        <h2>{t('lp_proof_title')}</h2>
        <p>{t('lp_proof_sub')}</p>
      </div>

      <div className="lp-marquee">
        <div
          className="lp-marquee-track"
          style={{ animationDuration: `${items.length * SEC_PER_CARD}s` }}
        >
          {track.map((entry, i) => (
            <figure
              className="lp-proof"
              key={`${entry.id}-${i}`}
              /* The second pass is the same content twice over; hide it from
                 assistive tech so the list is not read out doubled. */
              aria-hidden={i >= items.length}
            >
              <img src={entry.image_url} alt="" width={84} height={48} loading="lazy" decoding="async" />
              <figcaption>
                <span className="lp-proof-day">{formatProofDay(entry.day)}</span>
                <span className="lp-proof-rank">
                  {t('lp_proof_rank')} {entry.rank.toLocaleString('en-US')}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
