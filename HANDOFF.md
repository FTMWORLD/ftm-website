# FTM — Project Handoff

**Written:** 21 September 2026 · **Last updated:** 5 October 2026 (section 0 and the corrections marked *updated*) · **For:** a fresh Claude session, or a new developer

Read this file first. It is written so someone with no prior context can pick the work up
without re-reading the original conversation.

---

## 00. Cloud-session briefing — read this before anything else (written 9 October 2026)

**You are a Claude Cloud session working on the repo `FTMWORLD/ftm-website`.** This repo is
your only memory. The owner's previous work happened in a Local session on a Mac that is not
always on, so everything has been moved here. If this section disagrees with older text below,
this section wins.

### What you can and cannot do from here

- You can read and edit every file in the repo and push **branches** to GitHub through the
  Claude GitHub app.
- You **cannot** see: the owner's iCloud folder, the Vercel / Supabase / Stripe dashboards or
  their environment variables, the trading VPS, or any other Claude session (you cannot message
  one and cannot be messaged back). Anything that needs those goes to the owner in plain words:
  say exactly what he must click or run, and what to paste back.
- There is no memory outside this repo. When you finish something that the next session must
  know, **write it into this file** and push.

### How to push (follow this exactly)

1. Work on your own branch named `claude/<short-topic>`. **Do not push to `main` and do not
   merge unless the owner explicitly says so.** `main` deploys straight to the live site
   (https://www.ftmwealthnation.com) through Vercel, so a push to `main` is a release.
2. Commit in small steps, with a clear message. End every commit message with the line
   `Co-Authored-By: Claude <noreply@anthropic.com>`. Never force-push. Never rewrite history.
3. Open a pull request into `main` and give the owner a short plain summary: what changed, what
   he will see, how you checked it, and anything you could not check. He decides when it merges.
4. Before pushing, check the inline scripts parse (extract every `<script>` without `src` from
   `index.html` and run each through `node --check` or `new Function(code)`), and for any
   translation change run the checks in `i18n/_tools/README.md`.
5. **Never put a secret in the repo or in chat**: no API keys, tokens, passwords, `.env` files,
   database dumps, or customer data. Secrets live only in Vercel environment variables.
   `.env.example` lists the names only.

### What has been built (state at 9 October 2026, `main` = `4956016`)

- **Site:** one `index.html` plus `terms.html`, `privacy.html` (draft, not linked, noindex) and
  Vercel functions under `api/`. Live at www.ftmwealthnation.com. Company is **registered in
  Nigeria** and trades since 2021. Never describe it as a German company, anywhere.
- **Payment to account flow:** proven end to end (Stripe Payment Link, webhook
  `api/stripe/webhook.js`, Supabase invite, set password, login, plan unlocked).
- **Client area** with real data (balance, equity, floating P/L, closed-trade history with a
  detail popup, open positions, calendar with day detail and a percentage toggle,
  leaderboard, community profile page). Leaderboard, Community, member profiles and chats are
  **still sample content**; never show invented numbers to real customers.
- **50 languages (49 translations plus English).** Every string on the page is translated, not
  only headings. Files: `i18n/<code>.json` (about 700 entries each), the engine is the `I18NE`
  block in `index.html`, the language list is `const LANGS` in `index.html`, and
  `i18n/_tools/` has the source strings, the build and register scripts and a README on adding a
  language. Urdu, Persian, Arabic and Hebrew switch the page to right-to-left. These are machine
  translations: before launch they should be checked by native speakers, especially risk and
  legal wording. Terms and Privacy stay English (the footer says English prevails).
  A search box above the language list (desktop and phone menu) for the 50-entry menu is merged and live.
- **Engine "deploy A" hand-over implemented (commit `4956016`):** every amount is in the
  account's own currency via `FTM.moneyIn` (never a guessed EUR/USD; a missing currency shows
  the bare number); status `SETUP_FAILED` and any unknown status show the existing "Action
  required" chip with the existing contact-support text and never a raw engine code; the refused
  login text and "Update and try again" form show only while `can_retry_password` is true; a
  Growth information icon beside the risk profile reveals exactly "Growth scales at twice my
  normal size" and the connect request still sends exactly four keys; 409
  `ACCOUNT_REMOVAL_IN_PROGRESS` shows "This account is still being removed. Please wait a
  minute and try again."; a removed account's card disappears at once; PROVIDER uses the broker
  name; the sub-line never shows a raw `trade_mode`. The new engine fields
  (`broker_trade_disabled`, `provisioning_*`, `trade_allowed`, `growth_acknowledged_*`) are
  deliberately **not shown**. The connect form never had a minimum-balance text.
- **Proxy privacy checked:** every `api/v1/customer/*` route calls `verifyCustomer(req)`, which
  validates the Supabase session server-side, and uses only that verified id. Logs never print
  account payloads. Keep it that way.

### Rules from the owner that always apply

- **Global standard:** one worldwide behaviour, high bar for security, privacy and clarity.
  Where the company is registered affects legal paperwork only, never how the product behaves.
- **Never fabricate** data, P/L, prices, reviews or track records for real customers.
- **Do not guess backend shapes.** The engine is built in a separate session that the owner
  runs. Ask the owner for the exact endpoint and response before wiring anything.
- Customer-facing sentences about money, risk or accounts are **owner-approved wording**. Do not
  invent new ones; propose them to the owner.
- Keep the Community, Leaderboard, profiles and chats on sample content until the backend design
  arrives.
- Raise legal points once, plainly, then do the work as asked.

### Waiting on the owner (do not build these on your own)

1. Approved translations of the two new English sentences (the Growth icon sentence and the
   removal-in-progress sentence). Until then they show in English in every language.
2. Engine items the owner has not decided: the PROVIDER text for an unresolved broker, the text
   if a removal is held for a person, number style (comma/point, sign/code) worldwide, a
   notice for small accounts about proportionally larger risk, showing the Growth
   acknowledgement, changing tier after connecting, a chip label for `SETUP_FAILED`, a separate
   label for the Growth icon.
3. Lawyer review of the Terms and the Investment service, and the placeholders in
   `privacy.html` (company address, registration number, data-protection contact, retention,
   hosting provider, transfer safeguards). Do not link the Privacy page from the site until they
   are filled.
4. Section 0 below is the launch checklist; it is still accurate except where this section says
   otherwise.

### Housekeeping the owner holds

- The owner pushes from his own Mac with a GitHub token that expires on **8 November 2026**.
  The cloud session does not need that token.
- Stripe test payments and test link, and the test accounts, are left as they are by the owner's
  choice.

---

## 0. Current state and launch checklist (updated 5 October 2026)

**Read this section first; sections 2, 3 and 6 below were corrected, the rest is the
21 September text.**

### Where things stand

- **Live at https://www.ftmwealthnation.com**, deployed by Vercel from the GitHub repo
  `FTMWORLD/ftm-website` (branch `main`). The artifact is no longer the source of truth.
  The site is still one `index.html`, plus `terms.html` and Vercel serverless functions under
  `/api` (a proxy to the trading engine, and the Stripe webhook).
- **Customer accounts:** Supabase project "ftm production" (Frankfurt). Customers log in with
  email and password, or an emailed code; password reset exists.
- **Payment to account flow, proven end to end on 5 October 2026** with a 1€ live test:
  Stripe Payment Link, then webhook `/api/stripe/webhook`, then Supabase invite email, then the
  customer creates a password, then logs in with the plan unlocked. The test found the
  `profiles` table had no grant for the service role (fixed with
  `grant all on table public.profiles to service_role;`). The webhook's reply body reports what
  happened and is readable in Stripe's event delivery log.
- **Real data in the client area:** connected accounts, balance, equity, account-level floating
  profit, closed-trade history, open positions. Per-position current price, floating profit
  and swap were shipped by the engine on 1 October and wired in; **not yet seen with a real open
  position**.
- **Still sample content:** the Community, the Leaderboard, member profile pages and chats.
- **Secrets live only in Vercel environment variables** (`FTM_WEBSITE_API_TOKEN`,
  `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
  `STRIPE_WEBHOOK_SECRET`). They are never put in the repo or in chat.
- **Two Claude sessions work together:** one on the website, one on the trading engine. The
  engine session decides engine priorities with the owner and sends exact endpoint shapes
  before the site is wired to anything. Do not guess shapes.

### Launch checklist

**Engine / backend (the programmers)**

- [ ] Automatic provisioning of customer trading terminals. *In progress.*
- [ ] Copy-latency work. *In progress.*
- [ ] Currency conversion where the account currency differs from the symbol's quote currency.
      *Flagged as a pre-launch blocker.*
- [ ] Minimum lot-size failures on small accounts, which fail silently. *Flagged as a
      pre-launch blocker.*
- [ ] Live-gate / multi-strategy work the owner prioritised. *The engine session holds the
      details.*
- [ ] Pause / resume, and one-account-at-a-time enforcement. *Deprioritised by the owner.*
- [ ] Deposit-history and subscription/billing data. Without it the dashboard's "Plan" box is
      blank and percentages use an estimated starting balance.
- [ ] Real community: members, leaderboard, follow, block, report, messaging (section 9.6).
      *Queued; order is the owner's decision.*
- [x] Account validator, fix-login-details and remove-account flows.
- [x] Per-position current price, floating profit and swap (verify on the first live position).

**Website**

- [ ] Show the plan name in the "Plan" box once a billing feed exists.
- [ ] Wire the Community and Leaderboard once the backend design arrives.
- [ ] Confirm live open-position P/L on the first real position.
- [x] Translations: 50 languages, full page (machine translations; native-speaker review before launch).
- [ ] Decide what to do with sample and unverifiable content before launch (section 9.4).
- [x] Terms page (sidebar, jump links, support button). **Still needs lawyer review.**
- [x] Payment, invite and set-password flow.

**Business and legal (the owner)**

- [ ] **Investment service authorisation** (section 9.3). Blocking; the Investment payment link
      is live now.
- [ ] Lawyer review of the Terms, and a decision on what happens to Investment capital on a loss.
- [ ] Confirm with the brokers that the credential-based trading approach is permitted (9.1).
- [ ] Claims that cannot be backed up (9.4).
- [ ] Set the Investment Stripe minimum to 5,000€ to match the page.
- [ ] Real customer reviews and a verified track-record page.
- [ ] LATER (owner, 8 November 2026), after the site set-up is finished: payments without a third party.
      Stripe limits FTM to about 10,000 (the limit may rise, but the owner prefers not to depend on a
      third-party processor). Plan a way for customers to pay directly into an FTM-held account (bank
      transfer with a reference per customer, confirmed automatically or by FTM), wired to the same plan
      grant as the Stripe webhook (profiles.products, engine PUT /billing/subscription, branded emails).
- [ ] LATER (owner, 8 November 2026): crypto payments for customers who pay in crypto, with the same
      automatic plan grant, receipts and alerts as card payments.
- [ ] Housekeeping from the 5 October test: refund the 1€ test payments, deactivate the 1€
      test link in Stripe. The owner chose to keep the test accounts; they still hold the
      Auto Trading plan.

---

## 1. The business

**Follow The Market Ltd. (FTM)** — founded 2021, **registered in Nigeria** (corrected 5 October 2026 — earlier versions of this file, and the legal notes in 9.1 and 9.3 below, wrongly assumed a German base). The website says "Base: Worldwide" and must not describe FTM as a German company.
Founder and CEO: Gospel Chukwujekwu Ubaka. The website says "Base: Europe".

Slogan: **Invest Today, Secure Tomorrow.**

FTM sells three things:

| Service | What the customer gets | Payment |
|---|---|---|
| **Auto Trading** (FTM MACHINE) | An automated trading strategy run for them on their own MT5 account | Stripe, 3 one-off plans |
| **Investment** | Deposit into a pooled FTM account; share of profit after 13 months | Stripe, one link |
| **Affiliate Marketing** | Commission for referring traders to Deriv, where FTM is a master affiliate | Free; Deriv pays |

**Pricing**

- Auto Trading: Annual **999€** (13 months for the price of 12) · 5 Years **3,999€** (64 months
  for 60, marked "Popular") · Lifetime **9,999€**
- Investment: minimum **5,000€**

**The Investment profit rule** (implemented in code, one place, `FTM.rule`)

- Lock period 13 full months. Eligible on the **1st of the month after** 13 full months.
  Join September 2026 → eligible 1 November 2027.
- Client receives **half** of the percentage the FTM account returned over their period,
  applied to the amount they invested. Account makes 40% → client gets 20% of their deposit.
- Payable figure shown = **deposit + profit share** (client can withdraw capital too).
- **Assumption I made, not confirmed by the owner:** if the period ends at a loss, the deposit
  carries the loss (deposit × (1 + return)). FTM shares profit but not loss. **This must be
  confirmed and written into the terms.**

---

## 2. Where everything lives

| Thing | Location |
|---|---|
| **Website source** *(updated)* | GitHub `FTMWORLD/ftm-website`, branch `main`. A copy lives at `~/Library/Mobile Documents/com~apple~CloudDocs/FTM Website/` (iCloud Drive); it is updated with `git pull` and can lag if macOS blocks access |
| **Published site** *(updated)* | https://www.ftmwealthnation.com, built by Vercel on every push to `main` |
| **Old artifact** | https://claude.ai/artifact/Bx7vb1htHx3PDFMFjjuXSQ — the earlier hosting; no longer the live site |
| **Memory files** | `~/.claude/projects/-Users-razerr-…-scratch-2026-09-14-0d7915/memory/` |

The site is **one self-contained HTML file**, ~323 KB, ~3,925 lines. No build step, no
dependencies, no framework. Only external requests are the Inter font from Google Fonts and
the outbound links listed in section 6.

**Original workflow (superseded: now commit and push to GitHub, and Vercel deploys)**

1. Edit the file in the scratch workspace (Python string replacement has been the usual tool —
   the file is large, so whole-file rewrites are avoided).
2. `cp` it to the iCloud folder.
3. Publish with the Artifact tool using the same file path, which keeps the URL.
4. Verify in a browser before publishing (see section 8 for the local-server trick).

---

## 3. Version history

**Updated:** the project is now under Git, hosted at `FTMWORLD/ftm-website` on GitHub, and every
change since the move is a commit with a message explaining why. The history before that is
only the artifact version list, 1 to 110, described below. Keep Git repositories out of iCloud
Drive; the iCloud folder here is a working copy updated by `git pull`.

**Rough milestone history, reconstructed** (artifact versions in brackets)

- v1–30 — Homepage built from Deriv's layout with FTM branding; language switcher grew to 18
  languages; Partner section; Markets section rebuilt as a scroll-driven sticky stage.
- v31–66 — Auto Trading subscription plans and compounding calculator; Performance, How it
  works and Company sections; client login and trading dashboard preview.
- v67–85 — Full trading dashboard: metrics engine, calendar, leaderboard, community with
  report/block, sessions, candle charts; MT5 server picker; master password field.
- v86–100 — Investment service and investor client area; Get started chooser; unified login
  with first-password rule and change password; dropdown and mobile fixes.
- v101–110 — Mobile bug fixes (markets blank area, client area overflow, support chat overlap,
  scrollable menu); social links; payment received page; live profit on Monitor card.

---

## 4. Memory files

Two files exist in the memory directory. A fresh session loads `MEMORY.md` automatically.

**`MEMORY.md`** — the index, one line:

```
- [FTM website project](ftm-website-project.md) — site file in iCloud Drive, artifact URL, wired links, open items
```

**`ftm-website-project.md`** — type `project`. Holds the company facts, the file location, the
artifact URL, the Deriv links, the plan prices, a warning about unescaped apostrophes breaking
the script, and a "State as of 2026-09-20 (artifact version 92)" section covering the services,
the client area, the preview-only login, and the unresolved questions.

That file is now **partly out of date** — it stops at version 92 and this handoff covers
through 110. It has been updated alongside this document.

---

## 5. What the site contains

Sections in page order, with the line where each begins:

| Line | Section | Notes |
|---|---|---|
| 967 | NAV | Floating pill. Auto Trading and Partner have mega menus. Menu collapses to a burger below 1240px |
| 1044 | HERO | "Invest Today, Secure Tomorrow", faint blurred crowd and algorithm art on the left |
| 1067 | TRUST | Three cards, stats, "Established since 2021" |
| 1088 | FTM MACHINE | Live card: blinking Running, moving chart, +205% growing monthly, -15% drawdown, 6 open trades |
| 1100 | PRICING | Three plans, all wired to Stripe; compounding calculator |
| 1154 | PERFORMANCE | Target ≥50%, 3–6 trades, 3 risk profiles, 15% max drawdown |
| 1169 | HOW IT WORKS | 4 steps. **Subscribe is step 1, broker account is step 2** (changed deliberately) |
| 1187 | INVESTMENT | Full service description, rules, share calculator, capital-at-risk box |
| 1239 | MARKETS | Six markets. Desktop: sticky phone slides horizontally. Mobile: text then phone, interleaved |
| 1273 | 24/7 BANNER | "Trade all day" |
| 1284 | PLATFORMS | MT5 feature and risk-management feature |
| 1301 | SUPPORT | Chat mockup; bubbles stack on mobile |
| 1311 | PARTNER | Three affiliate cards, all wired to the Deriv partner link |
| 1325 | TESTIMONIALS | 30 cards in an endless right-to-left marquee |
| 1333 | STEPS | Three stacked sticky cards: Subscribe, AutoTrade, Monitor |
| 1354 | COMPANY | Facts table: company, developer "FTM Team", founded, base, focus, flagship |
| 1371 | CTA | Red "Join 50K+ global traders" |
| 2000 | FOOTER | Link columns, social icons, legal text, risk warning (no longer fixed to the screen) |

**Overlays**, each a full-screen element toggled by the `hidden` attribute:

| Id | What it is |
|---|---|
| `authOverlay` | Client log in |
| `appView` | Auto Trading client area (8 views) |
| `invView` | Investment client area (4 views) |
| `gsOverlay` | Get started chooser: Auto Trading / Investment / Affiliate |
| `pwModal` | Change password |
| `repModal` | Report a community member |
| `paidView` | Payment received page |

---

## 6. Every outbound link

| Where | URL |
|---|---|
| Open account, all "Learn more", Create account, step 1 | `https://t.deriv.link?t=ECECYN33UYBT` (owner, 9 Nov 2026; was M44EJ6HPC8Z8) |
| All partner and affiliate buttons | `https://t.deriv.link?t=XBTNX2FUBYN9` (owner, 9 Nov 2026; was M8A8ZGSDWZNB) |
| Annual plan | `https://buy.stripe.com/eVq00idqj6Fm7Jo2Jm7wA0f` |
| 5 Years plan | `https://buy.stripe.com/aFa3cubib3ta3t897K7wA0g` |
| Lifetime plan | `https://buy.stripe.com/dRmbJ0dqj4xee7M5Vy7wA0h` |
| Investment deposit | `https://buy.stripe.com/5kA7uka0Y4t27zWbIN` |
| Instagram | `https://www.instagram.com/ftm_wealth_nation` |
| Facebook *(updated)* | `https://www.facebook.com/profile.php?id=61595064296217` |
| TikTok | `https://www.tiktok.com/@ftm_wealth_nation` |
| YouTube *(updated)* | `http://www.youtube.com/@ftmwealthnation` |
| X *(added)* | `https://x.com/ftmwealthnation?s=11` |

**Still pointing nowhere:** Log in destination (opens the preview overlay), Explore FTM MT5,
View verified track record, Contact us, Meet the team, Terms and Conditions, Risk Disclosure,
Secure and Responsible Trading, Help centre, FTM Academy, Community, and most footer links.

*(Updated)* The Terms and Conditions page now exists at `/terms.html`. The support email in use is `ftmwebnation@gmail.com`, shown by the floating support button.

---

## 7. How the code is organised

Everything is in one `<style>` block and one `<script>` block. The script is a series of
independent IIFEs, each introduced by a comment. They talk to each other only through
`window.FTM`.

**The global API**

| Member | Purpose |
|---|---|
| `FTM.data` | Auto Trading account: `{account:{currency,deposits,withdrawals}, closed:[…], open:[…], accounts:[…], leaderboard:[…], profile:{…}, members:[…], threads:[…], plan}` |
| `FTM.metrics()` | Computes every trading figure from `FTM.data`. Nothing on the dashboard is typed in |
| `FTM.render()` | Redraws the Auto Trading dashboard |
| `FTM.invest` | Investment data: `{pool:[{t,v}…], investments:[…], withdrawals:[…]}` |
| `FTM.investMetrics()` | Computes eligibility, profit share and payable amounts |
| `FTM.renderInvest()` | Redraws the investor area |
| `FTM.rule` | `{lockMonths:13, share:0.5, currency:'EUR'}` — the profit-share rule, single source |
| `FTM.eligibleOn(date)` | The eligibility date calculation |
| `FTM.openArea('auto'\|'invest')` | Opens a client area and sets the product switcher |
| `FTM.session` | `{email, products:[…]}` for the logged-in preview user |
| `FTM.server()` | The MT5 server chosen in the connect form |
| `FTM.renderBoard()`, `FTM.header()`, `FTM.curveRange` | Leaderboard redraw, client-area header, chart period |

**The metrics engine** (line ~2311) is the most important piece. Given an account and a list of
closed and open trades it derives: net profit, compounded gain, balance, equity, floating
profit, highest balance, max balance and equity drawdown, deposits, commission and swap, total
lots, expectancy, standard deviation, Sharpe ratio, win rate, profit factor, average win and
loss, average trade duration, trade count, win streaks in days and trades, profit this year,
and the balance curve. **Replace the sample data and every screen shows real numbers.**

**Sample data blocks to replace**, each clearly commented:

- Line ~2572 `F.data=` — Auto Trading sample: 250 generated trades, +24.9%, 57.6% win rate,
  1.26 profit factor, 13.2% max drawdown. Tuned to be believable and to sit inside the 15%
  drawdown the marketing page claims.
- Line ~3501 `F.invest=` — Investment sample: a generated pool growth series plus two deposits.
- Line ~2162 `ACCOUNTS=` — the preview login list, three emails.
- Line ~3367 `SERVERS` — 56 MT5 server names for the connect form.

**Other things worth knowing**

- **18 languages**, 43 translated keys. The dictionary is in the language switcher module.
  Only headings, nav and buttons are translated; body copy stays English. Arabic switches the
  page to right-to-left.
- **Apostrophes in JS strings have broken the page before.** French copy containing `d'affiliation`
  inside a single-quoted string silently disabled the whole script for several versions.
  Always escape, and always check the browser console after editing translated strings.
- **Class-name collisions have caused two bugs.** A `.clock` style for the marketing banner threw
  the session clock across the screen. Prefix new classes.
- **Grid and flex children need `min-width:0`** or they refuse to shrink and push the client area
  sideways on phones. There is a defensive rule for this; keep it.

---

## 8. How to verify changes

There is **no LibreOffice, no Node, no pdftoppm, no python-docx** on this machine. Chrome is
installed at `/Applications/Google Chrome.app`.

**Browser testing** (the pane will not load `file://`, so serve over HTTP):

```bash
cd <folder-with-index.html> && (python3 -m http.server 8765 >/dev/null 2>&1 &)
# then navigate the browser pane to http://localhost:8765/index.html?v=<bump>
# always kill it afterwards: pkill -f "http.server 8765"
```

**A trap:** the preview pane reports `innerWidth` around 980 no matter what width is set, so
`@media (max-width:820px)` rules never trigger. To test phone layout, inject the media-query
bodies as plain CSS and constrain the element width to 384px. This technique found the client
area overflow bug and is worth reusing.

**PDF from HTML:**

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --no-pdf-header-footer --print-to-pdf=out.pdf --virtual-time-budget=4000 "file://$PWD/in.html"
```

---

## 9. Open questions and blockers

Ordered by how much they block launch.

### 9.1 How does FTM MACHINE actually trade a client's account? — unresolved, blocking

This is the central unsolved problem. The website describes a service that FTM cannot yet
deliver.

- **Deriv has refused** to allow logging into customer accounts to place trades. The owner
  asked them directly.
- The owner's programmer proposed a **server-side receiver**: the client gives their MT5
  account number, server and master password; FTM runs a terminal per client on its servers and
  a logic-free receiver places the trades. This works technically.
- **The risks with that approach:** most brokers forbid sharing account passwords in their
  terms; FTM would hold a database of trading passwords; and trading a client's account for a
  fee can count as portfolio management under securities law, in Nigeria and in the countries where customers live. *(Updated: originally written assuming a German base.)*
- **Alternatives that were explored:** broker copy trading or social trading (no install, needs
  a broker to accept FTM as a strategy provider); MAM or PAMM (needs a licence or a licensed
  partner); MT5 Signals marketplace; a client-installed EA, which the owner rejected because he
  does not want to hand over the strategy; and a thin receiver EA the client installs, which he
  also rejected because he does not want customers setting anything up.
- **Owner's position:** he wants to sell a service with zero client setup. That narrows it to
  broker copy trading, MAM/PAMM, or the credential route.
- **Current state *(updated)*:** the credential approach was built. The connect form on the
  site posts to the engine through the site's own proxy, accounts are validated, and customers
  can fix login details or remove an account. Automatic provisioning of terminals is in progress
  on the engine side. The broker-permission and legal risks above remain open.

### 9.2 Authentication — built and proven *(updated)*

The preview login described in the original handoff has been replaced. Customers sign in with
Supabase (email and password, or an emailed code, plus password reset). A paid customer is
created automatically by the Stripe webhook, which emails an invite link that opens a "create
your password" step. See section 0 for the proven flow.

### 9.3 Legal authorisation for the Investment service — unresolved, blocking

Taking deposits into a pooled account, trading it, and paying a share of profit is likely a regulated
investment activity, and which regulators apply depends on where FTM is registered (Nigeria) and
where customers live (for example the EU). *(Updated: originally written assuming a German base; the lawyer must re-check this.)* Doing it without authorisation is a criminal offence, not a
fine. The owner has been told this repeatedly and has not yet seen a lawyer. The Stripe link
is live on the page, so **this can take real money today.**

### 9.4 Claims that cannot currently be backed up

Flagged to the owner, who chose to keep them. A fresh session should keep flagging but not
silently change them.

- **"Past performance indicates possible future results"** — the reverse of the disclaimer
  regulators require.
- **The +205% figure** on the FTM MACHINE card grows by 5–20% every month automatically.
- **30 testimonials** are invented. The owner asked to label them "Verified review"; that was
  declined, and the label was removed instead. They now show a name and no label.
- **Sample data** fills both client areas with no visible marker, after the owner asked for the
  preview banner to be removed.
- **The risk warning no longer stays on screen** while scrolling, at the owner's request. EU
  rules for CFD promotions expect it to remain visible, and the required percentage of losing
  retail accounts is a bracketed placeholder.
- **"Registered and regulated by the Corporate Affairs Commission"** — the CAC is Nigeria's
  company registrar and does not regulate investment firms. "Registered with" would be accurate.

### 9.5 Smaller open items

- Terms and Conditions page — *(updated)* built; it still needs lawyer review. A tick box at
  checkout depends on what Stripe Payment Links allow.
- Stripe minimum for the Investment link should be set to 5,000€ to match the page.
- Real customer reviews, a verified track record URL, a real support email.
- What happens to Investment capital on a loss (see section 1).
- Translations cover headings and buttons only; the Investment section is English only.
- *(Done)* Facebook and YouTube now point to the FTM brand pages; an X link was added.

### 9.6 Backend tasks requested by the owner (added 2026-10-05)

- **Real community members and messaging.** The Community area, the Leaderboard
  and the member profile pages (opened by clicking a name on the Leaderboard) all run on
  hard-coded sample data: made-up members, made-up leaderboard figures, and chats nobody
  can answer. Needed from the backend before this can be real:
  - member profiles keyed to real customers (display name, country, bio, a visibility
    opt-in, which the site already has a switch for);
  - a real leaderboard computed from connected accounts' results, for members who opted in;
  - follow / unfollow, block / report;
  - messaging between members: send, receive, unread state, and delivery to the recipient.
  Until this exists, the site must keep treating the Community and Leaderboard as sample
  content. Requested by the owner, who asked for it to be queued for the programmers.

---

## 10. Working preferences observed

- The owner sends **screenshots with short instructions**. Match the screenshot exactly, then
  say what you assumed.
- He often sends **copy to replace verbatim**. Use his words; fix only clear typos and say so.
- He works from **two Macs**. The file lives in iCloud for that reason. Remote Control is on for
  the original session.
- Connection drops have happened repeatedly. **Check whether the last change was published**
  before redoing work; several messages arrived mid-turn asking to "do the previous task".
- He values **speed and visible progress**. Verify in the browser, publish, then report briefly.
- He has accepted every compliance flag raised so far without objection, but has not acted on
  the legal ones. Keep raising them once, plainly, then do the work as asked.
- **Global standard (owner instruction, 6 October 2026).** FTM is a global company. Everything
  built, on the website and on the engine, must meet a global, international standard: one
  worldwide behaviour for every customer, built to a high bar for security, privacy, data
  handling, reliability and clear customer-facing states. Do not build region-specific or
  minimum-viable versions. Where the country FTM is registered in (Nigeria) matters is legal
  paperwork only, never product behaviour. Any place where doing it properly needs a decision
  or costs noticeably more time goes to the owner. Country-specific selling and marketing
  restrictions are a lawyer question and do not change how the product works.
- **Every language should fully change the page (owner instruction, 6 October 2026).** Switching
  language must translate everything customers see, not only headings.

---

## 11. First moves for a fresh session

1. Read this file and `memory/ftm-website-project.md`.
2. Make sure you are on a fresh `claude/<topic>` branch off the latest `main` (see section 00).
3. To change the live site, open a pull request into `main`; the owner merges it and Vercel deploys.
4. If the task touches the backend, ask for the programmer's endpoint and response format
   first; that chat is separate and its decisions are not visible here.
5. If the task is a launch step, raise section 9.3 before building anything that takes money.


## Client ID (9 Nov 2026)
Every customer gets a Client ID FTM-XXXX-XXXXXX made from the first 10 hex characters of the engine customer_public_id (GET /me). It is only shown when the engine answers, so it never changes. It is shown in the account menu, side menu, Accounts page and on statements. If FTM ENGINE later issues its own customer number, switch F.loadCid to it.

## Statement PDF
Accounts > Account activity > Download statement builds the PDF in the browser with /vendor/html2pdf.bundle.min.js (html2pdf.js 0.10.1, MIT, self-hosted). If the library fails to load it falls back to the print window.

## Face ID / fingerprint login (passkeys, 9 Nov 2026)
api/v1/passkey.js (@simplewebauthn/server). Passkeys are stored in the Supabase user's app_metadata.passkeys (server-only), rpID ftmwealthnation.com. Challenges are signed with a key derived from SUPABASE_SERVICE_ROLE_KEY (3 min). A verified login returns a magic-link token_hash that the browser exchanges with supabase.auth.verifyOtp. Only works on ftmwealthnation.com (not on preview URLs).

## Statistics: rules and the automatic check (10 Nov 2026)
- Every figure's definition: docs/statistics.md (owner rules + GIPS time-weighted return + NAV-style drawdown).
- .github/tests/stats-fuzz.js builds accounts of every shape (start balance, deposits, withdrawals, dividends/tax, credit,
  partial closes, open trades, same-second deals, 2,300-row history with paging, account switching, both history orders)
  and checks every figure on every view against its own calculation. CI runs 30 new accounts a day (buttons.yml).
  Run locally: node .github/tests/stats-fuzz.js 40 <seed>. A failure prints the seed; rerun with that seed to reproduce.
- Any change to a figure: change docs/statistics.md, the website and the checker together.
- The browser logs history_gap / return_gap / pl_gap / history_partial to /api/v1/client-log when the engine and the
  website disagree: tell FTM ENGINE (via FTM MACHINE).

## Community (interim service, 10 Nov 2026)
- api/v1/community.js: profiles, Discover, follow, block, report and direct messages, stored as JSON in a private Supabase
  Storage bucket "community" (created on first use with the service role key). Members are addressed by an opaque id.
- The page polls every 4 s while Community is open. Tests: .github/tests/community-api.js and community-e2e.js.
- FTM ENGINE's Community (verified figures, phases A/B/C) will replace this; move profiles (nickname, bio, visible) over.
- 10 Nov: chat has emojis (picker, Recent saved in the browser), reactions (8 fixed emojis, toggle), reply-to quotes, remove own
  message, typing signal (typing/<pair>.json, shown 7 s), day separators and times; tapping a person opens a profile card
  (action "profile"). Tests cover all of it.

## Know Your Customer (10 Nov 2026)
- Menu item at the bottom of the client menu, gold "Verify your KYC" badge until FTM ENGINE says kyc_completed, then a check.
- Engine: GET/PUT /customer/kyc-profile (proxy ALLOW + vercel rewrite). Country is shared with the leaderboard flag.
- LIVE for every customer since 10 Nov 2026 (Gospel approved). F.kycOn=false would hide it again.
- Dashboard banner "Complete your KYC" at most once a week (localStorage ftm_kyc_ban). Test: .github/tests/kyc-e2e.js.

## Wording rule (owner, 10 Nov 2026)
- FTM is for everyone: say "people" or "members", never "traders", for FTM customers.

## Community feed and notifications (10 Nov 2026)
- api/v1/community.js actions feed/post/like/comment/delpost/delcomment/pin/notifs; posts.json (max ~600, pinned kept), images posts/<id>.jpg
  served by GET ?postimg=; notifications notif/<mid>.json (likes, comments, follows) plus FTM posts computed from posts.json.
- FTM staff = login on @ftmwealthnation.com or listed in env FTM_COMMUNITY_ADMINS; staff posts show as "FTM" with a gold tick and can pin/delete anything.
- Tests: community-api.js (feed rules), community-e2e.js (two browsers: post with photo, double-tap like, comment, notifications).

## Leaderboard nickname and flag (engine a11c68a, 10 Nov 2026 16:57)
- Nickname: 2 changes in any 7 days; a 3rd gets 429 NICKNAME_RATE_LIMIT with next_change_at; the website shows
  "You can change your nickname twice in 7 days. Next change: <date>" (test: buttons.js "Nickname third change in a week").
- Leaderboard flag = KYC country only (PUT /customer/kyc-profile). Country sent to /leaderboard/profile is ignored.
  Community country is separate and stays in api/v1/community.js.

## 11 Nov 2026: currency drop-down, calendar phone line, chat back button, visible by default
- Display currency: `F.dispCcy` (localStorage `ftm_ccy`), rates from `/api/v1/fx` (open.er-api, fallback frankfurter, cached 1h). `F.moneyIn` converts every amount; `F.toDisp(n)` for compact cells. Every €/% switch (`.unit-sw [data-unit=amount]`, `.tf [data-u=amount]`) gets a caret (`.ccy-car`) that opens `#ccyPop`. The account currency itself is unchanged.
- Calendar ≤700px: Trades/Wins hidden, Net P&L + Percent + switch on one line. Day pop-up has `#dayNet` (sum of the day's closed trades + shared seg %).
- Performance summary tiles are buttons; `F.fsPop(cell)` opens period statistics.
- Community: every subscriber gets a visible auto profile (member_xxxx) on first `me`; old hidden profiles without `vis_set` become visible once; any save records the member's own choice. Leaderboard default-on needs FTM ENGINE (note sent via owner).
- Phone chat: `.chat-card.in-chat` toggles list/chat; `.chat-back` returns to the list.

## 11 Nov 2026 (evening): Terms and Privacy update (approved by Gospel)
- Terms: new sections 10-15 (Leaderboard & Community, results, copy trading, KYC profile, live charts, emails); old 10-24 renumbered 16-30; homepage footer links moved to #s16/#s18/#s19 (all languages). Risk summary added to section 5. No broker named (master account only). Money amounts never shown to other members.
- Privacy: data table (Leaderboard/Community, KYC profile), legal bases (visibility by default = legitimate interest with opt-out; news emails = consent via Terms 15), sharing with members, deletion right.
- Both pages are English-only (the 49-language engine runs on the main site only). Phone fixes: section menu is one scrolling row, top bar no longer sticky on phones. Test: .github/tests/legal-pages.js.
- CI note (11 Nov): failed-run emails came from Ubuntu package servers being down while installing the test browser (now retried, then installs the browser alone) and a same-millisecond "typing" check (fixed). Before pushing a workflow change, validate it: python3 -c "import yaml;yaml.safe_load(open('.github/workflows/buttons.yml'))". A colon followed by a space inside an unquoted run line breaks the file.

## 12 Nov 2026: Face ID, onboarding, phone speed
- Face ID (passkeys): options are pre-fetched (FTM.pk.prepLogin / prepRegister) so navigator.credentials.get/create runs straight from the tap (Safari needs this). Laptops without a platform authenticator still show the button (the browser offers "use a phone" with a QR code). Test: .github/tests/passkey-e2e.js (virtual authenticator + real @simplewebauthn/server).
- New subscriber with no own account: #appView.onboard + #obCard (3 steps, opens F.cxWizard); zero tiles hidden. F._acctsKnown marks that the engine answered. Connecting accounts get their own subtitle. Test: onboarding-e2e.js.
- Phone speed: #cvPulse runs 3 times only (SVG transform animation re-laid out the page every frame); box-shadow pulses (blink, kycP, grPulse) replaced by opacity/transform; cards off screen get .is-off (animations paused); feature reels rest 12 s after coming into view (.is-rest), wake on touch/hover. Test: perf-idle.js (re-layouts and style work while idle).

## 12 Nov 2026: Account progress chart
- Dashboard chart "Account progress": gold = balance; equity line + light fill green (floating profit) or red (floating loss), in its own "now" zone at the right (min 10% laptop, 16% phone). No fixed amounts: hover/tap shows equity, floating and balance. Owner rejected the fixed floating pill and row (12 Nov).
- Full equity history needs the engine (note sent: GET /customer/accounts/:id/equity-history). The chart already draws `FTM.data.equityHist` ([{t,v}]) when filled; wire the loader once the endpoint is live.
- Test: .github/tests/figures.js ("Account progress chart shows equity").

## 12 Nov 2026: Face ID straight to the scan
- Owner: phone showed an extra "Continue" sheet before Face ID. That sheet is the OS account picker shown when allowCredentials is empty.
- Fix: the device remembers its own credential id (localStorage ftm_pk_id, saved on Turn on and on every passkey login) and the tap sends allowCredentials=[that id, transports internal]. If that fails with NotAllowedError, the next tap falls back to the picker (pickAll).
- Also conditional mediation (passkey offered above the keyboard in the email field, autocomplete="username webauthn"); aborted before the button's request and when the login window closes.
- Test: .github/tests/passkey-e2e.js (the test holds conditional requests pending like a real person, because Chromium's virtual authenticator auto-accepts them).

## 12 Nov 2026: empty dashboard after login (owner: "dent on our credibility")
- Cause: one failed engine request (token renewal hiccup after sleep, or network) made loadLive wipe F.data to empty and delete the snapshot, with no retry. A 401 was treated as final.
- Fix: getAccessToken renews when the token is missing/expiring (refreshSession); call() repeats a 401 once with a forced renewal; loadLive keeps figures on failure and retries (2s,5s,10s,20s,40s), also on 'online' and when the tab becomes visible again (data older than 2 min); an empty account list right after having accounts is re-asked once; a truly ended session opens the login window with a message. client-log events: live_fail, accounts_empty, session_end.
- Test: .github/tests/live-recovery.js (fails 9 checks on the old code).
- Year by year table: nowrap numbers, right-aligned, month under best/worst %.

## 12 Nov 2026: long figures never break (owner, naira)
- Root cause: `.app-tile b{overflow-wrap:anywhere}` broke numbers mid-way, and the shrink-to-fit only covered .hx-stat/.fs-c/#dxVal. Phone CSS also forced sizes with !important.
- Fix: one shared fitter (FTM.fitNums) for every text with a 5+ digit number in #appView/#invView: nowrap, then shrink (setProperty important) until it fits its block, card and screen (min 45%, 7.5px); tap-to-zoom (.fz-on) when shrunk. Runs on DOM changes (MutationObserver, throttled), clicks, resize and every 1.2 s; cached per text+width.
- Test: .github/tests/figures-fit.js (NGN on a big account, 8 sizes x 8 views; FIT_CCY=IDR also passes).

## 12 Nov 2026: accounts stuck on "Connecting" (customer DERIV 101875056, engine never validated it)
- Website: status re-check no longer stops after 15 min (2 s / 5 s / 20 s); setup step 3 and the account row show minutes waiting and any engine status; after 10 min an honest message, and client-log ev connect_stuck emails the support inbox once (server limits: 1 per account per 6 h, 20 a day). Connecting accounts are no longer labelled "View only" in the account picker.
- Engine note sent (scratchpad to-ftm-engine-connect-stuck-101875056.txt): validate the account, root cause, always send a reason, add validation_started_at / validation_attempts.
- Test: .github/tests/connect-wait.js.

## 12 Nov 2026: Brevo paused sending ("account under review")
- Every FTM email goes through Brevo, including account emails (api/_lib/passwordEmail.js: paid/free create-password, login code, reset) and alerts.
- Fallback: when Brevo refuses, passwordEmail.js sends the same flow through Supabase's mailer (resetPasswordForEmail with the setpw redirect; signInWithOtp for login). Logged as email_fallback. If Supabase also uses Brevo SMTP as custom SMTP, set Supabase back to its default mailer or another SMTP until Brevo is restored.
- Abuse protection on /api/v1/auth-email: hidden honeypot field (website), max 8 emails per sender IP per hour, max 300 per hour per instance.
- Likely triggers to check in Brevo (Transactional logs): bursts of welcome emails to unknown addresses, bounces, and marketing campaigns to the sign-up list (every sign-up is added with consent via the Terms).
- Test: .github/tests/email-fallback.js.

## 13 Nov 2026: Brevo ban is final -> Google Workspace
- Brevo refuses automated-trading businesses, even transactional email (final). Owner chose Google Workspace (support@ftmwealthnation.com mailbox, alias no-reply@). Setup guide sent to the owner (DNS at Cloudflare: verification TXT, MX smtp.google.com, SPF include:_spf.google.com, DKIM google._domainkey, DMARC rua to support@).
- Code: api/_lib/mail.js sends every email (Google SMTP smtp.gmail.com:587 when SMTP_USER + SMTP_PASS are set, from SMTP_FROM or no-reply@ftmwealthnation.com, reply-to SUPPORT_EMAIL or SMTP_USER; else Brevo). Used by passwordEmail.js, client-log, status watchdog, Stripe webhook alerts. nodemailer 6.10.1 in package.json. Supabase fallback stays.
- Watchdog "Emails" check logs in to Google every hour once configured.
- Keep account emails factual (no performance figures or promotion) and do not send newsletters from this mailbox.
- 13 Nov (later): Google Workspace verification stalled; owner needs email by 14 Nov. mail.js now tries Resend (RESEND_API_KEY, MAIL_FROM) -> SMTP mailbox (SMTP_USER/SMTP_PASS; the owner's Gmail ftmwebnation@gmail.com with an app password as instant backup; from = SMTP_FROM or the mailbox) -> Brevo -> (account emails) Supabase. Supabase Auth SMTP: smtp.resend.com, port 465, user "resend", password = Resend API key.
- 13 Nov: owner added SMTP_USER / SMTP_PASS (Gmail backup) in Vercel; deployment triggered by this commit so the new variables are used (manual Redeploy asked for an Apple-relay email code).
