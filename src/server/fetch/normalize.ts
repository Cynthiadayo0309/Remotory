const BLOCK_ELEMENTS =
  /<\/?(?:address|article|aside|blockquote|br|dd|div|dl|dt|figcaption|figure|footer|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi;
const TAGS = /<[^>]+>/g;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeEntities(value: string): string {
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi,
    (entity, decimal: string, hexadecimal: string, named: string) => {
      if (decimal) {
        const codePoint = Number.parseInt(decimal, 10);
        return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      if (hexadecimal) {
        const codePoint = Number.parseInt(hexadecimal, 16);
        return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      return NAMED_ENTITIES[named.toLowerCase()] ?? entity;
    },
  );
}

export function normalizeExtractedMarkup(value: string): string {
  return decodeEntities(value.replace(BLOCK_ELEMENTS, "\n").replace(TAGS, " "))
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v\u00a0 ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findCharset(bytes: Uint8Array, contentTypeHeader: string): string {
  const headerCharset = contentTypeHeader.match(
    /charset\s*=\s*["']?([^;\s"']+)/i,
  )?.[1];
  if (headerCharset) return headerCharset;

  const prefix = new TextDecoder("latin1").decode(bytes.slice(0, 4096));
  const metaCharset = prefix.match(
    /<meta[^>]+charset\s*=\s*["']?\s*([a-z0-9._-]+)/i,
  )?.[1];
  return metaCharset ?? "utf-8";
}

export function decodePageBytes(
  bytes: Uint8Array,
  contentTypeHeader: string,
): string {
  const charset = findCharset(bytes, contentTypeHeader);
  return new TextDecoder(charset, { fatal: true }).decode(bytes);
}

export async function normalizePageDocument(
  bytes: Uint8Array,
  contentTypeHeader: string,
): Promise<string> {
  const decoded = decodePageBytes(bytes, contentTypeHeader);
  const mediaType = contentTypeHeader.split(";", 1)[0]!.trim().toLowerCase();
  if (mediaType === "text/plain") {
    return normalizeExtractedMarkup(decoded);
  }

  const response = new Response(decoded, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  const sanitizedHtml = await new HTMLRewriter()
    .on("script, style, noscript, template, svg", {
      element(element: Element) {
        element.remove();
      },
    })
    .transform(response)
    .text();
  return normalizeExtractedMarkup(sanitizedHtml);
}
