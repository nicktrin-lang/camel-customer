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
| `lib/i18n/LanguageToggle.tsx` | EN \| ES toggle component — drop into any header. On mobile partner portal this is hidden from the topbar (`hidden lg:flex`) and rendered instead at the top of the sidebar drawer. |
| `lib/i18n/locales/en.json` | English strings — all translated pages. **Flat key-value format** (e.g. `"settings.language.label": "Language"`) — NOT nested objects. |
| `lib/i18n/locales/es.json` | Spanish strings — same flat format. |

### Key Libraries & Files — Customer (`~/camel-customer`)
| File | Purpose |
|------|---------|
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/supabase-customer/server.ts` | Exports `createCustomerServerClient()` and `createCustomerServiceRoleSupabaseClient()` |
| `lib/portal/generateBookingReceiptPDF.tsx` | Booking confirmation receipt PDF |
| `lib/portal/generateCompletionStatementPDF.tsx` | Booking completion statement PDF |
| `lib/i18n/LanguageContext.tsx` | Copied from portal — same implementation |
| `lib/i18n/useTranslation.ts` | Copied from portal — same implementation |
| `lib/i18n/LanguageToggle.tsx` | Copied from portal — same implementation |
| `lib/i18n/locales/en.json` | Customer EN strings — flat key-value format |
| `lib/i18n/locales/es.json` | Customer ES strings — flat key-value format |

---

## i18n Architecture (CRITICAL)

### How it works
- All user-facing strings live in `lib/i18n/locales/en.json` and `lib/i18n/locales/es.json`
- **JSON files are flat key-value pairs** — keys use dot notation (e.g. `"settings.language.label": "Language"`). They are NOT nested objects. Never add nested objects.
- `useTranslation()` hook returns `{ t, locale }` based on current locale
- Language preference stored in `localStorage` key `camel_locale`
- Browser locale auto-detected on first visit: `es*` → Spanish, `en*` → English, anything else → English
- `LanguageProvider` wraps the entire app via `app/ClientRootLayout.tsx` — **both portal and customer**
- `LanguageToggle` component renders EN | ES buttons — active locale highlighted in orange

### Customer site language toggle architecture
- `LanguageProvider` is wired into `app/ClientRootLayout.tsx` in `camel-customer`
- `CompactLanguageToggle` (inline component, tighter `px-2 py-1.5` padding) renders in:
  - **Global header** (all non-homepage pages) — inside `InnerLayout` in `ClientRootLayout.tsx`
  - **Homepage nav** — inline in `app/page.tsx` `CustomerHome` component
- `CompactLanguageToggle` is defined as a local inline function in each file that needs it

### Portal mobile header language toggle architecture (CRITICAL)
- **Partner portal topbar** (`PortalTopbar.tsx`) — `LanguageToggle` wrapped in `hidden lg:flex`. Hidden on mobile.
- **Partner portal sidebar** (`PortalSidebar.tsx`) — language EN/ES buttons rendered at top of drawer, `lg:hidden`. This is the mobile language switcher for the partner portal.
- **Driver layout** (`app/driver/layout.tsx`) — uses `CompactLanguageToggle` (inline component, tighter padding). Auth header has a hamburger on mobile (`md:hidden`) that slides down a dropdown with language buttons, driver name, and logout. Public header (login/signup/reset) shows compact toggle inline.
- **Partner signup page** (`app/partner/signup/page.tsx`) — uses `CompactLanguageToggle` inline in standalone header.
- **Portal homepage** (`app/HomePageContent.tsx`) — desktop shows full nav (LanguageToggle + Driver Login + Partner Login + Become a Partner). Mobile shows CompactLanguageToggle + hamburger with dropdown containing all nav links.

### Partner communication locale (CRITICAL)
- Partners have a `communication_locale` column on `partner_profiles` (TEXT, default 'en', CHECK IN ('en','es'))
- Set via **Settings → Communication Language** section (two big buttons, saves immediately to DB)
- Used by `completeBooking.tsx` to send completion email in partner's language
- Used by `sendApplicationReceivedEmail` in `complete-signup/route.ts` (derived from country field at signup)
- **Admin-triggered emails now also use partner locale** — `update-status/route.ts` and `make-live/route.ts` both look up `communication_locale` from `partner_profiles` before calling email functions. Helper function `getPartnerLocale(db, userId)` handles the lookup with "en" fallback.

### PDF locale behaviour
- `downloadPartnerTermsPDF(locale)` — English-only PDF for "en", bilingual (EN then ES with legal caveat) for "es"
- `downloadOperatingRulesPDF(companyName, locale)` — same pattern
- All partner PDF download buttons pass `locale as "en" | "es"` from `useTranslation()`
- Page content (clause text) also switches between `PARTNER_TERMS` / `PARTNER_TERMS_ES` and `OPERATING_RULES` / `OPERATING_RULES_ES` based on locale
- Commission invoice PDF — **stays English** — NTUK is a UK company
- Customer PDFs (receipt, completion statement) — **stay English** — NTUK is a UK company
- ⚠️ Spanish T&Cs and Operating Rules PDF content need legal review before publishing to real partners

### Customer i18n key structure (flat key-value)
- `common.*` — shared strings (loading, save, cancel, etc.)
- `nav.*` — header nav labels
- `home.*` — homepage booking form + marketing sections
- `footer.*` — footer strings
- `cookie.*` — cookie banner
- `login.*` — login page
- `signup.*` — signup page
- `reset.*` — reset password page
- `bookings.*` — bookings list
- `booking.*` — booking detail page
- `checkout.*` — checkout page
- `account.*` — account page
- `about.*`, `contact.*`, `privacy.*`, `cookies.*`, `terms.*` — static pages
- `sport.*` — sport equipment dropdown options

---

## i18n Translation Status

### Portal

#### ✅ Phase 1 — Partner portal core (Complete)
#### ✅ Phase 2 — Partner portal remaining pages (Complete)
#### ✅ Phase 3 — Driver portal (Complete)
#### ✅ Phase 4 — Partner emails + PDFs (Complete)

| Item | File | Status |
|------|------|--------|
| Partner-facing emails | `lib/email.ts` | ✅ EN/ES |
| Partner T&Cs PDF | `lib/portal/partnerTerms.ts` | ✅ Bilingual PDF (⚠️ legal review needed) |
| Operating rules PDF | `lib/portal/operatingRules.ts` | ✅ Bilingual PDF (⚠️ legal review needed) |
| Completion email to partner | `lib/portal/completeBooking.tsx` | ✅ EN/ES via communication_locale |
| Commission invoice PDF | `lib/portal/generateCommissionInvoice.tsx` | ✅ Stays English (NTUK) |
| Admin approval/rejection/live emails | `update-status/route.ts`, `make-live/route.ts` | ✅ EN/ES via communication_locale |

### Customer

#### ✅ Phase 5 — Customer site (Complete)

| Item | File | Status |
|------|------|--------|
| i18n infrastructure | `lib/i18n/*`, `app/ClientRootLayout.tsx` | ✅ EN/ES |
| Homepage | `app/page.tsx` | ✅ EN/ES |
| Footer | `app/components/Footer.tsx` | ✅ EN/ES |
| Cookie banner | `app/components/CookieBanner.tsx` | ✅ EN/ES |
| Login | `app/login/page.tsx` | ✅ EN/ES |
| Signup | `app/signup/page.tsx` | ✅ EN/ES |
| Reset password | `app/reset-password/page.tsx` | ✅ EN/ES |
| Bookings list | `app/bookings/page.tsx` | ✅ EN/ES |
| Booking detail | `app/bookings/[id]/page.tsx` | ✅ EN/ES |
| Account | `app/account/page.tsx` | ✅ EN/ES |
| Checkout | `app/checkout/[bid_id]/page.tsx` | ✅ EN/ES |
| Contact | `app/contact/page.tsx` | ✅ EN/ES |
| About | `app/about/page.tsx` | ✅ EN only (static content) |
| Privacy / Cookies / Terms | static pages | ✅ EN only (legal docs — NTUK) |
| Customer emails | `lib/email.ts` | ❌ Stays English (NTUK invoicing) |
| Receipt PDF / Completion PDF | customer lib | ❌ Stays English (NTUK invoicing) |

### ❌ Phase 6 — Future languages (Future)
IT, PT, FR, DE — add a new JSON file to both repos, zero code changes needed.

---

## Translation Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Homepage, signup, onboarding, dashboard, sidebar, login, auth pages | ✅ Done |
| **Phase 2** | Account, profile, bookings, requests, reports, fleet, drivers, reviews, settings, suggestions, all legal/info pages, footer | ✅ Done |
| **Phase 3** | Driver portal — login, signup, reset password, jobs | ✅ Done |
| **Phase 4** | Partner emails + bilingual PDFs + partner communication locale + admin email locale | ✅ Done |
| **Phase 5** | Customer site — all pages, footer, cookie banner | ✅ Done |
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
- Used in: `update-status/route.ts` and `make-live/route.ts` via `getPartnerLocale(db, userId)` helper
- `getPartnerLocale(db, userId)` — looks up `partner_profiles.communication_locale`, returns `"en"` as fallback on any error

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
- **Mobile headers fully resolved** — see Mobile header language toggle architecture above

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
| `v-stable-chat42-mobile-headers` | Chat 42 — mobile header fixes: burger menus on driver/homepage/partner portal, language toggle in sidebar, Book Now removed |
| `v-stable-chat42-complete` | Chat 42 complete — mobile headers + admin email locale fix |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat36-pre` | Chat 36 — single currency model |
| `v-stable-chat37-homepage-layout` | Chat 37 — homepage layout, date picker, Book Now fixed |
| `v-stable-chat38-pre-spanish` | Chat 38 — completion email, logo on PDFs, currency locked at onboarding |
| `v-stable-chat39-complete` | Chat 39 complete — testing done, security hardened, ready for Spanish translation |
| `v-stable-chat41-complete` | Chat 41 — no customer changes this chat |
| `v-stable-chat43-phase5-i18n` | Chat 43 — Phase 5 complete: full customer site EN/ES i18n |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat42-complete
cd ~/camel-customer && git checkout v-stable-chat43-phase5-i18n
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
- Mobile layout — all headers fully resolved (burger menus, language toggle in sidebar)
- Footer copyright — single line, no overflow on mobile
- Security — CSP form-action, Stripe Radar, Stripe 2FA, GitHub branch protection, Vercel notifications, all 2FA done
- Chat widget — scoped to logged-in user's data only (both customer and partner)
- **Portal i18n** — LanguageContext, useTranslation, LanguageToggle, EN/ES JSON files (flat key-value format)
- **Partner portal fully translated EN/ES** — all pages including legal, about, contact, footer
- **Driver portal fully translated EN/ES** — login, signup, reset password, jobs
- **Phase 4 complete** — partner emails EN/ES, bilingual T&Cs + operating rules PDFs, partner communication locale preference in settings
- **Admin emails locale** — approval, rejection, live emails now sent in partner's `communication_locale`
- **Book Now removed from partner portal topbar**
- **Portal homepage mobile header** — hamburger with dropdown (Driver Login, Partner Login, Become a Partner)
- **Driver portal mobile header** — hamburger dropdown with language toggle, driver name, logout
- **Phase 5 complete** — full customer site EN/ES i18n: infrastructure, homepage, footer, cookie banner, login, signup, reset password, bookings list, booking detail, account, checkout, contact. Legal docs (privacy, cookies, terms) and customer PDFs stay English (NTUK).

---

## What Needs Building — Next Chat (Chat 44)

### 🔲 Lower priority (deferred)
- Commission invoice PDF — VAT number + 20% UK VAT once NTUK is VAT registered
- Xero monthly commission endpoint
- DAC7 EU platform reporting
- Outreach: set up `e.camel-global.com` subdomain in Resend

### ❌ Phase 6 — Future languages (Future)
IT, PT, FR, DE — add a new JSON file to both `camel-portal` and `camel-customer`, zero code changes needed.

---

## Collaborator Note
A collaborator works on `camel-portal` from Windows (`C:/dev/camel-portal`). He built the **Partner Outreach Agent** (`/admin/outreach`). Always `git pull` before starting.

**Note:** `camel-coming-soon` is a git submodule inside `camel-portal`. Always shows as modified in `git status` — ignore it. Use `git add <specific-file>` to avoid submodule conflicts.

---

## Session Log

### Chat 43 (Completed)
**Phase 5: Customer site i18n — full EN/ES translation**

1. `lib/i18n/LanguageContext.tsx` — created (copied from portal)
2. `lib/i18n/useTranslation.ts` — created (copied from portal)
3. `lib/i18n/LanguageToggle.tsx` — created (copied from portal)
4. `lib/i18n/locales/en.json` — created with all customer strings (flat key-value)
5. `lib/i18n/locales/es.json` — created with full Spanish translations
6. `app/ClientRootLayout.tsx` — wired `LanguageProvider` + `CompactLanguageToggle` into global header; split into `InnerLayout` + outer wrapper
7. `app/page.tsx` — homepage fully translated; `CompactLanguageToggle` added to homepage nav
8. `app/components/Footer.tsx` — translated EN/ES
9. `app/components/CookieBanner.tsx` — translated EN/ES
10. `app/login/page.tsx` — translated EN/ES
11. `app/signup/page.tsx` — translated EN/ES
12. `app/reset-password/page.tsx` — translated EN/ES
13. `app/bookings/page.tsx` — translated EN/ES
14. `app/bookings/[id]/page.tsx` — translated EN/ES
15. `app/account/page.tsx` — translated EN/ES
16. `app/checkout/[bid_id]/page.tsx` — translated EN/ES
17. `app/contact/page.tsx` — translated EN/ES; subject dropdown switches EN/ES
18. `app/about/page.tsx` — unchanged (static content, no UI strings)
19. `app/privacy/page.tsx`, `app/cookies/page.tsx`, `app/terms/page.tsx` — unchanged (legal docs stay English, NTUK)
20. Stable tag: `v-stable-chat43-phase5-i18n` on customer

### Chat 42 (Completed)
**Mobile header fixes + admin email locale**
Stable tags: `v-stable-chat42-mobile-headers`, `v-stable-chat42-complete` on portal

### Chat 41 (Completed)
**Phase 4 complete + driver improvements + partner communication locale**
Stable tag: `v-stable-chat41-complete`

### Chat 40 (Completed)
**i18n Phases 2 & 3 — full partner portal + driver portal translation EN/ES**
Stable tag: `v-stable-chat40-i18n-complete`

### Chat 39 (Completed)
**Testing, bug fixes, mobile fixes, security hardening, i18n Phase 1**

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

*Last updated: Chat 43 complete — Phase 5 customer site i18n EN/ES complete. All pages translated. Legal docs (privacy, cookies, terms) and customer PDFs stay English. Next: Chat 44 — deferred items or Phase 6 future languages.*