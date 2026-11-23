# FTM content playbook (owner 23 Nov 2026: "every post looks and sounds the same — be creative, relate to people and to the day")

Every 09:30 video, 13:00 couple video and story follows this. The 18:00 results keep their own format.

## What our own numbers say (Metricool, 19–22 Nov 2026, small sample)
- TikTok: real-number posts win. The honest loss-day result (−0.99%, 20 Nov) was our best TikTok (324 views); pitch-style videos and long videos were the worst (couple video 64, 5-minute explainer 98).
- Instagram: 50–75% of viewers skip in the first 3 seconds; 0 saves, almost 0 shares. The first 1.5 s decides everything.
- Facebook: a short curiosity hook did best ("Most people miss the markets for one reason…", 73).
- So: lead with a real number or a real moment, never with "FTM MACHINE does it for you"; keep 21–40 s; give people a reason to comment, save or send.

## Rules for every 09:30 and 13:00 video
1. ONE viewer, named in the first 1.5 s, in their words ("If you sold Nvidia last week…", "POV: you're on a night shift…").
2. ONE format from the list below, never the same format as any of the last 7 posts (check social/plan/journey.json: every entry logs "format", "sound", "audience", "news").
3. Tie it to TODAY when there is real news (see "News of the day"), and always to one pillar: time, emotion or system (CLAUDE.md).
4. 21–40 s. Captions on screen in short chunks. One real FTM figure, never a promise.
5. A different sound each time: buildvid/storyvid take a style — drive, lofi, news, cinema, bright (social/tools/finbed.py) — never the same style twice in a row; vary the narrator voice and pace too (bm_george, af_heart, am_michael, am_adam, bf_emma…).
6. End with a question people want to answer (comments) plus the call to action.

## Formats (rotate; faceless, buildable with our tools)
| Format | Example for FTM | Sound |
|---|---|---|
| News reaction | Headline card → "Nvidia's CEO is back: nearly +30% in one morning. Were you watching?" | news |
| "Did you catch this?" | "Gold hit a 14-month low on a Wednesday afternoon. Did you catch it?" | news → lofi |
| POV | "POV: you're on a night shift and gold just moved" | cinema |
| Myth vs fact | "Myth: you must watch charts all day. Fact: FTM MACHINE does, 24/7" | bright |
| Things I wish I knew | "3 things I wish I knew before my first revenge trade" | lofi |
| Split screen: feelings vs rules | Left: a panicking hand moving the stop. Right: the fixed stop | drive |
| Day in the life of the machine | "03:12 Bitcoin entry while you sleep…" with clock stamps | news |
| Quiz / poll | "Profit day or loss day yesterday? Guess, answer at 6 p.m." | bright |
| Countdown | "5 moments you missed this week" | drive |
| Text-on-screen story (no voice) | "She sold at the bottom. Again." | lofi |
| Trade receipt | Yesterday's trades printing on paper, in % | news |
| Honest loss day | "−0.99%. We show every loss day." | cinema |
| Unpopular opinion | "Your feelings are your worst broker." | drive |
| Explain like I'm 12 | "A stop loss is a seatbelt…" | bright |
| Mini-series | "7 years, 7 profitable years — part 3: 2022" | the series' own sound |
| Texting / chat | HER texts HIM "did you see gold??" (great for 13:00) | lofi |
| Then vs now | Backtest line 2020 → 2026 drawing itself | cinema |
| Stitch-bait question | "What's the worst trade you ever made at 2 a.m.?" | lofi |
| Calendar flip | November grid filling: profit days and loss days | bright |

The 13:00 couple video uses the couple inside these formats (texting, POV, quiz, myth vs fact, news reaction) instead of the same kitchen dialogue every day.

## News of the day
- The evening job searches the day's market and money news (gold, Bitcoin, US Tech 100, USD/JPY, Hang Seng, central banks, big companies, everyday money).
- Use a fact only when two reliable sources confirm it; name the source; never call an intraday move a close; never invent a number.
- Write tomorrow's item into social/plan/news.json (it becomes the 08:00 story automatically) and use it for the 09:30 video when it fits a pillar.

## Stories (social/tools/stories.py)
Five a day, each with its own look (theme navy, paper, night, gold), format (news, best day, quiz, month result, myth vs fact, POV) and sound style. Myths and POV lines rotate by date; add new ones to the lists rather than repeating.

## Weekly
Every Monday: pull Metricool analytics for the last 7 days and update "What our own numbers say" with what worked and what did not.
