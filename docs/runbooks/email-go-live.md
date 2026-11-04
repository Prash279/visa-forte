# Runbook: switch visaforte.com email to Google Workspace and take it live

Owner: Prashant. Branch: `fix/email-google-workspace`. Prepared 2026-10-24.

The website will send every email (booking alerts, client emails, cron digests) through one dedicated
Workspace mailbox, using `sendEmail()` in `apps/web/src/lib/email.ts`. Resend is retired.

Allow about 60–90 minutes in total. Steps marked **(Claude)** are for me to run; tell me when you reach them.
Google and Vercel sometimes move menus. If a path below doesn't match, search for the setting name in
that console.

---

## Phase 1 — Create the sending mailbox (Google Admin console)

**1. Choose the address: `notifications@visaforte.com`, not `no-reply@`.**
- Customers reply to booking and portal emails, and replies to a no-reply address are lost.
- Gmail and other mailbox providers treat no-reply senders with more suspicion.

**2. Create it as a real user, not an alias or a group.**
- Only a real user can sign in to send mail.
- An alias of prashant@ would make Gmail file every admin alert under Sent instead of your inbox.
- To create it:
  1. Go to admin.google.com → Directory → Users → **Add new user**.
  2. First name `Visa Forte`, last name `Notifications`, primary email `notifications@visaforte.com`.
  3. Set a strong password and store it in your password manager.
- This adds one Workspace licence. Check the monthly cost under Billing before confirming.

**3. Allow 2-Step Verification for users.**
- Go to admin.google.com → Security → Authentication → **2-Step Verification**.
- Make sure "Allow users to turn on 2-Step Verification" is ticked, then save.
- App passwords only exist for accounts with 2-Step Verification on.

**4. Let prashant@ read this mailbox.** This lets you see customer replies and the Sent folder, which is
your record of every email the site sent. Choose one:
- **Delegation (recommended):**
  1. admin.google.com → Apps → Google Workspace → Gmail → User settings → **Mail delegation** → allow.
  2. Then, signed in as notifications@: Gmail → Settings → Accounts → **Grant access to your account** →
     add prashant@visaforte.com, and accept the invite from prashant@.
- **Or forwarding:** signed in as notifications@: Gmail → Settings → Forwarding and POP/IMAP → add
  prashant@visaforte.com, and confirm with the code Google emails to prashant@.

---

## Phase 2 — Secure the mailbox and create the app password

**5. Sign in as `notifications@visaforte.com` in a private (incognito) window.** This avoids mixing it up
with your own account. Change the temporary password if asked.

**6. Add recovery options** at myaccount.google.com → Personal info / Security: recovery email
prashant@visaforte.com and your phone. If this mailbox is ever locked out, the whole site stops
emailing.

**7. Turn on 2-Step Verification** at myaccount.google.com → Security → **2-Step Verification**. Use your
phone, and save the backup codes in your password manager.

**8. Create the app password.**
1. Go to **myaccount.google.com/apppasswords**, still signed in as notifications@.
2. Name it `visaforte-website` and press Create.
3. Copy the 16-character password. **Google shows it only once.** Store it in your password manager.
4. Remove the spaces, so `abcd efgh ijkl mnop` becomes `abcdefghijklmnop`.
5. If "App passwords" doesn't appear, check that step 7 is complete and the account isn't enrolled in
   Advanced Protection.

**9. Rules for keeping this credential alive.** Google's help page (checked 2026-11-02) says changing the
account password **revokes all app passwords**. These things break it:
- changing the notifications@ password (then create a new app password and update Vercel);
- turning off 2-Step Verification on this mailbox;
- deleting the app password;
- suspending the user;
- letting its Workspace licence lapse.

Never share this password in chat or email, including with me.

**10. (Optional) Brand the sender.** Set the notifications@ profile photo to the Visa Forte logo at
myaccount.google.com → Personal info. Gmail shows it next to your emails.

---

## Phase 3 — Add the credential to Vercel

**11. Add two variables.** Go to vercel.com → project **visa-forte** → Settings → **Environment Variables**,
and add each one with **Production** and **Preview** ticked and **Type** set to **Secret** (Vercel replaced
the old "Sensitive" switch with Config/Secret types in 2026):

| Name | Value |
|---|---|
| `SMTP_USER` | `notifications@visaforte.com` |
| `SMTP_APP_PASSWORD` | the 16-character app password, no spaces |

**12. Leave `RESEND_API_KEY` in place for now.** It's removed in Phase 7. New variables only apply to new
deployments; the next step creates one.

---

## Phase 4 — Approve and open the pull request

**13. Approve the branch in this chat.** Your repo rules treat these as halt-and-ask items:
- edits to four Razorpay verify routes (email lines only; payment logic is unchanged);
- the new dependency `nodemailer@10.0.16`;
- optionally, the **email outbox** (a new table plus automatic retry). Say yes or no; it can be added
  later.

**14. (Claude)** I show you the diff summary and commit message, commit, and, on your explicit "push",
push the branch and open a PR. CI then runs typecheck, lint and tests, and Vercel posts a **Preview URL**
on the PR.

---

## Phase 5 — Test on the Preview deployment

> **Caution:** Preview most likely uses the same Supabase database as production. Every test below
> creates real rows. Use obviously fake names such as "TEST Prash" and delete them afterwards from
> /admin.

**15. Lead-capture email (customer email plus admin alert).**
- Open `<preview-url>/assessment`, complete the assessment, and on the result screen use the
  "send my results" form with your **personal** email.
- **Expect within 1 minute:**
  - at your personal email, "Your CanVisa Pro Results", from *Visa Forte \<notifications@visaforte.com\>*;
  - at prashant@ **Inbox, not Spam, not only Sent**, "New Tool Lead: TEST …".

**16. Check authentication.** In Gmail, open the received email → ⋮ → **Show original**. All three should
read **PASS**: SPF, DKIM, DMARC. If DMARC fails, stop and tell me; your DMARC policy is "quarantine",
so failing mail goes to spam.

**17. Admin stage-change email. Do this on visaforte.com in Phase 6, not on Preview.** The login system
(`lib/auth.ts`) only trusts localhost and visaforte.com, so signing in on a Preview address will most
likely be refused. Skip this step during Phase 5.
- Log in at `https://visaforte.com/admin`, open the TEST client created earlier (or create one), and change its
  stage.
- **Expect:** "[Stage Change] TEST …" in the prashant@ Inbox.

**18. Logs.**
- Go to Vercel → the Preview deployment → **Logs**, and search for `"service":"email"`.
- **Expect:** `"result":"success"` entries and no `"failure"`.

**19. Prove that failures are loud.** This is the test that matters most.
1. In Vercel, edit `SMTP_APP_PASSWORD` for **Preview only** and set it to `wrongpassword`. Redeploy the
   Preview.
2. Repeat step 15.
3. **Expect:** the page still works **and still says the email was sent** (the form never checks the
   server's answer, an existing behaviour this change does not alter), the lead email does **not** arrive, Vercel logs show
   `"result":"failure"` with code `EAUTH`, and **Sentry emails you** an issue titled
   "Email send failed (EAUTH)" within a few minutes.
4. Sentry's default alert "visa-forte: new issues" (Monitors → Alerts, checked 2026-11-04) already emails you for this. If no
   email arrives, set up an alert yourself: sentry.io → **Monitors → Alerts** → **Create Alert** → When:
   "A new issue is created" → Then: **Notify on preferred channel** → Member: you. Make sure email is
   enabled in your Sentry notification settings, and use **Send Test Notification**. Then retry.
5. **Put the correct app password back** for Preview and redeploy.

**20. Clean up.** Delete the TEST lead and TEST client in /admin.

---

## Phase 6 — Go live

**21.** Tell me "merge". **(Claude)** merges the PR, which triggers the production deploy.

**22. Repeat step 15 on visaforte.com** with your personal email, and delete the test lead afterwards.

**23. Run the daily cron once by hand.**
- Vercel's docs (checked 2026-11-04) describe a **View Logs** button on Settings → **Cron Jobs**, and an
  on-demand trigger only through the CLI (`vercel crons`). **(Claude)** triggers it from the CLI; if that
  is not possible, wait for the 06:00 IST run and read the result under **View Logs**.
- **Expect:** Logs show the run returning `"emailTransportOk": true`.
- From now on it checks the credential every day at 06:00 IST.

**24. Watch for 48 hours.** Check that real booking or lead alerts arrive in your Inbox, and that Sentry
stays quiet about email.

---

## Phase 7 — Retire Resend (after 48 quiet hours)

**25. Vercel:** delete the `RESEND_API_KEY` environment variable.

**26. Cloudflare DNS for visaforte.com.**
- **Delete** the Resend records:
  - the TXT record `resend._domainkey`;
  - the MX record on `send` (`feedback-smtp.ap-northeast-1.amazonses.com`);
  - the TXT record on `send` (`v=spf1 include:amazonses.com ~all`).
- **Keep** the Google records: the MX records (aspmx…), the root SPF `include:_spf.google.com`,
  `google._domainkey`, and `_dmarc`.
- Take a screenshot of the DNS page before deleting. Cloudflare has no undo.

**27. Resend dashboard:** delete any remaining API keys, then close the account.

**28. Local files:** delete the `RESEND_API_KEY` line from `C:\Users\hp\visaforte\apps\web\.env.local`.
**(Claude)** then removes the temporary worktree `C:\Users\hp\visaforte-email-fix`.

---

## Phase 8 — The day Razorpay goes live (after sole-proprietorship registration)

Four email paths only run after a real payment, so they can't be tested before then:
- paid booking (`/api/payment/verify`);
- premium resource purchase;
- ITA Countdown purchase;
- Refusal Analyser purchase.

**29.** After adding `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to Vercel, make one test purchase of
each in Razorpay **test mode**. Confirm the customer email and the admin alert both arrive, then refund
or delete the test records.

---

## Ongoing

- **If Sentry emails you "Email send failed (EAUTH)" or "Email verify failed",** the app password has
  stopped working. Repeat steps 8 and 11 (new app password, update Vercel, redeploy).
- **Retention.** Every email the site sends stays in notifications@ → Sent. That's useful as an audit
  trail, but it holds client personal data. Your Privacy Policy promises a maximum of 3 years, so delete
  sent mail older than 3 years at least once a year, or set a retention rule if your Workspace plan
  includes Vault.
- **Never** point `SMTP_USER` at prashant@visaforte.com (admin alerts would vanish into Sent), and never
  turn off 2-Step Verification on notifications@ (that kills the app password).
