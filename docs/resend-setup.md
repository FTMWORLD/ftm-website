# Switch FTM emails to Resend (about 10 minutes)

Why: right now our emails are not signed for ftmwealthnation.com (no SPF, and the only DKIM key belongs to Brevo, which banned us). Gmail and Outlook then treat them as possibly fake, so they land in spam. Resend signs every email for our own domain.

## 1. Add the domain in Resend
1. Go to **resend.com** and log in (or sign up with the FTM email).
2. Left menu: **Domains** → **Add Domain**.
3. Type `ftmwealthnation.com`, choose region **EU (Ireland / Frankfurt)**, click **Add**.
4. Resend now shows a short list of **DNS records** (usually 3: one TXT called `resend._domainkey`, one MX called `send`, one TXT called `send`). Keep this page open.

## 2. Copy those records into Cloudflare
1. Open **dash.cloudflare.com** → click **ftmwealthnation.com** → **DNS** → **Records**.
2. For EACH record Resend shows: click **Add record**, choose the same **Type** (TXT or MX), paste the **Name** and the **Content/Value** exactly (use Resend's copy buttons), for MX also the **Priority** (usually 10). Click **Save**.
3. Also edit the existing TXT record `_dmarc` and replace its content with:
   `v=DMARC1; p=none; rua=mailto:ftmwebnation@gmail.com`
   (it currently sends its reports to Brevo).

## 3. Verify
1. Back in Resend, click **Verify DNS Records**.
2. It can take a few minutes (sometimes up to a few hours). Wait until the domain shows **Verified** (green).

## 4. Create the sending key
1. Resend left menu: **API Keys** → **Create API Key**.
2. Name: `FTM website`, Permission: **Sending access**, Domain: `ftmwealthnation.com` → **Add**.
3. Copy the key (starts with `re_`). **Never paste it in the chat.**

## 5. Put the key into the website (Vercel)
1. **vercel.com** → the FTM project → **Settings** → **Environment Variables**.
2. Add (or update) `RESEND_API_KEY` = the key you copied.
3. Add `MAIL_FROM` = `ftm@ftmwealthnation.com`.
4. Save, then **Deployments** → the latest one → **⋯** → **Redeploy**.

## 6. Same key for the login codes (Supabase)
1. **supabase.com** → the FTM project → **Authentication** → **Emails** → **SMTP Settings**.
2. Host `smtp.resend.com`, Port `465`, Username `resend`, Password = the same key, Sender email `ftm@ftmwealthnation.com`, Sender name `FTM`. **Save**.

## 7. Tell me "done"
I will then check the DNS records, send test emails to Gmail and Outlook, and confirm they arrive in the main inbox with "signed by ftmwealthnation.com".
