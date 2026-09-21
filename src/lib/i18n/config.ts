// UI locale configuration. Plain module (no runes), safe to import anywhere —
// keeps appLanguage.ts and i18n.svelte.ts free of circular runes imports.

export const LOCALES = ['en', 'de', 'es', 'fr', 'pt', 'ru', 'zh-Hans'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español (España)',
  fr: 'Français',
  pt: 'Português (Portugal)',
  ru: 'Русский',
  'zh-Hans': '简体中文',
};

export function isLocale(value: string | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

// Chinese is split by script rather than by language, and the browser reports a region
// ('zh-CN', 'zh-TW'), so the tag cannot simply be cut to two characters.
// navigator.language ('de-AT', 'en-GB', 'zh-TW', …) → a supported locale, default 'en'.
export function resolveBrowserLocale(): Locale {
  const tag = (navigator.language || 'en').toLowerCase();
  if (tag === 'zh' || tag.startsWith('zh-')) return 'zh-Hans';
  const base = tag.slice(0, 2);
  return isLocale(base) ? base : 'en';
}
