# CLAUDE.md — camel-customer

Customer booking site for **Camel Global** (meet & greet car hire marketplace).
Sister repo: `camel-portal` (partner/admin/driver portal) at `~/camel-portal`.

> **Work happens across several surfaces (CLI, desktop app, phone).** Separate sessions share this
> repo, not each other's context — this file and the handover ARE the handoff. Finish a session
> with work committed and these docs true, or the next session starts from a lie. That has already
> happened once: a full charge-model rewrite shipped while this file still described the old one.

**Money flow:** the authoritative architecture is `STRIPE_REWRITE_DESIGN.md` in `~/camel-portal`
(model, state machine, phase plan), with `STRIPE_MONEY_FLOW_AUDIT.md` recording the findings that
caused it. **Read it before touching charge or refund code.**

Session history and in-flight project plans live in `CAMEL_GLOBAL_HANDOVER.md` in this repo.
**Read it when you need context on what happened recently or what a project's phase plan is** —
do not assume it's loaded. This file is the durable stuff only.

---

## Identity

- **Legal entity:** NTUK Ltd, trading as Camel Global. Company no. 08765474.
- **Registered address:** Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN
- **Stack:** Next.js 16, Supabase, Vercel, GitHub, Stripe Connect
- **Launched in Spain.** Multi-currency + multi-locale. US is a future market, not built.

### Domains
| Domain | Env |
|---|---|
| `camel-global.com` / `www.camel-global.com` | Customer production (**LIVE**) |
| `test.camel-global.com` | Customer staging |

Stripe webhook: `https://www.camel-global.com/api/webhooks/stripe`

---

## NON-NEGOTIABLE RULES

Break these and you break production. Each one is here because it was broken before.

### 1. Git safety
- A "safe rollback" means **create a tag**. A tag is a bookmark and changes nothing.
- **NEVER `git revert`** a range of commits to "roll back". This once backed out an entire
  session's work (13 revert commits) and required a force-push recovery.
- **NEVER `git reset --hard`, `push --force`, or rewrite history** without explicit confirmation
  from Nick in that message. Not implied consent, not "you said rollback".
- Git being correct does **not** mean production is correct. Vercel can be serving an older
  promoted build. After any history change, check the Vercel **Production badge** points at a
  good commit.
- Always `git add <specific-file>`, never `git add .`

### 2. Partner matching gate: approved + live-ready
The match loop in `app/api/test-booking/requests/route.ts` gates on
**`partner_applications.status === 'approved'` AND live-readiness** (base_address,
default_currency, vat_number — fleet category/coords/radius are already ensured earlier in the
loop). Mirrors portal `lib/portal/computeLiveReadiness.ts` (7 checks).

- **An active driver is NOT a matching requirement.** It's a fulfilment-time thing — the partner
  assigns a driver when they process a won booking (`assigned_driver_id` is nullable). A partner
  missing only a driver still receives bids. (Was previously a gate; removed deliberately.)
- **`status` is ONLY `pending` / `approved` / `rejected`.** "Live" is a computed concept, never a
  stored status. **Never gate on `status === 'live'`** — that was a real regression that silently
  matched nobody for weeks.
- **Gotcha:** a live partner with null `base_lat` / `base_lng` / `service_radius_km` silently
  never matches — the loop skips null coords. Audit before debugging a no-match.

### 3. PDFs are always ENGLISH. Emails are localised.
- **All PDFs stay English** — NTUK legal requirement. This includes the booking receipt and the
  completion statement. The `<Text>` components in the PDF generators are English regardless of
  locale.
- **Emails are localised** to `communication_locale` across **6 locales** (en, es, fr, it, pt, de)
  with English fallback. Use `coerceLocale()` from `lib/email.ts`.
- Never write `locale === "es" ? "es" : "en"` — that silently collapses de/fr/it/pt to English.
  This exact pattern was the root cause of a whole class of bugs.

### 4. Legal pages stay ENGLISH
Customer **terms, privacy, and cookie** pages are English-only **by decision**. Do not translate
them, do not wire them to `t()`.

### 5. Currency: bid-currency, NO FX
- **One currency per partner** = their Stripe settlement currency, derived from their country.
  Bid currency = charge currency = payout currency. **No FX on the transactional path.**
- The `useCurrency` / rate layer is **browse-display only**, never transactional.
- Each booking **snapshots** its currency at creation. History is immutable.
- Supported set: `lib/currency.ts` `CURRENCIES` (EUR, GBP, USD, AUD, NZD, CAD). Use
  `coerceCurrency()` at every point that reads a currency off a bid/request.
- The €10 minimum-commission floor is stored EUR and converted via `MIN_FLOOR_RATE` in
  `create-intent`.
- **Never sum money across currencies.**

### 6. Money model: charge to platform, settle monthly
**Rewritten Jul 2026 (`STRIPE_REWRITE_DESIGN.md` in `~/camel-portal`). Destination charges are
GONE — for EVERY corridor, not just AU/NZ.** Any comment or handover block mentioning
`transfer_data.destination`, `on_behalf_of`, `application_fee_amount` or transfer reversals is
stale. Verify against code.

- **`create-intent` makes a plain charge** for `car_hire + fuel_deposit` to **Camel's platform
  balance**, in the bid currency, `charge_model='platform_hold'`, idempotency key
  `charge_${bid_id}`. **There is no corridor fork in this file** — every rail charges identically.
  Camel is **merchant of record**; refunds and chargebacks debit Camel's balance.
- **The partner is paid monthly** by the portal's payout cron, never at charge time.
- **Refunds come from the platform balance.** Never `reverse_transfer` — nothing was transferred.
  Customer cancels: >48h → full refund; <48h → fuel deposit only. Idempotency
  `cancelrefund_${booking_id}`; the route must **abort** on refund failure, never report a refund
  it did not make.
- **Webhook ordering is load-bearing:** insert `partner_bookings` **and** `payments` FIRST (with a
  compensating delete if the payments insert fails), and only then set
  `customer_requests.status='confirmed'`. Confirming first meant a transient insert error left a
  charged card with no booking, because the Stripe retry bounced off the `status !== 'open'` gate.
- Booking and receipt amounts come from the **charge snapshot in PaymentIntent metadata**, never
  from a re-read of the live (still editable) bid.
- Unique indexes on `partner_bookings.winning_bid_id` and `payments.stripe_payment_intent_id`
  prevent concurrent-webhook double-inserts.

### 7. Security invariants
- Identity from the **verified JWT only**.
- Customer API scopes with `.eq("customer_user_id", customerUser.id)` → 404 on mismatch.
  Never weaken this.
- `middleware.ts` is deliberately **pass-through** (`NextResponse.next()`). Data is protected at
  the API layer. A server-side auth gate is a deferred defence-in-depth item, not a fix for a
  known hole.

### 8. Database
- One Supabase project. `lib/supabase-customer/server.ts` exports `createCustomerServerClient()`
  and `createCustomerServiceRoleSupabaseClient()`.
- Customer locale lookup:
  ```ts
  const { data } = await db.from("customer_profiles")
    .select("communication_locale").eq("user_id", userId).maybeSingle();
  ```
- Widening a UI enum (e.g. adding locales) needs a matching **DB CHECK constraint** change.
  This has bitten twice.

---

## Architecture map

Only the files you'll actually need. Read the file before changing it — do not trust this table
or any code comment as current.

### Core libs
| File | Purpose |
|---|---|
| `lib/currency.ts` | Currency source of truth — `CURRENCIES`, `currencyLocale()`, `coerceCurrency()`, `formatMoney()` |
| `lib/serverCurrency.ts` | Server-side currency handling |
| `lib/email.ts` | Resend sender + customer/partner notification helpers. Exports `Locale`, `coerceLocale()`, `sendPartnerNewRequestEmail()` |
| `lib/portal/generateBookingReceiptPDF.tsx` | Receipt PDF (**English**) + its email (**localised**). Platform Payment Notice included |
| `lib/portal/generateCompletionStatementPDF.tsx` | Completion statement PDF (**English**). Shows AMENDED when refunds exist |
| `lib/i18n/useTranslation.ts` | `t()` hook — flat dot-notation keys, English fallback |

### Key routes
| Route | Notes |
|---|---|
| `app/api/payments/create-intent/route.ts` | PaymentIntent creation — plain charge to the platform balance, no corridor fork, idempotency `charge_${bid_id}`. **Most sensitive file in the repo** |
| `app/api/webhooks/stripe/route.ts` | `payment_intent.succeeded` → inserts `partner_bookings` + `payments` (ledger FIRST, rollback on failure) at `payout_status='held'`, captures the card fee into `stripe_fee_total`/`stripe_fee_breakdown`, THEN confirms the request. Sends receipt + GA4 purchase event |
| `lib/portal/cancelBooking.ts` | Platform-balance refunds, >48h vs <48h split, writes `payout_status` to **both** `partner_bookings` and `payments` |
| `app/api/test-booking/requests/route.ts` | Creates request, runs geo+fleet match, writes `request_partner_matches`, emails live in-radius partners (`Promise.allSettled`, non-blocking) |
| `app/api/test-booking/requests/[id]/route.ts` | GET booking detail — ownership enforced |
| `app/api/test-booking/bookings/[id]/completion-statement/route.ts` | Completion statement generation |

### Key pages
| Page | Notes |
|---|---|
| `app/page.tsx` | Homepage + booking form. Has its **own** language switcher (logged-out) |
| `app/ClientRootLayout.tsx` | Header on all logged-in pages. Has a **second** language switcher |
| `app/checkout/[bid_id]/page.tsx` | Renders its **own** nav — the global header is suppressed via `!isCheckoutPage`. Needs its own switcher |
| `app/bookings/[id]/page.tsx` | Bespoke header. Post-completion refund block in amber |
| `app/account/page.tsx` | VAT Invoice Details card + email-language picker |

---

## i18n

Six locales: **en, es, fr, it, pt, de**. Flat key-value JSON, **NOT nested**. English fallback.

**There are multiple independent switchers.** Fixing one is not enough — a past bug surfaced as
"only EN/ES when logged in" because `ClientRootLayout.tsx` was missed while `page.tsx` was fixed.
Known locations: `app/page.tsx`, `app/ClientRootLayout.tsx`, `app/checkout/[bid_id]/page.tsx`,
`lib/i18n/LanguageToggle.tsx`, `app/account/page.tsx`.

**`app/marketing/translations.ts` is a self-contained i18n island** with its own `Lang` type,
`data-i18n` attributes, `setLanguage()`, and a hardcoded `<option>` list — separate from
`useTranslation`. Adding a language needs the translations object **and** the option list.

The chat bubble only renders when `isCustomerLoggedIn` — by design, not a bug.

**When validating machine translation: assert the output DIFFERS from the English source.**

---

## Working agreement

*(This block is intentionally duplicated in `camel-portal/CLAUDE.md` — keep them in sync.)*

- **Read the actual file before changing it.** Never trust a comment, an old artifact, or this
  document as current. Multiple stale comments have caused real bugs.
- **`npx tsc --noEmit` after every change.** Widening a shared type surfaces every hardcoded
  consumer — use tsc as the checklist. Cross-file changes may need both files applied before tsc
  passes; apply the pair, then run tsc once.
- **Commit per logical unit** with a descriptive message. Never batch unrelated changes.
- **Deploy and verify per unit**, not at the end. Disk-correct is not deployed — check
  `git show HEAD:<file>` and/or the live DOM when a fix "isn't taking".
- Adding a column to a table is not enough: **add it to the `.select()` of every route that feeds
  a page**. This has been missed three separate times.
- A form sending a field does not mean it's saved — the route must parse it from the body **and**
  include it in the insert.
- When editing large files, back up first and assert the anchor matched before writing. Abort on
  mismatch, never silently no-op.
- `.bak` files are gitignored. Sweep them when convenient.
- Branch protection: `main` requires PRs; pushes have used admin bypass.

### Deploy
```bash
cd ~/camel-customer && git add <file> && git commit -m "message" && git push origin main
```

### Tag a stable point
```bash
git tag -a v-stable-chatNN -m "description" && git push origin v-stable-chatNN
```

---

## Known traps

- **zsh globs `[id]` paths.** Always single-quote paths containing brackets:
  `git add 'app/checkout/[bid_id]/page.tsx'`
- Never paste a line starting with `#` into zsh.
- macOS `~/Downloads` xattrs can make `cp`/`cat <` fail with "Operation not permitted", and
  `cat src > dest` **truncates dest even when the read fails**.
- Routes exist under both `app/api/test-booking/` and `app/api/webhooks/stripe/` — the
  `test-booking` naming is historical, **these are live production routes**, not scaffolding.
- `ChatWidget.tsx` and `Footer.tsx` exist in both repos but are **NOT identical**. The customer
  ChatWidget has a booking-focused welcome message. Update separately.
- `lib/supabase-customer/browser.ts` sets `detectSessionInUrl: false`.
- `app/reset-password/layout.tsx` is a standalone layout that bypasses `ClientRootLayout`.
