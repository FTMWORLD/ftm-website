# Engine changelog for FTM-WEB.COM

One entry per deploy, newest first. Each entry: the date, the commit on the engine's main branch, what changed for the
website, and answers to website requests (ids WR-nnn from docs/engine-requests.md in the website repository).
Served at /api/v1/dev/contract (HTML) and /api/v1/dev/contract.json (JSON).

## 2026-11-06 (afternoon) — INVESTMENT CARRY-OVER (migration 038; contract 2026-11-06.4)

Gospel decided: unused yearly allowances CARRY OVER. This replaces "once per contract year" from the entry below.
- On `first_withdrawal_on` (1st of the month after 13 full months) and on each anniversary before the end (about months
  13, 25, 37, 49) an allowance of 20% of the profit share not yet withdrawn ON THAT DAY unlocks. Every unlocked allowance
  not yet taken stays available until the end: take it at any time, in one or several requests (one waiting at a time).
- `withdrawable_now` = `unlocked_total` - `profit_withdrawn` - `pending`, never above the profit share now. Nothing before
  `first_withdrawal_on`; nothing from `ends_on` (capital + remaining profit share are paid out together).
- `terms.withdrawal_rule` is now "YEARLY_ALLOWANCE_CARRY_OVER", `terms.withdrawal_carry_over` true, new `withdrawal_rule_text`.
- `contract.withdrawals` carries `allowances` [{ unlocked_on, amount }], `unlocked_total`, `next_unlock_on`; the fields
  `used_this_window` and the error INVESTMENT_WITHDRAWAL_YEAR_USED are gone (never used by a customer: no contract existed).
  Older names stay: `next_window_on` = `next_unlock_on`, `remaining_this_year` = `withdrawable_now`.
- INVESTMENT_WITHDRAWAL_LIMIT has a new text and carries `unlocked_total` and `next_unlock_on`. When nothing is left,
  its `message` names the next unlock day ("Your next allowance unlocks on 2029-01-01.").
- `GET /customer/investments` rows: `next_withdrawal_on` = today when something can be withdrawn now, else the next unlock.
- Statements: `withdrawable_close` follows the same rule on the closing day. `terms_version` stays "2026-11-06".
  Payments stay OFF.

## 2026-11-06 (later) — INVESTMENT TERMS 2026-11-06 (migration 037; contract 2026-11-06.3; answer after the next API restart)

Gospel decided the investment terms; they replace the withdrawal and refund rules of the entry below.
- Profit share: 50% of the profit the FTM account made on the customer's capital (a loss is not split; unchanged).
- Withdrawals: ONCE PER CONTRACT YEAR, from `first_withdrawal_on` (1st of the month after 13 full months) and then on
  each anniversary (about months 13, 25, 37, 49): up to 20% of the profit share not yet withdrawn. An unused year does
  not carry over. Capital is never withdrawn. A paid or waiting request uses its contract year; a cancelled or rejected
  one does not. FTM pays it out of the profit only: the capital stays, FTM realizes its equal half of that profit.
- Capital is locked until the end of year 5 (`refund_after_months` 60, `refund_available_on` = `ends_on`). At the end
  the customer gets the capital plus the remaining profit share. From `ends_on` a withdrawal answers
  INVESTMENT_CONTRACT_NOT_OPEN with a plain message about the payout.
- `terms_version` is now **"2026-11-06"** (send it with `POST /customer/investment/contracts`; the old one answers
  INVESTMENT_TERMS_VERSION with `current`). New terms fields: `profit_withdrawal_pct`, `withdrawal_rule`
  ("ONCE_PER_CONTRACT_YEAR"), `withdrawal_carry_over` (false), `withdrawal_rule_text`, `capital_locked_rule`.
- `contract.withdrawals` now carries `rule`, `profit_share_now`, `profit_withdrawn`, `pending`, `window_start`,
  `window_end`, `used_this_window`, `next_window_on`, `withdrawable_now`, `capital_locked_until`. The older names
  `yearly_allowance`, `used_this_year` and `remaining_this_year` stay (remaining_this_year = withdrawable_now).
- `GET /customer/investments` rows: `withdrawable_now` follows the new rule; new `next_withdrawal_on`.
- New error **INVESTMENT_WITHDRAWAL_YEAR_USED** (409): this contract year's withdrawal is made. It carries
  `next_window_on`, and its `message` names the date ("Your next withdrawal is possible from 2029-01-01.").
  INVESTMENT_WITHDRAWAL_LIMIT has a new text and carries `withdrawable_now`.
- Statements carry `profit_withdrawn_to_date` and `withdrawable_close`.
- Payments stay OFF.

## 2026-11-06 — after commit 4e713c5 (on main; INVESTMENT and LEADERBOARD built and proven, answer after the next API restart)

What changed for the website (contract 2026-11-06.1; full design docs/backend-investment-chat-leaderboard.md):
- INVESTMENT (migration 035): `GET /customer/investment` (terms, the FTM account's unit index, the customer's contract
  with its valuation, withdrawal allowance and pending requests), `POST /customer/investment/contracts` (first deposit
  intent, min 1,000 EUR, `terms_version` "2026-10-12", idempotent by `client_request_id`), `POST .../deposits`,
  `POST .../withdrawals` (from the 1st of the month after 13 full months, 20% of the capital per contract year),
  `POST .../refund` (capital back from month 12 at its value), `DELETE .../requests/:entry_id`, `GET .../ledger`,
  `GET .../statements`, `GET .../statements/:period`. **Payments stay OFF**: every deposit, withdrawal and refund is a
  request FTM confirms or pays by hand (`terms.payments_enabled` false); the website shows FTM's payment instructions.
  Valuation the calculator must match: gross value = units x index, profit split 50/50, a loss is the customer's in full,
  customer value = capital + the customer's share. Error codes INVESTMENT_* and FUND_INDEX_MISSING on this page.
- LEADERBOARD (migration 036): `GET /customer/leaderboard?board=MONTH|PREVIOUS_MONTH|SINCE_CONNECT` (opted-in, qualified
  customers ranked by return %, plus the caller's private `you` with `would_rank`), `GET|PUT /customer/leaderboard/profile`
  (opt-in switch, nickname 3-24 chars unique, one change per 30 days), `GET /leaderboard` (website token only, for a
  public page). Boards are recomputed every 5 minutes. No account number, balance, money figure or email ever leaves.
  Error codes NICKNAME_*.
- `GET /customer/me` is unchanged: read `GET /customer/leaderboard/profile` and `GET /customer/investment` for those two.
- REQ-003 / REQ-010 shapes as asked: `GET /customer/investments` -> `{ investments:[{ id, amount, currency, joined_at,
  status, eligible_from, value_now, profit_to_date, share, withdrawable_now, history:[{ month, value, profit }] }] }` and
  `POST /customer/investments/:id/withdraw` -> 202 `{ ok:true, requested:true }` (no body = the whole amount allowed now).

Answers to website requests (contract 2026-11-06.2; every route and code is on this page and in docs/contract.json):
- REQ-003 (investment ledger and withdraw): DONE on main, waits for the restart. The rows are the customer's contracts
  started in the client area (`POST /customer/investment/contracts`) and confirmed by FTM by hand: payments are OFF, so
  nothing is created from a Stripe payment yet (that path is Gospel's decision later). A refusal of the Withdraw button is
  `INVESTMENT_LOCKED` with `locked_until` (= `allowed_from`) and `message`, or `INVESTMENT_WITHDRAWAL_LIMIT`,
  `INVESTMENT_EXCEEDS_VALUE`, `INVESTMENT_REQUEST_PENDING`, each with `message`.
- REQ-010 (investment page data): DONE on main. `status`, `eligible_from`, `value_now`, `profit_to_date`, `share` and
  `history [{month, value, profit}]` are on every row of `GET /customer/investments`; the full picture with the
  withdrawal allowance and pending requests is `GET /customer/investment`.
- REQ-011 (chat and leaderboard: exact routes and JSON): the chat part is answered in the 2026-11-05 entry below and in
  the engine repository file docs/support-chat-design.md (routes, paging, polling every 30 s or the SSE stream, every code
  with its text). Leaderboard: `GET /customer/leaderboard?board=MONTH|PREVIOUS_MONTH|SINCE_CONNECT` (and the public
  `GET /leaderboard`), rows `{ rank, nickname, return_pct, closed_copies, wins, risk_tier, months_on_ftm, is_you }`;
  opt in / out and the nickname with `PUT /customer/leaderboard/profile`. By design there is NO display name, country,
  account size or size filter: a customer appears under a nickname they chose, with a percentage only (privacy rule
  D13 in docs/backend-investment-chat-leaderboard.md). The periods are the three boards; there are no size filters.

## 2026-11-05 — commit 6824d50 (on main; message-everywhere and the one-shape history / positions wait for the next API restart; the support chat is already live)

What changed for the website:
- REQ-006: every `{ ok: false, error }` answer of the customer-facing API carries `message`, plain words for the
  customer (commit f8a0155, one source file in the engine: 48 codes). The Error codes section of this page and
  `errors` in /dev/contract.json are read from that file at request time, so the two can never differ. A route may
  still send a more specific sentence (MASTER_ACCOUNT, ACCOUNT_BLOCKED, ACCOUNT_NOT_CONNECTED do). From the next restart.
- REQ-008 + REQ-001 (commit 6824d50): `GET /customer/accounts/:id/history` answers `trades[]` + `page.total` and
  `/positions` answers `positions[]` for EVERY connected account in the trading account's shape (paused,
  connected-not-trading and view-only rows from the read-only statistics sync once it has read the account; a view-only
  row falls back to the master records). `GET /customer/accounts` carries `deposits`, `withdrawals`, `last_synced_at`
  and `last_reported_at` on every row, and the sync's balance / equity / floating for an account without a terminal.
  From the next restart.
- Support chat, LIVE (commit 9d1b10d, migration 034): `GET /customer/chat`, `GET|POST /customer/chat/messages`,
  `POST /customer/chat/attachments` (raw upload) + `GET .../attachments/:id`, `POST /customer/chat/read`,
  `POST /customer/chat/ticket` + `GET /api/v1/chat/stream?ticket=` (SSE; needs one Cloudflare Access bypass for that exact
  path before a browser can use it; poll `GET /customer/chat/messages?after=` meanwhile). Routes and codes on this page;
  full design docs/support-chat-design.md.

Answers to website requests:
- REQ-006: DONE on main (waits for the restart); the code list with texts is on this page now.
- REQ-008 and REQ-001: DONE on main (waits for the restart); see above. Deposits and withdrawals are on the account row
  and as `type: "BALANCE"` rows of `GET .../stats`.

## 2026-11-05 — commit 8378f25 (deployed 17:43; includes 1944414, 1605cbd, efd1ec0, 2813a95, c275af1 of the same day)

What changed for the website:
- One terminal slot per customer: up to three connected accounts, exactly one trades (`is_trading`). The others read
  `status_reason: PAUSED` = "Connected - not trading"; `POST /customer/accounts/:id/activate` switches (the previous
  account closes its open copies and its terminal is released; a never-built target answers `rebuilding: true`).
- Remove works for every account: `DELETE /customer/accounts/:id` no longer answers 409 ACCOUNT_PROVISIONED for an
  account on a hand-built terminal; the only refusal left is 409 OPEN_POSITIONS (copied trades still open).
- A master login added by a customer becomes a VIEW-ONLY row: listed with `view_only: true`, `display_status: PAUSED`,
  `view_only_label` / `status_text` "View only - FTM master account", balance / equity / currency / floating P/L /
  last reported / open positions filled from the master's heartbeat. History, positions, performance and remove work;
  activate, pause and password answer 409 MASTER_ACCOUNT with a `message` sentence.
- New error texts (in `message`): MASTER_ACCOUNT ("This is the FTM master account; it can't trade as a copy of itself.
  See its statistics under Master performance.") and ACCOUNT_BLOCKED ("This account is blocked by FTM and cannot
  trade. Please contact support.").
- Statistics for EVERY account a customer added, live since 17:43 (migration 033, commits 1944414 + 1605cbd):
  `GET /customer/accounts/:id/stats` (balance, equity, P/L, growth, drawdown, open trades, the whole deal history with
  deposits and withdrawals as `type: "BALANCE"` rows), `POST /customer/accounts/:id/stats/refresh` (one general
  read-only sync for any added account, the trading one and the view-only row included; 409 ACCOUNT_NOT_CONNECTED only
  for an account that cannot be logged into), `GET /customer/master/performance`. `data_source` is STATS_SYNC after the
  first read, LIVE_TERMINAL while the trading terminal reports fresher numbers, MASTER_RECORDS for a view-only row before
  its first read, FTM_COPIES for an account never read. Full field list: docs/client-area-stats-api.md.
- Database pool timeout raised after the 16:35 connect-timeout outage (seven customer 500s); no contract change.
- This contract page: `GET /api/v1/dev/contract` and `/dev/contract.json` (live on the engine; the public hostname
  answers 403 from Cloudflare Access until FTM adds a bypass for /api/v1/dev/*); the engine polls docs/engine-requests.md
  in the website repository every 30 minutes and mails FTM every new open REQ.

Answers to website requests (docs/engine-requests.md, read 2026-11-05 17:40; statuses set by FTM ENGINE 18:15):
- REQ-007 (delete always frees): DONE in the 16:56 deploy (commit 2813a95). An account on a hand-built terminal is
  removed synchronously; a running provisioned account is gone from `GET /customer/accounts` at once while its terminal
  is taken down in the background. The only refusal left is 409 OPEN_POSITIONS. Proven by verify-client-actions R1-R4.
- REQ-005 (master on POST /accounts): SUPERSEDED by Gospel's later rule (17:08 and 17:23 deploys). A master login is not
  refused: it is added as a VIEW-ONLY row (202 like every connect, then listed with `view_only: true`, `display_status`
  PAUSED, `view_only_label` "View only - FTM master account"), never a copy target. Activate / pause / password on it
  answer 409 MASTER_ACCOUNT with `message` "This is the FTM master account; it can't trade as a copy of itself. See its
  statistics under Master performance." Known gap: a master login that ANOTHER customer connected and removed earlier
  still answers 409 ACCOUNT_ALREADY_CONNECTED; FTM is on it.
- REQ-004 (view-only master in GET /accounts): CONFIRMED. `view_only`, `view_only_label`, `status_text`, balance /
  equity / floating P/L / last reported / open positions from the master heartbeat.
- REQ-001 (one data shape, deposits and withdrawals) and REQ-008 (read-only history for every account): done on main
  at 19:23 (entry above), waits for the next restart. Available today: `GET /customer/accounts/:id/stats` (live
  since 17:43) answers for every added account with `deposits_total`, `withdrawals_total`, `start_balance`, `growth_pct`,
  `max_drawdown_pct` and `history[]` = every deal of the account, deposits and withdrawals as `type: "BALANCE"` rows
  (`profit` > 0 deposit, < 0 withdrawal); history / positions / performance already answer for every connected account
  with FTM's copies, and `last_reported_at` is on the account row. Field list: docs/client-area-stats-api.md.
- REQ-006 (plain-words reason on every refusal): done on main at 19:23 (entry above), waits for the next restart. Already here: every code with a text the site may show, in the Error codes section of this
  page and under `errors` in /dev/contract.json; `message` is present today on MASTER_ACCOUNT, ACCOUNT_BLOCKED and
  ACCOUNT_NOT_CONNECTED (and `note` on ACCOUNT_NOT_READY).
- REQ-003 (investment ledger and withdraw): WAITING for Gospel's approval of the design
  (docs/backend-investment-chat-leaderboard.md in the engine repository); nothing is built until then.
- REQ-002 (live test customer with GitHub secrets): NEEDS GOSPEL (he stores the secrets FTM_TEST_EMAIL /
  FTM_TEST_PASSWORD). The engine side already has an hourly API-level test customer (ftm-e2e-test, 34/34 live).
- REQ-009 (contract readable from the website session): the engine cannot push to the website repository without
  credentials Gospel has not given. Two options, Gospel's decision: (1) allow api.ftmwealthnation.com in the website
  session's network settings AND add a Cloudflare Access bypass rule for the path /api/v1/dev/* (today the public host
  answers 403 from Cloudflare Access for that path, like every path without the website's service token); or (2) give
  FTM a deploy key for the website repository limited to docs/, and the engine pushes the contract and changelog as
  Markdown after each deploy.

## 2026-11-04 — commit c275af1 and earlier (live)

What changed for the website:
- Customer one-click actions for every customer: pause (`close_open: true` = pause and close everything), resume,
  risk tier change (GROWTH needs `growth_acknowledged: true`, else 409 GROWTH_ACKNOWLEDGEMENT_REQUIRED with the
  sentence), close one position, performance (`GET /customer/accounts/:id/performance`).
- Three connected accounts per customer (`account_limit` on `GET /customer/accounts`, 409 ACCOUNT_LIMIT on the fourth).
- Every connect refusal is logged and mailed to FTM with who / what / why.

Answers to website requests:
- none.
