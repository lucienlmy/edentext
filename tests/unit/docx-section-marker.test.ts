// The section marker is ordinal: the editor counts the blocks carrying `sectionBreak` to
// index the header/footer sets. Only a paragraph or heading carries it, so a section
// opening with a table or an index must not silently drop one and shift every later
// section onto the page setup of the one before it.
import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { importDocx } from '../../src/lib/import/docx';

type N = any;

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const para = (text: string) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
const table = (text: string) =>
  `<w:tbl><w:tr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>${para(text)}</w:tc></w:tr></w:tbl>`;
const sect = (orient: 'portrait' | 'landscape') => orient === 'landscape'
  ? '<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/></w:sectPr>'
  : '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>';
const ends = (orient: 'portrait' | 'landscape') => `<w:p><w:pPr>${sect(orient)}</w:pPr></w:p>`;

const build = (body: string) => importDocx(zipSync({
  '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
  'word/document.xml': strToU8(`<?xml version="1.0"?><w:document ${W}><w:body>${body}${sect('portrait')}</w:body></w:document>`),
}) as Uint8Array);

// Every top-level block carrying the marker, in document order.
const marks = (r: any): N[] => r.content.content.filter((b: N) => b.attrs?.sectionBreak === true);

describe('docx section markers', () => {
  it('keeps the marker count and the header/footer sets aligned', () => {
    // Three sections; the second opens with a table, which cannot carry the marker.
    const r = build(para('one') + ends('portrait')
      + table('two') + para('two tail') + ends('landscape')
      + para('three'));
    expect(r.hfSections).toHaveLength(3);
    expect(marks(r)).toHaveLength(2);
    // The landscape section is the second, not the third: the marker fell on the table's
    // following paragraph rather than being dropped.
    expect(r.hfSections?.[1].orientation).toBe('landscape');
    // Null where the section is on the document's own paper — the importer suppresses
    // a value the document already carries.
    expect(r.hfSections?.[2].orientation).toBeNull();
  });

  it('drops the set of a section no block of which can be marked', () => {
    const r = build(para('one') + ends('portrait')
      + table('two') + ends('landscape')
      + para('three'));
    // The table-only section carries no marker, so its set goes with it — one marker,
    // and the section it opens is the one that marker really starts.
    expect(marks(r)).toHaveLength(1);
    expect(r.hfSections).toHaveLength(2);
    expect(r.hfSections?.[1].orientation).toBeNull();
  });
});
