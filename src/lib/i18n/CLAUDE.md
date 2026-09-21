# `src/lib/i18n/`

The UI language. Distinct from the per-document spell-check language
(`storage/documentLanguage.ts`), which has its own list and its own dictionaries.

`locales/en.ts` is the source of truth: `type Messages = typeof en` is the contract every
other catalog satisfies, so a missing key is a `npm run check` error, not a runtime blank.
Interpolated and counted entries are functions. Catalogs are imported statically in
`i18n.svelte.ts` and `catalogs` is a `Record<Locale, Messages>`, so a new locale cannot be
half-added.

**Adding one** — a file in `locales/`, its code in `LOCALES` and its endonym in
`LOCALE_LABELS` (`config.ts`), the import and the `catalogs` entry, and a tag in
`LOCALE_TAG` (`utils/dateTime.ts`) so `Intl` gets a region for date fields and the status
bar. `tests/unit/templates.test.ts` iterates `LOCALES` and covers the new catalog on its
own; the `templates:` block is what the built-in templates read at call time.

**Codes are full BCP-47 tags, not always two letters.** Chinese ships as `zh-Hans`: the
written standard is one language, the scripts are two, and the terminology goes with the
script. `resolveBrowserLocale` therefore maps `navigator.language` by hand for `zh*`
rather than slicing two characters off it.

A UI locale is **not** automatically a spell-check language. `loadDocumentLanguage`
falls back to the UI locale on first run and must keep checking `isValid`: Chinese has no
Hunspell dictionary — none is meaningful, there are no word delimiters and no inflection —
so it leaves checking off rather than fetching a 404 or writing a language the document
cannot express.
