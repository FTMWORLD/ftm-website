# One video, presented the way each platform rewards it (owner 24 Nov 2026)

Owner: "All these social media are different. It can be the same content, but the way it is presented should be different."
Every feed video (09:30, 13:00, 18:00, Saturday weekly) goes out as a SEPARATE Metricool post per network
(Instagram, Facebook, TikTok, YouTube, LinkedIn) plus Telegram (.github/workflows/telegram.yml), each with its own
caption, hashtags, title and first comment written for that platform. Same video, same figures, same vote, same rules
(percentages only, no "free", no "tap our name", "people", "profit days / loss days", no promises).

## What decides reach (research 24 Nov 2026 + our own numbers)
- Everywhere: the first 1–3 seconds and how much of the video people watch. Our Instagram skip rate in the first
  3 s is 50–82% (Metricool, 19–23 Nov); TikTok gives us 80–320 views per video, Instagram 8–53.
- Instagram ranks watch time, then SENDS per reach (people sending the Reel to a friend), then likes per reach.
- TikTok works like a search engine: the words in the caption and on screen decide who finds the video.
- Facebook Reels reach people who do not follow the page; real conversations in the comments help, engagement bait hurts.
- YouTube Shorts: a test audience first, then more if few swipe away; title and description only help it be found.
- LinkedIn: dwell time; a link in the post costs reach; few or no hashtags; professional tone.
Sources: Buffer, Sprout Social, SocialPilot (Instagram); Metricool TikTok SEO guide, Hootsuite (TikTok); SocialPilot,
Buffer (Facebook); vidIQ (YouTube Shorts); Metricool, SocialPilot (LinkedIn), all 2026.

## Instagram (Reel; 6 p.m. = post with the video first, then the slides)
- Video: the version WITHOUT the cover as frame 1 (`vid-D-nc.mp4` when it exists; coverfirst.py makes it). The cover goes
  in videoThumbnailUrl instead, so the Reel starts moving at once (fights the 3-second skip).
- Caption: line 1 = the hook with a search word people use ("Automated trading", "passive income", "gold", "Bitcoin").
  2–3 short lines, then one SEND line ("Send this to someone who trades with their heart, not rules."),
  then "Tap the link in our bio to create your account." 3–5 hashtags, never more than 5 (Instagram's limit):
  #FTM plus 2–4 specific ones (#AutomatedTrading #GoldTrading #PassiveIncomeIdeas #TradingPsychology).
- First comment: the vote. 13:00 only: 3 collaborators (collabs.json). mediaAltText: one plain sentence with keywords.

## TikTok
- Video: with the cover as frame 1 (TikTok shows frame 1).
- Title (tiktokData.title): the hook, under 60 characters.
- Caption: written for TikTok search: 2–4 sentences that say plainly what the video is about with the words people
  search ("automated trading results today", "how to trade gold without watching charts", "trading bot honest results"),
  then a question that makes people COMMENT (A or B), then "Link in our bio to create your account."
  3–5 hashtags: 2–3 niche (#AutomatedTrading #TradingBot #GoldTrading) + 1 broad (#Investing) + #FTM.
- No first comment through Metricool on TikTok: the vote line is in the caption.

## Facebook (Reel)
- Video: the version without the cover frame (`-nc`), cover in videoThumbnailUrl.
- Caption: short and conversational, 1–3 lines, like talking to a friend; one genuine question that starts a real
  conversation; "Visit our page for the link to create your account." 0–2 hashtags. Never "comment YES" bait.
- First comment: the vote.

## YouTube Shorts
- Video: with the cover as frame 1. NO videoThumbnailUrl.
- Title: the hook with one keyword, 40 characters or less (the feed cuts the rest), then " #shorts".
- Description: 2 sentences with the keywords said in the video, then "Create your account: https://www.ftmwealthnation.com/?start=yt",
  then 3 hashtags (#AutomatedTrading #Investing #FTM).
- Say the main keyword out loud in the first seconds of 09:30 and 13:00 scripts (YouTube reads the speech).

## LinkedIn
- Video: with the cover (videoThumbnailUrl = cover).
- Text: professional, insight first, 3–5 short lines with one real figure and what it means (system, discipline,
  time). NO link in the post (it costs reach): end with "Create your account through the link on our profile."
  0–3 hashtags (#FinTech #Investing). The 6 p.m. poll stays a separate post 30 minutes later.

## Telegram (our own channel, people who already follow us)
- The full story: the figure, every market line, the month so far, and the clickable link
  https://www.ftmwealthnation.com/?start=tg. The vote as a real Telegram poll.

## X (not connected yet: owner decides between the Metricool add-on and our own connection)
- When connected: one sharp line + the figure, 1–2 hashtags, no link in the post (link in the profile).

## Same for all
- One video per post time; captions never copy-paste between platforms; check every caption against the wording rules.
- Each week (Monday job) compare views, watch time and skip rate per platform and adjust this file.
