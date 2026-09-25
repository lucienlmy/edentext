import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';
import { asianLang, isAsianTag, westLang } from '../../storage/documentLanguage';

// The language of a paragraph and of a run, the two levels LibreOffice and Word both
// carry (ODF fo:language/fo:country, Word w:lang). The value is the full tag ('en-US'),
// not one of our dictionary codes: a document in a language we have no dictionary for
// must still save the language it came with. Each level carries a western language
// (`lang`) and an asian one (`langAsian`), the two slots both formats keep.

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    language: {
      /** The paragraph's language; null falls back to the document's. */
      setBlockLanguage: (tag: string | null) => ReturnType;
      /** The selection's language, as a run. */
      setRunLanguage: (tag: string | null) => ReturnType;
    };
  }
}

// A real `lang` attribute, not a data-*: CSS hyphenation and the browser's own spell
// check both read it. It names the western language, the asian one only where there is
// none, which is also how a pasted asian `lang` comes in.
const blockAttr = {
  lang: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => westLang(element.getAttribute('lang')),
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.lang ? { lang: String(attributes.lang) } : {},
  },
  langAsian: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute('data-lang-asian') || asianLang(element.getAttribute('lang')),
    renderHTML: (attributes: Record<string, unknown>) => {
      if (!attributes.langAsian) return {};
      const tag = String(attributes.langAsian);
      return attributes.lang ? { 'data-lang-asian': tag } : { 'data-lang-asian': tag, lang: tag };
    },
  },
};

// The slot a tag goes to; null clears both.
const slot = (tag: string | null) =>
  tag === null ? { lang: null, langAsian: null } : isAsianTag(tag) ? { langAsian: tag } : { lang: tag };

export const Language = Extension.create({
  name: 'language',

  addOptions() {
    return {
      types: ['paragraph', 'heading'] as string[],
    };
  },

  addGlobalAttributes() {
    return [
      { types: this.options.types, attributes: blockAttr },
      { types: ['textStyle'], attributes: blockAttr },
    ];
  },

  addCommands() {
    return {
      setBlockLanguage: (tag) => ({ commands }) =>
        this.options.types.map((type) => commands.updateAttributes(type, slot(tag))).some((r) => r),

      setRunLanguage: (tag) => ({ chain }) =>
        chain().setMark('textStyle', slot(tag)).removeEmptyTextStyle().run(),
    };
  },
});
