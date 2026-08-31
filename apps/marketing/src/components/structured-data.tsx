type StructuredDataProps = {
  id: string;
  data: Record<string, unknown> | Record<string, unknown>[];
};

/**
 * Emits JSON-LD. Rendered from a server component, so the markup is present in
 * the initial HTML that crawlers parse.
 */
export function StructuredData({ id, data }: StructuredDataProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      // The payload is authored in this repository, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
