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
| lib/portal/operatingRules.ts | Shared OPERATING_RULES + OPERATING_RULES_ES data + downloadOperatingRulesPDF(companyName, locale). Includes section 3b — mileage limits & security deposits. Section 9 includes chargeback/dispute payout hold clause (EN+ES). Section 9b — Invoicing Obligations (EN+ES) — partner is supplier, Camel receipt is not a VAT invoice, partner must issue VAT invoices to customers. Bilingual PDF when locale="es". |
| lib/portal/completeBooking.tsx | Shared completion logic — Stripe transfer reversal + fuel refund, payout_status=ready, generates + emails completion statement PDF to customer. NOW reverses partner transfer before issuing fuel refund. Sends rich completion email with fuel summary + payout summary (commission breakdown) to partner in their communication_locale. Customer email sent in customer's communication_locale (EN/ES). Admin email includes full commission breakdown + customer locale used. Uses direct REST fetch to portal Supabase to query customer_requests. Logo read from disk via fs.readFileSync. |
| lib/portal/generateCommissionInvoice.tsx | Commission invoice PDF generator — uses created_at from partner_bookings as the date column (pickup_at does not exist on that table). Shows all bookings including zero-commission cancelled ones. |
| lib/portal/generateInvoiceDataPDF.tsx | Invoice data PDF generator — server-side @react-pdf/renderer. Generates a booking data sheet for partners to produce their own VAT invoice. NOT a VAT invoice itself. Supports EN/ES via locale param (T object with full translation strings). Served via app/api/partner/bookings/[id]/invoice-data/route.ts. Gross total bar + refund box + net total kept together with wrap={false} to prevent page breaks mid-content. |
| lib/portal/partnerTerms.ts | Single source of truth for partner T&Cs — PARTNER_TERMS, PARTNER_TERMS_ES, TERMS_VERSION, TERMS_EFFECTIVE, downloadPartnerTermsPDF(locale). Both signup/page.tsx and terms/page.tsx import from here. Bilingual PDF when locale="es". Never duplicate terms content. Clause 7 includes chargeback/dispute payout hold clause. Clause 9 renamed "VAT, Tax and Invoicing" — includes explicit invoicing obligation: partner must issue VAT invoices to customers, Camel receipt is not a VAT invoice. Version 2026-06d effective 12 June 2026. |
| lib/rateLimit.ts | In-memory rate limiter — 3 req / 15 min per IP |
| lib/hcaptcha.ts | Server-side hCaptcha token verification |
| lib/currency.ts | All currency utilities — EUR, GBP, USD formatting + conversion |
| lib/useCurrency.ts | React hook — currency state, live rates, fmt helpers |
| lib/email.ts | Resend email sender — all notification helpers. Supports attachments array (base64). Supports optional `from` override and `headers` params (both optional, existing calls unaffected). Partner-facing emails accept optional locale: "en" \| "es" param (default "en"). sendReviewReminderEmail accepts 4th param locale. sendCustomerBidReceivedEmail accepts 3rd param locale. WARNING: this file is large — never replace with a partial. Restore from git if accidentally overwritten. |
| lib/i18n/LanguageContext.tsx | Language context + provider + localStorage + browser locale detection. Initialises as "en" then sets real locale in useEffect on mount. |
| lib/i18n/useTranslation.ts | t() hook — dot-notation keys, {{var}} interpolation, English fallback. Returns { t, locale }. |
| lib/i18n/LanguageToggle.tsx | EN \| ES toggle component — drop into any header. On mobile partner portal this is hidden from the topbar (hidden lg:flex) and rendered instead at the top of the sidebar drawer. |
| lib/i18n/locales/en.json | English strings — all translated pages. Flat key-value format (e.g. "settings.language.label": "Language") — NOT nested objects. Includes bookings.table.col.refund, bookings.table.col.customerFinal, reports.bookings.col.refund, reports.bookings.col.customerFinal |
| lib/i18n/locales/es.json | Spanish strings — same flat format. Includes translations for refund/customerFinal columns. |

### Key Libraries & Files — Customer (~/camel-customer)
| File | Purpose |
|---|---|
| lib/supabase-customer/browser.ts | Supabase browser client (customers). detectSessionInUrl: false — prevents auto-login on reset password page. |
| lib/supabase-customer/server.ts | Exports createCustomerServerClient() and createCustomerServiceRoleSupabaseClient() |
| lib/portal/generateBookingReceiptPDF.tsx | Booking confirmation receipt PDF + email. sendBookingReceiptEmail accepts locale param — email body EN/ES, PDF stays English. PDF and email both include a "Platform Payment Notice" box (EN/ES) clarifying Camel is a marketplace intermediary and this is not a VAT invoice for car hire. Payment section header says "Payment to Camel Global". |
| lib/portal/generateCompletionStatementPDF.tsx | Booking completion statement PDF — supports postCompletionRefunds param. Shows "AMENDED" header and refund lines when refunds exist. Always regenerated fresh (never cached). |
| lib/i18n/LanguageContext.tsx | Copied from portal — same implementation |
| lib/i18n/useTranslation.ts | Copied from portal — same implementation |
| lib/i18n/LanguageToggle.tsx | Copied from portal — same implementation |
| lib/i18n/locales/en.json | Customer EN strings — flat key-value format. Includes reset.subtitle key. Includes account.vatDetails.* keys for billing address and tax ID fields. |
| lib/i18n/locales/es.json | Customer ES strings — flat key-value format. Includes reset.subtitle key. Includes account.vatDetails.* keys translated to Spanish. |
| lib/email.ts | Customer email sender — brandEmail() pattern, EN/ES for all 3 customer emails. sendCustomerBidReceivedEmail(to, jobNumber, locale), sendCustomerBookingCompletedEmail(to, jobNumber, locale), sendReviewReminderEmail(to, jobNumber, requestId, locale). PDFs stay English (NTUK). |
| app/ClientRootLayout.tsx | Global layout — LanguageProvider wraps InnerLayout. InnerLayout calls useLanguage() and passes locale to ChatWidget via key={locale} to force remount on language change. PASSWORD_RECOVERY auth event ignored — prevents auto-login on reset page. |
| app/reset-password/layout.tsx | Standalone layout for reset password page — bypasses ClientRootLayout entirely so no header/auth state shown. |
| app/page.tsx | Customer homepage — has its own inline nav (not ClientRootLayout header). Auth-aware: loads session on mount, shows burger menu on mobile with language toggle + logged-in/out links. Desktop nav also auth-aware. |
| app/api/webhooks/stripe/route.ts | Stripe webhook — handles payment_intent.succeeded. Looks up both customer and partner locale, sends all emails in correct language. Passes locale to sendBookingReceiptEmail. |
| app/api/test-booking/customer-profile/route.ts | GET + POST. GET reads full_name, phone, communication_locale, billing_address, tax_id. POST upserts including optional communication_locale, billing_address, tax_id. Uses onConflict: "user_id" and selective field updates. |
| app/api/chat/route.ts | Customer chat API — reads locale from request body, passes to system prompt so AI replies in correct language. |
| app/api/test-booking/requests/[id]/route.ts | GET booking detail — now includes post_completion_refund_total and postCompletionRefunds array from partner_booking_refunds. |
| app/api/test-booking/bookings/[id]/completion-statement/route.ts | Generates downloadable completion statement PDF — fetches partner_booking_refunds from portal DB, passes to PDF generator. Shows amended statement when refunds exist. |
| app/bookings/[id]/page.tsx | Customer booking detail — shows post-completion refund block in amber when refunds exist. Defers setSession to submit time on reset page (tokens stored in state). |
| app/account/page.tsx | Customer account page — includes VAT Invoice Details card with billing_address and tax_id fields (EN/ES via i18n). These are optional — only needed if customer wants a VAT invoice from the car hire company. |
| app/terms/page.tsx | Customer terms of use — includes clause 10b "Booking receipt and VAT invoices" clarifying Camel receipt is platform payment confirmation not a VAT invoice. Also added to "not responsible for" list in clause 13. |
| middleware.ts | Coming-soon redirect removed — site fully live on camel-global.com. |

## Invoicing / VAT Architecture (CRITICAL — Chat 50)

### Legal position
Camel Global is a marketplace intermediary — not a car hire operator. The contract for car hire is between the partner and the customer. This mirrors the Airbnb/Uber model.

### What Camel issues
- Booking confirmation receipt (PDF + email) to customer — confirms payment to NTUK Ltd as platform intermediary. NOT a VAT invoice for car hire. Both the PDF and email body include a clear "Platform Payment Notice" in EN/ES.
- Commission invoice to partner monthly — Camel invoicing the partner for the platform fee. English only (NTUK legal document).

### What the partner is responsible for
- Issuing VAT invoices to customers for the car hire service. Camel does not do this and cannot do it on behalf of partners.
- This is documented in: partner terms clause 9 (EN+ES), operating rules section 9b (EN+ES), customer terms clause 10b, booking receipt PDF/email notice.

### Invoice Data PDF (Chat 50)
Partners can download a "Booking Data for Invoice Purposes" PDF from their booking detail page (↓ Invoice Data button). This is a data sheet — NOT a VAT invoice — containing all the information the partner needs to raise their own invoice. Generated server-side via @react-pdf/renderer, served via signed Supabase storage URL.

- File: lib/portal/generateInvoiceDataPDF.tsx (camel-portal)
- API route: app/api/partner/bookings/[id]/invoice-data/route.ts (camel-portal)
- Language: EN/ES based on partner_profiles.communication_locale
- Contains: booking ref, customer details (name, email, phone, billing address, tax ID if provided), hire details, financial summary (car hire, fuel, gross total, refunds if any, net total), blank fields for partner to complete their own invoice
- Refund block shown prominently in amber if post-completion refunds exist
- wrap={false} keeps gross total bar + refund box + net total together to prevent page breaks

### Customer billing details (Chat 50)
New optional fields on customer_profiles: billing_address (text), tax_id (text).
Customer fills these in on their account page under "VAT Invoice Details" card.
These flow to: partner booking detail Journey Information card (read-only), invoice data PDF.

```sql
ALTER TABLE customer_profiles ADD COLUMN billing_address text;
ALTER TABLE customer_profiles ADD COLUMN tax_id text;
```

### Documents changed (Chat 50)
| Document | Change |
|---|---|
| camel-customer/lib/portal/generateBookingReceiptPDF.tsx | Platform Payment Notice added to PDF and EN/ES email body. Payment section re-labelled "Payment to Camel Global". |
| camel-customer/app/terms/page.tsx | New clause 10b on invoicing. "Issuing VAT invoices" added to not-responsible list in clause 13. |
| camel-portal/lib/portal/partnerTerms.ts | Clause 9 renamed "VAT, Tax and Invoicing". Three new clauses: partner is supplier; Camel receipt not a VAT invoice; partner must issue VAT invoices on request. Version bumped to 2026-06d. EN+ES. |
| camel-portal/lib/portal/operatingRules.ts | New section 9b "Invoicing Obligations" (EN+ES) — 6 rules covering partner's invoicing responsibility. |
| camel-customer/app/account/page.tsx | New "VAT Invoice Details" card with billing_address and tax_id fields. Saved via customer-profile API. |
| camel-customer/app/api/test-booking/customer-profile/route.ts | GET/POST now includes billing_address and tax_id. |
| camel-portal/app/api/partner/bookings/[id]/route.ts | Fetches customer billing_address and tax_id from customer_profiles and includes in request row as customer_billing_address and customer_tax_id. |
| camel-portal/app/partner/bookings/[id]/page.tsx | Shows customer invoice details in Journey Information card. ↓ Invoice Data button calls invoice-data API route (no client-side jsPDF). |
| camel-portal/lib/portal/generateInvoiceDataPDF.tsx | New file — server-side react-pdf invoice data PDF generator. EN/ES. |
| camel-portal/app/api/partner/bookings/[id]/invoice-data/route.ts | New file — generates invoice data PDF, uploads to Supabase storage, returns signed URL. |

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
| Post-completion refund amended statement | camel-portal app/api/admin/bookings/[id]/post-refund/route.ts | customer_profiles.communication_locale | Inline HTML + amended PDF attachment |
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
Exception: Invoice Data PDF (partner-facing data sheet) is EN/ES based on partner locale — it is not a Camel/NTUK legal document


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
✅ Chat 49 — Refund/Customer Final column translations (bookings.table.col.refund, bookings.table.col.customerFinal, reports.bookings.col.refund, reports.bookings.col.customerFinal)
### Customer
✅ Phase 5 — Customer site (Complete)
✅ Chat 46 — Chat widget EN/ES
✅ Chat 49 — reset.subtitle key added EN+ES
✅ Chat 50 — account.vatDetails.* keys added EN+ES (billing address + tax ID fields)
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

## DB Schema Additions (Chat 49)
```sql
-- Post-completion refunds table
CREATE TABLE partner_booking_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES partner_bookings(id),
  amount numeric NOT NULL,
  reason text,
  stripe_refund_id text,
  created_at timestamptz DEFAULT now()
);

-- Post-completion refund total on bookings
ALTER TABLE partner_bookings ADD COLUMN post_completion_refund_total numeric DEFAULT 0;
```

## DB Schema Additions (Chat 50)
```sql
-- Customer billing details for VAT invoice purposes
ALTER TABLE customer_profiles ADD COLUMN billing_address text;
ALTER TABLE customer_profiles ADD COLUMN tax_id text;
```

## Completion Flow (CRITICAL)

app/api/test-booking/bookings/[id]/update/route.ts (camel-customer) sets booking_status = completed
Calls POST /api/internal/complete-booking on the portal with CRON_SECRET
app/api/internal/complete-booking/route.ts (camel-portal) validates secret and calls completeBooking()
completeBooking() — NOW: retrieves transfer ID from payment intent, reverses partner transfer by fuel refund amount FIRST, then issues Stripe customer refund, sends customer + partner + admin emails with PDF
Partner email language determined by partner_profiles.communication_locale
Customer email language determined by customer_requests.customer_user_id → customer_profiles.communication_locale


## Stripe Payment Architecture (CRITICAL)
### Payment split

Camel always receives exactly the commission amount — Stripe fee never reduces it
Partner payout = car hire − commission + fuel charge − post-completion refunds
Customer final = total paid − fuel refund − post-completion refunds
Camel net income = commission − Stripe fee

### Refund flow (CRITICAL — Chat 49)
ALL refunds (fuel refund on completion AND post-completion refunds) now follow this two-step process:
1. **Reverse the transfer** to the partner's connected account — pulls money back from partner first
2. **Refund the customer** from Camel's main Stripe account

Transfer ID is retrieved from: `stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] })` → `latest_charge.transfer`
Transfer reversal: `stripe.transfers.createReversal(transferId, { amount })`

### Commission calculation rule
NEVER use commission_amount or partner_payout_amount from DB. Always recalculate:
```typescript
const commAmt = Math.max((car_hire_price * commission_rate) / 100, 10);
const pcRefund = Number(post_completion_refund_total ?? 0);
const partnerPayout = Math.max(0, car_hire_price - commAmt + fuel_charge - pcRefund);
const customerFinal = Math.max(0, total_paid - fuel_refund - pcRefund);
```

### Stripe account (CRITICAL)
- Live Stripe account is set up under NTUK Ltd as a Limited Company
- Business model: Marketplace (customers pay Camel Global, Camel pays out to partners)
- Old sandbox account was set up as sole trader — do NOT use it for live
- **Currently running SANDBOX (test) keys** in Vercel — switch to live keys when ready for real payments
- Webhook endpoint (sandbox): https://www.camel-global.com/api/webhooks/stripe — event: payment_intent.succeeded
- STRIPE_WEBHOOK_SECRET is set in camel-customer-live only (that's where the webhook handler lives)
- STRIPE_SECRET_KEY is set in both projects (portal needs it for Connect transfers and refunds)

### Supabase URL Configuration (CRITICAL)
- Site URL: https://www.camel-global.com
- Redirect URLs include: https://portal.camel-global.com/**, https://test.camel-global.com/**, https://www.camel-global.com/reset-password, https://test.camel-global.com/reset-password

## Password Reset Architecture (CRITICAL — Chat 49)
### Customer reset flow
1. Customer clicks "Forgot password" on camel-global.com/login
2. POST /api/auth/send-customer-reset-email — generates Supabase recovery link with redirectTo=NEXT_PUBLIC_SITE_URL/reset-password
3. Email link → /api/auth/exchange-reset-code → redirects to /reset-password
4. /reset-password page (standalone layout — no header) — stores tokens in state, never calls setSession on load
5. On submit: calls setSession with tokens, updateUser, signOut, redirects to /login
6. detectSessionInUrl: false on customer Supabase browser client prevents auto-login
7. PASSWORD_RECOVERY event ignored in ClientRootLayout auth state listener

### Portal partner reset flow
1. Partner clicks "Forgot password" on portal.camel-global.com/partner/login
2. POST /api/auth/send-reset-email with redirectTo=portal.camel-global.com/partner/reset-password
3. Email link goes directly to /partner/reset-password with hash tokens
4. Page reads tokens from hash, stores in state, setSession only at submit time

### Driver reset flow
Same as partner but redirectTo=/driver/reset-password

### NEXT_PUBLIC_SITE_URL (CRITICAL)
- Production: https://www.camel-global.com
- Preview: https://test.camel-global.com
- Must be split into two separate Vercel env vars (Production only + Preview only)

## Post-Completion Refund Architecture (CRITICAL — Chat 49)
### How it works
1. Admin → booking detail → "Post-Completion Refunds" card → enter amount + reason → "Issue Refund & Send Amended Statement"
2. API (post-refund/route.ts):
   - Validates completed status
   - Caps at car_hire + fuel_charge
   - Retrieves transfer ID from Stripe payment intent
   - Reverses partner's transfer by refund amount (pulls money from partner)
   - Issues Stripe refund to customer
   - Inserts into partner_booking_refunds table
   - Updates post_completion_refund_total on partner_bookings
   - Regenerates amended PDF statement
   - Emails customer (EN/ES) with amended statement attached
   - Emails admin with full breakdown
3. "↗ Resend Statement" button on all completed bookings — re-emails current statement (original or amended)
4. Partner sees read-only amber refund block in their booking detail
5. Commission invoices NOT affected by post-completion refunds (by design)

### Where post-completion refunds appear
- Admin booking detail — PaymentFeesCard split into two sections: "What the customer paid" and "Partner payout breakdown"
- Admin booking detail — Post-Completion Refunds card (issue new refund + history)
- Admin bookings list — "Refund" column (amber), "Customer Final" column, "Partner Payout" adjusted
- Admin reports — Revenue & Fuel Reconciliation table: same columns
- Admin reports — Payments/Financial Dashboard table: Refund + Customer Final columns
- Admin CSV exports — Refund + Customer Final columns in both sheets
- Partner booking detail — amber refund banner + read-only refund history
- Partner bookings list — "Refund" column, "Customer Final" column, "Net Payout" adjusted
- Partner reports — Refund + Customer Final columns (translated EN/ES)
- Partner CSV exports — Refund + Customer Final columns
- Customer booking page — amber post-completion refund block showing breakdown
- Customer completion statement PDF — "AMENDED" header, refund lines, net final amount
- Partner invoice data PDF — amber refund box, net total after refunds (Chat 50)

## Column Naming Conventions (Chat 49)
| Concept | Admin bookings | Admin reports | Partner bookings | Partner reports |
|---|---|---|---|---|
| Amount customer paid | Total Paid | Total Paid | Total | Total |
| Post-comp refund | Refund | Refund | Refund (t key) | Refund (t key) |
| Net customer paid | Customer Final | Customer Final | Customer Final (t key) | Customer Final (t key) |
| Partner net | Partner Payout | Partner Payout | Net Payout | Your Payout |

## Payout Hold / Dispute Architecture (CRITICAL — Chat 48)
When a customer raises a dispute or chargeback, admin can place a booking's payout on hold.

### DB columns added (Chat 48):
- partner_bookings.payout_hold boolean DEFAULT false
- partner_bookings.payout_hold_reason text

### How it works:
- On booking completion, payout_status = "ready" — funds sit in Camel's Stripe balance
- Admin goes to admin booking detail → "Payout Hold" card → enters reason → clicks "Hold Payout"
- Monthly cron (app/cron/monthly-payout/route.ts) skips any booking where payout_hold = true
- Once resolved, admin clicks "Release Payout Hold" → booking is included in next monthly run
- Partner sees amber "Payment Disputed" banner on their booking detail — no reason shown
- Admin sees full hold reason + release button

### Where disputed status appears:
- Admin bookings list — amber "Disputed" status pill + "On Hold" payout status pill
- Admin booking detail — amber banner at top + Payout Hold card
- Admin reports — amber "Disputed" pill in both tables, "Disputed" filter option in status dropdown
- Admin reports CSV — Booking Status and Payout Status columns show "Disputed" / "On Hold"
- Admin financial dashboard — "Disputed (N)" card per currency showing held payout amounts
- Partner bookings list — amber "Disputed" status pill
- Partner booking detail — amber "Payment Disputed" banner
- Partner reports — amber "Disputed" pill, "Disputed" filter (translated EN/ES), Disputed summary card per currency
- Partner reports CSV — Booking Status and Payout Status columns show "Disputed" / "On Hold"
- Partner bookings CSV — Payout Hold Yes/No column

### Partner email lookup (CRITICAL):
Partner email is on partner_applications.email (NOT partner_profiles). Admin booking detail fetches it via:
```typescript
const { data: applicationRow } = await db
  .from("partner_applications")
  .select("email")
  .eq("user_id", bookingRow.partner_user_id)
  .maybeSingle();
```

## Fuel Override Architecture (CRITICAL)
Effective fuel = partner override (collection_fuel_level_partner) if set, else driver reading (collection_fuel_level_driver).

## Commission Invoice Architecture (CRITICAL)

Auto-generated: Vercel cron 1st of each month at 08:00 UTC
Date column: uses created_at from partner_bookings
Commission invoices stay in English — NTUK is a UK company
Commission invoices NOT affected by post-completion refunds


## Partner Terms Architecture (CRITICAL)

Single source of truth: lib/portal/partnerTerms.ts
Current version: 2026-06d effective 12 June 2026
Clause 7 includes chargeback/dispute payout hold clause
Clause 9 "VAT, Tax and Invoicing" — includes invoicing obligation (partner must issue VAT invoices to customers)


## Security Architecture

CSP form-action — portal: 'self' only; customer: 'self' https://checkout.stripe.com https://*.stripe.com
Stripe Radar — enabled
2FA: Vercel, GitHub, Supabase, Gmail — all done ✅
Domain Guard — activated on camel-global.com in Fasthosts ✅
SSL — handled by Vercel on all domains ✅


## PDF Logo Architecture

Logo file: ~/camel-portal/public/camel-invoice-logo.png
completeBooking.tsx (portal) — reads from disk via fs.readFileSync
generateCompletionStatementPDF.tsx + generateBookingReceiptPDF.tsx (customer) — fetches from https://portal.camel-global.com/camel-invoice-logo.png
generateInvoiceDataPDF.tsx (portal) — fetches from https://portal.camel-global.com/camel-invoice-logo.png


## Outreach Email Architecture (CRITICAL — Chat 47)
Files: all in camel-portal only.

| File | Purpose |
|---|---|
| app/admin/outreach/page.tsx | Outreach UI — prospect table, country filter, batch send, send again |
| app/api/admin/outreach/send/route.ts | Send logic — hardcoded email body, language by country, daily limit, unsubscribe check |
| app/api/admin/outreach/prospects/route.ts | GET/POST prospects |
| app/api/admin/outreach/prospects/[id]/route.ts | PATCH/DELETE prospect |
| app/api/admin/outreach/unsubscribe/route.ts | Public GET — sets unsubscribed=true, redirects to portal homepage with ?unsubscribed=true banner |
| app/HomePageContent.tsx | Shows unsubscribed banner when ?unsubscribed=true. Also has customer site section linking to camel-global.com. GA outreach CTA click tracking. |
| public/camel-logo-white-new.png | White version of camel logo for use in outreach emails (email clients don't support CSS filter) |

### Outreach email rules
- Sent from: `Camel Global <noreply@camel-global.com>`
- Subject EN: `Camel Global - Meet & Greet Car Hire - Founding Partner Invitation`
- Subject ES: `Camel Global - Meet & Greet Alquiler de Coches - Invitación a Socio Fundador`
- Logo: `https://portal.camel-global.com/camel-logo-white-new.png` — white PNG, no CSS filter needed
- Email body is fully hardcoded — no AI generation. Opening line personalised with contact first name and city.
- Language: Spain → Spanish, all other countries → English
- Daily limit: 50 emails
- UTM params on all links: utm_source=outreach, utm_medium=email, utm_campaign=founding-partner, utm_content=signup-button, utm_term={country-slug}, ref={prospect_id}
- Batch send: pending prospects only, respects country filter, never includes Send Again
- Send Again: manual only, all non-unsubscribed rows, counts towards daily limit
- Unsubscribe: List-Unsubscribe header set on every email (Resend one-click). Link in footer sets unsubscribed=true on prospect record. Unsubscribed prospects are never sent to even on resend.
- DB column: outreach_prospects.unsubscribed boolean (added Chat 47)
- "unsub" badge shown on unsubscribed rows in the table

### GA tracking for outreach (Chat 48)
- UTM params on all email links — GA attributes sessions automatically
- outreach_cta_click event fires on Sign Up CTA clicks (hero, apply, final-cta sections) when utm_source=outreach
- partner_signup_complete event fires on application-submitted page when status=pending
- Both events pass utm_term (country) and utm_campaign for breakdown in GA

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
| NEXT_PUBLIC_SITE_URL (Production) | camel-customer (Vercel) | https://www.camel-global.com |
| NEXT_PUBLIC_SITE_URL (Preview) | camel-customer (Vercel) | https://test.camel-global.com |
| STRIPE_SECRET_KEY | both projects | **Currently test/sandbox keys** — switch to sk_live_... when ready for real payments |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | camel-customer | **Currently test/sandbox key** — switch to pk_live_... when ready |
| STRIPE_WEBHOOK_SECRET | camel-customer only | **Currently test webhook secret** — switch to live when ready |
| PORTAL_BASE_URL | camel-portal | https://portal.camel-global.com |

## Email Addresses
| Address | Type | Forwards to |
|---|---|---|
| info@camel-global.com | Mailbox (Mail Lite, Fasthosts) | Gmail via POP |
| contact@camel-global.com | Forwarder | artur@ + info@ |
| partners@camel-global.com | Forwarder | artur@ + info@ |
| noreply@camel-global.com | Forwarder | info@ + artur@ |
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
| v-stable-chat48-complete | Chat 48 complete — GA tracking, payout hold dispute system, Stripe live setup |
| v-stable-chat49-complete | Chat 49 — post-completion refunds, amended statements, resend statement, full reporting |
| v-stable-chat49-reset-password | Chat 49 — all reset password pages fixed and rebranded |
| v-stable-chat49-refunds | Chat 49 — transfer reversals on all refunds, admin/partner columns fixed, customer booking page updated |
| v-stable-chat50-complete | Chat 50 — invoicing obligations across all docs, VAT invoice data PDF EN/ES, customer billing details |

### Customer (~/camel-customer)
| Tag | Description |
|---|---|
| v-stable-chat39-complete | Chat 39 complete |
| v-stable-chat43-phase5-i18n | Chat 43 — Phase 5 complete |
| v-stable-chat44-complete | Chat 44 complete |
| v-stable-chat45-email-locale | Chat 45 complete — all emails locale-aware |
| v-stable-chat46-complete | Chat 46 complete — chat widget full EN/ES |
| v-stable-chat49-reset-password | Chat 49 — customer reset fixed, detectSessionInUrl disabled, coming-soon removed, site live |
| v-stable-chat49-refunds | Chat 49 — customer booking page shows post-completion refunds, downloadable PDF amended |
| v-stable-chat50-complete | Chat 50 — platform notice on receipt PDF/email, customer terms invoicing clause, customer billing details, VAT invoice details account card |

## Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat50-complete
cd ~/camel-customer && git checkout v-stable-chat50-complete
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
Fuel refund on completion — Stripe transfer reversal THEN customer refund (Chat 49)
Post-completion refunds — Stripe transfer reversal THEN customer refund, amended PDF emailed, shown everywhere (Chat 49)
All customer notification emails EN/ES
All partner notification emails EN/ES
PDF attachments always English (except invoice data PDF which is EN/ES — Chat 50)
Chat widget EN/ES — UI strings, AI replies, and locale sent correctly in both portal and customer
Review reminder email
Completion statement PDF + booking receipt PDF
Amended completion statement PDF — shows when post-completion refunds exist
Live status system — 7 checks
Partner onboarding — 7 steps
Commission invoices — auto-generated monthly
Partner terms — single source of truth lib/portal/partnerTerms.ts version 2026-06d (includes chargeback clause + invoicing obligations)
Operating rules — includes chargeback/dispute payout hold clause EN+ES + invoicing obligations section 9b EN+ES
Security — CSP, Stripe Radar, 2FA, Domain Guard all done
Partner outreach — country filter, batch send, send again, unsubscribe, language by country, hardcoded email body, white logo, founding partner messaging, noreply@ sender, UTM tracking
GA tracking — outreach UTM params, CTA click events, partner signup complete event
Payout hold / dispute system — admin can hold/release per booking, cron skips held bookings, disputed status shown everywhere, all CSVs updated, financial dashboard disputed card
Stripe sandbox — NTUK Ltd limited company account, marketplace model, sandbox keys in Vercel, webhook configured
Site live — camel-global.com coming-soon removed, fully live (Chat 49)
Password reset — all three flows (customer, partner, driver) fixed and rebranded black/orange (Chat 49)
404 pages — rebranded black/orange on both portal and customer (Chat 49)
Admin bookings page — Payout Status, Total Paid, Refund, Customer Final columns; two-section PaymentFeesCard (Chat 49)
Admin reports page — matching columns to bookings page; payments table updated (Chat 49)
Partner bookings page — Refund, Customer Final columns EN/ES translated (Chat 49)
Partner reports page — Refund, Customer Final columns, correct payout calculations (Chat 49)
All CSV exports — Refund and Customer Final columns in admin and partner (Chat 49)
Customer booking page — post-completion refund block shown (Chat 49)
Downloadable completion statement — amended version with refund lines (Chat 49)
Resend Statement button — on all completed bookings in admin (Chat 49)
Invoicing obligations — documented in partner terms, operating rules, customer terms, booking receipt PDF/email (Chat 50)
Customer billing address + tax ID — optional fields on customer account, shown on partner booking detail, included in invoice data PDF (Chat 50)
Invoice Data PDF — ↓ Invoice Data button on partner booking detail, server-side react-pdf, EN/ES, includes refunds, signed URL download (Chat 50)


## What Needs Building — Next Chat (Chat 51)
🔲 Test full booking flow end-to-end with Stripe sandbox (new booking, not existing test ones)
🔲 Verify transfer reversal works correctly — partner connected account balance reduces on refund
🔲 Switch Stripe keys to live when sandbox testing complete
🔲 First real partner onboarding in live Stripe Connect mode
🔲 Live end-to-end test booking with real card

🔲 Lower priority (deferred)
Commission invoice PDF — VAT number + 20% UK VAT once NTUK is VAT registered
Xero monthly commission endpoint
DAC7 EU platform reporting
Outreach: set up e.camel-global.com subdomain in Resend for better domain protection (needs Resend plan upgrade)

❌ Phase 6 — Future languages (Future)
IT, PT, FR, DE — copy en.json to new locale file in both repos, translate values, add locale to LanguageContext.tsx (one line each repo). Also update email templates in both lib/email.ts files.

## Collaborator Note
A collaborator works on camel-portal from Windows (C:/dev/camel-portal). He built the Partner Outreach Agent (/admin/outreach). Always git pull before starting.
Note: camel-coming-soon is a git submodule inside camel-portal. Always shows as modified in git status — ignore it. Use git add <specific-file> to avoid submodule conflicts.

## Session Log

### Chat 50 (Completed)
Invoicing obligations, VAT invoice data PDF, customer billing details

**Legal / invoicing framework:**
- Established Camel as marketplace intermediary — partner is the supplier, partner issues VAT invoices to customers (mirrors Airbnb/Uber model)
- Partner terms clause 9 renamed "VAT, Tax and Invoicing" — three new clauses covering invoicing obligation (EN+ES). Version bumped to 2026-06d.
- Operating rules new section 9b "Invoicing Obligations" (EN+ES) — 6 rules
- Customer terms new clause 10b "Booking receipt and VAT invoices" — clarifies Camel receipt is not a VAT invoice
- Customer terms clause 13 "not responsible for" list — added issuing VAT invoices

**Booking receipt PDF/email updates (camel-customer):**
- Platform Payment Notice added to PDF (grey box) and EN/ES email bodies
- Payment section header changed to "Payment to Camel Global" / "Total paid to Camel Global"

**Customer billing details:**
- DB: billing_address and tax_id columns added to customer_profiles
- Customer account page — new "VAT Invoice Details" card (EN/ES via i18n keys account.vatDetails.*)
- customer-profile API route — GET/POST now includes billing_address and tax_id
- Portal partner booking API route — fetches billing_address and tax_id from customer_profiles, included in response as customer_billing_address and customer_tax_id
- Partner booking detail page — shows customer invoice details in Journey Information card (read-only)

**Invoice Data PDF (camel-portal):**
- New file: lib/portal/generateInvoiceDataPDF.tsx — server-side @react-pdf/renderer
- New route: app/api/partner/bookings/[id]/invoice-data/route.ts — generates PDF, uploads to Supabase storage, returns 60s signed URL
- ↓ Invoice Data button on partner booking detail calls API route and opens signed URL in new tab (no client-side jsPDF)
- PDF is EN/ES based on partner_profiles.communication_locale
- Contains: booking ref, customer details (incl. billing address + tax ID if provided), hire details, financial summary, refund box (amber, if refunds exist), net total, blank fields for partner to complete
- wrap={false} keeps gross total bar + refund box + net total together on same page
- Uploaded to booking-receipts bucket: {request_id}/invoice-data-{ref}.pdf

Stable tags: v-stable-chat50-complete on both repos

### Chat 49 (Completed)
Post-completion refund system, site go-live, password reset fixes, reporting improvements
Stable tags: v-stable-chat49-complete, v-stable-chat49-reset-password, v-stable-chat49-refunds on both repos

### Chat 48 (Completed)
GA tracking, payout hold dispute system, Stripe live setup, portal homepage improvements
Stable tag: v-stable-chat48-complete on camel-portal

### Chat 47 (Completed)
Partner outreach improvements
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

# Multiline replacements — use Python3 heredoc (multiline sed never works in zsh)
python3 << 'EOF'
with open('/path/to/file.tsx', 'r') as f:
    content = f.read()
content = content.replace('old text', 'new text')
with open('/path/to/file.tsx', 'w') as f:
    f.write(content)
print("Done")
EOF

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

# Switch Stripe from sandbox to live (when ready)
# In Vercel camel-customer-live AND camel-portal-live:
# STRIPE_SECRET_KEY → sk_live_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY → pk_live_... (customer only)
# STRIPE_WEBHOOK_SECRET → whsec_... from live webhook endpoint (customer only)
# Then redeploy both projects
```

Last updated: Chat 50 complete — invoicing obligations across all documents, VAT invoice data PDF (EN/ES, server-side react-pdf), customer billing address + tax ID fields, platform payment notice on booking receipt PDF/email.
