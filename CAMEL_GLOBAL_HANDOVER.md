# Camel Global — Project Handover Document

Always paste this document at the start of every new conversation.
Update it at the end of each session before the chat fills up.


## Working Rules

Always paste the current file before Claude rewrites it. Claude works from what you paste, not from memory.
Always give Claude the full file tree at the start of a new chat:

Portal: find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort
Customer: find ~/camel-customer -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort


Before any rewrite, Claude will tell you which files to paste, or give you a command to cat them.
Always ask Claude to check the actual file before rewriting — never assume the artifact is current.
Always provide the git push command at the end of every change.
Claude must always write full files — no partial diffs, no "change X to Y" instructions.
When rebranding/restyling, never touch API call parameters or business logic — visual classes only.
ChatWidget.tsx is NOT identical in both repos — portal has partner-focused welcome message, customer has booking-focused welcome message. Update separately.
Footer.tsx exists in both repos but they are different — portal has PortalFooter/DriverFooter/CustomerFooter, customer has CustomerFooter only. Update separately.
Always git pull before starting any session — collaborator may have pushed.
zsh square bracket paths — always quote dynamic route paths in git commands: 'app/partner/bookings/[id]/page.tsx'
JSON i18n files — when adding new keys, always copy the full artifact content to disk. Never assume the artifact was saved automatically.
Portal email.ts is large — never replace it with a partial file. Always restore from git if accidentally overwritten: git show <commit>:lib/email.ts > lib/email.ts
**Always tell Claude which sed commands failed — sed on disk is the only reliable way to make small changes to deployed files.**
**When making changes with sed, always verify with grep afterwards before committing.**
**Always label artifacts with the destination file path so the user knows where to copy them.**


## Project Overview

Name: Camel Global
Legal entity: NTUK Ltd, trading as Camel Global
Company number: 08765474
Registered address: Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN
Type: Meet & greet car hire platform (Uber-style for car hire)
Stack: Next.js 16, Supabase, Vercel, GitHub, Stripe Connect
Launching in Spain first, USD support ready for future US rollout

## Repos
| Repo | Purpose | Local path |
|---|---|---|
| nicktrin-lang/camel-portal | Partner + Admin + Driver portal | ~/camel-portal |
| nicktrin-lang/camel-customer | Customer site | ~/camel-customer |

## Domains
| Domain | Project | Repo | Purpose |
|---|---|---|---|
| portal.camel-global.com | camel-portal-live | camel-portal | Portal production |
| test-portal.camel-global.com | camel-portal-live | camel-portal | Portal staging |
| camel-global.com / www.camel-global.com | camel-customer-live | camel-customer | Customer production |
| test.camel-global.com | camel-customer-live | camel-customer | Customer staging |

## Deploy Commands
```bash
# Portal
cd ~/camel-portal && git add <file> && git commit -m "message" && git push origin main

# Customer
cd ~/camel-customer && git add <file> && git commit -m "message" && git push origin main
```

## Portals
| Portal | Path | Users |
|---|---|---|
| Customer | camel-global.com/ | End customers |
| Partner | portal.camel-global.com/partner | Car hire companies |
| Driver | portal.camel-global.com/driver | Delivery drivers |
| Admin | portal.camel-global.com/admin | Camel Global staff |

## Tech Architecture
### Key Libraries & Files — Portal (~/camel-portal)
| File | Purpose |
|---|---|
| lib/supabase/browser.ts | Supabase browser client (partner/admin) |
| lib/supabase/server.ts | Supabase server client — exports createRouteHandlerSupabaseClient() and createServiceRoleSupabaseClient() |
| lib/cities.ts | Shared city list for Photon search bias |
| lib/portal/calculateFuelCharge.ts | Fuel charge calculation logic |
| lib/portal/calculateCommission.ts | Commission — 20% of hire price, min €10 floor |
| lib/portal/syncBookingStatuses.ts | Booking status sync logic |
| lib/portal/refreshPartnerLiveStatus.ts | Core live status — checks all 7 requirements |
| lib/portal/triggerPartnerLiveRefresh.ts | Triggers the live status refresh |
| lib/portal/operatingRules.ts | Shared OPERATING_RULES + OPERATING_RULES_ES data + downloadOperatingRulesPDF(companyName, locale). Includes section 3b — mileage limits & security deposits. Bilingual PDF when locale="es". |
| lib/portal/completeBooking.tsx | Shared completion logic — Stripe fuel refund, payout_status=ready, generates + emails completion statement PDF to customer. Sends rich completion email with fuel summary + payout summary (commission breakdown) to partner in their communication_locale. Customer email now sent in customer's communication_locale (EN/ES). Admin email includes full commission breakdown + customer locale used. Uses direct REST fetch to portal Supabase to query customer_requests. Logo read from disk via fs.readFileSync. |
| lib/portal/generateCommissionInvoice.tsx | Commission invoice PDF generator — uses created_at from partner_bookings as the date column (pickup_at does not exist on that table). Shows all bookings including zero-commission cancelled ones. |
| lib/portal/partnerTerms.ts | Single source of truth for partner T&Cs — PARTNER_TERMS, PARTNER_TERMS_ES, TERMS_VERSION, TERMS_EFFECTIVE, downloadPartnerTermsPDF(locale). Both signup/page.tsx and terms/page.tsx import from here. Bilingual PDF when locale="es". Never duplicate terms content. |
| lib/rateLimit.ts | In-memory rate limiter — 3 req / 15 min per IP |
| lib/hcaptcha.ts | Server-side hCaptcha token verification |
| lib/currency.ts | All currency utilities — EUR, GBP, USD formatting + conversion |
| lib/useCurrency.ts | React hook — currency state, live rates, fmt helpers |
| lib/email.ts | Resend email sender — all notification helpers. Supports attachments array (base64). Supports optional `from` override and `headers` params (both optional, existing calls unaffected). Partner-facing emails accept optional locale: "en" \| "es" param (default "en"). sendReviewReminderEmail accepts 4th param locale. sendCustomerBidReceivedEmail accepts 3rd param locale. WARNING: this file is large — never replace with a partial. Restore from git if accidentally overwritten. |
| lib/i18n/LanguageContext.tsx | Language context + provider + localStorage + browser locale detection. Initialises as "en" then sets real locale in useEffect on mount. |
| lib/i18n/useTranslation.ts | t() hook — dot-notation keys, {{var}} interpolation, English fallback. Returns { t, locale }. |
| lib/i18n/LanguageToggle.tsx | EN \| ES toggle component — drop into any header. On mobile partner portal this is hidden from the topbar (hidden lg:flex) and rendered instead at the top of the sidebar drawer. |
| lib/i18n/locales/en.json | English strings — all translated pages. Flat key-value format (e.g. "settings.language.label": "Language") — NOT nested objects. |
| lib/i18n/locales/es.json | Spanish strings — same flat format. |

### Key Libraries & Files — Customer (~/camel-customer)
| File | Purpose |
|---|---|
| lib/supabase-customer/browser.ts | Supabase browser client (customers) |
| lib/supabase-customer/server.ts | Exports createCustomerServerClient() and createCustomerServiceRoleSupabaseClient() |
| lib/portal/generateBookingReceiptPDF.tsx | Booking confirmation receipt PDF + email. sendBookingReceiptEmail accepts locale param — email body EN/ES, PDF stays English. |
| lib/portal/generateCompletionStatementPDF.tsx | Booking completion statement PDF |
| lib/i18n/LanguageContext.tsx | Copied from portal — same implementation |
| lib/i18n/useTranslation.ts | Copied from portal — same implementation |
| lib/i18n/LanguageToggle.tsx | Copied from portal — same implementation |
| lib/i18n/locales/en.json | Customer EN strings — flat key-value format. Includes nav.signUp, home.fuel.empty and all fuel label updates. |
| lib/i18n/locales/es.json | Customer ES strings — flat key-value format. Same keys as EN. |
| lib/email.ts | Customer email sender — brandEmail() pattern, EN/ES for all 3 customer emails. sendCustomerBidReceivedEmail(to, jobNumber, locale), sendCustomerBookingCompletedEmail(to, jobNumber, locale), sendReviewReminderEmail(to, jobNumber, requestId, locale). PDFs stay English (NTUK). |
| app/ClientRootLayout.tsx | Global layout — LanguageProvider wraps InnerLayout. InnerLayout calls useLanguage() and passes locale to ChatWidget via key={locale} to force remount on language change. |
| app/page.tsx | Customer homepage — has its own inline nav (not ClientRootLayout header). Auth-aware: loads session on mount, shows burger menu on mobile with language toggle + logged-in/out links. Desktop nav also auth-aware. |
| app/api/webhooks/stripe/route.ts | Stripe webhook — handles payment_intent.succeeded. Looks up both customer and partner locale, sends all emails in correct language. Passes locale to sendBookingReceiptEmail. |
| app/api/test-booking/customer-profile/route.ts | GET + POST. GET reads full_name, phone, communication_locale. POST upserts including optional communication_locale. Uses onConflict: "user_id" and selective field updates. |
| app/api/chat/route.ts | Customer chat API — reads locale from request body, passes to system prompt so AI replies in correct language. |

## Chat Widget Architecture (CRITICAL)
### Overview

ChatWidget.tsx exists in both repos but is NOT identical — portal has partner-focused welcome message, customer has booking-focused welcome message
Both accept a locale prop ("en" | "es") and use an internal STRINGS object for all UI text
locale is passed from ClientRootLayout via useLanguage() in both repos
Both ClientRootLayout files use key={locale} on ChatWidget to force remount when language changes
localeRef inside ChatWidget ensures the send closure always sends the current locale to the API (fixes stale closure bug)

### Locale flow

LanguageProvider initialises as "en", then reads localStorage in useEffect and updates
key={locale} on ChatWidget remounts the widget when locale changes
localeRef is updated via useEffect whenever locale prop changes
Every message sent includes locale: localeRef.current in the request body
API route reads body?.locale, defaults to "en" if missing
System prompt starts with CRITICAL: You must respond ONLY in ${locale === "es" ? "Spanish" : "English"}

### Portal ClientRootLayout.tsx structure (CRITICAL)

LanguageProvider wraps PortalInner
PortalInner calls useLanguage() — must be inside LanguageProvider
ChatWidget rendered inside PortalInner with key={locale} locale={locale as "en" | "es"}

### Customer ClientRootLayout.tsx structure (CRITICAL)

LanguageProvider wraps InnerLayout
InnerLayout calls useLanguage() — must be inside LanguageProvider
ChatWidget rendered inside InnerLayout with key={locale} locale={locale as "en" | "es"}

⚠️ Never use useLanguage() outside LanguageProvider
This was the root cause of the portal chat widget always showing English — useLanguage() was called at the top level of ClientRootLayout before being moved inside PortalInner.

## Email Architecture (CRITICAL)
Rule: Notification emails = customer's language. PDF attachments = always English (NTUK legal documents).

### All customer-facing emails and their locale source:
| Email | Sent from | Locale source | File |
|---|---|---|---|
| Bid received | camel-portal app/api/partner/bids/route.ts | customer_requests.customer_user_id → customer_profiles.communication_locale | Portal lib/email.ts sendCustomerBidReceivedEmail |
| Booking confirmed (notification) | camel-customer app/api/webhooks/stripe/route.ts | customer_requests.customer_user_id → customer_profiles.communication_locale | Stripe webhook inline HTML |
| Booking receipt (PDF email) | camel-customer app/api/webhooks/stripe/route.ts | Same as above, passed as locale param | lib/portal/generateBookingReceiptPDF.tsx sendBookingReceiptEmail |
| Completion email | camel-portal lib/portal/completeBooking.tsx | customer_requests.customer_user_id → customer_profiles.communication_locale | completeBooking.tsx inline HTML |
| Review reminder | camel-portal app/api/cron/review-reminder/route.ts | customer_requests.customer_user_id → customer_profiles.communication_locale | Portal lib/email.ts sendReviewReminderEmail |

### Partner-facing emails and their locale source:
| Email | Sent from | Locale source | File |
|---|---|---|---|
| New booking confirmed | camel-customer Stripe webhook | partner_profiles.communication_locale | Stripe webhook inline HTML |
| Booking completion + payout summary | camel-portal completeBooking.tsx | partner_profiles.communication_locale | completeBooking.tsx inline HTML |
| Application received | camel-portal complete-signup/route.ts | Derived from country at signup | Portal lib/email.ts |
| Approval / rejection / live | camel-portal admin routes | partner_profiles.communication_locale via getPartnerLocale() | Portal lib/email.ts |

### CRITICAL: How customer locale lookup works
All portal code that needs the customer locale uses this pattern — never use listUsers() from the portal Supabase client:
```typescript
const { data: custProfile } = await db
  .from("customer_profiles")
  .select("communication_locale")
  .eq("user_id", request.customer_user_id)
  .maybeSingle();
const locale = custProfile?.communication_locale === "es" ? "es" : "en";
```
⚠️ Do NOT use db.auth.admin.listUsers() in portal code to find customers

### PDF attachment language rule

All PDF attachments stay English — NTUK Ltd is a UK company
The email body and subject wrapping the PDF is in the customer's language


## i18n Architecture (CRITICAL)
### How it works

All user-facing strings live in lib/i18n/locales/en.json and lib/i18n/locales/es.json
JSON files are flat key-value pairs — keys use dot notation. Never add nested objects.
useTranslation() hook returns { t, locale } based on current locale
Language preference stored in localStorage key camel_locale
Browser locale auto-detected on first visit: es* → Spanish, anything else → English
LanguageProvider initialises as "en" then reads localStorage in useEffect on mount

## Driver portal step order (CRITICAL — Chat 46)
Driver jobs page (app/driver/jobs/page.tsx) enforces strict step order:

Insurance handover — always available first
Delivery fuel — locked until insurance confirmed
Collection fuel — locked until delivery fuel confirmed

Steps show a 🔒 placeholder with translated message when locked. Step indicator shows 1. 2. 3. with green ticks as each completes. All step labels and lock messages are translated EN/ES via i18n keys driver.jobs.steps.*.

## i18n Translation Status
### Portal
✅ Phase 1–4 — All complete
✅ Chat 46 — Driver steps + chat widget
### Customer
✅ Phase 5 — Customer site (Complete)
✅ Chat 46 — Chat widget EN/ES
❌ Phase 6 — Future languages (Future)
IT, PT, FR, DE — add a new JSON file to both repos + one line in LanguageContext.tsx, zero other code changes needed.
Email templates also need updating per language — see Email Architecture section.

## Translation Roadmap
| Phase | Scope | Status |
|---|---|---|
| Phase 1 | Homepage, signup, onboarding, dashboard, sidebar, login, auth pages | ✅ Done |
| Phase 2 | Account, profile, bookings, requests, reports, fleet, drivers, reviews, settings, suggestions, all legal/info pages, footer | ✅ Done |
| Phase 3 | Driver portal — login, signup, reset password, jobs | ✅ Done |
| Phase 4 | Partner emails + bilingual PDFs + partner communication locale + admin email locale | ✅ Done |
| Phase 5 | Customer site — all pages, footer, cookie banner, customer email locale preference | ✅ Done |
| Phase 6 | IT, PT, FR, DE | 🔲 Future |

## CRITICAL: DB Client Rules
One Supabase project — both portal and customer data live in the same project (guhcavvpuveiovspzxmg.supabase.co).

NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_CUSTOMER_SUPABASE_URL point to the same project
SUPABASE_SERVICE_ROLE_KEY and CUSTOMER_SUPABASE_SERVICE_ROLE_KEY are the same key
completeBooking.tsx uses a direct REST fetch with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to query customer_requests
⚠️ Do NOT use db.auth.admin.listUsers() from portal client to find customers


## Completion Flow (CRITICAL)

app/api/test-booking/bookings/[id]/update/route.ts (camel-customer) sets booking_status = completed
Calls POST /api/internal/complete-booking on the portal with CRON_SECRET
app/api/internal/complete-booking/route.ts (camel-portal) validates secret and calls completeBooking()
completeBooking() issues Stripe fuel refund, sends customer + partner + admin emails with PDF
Partner email language determined by partner_profiles.communication_locale
Customer email language determined by customer_requests.customer_user_id → customer_profiles.communication_locale


## Stripe Payment Architecture (CRITICAL)
### Payment split

Camel always receives exactly the commission amount — Stripe fee never reduces it
Partner payout = car hire − commission + fuel charge
Camel net income = commission − Stripe fee

### Commission calculation rule
NEVER use commission_amount or partner_payout_amount from DB. Always recalculate:
```typescript
const commAmt = Math.max((car_hire_price * commission_rate) / 100, 10);
const partnerPayout = Math.max(0, car_hire_price - commAmt + fuel_charge);
```

## Fuel Override Architecture (CRITICAL)
Effective fuel = partner override (collection_fuel_level_partner) if set, else driver reading (collection_fuel_level_driver).

## Commission Invoice Architecture (CRITICAL)

Auto-generated: Vercel cron 1st of each month at 08:00 UTC
Date column: uses created_at from partner_bookings
Commission invoices stay in English — NTUK is a UK company


## Partner Terms Architecture (CRITICAL)

Single source of truth: lib/portal/partnerTerms.ts
Current version: 2026-06b effective 1 June 2026


## Security Architecture

CSP form-action — portal: 'self' only; customer: 'self' https://checkout.stripe.com https://*.stripe.com
Stripe Radar — enabled
2FA: Vercel, GitHub, Supabase, Gmail — all done ✅


## PDF Logo Architecture

Logo file: ~/camel-portal/public/camel-invoice-logo.png
completeBooking.tsx (portal) — reads from disk via fs.readFileSync
generateCompletionStatementPDF.tsx + generateBookingReceiptPDF.tsx (customer) — fetches from https://portal.camel-global.com/camel-invoice-logo.png


## Outreach Email Architecture (CRITICAL — Chat 47)
Files: all in camel-portal only.

| File | Purpose |
|---|---|
| app/admin/outreach/page.tsx | Outreach UI — prospect table, country filter, batch send, send again |
| app/api/admin/outreach/send/route.ts | Send logic — hardcoded email body, language by country, daily limit, unsubscribe check |
| app/api/admin/outreach/prospects/route.ts | GET/POST prospects |
| app/api/admin/outreach/prospects/[id]/route.ts | PATCH/DELETE prospect |
| app/api/admin/outreach/unsubscribe/route.ts | Public GET — sets unsubscribed=true, redirects to portal homepage with ?unsubscribed=true banner |
| app/HomePageContent.tsx | Shows unsubscribed banner when ?unsubscribed=true |
| public/camel-logo-white-new.png | White version of camel logo for use in outreach emails (email clients don't support CSS filter) |

### Outreach email rules
- Sent from: `Camel Global Partners <partners@camel-global.com>`
- Subject EN: `Camel Global - Meet & Greet Car Hire - Founding Partner Invitation`
- Subject ES: `Camel Global - Meet & Greet Alquiler de Coches - Invitación a Socio Fundador`
- Logo: `https://portal.camel-global.com/camel-logo-white-new.png` — white PNG, no CSS filter needed
- Email body is fully hardcoded — no AI generation. Opening line personalised with contact first name and city.
- Language: Spain → Spanish, all other countries → English
- Daily limit: 50 emails
- Batch send: pending prospects only, respects country filter, never includes Send Again
- Send Again: manual only, all non-unsubscribed rows, counts towards daily limit
- Unsubscribe: List-Unsubscribe header set on every email (Resend one-click). Link in footer sets unsubscribed=true on prospect record. Unsubscribed prospects are never sent to even on resend.
- DB column: outreach_prospects.unsubscribed boolean (added Chat 47)
- "unsub" badge shown on unsubscribed rows in the table

### logo generation command (run if camel-logo-white-new.png ever needs regenerating)
```bash
python3 -c "
from PIL import Image
img = Image.open('$HOME/camel-portal/public/camel-logo.png').convert('RGBA')
pixels = img.load()
w, h = img.size
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a > 10:
            pixels[x, y] = (255, 255, 255, a)
img.save('$HOME/camel-portal/public/camel-logo-white-new.png')
print('Done')
"
```
Note: camel-logo.png pixels are yellow/gold (247, 209, 77) — CSS filter invert makes them blue in email clients. Must replace pixel colours directly with Python/Pillow.

## Environment Variables (CRITICAL)
| Variable | Repo | Value |
|---|---|---|
| NEXT_PUBLIC_SITE_URL | camel-customer (Vercel) | https://www.camel-global.com — must be set or review email links break |

## Email Addresses
| Address | Type | Forwards to |
|---|---|---|
| info@camel-global.com | Mailbox (Mail Lite, Fasthosts) | Gmail via POP |
| contact@camel-global.com | Forwarder | artur@ + info@ |
| partners@camel-global.com | Forwarder | artur@ + info@ |
| email@camel-global.com | Forwarder | nicktrin@gmail.com + artur@ |

## Stable Tags
### Portal (~/camel-portal)
| Tag | Description |
|---|---|
| v-stable-chat39-complete | Chat 39 complete |
| v-stable-chat40-i18n-complete | Chat 40 — full partner portal + driver portal i18n EN/ES |
| v-stable-chat41-complete | Chat 41 complete |
| v-stable-chat42-complete | Chat 42 complete |
| v-stable-chat44-complete | Chat 44 complete |
| v-stable-chat45-email-locale | Chat 45 complete — all emails locale-aware |
| v-stable-chat46-complete | Chat 46 complete — driver steps enforced EN/ES, chat widget full EN/ES |
| v-stable-chat47-complete | Chat 47 complete — outreach improvements |

### Customer (~/camel-customer)
| Tag | Description |
|---|---|
| v-stable-chat39-complete | Chat 39 complete |
| v-stable-chat43-phase5-i18n | Chat 43 — Phase 5 complete |
| v-stable-chat44-complete | Chat 44 complete |
| v-stable-chat45-email-locale | Chat 45 complete — all emails locale-aware |
| v-stable-chat46-complete | Chat 46 complete — chat widget full EN/ES |

## Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat47-complete
cd ~/camel-customer && git checkout v-stable-chat46-complete
```

## What Is Working ✅

Customer booking flow — homepage, date picker, driver age, Book Now layout correct all screen sizes
Guest booking flow — draft survives login/signup redirect
Partner bid submission and management
Driver job portal — fully translated EN/ES, step order enforced (insurance → delivery fuel → collection fuel), step labels and lock messages translated
Admin approval and account management
Partner approval gate
Full EUR / GBP / USD currency support
Full commission system
Fuel level recording, override, charge/refund calculation
Fuel refund on completion — Stripe partial refund issued automatically
All customer notification emails EN/ES
All partner notification emails EN/ES
PDF attachments always English
Chat widget EN/ES — UI strings, AI replies, and locale sent correctly in both portal and customer. localeRef fixes stale closure. key={locale} forces remount on language change.
Review reminder email
Completion statement PDF + booking receipt PDF
Live status system — 7 checks
Partner onboarding — 7 steps
Commission invoices — auto-generated monthly
Partner terms — single source of truth lib/portal/partnerTerms.ts version 2026-06b
Security — CSP, Stripe Radar, 2FA all done
Partner outreach — AI-powered, country filter, batch send, send again, unsubscribe, language by country, hardcoded email body, white logo, founding partner messaging


## What Needs Building — Next Chat (Chat 48)
🔲 Lower priority (deferred)

Commission invoice PDF — VAT number + 20% UK VAT once NTUK is VAT registered
Xero monthly commission endpoint
DAC7 EU platform reporting
Outreach: set up e.camel-global.com subdomain in Resend for better domain protection

❌ Phase 6 — Future languages (Future)
IT, PT, FR, DE — copy en.json to new locale file in both repos, translate values, add locale to LanguageContext.tsx (one line each repo). Also update email templates in both lib/email.ts files.

## Collaborator Note
A collaborator works on camel-portal from Windows (C:/dev/camel-portal). He built the Partner Outreach Agent (/admin/outreach). Always git pull before starting.
Note: camel-coming-soon is a git submodule inside camel-portal. Always shows as modified in git status — ignore it. Use git add <specific-file> to avoid submodule conflicts.

## Session Log

### Chat 47 (Completed)
Partner outreach improvements

Outreach page (app/admin/outreach/page.tsx):
- Added country filter — fixed list: Spain, France, Italy, Portugal, Germany, UK, USA
- Added Send Again button on all non-unsubscribed rows (manual only, not included in batch)
- Batch send respects active country filter
- Unsubscribed rows shown with "unsub" badge, greyed out, no send buttons

Outreach send route (app/api/admin/outreach/send/route.ts):
- From address changed to partners@camel-global.com
- Email body fully hardcoded — no AI. Opening line personalised with contact first name and city.
- Language by country: Spain → Spanish, all others → English
- Subject EN: Camel Global - Meet & Greet Car Hire - Founding Partner Invitation
- Subject ES: Camel Global - Meet & Greet Alquiler de Coches - Invitación a Socio Fundador  
- Founding partner messaging — limited places, free, 5 minutes
- Orange SIGN UP NOW button linking to https://portal.camel-global.com/
- List-Unsubscribe header on every email
- Unsubscribed prospects blocked even on resend
- Removed branding line from footer
- Resend (Send Again) allowed on any non-unsubscribed prospect, counts towards daily limit

Unsubscribe route (app/api/admin/outreach/unsubscribe/route.ts) — NEW FILE:
- Public GET endpoint, no auth
- Sets unsubscribed=true on prospect
- Redirects to https://portal.camel-global.com/?unsubscribed=true

Portal homepage (app/HomePageContent.tsx):
- Shows green unsubscribed banner when ?unsubscribed=true in URL

lib/email.ts:
- Added optional `from` and `headers` params to sendEmail() — all existing calls unaffected

White logo (public/camel-logo-white-new.png) — NEW FILE:
- camel-logo.png has yellow/gold pixels (247,209,77) — CSS filter invert makes them blue in email clients
- Generated with Python/Pillow replacing all visible pixels with white
- Used in outreach email header at 108px height on black background

DB migration run in Chat 47:
- ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS unsubscribed boolean DEFAULT false;

Stable tag: v-stable-chat47-complete on camel-portal

### Chat 46 (Completed)
Driver step order enforcement + Chat widget full EN/ES
Stable tags: v-stable-chat46-complete on both repos

### Chat 45 (Completed)
Bug fixes, full email locale system, fuel label i18n
Stable tags: v-stable-chat45-email-locale on both repos

### Chat 44 (Completed)
Customer i18n fixes, customer email locale, mobile burger menu

### Chat 43 (Completed)
Phase 5: Customer site i18n — full EN/ES translation

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

# Restore a file from a specific commit
git show <commit-hash>:lib/email.ts > lib/email.ts

# Regenerate white outreach logo if needed
python3 -c "
from PIL import Image
img = Image.open('$HOME/camel-portal/public/camel-logo.png').convert('RGBA')
pixels = img.load()
w, h = img.size
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a > 10:
            pixels[x, y] = (255, 255, 255, a)
img.save('$HOME/camel-portal/public/camel-logo-white-new.png')
" && cd ~/camel-portal && git add -f public/camel-logo-white-new.png && git commit -m "Regenerate white logo" && git push origin main

# IMPORTANT: camel-coming-soon is a submodule — always shows modified, ignore it.
git add app/path/to/file.tsx && git commit -m "message" && git push origin main

# Making small text changes to deployed files — use sed directly on disk, verify with grep, then commit
sed -i '' 's/old text/new text/' ~/camel-portal/path/to/file.ts
grep -n "new text" ~/camel-portal/path/to/file.ts
git add path/to/file.ts && git commit -m "message" && git push origin main
```

Last updated: Chat 47 complete — partner outreach improvements: country filter, Send Again, hardcoded email body, founding partner messaging, white logo, unsubscribe system, language by country.