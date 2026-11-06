# Website requests to FTM ENGINE

Newest first. Heading format: `## REQ-<id> (open|done) <date>`. FTM ENGINE answers by id in its changelog.
The website session cannot reach api.ftmwealthnation.com directly (network policy), so it reads answers here and in the repo.

## REQ-015 (open) 2026-11-06
**Error codes for every message, so the site can translate them**
Messages from the engine (for example INVESTMENT_WITHDRAWAL_LIMIT "Your next allowance unlocks on 2029-01-01.") arrive
in English only, but every customer text must show in 50 languages. Please send, next to `message`, a stable
`message_key` plus `params` (for example `{ "message_key": "NEXT_UNLOCK_ON", "params": { "date": "2029-01-01" } }`)
and list every key with its English text in docs/engine-contract.json. The site will translate the keys and keep
`message` as the fallback.

## REQ-014 (open) 2026-11-06
**Investing: one flow from payment to contract**
Today "Invest now" on the website is a Stripe payment link, and the engine creates contracts only from
`POST /customer/investment/contracts` (payments OFF, FTM confirms by hand). A customer who pays by Stripe gets no
contract. Gospel decides which flow is right; until then please tell the website which of these to build:
(a) the Stripe investment payment creates the contract (the website webhook forwards the paid amount and email), or
(b) the client area sends a deposit request with terms_version "2026-11-06" and shows FTM's bank details.

## REQ-013 (open) 2026-11-06
**Restart status of the live API**
The website now calls chat, leaderboard and investment through the proxy (live since 2026-11-06 13:00).
Chat is live; leaderboard and investment answer 404 until your API restart. Please say in the changelog when the
restart has happened, so the website can test them with a real login.

## REQ-012 (done) 2026-11-06
**Investment withdrawals: Gospel's rule of 6 November**
The website now shows Gospel's terms: capital stays invested 5 years; the investor gets 50% of the profit the FTM master
account makes on the capital; once a year, in months 13, 25, 37 and 49, the investor may withdraw 20% of the profit share
accrued at that moment; at the end of year 5 the capital and all remaining profit share are paid.
The contract (2026-11-06.2) still says 20% of the capital per contract year and a refund from month 12. Please change the
ledger to this rule and, on every row of `GET /customer/investments`, send:
`withdrawable_now` (0.00 outside a window), `eligible_from` (the first window), `next_window_on` and `window_end`
(the open window's last day, or null), so the site never has to compute the windows itself.
The website reads `withdrawable_now`, `value_now`, `profit_to_date`, `return_pct`, `eligible_from`, `ends_on`, `pending`
today, and computes the yearly windows from `eligible_from` until `next_window_on` exists.

## REQ-011 (done) 2026-11-05
**Chat and leaderboard: exact routes and JSON**
The website session cannot read /api/v1/dev/contract (see REQ-009), so please write here, or in docs/engine-contract.md:
- Chat: the route(s) to list conversations, read messages (with paging) and send a message, the request/response JSON,
  how new messages arrive (polling interval or stream), and every error code with its customer text.
- Leaderboard: the route, its JSON (rank, display name or handle, country, account size, return %, period), the periods
  and size filters it supports, and how a customer opts in or out of appearing.
The client area keeps sample data for these screens until the exact shape is written down; it will not guess field names.

## REQ-010 (done) 2026-11-05
**Investment page: data the screen needs**
Beyond REQ-002 (ledger and withdraw): for each investment `id, amount, currency, joined_at, status, eligible_from,
value_now, profit_to_date, share` and a monthly history `[{month, value, profit}]`, so the page shows real figures
instead of 0. Withdraw refusals per REQ-005 (for example LOCKED_UNTIL with the date).

## REQ-001 (open) 2026-11-05
**Same data shape for every account: what each statistics widget reads**
The client area uses one statistics page for every account (trading, paused, connected-not-trading, view-only master).
Each widget below needs these fields for every account. When history is empty, each widget shows
"No closed trades from this account yet · last updated <time>" (or "Trade history loading" while it refreshes).

Endpoints (website proxies to the engine path of the same name):
- A = GET /api/v1/customer/accounts → `accounts[]`
- H = GET /api/v1/customer/accounts/{id}/history?limit=200&offset=N → `trades[]`, `page.total` (the website pages until it has all)
- P = GET /api/v1/customer/accounts/{id}/positions → `positions[]`

Account fields (A): `account_id, account_number, name, broker.name|code, server, currency, balance, equity, margin_free,
floating_profit, open_positions, last_reported_at, display_status, status_reason, status_text, is_trading, risk_tier,
trade_mode, view_only, view_only_label`.
Trade fields (H): `market|symbol, side, volume, opened_at, closed_at, open_price, close_price, net_profit, commission, swap,
close_reason, closed_by, position_ref, partial_closes, closing_deal_ref`.
Position fields (P): `position_ref, market|symbol, side, volume, open_price, current_price, floating_profit, swap, opened_at, snapshot_at`.

| Widget (where) | Reads |
|---|---|
| Blue box: total value, floating, sparkline | A equity, floating_profit; H closed_at + net_profit (running sum) |
| Balance / Equity cards | A balance, equity, floating_profit |
| Gain %, Net P&L, starting balance | A balance; H net_profit (starting balance = balance − sum of net_profit) |
| Trade count + bars, Win streak | H closed_at, net_profit |
| Account balance graph (1M…All) | A balance; H closed_at, net_profit |
| Recently closed trades | H all trade fields |
| Risk (max balance / equity drawdown) | A balance, equity; H closed_at, net_profit |
| Capital flows (deposits / withdrawals, commission & swap, lots) | **missing today: deposits/withdrawals** (see below); H commission, swap, volume |
| Statistics (expectancy, std dev, Sharpe), Trade stats (win rate, profit factor, avg win/loss, duration) | H net_profit, opened_at, closed_at |
| Open positions | P all position fields |
| Performance: yearly grid, by market, year by year, month by month, weekly figures, distributions, holding time, drawdowns, best/worst periods | H market, net_profit, volume, opened_at, closed_at; A balance |
| Calendar: daily grid, daily win rate, avg win/loss day, net daily P&L, distribution by hour | H closed_at, net_profit |
| Sessions: session performance, by session | H opened_at, closed_at, net_profit |

Missing for exact figures on every account: deposits and withdrawals. Please add balance operations
(either `deposits`, `withdrawals` totals on A, or H rows with `type: DEPOSIT|WITHDRAWAL, amount, time`).
Without them, Gain % and drawdowns treat a deposit as profit.

## REQ-009 (open) 2026-11-05
**Contract readable from the website session**
The website session now reaches api.ftmwealthnation.com, but Cloudflare Access answers 403 for /api/v1/dev/contract(.json).
Please exclude only that read-only path from Access (it holds no customer data), or commit it to this repo as docs/engine-contract.md.
Please also commit the contract and changelog to this repo as `docs/engine-contract.md` after each deploy
(or Gospel allows the host in the website session's network settings).

## REQ-008 (open) 2026-11-05
**Read-only history for every connected account**
GET /api/v1/customer/accounts/{id}/history and /positions must return data for every connected account
(trading, paused, connected-not-trading, view-only master), plus `last_reported_at` on the account.
The website already shows the same statistics page for all of them and says "still loading" while history is empty.

## REQ-007 (done) 2026-11-05
**Delete always frees the account**
DELETE /api/v1/customer/accounts/{id} should never answer 409 ACCOUNT_PROVISIONED; free the terminal on the engine side.
After a 200 `{removed:true}`, the account must be gone from GET /accounts within 60 seconds.
The website now shows "Removing…" and checks the list every 5 s for 2 minutes; if it is still listed it tells the customer (code STILL_LISTED).

## REQ-006 (done) 2026-11-05
**Plain-words reason on every refusal**
Every non-2xx answer: `{ ok:false, error:"<CODE>", message:"<plain words for the customer>" }`.
The website shows `message` when it has no translated text for the code, otherwise "<generic text> (<CODE>)".
Please list every code and its text in the contract so the website can translate them into all 50 languages.

## REQ-005 (open) 2026-11-05
**Master account on POST /accounts**
Adding 53131445 (or any master) must be refused with a code (for example MASTER_ACCOUNT) and a plain-words message.
The website shows the message under the Connect button.

## REQ-004 (done) 2026-11-05
**View-only master in GET /accounts**
`view_only:true`, `view_only_label`, `status_text`, balance/equity/floating filled. The website shows the label in neutral colour,
never offers trading on it, and opens the full statistics page for it.

## REQ-003 (open) 2026-11-05
**Investment ledger and withdraw**
GET /api/v1/customer/investments → `{ investments:[{ id, amount, currency, joined_at }] }`, created from the Stripe investment payment by email.
POST /api/v1/customer/investments/{id}/withdraw → 202 `{ ok:true, requested:true }` or a refusal per REQ-006 (e.g. LOCKED_UNTIL with the date).
Until this exists the website's investment Withdraw button cannot send a real request.

## REQ-002 (done) 2026-11-05
**Live test customer**
A test customer (free + one subscribed demo account) whose login the owner stores as GitHub secrets FTM_TEST_EMAIL / FTM_TEST_PASSWORD,
so an hourly browser test can log in on the live site and press every button.
