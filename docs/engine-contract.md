# Engine changelog for FTM-WEB.COM

One entry per deploy, newest first. Each entry: the date, the commit on the engine's main branch, what changed for the
website, and answers to website requests (ids WR-nnn from docs/engine-requests.md in the website repository).
Served at /api/v1/dev/contract (HTML) and /api/v1/dev/contract.json (JSON).

## 2026-11-20 — GROUP COPIES THAT CAN LIVE, HONG KONG AFTERNOON BREAK, MASTER GROWTH COUNTS ENTRY COMMISSION (not committed yet; live 12:17 Berlin with the owner's "Yes, put both live" and "Yes, all three", API restarted)

- WEBSITE: nothing to change. No API field changed. One figure moves: the master's growth_pct (and the figures built from the
  same deals: gross profit / loss, daily / weekly / monthly, by symbol, curves) now counts what the broker books at ENTRY
  (commission on USDJPY and gold; 22.69 USD so far), so growth_pct equals balance minus deposits again (10.45 -> 10.43 today).
  An IN row of the master's history may now carry "commission" and "net" (same fields as before, they were 0 / null).
  A deposit or withdrawal of the master is never counted as trade profit (balance_ops_total is subtracted).
- GROUP COPY (small accounts; switch COPY_GROUPS stays ON): the first live group copy (19 Nov 21:29 Berlin, Bitcoin) was refused
  GROUP_MASTER_NOT_OPEN. A whole-life scripted test showed three faults, all fixed in shared code for every account:
  the claim guard read only the Sender's once-a-minute position list (now also the master's own OPEN events of the last
  COPY_GROUP_FRESH_OPEN_S = 120 s with no CLOSE; 0 = old behaviour) and refuses a group the master has already left;
  the orphan check would have closed every group copy after 3 minutes (now a group copy is an orphan only when NO piece of its
  group is on the master's fresh list); the trade monitor would have flagged every group copy (now it compares with the group).
- GROUPING: a group is anchored on its FIRST open and every open belongs to at most one group (60 s inclusive), as in
  FTM MACHINE's model. 372 of the 376 master opens on record group the same as before; the 4 others are chain cases.
- ALERTS: HK50's afternoon break (08:30-09:15 UTC) is no longer "market open" for the dead-chart check (false CHART_DEAD on
  19 Nov 09:53 Berlin); a dead chart outside the breaks is still caught.
- Proof: new gate test verify-group-life (29 checks on the real 19 Nov signal: claim, monitor, orphan check, exit; rolled back),
  verify-reconcile repaired and in the gate, verify-alert-tiers T7b, FTM MACHINE's 108-trade list 324 of 324 decisions the same
  WITHOUT the helper rows that hid the fault on 19 Nov. Gate SAFE on the staged code before and on the live code after.
  Backups C:\FTM\_backups\*.before-groupfix-20261120; bundle admin-bundle-20261120a.ps1.

## 2026-11-19 — FTM MACHINE 3.8 ON THE PROP TERMINAL AND THE MASTER (not committed yet; live 16:13 / 16:25 Berlin with the owner's "Master and prop")

- WEBSITE: nothing to change. No API field changed. Two new strategies will register themselves at their first trade:
  34696 breakout hold (gold) and 34697 box break (US Tech, HK50); both are inside the relay range 34636-34699.
- EA 3.8 = 3.7.1 + breakout hold, box break, the 36-hour trend filter, each behind one input (default OFF), plus live-only restart
  care (first candle after a start skipped, last traded level kept in a terminal global variable). Source sha256 294a3a30...18ad
  built on the server from FTM MACHINE's patches (hash = the tested source), compiled on the server: ex5 bf292a29...c7fb.
- Switches: master XAUUSD bhOn, BTCUSD trendFilterOn, USTEC bpOn, HK50 bpOn, USDJPY none; prop XAUUSD bhOn + bhTrend 10 + bhTrail 96,
  BTCUSD trendFilterOn, NDX100 bpOn, USDJPY none. Read back from the charts MT5 rewrote after loading: 303 old inputs unchanged
  on all nine charts, 22 new, all at default except these.
- Server check before the install: scripts/dryrun-38-list.js, 108 model trades through the real planner, group copy and claim
  guard in rolled-back transactions: 324 of 324 account decisions the same as FTM MACHINE's model. Gate 57/57.
- Master run: the journal wrote HK50's "loaded successfully" line late; the procedure's proof step was stopped by hand before it
  rolled back a healthy terminal, then PROOF-ONLY = OK (logged in update-ftm-ea.log). Backups FTM_EA_BACKUP-20261119-160921 (prop),
  -161752 (master).

## 2026-11-19 — FTM MACHINE 3.7.1 ON THE MASTER AND THE PROP TERMINAL; DEAD-CHART HEARTBEAT = STATE FILES ONLY (not committed yet; live 14:32-14:47 Berlin with the owner's yes, no API restart)

- WEBSITE: nothing to change. No API field changed.
- EA 3.7.1 = 3.7 plus only: the timer now starts on a live chart, a tick watchdog (log line "STALLED ...", MT5 alert, re-subscribe;
  it never trades), and saved M and W patterns older than 72 h are dropped at load ("STATE DROPPED ..."). Source built on the
  server from FTM MACHINE's patch on the staged 3.7 source: sha256 6f2e0511...bbf6 = the regression-tested source (ten of ten
  runs trade-identical to 3.7, normal and prop settings). Compiled on the server: ex5 sha256 70daa04a...a505.
- Installed with ops/update-ftm-ea.ps1, one terminal at a time: MT5_Prop 14:34-14:41 (backup FTM_EA_BACKUP-20261119-143414),
  MT5_Master 14:41-14:46 (backup FTM_EA_BACKUP-20261119-144156); both proofs OK. Master position 2102681164 untouched; its six
  M and W waiting orders were removed and placed again by the EA's own restart rule; the Asian Breakout order was kept.
- src/services/ea-silence.js: a chart's heartbeat is now the FTM3_m{w,x,y,z} state files only (saved from OnTick). 3.7.1 writes
  the hourly STATUS line and the STALLED line from its timer, so a fresh log is no longer proof of life; with the old rule a
  stalled chart would never have reached the 60-minute automatic restart. Backup _backups/ea-silence.js.before-statefiles-20261119.
  Proofs: _stage-371/prove-liveness.mjs, verify-ea-silence 25/0, verify-alert-tiers 21/0.

## 2026-11-19 — COPY STOPS FROM THE COPY'S OWN FILL: INSTALLED, SWITCHED OFF (this commit; installed 05:15 Berlin with the owner's click, API restarted; COPY_STOP_MODE=ABSOLUTE = unchanged behaviour)

- WEBSITE: nothing to change. No API field changed. Nothing about trading changes while the switch is ABSOLUTE.
- Root cause (measured, 21 days, 95 copies): SL / TP were copied as the master's ABSOLUTE prices. Deriv (customers) and IC Markets
  (master) quote differently (US Tech gap -30..+42 points), so a copy's stop sat 0.56x-1.54x of the planned distance from its
  own fill: 5 copies stopped out on trades the master won (-141.33 USD), and up to 54 % more money at risk than planned.
- New src/services/copy-stops.js, used by the claim route (routes/execution-nodes.js) only with .env COPY_STOP_MODE=DISTANCE
  (optionally COPY_STOP_DISTANCE_ACCOUNTS for a proof):
  - the OPEN is sent as before; at its fill the engine records ONE follow-up stop change for that account (event
    FTM-STOP-RECONCILE, the welcome trade's pattern);
  - one rule from then on: offset = copy fill - master open (frozen at the fill); copy SL = master's current SL + offset + the
    existing cushion on the original distance; copy TP = master's current TP + offset; every master trail uses it;
  - a stop change whose copy has no recorded fill yet waits (deferral); hard guards at the claim: G-STOP-CONSISTENT,
    G-STOP-WIDTH (<= 1.10x), G-STOP-OFFSET, and G-GAP (an OPEN is not sent when the master's market moved > 50 % of the stop
    distance, fresh price feed only); refusals keep the copy's stops and alert;
  - welcome trades, first-trade catch-up copies and group copies are not touched;
  - SIZE CLASS (owner 19 Nov, installed 05:30 with his click): an account whose sizing base is under COPY_SMALL_ACCOUNT_USD
    (2,000 USD, the minimum-lot line) keeps today's stops even in DISTANCE mode unless .env COPY_STOP_DISTANCE_SMALL=ON (OFF).
    By class, never by account id: every present and future small account alike. Per-account check (21 days,
    scripts/copy-stops-per-account.js): NOT proven better for the small accounts, so they stay as they are;
  - every claim records the placement stop next to the computed one (ack copy_stops; log line COPY_STOPS).
- Dry run scripts/copy-stops-dry-run.js: all 95 copies at 1.05x with DISTANCE, 0 guard refusals.
- Gate: new scripts/verify-copy-stops.js (20 checks on the real claim and result routes, rolled back) and, from 18 Nov,
  scripts/verify-alert-tiers.js (21 checks). verify-leaderboard L9, verify-rebase R5, verify-account-stats T3b and
  verify-first-trade A0 no longer depend on live data or on the day they run.
- Next, each with the owner's yes: live proof on the demo account, then all accounts.

## 2026-11-18 — ONLY WHAT MATTERS REACHES THE PHONE; A DEAD MASTER CHART IS SEEN IN 20 MINUTES AND RESTARTED ONCE (this commit; live 18:40 Berlin, owner's yes for each, no API restart)

- WEBSITE: nothing to change.
- Incident: the master's XAUUSD / USTEC / USDJPY charts (FTM MACHINE 3.7 on MT5_Master) stopped at the Friday 13 Nov close and
  stayed dead until 18 Nov 18:17 (EA threads blocked; revived by a controlled restart with their stale state moved aside).
  EA_SILENT did fire, but 1,629 Telegram pushes in 6 days (a repeated relogin line) buried it and it resolved itself at every
  daily market break.
- scripts/basic-alerts.js 0.10.0 + new src/services/alert-tiers.js:
  - CRITICAL -> Telegram + email once, then only when still true after 1 h / 6 h / 24 h / every 24 h (with the duration), one
    RESOLVED; a repeated critical event at most once an hour ("+N more"). EXEC_FAILED is critical.
  - WARNING -> one daily summary (08:00 Berlin). INFO -> the log only.
  - CHART_DEAD_<terminal>_<symbol> (replaces the 2-hour EA_SILENT): nothing written for 20 minutes while the market has been
    open that whole time; a market break pauses it instead of resolving it.
  - Automatic recovery (switch file C:\FTM\ops\FTM_CHART_AUTO_RESTART_ON.txt): after 60 min of open market the terminal is
    restarted ONCE through the watchdog (state backed up, dead charts' state older than 12 h moved aside, login file written);
    never twice in 6 h, never with an order in flight.
- Noise fixes: the relogin task can read the price-feed login (FTM_FEED mirrored) and reports a missing entry once per launch;
  the hourly client-area test uses its fake login (the demo login belongs to the daily new-customer test) and prunes its
  first_trades rows; [ALERT] codes may contain digits.

## 2026-11-16 (night, 2) — A DEPOSIT OR WITHDRAWAL RE-BASES THE COPY SIZE BY ITSELF (commit a97fa2f; live 02:10 Berlin, owner's yes, API restarted)

- WEBSITE: nothing to change. No API field changed. Returns, leaderboard and start dates are untouched, as for every re-base.
- Owner's decision (16 Nov): no one has to report a top-up. Per-trade sizing on the live balance was considered and NOT taken
  (the monthly re-base backtests better).
- Every minute (src/services/rebase.js runDepositRebase): when an ACTIVE account's broker deal history shows a deposit or
  withdrawal (BALANCE deal) booked after its current base was set, and the balance reading is newer than that deal, the account
  is re-based by itself.
  - Same guards and audit line SIZING_REBASED; why DEPOSIT / WITHDRAWAL.
  - Never twice for the same deal; a withdrawal waits until the balance shows it.
- The 0.2x-5x bounds now count the transfers booked since the base was set (a booked top-up from 500 to 3,000 is accepted).
- Balance watch: the deal history is re-read by the stats sync only after a copy closes or while a customer views it. So a
  balance move that no closed copy explains (more than 5 USD and 1 %) requests a re-read (account_stats_sync reason
  BALANCE_CHANGE, at most every 30 min per account). The watch never re-bases by itself.
- Kill switch: .env COPY_REBASE_ON_DEPOSIT=ON|OFF. The monthly run and the operator button stay.
- First live use, 02:11 Berlin: account 2022 was re-based 500 -> 534.88 (WITHDRAWAL; net transfers -20.17 booked after its
  8 Nov activation), exactly as the dry run said.
- Gate: scripts/verify-rebase.js now has 17 checks (R12-R17 new). New scripts/deposit-rebase-dry-run.js.

## 2026-11-16 (night) — THE COPY SIZE FOLLOWS THE ACCOUNT BALANCE (RE-BASE) (commit 8105bd8; migration 044 and live 01:52 Berlin, owner's yes for each, API restarted)

- WEBSITE: nothing to change. No customer API field changed. Customers' return figures, the leaderboard, the statistics and
  start dates do NOT move on a re-base (proven).
- Owner's decision (16 Nov) after FTM MACHINE's backtest. Sizing fixed at activation never compounds: 500 USD Balanced from
  2020 to 2025 ends at 1,941 with fixed sizing and at 15,059 with a monthly re-base. Over rolling 24-month windows: median
  +96 % fixed, +204 % re-based monthly, +216 % for the master.
- Migration 044 (applied with the owner's yes) adds to risk_profiles:
  - sizing_reference_balance (NULL means size on customer_reference_balance, exactly as before) and sizing_rebased_at.
  - A trigger: writing customer_reference_balance (activation, switch-off, a restore) clears the sizing balance.
- New src/services/rebase.js:
  - The planner, the claim guard and the small-account rule size on COALESCE(sizing, reference).
  - Operator button "re-base" on /api/v1/operator/ = POST /api/v1/operator/accounts/:id/rebase {why: DEPOSIT | WITHDRAWAL |
    OPERATOR} (master token), for use after a deposit or a withdrawal.
  - Monthly run: days 1-3 of each Berlin month, every ACTIVE account once, to its balance (up or down).
    .env COPY_REBASE_MONTHLY=ON; the first run is 1 Dec.
  - Kill switches: COPY_REBASE_MONTHLY=OFF, COPY_REBASE_OPERATOR=OFF.
- Hard guards (a refusal changes nothing; every refusal except BUSY raises [ALERT] REBASE_REFUSED):
  - the account is ACTIVE and connected;
  - the balance reading is under 5 minutes old and in the reference currency;
  - no OPEN copy is waiting (otherwise BUSY: tried again later);
  - the new value is 0.2x-5x of the current base.
- Every change writes the audit line SIZING_REBASED {before, after, why, small_account_before/after}. Open copies are never
  touched.
- The 2,000 USD small-account line follows the sizing base: a re-base to 2,000 or more leaves the rule, below 2,000 enters
  it.
- Gate:
  - new scripts/verify-rebase.js (11 checks; real DB, rolled back): the guards; the Berlin month; one audit line, the
    reference and the start date unchanged; the planner and the claim guard follow the new base; returns and every
    leaderboard identical; open copies untouched; the 2,000 line both ways; the trigger; monthly OFF / day 4 / day 1 once
    / no second run; the switches.
  - scripts/rebase-dry-run.js: the 7 Nov dry run for every ACTIVE account.
  - verify-point-value and verify-small-min-lot now stay meaningful after their own deploy: they compare with the 3x rule
    through its kill-switch value instead of "the live code".

## 2026-11-16 — SMALL ACCOUNTS NEVER OVER-RISKED; HK50 COPIES SIZED RIGHT; RISK BUDGET OFF (commit c83080b; live 01:21 Berlin, owner's yes in the operator chat, API restarted)

- WEBSITE: nothing to change. No API field changed.
- Owner's decision (16 Nov) after FTM MACHINE's calibrated backtest. Method: real ticks plus 1-minute data, a fresh account
  started every month from Jan 2020 to Nov 2025. Result at 500 USD Balanced:
  - with the new rule: 12-month median +48 %, worst +4 %, worst dip 27.8 % (master 27.6 %)
  - with the old rules: worst dip 73 %
- Risk budget OFF for every account (.env COPY_RISK_BUDGET=OFF).
- New src/services/min-lot-rule.js applies to accounts whose reference balance is under 2,000 USD:
  - The broker minimum lot is allowed only up to a multiple of the normal size: 3x on BTCUSD and USDJPY, 1.5x on gold,
    US Tech 100 and HK50. Otherwise the copy is skipped as SKIPPED_MIN_LOT_WOULD_EXCEED_<f>X.
  - It is applied in the planner, the group copy (decision and claim proof) and the claim guard G-SIZE.
  - Accounts of 2,000 USD and up keep 3x on every market.
  - Settings: COPY_SMALL_ACCOUNT_USD, COPY_SMALL_MIN_LOT_FACTOR(_BTC/_JPY/_GOLD/_NDX/_HK50). No factor can be above 3.
  - Kill switch: COPY_SMALL_MIN_LOT_FACTOR=3, then an API restart.
  - The reference balance is set at activation only; a deposit or growth never moves an account over the line.
- New src/services/point-value.js fixes HK50 sizing:
  - Deriv "Hong Kong 50" reports its tick value in HKD, unconverted. The planner read it as 1 USD per point instead of 0.1275,
    so HK50 copies were about 7.8x too small.
  - The value is now converted with the master's USD rate for that currency. If no rate exists, the copy is skipped, never
    guessed.
  - The planner and the claim guard use the same rule.
- Gate: new scripts/verify-point-value.js (10 checks) and scripts/verify-small-min-lot.js (7 checks).
  - Replay of all 49 real minimum-lot decisions of the two 500 USD accounts: the old rule took 16, the new rule takes 5
    (Bitcoin). Nothing is newly taken.
  - The dry run of every market on every ACTIVE account is identical to before for account 184 (HK50 aside).
  - verify-group-copy now proves the group mechanics with the kill-switch value; its real 10 Nov gold signal no longer
    gives the 500 USD account a group copy.
- Files:
  - New: src/services/min-lot-rule.js, src/services/point-value.js.
  - Changed: execution-planner.js, group-copy.js, trade-guards.js, risk-budget.js (the reason pattern accepts "1.5X").
  - Backups: C:/FTM/_backups/*.before-small-minlot-20261116.
- Deploy gate: see the commit.

## 2026-11-15 (afternoon) — DURING A BROKER OUTAGE EVERYTHING WAITS; NOTHING CUSTOMERS SEE CHANGES (commit 897508e; live 16:35 Berlin, owner's click, API restarted)

- WEBSITE: nothing to change. During a broker outage every account stays ACTIVE, the leaderboard keeps the last figures and
  rank, and no customer email goes out.
- Owner's rule (15 Nov): when a broker server is down or in maintenance, nothing is switched off, parked or set to
  ACTION_REQUIRED. Copying resumes by itself when the broker is back. Only a CONFIRMED wrong password leads to
  ACTION_REQUIRED.
- Watchdog (scripts/relaunch-terminals.js):
  - A terminal that lost its broker is left running while its journal of the last 60 minutes shows the broker down
    (BROKER_WAIT). After that, one relaunch per hour.
  - Every "login refused" park of a running account first goes through refusalVerdict (src/services/broker-auth.js).
    During an outage it waits. A first refusal is re-checked with a fresh terminal (AUTH_RECHECK). Only a second refusal,
    with the broker answering normally, parks the account.
  - New internal alerts for the owner only: one "[ALERT] BROKER_DOWN server=... accounts_waiting=N" and one
    "[ALERT] BROKER_BACK" per broker server. A reconnect within one pass raises nothing. State is kept in
    C:/FTM/logs/broker-outage-state.json.
- Login check:
  - "Broker did not answer" (CONNECT_FAILED) is retried about every 10 minutes for about a day
    (MAX_BROKER_DOWN_ATTEMPTS 150) instead of ACTION_REQUIRED after 2 tries. The STUCK stop does not apply.
  - A wrong password needs two refusals in a row. Replaces the 29 Sep rule "a refused password is never retried". A new
    customer who mistypes is told about 10 minutes later.
  - Files: scripts/validate-account.js, src/routes/validator.js.
- Checked, unchanged:
  - Customer emails and the leaderboard follow the account status only, and that status no longer changes on an outage.
  - The stats sync only records its own retry state.
  - Queued CLOSEs never expire; only a stale OPEN does. Open trades are closed when the terminal is back.
  - The A2 "broker disabled trading on the account" marker still needs two connected readings and is not an outage.
- Gate: new scripts/verify-broker-wait.js (19/0) simulates a 6-hour outage:
  - No refusal, no park, at most one relaunch per hour.
  - Exactly one down and one back alert per server.
  - Every live ACTIVE account "disconnected 6 h" (rolled back) stays ACTIVE, the leaderboard is identical and no email
    goes out.
  - The validator route keeps a new account PENDING through an hour of "broker did not answer" and needs two refusals.
- verify-connect-speed A10 expects the re-check of a first refusal.
- Deploy gate: RESULT SAFE TO DEPLOY (15 Nov, after the bundle).

## 2026-11-15 — A BROKER OUTAGE NEVER SWITCHES A CUSTOMER OFF; LEADERBOARD BACK (commit 58a3f39; job files live 16:06 Berlin with the owner's click, no API restart)

- WEBSITE: nothing to change. GET /customer/leaderboard?board=MONTH shows the customers again (Tanaya, G-Marine,
  member_fff2 + FTM MASTER, rebuilt 16:06 Berlin).
- Cause: Deriv's live servers were in maintenance at 02:22 Berlin (15 Nov). The relauncher misread the outage:
  - Account 2022: the line "authorization on DerivSVG-Server failed (Service is not available)" was taken as a refused login.
    The account was switched off and marked ACTION_REQUIRED.
  - Account 4701: the broker was unreachable, so it was parked at the 3-relaunches-per-hour cap.
  - The leaderboard ranks only ACTIVE accounts, so both customers dropped off. The owner's demo account 184 (Deriv-Demo
    server) stayed up.
- Fix (shared, every account, past and future): src/services/broker-auth.js holds one rule for terminal-ops.js (provisioner
  and relauncher), validate-account.js and sync-account-stats.js.
  - An authorization failure for the broker's own reason (service not available, no connection, timeout, busy, too many
    requests) is a broker outage: it is retried, never treated as a refused login.
  - "Invalid account", "Account disabled" and "wrong password" stay refusals.
  - relaunch-terminals.js lifts the hourly cap when the last 60 minutes of the journal show the broker down. The back-off
    (5, 10, then 30 minutes) keeps retrying and the account stays switched on.
- Recovery (owner's standing order for copy terminals): both accounts were re-queued at 13:49 and copied again at 13:51 and
  13:53 through the normal provisioner path. No welcome trade and no duplicate: their open USTEC copy is still mapped.
  - With the owner's yes, their original start dates (8 Nov, 12 Nov) and their 500 USD reference were put back. Their
    November figures, rank and sizing are exactly as before the outage.
- Both customers got a "copying stopped" email at 02:32 and 03:32.
- Gate: new check "leaderboard has every ACTIVE customer with closed copies" (leaderboard.js leaderboardProblems: rebuild
  younger than 15 min, every ACTIVE account has its rows and is ranked once it has 3 closed copies this month). New
  scripts/verify-broker-outage.js (12/0):
  - On the preserved journals of that night, the old code reproduces the fault and the new code does not.
  - No account switched off by the relauncher in the last 26 h is still off.
- verify-live-sizing now picks its account in a fixed order. It took the table's first row, which changed after the
  re-activation and failed on the 500 USD account.
- Deploy gate: RESULT SAFE TO DEPLOY (15 Nov, after the bundle).

## 2026-11-13 (evening) — DAILY NEW-CUSTOMER TEST 1.1.0: WAITS FOR AN OPEN MASTER TRADE (commit b5cdf1e)

- WEBSITE: nothing to change.
- The 10:30 run failed at "trade open at the broker": the demo login had traded with FTM on 12 Nov, so the safety guard
  rightly gave it no welcome trade (one per broker account), and the master held no open trade to copy at 10:30. Not a
  fault of the onboarding. scripts/e2e-new-customer.js 1.1.0 now waits (up to 6 h, checking every minute) until the
  master holds an open trade before it adds the account; a market-closed hold (WAITING_MARKET) counts as passed with a note;
  6 h without any master trade records "trade not tested: MASTER_FLAT" (shown in the gate line).
- Proof run 22:39 from the scheduled task: connected 12 s, copying 71 s, trade open at the broker 79 s (copy of the
  master's USTEC sell), closed 2.5 s, removed 38 s. Target under 2 minutes: MET.
- The 10:41 restart check of the morning did not run (the 10:30 test had failed; the session check did not fire).
- Deploy gate: RESULT SAFE TO DEPLOY (22:45 Berlin).

## 2026-11-13 — THE FIRST FTM TRADE OF EVERY ACCOUNT IS ITS "WELCOME TRADE" (commit 207919d; live 13 Nov 22:51 Berlin, API restarted with the owner's click)

- WEBSITE: nothing to change. The fields are the same (welcome_trade true + label "Welcome trade"); more trades now carry them.
- Rule (owner 13 Nov, customer 51402's first trade showed no label): per account, its dedicated FTM-WELCOME trade when it
  has one, otherwise its FIRST FTM trade (also when that is a copied master trade). Exactly one per account. Applied at
  read time in GET /customer/accounts/:id/history, /positions and stats.history_page (src/services/welcome-label.js),
  so every past and future account follows it with no data change. Display only: nothing in the trading path reads it.
- closed_by: a welcome trade the customer closed themselves stays "CUSTOMER"; otherwise "Welcome trade" as before.
- Accounts that change: customer 51402 (account 4701, BTCUSD SELL 0.01 of 12 Nov 18:18) and the fixture account
  DEMO-CUSTOMER-001. Unchanged: 2022 (its first trade already was its welcome trade) and the owner's 184 (its dedicated
  welcome trade of 8 Nov stays the one; its earlier trades predate the welcome feature).
- Gate: scripts/verify-welcome-label.js (22/0) now checks every connected account with trades: exactly one welcome
  trade, it is the first (or the dedicated one), and /history, /positions and stats.history_page label exactly it.
- Deploy gate: all checks pass except "daily new-customer test passed within 26 h" (the 12 Nov 23:48 proof run of the
  new daily schedule hit the gold market's daily break); the first scheduled run is 13 Nov 10:30.

## 2026-11-12 (evening, 4) — FASTER TERMINAL START ON + DAILY NEW-CUSTOMER TEST: 95 s FROM "ADD ACCOUNT" TO A TRADE OPEN AT THE BROKER (commit 92f0104; switch ON 20:41 Berlin)

- WEBSITE: nothing to change.
- FASTER START ON for every new and restarted customer terminal (.env FTM_TERMINAL_SESSION=CONSOLE since 20:41, the
  owner's yes). Measured on the owner's demo account: the new terminal reached the broker 18-27 s after it started
  (it was almost 6 minutes for today's customer). Running terminals were not touched; a removed account's terminal
  was closed politely. To go back: remove that line from .env (takes effect at the next job run).
- DAILY NEW-CUSTOMER TEST (scripts/e2e-new-customer.js, kill switch FTM_E2E_NEW_CUSTOMER=ON): a test customer of FTM's
  own adds the demo account through the live API and the test times every step: connected, own terminal running,
  first trade, trade open at the broker, closed, account removed. A failure or a step over 5 minutes -> phone alert
  E2E_NEW_CUSTOMER; the result is in C:\FTM\logs\e2e-new-customer-last.json and the deploy gate requires a passed
  run within 26 hours.
- LIVE RUNS (demo account, play money): run 1 found that the test customer had no plan (a customer without a paid or
  exempt plan never gets trades, correct): the test customer is now EXEMPT like FTM's own accounts. Run 2 counted a
  queued trade as placed: the test now waits for the trade OPEN at the broker. Run 3 (20:53): connected 30 s, copying
  89 s, first trade 93 s, open at the broker 95 s (two copies of the master's open trades), closed in 3 s, account
  removed and terminal stopped in 37 s. Target under 2 minutes: MET.
- NEXT: the remaining minute is the set-up job waiting for its next minute tick after "connected"; then the daily
  schedule for the test (needs the owner's yes for the scheduled task).
- Deploy gate: RESULT SAFE TO DEPLOY (21:02 Berlin).

## 2026-11-12 (evening, 3) — FASTER TERMINAL START IN PLACE, SWITCH STILL OFF (commit f252462; files live 20:07 Berlin)

- WEBSITE: nothing to change.
- The three protected job files for the faster start of a customer's own terminal (src/services/terminal-ops.js,
  scripts/provision-account.js, scripts/relaunch-terminals.js) were put in place at 20:07 with the owner's click
  (hash-checked, all three or none; backups kept). The switch FTM_TERMINAL_SESSION is NOT set: OFF, so every account
  behaves exactly as before. Checked after the swap: dry runs of the set-up job and the relauncher as before, the jobs'
  own runs without errors.
- Proof scripts/verify-terminal-session.js (24/0 on the live files) is now part of the deploy gate.
- NEXT: one proof with the switch ON on a demo account (needs the demo account saved by the owner with the desktop
  shortcut "SAVE FTM E2E DEMO ACCOUNT"), then the switch goes ON for every new and restarted customer terminal.
- Deploy gate: RESULT SAFE TO DEPLOY (20:16 Berlin).

## 2026-11-12 (evening, 2) — CONNECTION CHECKER LOOKS EVERY MINUTE (WAS EVERY SECOND MINUTE) + FASTER TERMINAL START PREPARED (commit cf90580; checker live 18:58 Berlin)

- WEBSITE: nothing to change. One correction that goes live with the next API restart: the "FTM master account" preview
  entry of GET /customer/accounts will carry the five validation_* keys too (always null), so every entry of the list
  has the same keys. Until then that one entry simply lacks them (read a missing key as null).
- FOUND AND FIXED (live 18:58, all accounts): the job that checks a newly connected account was meant to run every
  minute but ran only every SECOND minute (measured 18:50-18:55: runs at 18:50, 18:52, 18:54, nothing in between).
  Cause: each run was told to leave "55 s after it started", counted from a clock that starts about 5 s late on this
  server, so it left 1 s AFTER the next minute had begun and Windows skipped that minute's run. A new account could
  wait a whole extra minute before anyone looked at it. Now a run leaves at second 54 of the clock minute; seen live
  at 19:01:54, 19:02:54, 19:04:54, one run per minute. Proof scripts/verify-connect-speed.js (25/0, in the gate):
  366 simulated runs, however slowly the process starts, leave at second 54-57.5 of their own minute.
- FASTER TERMINAL START, PREPARED (no behaviour change yet): switch FTM_TERMINAL_SESSION (OFF by default, not set).
  When ON, a new or restarted customer terminal is started where the check terminals already reach the broker in
  5-36 s, instead of the busy background area where today's new terminal needed almost 6 minutes. Running terminals
  are never moved. src/services/check-session.js (shared part) is live; the three protected job files are prepared
  and hash-checked and wait for the owner's one click on the server. Proof scripts/verify-terminal-session.js: 24/0
  on the prepared files (switch OFF = exactly today's behaviour; switch ON = one start, never a second terminal on
  the same folder, even when the answer of the start is lost). It joins the gate when the files are in place.
- STILL OPEN (honest): from "connected" to "copying" is still 6-7 minutes until the switch is ON (after the click and
  a proof on a demo account). The daily end-to-end new-customer test needs a demo account saved by the owner.
- Deploy gate after the checker fix: RESULT SAFE TO DEPLOY (19:12 Berlin).

## 2026-11-12 (evening) — CUSTOMER'S OWN TERMINAL: LONGER WAIT + PHONE ALERT "CONNECTED BUT NOT COPYING" (commit d8c86eb; live 18:05-18:25 Berlin)

- WEBSITE: the five validation_* fields of GET /customer/accounts (entry below) are LIVE since the API restart at 17:51.
- WHAT HAPPENED (account of the urgent request, login checked CONNECTED at 17:42): the customer's own trading terminal was
  started twice (17:46, 18:00) and given up after 120 s each time, because a new terminal needed about 6 minutes to reach
  the broker on this trading day. The website showed "connected" while nothing was copying.
- STOP-GAP (live 18:05, all accounts): the set-up waits up to 450 s for the new terminal (was 120 s) and confirms as soon as
  it answers. Third try: terminal confirmed 18:18:00, account ACTIVE, first trade copied 18:18:16.
- NEVER UNNOTICED AGAIN (live, all accounts): phone alert ACCOUNT_SETUP_STUCK when an account is connected for more than
  5 minutes without its own running terminal (set-up not started, tries failing, or given up). The deploy gate fails on
  the same condition (scripts/regress.js; verify-validation-health 59/0).
- NOT DONE YET (honest): 6-7 minutes from "connected" to "copying" is far from the target (under 2 minutes end to end).
  The speed fix (start the customer's terminal where the check terminals already start in 5-36 s) and the daily
  end-to-end new-customer test on a demo account are the next deploys.
- STATISTICS PROOF CORRECTED (scripts/verify-stats-audit.js, 14/0): the first brand-new live account showed two cases the
  proof did not know: no trade line at all (whole account 0 %, FTM-only empty) and "first copy open, nothing closed yet"
  (FTM-only 0 %). Both are correct figures; such an account is not ranked on the leaderboard until it has closed copies.
  No product code changed.
- INVESTMENT PROOF CORRECTED (scripts/verify-investment.js, 113/0): proof I8 failed once at 18:35 because the 5-minute
  alert job closed one of the two test statements a moment before the proof did. The proof now asks for the real
  thing: exactly one statement per contract, and a second run closes nothing. No product code changed.
- Deploy gate after all of the above: RESULT SAFE TO DEPLOY (18:45 Berlin).
- Nothing changes for the website in this entry: no new field, no new status key.

## 2026-11-12 — SLOW ACCOUNT CONNECTION FIXED + "NEVER AGAIN" CHECKS (jobs live 16:35 Berlin, website fields live since the API restart at 17:51)

- ROOT CAUSE of "Connecting" for up to an hour (the urgent request of 12 Nov): the terminal that checks a new account was started
  in the server's background area, which the six permanent trading terminals keep busy all trading day. It needed 3-6
  minutes to reach the broker, and a check without an answer was only repeated after 10 minutes.
- FIX (live, all accounts): the check terminal now starts in the server's console area. Measured through the real jobs:
  220 s before; 5 s, 9.5 s and 10.8 s after (the last one by the automatic 15-minute test, 16:53). Kill switch: .env FTM_CHECK_SESSION=OFF.
- A check that brought no broker answer is repeated after 2 minutes (was 10). The validator looks for waiting accounts
  every minute, as before.
- Every check records its time-to-broker. Every 15 minutes one statistics run on a connected
  account measures it again. Phone alerts: FIRST_CONNECTION_SLOW (above 60 s or no answer), FIRST_CONNECTION_CHECK_STALE
  (the measuring stopped), ACCOUNT_PENDING_LONG (an account waits more than 10 minutes after its login details were entered).
- The deploy gate fails when any account waits more than 10 minutes (scripts/regress.js + verify-validation-health 45/0).
- The account of the urgent request: the broker refused the login twice with "authorization failed (Invalid account)".
  The account reads ACTION_REQUIRED; the customer re-enters the exact MT5 server name and the MT5 trading
  password on the website. Nothing to change on the engine for this account.
- WEBSITE (answer to the urgent request; additive, live after the next API restart): GET /customer/accounts, only while an
  account waits to be checked (status_reason NEVER_VALIDATED / VALIDATION_PENDING), null otherwise:
  validation_started_at, validation_attempts, validation_waiting_seconds, validation_delay_reason (null under 2 minutes,
  then CHECK_NOT_STARTED | CHECK_RUNNING | BROKER_UNREACHABLE) and validation_delay_text (plain words to show next to
  "Connecting"). No new status_reason key: the existing texts keep working. In all three cases the engine retries by itself.
- Nothing was growing on the disk; no cleanup job was needed.
- Deploy gate, two proofs repaired (tests only, no product change): verify-live-sizing took its locks in the opposite order
  to a live heartbeat and could end in a database deadlock (the live side was never the one stopped); verify-group-copy
  depended on a real signal the master has since closed. Both are independent of live activity now. Gate: SAFE TO DEPLOY.

## 2026-11-12 — EA 3.7 + RISK BUDGET FOR SMALL ACCOUNTS (commit 7d5ad81 + this one, API restarted 13:29 Berlin)

- FTM MACHINE 3.7 runs on the master (13:19) and on the prop account (13:01). New strategy "Range Breakout" (magic 34686,
  code FTMM-RBO-34686, US Tech 100 only, master only; off on prop accounts). It appears in strategy lists like any other;
  nothing to change on the website.
- RISK BUDGET is ON for every account (migration 043, .env COPY_RISK_BUDGET=ON; kill switch: OFF + API restart). A signal
  skipped for the minimum lot adds its sized lot to the account's saved amount for that market (cap 2 x the minimum lot);
  when the minimum lot <= 3 x the saved amount, that signal is copied at the minimum lot. Such a copy has
  planning_reason RISK_BUDGET_TAKE_...; every step is a line in ftm.copy_risk_budget_uses (ADD / TAKE).
  No API field changed. Replay of account #2022: 4 of 23 skipped signals would have been taken.

## 2026-11-11 — LEADERBOARD ON BY DEFAULT (commit de61fa4, API restarted 12:19 Berlin)

- Every customer is on the leaderboard by default (opted_in true) unless they switch it off themselves; a customer who
  switched it off is never switched back on. No nickname yet -> a default "member_" + 4 characters (keyed hash; never
  the name, email, account number or Client ID); replacing it the first time does not count as one of the 2 changes per
  7 days. GET /customer/leaderboard/profile: opted_in true, the default nickname, NEW opted_in_source DEFAULT | CUSTOMER.
- The flag still comes from the KYC country only.

## 2026-11-10 — GROUP COPY FOR SMALL ACCOUNTS (commit 6bfd7dc, on since 17:55 Berlin)

- When every piece of one master signal (same symbol and side within 60 s) is too small for an account (minimum lot more
  than 3x the sized lot), the account gets ONE copy at the broker minimum if the minimum is at most 3x the pieces' sum.
  It follows the master's SL changes (farthest SL + the buffer) and closes when the master has closed half the signal's
  volume or more. Bigger accounts unchanged. History rows: copied_by_ftm true, source as usual (FTM-generated event).

## 2026-11-10 — NICKNAME 2 PER WEEK + FLAG = KYC COUNTRY (commit b47e62a, API restarted 16:57 Berlin)

- PUT /customer/leaderboard/profile: up to 2 nickname changes in any 7 days; the 3rd -> 429 NICKNAME_RATE_LIMIT with
  next_change_at (ISO; next_allowed_at kept as an alias). Profile rules: nickname_change_days 7, nickname_changes_per_window 2.
- Leaderboard country = the customer's KYC country ONLY (PUT /customer/kyc-profile), shown at once. A country sent to
  /customer/leaderboard/profile is ignored (the Community country is the website's own).

## 2026-11-10 — COPY STOP LOSS = EMERGENCY STOP A LITTLE BEYOND THE MASTER'S (commit c3c2fa7, on for all accounts 15:00 Berlin)

- Every copy's broker SL = the master's SL +/- min(max(3x spread, 5 % of the SL distance), 10 %): at most 1.1x the planned
  loss. The exit still follows the master's CLOSE. Gospel's yes after the replay (8 of 184 copies were stopped by their own
  broker's price while the master was not; the buffer would have avoided all 8). No change to the website's data.

## 2026-11-10 — OPTIONAL KYC PROFILE (commit 27ddad6, migration 042, API restarted 14:47 Berlin)

- NEW GET / PUT /customer/kyc-profile: {full_name, country, goal GROW_SAVINGS|MONTHLY_INCOME|LONG_TERM|TRY_FIRST,
  experience NONE|SOME|EXPERIENCED, drawdown_comfort 10|25|35, completed_at, kyc_completed, suggested_tier,
  full_name_saved}. PUT takes any subset; null clears a field; 422 VALIDATION_FAILED on a bad value or unknown field.
- full_name is pre-filled from the sign-up name while none is saved (full_name_saved false); completed_at needs all five
  saved. country = the leaderboard flag value (saving either updates both). suggested_tier is a hint only.
- GET /customer/me: NEW kyc_completed (bool) for the menu badge. Customer-only; nothing public; nothing blocked.
- Proof: verify-kyc 5/5 in the gate; regress SAFE TO DEPLOY.

## 2026-11-10 — LEADERBOARD: MASTER PROFILE + COUNTRY FLAG (commit a83a5a6, API restarted 14:27 Berlin)

- FTM MASTER row: risk_tier from the master EA's own trading style (newest "Multiplier: style" line of its charts; BALANCED
  today), follows any change; country "DE".
- country (ISO 3166-1 alpha-2) on every row: the customer's own setting, PUT /customer/leaderboard/profile
  {"country": "DE"} (null removes it; two letters only); GET profile returns it. null = no flag. Never inferred.

## 2026-11-10 — LEADERBOARD: TRADING ACCOUNT ONLY + FTM MASTER ROW (commit 9608fbf, API restarted 14:07 Berlin)

- A customer's row = the account FTM MACHINE trades on now (trading_status ACTIVE); a switch moves the row at the next
  5-minute rebuild and starts it fresh (that account's split.ftm, copies closed since its activation).
- NEW on every row: is_master (bool) and account_since (ISO: when FTM MACHINE started on this account).
- NEW row "FTM MASTER" (is_master true): the master's split.ftm % (basis MASTER_ACCOUNT_ALL_FTM), closed trades / wins,
  since 2026-11-04. Ranked among the customers (Gospel); rules.master_in_rank = INCLUDED (engine switch, EXCLUDED =
  badge only, rank null).
- Proof: verify-stats-audit A14, verify-leaderboard 33/33; regress SAFE TO DEPLOY. Live: 1 Tanaya 5.57, 2 FTM MASTER
  -4.56, 3 Marine -7.35.

## 2026-11-10 — LIVE PRICES FOR THE CLIENT-AREA CHART (commit ae17d3d, API restarted 13:20, feed live 13:39 Berlin)

- NEW GET /customer/market/candles?symbol=XAUUSD|BTCUSD|USTEC|USDJPY|HK50|BOOM1000&tf=1m|5m|15m|1h|4h|1d&limit=1-300:
  {ok, symbol, tf, source, digits, candles:[{t,o,h,l,c}] oldest first (last = forming), feed_age_sec, last_tick_at,
  stale, market_closed}. NEW GET /customer/market/quotes?symbols=... {ok, source, quotes:[{symbol, ok, bid, ask, t, ...}]}.
- Prices: FTM master prices (IC Markets, BID) from a separate price-only terminal (MT5_Feed; one EA without trading
  code, AutoTrading off); the master terminal and Sender are untouched. Served from the engine's in-memory cache.
- Logged-in customers only. Rate limit per customer: bursts of 10, 2 per second; over it 429 RATE_LIMITED.
- BOOM1000 -> 404 NOT_AVAILABLE. stale = feed stopped > 10 s; market_closed = no tick for > 5 min with a live feed.
  503 FEED_NOT_READY only before the first prices (e.g. right after an API restart, a few seconds).
- Proof: verify-market-feed 11/11 in the gate, incl. M11 live: all 5 markets fresh (< 1 s) from the running API.

## 2026-11-10 — LEADERBOARD RANKS FTM'S TRADES ONLY (commit 78de18e, switched on 12:12 Berlin, no API restart)

Gospel "Yes, build it" and "Yes, switch it on" in the engine chat.
- Every board's return_pct = split.ftm of GET /stats: SINCE_CONNECT split.ftm.pl_pct, MONTH / PREVIOUS_MONTH
  split.ftm.monthly_returns (NEW per side: the same time-weighted function per UTC month). A customer's own manual
  trades never move a rank. closed_copies / wins were already FTM copies only.
- Engine switch LEADERBOARD_BASIS=FTM_ONLY (default WHOLE_ACCOUNT), read on every 5-minute rebuild.
- First FTM_ONLY rebuild 12:12:59: #1 6.36 %, #2 -6.95 % (was -13.19 %, its own trades no longer count); order unchanged.
- split.ftm.monthly_returns / split.own.monthly_returns appear in GET /stats at the next API restart.
- Proof: verify-stats-audit A13 (every candidate, rolled back), 13/13; regress SAFE TO DEPLOY.

## 2026-11-10 — FTM TRADES vs YOUR OWN TRADES: split ON EVERY ACCOUNT (commit 2834c58, API restarted 11:59 Berlin)

Gospel's split (approved in FTM MACHINE's chat; restart yes in the engine chat).
- GET /customer/accounts/:id/stats (and the master preview): NEW split {ftm, own, basis, rule}; each side closed_pl,
  pl_pct, trades_closed, wins, losses, breakeven, win_rate_pct, max_drawdown_closed_pct.
- ftm = positions FTM copied (FTM's copy records; welcome and FTM-test copies included); every position on a master
  row (basis MASTER_ACCOUNT_ALL_FTM). own = every other BUY/SELL position.
- ftm.closed_pl + own.closed_pl = closed_pl_total to the cent; fees_and_adjustments (dividends, tax, ...) in neither;
  a position's swap stays with its side. pl_pct = the same time-weighted function, that side's trade lines only.
  A side that never traded: pl_pct and max_drawdown_closed_pct null.
- Community / public figures use split.ftm only. The live leaderboard still ranks the whole account (no rank changes
  today); switching it waits for Gospel.
- Live: demo #184 ftm 41 trades -775.67 (-6.95 %), own 138 trades -802.74; #2022 ftm 7 trades +26.69 (+6.36 %).
- Proof: verify-stats-audit A11 (every account) + A12 (by hand), 12/12; figures-fixtures 7/7; regress SAFE TO DEPLOY.

## 2026-11-10 — HISTORY = THE STATEMENT FOR EVERY ACCOUNT (commit 1258afe, API restarted 11:13 Berlin)

Website history_gap; Gospel "Yes, build it" and the restart yes in the engine chat.
- GET /customer/accounts/:id/history of the TRADING account now answers its own statement (source ACCOUNT_HISTORY),
  like every other account: every closed position, FTM's copies and the customer's own trades. Demo #184: 179 trades
  (was 41), 41 of them copied by FTM.
- NEW on every row: copied_by_ftm (true = FTM copied it). ftm_test, welcome_trade, label and closed_by come from the
  copy record for a copied trade; source per row.
- symbol = the master's name where the broker's symbol is mapped (US Tech 100 -> USTEC), market = the broker's symbol
  (upper case, as in the statement); ?symbol= matches either.
- stats.history_page = the same rows, plus the same envelope (source, last_updated, balance_operations, total, limit,
  offset; not the legacy items[] alias).
- A just-closed copy appears after the statement re-read (about a minute after the close). Before an account's first
  read: the trading account answers its copy records (source FTM_COPY, copied_by_ftm true).
- Proof: verify-stats-audit A10 over every account (10/10); figures-fixtures 7/7 (the #184 history gap is gone);
  regress SAFE TO DEPLOY.

## 2026-11-10 — STATISTICS AUDIT: HISTORY PAGES, INITIAL DEPOSIT, DRAWDOWNS (commit ac9a575, API restarted 10:48 Berlin)

Website statistics audit (4 requests) via FTM MACHINE; Gospel's yes for the restart in the engine chat.
- GET /customer/accounts/:id/stats and GET /customer/master/performance: history[] pages. ?offset=N kept; NEW
  ?before_deal=<ticket> (stable cursor: send history_paging.next_before_deal) and ?as_of=<ISO> (send page 1's
  history_paging.as_of). New object history_paging {order, limit, offset, before_deal, cursor_found, as_of, returned,
  total, total_in_view, has_more, next_before_deal}. 400 BAD_HISTORY_PAGING on a malformed parameter.
- ONE deal order: time, then the broker's deal ticket. history[] newest first (time desc, ticket desc); figures use
  the exact reverse. Every existing figure on every account unchanged (compared before / after).
- NEW initial_deposit, initial_deposit_at, initial_deposit_source (BROKER_STATEMENT | NOT_IN_BROKER_HISTORY |
  NO_DEPOSIT_IN_STATEMENT | NO_STATEMENT), start_balance_at. Never guessed: null when the broker's history starts
  later (demo #184: start_balance 11,965.28 at 2026-10-05T17:35:04Z).
- NEW drawdowns[]: the 5 deepest closed-balance drawdowns {peak_at, trough_at, depth_pct, peak, trough, recovered_at};
  drawdowns[0].depth_pct = max_drawdown_closed_balance_pct.
- Definitions confirmed (docs/client-area-stats-api.md): a trade = a position, counted once as soon as it has a closing
  deal; win = net of all its deals > 0 (cents). fees_and_adjustments = every row not BUY/SELL/BALANCE/CREDIT
  (DIVIDEND, TAX, ...), never in closed_pl_total. Closed-balance drawdown: BALANCE and CREDIT move the peak;
  adjustments are P/L readings (one per row) -- differs from the website's guess.
- Statistics read (sync job): an account is re-read about a minute after a copy closes (reason COPY_CLOSED), so the
  statement never stays behind a close (#2022 was hours behind this morning).
- Proof: scripts/verify-stats-audit.js 9/9 over every account, in the gate; regress SAFE TO DEPLOY.

## 2026-11-10 — ACCOUNTS ROW SHOWS THE NEWEST BALANCE (commit c64c5a8, API restarted 00:48 Berlin)

Website "WRONG MASTER BALANCE" via FTM MACHINE; Gospel's yes for the restart in the engine chat.
- Cause: GET /customer/accounts took a terminal heartbeat (account_state) whenever one existed, whatever its age. The
  view-only master row kept a copy-terminal heartbeat of 6 Nov 15:41 UTC (99,606.31 / 99,643.78) that hid every newer
  read. Same flaw for any paused or disconnected account with an old heartbeat.
- Fix (every account): balance, equity, floating_profit, currency, last_reported_at and open_positions on the accounts
  row come from the NEWEST reading -- the terminal heartbeat, the statistics snapshot or (view-only) the master Sender,
  whichever was read last. GET /stats already worked this way.
- Master balance is 94,855.93 = 100,000 deposit - 5,154.34 closed P/L + 10.27 (USTEC index dividend +12.08, tax -1.81,
  9 Nov 22:34 UTC). The money identity for the website: balance = start_balance + deposits_total - withdrawals_total +
  credit_total + closed_pl_total + fees_and_adjustments (start_balance 0 when the statement begins at the opening
  deposit; demo #184's statement begins 5 Oct at 11,965.28).
Proof: verify-balances 4/4 in the gate (every account: accounts row = newest stored reading = /stats balance; the money
identity within 1 cent; a 3-day-old heartbeat never wins, on a throw-away account); against the old code it fails with
#260 at 99,606.31. Live after the restart: #260 row 94,855.93 / 94,660.21; regression gate SAFE TO DEPLOY.
Applies to all accounts, past and future: yes.

## 2026-11-09 — ONE TIME-WEIGHTED % EVERYWHERE + WHOLE-LIFE RISK HISTORY (commit d9b3424, API restarted 19:35 Berlin)

Gospel's rule via FTM MACHINE; Gospel's yes for the restart in the engine chat.
- Every % is ONE shared time-weighted return (src/services/returns.js): each closed trade line divided by the real
  balance just before it, chained; deposits and withdrawals never change it. return_basis
  TIME_WEIGHTED_CLOSED_TRADES_EXCLUDING_DEPOSITS_WITHDRAWALS.
- Same value in: GET /stats growth_pct and performance.totals.return_pct; monthly_returns[].return_pct; GET /performance
  (now exactly /stats.performance for every account, with currency, balance, equity, last_updated); the master preview;
  the leaderboard (SINCE_CONNECT = growth_pct, MONTH / PREVIOUS_MONTH = that month's figure). An account with closed
  copies but no balance read is measured from its connect balance.
- GET /stats risk_score_history: the account's WHOLE life, one entry per day {date, score, margin_known}; optional
  ?risk_days=N keeps the last N days.
- Website: show growth_pct (= performance.totals.return_pct), monthly_returns[].return_pct and the leaderboard's
  return_pct as sent.
Proof: verify-returns 6/6 in the gate (Tanaya +5.49 %; every account /stats = /performance = an independent
re-computation from the deals: demo 184 -14.10 %, master preview -6.05 %; every leaderboard row = the dashboard);
verify-risk-score 10/10, verify-leaderboard 33/33; live after the restart for Tanaya: /stats 5.49, /performance 5.49,
leaderboard 5.49, risk history from 8 Nov (2 days), ?risk_days=1 -> 1; regression gate SAFE TO DEPLOY.
Applies to all accounts, past and future: yes.

## 2026-11-09 — CLIENT ID FOR EVERY CUSTOMER (commit f1eafe1, migration 041 applied 19:10, API restarted 19:18 Berlin)

Website request via FTM MACHINE; Gospel "Yes, build it".
- GET /customer/me: client_id "FTM-XXXX-XXXXXX" = FTM- + the first 10 hex characters of customer_public_id, upper case
  (the value the website already shows). Use client_id.
- Stable and unique forever, for every customer past and future: customers.public_id can never change (database trigger);
  a new customer whose random id would share its first 10 hex characters gets a fresh one; a unique index guards it.
  All existing customers checked: every Client ID distinct.
- FTM staff: GET /api/v1/operator/customers/by-client-id/:client_id (operator token only; the website token is refused):
  FTM-1A2B-3C4D5E or the plain 10 characters, any case -> email, plan, accounts and the support view; 422 malformed,
  404 unknown. The operator support page's search box takes a Client ID too.
Proof: verify-client-id 9/9 in the gate; live after the restart: Tanaya's /me client_id FTM-0DDE-4EC966, the staff lookup
finds the same customer with her 3 account rows, the website token gets 401; regression gate SAFE TO DEPLOY.
Applies to all accounts, past and future: yes.

## 2026-11-09 — HIGHEST BALANCE FROM CLOSED TRADES ONLY, FOR EVERY ACCOUNT (commit 9a91968, API restarted 18:42 Berlin)

Gospel's rule: profit and drawdown come from closed trades only; deposits and withdrawals change the balance only. Same
shared code for every account (every customer, the master preview, demo, future customers); no account-specific case.
- GET /customer/accounts/:id/stats, new: peak_balance_trading = initial_balance + the best running total of closed
  trades (commission and swap included, cash moves never), peak_balance_trading_at, peak_trading_profit,
  peak_balance_trading_basis INITIAL_BALANCE_PLUS_BEST_CLOSED_TRADES_TOTAL_EXCLUDING_DEPOSITS_WITHDRAWALS.
- For EVERY account the website shows: "Highest balance" = peak_balance_trading (date peak_balance_trading_at);
  "Max drawdown" = max_drawdown_closed_balance_pct. peak_balance stays the raw balance (deposits included). An account
  with pending=true has no statistics yet: show a dash.
- Tanaya's 594 / 18.6 % were never sent by the engine (all 15 /stats calls today: account db4fed4f = record 2022, 200,
  < 0.4 s). Engine figures: peak_balance_trading 522.53 (14:33 UTC 9 Nov), closed-balance drawdown 1.03 %.
Proof: verify-stats-peaks 13/13, incl. L4 over every connected account (master preview 102,528.95 / 9.02 %, demo 184
20,028.06 / 49.34 %, Tanaya 522.53 / 1.03 %, master view-only row the same as the preview; two never-read test rows
pending); live GET on Tanaya after the restart: 200, 378 ms, the new fields present; regression gate SAFE TO DEPLOY.

## 2026-11-09 — RISK GAUGE + FASTER CONNECT (commit a6cafbc, API restarted 15:27 Berlin)

Gospel: "Both".
- GET /customer/accounts/:id/stats: risk_score (1-10), risk_score_basis, risk_score_parts {volatility_30d_pct,
  current_drawdown_pct, margin_used_pct, returns_used}, risk_score_history [{date, score, margin_known}] (90 days),
  expected_range {profile, typical_min, typical_max} (CONSERVATIVE 2-4, BALANCED 4-6, GROWTH 5-8: FTM MACHINE's backtest
  bands with the same formula), risk_score_vs_range WITHIN / ABOVE / BELOW. Formula in docs/client-area-stats-api.md.
  Profiles are CONSERVATIVE / BALANCED / GROWTH (there is no GROWTH_2X).
- GET /customer/accounts: every account carries status_signature. LONG-POLL for the connect screen:
  ?wait_for=<account_id>&since=<status_signature>&wait=<0-25> answers the moment that account's status changes (measured
  about 0.2 s after the validator's report), else when the wait ends; header X-FTM-Wait: changed | timeout. Every GET
  already sends an ETag: If-None-Match gives 304 when nothing changed.
- Validator (connect check): the folder for the next connect is prepared in advance (switch FTM_VALIDATOR_FAST=ON,
  on since 15:28): MT5's start measured 3.7 s -> 1.9 s. First real connect timing to follow.
Proof: verify-risk-score 10/10, verify-connect-speed 24/24 (long-poll D1-D6), regression gate SAFE TO DEPLOY.

## 2026-11-09 — STATISTICS MATHEMATICALLY RIGHT FOR EVERY ACCOUNT (commit bdaa55f, API restarted 13:24 Berlin)

Gospel (via the website session): the statistics must be mathematically right for every account. GET
/customer/accounts/:id/stats, every account and the master preview id:
- Deposits, withdrawals and credit are never a drawdown or a gain: each moves the running peak by the same amount
  (Tanaya's account showed 20.42 % because of 310 withdrawn; now 1.03 %, her real worst dip).
- max_drawdown_pct is EQUITY based from exact readings only (every account read, every Sender report on the master, the
  live equity, every moment with no trade open). New: max_drawdown_basis, max_drawdown_closed_balance_pct and
  max_drawdown_closed_balance (closed balance deal by deal, same rule), peak_balance + peak_balance_at,
  peak_equity + peak_equity_at.
- Master preview: the master's closes the Sender reported after the last account read are added to history (source
  MASTER_EVENT, profit = the balance change at that close) and balance / equity are the Sender's, only when they add up
  exactly to the Sender's balance (data_source STATS_SYNC+SENDER, sender_tail). It showed the 8 Nov 23:58 UTC read before.
- history[] rows: profit, commission, swap, fee are separate; net = their sum. ?limit= default 200, max 2000; history_total
  is the full count.
Proof: verify-stats-peaks (9, in the gate), verify-account-stats 66/66 and verify-master-preview 12/12 against the live
API after the restart; master preview balance = the sum of its history = the Sender balance (93,734.38).

## 2026-11-09 — NO COPY OF A TRADE THE MASTER CLOSES FOR THE NIGHT AT ONCE (commit 8fa00f2, API restarted 01:26 Berlin)

Gospel: "Yes, build it" and "Yes, turn it on". On 8 Nov at 22:44 Berlin the master's Bitcoin pattern order filled after
its nightly close time, and the master's EA closed it within a second; account 41734917 copied it (open and close
within a second, -0.20 USD). From now on such an OPEN (M and W pattern trades, Bitcoin, 21:55-23:00 Berlin) is not
copied: the customer's execution shows status SKIPPED with planning_reason SKIPPED_MASTER_FLAT_WINDOW_<symbol>_<hhmm>_BROKER.
Closes are never blocked; every other trade is unchanged. Interim until the master's EA 3.5 (FTM MACHINE). Nothing
changes in the API's fields. Proof: replayed on the live database (rolled back), all 314 past master trades replayed
read-only (only the 8 Nov trade would have been skipped), regression gate SAFE TO DEPLOY.

## 2026-11-08 — CONNECT IN SECONDS + A FIRST TRADE FOR EVERY NEW ACCOUNT (commits a51aed9, 895f0c8, API restarted 18:18 Berlin)

Gospel: "Yes, A+B+C" (connecting must take about 5 seconds) and "by all means" (every new account gets a first trade).
- Connecting: the login check now starts within about 1 second of the account being added (it waited for the next
  minute before); the first answer is on GET /customer/accounts about 10 s after the click, with balance and currency.
- A login that the broker accepts under another server name of the same broker (typed "Deriv-Server", broker answers
  "DerivSVG-Server") is no longer stuck on "Checking": the account is connected on the broker's own server and `server`
  shows it. If that is not possible (another broker, or the login is already connected on that server), the account
  goes to ACTION_REQUIRED at once with validation_reason WRONG_SERVER and a new field broker_server_hint (the server the
  broker names). Website: please show a text for WRONG_SERVER, e.g. "This account is on server <broker_server_hint>.
  Remove it and add it again with that server." Additive; nothing else changes.
- First trade: if none of the master's open trades can be copied to a new account (lot too big for its balance,
  symbol missing, refused), the welcome trade now follows (gold, Bitcoin while gold is closed; minimum lot, about $10
  risk / $5 target, labelled "Welcome trade"). A refused welcome trade is retried twice; then FTM is alerted by phone.
Live proof 18:19 Berlin (Gospel "Yes, both"): account 41734917 got its welcome trade, BTCUSD SELL 0.01 at 75693.7,
SL 76693.7 / TP 75193.7, protected. Login checker running every second (55 checks per minute, 18:30).

## 2026-11-08 — WELCOME TRADE ON, LABELLED "Welcome trade" (commit 418cb1c, API restarted 11:15 Berlin)

Gospel: "okay do that". No notice on the website. The welcome trade is switched on (FTM_WELCOME_TRADE=ON; it was OFF
11:01-11:15) and every welcome trade carries its own label in the customer's own data:
- GET /customer/accounts/:id/history: trades[].welcome_trade (bool), trades[].label ("Welcome trade" or null); a closed
  welcome trade has closed_by "Welcome trade" (shown wherever closed_by is shown today).
- GET /customer/accounts/:id/positions: positions[].welcome_trade, positions[].label (same values).
Website: please show `label` next to the trade where it is not null. Nothing else changes.
Live proof 11:16: account 5739503's history labels exactly its 7 Nov welcome trade (BTCUSD SELL 0.01, -0.03) and none of
its 28 master copies; dry run 11:15 reads FTM_WELCOME_TRADE ON, all 8 checks pass.

## 2026-11-08 — AUTOMATIC SAFE RE-LINK + WELCOME TRADE ON (commit d5ad053, API restarted 10:49 Berlin)

Gospel: "Both, I'm at the screen". Live proof 10:50 Berlin over HTTP with a throw-away customer (removed): an unverified
email got 409 RELINK_EMAIL_NOT_VERIFIED; the retry with the website's confirmation got 200 as that customer; audit
CUSTOMER_LOGIN_RELINKED holds the record as it was.

For the website (request from FTM MACHINE; already live in the website repository):
- Send `X-FTM-Relink-Capable: 1` and `X-FTM-Auth-Email-Verified: true|false` (server-side, from email_confirmed_at).
- A 409 EMAIL_ALREADY_REGISTERED then carries `relink: { reason, previous_subject }`. The first reason is
  RELINK_NOT_CONFIRMED when Email-Verified is sent (RELINK_NOT_REQUESTED without it): retry once on either, when the email
  is verified and Supabase getUserById(previous_subject) answers not found, adding `X-FTM-Relink-From-Subject:
  <previous_subject>` and `X-FTM-Relink-Previous-Gone: true`.
- Refusal reasons: RELINK_EMAIL_NOT_VERIFIED, RELINK_NOT_CONFIRMED, RELINK_PREVIOUS_LOGIN_EXISTS, RELINK_NO_SINGLE_RECORD,
  RELINK_NEW_LOGIN_HAS_RECORD, RELINK_CUSTOMER_CLOSED, RELINK_RECENTLY_RELINKED (24 h). Each alerts FTM.

Welcome trade: FTM_WELCOME_TRADE=ON. Dry run 10:50 (ops\dry-runs\dry-run-2026-11-08-09-50.txt): all 8 checks PASS, no
welcome trade on any existing or copying account. A new account gets one only when the master has NO open position and
the account never had an FTM trade (rule-2 guards). The connect page must tell the customer (FTM MACHINE's text).

## 2026-11-08 — SAFETY GUARDS ON EVERY TRADE THE ENGINE OPENS (commit 2fb3ea8, API restarted 07:39 Berlin)

Live proof 07:40-07:41 Berlin: a fake "unknown" position on the test row 9900000099 (no terminal, no broker) was flagged
by the 1-minute check after 60 s, the phone message went out, and the row was removed.

Gospel's express order of 7 Nov 23:00, rule 2. Nothing changes for the website (no route, no field).
- Every OPEN is checked once more just before a terminal receives it. It must come from an FTM master, have the
  master's direction, and have the normal size (recomputed from the live inputs, within 10 %). A welcome trade needs the
  switch ON, the master with no open trade (proven by a fresh list), an account that never had an FTM trade, no earlier
  welcome trade, and the broker's minimum lot. A refused order is never sent; FTM gets a phone message at once.
- Every 20 s every FTM position on every customer terminal is compared with the master; a mismatch lasting 40 s is
  flagged to FTM's phone.
- `scripts/dry-run-trade-actions.js`: what the engine would do for every account, no orders, with a written check.
- Proven by `scripts/verify-trade-guards.js` (34/34, through the real claim route, everything rolled back) and the
  updated `verify-first-trade.js` (26/26), both in the deploy gate. The welcome trade stays OFF.

## 2026-11-08 — MASTER PREVIEW FOR EVERY CUSTOMER (commit e3e7083, website request "master preview", API restarted 07:03 Berlin)

Gospel: free customers see the FTM master account as "this is how your account looks once you subscribe".
- `GET /customer/accounts`: every customer without a view-only master row of their own (free customers included) gets
  one extra card, after their own accounts: `account_id` `f7a00000-0000-4000-8000-000000000001`, `view_only: true`,
  `preview: true`, `preview_note` ("This is the FTM master account. Your own account looks like this once you
  subscribe."), `view_only_label` / `status_text` "View only - FTM master account", `display_status` PAUSED,
  balance / equity / floating_profit / open_positions / deposits / withdrawals filled. `account_number` and `server`
  are null in the preview (the master's login is never sent). It never counts toward `account_limit`.
- `GET /customer/accounts/{preview id}/history`, `/positions`, `/performance`, `/stats` answer as for Gospel's own
  view-only card (the statistics sync's read of the master, else the master records).
- Every control route answers 404 ACCOUNT_NOT_FOUND for the preview id: pause, resume, activate, risk_tier, password,
  remove, close a position, stats refresh.
- Gospel's own login (which has the master as its own view-only row) gets no second card.
- Proven by `scripts/verify-master-preview.js` (12/12, a throw-away free customer through the real routes), now in the
  deploy gate. Live proof 8 Nov 07:05 Berlin with a throw-away free login on the live API: one card (preview), balance
  98208.47, equity 98224.63, history 18 closed, positions 1 open, performance and stats 200, pause / activate 404, the
  master login in no response.
- The same restart made the welcome-trade off switch live (`FTM_WELCOME_TRADE`, not set = OFF): no welcome trade is
  opened for anyone; copying the master's open trades on a new account stays on.

## 2026-11-07 (late night) — PAID-UNTIL FOR EVERY CUSTOMER, WELCOME TRADE FOR EVERY PAYING CUSTOMER (commit 99ef8af, migration 040, API restarted 22:00 Berlin)

- `PUT /billing/subscription`: an end date is never shortened (the later of the stored and the new `period_end` is
  kept). New optional `lifetime: true` for a Lifetime plan: no end date, and it stays Lifetime for good.
- `GET /billing/status`: new `lifetime` (true/false); `period_end` is null for Lifetime.
- A payment that arrived before its customer existed keeps its `period_end` / `lifetime` for the later match.
- Customer 13222: period_end 2027-12-07 (Annual 12 + 1 months from 2026-11-07).
- No tick box any more: `first_trade_opt_in` is true when not sent (send false only to switch the welcome trade off).
  Show on the connect page: "When you connect, FTM opens a small first trade (about $10 risk) so you can see copying working."

## 2026-11-07 (night) — FIRST TRADE FOR EVERY NEW PAYING ACCOUNT (commit 6e6297d, migration 039, API restarted 21:16 Berlin)

Gospel: when a paying customer connects an account, a trade must appear on it at once.
- `POST /customer/accounts` accepts an optional `first_trade_opt_in` (boolean). Show a tick box, ticked by default:
  "Open a small first trade so I can see it working (risk about $10)". Not sent = false.
- When the account first becomes ACTIVE (terminal built, broker allows trading, customer ACTIVE/EXEMPT):
  - the master's open trades are copied at once (normal sizing, the master's SL/TP);
  - if the master has none and the box was ticked: one small welcome trade (gold, or Bitcoin while gold is closed;
    minimum lot; about $10 risk and $5 target, set right after the fill);
  - market closed: queued and tried again every 15 minutes. Once per account.
- `GET /customer/accounts`: every account carries `first_trade: { opted_in, state, text }`; `status_text` carries the
  same `text`. Texts: "First trade is being opened", "First trade opens when the market opens", "First trade opened";
  null when there is nothing to say (state null, DONE or FAILED).
- Proven live 7 Nov 21:22 Berlin on a demo account: gold closed -> Bitcoin SELL 0.01 at 75736.79, SL 76736.79, TP
  75236.79, in 20 s.

## 2026-11-07 (evening) — ONBOARDING FULLY AUTOMATIC (commit ab0bd9e, API restarted 18:44 Berlin; contract unchanged)

Answers the website's note on the first real customer (paid 15:32 UTC, row created 15:38 UTC):
- The engine answered both PUTs at 15:32:01 UTC in 155 / 112 ms and the 16:24 resend in 27 ms (no slowness; the
  restart was at 16:34 UTC). The cause: the payment arrived before her customer row existed -> stored UNMATCHED; the
  resend reused the same event ids -> "duplicate".
- `PUT /billing/subscription`: an event stored UNMATCHED is no longer a duplicate. A resend retries the match and,
  when it matches, answers `{ applied: true, rematched: true, ... }`. Still no customer: `{ unmatched: true }` as before.
- A NEW customer (first request with a new auth subject) picks up every unmatched payment message carrying its email
  before that request is answered, so `GET /billing/status` already shows ACTIVE on the first visit.
- Still unmatched after 10 minutes: alert BILLING_UNMATCHED_<event> to FTM (email + Telegram).
- Customer 13222 is ACTIVE (her two stored events applied 18:44 Berlin).
- Accounts the broker does not allow to trade (`broker_trade_disabled` true, found at validation, never copying) are
  validated again automatically EVERY HOUR. When the broker allows trading, the engine clears the marker, builds the
  terminal and starts copying with no customer step. Suggested website text: "Your broker does not allow trading on
  this account yet (for example a real account with no balance). Fund it at your broker: we check again automatically
  every hour and start copying as soon as trading is allowed. Nothing to do here."
- No field added, renamed or removed.

## 2026-11-07 — API restarted with the server reboot (commit c30ba64; contract 2026-11-06.4 unchanged)

- View-only master account cards (`GET /customer/accounts/:id/performance` for a master login added as view-only):
  `equity_low`, `equity_high` and `equity_since` are now filled from the master's daily equity history. They were always
  null before (the query read columns that do not exist). No field added or renamed.
- Nothing else changes for the website. The investment routes, the leaderboard and the carry-over rule are as in the
  entries below and now run on this restart.
- REQ-002: closed by the website team; the live login is covered by the engine's hourly ftm-e2e-test customer.

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
- REQ-002 (live test customer with GitHub secrets): CLOSED by the website team (7 Nov note: no secrets needed;
  the live login is covered by the engine hourly ftm-e2e-test customer, 34/34 live).
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
