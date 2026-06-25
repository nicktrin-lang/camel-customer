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
**multiline sed never works in zsh — always use separate sed commands per line, or write a full file artifact.**
**Python3 heredoc is the reliable way to make multiline replacements — use python3 << 'EOF' pattern.**


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
| camel-global.com / www.camel-global.com | camel-customer-live | camel-customer | Customer production (LIVE) |
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
| lib/portal/operatingRules.ts | Shared OPERATING_RULES + OPERATING_RULES_ES data + downloadOperatingRulesPDF(companyName, locale). Section 9b — Invoicing Obligations EN+ES. |
| lib/portal/completeBooking.tsx | Shared completion logic — Stripe transfer reversal + fuel refund, payout_status=ready, emails all parties with PDF. Logo read from disk via fs.readFileSync. |
| lib/portal/generateCommissionInvoice.tsx | Commission invoice PDF — uses created_at from partner_bookings. English only. |
| lib/portal/generateInvoiceDataPDF.tsx | Invoice data PDF — server-side react-pdf, EN/ES, NOT a VAT invoice. wrap={false} prevents page breaks. |
| lib/portal/partnerTerms.ts | Single source of truth for partner T&Cs. Version 2026-06d. Clause 7: chargeback. Clause 9: VAT/invoicing. |
| lib/rateLimit.ts | In-memory rate limiter — 3 req / 15 min per IP |
| lib/hcaptcha.ts | Server-side hCaptcha token verification |
| lib/currency.ts | All currency utilities — EUR, GBP, USD formatting + conversion |
| lib/useCurrency.ts | React hook — currency state, live rates, fmt helpers |
| lib/email.ts | Resend email sender — all notification helpers. WARNING: large file — never replace with partial. Restore from git if overwritten. |
| lib/i18n/LanguageContext.tsx | Language context + provider + localStorage + browser locale detection. |
| lib/i18n/useTranslation.ts | t() hook — dot-notation keys, {{var}} interpolation, English fallback. |
| lib/i18n/LanguageToggle.tsx | EN/ES toggle component. Hidden on mobile (hidden lg:flex), shown in sidebar drawer. |
| lib/i18n/locales/en.json | English strings — flat key-value format, NOT nested. Includes postCompletion* keys. |
| lib/i18n/locales/es.json | Spanish strings — same flat format. Includes postCompletion* keys. |
| app/partner/signup/page.tsx | Partner signup — 5 steps. Captures addressLat/addressLng + fleetLat/fleetLng. Falls back to business address coords if no fleet coords. GA4 step tracking: signup_step_1_company_details through signup_step_5_terms. useEffect fires step 1 on mount. |
| app/partner/onboarding/page.tsx | Partner onboarding — 7 steps (location, currency, billing, fleet, drivers, payouts, golive). GA4 step tracking: onboarding_step_{stepname} fires on each step completion. |
| app/api/partner/complete-signup/route.ts | Creates auth user, partner_application, partner_profile. Saves base_lat/base_lng from fleet coords (falls back to business address coords). Sends application received email to partner + admin notification email to CAMEL_ADMIN_EMAILS. |
| app/admin/approvals/page.tsx | Partner approvals list + map. Map shows pending AND approved partners (not just approved). Live partners rendered on top of not-live at same location (sorted by is_live). |
| app/admin/approvals/PartnersMap.tsx | Leaflet map — green dot = live, orange dot = not live. zIndex:0 wrapper prevents map overlapping header. |
| app/admin/outreach/page.tsx | Outreach UI — prospect table, engagement cards (Sent/Opened/Clicked — clickable filters), All + status cards, country filter, batch send, CSV import, sticky header, scrollable table. |
| app/api/admin/outreach/webhook/route.ts | Resend webhook — handles email.opened, email.clicked, email.complained, email.bounced. Updates opened_at, clicked_at, unsubscribed, status on outreach_prospects. Signature verification disabled (svix mismatch — TODO). |

### Key Libraries & Files — Customer (~/camel-customer)
| File | Purpose |
|---|---|
| lib/supabase-customer/browser.ts | Supabase browser client. detectSessionInUrl: false. |
| lib/supabase-customer/server.ts | Exports createCustomerServerClient() and createCustomerServiceRoleSupabaseClient() |
| lib/portal/generateBookingReceiptPDF.tsx | Booking receipt PDF + email. EN/ES body. Platform Payment Notice included. |
| lib/portal/generateCompletionStatementPDF.tsx | Completion statement PDF. Shows AMENDED when refunds exist. |
| app/ClientRootLayout.tsx | LanguageProvider wraps InnerLayout. PASSWORD_RECOVERY ignored. |
| app/reset-password/layout.tsx | Standalone layout — bypasses ClientRootLayout. |
| app/page.tsx | Customer homepage — auth-aware nav. |
| app/api/webhooks/stripe/route.ts | Stripe webhook — payment_intent.succeeded. Emails in correct language. GA4 purchase event via Measurement Protocol. |
| app/api/test-booking/requests/[id]/route.ts | GET booking detail — ownership enforced via .eq("customer_user_id", customerUser.id). |
| app/bookings/[id]/page.tsx | Customer booking detail — shows post-completion refund block in amber. |
| app/account/page.tsx | Customer account — VAT Invoice Details card (billing_address, tax_id). |
| middleware.ts | Pass-through (NextResponse.next()). No server-side auth gate — see Future Work. |

## Invoicing / VAT Architecture (CRITICAL — Chat 50)
Camel is marketplace intermediary. Partner is the supplier. Partner issues VAT invoices to customers.
- Booking receipt: NOT a VAT invoice. Platform Payment Notice in PDF + email (EN/ES).
- Commission invoice: monthly to partner. English only (NTUK legal).
- Invoice Data PDF: data sheet for partner to raise their own invoice. EN/ES.
- Documented in: partner terms clause 9, operating rules section 9b, customer terms clause 10b.

## Chat Widget Architecture (CRITICAL)
ChatWidget.tsx exists in both repos but NOT identical. Both use key={locale} to force remount.
localeRef ensures current locale sent to API. ⚠️ Never use useLanguage() outside LanguageProvider.

## Email Architecture (CRITICAL)
Rule: Notification emails = customer's language. PDF attachments = always English.

### Admin notification emails (Chat 51)
- New partner application → CAMEL_ADMIN_EMAILS — added to complete-signup/route.ts
- Includes: company name, contact, email, phone, country, address, link to admin approvals

### Customer-facing emails:
| Email | Locale source |
|---|---|
| Bid received | customer_profiles.communication_locale |
| Booking confirmed + receipt PDF | customer_profiles.communication_locale |
| Completion email | customer_profiles.communication_locale |
| Post-completion refund | customer_profiles.communication_locale |
| Review reminder | customer_profiles.communication_locale |

### CRITICAL: Customer locale lookup
```typescript
const { data: custProfile } = await db
  .from("customer_profiles")
  .select("communication_locale")
  .eq("user_id", request.customer_user_id)
  .maybeSingle();
const locale = custProfile?.communication_locale === "es" ? "es" : "en";
```
⚠️ Do NOT use db.auth.admin.listUsers() in portal code to find customers

## GA4 Tracking Architecture (CRITICAL)

### Customer site (camel-global.com) — G-1Y758X38G4
- All page views tracked via root layout
- Cookie consent gates analytics
- GA4 purchase event via Measurement Protocol on every confirmed booking
  - File: app/api/webhooks/stripe/route.ts (camel-customer)
  - Measurement ID: G-1Y758X38G4, API Secret: m8xBZ_30QNqmKliAbvC04A

### Portal (portal.camel-global.com) — G-YCZMDQJDM7
- All page views tracked via root layout
- outreach_cta_click — fires on CTA clicks when utm_source=outreach
- partner_signup_complete — fires on application-submitted page
- **Signup funnel events** (Chat 51 — unique event names per step):
  - signup_step_1_company_details — fires on mount of signup page
  - signup_step_2_business_address — fires on Next from step 1
  - signup_step_3_fleet_address — fires on Next from step 2
  - signup_step_4_password — fires on Next from step 3
  - signup_step_5_terms — fires on Next from step 4
- **Onboarding funnel events** (Chat 51):
  - onboarding_step_currency, onboarding_step_billing, onboarding_step_fleet
  - onboarding_step_drivers, onboarding_step_payouts, onboarding_step_golive

### GA4 Funnel Explorations (set up in GA4 Explore)
- "Partner Signup Funnel" — 5 steps using signup_step_* event names
- "Partner Onboarding Funnel" — 6 steps using onboarding_step_* event names
- No custom dimensions needed — each step has unique event name

### Outreach tracking
- UTM params on all links: utm_source=outreach&utm_medium=email&utm_campaign=founding-partner&utm_content=signup-button&utm_term={country}&ref={prospect_id}
- Resend webhook tracks opens/clicks/complaints/bounces directly in outreach_prospects table

## Outreach Email Architecture (CRITICAL — Chat 51)
Files: all in camel-portal only.

| File | Purpose |
|---|---|
| app/admin/outreach/page.tsx | Outreach UI — clickable Sent/Opened/Clicked cards, All+status filter cards, sticky header, CSV import, engagement filter |
| app/api/admin/outreach/send/route.ts | Send logic — noreply@e.camel-global.com, hardcoded body, EN/ES by country, 50/day limit |
| app/api/admin/outreach/webhook/route.ts | Resend webhook — auto-updates opened_at, clicked_at, unsubscribed, bounced status |
| app/api/admin/outreach/prospects/route.ts | GET/POST prospects |
| app/api/admin/outreach/prospects/[id]/route.ts | PATCH/DELETE prospect |
| app/api/admin/outreach/unsubscribe/route.ts | Public GET — sets unsubscribed=true |

### Outreach rules
- **From: `Camel Global <noreply@e.camel-global.com>`** — subdomain protects main domain
- e.camel-global.com fully verified in Resend (DKIM, SPF MX, SPF TXT, tracking CNAME links.e)
- Click tracking ON, Open tracking ON (toggled on after initial setup)
- Resend webhook: https://portal.camel-global.com/api/admin/outreach/webhook
  - Listening: email.clicked, email.opened, email.complained, email.bounced
  - RESEND_WEBHOOK_SECRET set in Vercel (Sensitive, Production+Preview) — signature verification TODO
- Sign Up button → portal homepage (sells the platform better than direct signup link)
- Daily limit: 50, 1s delay between sends
- CSV import: company_name + email required, contact_name/city/country/notes optional
- Bounced emails → automatically set status = "bounced"
- Complained emails → automatically set unsubscribed = true

### DB columns added for outreach tracking (Chat 51)
```sql
ALTER TABLE outreach_prospects ADD COLUMN opened_at timestamptz;
ALTER TABLE outreach_prospects ADD COLUMN clicked_at timestamptz;
```

## Partner Signup & Map Architecture (CRITICAL — Chat 51 fixes)

### Lat/lng at signup
- signup/page.tsx sends addressLat/addressLng (business) + baseLat/baseLng (fleet) to complete-signup route
- complete-signup/route.ts saves: `base_lat: baseLat ?? addressLat, base_lng: baseLng ?? addressLng`
- If partner doesn't set fleet address, business address coords used as fallback
- This ensures new partners appear on admin map immediately after signup

### Admin approvals map
- Shows pending AND approved partners (not just approved) — filter updated Chat 51
- Partners with no base_lat/base_lng don't appear until coords set
- Live partners sorted to render on top of not-live at same location (is_live sort)
- Green dot = live, orange dot = not live

### Backfilling existing partners without coords
Run Photon geocode on their address, then:
```sql
UPDATE partner_profiles SET base_lat = {lat}, base_lng = {lng} WHERE company_name = '{name}';
```

## Security Architecture (CRITICAL)

### URL tamper protection — confirmed secure
- Customer API: `.eq("customer_user_id", customerUser.id)` — 404 on mismatch
- Partner API: `.eq("partner_user_id", userId)` unless adminMode — 404 on mismatch
- Identity from verified JWT only

### robots.txt — confirmed correct
- Customer: allows public pages, blocks /bookings/, /account/, /reset-password/, /api/
- Portal: allows /, /partner/signup, /partner/terms, /partner/privacy only
- Test sites: block everything

### Favicon (Chat 51)
- Added to both repos: favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, favicon-512.png
- Link tags added to both app/layout.tsx files
- Source: camelLogo-fav.png (512x512 black background, white camel logo)

### Other
- CSP, Stripe Radar, 2FA, Domain Guard, SSL all active ✅
- press@camel-global.com — confirmed exists in Fasthosts ✅

## i18n Architecture (CRITICAL)
All strings in lib/i18n/locales/en.json and es.json — flat key-value, never nested.
Browser auto-detects: es* → Spanish, anything else → English.

## CRITICAL: DB Client Rules
One Supabase project (guhcavvpuveiovspzxmg.supabase.co).
completeBooking.tsx uses direct REST fetch with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
⚠️ Do NOT use db.auth.admin.listUsers() from portal client to find customers.

## DB Schema
```sql
-- Chat 49
CREATE TABLE partner_booking_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES partner_bookings(id),
  amount numeric NOT NULL, reason text, stripe_refund_id text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE partner_bookings ADD COLUMN post_completion_refund_total numeric DEFAULT 0;

-- Chat 50
ALTER TABLE customer_profiles ADD COLUMN billing_address text;
ALTER TABLE customer_profiles ADD COLUMN tax_id text;

-- Chat 51
ALTER TABLE outreach_prospects ADD COLUMN opened_at timestamptz;
ALTER TABLE outreach_prospects ADD COLUMN clicked_at timestamptz;
```

## DB State
- Clean slate — all sandbox data deleted (Chat 51)
- 4 auth users: nicktrin@gmail.com (super_admin+customer), nickt@esposti.co.uk (admin), artur.kzn2006@gmail.com (partner), nicktrin+103@gmail.com (driver)
- Job sequence: global_job_number_seq at 1000166+
- Real partners: AUTOMOVILES BERROCAR S.L. (Spain, approved), Kingsman Chauffeur Services (Australia, approved)
- Both manually geocoded and base_lat/base_lng set in Chat 51

## Stripe Payment Architecture (CRITICAL)
- LIVE keys active in Vercel
- Webhook: https://www.camel-global.com/api/webhooks/stripe
- Post-completion refund: uses transfer.amount_reversed for accuracy, shortfall absorbed by Camel
- Commission: `Math.max((car_hire_price * commission_rate) / 100, 10)`

## Password Reset
- Customer: exchange-reset-code → /reset-password → setSession at submit time
- Partner: /partner/reset-password with hash tokens
- Driver: /driver/reset-password

## Completion Flow
camel-customer update route → POST /api/internal/complete-booking → completeBooking() → reverses transfer → refunds customer → emails all parties.

## Payout Hold / Dispute
- partner_bookings.payout_hold boolean, payout_hold_reason text
- Monthly cron skips held bookings
- Partner email on partner_applications.email (NOT partner_profiles)

## Commission Invoice
Auto-generated: Vercel cron 1st of month 08:00 UTC. English only. Uses created_at.

## PDF Logo
- ~/camel-portal/public/camel-invoice-logo.png
- completeBooking.tsx: fs.readFileSync
- Other PDFs: fetch from https://portal.camel-global.com/camel-invoice-logo.png

## Map z-index
`style={{ zIndex: 0, position: "relative" }}` on map wrapper divs in:
- app/partner/profile/MapPickerInner.tsx
- app/admin/approvals/PartnersMap.tsx

## Environment Variables (CRITICAL)
| Variable | Repo | Value |
|---|---|---|
| NEXT_PUBLIC_SITE_URL (Production) | camel-customer | https://www.camel-global.com |
| NEXT_PUBLIC_SITE_URL (Preview) | camel-customer | https://test.camel-global.com |
| STRIPE_SECRET_KEY | both | **LIVE — sk_live_...z3pe** |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | camel-customer | **LIVE** |
| STRIPE_WEBHOOK_SECRET | camel-customer only | **LIVE** |
| PORTAL_BASE_URL | camel-portal | https://portal.camel-global.com |
| RESEND_WEBHOOK_SECRET | camel-portal | Set in Vercel (Sensitive) — for outreach webhook |

## Email Addresses
| Address | Notes |
|---|---|
| info@camel-global.com | Mailbox — Gmail via POP |
| contact@camel-global.com | Forwarder → artur@ + info@ |
| partners@camel-global.com | Forwarder → artur@ + info@ |
| noreply@camel-global.com | Forwarder → info@ + artur@ — transactional emails |
| noreply@e.camel-global.com | Resend subdomain — outreach emails only |
| email@camel-global.com | Forwarder → nicktrin@gmail.com + artur@ |
| press@camel-global.com | Forwarder → artur@ + info@ ✅ confirmed exists |

## Stable Tags
### Portal (~/camel-portal)
| Tag | Description |
|---|---|
| v-stable-chat51-live-stripe | Live Stripe, DB cleanup, post-refund fix, map z-index, GA4 |
| v-stable-chat51-outreach-ready | Outreach: e.camel-global.com, CSV import, batch dialog fix |
| v-stable-chat51-outreach-tracking | Outreach: open/click webhook, engagement cards, sticky header |
| v-stable-chat51-final | Final Chat 51 — GA funnels, favicon, admin signup notification, map fixes, partner lat/lng at signup |

### Customer (~/camel-customer)
| Tag | Description |
|---|---|
| v-stable-chat51-live-stripe | Live Stripe, GA4 ecommerce purchase tracking, favicon |

## Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat51-final
cd ~/camel-customer && git checkout v-stable-chat51-live-stripe
```

## What Is Working ✅

Customer booking flow — all screen sizes, guest booking survives redirect
Partner bid submission and management
Driver job portal — EN/ES, step order enforced
Admin approval and account management
Full EUR/GBP/USD + live rates
Commission system (20% min €10)
Fuel recording, override, charge/refund
All refunds — transfer reversal then customer refund
All emails EN/ES — customer + partner + admin
All PDFs — receipt, completion, amended, commission invoice, invoice data
Chat widget EN/ES — both repos
Live status system — 7 checks
Partner onboarding — 7 steps with GA4 funnel tracking
Commission invoices — monthly cron
Partner terms v2026-06d
Security — CSP, Stripe Radar, 2FA, Domain Guard, URL ownership enforced
**Live Stripe — booking #1000167 confirmed**
**Admin email notification on new partner application** (Chat 51)
**Partner lat/lng captured at signup** — falls back to business address coords (Chat 51)
**Admin map** — shows pending + approved, live on top, green=live orange=not-live (Chat 51)
**Favicon** — Camel logo on both sites (Chat 51)
**Google Search Console** — set up for camel-global.com and portal.camel-global.com (Chat 51)
**GA4 signup funnel** — 5 step events firing, funnel exploration set up in GA4 (Chat 51)
**GA4 onboarding funnel** — 6 step events firing, funnel exploration set up in GA4 (Chat 51)
**Outreach** — 300+ sent, 25% open rate, Resend webhook tracking opens/clicks/bounces/complaints
**Outreach engagement UI** — clickable Sent/Opened/Clicked filter cards, All status card (Chat 51)
DB clean slate, real partners: Berrocar (Spain) + Kingsman (Australia) approved
robots.txt confirmed correct
Map z-index fixed

## Future Work (Deferred)
🔲 **Resend webhook signature verification** — currently disabled (svix format mismatch). Add svix npm package and re-enable. Low risk as endpoint URL is obscure.
🔲 **Server-side middleware auth gate** — use Supabase official Next.js middleware helper. Test on staging first.
🔲 Commission invoice PDF — VAT number + 20% UK VAT once NTUK VAT registered
🔲 Xero monthly commission endpoint
🔲 DAC7 EU platform reporting
❌ Phase 6 — Future languages: IT, PT, FR, DE

## Collaborator Note
Collaborator works on camel-portal from Windows (C:/dev/camel-portal). Always git pull before starting.
camel-coming-soon is a git submodule — always shows modified, ignore it. Use git add <specific-file>.

## Session Log

### Chat 51 — Final updates (Jun 25)
- Admin email notification on new partner application — added to complete-signup/route.ts
- Partner lat/lng at signup — falls back to business address coords if no fleet address set
- Admin map — now shows pending + approved partners; live partners render on top
- Favicon — camelLogo-fav.png added to both repos, link tags in both layout.tsx
- Google Search Console — set up for both domains
- GA4 signup funnel — unique event per step (signup_step_1_company_details etc), funnel set up in GA4 Explore
- GA4 onboarding funnel — unique event per step (onboarding_step_currency etc), funnel set up in GA4 Explore
- Outreach engagement cards now clickable as filters (Sent/Opened/Clicked)
- All status card added to outreach
- Outreach webhook handles email.bounced → auto-sets status=bounced
- Backfilled Berrocar (Sevilla) and Kingsman (Adelaide) with geocoded coords
- Stable tag: v-stable-chat51-final on camel-portal

### Chat 51 — Outreach tracking (Jun 18)
- Resend webhook for open/click/complained tracking set up
- e.camel-global.com open tracking enabled, click tracking subdomain verified
- opened_at and clicked_at columns added to outreach_prospects
- Outreach page: Sent/Opened/Clicked engagement stats, sticky table header
- Stable tag: v-stable-chat51-outreach-tracking

### Chat 51 — Outreach ready (Jun 17)
- e.camel-global.com subdomain verified in Resend
- Outreach from noreply@e.camel-global.com
- CSV import, batch dialog fix, engagement stats
- Stable tag: v-stable-chat51-outreach-ready

### Chat 51 — Main (Jun 17)
Live Stripe, DB cleanup, post-refund fix, GA4 ecommerce, map fix, i18n
Stable tags: v-stable-chat51-live-stripe on both repos

### Chat 50 (Completed)
Invoicing obligations, VAT invoice data PDF, customer billing details

### Chat 49 (Completed)
Post-completion refund system, site go-live, password reset fixes

### Chat 48 (Completed)
GA tracking, payout hold dispute system, Stripe live setup

### Chat 47 (Completed)
Partner outreach system

### Chat 46 (Completed)
Driver step order + Chat widget EN/ES

## Useful Commands
```bash
# Always pull before starting
cd ~/camel-portal && git pull origin main
cd ~/camel-customer && git pull origin main

# Deploy
cd ~/camel-portal && git add path/to/file.tsx && git commit -m "message" && git push origin main
cd ~/camel-customer && git add app/path/to/file.tsx && git commit -m "message" && git push origin main

# File trees
find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort
find ~/camel-customer -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Stable tag
git tag -a v-tag-name -m "description" && git push origin v-tag-name

# Geocode an address for map backfill
curl -s "https://photon.komoot.io/api/?q={address}&limit=1" | python3 -c "import json,sys; d=json.load(sys.stdin); f=d['features'][0]; print(f['geometry']['coordinates'])"

# Backfill partner lat/lng
# UPDATE partner_profiles SET base_lat = {lat}, base_lng = {lng} WHERE company_name = '{name}';

# Check job number sequence
SELECT last_value FROM global_job_number_seq;

# Manual cron trigger
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://portal.camel-global.com/api/cron/monthly-payout

# Restore a file from commit
git show <commit-hash>:lib/email.ts > lib/email.ts

# Multiline replacements
python3 << 'EOF'
with open('/path/to/file.tsx', 'r') as f:
    content = f.read()
content = content.replace('old text', 'new text')
with open('/path/to/file.tsx', 'w') as f:
    f.write(content)
print("Done")
EOF

# Small changes — sed, verify, commit
sed -i '' 's/old/new/' ~/camel-portal/path/to/file.ts
grep -n "new" ~/camel-portal/path/to/file.ts

# camel-coming-soon is a submodule — always shows modified, ignore it
git add app/path/to/file.tsx && git commit -m "message" && git push origin main
```

Last updated: Chat 51 fully complete — outreach live (300+ sent, 25% open rate), GA4 funnels for signup + onboarding, favicon, admin signup notifications, partner map fixes, lat/lng at signup, Google Search Console.
