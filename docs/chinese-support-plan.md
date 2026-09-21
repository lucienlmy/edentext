# Chinesisch: alles Sinnvolle außer Rechtschreibprüfung und Senkrechtsatz

## Context

Chinesisch ist seit `1eaa120`/`ce24a95` Programmsprache, seit `663dc53`/`823cefd`
stimmt die Schrift chinesischer Läufe beim DOCX-Export und das Schriftmenü führt
die CJK-Familien. Die Nutzerannahme für diesen Plan: **es gibt viele potentielle
chinesische Nutzer**, also wird alles umgesetzt, was ihnen konkret hilft — nicht
nur, was Datenverlust verhindert.

Drei Erkundungen (Listen-Nummerierung, i18n/Dokumentsprache/Prüfung,
Satz/Eingabe) haben den Bestand abgeklopft. Ergebnis: das Fundament trägt
bereits — Ruby läuft in beiden Formaten hin und zurück, der `lang`-Zustand ist
pro Lauf und Absatz modelliert, die Seitenumbruchmessung ist rein geometrisch
(also CJK-sicher), die IME-kritischen Stellen (`autoCorrect.ts`,
`wordCompletion.ts`) sind bereits komponierungsfest, und die zh-Kataloge sind
vollständig. Was fehlt, sind sieben klar abgegrenzte Posten.

**Bewusst außen vor:**

- **Rechtschreib- und Grammatikprüfung** — Hunspell braucht Worttrenner, das
  Chinesische hat keine; `WORD_RE` (`spellCheck.ts:25`) verschlänge einen ganzen
  Satz als ein Token. Bräuchte einen Segmentierer und eine andere Fehlerklasse.
- **Senkrechter Satz** (縦書き) — eigenes Layoutmodell, eigene Seitenrechnung.
- **Schriftpaar westlich/asiatisch pro Lauf** — vom Nutzer auf einen eigenen
  Plan vertagt. Heute trägt ein Lauf eine Schrift; ein englisches Wort mitten im
  chinesischen Absatz wird deshalb in der chinesischen Schrift gesetzt. Sichtbar,
  aber kein Verlust an der Datei. **Alles unten bleibt mit dieser Entscheidung
  verträglich** und nimmt das Paar nicht vorweg.

---

## 1 — `feat:` Chinesisch als Dokumentsprache, ohne Wörterbuch

Heute ist `LANGUAGES` (`src/lib/storage/documentLanguage.ts:24`) die Liste der
**Wörterbücher**, und der Sprachwähler baut seine Menüs allein daraus. Ein
chinesisches Dokument landet deshalb zwangsläufig auf `NO_LANGUAGE`: die Datei
sagt dann gar keine Sprache, Word hält den Text für Englisch, unterkringelt
jedes Zeichen und wählt Schrift- und Umbruchvorgaben nach der falschen Sprache.
Die Sprache eines Dokuments und das Vorhandensein eines Wörterbuchs sind zwei
Dinge; hier werden sie getrennt.

- `LanguageDef` bekommt ein optionales `noDict?: true`. Neue Einträge:
  `{ code: 'zh-CN', label: '中文（简体）', odf: { language: 'zh', country: 'CN' }, noDict: true }`
  und `zh-TW` / `中文（繁體）`. (`zh-HK` erst auf Nachfrage — jeder Eintrag ist ein
  Menüpunkt.)
- `loadChecker` (`src/lib/spell/dictionary.ts:53`) und `loadThesaurus`
  (`spell/thesaurus.ts`) geben für `noDict` sofort `null` zurück, statt einen
  404 zu holen und `console.error` zu schreiben. `SpellController.isEnabled()`
  ist damit unverändert falsch, und `buildDecorations` liefert weiter nichts —
  die Prüfung bleibt also aus, ohne Sonderfall im Extension-Code.
- `ThesaurusDialog.svelte:98` und die Wörterbuch-abhängigen Menüs filtern
  `noDict` heraus; der Sprachwähler (`LanguagePicker.svelte:66,71`) zeigt sie.
  Im Wähler ist ein Eintrag ohne Wörterbuch als solcher zu kennzeichnen — Muster
  dafür ist `GrammarToggle.svelte:16` (`t().grammar.unavailable`); ein neuer
  Katalogschlüssel `spellPicker.noDictionary`, in allen acht Katalogen.
- `loadDocumentLanguage()` darf jetzt beim ersten Start für ein zh-Browserprofil
  `zh-CN`/`zh-TW` liefern statt `NO_LANGUAGE` — `codeForTag('zh-CN')` findet den
  Eintrag von selbst, sobald er in `LANGUAGES` steht.
- `tests/unit/documentLanguage.test.ts` erweitern: `zh-CN` ist gültig, liefert
  kein Wörterbuch, und `languageFromOdf('zh','TW')` trifft den richtigen Eintrag.

## 2 — `fix:` eine ostasiatische Sprache gehört in den asiatischen Slot

Beide Formate führen Sprache dreifach (westlich / asiatisch / komplex), und
beide Programme lesen chinesischen Text **nur** aus dem asiatischen Slot. Der
Export schreibt heute ausschließlich den westlichen:
`fo:language`/`fo:country` (`export/odt.ts:3411-3417`, `:3569`) und
`w:lang w:val` (`export/docx.ts:505`, `:1129`, `:2395`, `:2985`). Ein Dokument,
das nach Posten 1 „zh-CN" sagen kann, sagt es damit an der Stelle, an der es
niemand liest.

- Ein Helfer neben `odfFromTag` in `storage/documentLanguage.ts`:
  `asianTag(tag)` → `/^(zh|ja|ko)\b/i`. (Der komplexe Slot — Hebräisch,
  Arabisch — bleibt ausdrücklich unangetastet.)
- **DOCX:** die `docx`-Bibliothek kann das bereits —
  `ILanguageOptions = { value?, eastAsia?, bidirectional? }`
  (`node_modules/docx/dist/index.d.ts:1280`). Also
  `language: { eastAsia: tag }` statt `{ value: tag }`, wo `asianTag` zutrifft;
  dieselbe Fallunterscheidung in den beiden handgeschriebenen `w:lang`-Stellen
  (`:1129` im Lauf-`rPr`, `:2395` am Absatzmarken-`rPr`). Word schreibt es
  genauso: `w:val` bleibt dann die westliche Sprache.
- **ODT:** `style:language-asian`/`style:country-asian` statt
  `fo:language`/`fo:country`, an denselben zwei Stellen.
- **Import, beide Richtungen:** `langFromProps` (`import/odt.ts:1483`) liest
  zusätzlich `style:language-asian`, der DOCX-Import zusätzlich
  `w:lang/@w:eastAsia` — asiatischer Slot gewinnt, wenn beide dastehen, denn das
  ist die Sprache des Textes.
- **Dazu die eine Schriftstelle, die ohne das Schriftpaar auskommt:** die
  Dokumentvorgabe. `buildStyles` (`export/docx.ts:2984`) schreibt heute
  `{ font: DOC_FONT, size: 24 }`, und die Bibliothek setzt Times New Roman damit
  in alle vier `w:rFonts`-Slots, `w:eastAsia` eingeschlossen. Für ein
  chinesisches Dokument ist das die falsche Vorgabe für jeden Han-Lauf ohne
  eigene Schrift. `IFontAttributesProperties` (`index.d.ts:1211`) nimmt die
  Objektform: bei asiatischer Dokumentsprache
  `font: { ascii: DOC_FONT, hAnsi: DOC_FONT, cs: DOC_FONT, eastAsia: <CJK> }`,
  mit `<CJK>` = `SimSun` für `zh-CN`, `PMingLiU` für `zh-TW`. In ODF dasselbe an
  `style:font-name-asian` der Standardvorlage (`export/odt.ts:1909`, `:2092`).
  Das ist **kein** Schriftpaar pro Lauf, nur die Vorgabe des Dokuments.
- Test in `tests/unit/complex-script.test.ts` (die Datei besitzt das Thema
  „Eigenschaft nach Schriftsystem"): ein Dokument mit Sprache `zh-CN` exportieren
  und `w:lang w:eastAsia="zh-CN"` bzw. `style:language-asian="zh"` erwarten, und
  die Runde zurück über den Importer.

## 3 — `feat:` chinesische Listennummerierung

`formatOrdinal` (`utils/orderedListTypes.ts:127`) kennt `1/a/A/i/I`; beide
Importer fallen bei allem anderen auf `decimal` zurück
(`orderedTypeFromFormat:139`, `wordFmtChar` in `import/docx.ts:829`). Eine mit
一、二、三 nummerierte Liste kommt also als 1., 2., 3. an und geht so wieder
hinaus — der einzige echte Datenverlust in diesem Plan.

Vier neue Zeilen in `ORDERED_LIST_TYPES`, in Wortmarke und Suffix an das
angelehnt, was chinesische Dokumente tatsächlich benutzen:

| Marke | ODF `style:num-format` | DOCX `LevelFormat` | CSS `counter()` |
|---|---|---|---|
| 一、二、三 | `一` | `CHINESE_COUNTING` | `simp-chinese-informal` |
| 壹、貳、參 | `壹` | `CHINESE_LEGAL_SIMPLIFIED` | `simp-chinese-formal` |
| 甲、乙、丙 | `甲` | `IDEOGRAPH_TRADITIONAL` | `cjk-heavenly-stem` |
| ①②③ | `1` + Kreisform | `DECIMAL_ENCLOSED_CIRCLE` | `@counter-style` mit Symbolen |

Anzufassen:

- `OrderedTypeDef['numFormat']` wird um die vier Zeichen erweitert, `numSuffix`
  um das ideografische Komma `、` und den leeren Suffix (für ①). **`NoteNumFormat`
  (`storage/noteSettings.ts:11`) wird dabei von `OrderedTypeDef` abgekoppelt** und
  behält die schmale Union `'1'|'a'|'A'|'i'|'I'` — Fußnoten, Seitenzahlen und
  Kapitelnummerierung bleiben außen vor, sonst zieht der Umbau durch
  `outlineNumbering.ts:46` (`Record<NoteNumFormat, string>`), `pageNumbering.ts`
  und drei Dialoge.
- `formatOrdinal`: zwei kleine Erzeuger daneben — chinesische Zahlwörter
  (informell und formell teilen eine Funktion mit zwei Ziffernsätzen) und die
  Kreisziffern ①–⑳ mit Rückfall auf die Dezimalzahl darüber. Diese Funktion
  speist auch die Querverweise (`listStyle.ts:88`) und den **PDF-Export**
  (`export/pdf.ts:187`), der die Marke als echten Text setzt, weil html2canvas
  kein `counter()` rastert — beide profitieren automatisch.
- `editor.css:747-759`: je eine Regel nach demselben Muster, plus ein
  `@counter-style` für die Kreisziffern.
- DOCX-Export: vier Einträge in `ORDERED_FORMAT` (`export/docx.ts:115`); die
  `LevelFormat`-Konstanten existieren in der Bibliothek bereits
  (`index.d.ts:2020-2082`). DOCX-Import: dieselben vier in `wordFmtChar`
  (`import/docx.ts:829`) rückwärts.
- ODT: `orderedTypeFromFormat` findet die neuen Zeilen von selbst, sobald sie in
  der Tabelle stehen; der Export schreibt `style:num-format` ohnehin aus der
  Tabelle (`export/odt.ts:2481`, `:2955`, `:2980`).
- **Vorher zu klären, mit `soffice`, nicht aus dem Gedächtnis:** ODF kodiert die
  CJK-Formate als das *erste Zeichen der Folge* (`一`, `壹`, `甲`) — das ist die
  Lesart der Spezifikation, aber LibreOffice ist hier die Wahrheit. Erster
  Schritt dieses Commits: in LibreOffice eine Liste je Format anlegen, als `.odt`
  und `.docx` speichern, `content.xml` und `numbering.xml` ansehen, und die
  Tabelle danach ausrichten. Die Probe gehört als Zeile in
  `src/lib/utils/CLAUDE.md` oder `docs/architecture/formatting.md`, nicht in eine
  Commit-Nachricht.
- Tests: `tests/unit/ordered-list-types.test.ts` (Erzeuger und Rückschlag),
  `tests/unit/docx-export.test.ts` (`w:numFmt="chineseCounting"`), und eine
  Runde durch beide Formate.

## 4 — `fix:` Wortzählung und chinesische Papierformate

- `countText` (`utils/wordCount.ts:26`) zählt `\S+`: ein chinesischer Absatz ist
  damit **ein** Wort. Word zählt jedes Han-Zeichen als eines. Regel danach:
  CJK-Zeichen einzeln (`\p{Script=Han}`, Kana, Hangul), der Rest wie bisher als
  Folge von Nicht-Leerzeichen. Die Zeichenzahlen stimmen schon.
  `tests/unit/word-count.test.ts` um einen chinesischen Fall erweitern.
- `PAGE_FORMAT_CM` (`storage/pageFormat.ts:16`): `k16: { w: 18.4, h: 26 }` und
  `k32: { w: 13, h: 18.4 }` — 16开/32开, was in China im Büro tatsächlich läuft.
  Labels in allen acht Katalogen (`locales/*.ts:~259`, neben `jisB4`).

## 5 — `feat:` Datum, Währung und Tabellensprache folgen dem Gebietsschema

- `DATE_FORMATS` (`utils/dateTime.ts:30`) bekommt zwei ostasiatische Bilder:
  `ymd_cjk` (`2026年3月15日`) und `ymd_cjk_short` (`2026/03/15`), gebaut aus den
  vorhandenen Token plus `lit`-Zeichen. Die Vorgabe `DEFAULT_DATE_FORMAT`
  (`:128`) ist heute global `dmy_dots`; sie wird eine kleine Zuordnung
  Gebietsschema → Schlüssel (`zh-*` → `ymd_cjk`, `en` → `mdy_slash`, sonst
  `dmy_dots`), die `templates/builders.ts:34` und der Feld-Dialog abfragen.
  Gespeicherte Felder behalten ihr Bild — nur die Vorauswahl ändert sich.
- `CURRENCY_BY_REGION` (`utils/cellFormat.ts:87`): `CN: 'CNY'`, `TW: 'TWD'`,
  `HK: 'HKD'`, `MO: 'MOP'`, `SG: 'SGD'`.
- `tableLanguage()` (`storage/tableOptions.svelte.ts:28`) gibt bei `NO_LANGUAGE`
  heute hart `'en'` zurück; künftig `localeTag(locale())`, also die
  Oberflächensprache, und erst danach `'en'`. Sonst rechnet ein chinesisches
  Dokument weiter in US-Konventionen.

## 6 — `fix:` Verzeichnistitel übersetzen

`INDEX_TITLES` und `EMPTY_HINT` (`extensions/tableOfContents.ts:41-47`) sind
englische Literale; ein frisch eingefügtes Verzeichnis heißt deshalb in jeder
Sprache „Table of Contents". Betrifft alle acht Kataloge, nicht nur Chinesisch.

- Neuer Katalogblock `index: { toc, figures, tables, alphabetical, bibliography,
  emptyToc, … }`; `tocTitle()` (`:172`) und die Einfügebefehle
  (`ReferencesTab.svelte:97`, `ToolbarExpanded.svelte:763`) reichen `t()` durch.
- Der Importweg bleibt, wie er ist: ein Verzeichnis aus einer Datei behält seinen
  eigenen Titel („Inhalt", „目錄"), auch den leeren.

## 7 — `chore:` chinesische Schriftnamen und 「」

- Ein chinesischer Nutzer sucht 宋体, nicht SimSun. Eine Tabelle
  `CJK_FONT_LABELS: Record<string, { 'zh-Hans': string; 'zh-Hant': string }>`
  neben `fontList.svelte.ts`, und ein `fontLabel(family)`, das nur bei
  `locale()` = `zh-*` einen Namen ersetzt. **Wert und CSS bleiben der
  lateinische Name** — übersetzt wird die Beschriftung, nicht die Schrift.
  Betrifft `FontFamilyBox.svelte` und den Schriftdialog.
- `QUOTES` (`extensions/autoCorrect.ts:24`) bekommt `zh-Hant`: `「」`/`『』`.
  zh-Hans bleibt bei `“ ”`/`‘ ’`, das ist dort die Konvention — also nur ein
  Eintrag, und `quotesFor` muss dafür den vollen Tag statt der ersten zwei
  Zeichen ansehen.

---

## Verifikation

1. `npm run check`, `npm test` — die neuen Zusicherungen liegen in
   `complex-script`, `ordered-list-types`, `word-count`, `documentLanguage`,
   `docx-export`.
2. `npm run test:lo` — vier der sieben Posten ändern Exportbytes; LibreOffice
   liest die Runde gegen.
3. `npm run build`, dann der Browser-Durchgang (bauen, sonst serviert der
   Preview-Leg altes `dist`): Liste je neuem Format anlegen und die Marken
   ansehen, Sprachwähler auf 中文（简体）, Schriftmenü im chinesischen UI,
   Wortzählung an einem chinesischen Absatz.
4. Der eigentliche Beweis für Posten 2 und 3 ist **Word**, das hier nicht
   vorliegt. Ersatz: LibreOffice liest beide Slots genauso, und `test:lo` deckt
   die Runde ab. Beim Öffnen in LibreOffice ist zu prüfen, dass unter
   Format → Zeichen die *asiatische* Sprache auf Chinesisch steht.
5. **Einmal von Hand mit einer echten Pinyin-IME tippen** (macOS-Systemeingabe):
   Kandidatenfenster, Bestätigung, Rücknahme, dazu ein Absatz an einer
   Seitengrenze. Statische Analyse sagt, die beiden einzigen Stellen, die pro
   Anschlag arbeiten, sind komponierungsfest — nachgewiesen ist es damit nicht,
   und automatisieren lässt es sich nur über CDP `Input.imeSetComposition`, also
   nur in Chromium. Wenn dabei etwas auffällt, wird daraus ein eigener Fix.

## Commits

1. `feat:` Chinesisch als Dokumentsprache, auch ohne Wörterbuch
2. `fix:` die ostasiatische Sprache in den asiatischen Slot schreiben und lesen
3. `feat:` chinesische Listennummerierung (一、壹、甲、①)
4. `fix:` Han-Zeichen einzeln zählen; 16K/32K als Papierformat
5. `feat:` Datumsbild, Währung und Tabellensprache nach Gebietsschema
6. `fix:` Verzeichnistitel aus dem Katalog statt englisch
7. `chore:` chinesische Schriftnamen im chinesischen UI, 「」 in zh-Hant
