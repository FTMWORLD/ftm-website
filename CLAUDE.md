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
- Never name the broker a test ran on (FundedNext, Deriv etc.) on the trust engine or in results. Deriv stays only where it is FTM's own partner/affiliate product.

## Replies to the owner (owner instruction, 3 November 2026)
- Always answer in 5 to 6 short sentences at most. No long notes, no long tables unless asked.
- Format replies as short bullet points, one point per line, with space between them. Never one dense paragraph.

## Ask here knows every solved problem (owner instruction, 7 November 2026)
- Every customer problem we solve gets a short cause-and-fix line in the TROUBLESHOOTING list in `api/v1/chat.js`, in the same commit, so the Ask here assistant can answer it.
- Messages for FTM ENGINE go through the FTM MACHINE session, which passes them on.

## Figures come from the engine (owner instruction, 9 November 2026)
- FTM is a financial company: every customer figure must be exact. Balance, equity, deposits, withdrawals, P/L, growth, drawdown, win rate and trade counts are taken directly from the FTM engine (`/customer/accounts`, `/customer/accounts/:id/stats`, `/history`, `/positions`), never estimated by the website when the engine has the number.
- The website only calculates what the engine does not send, and then from the engine's full history. When a figure is missing, ask FTM ENGINE (via FTM MACHINE) to add it rather than approximating.

## Every fix is for every customer (owner instruction, 9 November 2026, repeated with emphasis)
- Every correction goes into the code (website and, through a note to FTM ENGINE, the engine) so past, present and future customers never meet the same problem. Never fix one account by hand.
- For every fix: find the root cause in shared code; check every account type (customer, master preview, demo, free, new sign-up) and every view (dashboard, performance, calendar, popups, statement, phone and laptop); add an automatic test in .github/tests so it cannot come back.
- Every report to Gospel ends with: "Applies to all accounts, past and future: yes".

## FTM document standard (owner instruction, 9 November 2026)
- Every FTM document (statements, reports, PDFs) has: top = navy band with the FTM logo on the left and the document name on the right; bottom of EVERY page = a slim full-width navy band (#0b1640) with "Invest today, secure tomorrow." centred in gold.

## How FTM figures are calculated (owner instruction, 9 November 2026)
- Money profit = sum of closed-trade results (net). Deposits and withdrawals change the balance only, never profit, % or drawdown.
- Every % (gain, profit this year, profit by period, monthly, weekly, daily, yearly, chart in %) is time-weighted: each trade's result on the balance at that moment, chained. One shared function (FTM.metrics().seg) feeds every view; never add a second formula.
- Highest balance = the highest balance the account actually reached (engine peak_balance, with its date). Drawdown = engine max_drawdown_closed_balance_pct. The website never estimates these.

## Risk profiles (owner instruction, 9 November 2026)
- Normal drawdown range per profile: Conservative 10–20%, Balanced 20–40%, Growth 2× 40% and more. The Risk level card compares the engine's max_drawdown_closed_balance_pct with this range.
- Consistency check (all accounts): deposits − withdrawals + history must equal the balance. If not, the website shows balance-based profit and % (balance − net deposits), hides history-based charts with a notice, and logs it; the engine must fix the history.
