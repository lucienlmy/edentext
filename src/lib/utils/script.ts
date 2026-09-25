// Text both word processors set from the asian font and language slot. CJK punctuation and
// the fullwidth forms are script Common, so the property escapes miss them; LibreOffice
// sets both from the asian properties.
export const ASIAN_SCRIPT_RE =
  /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Hangul}\p{sc=Bopomofo}　-〿＀-￯]/u;

// More East Asian characters than Latin letters: the text of a Chinese, Japanese or
// Korean document. ponytail: a count over the whole text, blind to styles and hidden
// text; vote per paragraph if a mixed document misreads.
export function mostlyAsian(text: string): boolean {
  const asian = text.match(new RegExp(ASIAN_SCRIPT_RE.source, 'gu'))?.length ?? 0;
  return asian > (text.match(/\p{sc=Latin}/gu)?.length ?? 0);
}
