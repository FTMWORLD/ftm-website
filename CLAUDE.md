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
- terms.html and privacy.html are translated by `legal-i18n.js` from `i18n/legal/<code>.json` (key = the English text or block). When you change their text, add the new translation to every `i18n/legal/<code>.json`; the checker covers them.

## Before pushing
- Check every inline script in `index.html` and `performance.html` still parses.
- Keep customer replies short: the key facts only.

## Emails (owner instruction, 15 October 2026)
- Every FTM email ends with the full-width dark-blue footer (#0b1640): "Invest today, secure tomorrow." in gold, then the FTM logo (blue square with the gold chart line, https://www.ftmwealthnation.com/email-logo.png, plus the white word FTM), then the risk note and unsubscribe link.

## Advertising figures (owner instruction, 18 October 2026)
- Lead with the best results: Growth 2× (the most aggressive profile a market has) is the default and headline figure everywhere, on every market and in every design.
- Videos (owner instruction, 20 November 2026): say and show "Growth", never "Growth 2×" or "Growth two times".
- Since 18 October 2026 the best result is All in one (five markets on one account): Growth 2× +98,644%, 54–176% a year. Use All in one, not gold, for headline advertising figures. Outside the trust engine it is called "Portfolio".

## Risk warnings (owner instruction, 18 October 2026)
- Risk and past-performance warnings live only in the homepage footer and in terms.html. Never add them to statistics, backtests, the trust engine or designs.
- Exception (owner instruction, 20 November 2026): paid ads (boosted or promoted posts) end with one small line: "Capital at risk. Trading can lose money. Past results do not guarantee future results." Organic posts stay without it.

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

## Monthly Letter is automatic (owner instruction, 16 November 2026)
- The Letter from FTM is written and sent by the site itself (daily job /api/v1/letter-cron): written on the 1st, owners get a preview, sent on the 2nd at 09:00 UTC. Never make it depend on someone pressing Send.
- Every change customers can see gets one short, plain dated line in `data/changes.json` in the same commit, so the letter can say what changed that month.
- The letter's figures use `ftm-calc.js`, the same calculation file the dashboards load. Change figure logic only there.

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
- Profit and % always come from the closed-trade history (engine deals), never from balance minus deposits. If the engine's balance disagrees with deposits − withdrawals + history, log it (client-log history_gap) and tell FTM ENGINE; on 9 Nov the history was right and the reported master balance was wrong.

## People, not traders (owner instruction, 10 November 2026)
- FTM is for everyone, not only traders. In every text (all pages, emails, Ask here, all languages) call customers and members "people" or "members", never "traders". Example: "Meet other people running FTM MACHINE".

## Country flag (owner instruction, 10 November 2026)
- The country flag always comes after the name, never before (leaderboard, community, chat, profiles).
- The leaderboard (and every official place) uses the Know Your Customer country. The Community country is the member's own free choice and is never overwritten by KYC, and KYC is never overwritten by Community.

## Posting times (owner instruction, 22 November 2026; replaces 21 Nov)
- From Sunday 22 Nov 2026: 09:30 = education and insights about FTM; 13:00 = the couple video (owner and his wife); 18:00 = YESTERDAY's full, exact day result (Saturday 18:00 = the weekly summary instead). Sunday 22 Nov 23:00 is the last 23:00 post; the 18:00 results start Monday 23 Nov. Monday 23 Nov 09:30 = Video A. Chosen from Metricool's audience data: our people are most active at 10:00, 12:00–13:00 and 18:00.
- Weekly or 5-day recaps go out only on Saturdays or on the last day of a month, never on other days.
- Instagram: post videos as normal REELS, not Trial Reels (owner 22 Nov: followers must see every video). Metricool cannot switch on "share trial to followers automatically", so a Trial Reel would stay hidden from followers. Normal Reels still reach non-followers through the Reels tab and Explore.
- LinkedIn (owner 22 Nov): every feed post (09:30, 13:00, 18:00, Saturday weekly) also goes to LinkedIn as its own Metricool post at the same time: the video (no stories), videoThumbnailUrl = the cover, linkedinData {type post}, the same caption with a link https://www.ftmwealthnation.com/?start=li instead of "link in our bio", and a few professional hashtags (#FinTech #Investing).
- Instagram collaborators (owner 22 Nov): ONLY on the 13:00 post (never 09:30 or 18:00). Instagram takes at most 3 collaborators per post through the API, so take 3 a day in rotation from social/plan/collabs.json (accounts list + next index; update it after each post). Each accepts the invite in their app. Add new collaborators to that file when the owner names them.
- Covers (owner 22 Nov, very important): every feed video's FIRST FRAME is its cover (social/tools/coverfirst.py; render.js cover and buildvid.py apply it automatically), because TikTok (personal account) and YouTube Shorts show frame 1 and ignore the uploaded thumbnail. YouTube Shorts: send NO videoThumbnailUrl (YouTube does not take custom Shorts thumbnails through the API, which caused the "could not upload thumbnail" warning mails; the channel's phone is already verified). The cover is the Short's first frame instead. This overrides any job prompt that says to send a YouTube thumbnail.
- No-trade posts never repeat (owner 22 Nov): render.js quiet has variants (1, 2, …); use a different one each time (social/plan/notrade.json) and fresh caption wording; add new variants with other real statistics.
- Stories are at most 60 s: a longer video gets a sped-up story copy (vid-D-story.mp4); Reels, Shorts (3 min) and TikTok take the full video.

## Images and scripts (owner instruction, 22 November 2026)
- Every 09:30 and 13:00 video uses ChatGPT's realistic images (mixed with our own animation is fine, but always with his images). For every script, write a brief file in social/briefs/ (script + numbered image prompts: same characters, 9:16, no text/logos, calm top 20% and bottom 30%, FTM colours) and send it to the owner, who gets the images from ChatGPT. The 18:00 results need no images.
- The 13:00 couple video: a short dialogue between HER and HIM, always built on FTM's ideology, principles, values, goals and vision, with real statistics from the website (live account, trust engine).
- Voices (owner 22 Nov, final): we NEVER use the owner's or his wife's own recordings any more. Every video uses our own AI voices (Kokoro): couple videos HER = af_heart, HIM = am_michael (lines start with "HER:"/"HIM:"); a single narrator via NARRATOR=<voice> in buildvid.py (e.g. bm_george for a calm, mature voice). Before posting, transcribe the finished video (faster-whisper) and read it back: every word must be right; run social/tools/audiocheck.py: it must say clean. Look at the frames too (phone screens, text, end card centred).
- Ideas: the owner gives the idea when he can; when he cannot, we create the idea ourselves (fresh every time, never repeating an angle such as "busy shift workers"), write the brief, he gets the images from ChatGPT, we build it with our voices.

## Every post different, every audience reached (owner instruction, 22 November 2026)
- No two posts alike: post 2 must differ from post 1 in hook, story, look and angle, while keeping FTM's principles, logic, ideology and doctrine.
- Rotate the target audience: people who trade themselves (traders), working people, busy people, people not working (students, at home, retired), people struggling with trading, emotional traders (fear, revenge, greed), families/couples, sceptics who want proof. Speak to ONE of them per video, in their words and their situation, and name them in the hook ("Stop scrolling if you trade gold and keep moving your stop…").
- Faceless videos can reach millions: win with the hook (first second), a real story, real figures and clean sound. Log each post's audience and angle in social/plan/journey.json so the next one is different.

## Why FTM exists: the 09:30 content pillars (owner and his wife, 22 November 2026)
Every 09:30 video takes ONE of these and tells it through a fresh, concrete scenario (there are 100 ways to tell each):
1. Time: most people cannot be in the market 24 hours. They are working, sleeping, cooking, shopping, with family; the market moves without them and the chance is gone.
2. Emotion: when people do trade, fear and greed decide. A loss makes them want to "win it back" (revenge trading); a win makes them overconfident.
3. System: even calm people fail with a bad strategy or poor execution (late entries, no stop, moving targets).
FTM MACHINE answers all three: it is in the market around the clock, has no emotions, and follows fixed, tested rules.

## Profit days and loss days (owner instruction, 21 November 2026)
- Say "profit days" and "loss days" (and "loss weeks"), never "good days / bad days" or "green days / red days", in every post, caption, story, video, slide and ad from now on.

## Precision (owner instruction, 21 November 2026, repeated)
- Things that sit side by side line up exactly: buttons, headings and bottom edges of cards in one row are on one straight line (horizontal or vertical), on the site and in the client area. Test: .github/tests/aligned-buttons.js.
- A page refresh always starts at the top of the page, even after jumping to a menu section.

## Design first, figures fit (owner instruction, 10 November 2026)
- Long figures (big balances, many digits) must never stretch or break a box or the layout. They shrink to fit; when shrunk, tapping them opens the full figure large in a small pop-up (class fz-on, #fzModal). Apply this everywhere.
- After every change, check laptop and phone (and small phones) before publishing.

## Charts explain themselves (owner instruction, 10 November 2026)
- Every chart, bar, pie or drawing in the client area shows its details on hover (tap on phones): date, money, %, trades. New charts must do the same (data-tip on each part, or a crosshair), and get a check in .github/tests/charts-hover.js.

## No refunds, no guarantees (owner instruction, 12 November 2026)
- Subscriptions are not refundable. FTM makes no satisfaction guarantee or "promise" of any kind. This is final and is not to be argued or discussed, on the site, in Ask here, or in proposals.

## Reminders for the owner
