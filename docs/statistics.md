# How every FTM statistic is calculated

One page of rules for every account (customer, master preview, demo, free, new sign-up), every view (dashboard, chart,
performance, calendar, factsheet, statement, phone and laptop). Checked automatically by `.github/tests/stats-fuzz.js`
(a separate calculation, written from this page, against generated accounts of every shape) on every push and every hour.

## The inputs (all from the FTM engine, `GET /customer/accounts/:id/stats`)
Every row of `history[]` is one of four kinds:
| Kind | Rows | Changes the balance | Counts as profit or % |
|---|---|---|---|
| Trade deal | BUY / SELL, opening (IN) and closing (OUT) | yes | yes |
| Cash move | BALANCE (deposit +, withdrawal -) | yes | never |
| Adjustment | DIVIDEND, TAX, INTEREST, CHARGE, CORRECTION, BONUS, COMMISSION (separate rows) | yes | never |
| Credit | CREDIT | yes | never |

Rows with the same time keep the broker's own order (the engine's history order).

## The money identity (engine, 10 Nov 2026)
balance = start_balance + deposits - withdrawals + closed P/L + fees_and_adjustments + credit
- `start_balance` is 0 when the history begins at the opening deposit; otherwise it is the balance on the first day the
  history covers (demo #184: 11,965.28 on 5 Oct).
- The website places every row at its own time on the balance line and starts the line at start_balance. If the
  engine's balance does not fit the identity, the website keeps the history (it is right) and reports `history_gap`.

## Figures
| Figure | Rule | Source |
|---|---|---|
| Balance, equity | as sent | engine accounts row |
| Initial deposit | engine `initial_deposit` when sent; else the first deposit of a complete history; else "Starting balance" = start_balance with its date | engine |
| Net P/L (money profit) | sum of every trade deal's net (profit + commission + swap + fee) | engine `closed_pl_total`; website sum must agree (`pl_gap`) |
| Gain, every % | time-weighted: each trade deal's net / the balance just before it, chained (GIPS: revalue at every cash flow, link geometrically) | `F.metrics().seg(from, to)`; engine `growth_pct` must agree (`return_gap`) |
| Period [from, to) | customer's local time; Today, 7 days, 30 days, this month, last month, YTD, 1Y, years, months, weeks, days | same `seg` |
| Period before the account existed | shown as — (not 0.00 %) | |
| Highest balance | highest balance the account reached, with date | engine `peak_balance` |
| Max drawdown | closed balance deal by deal; deposits, withdrawals and credit move the running peak by the same amount; dividends, tax and other adjustments count as P/L readings (engine rule, 10 Nov) (same as NAV-per-unit drawdown in funds) | engine `max_drawdown_closed_balance_pct`; the drawdown list is the engine's `drawdowns[]` when sent, else the same rule |
| Trade | one position (opening + every closing deal), closed at its last closing deal; result = sum of its deals | |
| Trade count, wins, win rate | positions | engine `trades_closed`, `wins`, `win_rate_pct` |
| Commission & swap | sum of commission + swap + fee over every trade deal | engine history |
| Dividends, tax & adjustments | adjustments + credit | engine `fees_and_adjustments` + `credit_total` |
| Sessions | each trade belongs to exactly one session (the one that opened most recently at that hour, UTC), so sessions add up to the total | |
| Year table | Start + Net deposits + Profit (+ Dividends, tax & adjustments) = End, to the cent | |
| Sharpe ratio | mean / standard deviation of daily time-weighted returns, x sqrt(365), risk-free 0; — before 30 days | |
| Sortino ratio | mean daily time-weighted return / downside deviation (sqrt of the mean of squared negative days), x sqrt(365); — before 30 days | |
| Annual return | (1 + gain)^(365 / days) - 1, from the first event; — before 90 days | |
| Recovery factor | net P/L / largest closed-balance drop in money (engine max_drawdown_closed_balance peak - trough) | engine |
| Best / worst trade, longest win / loss run, long / short | positions (net of all deals), ordered by closing time; long = opened with BUY | |
| Statement | Opening + Deposits - Withdrawals + Trading result (+ Dividends, tax & adjustments) = Closing | |
| Equity, floating P/L | balance + open trades' floating P/L | engine accounts row |
| Account activity | every closed trade, deposit, withdrawal, adjustment and the opening commission of trades still open: the list adds up to the balance change | |
| Money format | every amount to the cent (2 decimals); only compact grids (month cells, chart axis, profit-by-period cards) round | |
| Commission & swap sign | its true sign: negative when it cost money, positive when swap earned more | |

## When the engine and the website disagree
The browser sends `history_gap`, `return_gap` or `pl_gap` to `/api/v1/client-log` (Vercel logs). Tell FTM ENGINE (via
FTM MACHINE). Never patch one account by hand.
