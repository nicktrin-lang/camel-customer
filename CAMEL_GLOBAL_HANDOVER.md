# Camel Global — Project Handover Document
> **Always paste this document at the start of every new conversation.**
> Update it at the end of each session before the chat fills up.

---

## Working Rules
- **Always paste the current file before Claude rewrites it.** Claude works from what you paste, not from memory.
- **Always give Claude the full file tree** at the start of a new chat:
  - Portal: `find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort`
  - Customer: `find ~/camel-customer -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort`
- **Before any rewrite**, Claude will tell you which files to paste, or give you a command to cat them.
- **Always ask Claude to check the actual file** before rewriting — never assume the artifact is current.
- **Always provide the git push command** at the end of every change.
- **Claude must always write full files** — no partial diffs, no "change X to Y" instructions.
- **When rebranding/restyling, never touch API call parameters or business logic — visual classes only.**
- **ChatWidget.tsx is identical in both repos** — always update both when changing it.
- **Footer.tsx exists in both repos but they are different** — portal has PortalFooter/DriverFooter/CustomerFooter, customer has CustomerFooter only. Update separately.
- **Always `git pull` before starting any session** — collaborator may have pushed.

---

## Project Overview
- **Name:** Camel Global
- **Legal entity:** NTUK Ltd, trading as Camel Global
- **Company number:** 08765474
- **Registered address:** Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN
- **Type:** Meet & greet car hire platform (Uber-style for car hire)
- **Stack:** Next.js 16, Supabase, Vercel, GitHub, Stripe Connect
- **Launching in Spain first, USD support ready for future US rollout**

### Repos
| Repo | Purpose | Local path |
|------|---------|------------|
| `nicktrin-lang/camel-portal` | Partner + Admin + Driver portal | `~/camel-portal` |
| `nicktrin-lang/camel-customer` | Customer site | `~/camel-customer` |

### Domains
| Domain | Project | Repo | Purpose |
|--------|---------|------|---------|
| `portal.camel-global.com` | `camel-portal-live` | `camel-portal` | Portal production |
| `test-portal.camel-global.com` | `camel-portal-live` | `camel-portal` | Portal staging |
| `camel-global.com` / `www.camel-global.com` | `camel-customer-live` | `camel-customer` | Customer production |
| `test.camel-global.com` | `camel-customer-live` | `camel-customer` | Customer staging |

### Deploy Commands
```bash
# Portal
cd ~/camel-portal && git add <file> && git commit -m "message" && git push origin main

# Customer
cd ~/camel-customer && git add <file> && git commit -m "message" && git push origin main
```

### Portals
| Portal | Path | Users |
|--------|------|-------|
| Customer | `camel-global.com/` | End customers |
| Partner | `portal.camel-global.com/partner` | Car hire companies |
| Driver | `portal.camel-global.com/driver` | Delivery drivers |
| Admin | `portal.camel-global.com/admin` | Camel Global staff |

---

## Tech Architecture

### Key Libraries & Files — Portal (`~/camel-portal`)
| File | Purpose |
|------|---------|
| `lib/supabase/browser.ts` | Supabase browser client (partner/admin) |
| `lib/supabase/server.ts` | Supabase server client — exports `createRouteHandlerSupabaseClient()` and `createServiceRoleSupabaseClient()` |
| `lib/cities.ts` | Shared city list for Photon search bias |
| `lib/portal/calculateFuelCharge.ts` | Fuel charge calculation logic |
| `lib/portal/calculateCommission.ts` | Commission — 20% of hire price, min €10 floor |
| `lib/portal/syncBookingStatuses.ts` | Booking status sync logic |
| `lib/portal/refreshPartnerLiveStatus.ts` | Core live status — checks all 7 requirements |
| `lib/portal/triggerPartnerLiveRefresh.ts` | Triggers the live status refresh |
| `lib/portal/operatingRules.ts` | Shared OPERATING_RULES data + downloadOperatingRulesPDF(). Includes section 3b — mileage limits & security deposits |
| `lib/portal/completeBooking.tsx` | Shared completion logic — Stripe fuel refund, payout_status=ready, generates + emails completion statement PDF to customer. Sends rich completion email with fuel summary, thank you message and PDF attachment. Uses direct REST fetch to portal Supabase (single project) to query `customer_requests`. Logo read from disk via `fs.readFileSync`. |
| `lib/portal/generateCommissionInvoice.tsx` | Commission invoice PDF generator — uses `created_at` from `partner_bookings` as the date column (pickup_at does not exist on that table). Shows all bookings including zero-commission cancelled ones. |
| `lib/portal/partnerTerms.ts` | **Single source of truth** for partner T&Cs — `PARTNER_TERMS`, `TERMS_VERSION`, `TERMS_EFFECTIVE`, `downloadPartnerTermsPDF()`. Both `signup/page.tsx` and `terms/page.tsx` import from here. Never duplicate terms content. |
| `lib/rateLimit.ts` | In-memory rate limiter — 3 req / 15 min per IP |
| `lib/hcaptcha.ts` | Server-side hCaptcha token verification |
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `lib/email.ts` | Resend email sender — all notification helpers. Supports `attachments` array (base64). `sendReviewReminderEmail` links to `${NEXT_PUBLIC_SITE_URL}/bookings/${requestId}#review` — ensure `NEXT_PUBLIC_SITE_URL=https://www.camel-global.com` is set in camel-customer Vercel env vars. |
| `app/api/partner/bids/route.ts` | Partner bid submission — saves mileage_limit + security_deposit_notes |
| `app/api/partner/invoices/route.ts` | GET — lists partner's commission invoices with signed download URLs |
| `app/api/partner/invoices/generate/route.ts` | POST — partner generates invoice for a period. Selects `created_at` (not `pickup_at`) from `partner_bookings`. |
| `app/api/partner/stripe/connect/route.ts` | Stripe Express account creation — sets default_currency from partner_profiles.default_currency |
| `app/api/admin/invoices/route.ts` | GET/POST — admin lists and generates commission invoices. POST selects `created_at` (not `pickup_at`) from `partner_bookings`. |
| `app/api/admin/accounts/[id]/route.ts` | GET/PATCH — admin account detail. PATCH supports `commission_rate` and `default_currency` updates. |
| `app/api/internal/complete-booking/route.ts` | Internal route — called from camel-customer when booking reaches completed. Protected by CRON_SECRET. Calls completeBooking(). |
| `app/admin/reports/page.tsx` | Admin reports — commission invoices section with partner dropdown + month dropdown (starts from current month). |
| `app/admin/accounts/[id]/page.tsx` | Admin account detail — includes Billing Currency Override section (admin only). |
| `app/partner/reports/page.tsx` | Partner reports — bookings, per-currency summary, Excel export, Commission Invoices section with month dropdown (current month included). |
| `app/partner/signup/page.tsx` | Partner signup — 5 steps, mobile responsive stepper. Imports `downloadPartnerTermsPDF` from `lib/portal/partnerTerms.ts`. |
| `app/partner/terms/page.tsx` | Partner T&Cs page — imports all content from `lib/portal/partnerTerms.ts` |
| `app/partner/onboarding/page.tsx` | Partner onboarding — 7 steps. Mobile responsive. Stripe refresh status calls `onRefreshProfile` after checking. Card padding `p-4 sm:p-8`. |
| `app/partner/layout.tsx` | Partner layout — auth guard + **approval check**: unapproved partners redirected to `application-submitted` page. Only dashboard, account, profile and info pages accessible before approval. |
| `app/partner/application-submitted/page.tsx` | Status-aware page — shows "Under Review", "Rejected", or "Thank you" depending on logged-in state. |
| `app/partner/dashboard/page.tsx` | Partner dashboard — all cards full width on mobile (`grid-cols-1` explicit). |
| `app/components/Footer.tsx` | Portal footer — `PortalFooter` (partner/admin), `DriverFooter`, `CustomerFooter`. Copyright bar is single line `text-xs` to avoid mobile overflow. |
| `app/cron/monthly-payout/route.ts` | Monthly payout cron — runs 1st of month. Uses `created_at` (not `pickup_at`). |
| `next.config.ts` | CSP headers including `form-action 'self'` — blocks redirect to fake payment pages. |

### Key Libraries & Files — Customer (`~/camel-customer`)
| File | Purpose |
|------|---------|
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/supabase-customer/server.ts` | Exports `createCustomerServerClient()` and `createCustomerServiceRoleSupabaseClient()` |
| `lib/portal/generateBookingReceiptPDF.tsx` | Booking confirmation receipt PDF |
| `lib/portal/generateCompletionStatementPDF.tsx` | Booking completion statement PDF |
| `app/api/test-booking/bookings/[id]/update/route.ts` | POST — customer confirms fuel/insurance. Triggers portal internal route on completion. |
| `app/api/payments/create-intent/route.ts` | Creates Stripe payment intent in partner's bid currency |
| `app/api/webhooks/stripe/route.ts` | Customer webhook — creates booking, generates receipt PDF, sends confirmation emails |
| `app/api/chat/route.ts` | Customer AI chat — scoped to logged-in customer's bookings only via `customer_user_id` filter |
| `app/components/Footer.tsx` | Customer footer only — copyright bar single line `text-xs`. |
| `app/page.tsx` | Customer homepage — react-datepicker, useIsDesktop hook |
| `next.config.ts` | CSP headers including `form-action 'self' https://checkout.stripe.com https://*.stripe.com` |

---

## CRITICAL: DB Client Rules
**One Supabase project** — both portal and customer data live in the same project (`guhcavvpuveiovspzxmg.supabase.co`).

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_CUSTOMER_SUPABASE_URL` point to the same project
- `SUPABASE_SERVICE_ROLE_KEY` and `CUSTOMER_SUPABASE_SERVICE_ROLE_KEY` are the same key
- `completeBooking.tsx` uses a direct REST fetch with `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to query `customer_requests`
- `customer_requests` table has RLS enabled with a permissive policy (`USING (true)`) — added Chat 38

---

## Completion Flow (CRITICAL)
1. `app/api/test-booking/bookings/[id]/update/route.ts` (camel-customer) sets `booking_status = completed`
2. Calls `POST /api/internal/complete-booking` on the portal with `CRON_SECRET`
3. `app/api/internal/complete-booking/route.ts` (camel-portal) validates secret and calls `completeBooking()`
4. `completeBooking()` issues Stripe fuel refund, sends customer + partner + admin emails with PDF

---

## Stripe Payment Architecture (CRITICAL)

### Currency Architecture
- Partner's billing currency set during Stripe onboarding from `partner_profiles.default_currency`
- Currency is **read-only** in partner edit profile — admin can override via account detail page (before Stripe onboarding only)
- Customer always pays in partner bid currency — no conversion

### Payment split
- **Camel always receives exactly the commission amount** — Stripe fee never reduces it
- **Stripe fee is borne entirely by Camel** — NOT deducted from partner payout
- **Partner payout = car hire − commission + fuel charge**
- **Camel net income = commission − Stripe fee**

### Commission calculation rule
**NEVER use `commission_amount` or `partner_payout_amount` from DB.** Always recalculate:
```typescript
const commAmt = Math.max((car_hire_price * commission_rate) / 100, 10);
const partnerPayout = Math.max(0, car_hire_price - commAmt + fuel_charge);
const camelNetComm = Math.max(0, commAmt - stripeFeeInBidCurrency);
```

### Cancellation payout rule
- Full refund cancellation → partner payout = 0
- Partial refund (within 48hrs) → partner keeps car hire minus commission

---

## Fuel Override Architecture (CRITICAL)
**Effective fuel = partner override (`collection_fuel_level_partner`) if set, else driver reading (`collection_fuel_level_driver`).**

Lock logic: **effective fuel exists AND customer confirmed AND customer fuel matches effective fuel.**

---

## Commission Invoice Architecture (CRITICAL)
- **Auto-generated:** Vercel cron 1st of each month at 08:00 UTC
- **Date column:** uses `created_at` from `partner_bookings` — `pickup_at` does NOT exist on that table
- **Cancelled bookings:** shown greyed out with zero commission for transparency
- **Partner download:** `/partner/reports` — month dropdown from current month back 24 months
- **Admin generate:** `/admin/reports` — partner dropdown + month dropdown
- **Manual trigger:** `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://portal.camel-global.com/api/cron/monthly-payout`

---

## Partner Terms Architecture (CRITICAL)
- **Single source of truth:** `lib/portal/partnerTerms.ts`
- **Current version:** `2026-06b` effective 1 June 2026
- **To update T&Cs:** edit `lib/portal/partnerTerms.ts` only

---

## Partner Approval Gate (CRITICAL)
- Unapproved partners are blocked from all portal pages except: dashboard, account, profile, info pages
- Enforced in `app/partner/layout.tsx` via approval check after auth
- Redirects to `/partner/application-submitted` which shows status-aware messaging
- **Do not add onboarding, bookings, requests, reports to `isPreApprovalPage`** — these must stay blocked

---

## Security Architecture
- **CSP `form-action`** — portal: `'self'` only; customer: `'self' https://checkout.stripe.com https://*.stripe.com`
- **Stripe Radar** — enabled, rules active: block highest risk, block CVC fail, request 3DS
- **Stripe 2FA** — enabled on live account
- **GitHub branch protection** — `main` branch requires PR, Repository admin bypass
- **Vercel notifications** — email on deployment ready and failures
- **Rotate `STRIPE_SECRET_KEY`** every 6-12 months in both Vercel projects
- **Pending:** Vercel 2FA (`https://vercel.com/~/security`), GitHub 2FA, Supabase 2FA, Gmail 2FA

---

## PDF Logo Architecture
- Logo file: `~/camel-portal/public/camel-invoice-logo.png`
- `completeBooking.tsx` (portal) — reads from disk via `fs.readFileSync`
- `generateCompletionStatementPDF.tsx` + `generateBookingReceiptPDF.tsx` (customer) — fetches from `https://portal.camel-global.com/camel-invoice-logo.png`

---

## Environment Variables (CRITICAL)
| Variable | Repo | Value |
|----------|------|-------|
| `NEXT_PUBLIC_SITE_URL` | camel-customer (Vercel) | `https://www.camel-global.com` — must be set or review email links break |

---

## Mobile Layout Rules
- All grid sections use explicit `grid-cols-1` on mobile — never rely on default
- Partner dashboard: all cards full width mobile, stats 2-col, quick actions 2-col
- Partner signup: stepper shows circles only on mobile, active step label only below
- Partner onboarding: `Card` uses `p-4 sm:p-8`, `NavButtons` uses `flex-wrap`
- Footer copyright: single `<p>` with `text-xs` — never two side-by-side `<p>` tags

---

## Email Addresses
| Address | Type | Forwards to |
|---------|------|-------------|
| `info@camel-global.com` | Mailbox (Mail Lite, Fasthosts) | Gmail via POP |
| `contact@camel-global.com` | Forwarder | `artur@` + `info@` |
| `partners@camel-global.com` | Forwarder | `artur@` + `info@` |
| `email@camel-global.com` | Forwarder | `nicktrin@gmail.com` + `artur@` |

---

## Stable Tags

### Portal (`~/camel-portal`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat36-pre` | Chat 36 — single currency model |
| `v-stable-fuel-override-complete` | Chat 35 — full fuel override flow |
| `v-stable-chat38-pre-spanish` | Chat 38 — completion email, logo on PDFs, currency locked at onboarding |
| `v-stable-chat39-testing` | Chat 39 mid — testing phase checkpoint |
| `v-stable-chat39-complete` | Chat 39 complete — testing done, security hardened, ready for Spanish translation |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat36-pre` | Chat 36 — single currency model |
| `v-stable-chat37-homepage-layout` | Chat 37 — homepage layout, date picker, Book Now fixed |
| `v-stable-chat38-pre-spanish` | Chat 38 — completion email, logo on PDFs, currency locked at onboarding |
| `v-stable-chat39-complete` | Chat 39 complete — testing done, security hardened, ready for Spanish translation |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat39-complete
cd ~/camel-customer && git checkout v-stable-chat39-complete
```

---

## What Is Working ✅
- Customer booking flow — homepage, date picker, driver age, Book Now layout correct all screen sizes
- Guest booking flow — draft survives login/signup redirect
- Partner bid submission and management
- Driver job portal
- Admin approval and account management
- Partner approval gate — unapproved partners blocked from portal until approved
- Full EUR / GBP / USD currency support
- Full commission system — adjustable per partner, default 20%, min €10 floor
- Fuel level recording, override, charge/refund calculation
- Fuel refund on completion — Stripe partial refund issued automatically
- Email notifications — all flows (booking confirmed, completion, review reminder)
- Review reminder email — correct URL with `NEXT_PUBLIC_SITE_URL`
- Completion email + PDF attachment
- Completion statement PDF + booking receipt PDF — all with logo
- Customer password reset
- Live status system — 7 checks
- Partner onboarding — 7 steps, mobile responsive, Stripe refresh status working
- Partner billing currency — read-only in profile, admin can override
- Commission invoices — auto-generated monthly, partner download, admin on-demand generate
- Partner terms — single source of truth `lib/portal/partnerTerms.ts` version `2026-06b`
- Stripe payment split — exact commission, Stripe fee borne by Camel
- All financial reporting — admin reports, partner reports, CSV exports
- Admin currency override — from account detail page
- Application-submitted page — status-aware (pending/rejected/guest)
- Mobile layout — all pages fit correctly on mobile
- Footer copyright — single line, no overflow on mobile
- Security — CSP form-action, Stripe Radar, Stripe 2FA, GitHub branch protection, Vercel notifications
- Chat widget — scoped to logged-in user's data only (both customer and partner)

---

## What Needs Building in Chat 40

### 1. Spanish Translation (PRIORITY)
- All user-facing strings in camel-customer and camel-portal
- Language toggle (EN / ES) — remember preference in localStorage
- Do customer site first, then portal

---

## What Still Needs Building (Lower Priority)
- Commission invoice PDF — VAT number + 20% UK VAT once NTUK is VAT registered
- Xero monthly commission endpoint — deferred
- DAC7 EU platform reporting — deferred
- Outreach: set up `e.camel-global.com` subdomain in Resend
- 2FA: Vercel personal (`https://vercel.com/~/security`), GitHub, Supabase, Gmail

---

## Collaborator Note
A collaborator works on `camel-portal` from Windows (`C:/dev/camel-portal`). He built the **Partner Outreach Agent** (`/admin/outreach`). Always `git pull` before starting.

**Note:** `camel-coming-soon` is a git submodule inside `camel-portal`. Always shows as modified in `git status` — ignore it. Use `git add <specific-file>` to avoid submodule conflicts.

---

## Session Log

### Chat 39 (Completed)
**Testing, bug fixes, mobile fixes, security hardening**

1. `lib/portal/partnerTerms.ts` — single source of truth for partner T&Cs
2. `app/partner/signup/page.tsx` — terms import, mobile stepper fix, padding fix
3. `app/partner/terms/page.tsx` — imports from shared lib
4. `app/partner/reports/page.tsx` — Commission Invoices section, month dropdown
5. `app/admin/reports/page.tsx` — invoice month dropdown fix, starts from current month
6. `lib/portal/generateCommissionInvoice.tsx` — date column, cancelled bookings shown, `created_at` fix
7. `app/api/partner/invoices/generate/route.ts` — `created_at` fix
8. `app/api/admin/invoices/route.ts` — `created_at` fix
9. `app/cron/monthly-payout/route.ts` — `created_at` fix
10. `app/api/admin/accounts/[id]/route.ts` — PATCH supports `default_currency`
11. `app/admin/accounts/[id]/page.tsx` — Billing Currency Override section
12. `app/partner/layout.tsx` — approval gate blocks unapproved partners
13. `app/partner/application-submitted/page.tsx` — status-aware messaging
14. `app/partner/dashboard/page.tsx` — mobile full-width cards fix
15. `app/partner/onboarding/page.tsx` — mobile width fix, Stripe refresh status fix
16. `app/components/Footer.tsx` (portal) — single-line copyright, no mobile overflow
17. `app/components/Footer.tsx` (customer) — single-line copyright
18. `next.config.ts` (portal) — `form-action 'self'` CSP directive
19. `next.config.ts` (customer) — `form-action` with Stripe domains
20. `NEXT_PUBLIC_SITE_URL` — set in camel-customer Vercel to fix review email links
21. Stripe Radar rules enabled — highest risk block, CVC block, 3DS request
22. GitHub branch protection — main branch, Repository admin bypass
23. Vercel deployment notifications — email on deployment ready
24. Stable tags: `v-stable-chat39-complete` (both repos)

### Chat 38 (Completed)
**Completion email, PDF logo, currency architecture fix**

### Chat 37 (Completed)
**Homepage layout, date picker, Stripe fee architecture fix**

### Chat 36 (Completed)
**Single currency model**

---

## Useful Commands

```bash
# Always pull before starting
cd ~/camel-portal && git pull origin main
cd ~/camel-customer && git pull origin main

# Portal deploy (specific files — avoid submodule issues)
cd ~/camel-portal && git add path/to/file.tsx && git commit -m "message" && git push origin main

# Customer deploy
cd ~/camel-customer && git add app/path/to/file.tsx && git commit -m "message" && git push origin main

# File trees
find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort
find ~/camel-customer -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Create stable tag
git tag -a v-tag-name -m "description" && git push origin v-tag-name

# Manual cron trigger
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://portal.camel-global.com/api/cron/monthly-payout

# IMPORTANT: camel-coming-soon is a submodule — always shows modified, ignore it.
git add app/path/to/file.tsx && git commit -m "message" && git push origin main
```

---

*Last updated: Chat 39 complete — testing done, mobile fixes, security hardened (CSP, Stripe Radar, GitHub branch protection), partner approval gate, status-aware application page. Next: Spanish translation.*