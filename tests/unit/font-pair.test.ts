// The western/asian font pair: a run, a paragraph and a style each carry both fonts,
// rendered as two variables that inherit on their own, so a run naming one keeps the
// other from its paragraph.
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '../../src/lib/editor/extensions/fontFamily';
import { BlockFontSize } from '../../src/lib/editor/extensions/blockFontSize';
import { FONT_PAIR_STACK, textDeclarations } from '../../src/lib/styles/styleSheet';

type N = any;

function makeEditor(content: N) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return new Editor({ element: el, extensions: [Document, Paragraph, Text, TextStyle, FontFamily, BlockFontSize], content });
}

const run = (text: string, attrs: Record<string, string>): N =>
  ({ type: 'text', text, marks: [{ type: 'textStyle', attrs }] });
const doc = (...content: N[]): N => ({ type: 'doc', content: [{ type: 'paragraph', content }] });

describe('font pair rendering', () => {
  it('sets only the variable a run names', () => {
    const ed = makeEditor(doc(run('漢字', { fontFamilyAsian: 'Yu Mincho' })));
    const style = ed.view.dom.querySelector('span')!.getAttribute('style')!;
    expect(style).toContain('--font-asian: "Yu Mincho"');
    expect(style).not.toContain('--font-west:');
    expect(style).toContain(`font-family: ${FONT_PAIR_STACK}`);
  });

  it('parses its own spans back into both attrs', () => {
    const ed = makeEditor(doc(run('mixed 漢字', { fontFamily: 'Arial', fontFamilyAsian: 'SimSun' })));
    const html = ed.getHTML();
    const back = makeEditor(html).getJSON().content![0].content![0].marks[0].attrs;
    expect(back).toMatchObject({ fontFamily: 'Arial', fontFamilyAsian: 'SimSun' });
  });

  it('reads a foreign font-family as the western font', () => {
    const ed = makeEditor('<p><span style="font-family: Georgia, serif">x</span></p>');
    expect(ed.getJSON().content![0].content![0].marks[0].attrs).toMatchObject({ fontFamily: 'Georgia', fontFamilyAsian: null });
  });

  it('carries the paragraph mark pair', () => {
    const ed = makeEditor({ type: 'doc', content: [{ type: 'paragraph', attrs: { fontFamilyAsian: 'SimHei' }, content: [{ type: 'text', text: 'x' }] }] });
    const p = ed.view.dom.querySelector('p')!;
    expect(p.getAttribute('data-block-font-family-asian')).toBe('SimHei');
    expect(makeEditor(ed.getHTML()).getJSON().content![0].attrs!.fontFamilyAsian).toBe('SimHei');
  });

  it('gives a style both variables and a sans tail for the heading font', () => {
    const decls = textDeclarations({ fontFamily: 'Arial', fontFamilyAsian: 'SimHei' });
    expect(decls).toContain("--font-west: 'Arial', 'Liberation Sans'");
    expect(decls).toContain('--font-tail: var(--font-heading)');
    expect(decls).toContain('--font-asian: "SimHei"');
  });
});
