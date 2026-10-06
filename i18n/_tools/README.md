# Translation tooling

- `source_strings.json` - the numbered English strings the site translates (id = position).
- `build_language.py <code> <file>` - merges a file of `id|translation` lines into `i18n/<code>.json`
  and rejects any line whose HTML tags differ from the English original.
- Strings left untranslated on purpose: the 30 sample customer reviews and names (ids 272-331),
  instrument codes, brand names, and Bid / Ask (ids 340-341).
- The engine lives in `index.html` (search `I18NE`). Languages are listed in the `LANGS` constant there.
- Text that the client area builds with numbers in code (for example "3 positions currently open.")
  is not covered by exact-match files yet.
