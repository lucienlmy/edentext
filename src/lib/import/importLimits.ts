// Bounds reflect a large office document while keeping one browser tab responsive.
export const IMPORT_LIMITS = {
  compressedBytes: 128 * 1024 * 1024,
  zipEntries: 10_000,
  zipEntryBytes: 64 * 1024 * 1024,
  zipTotalBytes: 256 * 1024 * 1024,
  zipCompressionRatio: 1_000,
  xmlPartBytes: 32 * 1024 * 1024,
  mediaPartBytes: 64 * 1024 * 1024,
  textRunChars: 100_000,
  tableSpan: 1_000,
  chartPoints: 100_000,
  convertedImagePixels: 40_000_000,
  convertedImageBytes: 160 * 1024 * 1024,
} as const;

export class ImportLimitError extends Error {
  constructor(message: string) { super(message); this.name = 'ImportLimitError'; }
}

/** A complete decimal integer within an inclusive safe range, otherwise null. */
export function boundedInt(value: string | null | undefined, min: number, max: number): number | null {
  if (!value || !/^-?\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}

export function parseImportXml(xml: string, format: 'odt' | 'docx'): Document {
  if (/<!(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw new Error(`Not a valid .${format} file (unsafe XML).`);
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error(`Not a valid .${format} file (malformed XML).`);
  return doc;
}
