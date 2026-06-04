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
- **zsh square bracket paths** — always quote dynamic route paths in git commands: `'app/partner/bookings/[id]/page.tsx'`

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
| `lib/i18n/LanguageContext.tsx` | Language context + provider + localStorage + browser locale detection |
| `lib/i18n/useTranslation.ts` | `t()` hook — dot-notation keys, `{{var}}` interpolation, English fallback |
| `lib/i18n/LanguageToggle.tsx` | EN \| ES toggle component — drop into any header |
| `lib/i18n/locales/en.json` | English strings — all translated pages |
| `lib/i18n/locales/es.json` | Spanish strings — all translated pages |

### Key Libraries & Files — Customer (`~/camel-customer`)
| File | Purpose |
|------|---------|
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/supabase-customer/server.ts` | Exports `createCustomerServerClient()` and `createCustomerServiceRoleSupabaseClient()` |
| `lib/portal/generateBookingReceiptPDF.tsx` | Booking confirmation receipt PDF |
| `lib/portal/generateCompletionStatementPDF.tsx` | Booking completion statement PDF |

---

## i18n Architecture (CRITICAL)

### How it works
- All user-facing strings live in `lib/i18n/locales/en.json` and `lib/i18n/locales/es.json`
- `useTranslation()` hook returns the right string based on current locale
- Language preference stored in `localStorage` key `camel_locale`
- Browser locale auto-detected on first visit: `es*` → Spanish, `en*` → English, anything else → English
- `LanguageProvider` wraps the entire app via `app/ClientRootLayout.tsx`
- `LanguageToggle` component renders EN | ES buttons — active locale highlighted in orange

### Translation file key structure
Keys use dot notation grouped by page/feature:
- `common.*` — shared strings
- `nav.*` — navigation labels
- `home.*` — portal homepage
- `signup.*` — partner signup
- `login.*` — partner login
- `onboarding.*` — partner onboarding
- `dashboard.*` — partner dashboard
- `account.*` — partner account
- `profile.*` — partner profile
- `bookings.*` — partner bookings list + detail
- `requests.*` — partner requests list + detail
- `reports.*` — partner reports
- `fleet.*` — partner fleet
- `drivers.*` — partner drivers
- `reviews.*` — partner reviews
- `settings.*` — partner settings
- `suggestions.*` — partner suggestions
- `terms.*` — partner terms page UI
- `rules.*` — operating rules page UI
- `about.*` — about page
- `privacy.*` — privacy policy page
- `cookies.*` — cookie policy page
- `contact.*` — contact page
- `footer.*` — portal footer
- `driver.*` — all driver portal pages
- `booking.status.*` — booking status labels

### Adding a new language (future)
1. Create `lib/i18n/locales/it.json` (or `pt`, `fr`, `de`)
2. Add the locale code to `LanguageContext.tsx` `Locale` type and `detectLocale()` logic
3. Add button to `LanguageToggle.tsx`
4. No other code changes needed — `useTranslation` falls back to English for any missing key

---

## i18n Translation Status — camel-portal

### ✅ Phase 1 — Partner portal core (Complete)
| Page/Component | File |
|---------------|------|
| Portal homepage | `app/page.tsx` + `app/HomePageContent.tsx` |
| Partner signup (all 5 steps) | `app/partner/signup/page.tsx` |
| Partner onboarding (all 7 steps) | `app/partner/onboarding/page.tsx` |
| Partner dashboard | `app/partner/dashboard/page.tsx` |
| Portal sidebar | `app/components/portal/PortalSidebar.tsx` |
| Portal topbar | `app/components/portal/PortalTopbar.tsx` |
| Partner login + forgot password | `app/partner/login/page.tsx` |
| Application submitted | `app/partner/application-submitted/page.tsx` |
| Reset password | `app/partner/reset-password/page.tsx` |

### ✅ Phase 2 — Partner portal remaining pages (Complete)
| Page/Component | File |
|---------------|------|
| Partner account | `app/partner/account/page.tsx` |
| Partner profile | `app/partner/profile/page.tsx` |
| Partner bookings list | `app/partner/bookings/page.tsx` |
| Partner booking detail | `app/partner/bookings/[id]/page.tsx` |
| Partner requests list | `app/partner/requests/page.tsx` |
| Partner request detail | `app/partner/requests/[id]/page.tsx` |
| Partner reports | `app/partner/reports/page.tsx` |
| Partner fleet | `app/partner/fleet/page.tsx` |
| Partner drivers | `app/partner/drivers/page.tsx` |
| Partner reviews | `app/partner/reviews/page.tsx` |
| Partner settings | `app/partner/settings/page.tsx` |
| Partner suggestions | `app/partner/suggestions/page.tsx` |
| Partner terms page | `app/partner/terms/page.tsx` |
| Partner operating rules | `app/partner/operating-rules/page.tsx` |
| Partner about | `app/partner/about/page.tsx` |
| Partner contact | `app/partner/contact/page.tsx` |
| Partner privacy | `app/partner/privacy/page.tsx` |
| Partner cookies | `app/partner/cookies/page.tsx` |
| Portal footer | `app/components/Footer.tsx` |

### ✅ Phase 3 — Driver portal (Complete)
| Page/Component | File |
|---------------|------|
| Driver login + forgot password | `app/driver/login/page.tsx` |
| Driver signup | `app/driver/signup/page.tsx` |
| Driver reset password | `app/driver/reset-password/page.tsx` |
| Driver jobs | `app/driver/jobs/page.tsx` |

### ❌ Phase 4 — Partner emails + PDFs (Next priority)
| Item | File | Notes |
|------|------|-------|
| Partner-facing emails | `lib/email.ts` | All partner notification content |
| Partner T&Cs PDF content | `lib/portal/partnerTerms.ts` | Legal — review Spanish before publishing |
| Operating rules PDF content | `lib/portal/operatingRules.ts` | Legal — review Spanish before publishing |
| Commission invoice PDF | `lib/portal/generateCommissionInvoice.tsx` | **Keep English** — NTUK is a UK company |

### ❌ Phase 5 — Customer site (Pending)
All customer-facing pages, emails, booking receipt PDF, completion statement PDF.

### ❌ Phase 6 — Future languages (Future)
IT, PT, FR, DE — add a new JSON file, zero code changes needed.

---

## Translation Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1 — Partner portal core** | Homepage, signup, onboarding, dashboard, sidebar, login, auth pages | ✅ Done |
| **Phase 2 — Partner portal remaining** | Account, profile, bookings, requests, reports, fleet, drivers, reviews, settings, suggestions, all legal/info pages, footer | ✅ Done |
| **Phase 3 — Driver portal** | Login, signup, reset password, jobs | ✅ Done |
| **Phase 4 — Partner emails + PDFs** | `lib/email.ts`, `partnerTerms.ts`, `operatingRules.ts` | 🔴 Next |
| **Phase 5 — Customer site** | All customer pages, emails, PDFs | 🔲 Pending |
| **Phase 6 — Future languages** | IT, PT, FR, DE | 🔲 Future |

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
- **Commission invoices stay in English** — NTUK is a UK company

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
- **2FA:** Vercel, GitHub, Supabase, Gmail — all done ✅

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
| `v-stable-chat39-pre-i18n` | Chat 39 — stable before i18n infrastructure added |
| `v-stable-chat39-i18n-partner-signup-onboarding` | Chat 39 — partner portal i18n Phase 1 complete |
| `v-stable-chat40-i18n-complete` | Chat 40 — full partner portal + driver portal i18n EN/ES complete |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat36-pre` | Chat 36 — single currency model |
| `v-stable-chat37-homepage-layout` | Chat 37 — homepage layout, date picker, Book Now fixed |
| `v-stable-chat38-pre-spanish` | Chat 38 — completion email, logo on PDFs, currency locked at onboarding |
| `v-stable-chat39-complete` | Chat 39 complete — testing done, security hardened, ready for Spanish translation |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat40-i18n-complete
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
- Security — CSP form-action, Stripe Radar, Stripe 2FA, GitHub branch protection, Vercel notifications, all 2FA done
- Chat widget — scoped to logged-in user's data only (both customer and partner)
- **i18n infrastructure** — LanguageContext, useTranslation, LanguageToggle, EN/ES JSON files
- **Partner portal fully translated EN/ES** — all pages including legal, about, contact, footer
- **Driver portal fully translated EN/ES** — login, signup, reset password, jobs

---

## What Needs Building — Next Chat (Chat 41)

### 🔴 Priority 1 — Phase 4: Partner emails (EN/ES)
Translate all partner-facing email content in `lib/email.ts`. This is the main remaining i18n gap — partners in Spain receive English emails. Approach: add a `locale` parameter to each email send function and render strings conditionally or from a lookup object.

Key emails to translate:
- Application received confirmation
- Account approved notification
- New booking confirmed (to partner)
- Booking cancelled (to partner)
- Commission invoice email
- Completion notification (to partner)
- Review reminder (to partner)

### 🔴 Priority 2 — Phase 4: Legal PDF content (EN/ES)
- `lib/portal/partnerTerms.ts` — Spanish T&Cs for the downloadable PDF. **Requires legal review before publishing.** The page UI is already translated; only the PDF download content needs Spanish.
- `lib/portal/operatingRules.ts` — same situation. Page UI translated, PDF content still English only.

### 🟡 Priority 3 — Phase 5: Customer site translation
All customer-facing pages in `camel-customer`. Start by running the file tree and identifying all `app/` pages. Key pages:
- Homepage (`app/page.tsx`)
- Book (`app/book/page.tsx`)
- Bookings list + detail (`app/bookings/`)
- Account (`app/account/page.tsx`)
- Login / signup / reset password
- Checkout (`app/checkout/`)
- About / contact / privacy / cookies / terms

### 🟡 Priority 4 — Customer emails + PDFs
- `lib/email.ts` in `camel-customer` — customer-facing email content
- `lib/portal/generateBookingReceiptPDF.tsx` — booking receipt (keep EN for NTUK invoicing)
- `lib/portal/generateCompletionStatementPDF.tsx` — completion statement

### 🔲 Lower priority (deferred)
- Commission invoice PDF — VAT number + 20% UK VAT once NTUK is VAT registered
- Xero monthly commission endpoint
- DAC7 EU platform reporting
- Outreach: set up `e.camel-global.com` subdomain in Resend

---

## Collaborator Note
A collaborator works on `camel-portal` from Windows (`C:/dev/camel-portal`). He built the **Partner Outreach Agent** (`/admin/outreach`). Always `git pull` before starting.

**Note:** `camel-coming-soon` is a git submodule inside `camel-portal`. Always shows as modified in `git status` — ignore it. Use `git add <specific-file>` to avoid submodule conflicts.

---

## Session Log

### Chat 40 (Completed)
**i18n Phases 2 & 3 — full partner portal + driver portal translation EN/ES**

Pages translated:
1. `app/partner/account/page.tsx`
2. `app/partner/profile/page.tsx`
3. `app/partner/bookings/page.tsx`
4. `app/partner/bookings/[id]/page.tsx`
5. `app/partner/requests/page.tsx`
6. `app/partner/requests/[id]/page.tsx`
7. `app/partner/reports/page.tsx`
8. `app/partner/fleet/page.tsx`
9. `app/partner/drivers/page.tsx`
10. `app/partner/reviews/page.tsx`
11. `app/partner/settings/page.tsx`
12. `app/partner/suggestions/page.tsx`
13. `app/partner/terms/page.tsx`
14. `app/partner/operating-rules/page.tsx`
15. `app/partner/about/page.tsx`
16. `app/partner/contact/page.tsx`
17. `app/partner/privacy/page.tsx`
18. `app/partner/cookies/page.tsx`
19. `app/components/Footer.tsx` (portal — PortalFooter + DriverFooter translated; CustomerFooter stays EN for Phase 5)
20. `app/driver/login/page.tsx`
21. `app/driver/signup/page.tsx`
22. `app/driver/reset-password/page.tsx`
23. `app/driver/jobs/page.tsx`
24. `lib/i18n/locales/en.json` — all new keys added (account, profile, bookings, requests, reports, fleet, drivers, reviews, settings, suggestions, terms, rules, about, privacy, cookies, contact, footer, driver)
25. `lib/i18n/locales/es.json` — all Spanish translations added
26. Stable tag: `v-stable-chat40-i18n-complete`

Note: `lib/email.ts` partner email content, `partnerTerms.ts` PDF content, and `operatingRules.ts` PDF content remain English-only — deferred to Phase 4 (Chat 41).

### Chat 39 (Completed)
**Testing, bug fixes, mobile fixes, security hardening, i18n Phase 1**

1. `lib/portal/partnerTerms.ts` — single source of truth for partner T&Cs
2–24. Various bug fixes, security hardening, mobile layout fixes
25–41. i18n infrastructure + Phase 1: homepage, signup, onboarding, dashboard, sidebar, topbar, login, application-submitted, reset-password
42. Stable tags: `v-stable-chat39-pre-i18n`, `v-stable-chat39-i18n-partner-signup-onboarding`

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
# IMPORTANT: quote [id] paths in zsh
cd ~/camel-portal && git add path/to/file.tsx 'app/partner/bookings/[id]/page.tsx' && git commit -m "message" && git push origin main

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

*Last updated: Chat 40 complete — i18n Phases 1, 2 & 3 done. Entire partner portal and driver portal fully translated EN/ES. Next: Phase 4 — partner email translations in `lib/email.ts`, then legal PDF content in `partnerTerms.ts` and `operatingRules.ts`, then Phase 5 customer site.*