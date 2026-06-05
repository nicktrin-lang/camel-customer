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
| `lib/portal/operatingRules.ts` | Shared OPERATING_RULES + OPERATING_RULES_ES data + downloadOperatingRulesPDF(companyName, locale). Includes section 3b — mileage limits & security deposits. Bilingual PDF when locale="es". |
| `lib/portal/completeBooking.tsx` | Shared completion logic — Stripe fuel refund, payout_status=ready, generates + emails completion statement PDF to customer. Sends rich completion email with fuel summary + payout summary (commission breakdown) to partner in their communication_locale. Admin email includes full commission breakdown. Uses direct REST fetch to portal Supabase to query `customer_requests`. Logo read from disk via `fs.readFileSync`. |
| `lib/portal/generateCommissionInvoice.tsx` | Commission invoice PDF generator — uses `created_at` from `partner_bookings` as the date column (pickup_at does not exist on that table). Shows all bookings including zero-commission cancelled ones. |
| `lib/portal/partnerTerms.ts` | **Single source of truth** for partner T&Cs — `PARTNER_TERMS`, `PARTNER_TERMS_ES`, `TERMS_VERSION`, `TERMS_EFFECTIVE`, `downloadPartnerTermsPDF(locale)`. Both `signup/page.tsx` and `terms/page.tsx` import from here. Bilingual PDF when locale="es". Never duplicate terms content. |
| `lib/rateLimit.ts` | In-memory rate limiter — 3 req / 15 min per IP |
| `lib/hcaptcha.ts` | Server-side hCaptcha token verification |
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `lib/email.ts` | Resend email sender — all notification helpers. Supports `attachments` array (base64). Partner-facing emails (`sendApplicationReceivedEmail`, `sendApprovalEmail`, `sendRejectionEmail`, `sendAccountLiveEmail`) accept optional `locale: "en" \| "es"` param (default "en"). Customer emails stay English only. `sendReviewReminderEmail` links to `${NEXT_PUBLIC_SITE_URL}/bookings/${requestId}#review`. |
| `lib/i18n/LanguageContext.tsx` | Language context + provider + localStorage + browser locale detection |
| `lib/i18n/useTranslation.ts` | `t()` hook — dot-notation keys, `{{var}}` interpolation, English fallback. Returns `{ t, locale }`. |
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
- `useTranslation()` hook returns `{ t, locale }` based on current locale
- Language preference stored in `localStorage` key `camel_locale`
- Browser locale auto-detected on first visit: `es*` → Spanish, `en*` → English, anything else → English
- `LanguageProvider` wraps the entire app via `app/ClientRootLayout.tsx`
- `LanguageToggle` component renders EN | ES buttons — active locale highlighted in orange

### Partner communication locale (CRITICAL)
- Partners have a `communication_locale` column on `partner_profiles` (TEXT, default 'en', CHECK IN ('en','es'))
- Set via **Settings → Communication Language** section (two big buttons, saves immediately to DB)
- Used by `completeBooking.tsx` to send completion email in partner's language
- Used by `sendApplicationReceivedEmail` in `complete-signup/route.ts` (derived from country field at signup)
- Admin-triggered emails (approval, rejection, live) currently default to English — to send in partner's locale, read `communication_locale` from DB before calling those email functions

### PDF locale behaviour
- `downloadPartnerTermsPDF(locale)` — English-only PDF for "en", bilingual (EN then ES with legal caveat) for "es"
- `downloadOperatingRulesPDF(companyName, locale)` — same pattern
- All partner PDF download buttons pass `locale as "en" | "es"` from `useTranslation()`
- Page content (clause text) also switches between `PARTNER_TERMS` / `PARTNER_TERMS_ES` and `OPERATING_RULES` / `OPERATING_RULES_ES` based on locale
- Commission invoice PDF — **stays English** — NTUK is a UK company
- ⚠️ Spanish T&Cs and Operating Rules PDF content need legal review before publishing to real partners

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
- `settings.*` — partner settings (includes `settings.language.*` for communication locale UI)
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

---

## i18n Translation Status — camel-portal

### ✅ Phase 1 — Partner portal core (Complete)
### ✅ Phase 2 — Partner portal remaining pages (Complete)
### ✅ Phase 3 — Driver portal (Complete)
### ✅ Phase 4 — Partner emails + PDFs (Complete)

| Item | File | Status |
|------|------|--------|
| Partner-facing emails | `lib/email.ts` | ✅ EN/ES |
| Partner T&Cs PDF | `lib/portal/partnerTerms.ts` | ✅ Bilingual PDF (⚠️ legal review needed) |
| Operating rules PDF | `lib/portal/operatingRules.ts` | ✅ Bilingual PDF (⚠️ legal review needed) |
| Completion email to partner | `lib/portal/completeBooking.tsx` | ✅ EN/ES via communication_locale |
| Commission invoice PDF | `lib/portal/generateCommissionInvoice.tsx` | ✅ Stays English (NTUK) |

### ❌ Phase 5 — Customer site (Next priority)
All customer-facing pages in `camel-customer`. Zero i18n infrastructure exists yet.

### ❌ Phase 6 — Future languages (Future)
IT, PT, FR, DE — add a new JSON file, zero code changes needed.

---

## Translation Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Homepage, signup, onboarding, dashboard, sidebar, login, auth pages | ✅ Done |
| **Phase 2** | Account, profile, bookings, requests, reports, fleet, drivers, reviews, settings, suggestions, all legal/info pages, footer | ✅ Done |
| **Phase 3** | Driver portal — login, signup, reset password, jobs | ✅ Done |
| **Phase 4** | Partner emails + bilingual PDFs + partner communication locale | ✅ Done |
| **Phase 5** | Customer site — all pages, emails, PDFs | 🔴 Next |
| **Phase 6** | IT, PT, FR, DE | 🔲 Future |

---

## CRITICAL: DB Client Rules
**One Supabase project** — both portal and customer data live in the same project (`guhcavvpuveiovspzxmg.supabase.co`).

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_CUSTOMER_SUPABASE_URL` point to the same project
- `SUPABASE_SERVICE_ROLE_KEY` and `CUSTOMER_SUPABASE_SERVICE_ROLE_KEY` are the same key
- `completeBooking.tsx` uses a direct REST fetch with `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to query `customer_requests`
- `customer_requests` table has RLS enabled with a permissive policy (`USING (true)`)

---

## Completion Flow (CRITICAL)
1. `app/api/test-booking/bookings/[id]/update/route.ts` (camel-customer) sets `booking_status = completed`
2. Calls `POST /api/internal/complete-booking` on the portal with `CRON_SECRET`
3. `app/api/internal/complete-booking/route.ts` (camel-portal) validates secret and calls `completeBooking()`
4. `completeBooking()` issues Stripe fuel refund, sends customer + partner + admin emails with PDF
5. Partner email language is determined by `partner_profiles.communication_locale`

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

## Partner Communication Locale Architecture (CRITICAL)
- Column: `partner_profiles.communication_locale` TEXT NOT NULL DEFAULT 'en' CHECK IN ('en','es')
- Set by partner in: `app/partner/settings/page.tsx` → "Communication Language" section
- Auto-detected at signup: `complete-signup/route.ts` derives locale from country field (Spain → 'es')
- Used in: `completeBooking.tsx` (reads `communication_locale` from partner_profiles)
- Admin-triggered emails still default English — future improvement: look up locale before sending

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
- **⚠️ KNOWN ISSUE — Mobile header language toggle overflow:** On mobile, all portal headers (partner, driver, public pages) the EN/ES language toggle causes header overflow. Needs a mobile-friendly solution in Chat 42 — options: hamburger menu, collapsed toggle, or icon-only on mobile. Affects `app/driver/layout.tsx`, `app/components/portal/PortalTopbar.tsx`, `app/partner/signup/page.tsx`, and any page with a standalone header.

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
| `v-stable-chat41-complete` | Chat 41 — Phase 4 complete: partner emails EN/ES, bilingual PDFs, partner communication locale, completion email payout summary, driver job filter cards |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat36-pre` | Chat 36 — single currency model |
| `v-stable-chat37-homepage-layout` | Chat 37 — homepage layout, date picker, Book Now fixed |
| `v-stable-chat38-pre-spanish` | Chat 38 — completion email, logo on PDFs, currency locked at onboarding |
| `v-stable-chat39-complete` | Chat 39 complete — testing done, security hardened, ready for Spanish translation |
| `v-stable-chat41-complete` | Chat 41 — no customer changes this chat |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat41-complete
cd ~/camel-customer && git checkout v-stable-chat41-complete
```

---

## What Is Working ✅
- Customer booking flow — homepage, date picker, driver age, Book Now layout correct all screen sizes
- Guest booking flow — draft survives login/signup redirect
- Partner bid submission and management
- Driver job portal — fully translated EN/ES, language toggle in header, clickable stat cards filter jobs by category
- Admin approval and account management
- Partner approval gate — unapproved partners blocked from portal until approved
- Full EUR / GBP / USD currency support
- Full commission system — adjustable per partner, default 20%, min €10 floor
- Fuel level recording, override, charge/refund calculation
- Fuel refund on completion — Stripe partial refund issued automatically
- Email notifications — all flows (booking confirmed, completion, review reminder)
- Review reminder email — correct URL with `NEXT_PUBLIC_SITE_URL`
- Completion email + PDF attachment (customer)
- Completion email to partner — EN/ES, includes fuel summary + payout summary with commission breakdown
- Admin completion email — includes car hire price, commission, partner net payout, final amount
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
- Mobile layout — all pages fit correctly on mobile (⚠️ except language toggle in headers — see Known Issues)
- Footer copyright — single line, no overflow on mobile
- Security — CSP form-action, Stripe Radar, Stripe 2FA, GitHub branch protection, Vercel notifications, all 2FA done
- Chat widget — scoped to logged-in user's data only (both customer and partner)
- **i18n infrastructure** — LanguageContext, useTranslation (returns `{ t, locale }`), LanguageToggle, EN/ES JSON files
- **Partner portal fully translated EN/ES** — all pages including legal, about, contact, footer
- **Driver portal fully translated EN/ES** — login, signup, reset password, jobs
- **Phase 4 complete** — partner emails EN/ES, bilingual T&Cs + operating rules PDFs, partner communication locale preference in settings
- **Terms and operating rules pages** — render clause content in correct language (PARTNER_TERMS_ES / OPERATING_RULES_ES)

---

## What Needs Building — Next Chat (Chat 42)

### 🔴 Priority 1 — Mobile header language toggle fix
All portal headers overflow on mobile when the EN/ES toggle is included. Needs a clean mobile solution. Files affected:
- `app/driver/layout.tsx` — driver header (authenticated + public)
- `app/components/portal/PortalTopbar.tsx` — partner portal topbar
- `app/partner/signup/page.tsx` — signup page standalone header
- Any other page with a standalone header

**Options to consider:**
- On mobile (`sm:hidden` / `md:flex`): hide toggle from header, add it to a hamburger/slide-out menu
- Icon-only toggle on mobile (just flag emoji, no text)
- Move toggle into a dropdown alongside logout
- Sticky bottom bar on mobile with language toggle

### 🟡 Priority 2 — Phase 5: Customer site i18n
The customer site (`camel-customer`) has zero i18n infrastructure. Full build needed.

**Step 1 — Infrastructure** (do first, everything else depends on it):
- Copy `LanguageContext.tsx`, `useTranslation.ts`, `LanguageToggle.tsx` into `camel-customer/lib/i18n/`
- Create `camel-customer/lib/i18n/locales/en.json` and `es.json`
- Wire `LanguageProvider` into `camel-customer/app/ClientRootLayout.tsx`
- Add `LanguageToggle` to customer site header/nav

**Step 2 — Pages** (priority order):
- Homepage (`app/page.tsx`)
- Book (`app/book/page.tsx`)
- Login / Signup / Reset password
- Bookings list + detail (`app/bookings/`)
- Checkout (`app/checkout/[bid_id]/page.tsx`)
- Account (`app/account/page.tsx`)
- Footer (`app/components/Footer.tsx`)
- Cookie banner (`app/components/CookieBanner.tsx`)
- About / Contact / Privacy / Cookies / Terms

**Step 3 — Customer emails**
- `lib/email.ts` in `camel-customer` — customer-facing email content EN/ES
- Customer locale detection: derive from browser/account preference

**Step 4 — PDFs**
- `generateBookingReceiptPDF.tsx` — likely stays English (NTUK invoicing)
- `generateCompletionStatementPDF.tsx` — likely stays English (NTUK invoicing)

### 🟡 Priority 3 — Admin emails locale
Currently admin-triggered partner emails (approval, rejection, account live) always send in English because the admin routes don't look up `communication_locale`. Fix: read `communication_locale` from `partner_profiles` before calling `sendApprovalEmail`, `sendRejectionEmail`, `sendAccountLiveEmail` in:
- `app/api/admin/applications/update-status/route.ts`
- `app/api/admin/applications/make-live/route.ts`

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

### Chat 41 (Completed)
**Phase 4 complete + driver improvements + partner communication locale**

1. `lib/email.ts` — partner emails EN/ES (`sendApplicationReceivedEmail`, `sendApprovalEmail`, `sendRejectionEmail`, `sendAccountLiveEmail` all accept `locale` param, default "en")
2. `lib/portal/partnerTerms.ts` — added `PARTNER_TERMS_ES`, `downloadPartnerTermsPDF(locale)` generates bilingual PDF for ES
3. `lib/portal/operatingRules.ts` — added `OPERATING_RULES_ES`, `downloadOperatingRulesPDF(companyName, locale)` generates bilingual PDF for ES
4. `app/partner/signup/page.tsx` — `downloadPartnerTermsPDF` onClick now passes locale
5. `app/api/partner/complete-signup/route.ts` — derives locale from country at signup, passes to `sendApplicationReceivedEmail`
6. `app/partner/terms/page.tsx` — renders `PARTNER_TERMS_ES` when locale is "es", passes locale to PDF download
7. `app/partner/operating-rules/page.tsx` — renders `OPERATING_RULES_ES` when locale is "es", passes locale to PDF download
8. `app/partner/account/page.tsx` — renders `OPERATING_RULES_ES` when locale is "es", passes locale to PDF download
9. `app/driver/layout.tsx` — added `LanguageToggle` to both public and authenticated driver headers
10. SQL migration: `ALTER TABLE partner_profiles ADD COLUMN IF NOT EXISTS communication_locale TEXT NOT NULL DEFAULT 'en' CHECK (communication_locale IN ('en', 'es'))`
11. `app/partner/settings/page.tsx` — added "Communication Language" section with EN/ES buttons, saves to `partner_profiles.communication_locale`
12. `lib/portal/completeBooking.tsx` — reads `communication_locale` from partner_profiles, calculates commission, sends partner completion email in correct locale with payout summary, admin email now includes commission breakdown
13. `app/driver/jobs/page.tsx` — stat cards (Awaiting Delivery, On Hire, Completed) are now clickable filter buttons; clicking filters the job list, clicking again clears
14. i18n keys added: `settings.language.*` in both en.json and es.json
15. Stable tags: `v-stable-chat41-complete` on both repos

### Chat 40 (Completed)
**i18n Phases 2 & 3 — full partner portal + driver portal translation EN/ES**
Stable tag: `v-stable-chat40-i18n-complete`

### Chat 39 (Completed)
**Testing, bug fixes, mobile fixes, security hardening, i18n Phase 1**
Stable tags: `v-stable-chat39-pre-i18n`, `v-stable-chat39-i18n-partner-signup-onboarding`

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

*Last updated: Chat 41 complete — Phase 4 i18n done (partner emails, bilingual PDFs, partner communication locale). Driver job filter cards added. Mobile header language toggle overflow is a known issue to fix in Chat 42. Next: fix mobile headers, then Phase 5 customer site i18n.*