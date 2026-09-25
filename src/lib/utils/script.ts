// Text both word processors set from the asian font and language slot. CJK punctuation and
// the fullwidth forms are script Common, so the property escapes miss them; LibreOffice
// sets both from the asian properties.
export const ASIAN_SCRIPT_RE =
  /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Hangul}\p{sc=Bopomofo}　-〿＀-￯]/u;
