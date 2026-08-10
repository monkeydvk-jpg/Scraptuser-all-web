import { FAQ_ITEMS } from '@/lib/structured-data';

/**
 * Visible FAQ. The text here must stay identical to FAQ_ITEMS, which also
 * feeds the FAQPage schema — both read from the same array, so they cannot drift.
 * Uses <details> so every answer is in the HTML even when visually collapsed.
 */
export function FaqSection() {
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-4 py-16">
      <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        Frequently asked questions
      </h2>
      <div className="space-y-3">
        {FAQ_ITEMS.map(({ question, answer }) => (
          <details
            key={question}
            className="group rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 open:bg-white/[0.04]"
          >
            <summary className="cursor-pointer list-none font-medium marker:content-none">
              <h3 className="inline text-base font-medium">{question}</h3>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-white/70">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
