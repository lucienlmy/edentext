// What the selection formats uniformly. Each reader returns the shared value,
// '' when the selection mixes two, and null where "no value" is meaningful.
// Framework-free, so a toolbar reads them inside its own reactive wrapper.

import type { EditorState } from '@tiptap/pm/state';
import { blockFontSize, DEFAULT_FONT_SIZE, type SizedBlock } from './fontSize';
import { ASIAN_SCRIPT_RE } from './script';

export const DEFAULT_EDITOR_FONT = 'Liberation Serif';

type MarkedNode = {
  isText: boolean;
  isInline: boolean;
  isAtom: boolean;
  attrs: Record<string, unknown>;
  marks: readonly { type: { name: string }; attrs: Record<string, string> }[];
};

// A node that carries text formatting: a text node, or an inline atom (a date
// field, say) bearing the mark. Selecting such an atom makes a NodeSelection, so
// without this its font, size and colour would all read as the default.
export function bearsMark(node: MarkedNode, markName: string): boolean {
  return node.isText || (node.isInline && node.isAtom && node.marks.some((m) => m.type.name === markName));
}

// Walks the selection and returns the one value every node agrees on, '' if they
// disagree. `read` returns undefined for a node that carries no opinion.
function uniform<T>(state: EditorState, read: (node: MarkedNode, parent: MarkedNode | null) => T | undefined): T | '' | undefined {
  const { from, to } = state.selection;
  let value: T | undefined;
  let mixed = false;
  state.doc.nodesBetween(from, to, (node, _pos, parent) => {
    if (mixed) return;
    const v = read(node as unknown as MarkedNode, parent as unknown as MarkedNode | null);
    if (v === undefined) return;
    if (value === undefined) value = v;
    else if (value !== v) mixed = true;
  });
  return mixed ? '' : value;
}

function storedMarkAttr(state: EditorState, markName: string, attr: string): string | undefined {
  const marks = state.storedMarks ?? state.selection.$head.marks();
  return marks.find((m) => m.type.name === markName)?.attrs[attr] as string | undefined;
}

// The font the box shows: Chinese, Japanese or Korean text reads its asian font, other
// text the western one, so a selection over both shows a font only where the two agree.
// At a bare caret the character before it decides.
export function uniformFont(state: EditorState): string {
  const west = (attrs?: Record<string, string>) => attrs?.fontFamily ?? DEFAULT_EDITOR_FONT;
  const asian = (attrs?: Record<string, string>) => attrs?.fontFamilyAsian ?? west(attrs);
  const { from, to, empty, $head } = state.selection;
  if (empty) {
    const attrs = (state.storedMarks ?? $head.marks()).find((m) => m.type.name === 'textStyle')?.attrs;
    return ASIAN_SCRIPT_RE.test($head.nodeBefore?.text?.slice(-1) ?? '') ? asian(attrs) : west(attrs);
  }
  const fonts = new Set<string>();
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!bearsMark(node as unknown as MarkedNode, 'textStyle')) return;
    const attrs = node.marks.find((m) => m.type.name === 'textStyle')?.attrs;
    const text = node.text?.slice(Math.max(0, from - pos), to - pos) ?? '';
    if (!node.isText || /[^\s]/u.test(text.replace(new RegExp(ASIAN_SCRIPT_RE.source, 'gu'), ''))) fonts.add(west(attrs));
    if (ASIAN_SCRIPT_RE.test(text)) fonts.add(asian(attrs));
  });
  return fonts.size > 1 ? '' : [...fonts][0] ?? DEFAULT_EDITOR_FONT;
}

export function uniformFontSize(state: EditorState): string {
  if (state.selection.empty) {
    const head = state.selection.$head;
    return storedMarkAttr(state, 'textStyle', 'fontSize') ?? blockFontSize(head.parent as unknown as SizedBlock);
  }
  const v = uniform<string>(state, (node, parent) => {
    if (!bearsMark(node, 'textStyle')) return undefined;
    const explicit = node.marks.find((m) => m.type.name === 'textStyle')?.attrs.fontSize;
    return explicit || blockFontSize(parent as unknown as SizedBlock);
  });
  return v ?? DEFAULT_FONT_SIZE;
}

// null = no colour anywhere. Font colour rides the textStyle mark (fontColor.ts),
// highlight its own multicolor mark.
export function uniformMarkColor(state: EditorState, markName: string): string | null {
  if (state.selection.empty) return storedMarkAttr(state, markName, 'color') ?? null;
  const v = uniform<string | null>(state, (node) =>
    bearsMark(node, markName)
      ? (node.marks.find((m) => m.type.name === markName)?.attrs.color ?? null)
      : undefined);
  return v === undefined ? null : v;
}

// A block attribute every selected block agrees on (lineHeight, spaceBefore,
// backgroundColor …). `fallback` is what a block without the attribute reports.
export function uniformBlockAttr<T>(state: EditorState, attr: string, fallback: T): T | '' {
  if (state.selection.empty) return (state.selection.$head.parent.attrs[attr] ?? fallback) as T;
  const v = uniform<T>(state, (node) => (attr in node.attrs ? ((node.attrs[attr] ?? fallback) as T) : undefined));
  return v === undefined ? fallback : v;
}

// The language in force across the selection — a run's own beats its block's, and a
// block that names none reports null (the document's). '' where the selection mixes two.
export function uniformLanguage(state: EditorState): string | null | '' {
  const runLang = (node: MarkedNode, parent: MarkedNode | null) =>
    (node.marks.find((m) => m.type.name === 'textStyle')?.attrs.lang as string | undefined)
    ?? (parent?.attrs.lang as string | undefined) ?? null;
  if (state.selection.empty) {
    const head = state.selection.$head;
    return storedMarkAttr(state, 'textStyle', 'lang') ?? (head.parent.attrs.lang as string | null) ?? null;
  }
  const v = uniform<string | null>(state, (node, parent) =>
    bearsMark(node, 'textStyle') ? runLang(node, parent) : undefined);
  return v === undefined ? null : v;
}
