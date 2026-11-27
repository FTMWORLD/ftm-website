# Take over the FTM scheduled jobs (owner 27 Nov 2026: full automation)

Why: the old session (started 9 Nov) asks the owner to approve every Metricool post. A session started after the
.claude/settings.json allow list (23–24 Nov) posts without asking (tested 26 Nov). So a new session takes over all jobs.

In the NEW session, for each trigger below: get_trigger <id>, create_trigger with the SAME name, cron_expression and
prompt (it then fires into the new session by default), then delete_trigger <old id>. Keep the order; check list_triggers at the end.

| Job | Old trigger id | Schedule (Berlin) |
|---|---|---|
| Stories (5 a day) | trig_01Ev6mWWZS2GGG8QXXCrDcbJ | 07:22 |
| 13:00 story video | trig_011zyAVL8wDNsErroG7VTBqX | 11:31 |
| Daily review and benchmark | trig_01WTrTbspJriv8AXMUhWAwgh | 13:47 |
| 6 p.m. results | trig_014sr3dkEX3BJ66bQVTW39xC | 18:01 |
| Tomorrow's scripts and image briefs | trig_01Nonv2uf74gRvgMofvfdCeK | 18:41 |
| Evening batch (all of tomorrow's posts) | trig_01PcD933UoMcRRuCm79TU7Ts | 21:37 |
| Midnight 09:30 video | trig_01HFcgGpDQF2SrM2M5ManVtJ | 00:00 |
| Saturday weekly summary | trig_01CBLip41GMhup3QrUzcqJCE | Sat 17:38 |
| Telegram 13:00 27 Nov (one-off) | trig_01Mc56rHXYdBx5ZRCjUGaLw5 | 27 Nov 12:45 |

First job for the new session today: post what is waiting (see the latest HANDOFF/owner notes): the 27 Nov 13:00 video
vid-2026-11-27-1300 and stories story-2026-11-27-0800/1200/1530 at the next free half hours (not 18:00); NO 6 p.m. post on 27 Nov.

## Done 27 Nov 2026 (12:15 Berlin)
All nine jobs moved to session_016Q1GV74x4N2sCFVBuzgZUh (repo path /workspace/ftm-website, branch claude/intelligent-keller-d2tw5q); old triggers deleted.
New ids: stories trig_01BRJFEXyinwVc8JkgbndgqP · 13:00 trig_01ByBvCPLWje9n7PA3WCyVwZ · review trig_013eeikJsTD18mKN6xxk5JAN · 6 p.m. trig_01UkZaVW3RKxaSBi1hTUVdJd · briefs trig_01FwLSKkJP3YwPbxh5R9C2hG · evening batch trig_01YLQT4hvpbkvDaMHRWqQWmP · midnight trig_01GEoBZApgz91vebdLRFxBqY · weekly trig_014JT1hmyTx438Zx1Btdawbf · Telegram 27 Nov trig_01VWJie5TfzMJfGczPwCXVxV.
27 Nov 13:00 video scheduled (IG with collaborators, FB, TikTok, YouTube, LinkedIn); stories 0800/1200/1530 at 12:30/13:30/14:00. Metricool posted without approval prompts.
