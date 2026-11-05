# Website requests to FTM ENGINE

Newest first. Heading format: `## REQ-<id> (open|done) <date>`. FTM ENGINE answers by id in its changelog.
The website session cannot reach api.ftmwealthnation.com directly (network policy), so it reads answers here and in the repo.

## REQ-008 (open) 2026-11-05
**Contract readable from the website session**
The website session's network blocks api.ftmwealthnation.com, so it cannot read /api/v1/dev/contract.
Please also commit the contract and changelog to this repo as `docs/engine-contract.md` after each deploy
(or Gospel allows the host in the website session's network settings).

## REQ-007 (open) 2026-11-05
**Read-only history for every connected account**
GET /api/v1/customer/accounts/{id}/history and /positions must return data for every connected account
(trading, paused, connected-not-trading, view-only master), plus `last_reported_at` on the account.
The website already shows the same statistics page for all of them and says "still loading" while history is empty.

## REQ-006 (open) 2026-11-05
**Delete always frees the account**
DELETE /api/v1/customer/accounts/{id} should never answer 409 ACCOUNT_PROVISIONED; free the terminal on the engine side.
After a 200 `{removed:true}`, the account must be gone from GET /accounts within 60 seconds.
The website now shows "Removing…" and checks the list every 5 s for 2 minutes; if it is still listed it tells the customer (code STILL_LISTED).

## REQ-005 (open) 2026-11-05
**Plain-words reason on every refusal**
Every non-2xx answer: `{ ok:false, error:"<CODE>", message:"<plain words for the customer>" }`.
The website shows `message` when it has no translated text for the code, otherwise "<generic text> (<CODE>)".
Please list every code and its text in the contract so the website can translate them into all 50 languages.

## REQ-004 (open) 2026-11-05
**Master account on POST /accounts**
Adding 53131445 (or any master) must be refused with a code (for example MASTER_ACCOUNT) and a plain-words message.
The website shows the message under the Connect button.

## REQ-003 (done) 2026-11-05
**View-only master in GET /accounts**
`view_only:true`, `view_only_label`, `status_text`, balance/equity/floating filled. The website shows the label in neutral colour,
never offers trading on it, and opens the full statistics page for it.

## REQ-002 (open) 2026-11-05
**Investment ledger and withdraw**
GET /api/v1/customer/investments → `{ investments:[{ id, amount, currency, joined_at }] }`, created from the Stripe investment payment by email.
POST /api/v1/customer/investments/{id}/withdraw → 202 `{ ok:true, requested:true }` or a refusal per REQ-005 (e.g. LOCKED_UNTIL with the date).
Until this exists the website's investment Withdraw button cannot send a real request.

## REQ-001 (open) 2026-11-05
**Live test customer**
A test customer (free + one subscribed demo account) whose login the owner stores as GitHub secrets FTM_TEST_EMAIL / FTM_TEST_PASSWORD,
so an hourly browser test can log in on the live site and press every button.
