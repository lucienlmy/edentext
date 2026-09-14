// Bounds reflect a large office document while keeping one browser tab responsive.
export const IMPORT_LIMITS = {
  compressedBytes: 128 * 1024 * 1024,
  zipEntries: 10_000,
  zipEntryBytes: 64 * 1024 * 1024,
  zipTotalBytes: 256 * 1024 * 1024,
  zipCompressionRatio: 1_000,
} as const;

export class ImportLimitError extends Error {
  constructor(message: string) { super(message); this.name = 'ImportLimitError'; }
}
