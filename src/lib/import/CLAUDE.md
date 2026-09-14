# `src/lib/import/`

This directory imports ODF and DOCX into the TipTap schema; `imageFormats.ts` is shared.
Password-protected files are decrypted before either importer runs.

`importLimits.ts` bounds ZIP input to 128 MiB compressed, 10,000 entries, 32 MiB XML parts,
64 MiB media parts, 64 MiB other entries, 256 MiB total expansion, and a 1000:1 ratio before
extraction; it rejects over-budget archives and XML with DOCTYPE or entity declarations.
TIFF conversion also rejects more than 100 frames, 40 million pixels, or 160 MiB decoded RGBA
before it allocates an image buffer; unsupported images retain the importer's placeholder path.

ODF is parsed directly from `content.xml` and `styles.xml`; the library reader loses
structures the editor needs. Choose the importer from the extension, but retry the other
format after a failed parse so renamed files still open. Return unsupported content as
warnings where it can be safely flattened or omitted.

`StyleResolver` resolves named and automatic ODF styles through their parent chains;
`DocxStyles` provides the equivalent DOCX resolution. Keep only values that differ from
the resolved named style as direct formatting. Values equal to LibreOffice-compatible
editor defaults must remain implicit, or each round trip accumulates formatting.

Fit imported content to the editor schema without changing its semantic role: paragraph,
heading, list, table, frame, note, and field paths have separate constraints. Keep ODF and
DOCX behavior aligned unless the formats expose an unavoidable difference.

Read `docs/architecture/import.md` before changing parsing, style resolution, default
suppression, image conversion, headers/footers, or format-specific edge cases. Read the
focused architecture document for tables, frames, formulas, formatting, notes, or encryption.

Exercise `npm test` for importer changes; use `npm run test:lo` for format I/O changes.
