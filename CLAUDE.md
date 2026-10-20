# FTM website: rules for every session

Read HANDOFF.md section 00 first.

## Translations (owner instruction, 10 October 2026)
Every customer-facing text must be live in all 50 languages at the same moment it is live in English.
- When you add or change any visible text (HTML, attributes, or messages shown by scripts), add its
  translation to every `i18n/<code>.json` file in the same commit.
- Before every push run `python3 i18n/_tools/check_translations.py`. It must print
  "0 strings missing". `--list` shows what is missing.
- New messages built in JavaScript go in `i18n/_tools/source_strings_js.json`.
  Names, codes and brands that must stay English go in `i18n/_tools/keep_english.json`.
- Keep HTML tags and `{}` placeholders exactly as in the English key. Details: `i18n/_tools/README.md`.

## Before pushing
- Check every inline script in `index.html` and `performance.html` still parses.
- Keep customer replies short: the key facts only.

## Emails (owner instruction, 15 October 2026)
- Every FTM email ends with the full-width dark-blue footer (#0b1640): "Invest today, secure tomorrow." in gold, then the FTM logo (blue square with the gold chart line, https://www.ftmwealthnation.com/email-logo.png, plus the white word FTM), then the risk note and unsubscribe link.

## Advertising figures (owner instruction, 18 October 2026)
- Lead with the best results: Growth 2× (the most aggressive profile a market has) is the default and headline figure everywhere, on every market and in every design.
- Since 18 October 2026 the best result is All in one (five markets on one account): Growth 2× +98,644%, 54–176% a year. Use All in one, not gold, for headline advertising figures. Outside the trust engine it is called "Portfolio".

## Risk warnings (owner instruction, 18 October 2026)
- Risk and past-performance warnings live only in the homepage footer and in terms.html. Never add them to statistics, backtests, the trust engine or designs.

## Design standard (owner instruction, 20 October 2026)
- Every page, section, slide and line of text must show FTM as the most standard, unique and outstanding financial company in the world. Benchmark against the best finance sites (Binance, Deriv, Revolut, Stripe, eToro, Wealthfront) and do better.
- Lively but mature: movement and gold accents, never loud or cheap. Calm headlines, numbers that move, clear calls to action.
- Keep the FTM colours in every redesign: navy (#0B1440 / #152a7a), gold (#D4AF37 / #E3B62F), red (#E5323E) and white. Every section must keep something gently moving.

## Original look (owner instruction, 20 October 2026)
- The public site must show no trace of how it was built: no developer comments in index.html, performance.html, terms.html or privacy.html (HTML, CSS or JS comments), and no mention of AI tools, sessions or assistants. Keep notes in HANDOFF.md instead.
