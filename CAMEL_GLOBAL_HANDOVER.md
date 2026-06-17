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
| lib/i18n/locales/en.json | English strings — all translated pages. Flat key-value format (e.g. "settings.language.label": "Language") — NOT nested objects. Includes bookings.table.col.refund, bookings.table.col.customerFinal, reports.bookings.col.refund, reports.bookings.col.customerFinal. Includes bookings.detail.payment.postCompletion* keys (Chat 51). |
| lib/i18n/locales/es.json | Spanish strings — same flat format. Includes translations for refund/customerFinal columns and postCompletion* keys (Chat 51). |

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
| app/api/webhooks/stripe/route.ts | Stripe webhook — handles payment_intent.succeeded. Looks up both customer and partner locale, sends all emails in correct language. Passes locale to sendBookingReceiptEmail. Fires GA4 purchase event via Measurement Protocol after booking confirmed. |
| app/api/test-booking/customer-profile/route.ts | GET + POST. GET reads full_name, phone, communication_locale, billing_address, tax_id. POST upserts including optional communication_locale, billing_address, tax_id. Uses onConflict: "user_id" and selective field updates. |
| app/api/chat/route.ts | Customer chat API — reads locale from request body, passes to system prompt so AI replies in correct language. |
| app/api/test-booking/requests/[id]/route.ts | GET booking detail — ownership enforced via .eq("customer_user_id", customerUser.id). Includes post_completion_refund_total and postCompletionRefunds array. |
| app/api/test-booking/bookings/[id]/completion-statement/route.ts | Generates downloadable completion statement PDF — fetches partner_booking_refunds from portal DB, passes to PDF generator. Shows amended statement when refunds exist. |
| app/bookings/[id]/page.tsx | Customer booking detail — shows post-completion refund block in amber when refunds exist. |
| app/account/page.tsx | Customer account page — includes VAT Invoice Details card with billing_address and tax_id fields (EN/ES via i18n). These are optional — only needed if customer wants a VAT invoice from the car hire company. |
| app/terms/page.tsx | Customer terms of use — includes clause 10b "Booking receipt and VAT invoices" clarifying Camel receipt is platform payment confirmation not a VAT invoice. Also added to "not responsible for" list in clause 13. |
| middleware.ts | Passes through all requests (NextResponse.next()). No server-side auth gate — relies on API route auth + client-side redirects. See Future Work for planned middleware improvement. |

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

## GA4 Tracking Architecture (CRITICAL — Chat 51)

### Customer site (camel-global.com) — G-1Y758X38G4
- GA script injected in root layout — all page views tracked automatically
- Test site uses separate property G-G90QB28J12 — test traffic never pollutes live data
- Cookie consent gates analytics — CookieBanner fires analytics_storage: granted on accept
- **Ecommerce tracking** — GA4 `purchase` event fired server-side via Measurement Protocol on every confirmed booking
  - File: app/api/webhooks/stripe/route.ts
  - GA4 Measurement ID: G-1Y758X38G4
  - API Secret: m8xBZ_30QNqmKliAbvC04A (stored in code — move to env var if rotating)
  - Fields: transaction_id (job number), value (total paid), currency, camel_commission (custom param), items (Car Hire + Fuel Deposit)
  - Fires after booking insert succeeds — never blocks webhook response
  - Visible in GA4 → Reports → Monetisation → Ecommerce purchases (24-48hr delay)

### Portal (portal.camel-global.com) — G-YCZMDQJDM7
- GA script injected in root layout — all page views tracked automatically
- No cookie consent gate (partner/admin facing — lower GDPR risk)
- outreach_cta_click custom event — fires on hero/apply/final-cta button clicks when utm_source=outreach
- partner_signup_complete custom event — fires on application-submitted page

### Outreach email tracking
- All links have UTM params: utm_source=outreach&utm_medium=email&utm_campaign=founding-partner&utm_content=signup-button&utm_term={country}&ref={prospect_id}
- GA attributes sessions automatically when recipients click through

## Security Architecture (CRITICAL — Chat 51)

### URL tamper protection — confirmed secure
- Customer API routes enforce ownership: `.eq("customer_user_id", customerUser.id)` — guessing another customer's booking URL returns 404
- Partner API routes enforce ownership: `.eq("partner_user_id", userId)` unless adminMode — guessing another partner's booking URL returns 404
- Identity always comes from verified JWT token — never from URL params or request body
- Returns 404 (not 403) on ownership mismatch — correct security practice (don't confirm resource exists)

### robots.txt — confirmed correct
- Customer site: allows all public pages, blocks /bookings/, /account/, /reset-password/, /api/
- Portal: allows /, /partner/signup, /partner/terms, /partner/privacy only. Blocks /partner/, /admin/, /driver/, /api/
- Test sites: block everything (noindex)

### Middleware — no server-side auth gate (by design)
- Both repos currently use pass-through middleware (NextResponse.next())
- Auth is enforced at API route level (correct and sufficient)
- Client-side redirects handle unauthenticated page access
- Server-side middleware auth gate is deferred — see Future Work
- Reason: Supabase cookie names vary by project, risk of breaking logged-in users on live site outweighs benefit

### Other security
- CSP form-action — portal: 'self' only; customer: 'self' https://checkout.stripe.com https://*.stripe.com
- Stripe Radar — enabled
- 2FA: Vercel, GitHub, Supabase, Gmail — all done ✅
- Domain Guard — activated on camel-global.com in Fasthosts ✅
- SSL — handled by Vercel on all domains ✅
- press@camel-global.com forwarder referenced in contact form route — verify this exists in Fasthosts

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
✅ Chat 49 — Refund/Customer Final column translations
✅ Chat 51 — Post-completion refund strings in partner booking detail (bookings.detail.payment.postCompletion* keys EN+ES)
### Customer
✅ Phase 5 — Customer site (Complete)
✅ Chat 46 — Chat widget EN/ES
✅ Chat 49 — reset.subtitle key added EN+ES
✅ Chat 50 — account.vatDetails.* keys added EN+ES
❌ Phase 6 — Future languages (Future)

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
CREATE TABLE partner_booking_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES partner_bookings(id),
  amount numeric NOT NULL,
  reason text,
  stripe_refund_id text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE partner_bookings ADD COLUMN post_completion_refund_total numeric DEFAULT 0;
```

## DB Schema Additions (Chat 50)
```sql
ALTER TABLE customer_profiles ADD COLUMN billing_address text;
ALTER TABLE customer_profiles ADD COLUMN tax_id text;
```

## DB State (Chat 51)
- All sandbox test data deleted — clean slate for live
- 4 auth users kept: nicktrin@gmail.com (super_admin + customer), nickt@esposti.co.uk (admin), artur.kzn2006@gmail.com (partner), nicktrin+103@gmail.com (driver)
- 3 partner profiles, 3 partner applications, 0 bookings, 0 requests
- Job number sequence left at 1000166 — next real booking will be #1000167
- global_job_number_seq — use this name, not job_number_seq

## Completion Flow (CRITICAL)

app/api/test-booking/bookings/[id]/update/route.ts (camel-customer) sets booking_status = completed
Calls POST /api/internal/complete-booking on the portal with CRON_SECRET
app/api/internal/complete-booking/route.ts (camel-portal) validates secret and calls completeBooking()
completeBooking() — retrieves transfer ID from payment intent, reverses partner transfer by fuel refund amount FIRST, then issues Stripe customer refund, sends customer + partner + admin emails with PDF

## Stripe Payment Architecture (CRITICAL)
### Payment split

Camel always receives exactly the commission amount — Stripe fee never reduces it
Partner payout = car hire − commission + fuel charge − post-completion refunds
Customer final = total paid − fuel refund − post-completion refunds
Camel net income = commission − Stripe fee

### Refund flow (CRITICAL — Chat 49 + Chat 51)
ALL refunds follow this two-step process:
1. **Reverse the transfer** to the partner's connected account — pulls money back from partner first
2. **Refund the customer** from Camel's main Stripe account

**Post-completion refund transfer reversal (CRITICAL — Chat 51 fix):**
- Route fetches actual transfer from Stripe: `stripe.transfers.retrieve(transferId, { expand: ["reversals"] })`
- Uses `transfer.amount_reversed` (authoritative Stripe value) to calculate what's left: `availableCents = transfer.amount - transfer.amount_reversed`
- Reverses only `Math.min(requestedAmount, availableAmount)` from partner
- Refunds full requested amount to customer regardless — any shortfall absorbed from Camel's commission balance
- This prevents the 400 ERR that occurred when trying to reverse more than the partner had available
- Admin email shows "Reversed from partner" and "Absorbed by Camel" for audit trail

### Commission calculation rule
NEVER use commission_amount or partner_payout_amount from DB. Always recalculate:
```typescript
const commAmt = Math.max((car_hire_price * commission_rate) / 100, 10);
const pcRefund = Number(post_completion_refund_total ?? 0);
const partnerPayout = Math.max(0, car_hire_price - commAmt + fuel_charge - pcRefund);
const customerFinal = Math.max(0, total_paid - fuel_refund - pcRefund);
```

### Stripe account (CRITICAL)
- Live Stripe account — NTUK Ltd Limited Company, marketplace model
- **LIVE keys now active in Vercel** (switched Chat 51)
- Webhook endpoint: https://www.camel-global.com/api/webhooks/stripe — event: payment_intent.succeeded
- STRIPE_WEBHOOK_SECRET is set in camel-customer-live only
- STRIPE_SECRET_KEY is set in both projects
- Live test booking #1000167 confirmed working — €15 payment, transfer reversal, fuel refund all correct

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

## Post-Completion Refund Architecture (CRITICAL — Chat 49 + Chat 51)
### How it works
1. Admin → booking detail → "Post-Completion Refunds" card → enter amount + reason → "Issue Refund & Send Amended Statement"
2. API (post-refund/route.ts) — fetches real transfer balance from Stripe, reverses only what partner has, refunds full amount to customer, emails customer + admin
3. "↗ Resend Statement" button on all completed bookings
4. Partner sees read-only amber refund block
5. Commission invoices NOT affected by post-completion refunds

### Where post-completion refunds appear
- Admin booking detail, bookings list, reports, CSV exports
- Partner booking detail (amber banner + history, EN/ES translated — Chat 51), bookings list, reports, CSV exports
- Customer booking page, completion statement PDF

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
- Partner sees amber "Payment Disputed" banner — no reason shown
- Admin sees full hold reason + release button

### Partner email lookup (CRITICAL):
Partner email is on partner_applications.email (NOT partner_profiles).

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
Clause 7: chargeback/dispute payout hold clause
Clause 9 "VAT, Tax and Invoicing": invoicing obligation (partner must issue VAT invoices to customers)

## Map z-index Fix (Chat 51)
Leaflet maps were rendering above the sidebar/header on scroll. Fixed by adding `style={{ zIndex: 0, position: "relative" }}` to the map wrapper div in:
- app/partner/profile/MapPickerInner.tsx
- app/admin/approvals/PartnersMap.tsx

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
| app/HomePageContent.tsx | Shows unsubscribed banner when ?unsubscribed=true. GA outreach CTA click tracking. |
| public/camel-logo-white-new.png | White version of camel logo for outreach emails |

### Outreach email rules
- Sent from: `Camel Global <noreply@camel-global.com>`
- Language: Spain → Spanish, all other countries → English
- Daily limit: 50 emails
- UTM params on all links: utm_source=outreach, utm_medium=email, utm_campaign=founding-partner, utm_content=signup-button, utm_term={country-slug}, ref={prospect_id}
- Unsubscribed prospects are never sent to

## Contact Form Routing (Chat 51)
File: app/api/contact/route.ts (camel-portal)
| Subject | Routes to |
|---|---|
| General enquiry | contact@camel-global.com |
| Booking question | contact@camel-global.com |
| Partnership / become a partner | partners@camel-global.com |
| Press or media | press@camel-global.com |
| Technical issue | contact@camel-global.com |
| Other | contact@camel-global.com |
⚠️ press@camel-global.com is referenced in code — verify this forwarder exists in Fasthosts

## Environment Variables (CRITICAL)
| Variable | Repo | Value |
|---|---|---|
| NEXT_PUBLIC_SITE_URL (Production) | camel-customer (Vercel) | https://www.camel-global.com |
| NEXT_PUBLIC_SITE_URL (Preview) | camel-customer (Vercel) | https://test.camel-global.com |
| STRIPE_SECRET_KEY | both projects | **LIVE keys active** — sk_live_...z3pe |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | camel-customer | **LIVE key active** |
| STRIPE_WEBHOOK_SECRET | camel-customer only | **LIVE webhook secret active** |
| PORTAL_BASE_URL | camel-portal | https://portal.camel-global.com |

## Email Addresses
| Address | Type | Forwards to |
|---|---|---|
| info@camel-global.com | Mailbox (Mail Lite, Fasthosts) | Gmail via POP |
| contact@camel-global.com | Forwarder | artur@ + info@ |
| partners@camel-global.com | Forwarder | artur@ + info@ |
| noreply@camel-global.com | Forwarder | info@ + artur@ |
| email@camel-global.com | Forwarder | nicktrin@gmail.com + artur@ |
| press@camel-global.com | Forwarder? | Verify exists in Fasthosts |

## Stable Tags
### Portal (~/camel-portal)
| Tag | Description |
|---|---|
| v-stable-chat49-refunds | Chat 49 — transfer reversals, admin/partner columns |
| v-stable-chat50-complete | Chat 50 — invoicing obligations, VAT invoice data PDF EN/ES |
| v-stable-chat50-post-completion-i18n | Chat 50 — post-completion refund strings translated EN/ES |
| v-stable-chat51-live-stripe | Chat 51 — live Stripe, DB cleanup, post-refund transfer reversal fix, map z-index, GA4 ecommerce, robots confirmed |

### Customer (~/camel-customer)
| Tag | Description |
|---|---|
| v-stable-chat49-refunds | Chat 49 — customer booking page, amended PDF |
| v-stable-chat50-complete | Chat 50 — platform notice on receipt, billing details, VAT account card |
| v-stable-chat51-live-stripe | Chat 51 — live Stripe, GA4 ecommerce purchase tracking |

## Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat51-live-stripe
cd ~/camel-customer && git checkout v-stable-chat51-live-stripe
```

## What Is Working ✅

Customer booking flow — all screen sizes, guest booking draft survives redirect
Partner bid submission and management
Driver job portal — EN/ES, step order enforced
Admin approval and account management
Full EUR / GBP / USD currency support + live exchange rates
Full commission system (20% min €10)
Fuel level recording, override, charge/refund calculation
Fuel refund on completion — transfer reversal THEN customer refund
Post-completion refunds — transfer reversal uses Stripe transfer.amount_reversed for accuracy (Chat 51 fix)
All customer + partner notification emails EN/ES
PDF attachments always English (except invoice data PDF EN/ES)
Chat widget EN/ES — both portal and customer
Review reminder email
Completion statement PDF + booking receipt PDF + amended statement PDF
Invoice Data PDF — EN/ES, server-side react-pdf, signed URL download
Live status system — 7 checks
Partner onboarding — 7 steps
Commission invoices — auto-generated monthly
Partner terms v2026-06d — chargeback clause + invoicing obligations
Operating rules — chargeback clause + invoicing obligations section 9b EN+ES
Security — CSP, Stripe Radar, 2FA, Domain Guard, URL ownership enforced at API level
Partner outreach — full system with UTM tracking, EN/ES, unsubscribe
GA tracking — page views on all pages (both sites), ecommerce purchase events (Chat 51), outreach CTA events
Payout hold / dispute system — full admin/partner visibility
**Live Stripe — switched to live keys Chat 51, first live booking #1000167 confirmed working**
Site live — camel-global.com fully live
Password reset — all three flows working
robots.txt — confirmed correct for SEO requirements
Map z-index — fixed, maps no longer overlap sidebar/header (Chat 51)
Post-completion refund strings — fully translated EN/ES in partner booking detail (Chat 51)
DB — clean slate, all sandbox data deleted, 4 accounts kept, job sequence at 1000166

## Future Work (Deferred)
🔲 **Server-side middleware auth gate** — currently middleware passes through all requests. A proper server-side redirect for unauthenticated users hitting /partner/, /admin/, /driver/, /bookings/, /account/ would be cleaner. Deferred because Supabase cookie names vary by project and risk of breaking logged-in users on live site. When implementing: use Supabase official Next.js middleware helper, test on staging first.
🔲 Commission invoice PDF — VAT number + 20% UK VAT once NTUK is VAT registered
🔲 Xero monthly commission endpoint
🔲 DAC7 EU platform reporting
🔲 Outreach: set up e.camel-global.com subdomain in Resend (needs Resend plan upgrade)
🔲 press@camel-global.com — verify forwarder exists in Fasthosts
❌ Phase 6 — Future languages: IT, PT, FR, DE

## Collaborator Note
A collaborator works on camel-portal from Windows (C:/dev/camel-portal). He built the Partner Outreach Agent (/admin/outreach). Always git pull before starting.
Note: camel-coming-soon is a git submodule inside camel-portal. Always shows as modified in git status — ignore it. Use git add <specific-file> to avoid submodule conflicts.

## Session Log

### Chat 51 (Completed)
Live Stripe switch, DB cleanup, post-refund fix, GA4 ecommerce, security review, map fix, i18n fixes

**Live Stripe:**
- Switched from sandbox to live keys in Vercel (both camel-customer-live and camel-portal-live)
- Live secret key: sk_live_...z3pe (no expiry, created Jun 15)
- First live test booking #1000167 — €15 payment, commission €10, fuel refund €2.50 — all confirmed working in Stripe dashboard
- Connected account (Nick Test Cars) onboarded with Transferwise EUR bank account

**DB cleanup:**
- Deleted all 48 sandbox partner accounts and 122 bookings
- Kept: nicktrin@gmail.com (super_admin), nickt@esposti.co.uk (admin), artur.kzn2006@gmail.com (partner), nicktrin+103@gmail.com (driver)
- All requests, bids, bookings, refunds, reviews wiped clean
- Job number sequence left at 1000166 — next booking is #1000167

**Post-completion refund fix (CRITICAL):**
- Bug: transfer reversal was failing with 400 ERR because code calculated partner available balance incorrectly (used full payment amount instead of actual transfer amount)
- Fix: now fetches actual transfer from Stripe API, reads transfer.amount_reversed directly, calculates availableCents = transfer.amount - transfer.amount_reversed
- Only reverses what partner actually has — shortfall absorbed from Camel's commission balance
- Customer always gets full refund regardless
- File: app/api/admin/bookings/[id]/post-refund/route.ts

**GA4 ecommerce tracking:**
- Added GA4 Measurement Protocol purchase event to Stripe webhook
- Fires server-side after every confirmed booking
- Measurement ID: G-1Y758X38G4, API Secret: m8xBZ_30QNqmKliAbvC04A
- File: app/api/webhooks/stripe/route.ts (camel-customer)

**Map z-index fix:**
- Leaflet maps were overlapping sidebar and header on scroll
- Fixed with style={{ zIndex: 0, position: "relative" }} on wrapper divs
- Files: app/partner/profile/MapPickerInner.tsx, app/admin/approvals/PartnersMap.tsx

**Post-completion refund i18n:**
- Hardcoded English strings in partner booking detail PaymentFeesCard translated to EN/ES
- 7 new keys added to both en.json and es.json: postCompletionTitle, postCompletionRefund, postCompletionTotal, postCompletionNet, postCompletionNote, postCompletionBannerTitle, postCompletionBannerBody

**Security review:**
- Confirmed URL tamper protection — all API routes enforce ownership via JWT
- Confirmed robots.txt correct for SEO requirements
- Confirmed GA tracking working on all pages in both repos
- Deferred server-side middleware auth gate — not worth the risk on live site

**Confirmed working (Chat 51):**
- Contact form routes: most subjects → contact@camel-global.com, partnership → partners@camel-global.com, press → press@camel-global.com
- Stripe application fee = Camel commission (€10 on test booking) — correct
- Stripe balance mechanics understood — negative balance during settlement period is normal

Stable tags: v-stable-chat51-live-stripe on both repos

### Chat 50 (Completed)
Invoicing obligations, VAT invoice data PDF, customer billing details
Stable tags: v-stable-chat50-complete, v-stable-chat50-post-completion-i18n on portal; v-stable-chat50-complete on customer

### Chat 49 (Completed)
Post-completion refund system, site go-live, password reset fixes, reporting improvements
Stable tags: v-stable-chat49-complete, v-stable-chat49-reset-password, v-stable-chat49-refunds on both repos

### Chat 48 (Completed)
GA tracking, payout hold dispute system, Stripe live setup
Stable tag: v-stable-chat48-complete on camel-portal

### Chat 47 (Completed)
Partner outreach improvements
Stable tag: v-stable-chat47-complete on camel-portal

### Chat 46 (Completed)
Driver step order enforcement + Chat widget full EN/ES
Stable tags: v-stable-chat46-complete on both repos

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

# Check job number sequence
SELECT last_value FROM global_job_number_seq;

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

# IMPORTANT: camel-coming-soon is a submodule — always shows modified, ignore it.
git add app/path/to/file.tsx && git commit -m "message" && git push origin main

# Making small text changes to deployed files — use sed directly on disk, verify with grep, then commit
sed -i '' 's/old text/new text/' ~/camel-portal/path/to/file.ts
grep -n "new text" ~/camel-portal/path/to/file.ts
git add path/to/file.ts && git commit -m "message" && git push origin main

# Switch Stripe from live back to sandbox (if needed for testing)
# In Vercel camel-customer-live AND camel-portal-live:
# STRIPE_SECRET_KEY → sk_test_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY → pk_test_... (customer only)
# STRIPE_WEBHOOK_SECRET → whsec_... from test webhook endpoint (customer only)
# Then redeploy both projects
```

Last updated: Chat 51 complete — live Stripe active, DB cleaned, post-refund transfer reversal fixed, GA4 ecommerce tracking, map z-index fixed, post-completion refund strings translated EN/ES, security confirmed, robots confirmed.
