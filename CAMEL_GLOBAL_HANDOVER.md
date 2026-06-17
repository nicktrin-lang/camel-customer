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
| lib/i18n/locales/en.json | English strings — all translated pages. Flat key-value format — NOT nested objects. Includes bookings.detail.payment.postCompletion* keys (Chat 51). |
| lib/i18n/locales/es.json | Spanish strings — same flat format. Includes postCompletion* keys (Chat 51). |

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
| lib/i18n/locales/en.json | Customer EN strings — flat key-value format. Includes reset.subtitle key. Includes account.vatDetails.* keys. |
| lib/i18n/locales/es.json | Customer ES strings — flat key-value format. Includes reset.subtitle and account.vatDetails.* keys. |
| lib/email.ts | Customer email sender — brandEmail() pattern, EN/ES for all 3 customer emails. PDFs stay English (NTUK). |
| app/ClientRootLayout.tsx | Global layout — LanguageProvider wraps InnerLayout. InnerLayout calls useLanguage() and passes locale to ChatWidget via key={locale}. PASSWORD_RECOVERY auth event ignored. |
| app/reset-password/layout.tsx | Standalone layout for reset password page — bypasses ClientRootLayout entirely. |
| app/page.tsx | Customer homepage — has its own inline nav. Auth-aware on both mobile and desktop. |
| app/api/webhooks/stripe/route.ts | Stripe webhook — handles payment_intent.succeeded. Sends all emails in correct language. Fires GA4 purchase event via Measurement Protocol after booking confirmed. |
| app/api/test-booking/customer-profile/route.ts | GET + POST. Includes billing_address, tax_id, communication_locale. |
| app/api/test-booking/requests/[id]/route.ts | GET booking detail — ownership enforced via .eq("customer_user_id", customerUser.id). Includes postCompletionRefunds. |
| app/api/test-booking/bookings/[id]/completion-statement/route.ts | Generates completion statement PDF — shows amended version when refunds exist. |
| app/bookings/[id]/page.tsx | Customer booking detail — shows post-completion refund block in amber when refunds exist. |
| app/account/page.tsx | Customer account page — includes VAT Invoice Details card with billing_address and tax_id fields (EN/ES). |
| app/terms/page.tsx | Customer terms — includes clause 10b on invoicing, clause 13 not-responsible list updated. |
| middleware.ts | Passes through all requests (NextResponse.next()). No server-side auth gate — see Future Work. |

## Invoicing / VAT Architecture (CRITICAL — Chat 50)

### Legal position
Camel Global is a marketplace intermediary — not a car hire operator. The contract for car hire is between the partner and the customer.

### What Camel issues
- Booking confirmation receipt (PDF + email) to customer — NOT a VAT invoice. Both PDF and email include a "Platform Payment Notice" in EN/ES.
- Commission invoice to partner monthly — English only (NTUK legal document).

### What the partner is responsible for
- Issuing VAT invoices to customers for the car hire service.
- Documented in: partner terms clause 9 (EN+ES), operating rules section 9b (EN+ES), customer terms clause 10b, booking receipt PDF/email.

### Invoice Data PDF
- File: lib/portal/generateInvoiceDataPDF.tsx (camel-portal)
- API route: app/api/partner/bookings/[id]/invoice-data/route.ts
- Language: EN/ES based on partner_profiles.communication_locale
- wrap={false} keeps gross total bar + refund box + net total together

### Customer billing details
```sql
ALTER TABLE customer_profiles ADD COLUMN billing_address text;
ALTER TABLE customer_profiles ADD COLUMN tax_id text;
```

## Chat Widget Architecture (CRITICAL)

ChatWidget.tsx exists in both repos but is NOT identical.
Both use key={locale} on ChatWidget to force remount when language changes.
localeRef ensures the send closure always sends the current locale to the API.
⚠️ Never use useLanguage() outside LanguageProvider.

## Email Architecture (CRITICAL)
Rule: Notification emails = customer's language. PDF attachments = always English (NTUK legal documents).

### Customer-facing emails:
| Email | Sent from | Locale source |
|---|---|---|
| Bid received | camel-portal app/api/partner/bids/route.ts | customer_profiles.communication_locale |
| Booking confirmed + receipt PDF | camel-customer Stripe webhook | customer_profiles.communication_locale |
| Completion email | camel-portal completeBooking.tsx | customer_profiles.communication_locale |
| Post-completion refund | camel-portal post-refund/route.ts | customer_profiles.communication_locale |
| Review reminder | camel-portal cron/review-reminder/route.ts | customer_profiles.communication_locale |

### Partner-facing emails:
| Email | Sent from | Locale source |
|---|---|---|
| New booking confirmed | camel-customer Stripe webhook | partner_profiles.communication_locale |
| Booking completion + payout | camel-portal completeBooking.tsx | partner_profiles.communication_locale |
| Application / approval / live | camel-portal admin routes | partner_profiles.communication_locale |

### CRITICAL: Customer locale lookup pattern
```typescript
const { data: custProfile } = await db
  .from("customer_profiles")
  .select("communication_locale")
  .eq("user_id", request.customer_user_id)
  .maybeSingle();
const locale = custProfile?.communication_locale === "es" ? "es" : "en";
```
⚠️ Do NOT use db.auth.admin.listUsers() in portal code to find customers

## GA4 Tracking Architecture (CRITICAL — Chat 51)

### Customer site (camel-global.com) — G-1Y758X38G4
- All page views tracked automatically via root layout script
- Test site uses G-G90QB28J12 — test traffic isolated
- Cookie consent gates analytics
- GA4 `purchase` event via Measurement Protocol on every confirmed booking
  - File: app/api/webhooks/stripe/route.ts (camel-customer)
  - Measurement ID: G-1Y758X38G4, API Secret: m8xBZ_30QNqmKliAbvC04A
  - Fields: transaction_id, value, currency, camel_commission, items

### Portal (portal.camel-global.com) — G-YCZMDQJDM7
- All page views tracked automatically
- outreach_cta_click event — fires on CTA clicks when utm_source=outreach
- partner_signup_complete event — fires on application-submitted page

### Outreach email tracking
- UTM params on all links: utm_source=outreach&utm_medium=email&utm_campaign=founding-partner&utm_content=signup-button&utm_term={country}&ref={prospect_id}

## Security Architecture (CRITICAL — Chat 51)

### URL tamper protection — confirmed secure
- Customer API: `.eq("customer_user_id", customerUser.id)` — returns 404 on mismatch
- Partner API: `.eq("partner_user_id", userId)` unless adminMode — returns 404 on mismatch
- Identity always from verified JWT token, never from URL

### robots.txt — confirmed correct
- Customer: allows public pages, blocks /bookings/, /account/, /reset-password/, /api/
- Portal: allows /, /partner/signup, /partner/terms, /partner/privacy. Blocks everything else.
- Test sites: block everything

### Middleware — pass-through by design
- Auth enforced at API route level — sufficient
- Server-side middleware gate deferred — see Future Work

### Other
- CSP, Stripe Radar, 2FA, Domain Guard, SSL all active ✅
- press@camel-global.com forwarder — verify exists in Fasthosts

## i18n Architecture (CRITICAL)

All strings in lib/i18n/locales/en.json and es.json — flat key-value, never nested.
useTranslation() returns { t, locale }. Language stored in localStorage camel_locale.
Browser auto-detects: es* → Spanish, anything else → English.

## Driver portal step order (CRITICAL — Chat 46)
Insurance → Delivery fuel (locked until insurance) → Collection fuel (locked until delivery fuel).
All translated EN/ES via driver.jobs.steps.* i18n keys.

## CRITICAL: DB Client Rules
One Supabase project (guhcavvpuveiovspzxmg.supabase.co) — portal and customer share it.
completeBooking.tsx uses direct REST fetch with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
⚠️ Do NOT use db.auth.admin.listUsers() from portal client to find customers.

## DB Schema Additions
```sql
-- Chat 49
CREATE TABLE partner_booking_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES partner_bookings(id),
  amount numeric NOT NULL,
  reason text,
  stripe_refund_id text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE partner_bookings ADD COLUMN post_completion_refund_total numeric DEFAULT 0;

-- Chat 50
ALTER TABLE customer_profiles ADD COLUMN billing_address text;
ALTER TABLE customer_profiles ADD COLUMN tax_id text;
```

## DB State (Chat 51)
- Clean slate — all sandbox data deleted
- 4 auth users: nicktrin@gmail.com (super_admin + customer), nickt@esposti.co.uk (admin), artur.kzn2006@gmail.com (partner), nicktrin+103@gmail.com (driver)
- Job sequence at 1000166 — next booking is #1000167
- Sequence name: global_job_number_seq (not job_number_seq)

## Completion Flow (CRITICAL)
camel-customer update route → POST /api/internal/complete-booking on portal → completeBooking() → reverses partner transfer FIRST → refunds customer → emails all parties with PDF.

## Stripe Payment Architecture (CRITICAL)

### Payment split
Partner payout = car hire − commission + fuel charge − post-completion refunds
Camel net income = commission − Stripe fee

### Refund flow
1. Reverse transfer from partner's connected account
2. Refund customer from Camel's main account

### Post-completion refund reversal (CRITICAL — Chat 51 fix)
Fetches actual transfer: `stripe.transfers.retrieve(transferId)` → uses `transfer.amount_reversed` → reverses only `Math.min(requested, available)` → refunds full amount to customer regardless. Shortfall absorbed from Camel's commission.

### Commission calculation rule
```typescript
const commAmt = Math.max((car_hire_price * commission_rate) / 100, 10);
const partnerPayout = Math.max(0, car_hire_price - commAmt + fuel_charge - pcRefund);
const customerFinal = Math.max(0, total_paid - fuel_refund - pcRefund);
```

### Stripe account
- LIVE keys active in Vercel (switched Chat 51)
- Webhook: https://www.camel-global.com/api/webhooks/stripe — payment_intent.succeeded
- STRIPE_WEBHOOK_SECRET in camel-customer-live only
- First live booking #1000167 confirmed working

## Password Reset Architecture (CRITICAL — Chat 49)
- Customer: exchange-reset-code → /reset-password (standalone layout) → setSession at submit time only
- Partner: /partner/reset-password with hash tokens → setSession at submit time
- Driver: same as partner but /driver/reset-password
- NEXT_PUBLIC_SITE_URL: Production=https://www.camel-global.com, Preview=https://test.camel-global.com (split Vercel env vars)

## Post-Completion Refund Architecture (CRITICAL)
Admin issues refund → Stripe transfer reversal (using real transfer.amount_reversed) → customer refund → DB insert → amended PDF emailed to customer.
Commission invoices NOT affected.

## Payout Hold / Dispute Architecture (CRITICAL — Chat 48)
- partner_bookings.payout_hold boolean, payout_hold_reason text
- Monthly cron skips bookings where payout_hold = true
- Partner sees amber "Payment Disputed" banner — no reason shown
- Partner email is on partner_applications.email (NOT partner_profiles)

## Commission Invoice Architecture
Auto-generated: Vercel cron 1st of each month 08:00 UTC. English only. Uses created_at from partner_bookings.

## Partner Terms Architecture
Single source: lib/portal/partnerTerms.ts. Version 2026-06d. Clause 7: chargeback. Clause 9: VAT/invoicing.

## Map z-index Fix (Chat 51)
`style={{ zIndex: 0, position: "relative" }}` on wrapper divs in:
- app/partner/profile/MapPickerInner.tsx
- app/admin/approvals/PartnersMap.tsx

## PDF Logo Architecture
- ~/camel-portal/public/camel-invoice-logo.png
- completeBooking.tsx: fs.readFileSync
- All other PDFs: fetch from https://portal.camel-global.com/camel-invoice-logo.png

## Outreach Email Architecture (CRITICAL — Chat 51 updated)
Files: all in camel-portal only.

| File | Purpose |
|---|---|
| app/admin/outreach/page.tsx | Outreach UI — prospect table, country filter, batch send, CSV import, send again |
| app/api/admin/outreach/send/route.ts | Send logic — hardcoded email body, language by country, daily limit, unsubscribe check |
| app/api/admin/outreach/prospects/route.ts | GET/POST prospects |
| app/api/admin/outreach/prospects/[id]/route.ts | PATCH/DELETE prospect |
| app/api/admin/outreach/unsubscribe/route.ts | Public GET — sets unsubscribed=true |
| app/HomePageContent.tsx | Shows unsubscribed banner. GA outreach CTA click tracking. |
| public/camel-logo-white-new.png | White logo for outreach emails |

### Outreach email rules
- **Sent from: `Camel Global <noreply@e.camel-global.com>`** (subdomain — protects main domain reputation)
- e.camel-global.com verified in Resend (Chat 51) — Ireland eu-west-1, click tracking enabled
- DNS records in Fasthosts: DKIM TXT on resend._domainkey.e, SPF MX + TXT on send.e
- Sign Up button links to portal homepage (https://portal.camel-global.com/) — sells the platform
- Language: Spain → Spanish, all other countries → English
- Daily limit: 50 emails (hardcoded in send/route.ts — DAILY_LIMIT const)
- UTM params: utm_source=outreach, utm_medium=email, utm_campaign=founding-partner, utm_content=signup-button, utm_term={country-slug}, ref={prospect_id}
- Batch send: pending prospects only, respects country filter, 1 second delay between sends
- Send Again: all non-unsubscribed rows, counts towards daily limit
- Unsubscribed prospects never sent to
- CSV import: click "Import CSV" button — required columns: company_name, email. Optional: contact_name, city, country, notes. Headers case-insensitive. Duplicate emails skipped.
- Test email button sends to admin inbox with [TEST] prefix

### Resend subdomain setup (completed Chat 51)
- Domain: e.camel-global.com added to Resend, verified
- All 3 DNS records verified: DKIM, SPF MX, SPF TXT
- Click tracking enabled, open tracking disabled
- To update from address if subdomain changes: update `from` field in send/route.ts (2 occurrences)

## Contact Form Routing
File: app/api/contact/route.ts (camel-portal)
- General/Booking/Technical/Other → contact@camel-global.com
- Partnership → partners@camel-global.com
- Press → press@camel-global.com ⚠️ verify this forwarder exists in Fasthosts

## Environment Variables (CRITICAL)
| Variable | Repo | Value |
|---|---|---|
| NEXT_PUBLIC_SITE_URL (Production) | camel-customer | https://www.camel-global.com |
| NEXT_PUBLIC_SITE_URL (Preview) | camel-customer | https://test.camel-global.com |
| STRIPE_SECRET_KEY | both | **LIVE — sk_live_...z3pe** |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | camel-customer | **LIVE** |
| STRIPE_WEBHOOK_SECRET | camel-customer only | **LIVE** |
| PORTAL_BASE_URL | camel-portal | https://portal.camel-global.com |

## Email Addresses
| Address | Type | Notes |
|---|---|---|
| info@camel-global.com | Mailbox | Gmail via POP |
| contact@camel-global.com | Forwarder | artur@ + info@ |
| partners@camel-global.com | Forwarder | artur@ + info@ |
| noreply@camel-global.com | Forwarder | info@ + artur@ — transactional emails |
| noreply@e.camel-global.com | Resend subdomain | Outreach emails only — protects main domain |
| email@camel-global.com | Forwarder | nicktrin@gmail.com + artur@ |
| press@camel-global.com | Forwarder? | ⚠️ Verify exists in Fasthosts |

## Stable Tags
### Portal (~/camel-portal)
| Tag | Description |
|---|---|
| v-stable-chat50-complete | Chat 50 — invoicing obligations, VAT invoice data PDF EN/ES |
| v-stable-chat50-post-completion-i18n | Chat 50 — post-completion refund strings translated EN/ES |
| v-stable-chat51-live-stripe | Chat 51 — live Stripe, DB cleanup, post-refund fix, map z-index, GA4, robots |
| v-stable-chat51-outreach-ready | Chat 51 — outreach ready: e.camel-global.com subdomain, CSV import, batch dialog fix |

### Customer (~/camel-customer)
| Tag | Description |
|---|---|
| v-stable-chat50-complete | Chat 50 — platform notice on receipt, billing details, VAT account card |
| v-stable-chat51-live-stripe | Chat 51 — live Stripe, GA4 ecommerce purchase tracking |

## Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat51-outreach-ready
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
All refunds — transfer reversal THEN customer refund, transfer.amount_reversed used for accuracy
All customer + partner notification emails EN/ES
PDF attachments always English (except invoice data PDF EN/ES)
Chat widget EN/ES — both portal and customer
All PDF types — booking receipt, completion statement, amended statement, commission invoice, invoice data
Live status system — 7 checks
Partner onboarding — 7 steps
Commission invoices — auto-generated monthly
Partner terms v2026-06d — chargeback clause + invoicing obligations
Operating rules — chargeback + invoicing obligations EN+ES
Security — CSP, Stripe Radar, 2FA, Domain Guard, URL ownership enforced
GA tracking — page views (both sites), ecommerce purchase events, outreach CTA events
Payout hold / dispute system
**Live Stripe — first live booking #1000167 confirmed**
Site live — camel-global.com fully live
Password reset — all three flows working
robots.txt — confirmed correct
Map z-index — fixed (Chat 51)
Post-completion refund strings — EN/ES in partner booking detail (Chat 51)
DB — clean slate, 4 accounts kept
**Partner outreach — ready to send**
  - Sending from noreply@e.camel-global.com (subdomain verified in Resend)
  - CSV import working
  - Batch send with corrected dialog copy
  - Sign Up button → portal homepage
  - Daily limit 50, 1s delay between sends
  - Click tracking enabled in Resend

## Future Work (Deferred)
🔲 **Server-side middleware auth gate** — deferred. Use Supabase official Next.js middleware helper when implementing. Test on staging first.
🔲 Commission invoice PDF — VAT number + 20% UK VAT once NTUK is VAT registered
🔲 Xero monthly commission endpoint
🔲 DAC7 EU platform reporting
🔲 press@camel-global.com — verify forwarder exists in Fasthosts
❌ Phase 6 — Future languages: IT, PT, FR, DE

## Collaborator Note
Collaborator works on camel-portal from Windows (C:/dev/camel-portal). Always git pull before starting.
camel-coming-soon is a git submodule — always shows as modified, ignore it. Use git add <specific-file>.

## Session Log

### Chat 51 — Outreach updates (end of session)
- e.camel-global.com subdomain added to Resend, DNS verified in Fasthosts (DKIM, SPF MX, SPF TXT), click tracking enabled
- Outreach emails now sent from noreply@e.camel-global.com — protects main domain reputation
- CSV import added to outreach page — required: company_name + email, optional: contact_name, city, country, notes
- Batch send dialog copy fixed — no longer says "Claude will write" 
- "AI-powered" label removed from outreach page subtitle
- Sign Up button links to portal homepage (not /partner/signup) — homepage sells the platform better
- Stable tag: v-stable-chat51-outreach-ready on camel-portal

### Chat 51 — Main session
Live Stripe switch, DB cleanup, post-refund fix, GA4 ecommerce, security review, map fix, i18n fixes
Stable tags: v-stable-chat51-live-stripe on both repos

### Chat 50 (Completed)
Invoicing obligations, VAT invoice data PDF, customer billing details
Stable tags: v-stable-chat50-complete, v-stable-chat50-post-completion-i18n

### Chat 49 (Completed)
Post-completion refund system, site go-live, password reset fixes, reporting improvements

### Chat 48 (Completed)
GA tracking, payout hold dispute system, Stripe live setup

### Chat 47 (Completed)
Partner outreach improvements

### Chat 46 (Completed)
Driver step order enforcement + Chat widget full EN/ES

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

# Create stable tag
git tag -a v-tag-name -m "description" && git push origin v-tag-name

# Check job number sequence
SELECT last_value FROM global_job_number_seq;

# Manual cron trigger
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://portal.camel-global.com/api/cron/monthly-payout

# Restore a file from a specific commit
git show <commit-hash>:lib/email.ts > lib/email.ts

# Multiline replacements — Python3 heredoc (multiline sed never works in zsh)
python3 << 'EOF'
with open('/path/to/file.tsx', 'r') as f:
    content = f.read()
content = content.replace('old text', 'new text')
with open('/path/to/file.tsx', 'w') as f:
    f.write(content)
print("Done")
EOF

# Small text changes — sed on disk, verify, commit
sed -i '' 's/old text/new text/' ~/camel-portal/path/to/file.ts
grep -n "new text" ~/camel-portal/path/to/file.ts
git add path/to/file.ts && git commit -m "message" && git push origin main

# Switch Stripe live → sandbox (testing only)
# Update STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET in Vercel
# Then redeploy both projects

# IMPORTANT: camel-coming-soon is a submodule — always shows modified, ignore it
git add app/path/to/file.tsx && git commit -m "message" && git push origin main
```

Last updated: Chat 51 complete — live Stripe, DB clean, post-refund fix, GA4 ecommerce, map fix, i18n, security confirmed, outreach ready with e.camel-global.com subdomain + CSV import.
