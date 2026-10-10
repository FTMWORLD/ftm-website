# Translation tooling

- `source_strings.json` - the numbered English strings the site translates (id = position).
- `build_language.py <code> <file>` - merges a file of `id|translation` lines into `i18n/<code>.json`
  and rejects any line whose HTML tags differ from the English original.
- Strings left untranslated on purpose: the 30 sample customer reviews and names (ids 272-331),
  instrument codes, brand names, and Bid / Ask (ids 340-341).
- The engine lives in `index.html` (search `I18NE`). Languages are listed in the `LANGS` constant there.
- Text that the client area builds with numbers in code (for example "3 positions currently open.")
  is not covered by exact-match files yet.

## Adding a language
1. Add its code and native name to `LANGS` in `index.html` (and to `RTL` if right-to-left).
2. Read `numbered_strings.txt` (id|English). Write `id|translation` lines, keeping every HTML tag and every `{}` placeholder exactly.
3. `python3 build_language.py <code> <file>` merges and validates. Run it once for the main strings (ids 0-615) and once for the rest.
4. Commit `i18n/<code>.json`.
Keys containing `{}` are patterns: `{} trades` translates "16 trades". The slot only matches numbers and amounts.

## Keeping every language complete
`python3 i18n/_tools/check_translations.py` lists every visible English string that any language
file cannot translate, and exits with an error if there is one. GitHub runs it on every push
(workflow "Translations"), so a red check means a change went live with English-only text.
Any change that adds or edits customer-facing text must add the translation to all `i18n/<code>.json`
files in the same commit. Add new JavaScript messages to `source_strings_js.json`; add names,
codes and brands that must stay English to `keep_english.json`.
