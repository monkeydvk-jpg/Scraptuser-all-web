/** Server-rendered JSON-LD. Not a client component — crawlers must see this in the HTML. */
export function JsonLd({ schema }: { schema: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        // Escape "<" so a "</script>" inside any string cannot break out of the tag.
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }}
    />
  );
}
