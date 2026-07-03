Camel Global — Project Handover Document
Always paste this document at the start of every new conversation.

Update it at the end of each session before the chat fills up.
Working Rules
Always paste the current file before Claude rewrites it. Claude works from what you paste, not from memory.

Always give Claude the full file tree at the start of a new chat:
Portal: find ~/camel-portal -not -path '/node_modules/' -not -path '/.git/' -not -path '/.next/' | sort

Customer: find ~/camel-customer -not -path '/node_modules/' -not -path '/.git/' -not -path '/.next/' | sort
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

Always tell Claude which sed commands failed — sed on disk is the only reliable way to make small changes to deployed files.

When making changes with sed, always verify with grep afterwards before committing.

Always label artifacts with the destination file path so the user knows where to copy them.

multiline sed never works in zsh — always use separate sed commands per line, or write a full file artifact.

Python3 heredoc is the reliable way to make multiline replacements — use python3 << 'EOF' pattern.
Project Overview
Name: Camel Global

Legal entity: NTUK Ltd, trading as Camel Global

Company number: 08765474

Registered address: Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN

Type: Meet & greet car hire platform (Uber-style for car hire)

Stack: Next.js 16, Supabase, Vercel, GitHub, Stripe Connect

Launching in Spain first, USD support ready for future US rollout
Repos
RepoPurposeLocal pathnicktrin-lang/camel-portalPartner + Admin + Driver portal~/camel-portalnicktrin-lang/camel-customerCustomer site~/camel-customer
Domains
DomainProjectRepoPurposeportal.camel-global.comcamel-portal-livecamel-portalPortal productiontest-portal.camel-global.comcamel-portal-livecamel-portalPortal stagingcamel-global.com / www.camel-global.comcamel-customer-livecamel-customerCustomer production (LIVE)test.camel-global.comcamel-customer-livecamel-customerCustomer staging
Deploy Commands
bash# Portal
cd ~/camel-portal && git add <file> && git commit -m "message" && git push origin main

# Customer
cd ~/camel-customer && git add <file> && git commit -m "message" && git push origin main
Portals
PortalPathUsersCustomercamel-global.com/End customersPartnerportal.camel-global.com/partnerCar hire companiesDriverportal.camel-global.com/driverDelivery driversAdminportal.camel-global.com/adminCamel Global staff
Tech Architecture
Key Libraries & Files — Portal (~/camel-portal)
FilePurposelib/supabase/browser.tsSupabase browser client (partner/admin)lib/supabase/server.tsSupabase server client — exports createRouteHandlerSupabaseClient() and createServiceRoleSupabaseClient()lib/cities.tsShared city list for Photon search biaslib/portal/calculateFuelCharge.tsFuel charge calculation logiclib/portal/calculateCommission.tsCommission — 20% of hire price, min €10 floorlib/portal/syncBookingStatuses.tsBooking status sync logiclib/portal/refreshPartnerLiveStatus.tsCore live status — checks all 7 requirementslib/portal/triggerPartnerLiveRefresh.tsTriggers the live status refreshlib/portal/operatingRules.tsShared OPERATING_RULES + OPERATING_RULES_ES data + downloadOperatingRulesPDF(companyName, locale). Section 9b — Invoicing Obligations EN+ES only. FR/IT/PT/DE PDF translations deferred.lib/portal/completeBooking.tsxShared completion logic — Stripe transfer reversal + fuel refund, payout_status=ready, emails all parties with PDF. Logo read from disk via fs.readFileSync.lib/portal/generateCommissionInvoice.tsxCommission invoice PDF — uses created_at from partner_bookings. English only.lib/portal/generateInvoiceDataPDF.tsxInvoice data PDF — server-side react-pdf, EN/ES, NOT a VAT invoice. wrap={false} prevents page breaks.lib/portal/partnerTerms.tsSingle source of truth for partner T&Cs. Version 2026-06d. Clause 7: chargeback. Clause 9: VAT/invoicing. EN+ES only. FR/IT/PT/DE PDF translations deferred.lib/rateLimit.tsIn-memory rate limiter — 3 req / 15 min per IPlib/hcaptcha.tsServer-side hCaptcha token verificationlib/currency.tsAll currency utilities — EUR, GBP, USD formatting + conversionlib/useCurrency.tsReact hook — currency state, live rates, fmt helperslib/email.tsResend email sender — all notification helpers. WARNING: large file — never replace with partial. Restore from git if overwritten. Approval email: logo, partner name, onboarding steps, orange CTA, noreply sender.lib/i18n/LanguageContext.tsxLanguage context + provider + localStorage + browser locale detection. Supports: en, es, fr, it, pt, de.lib/i18n/useTranslation.tst() hook — dot-notation keys, {{var}} interpolation, English fallback. Imports all 6 locale files.lib/i18n/LanguageToggle.tsxEN/ES/FR/IT/PT/DE toggle — hidden on mobile (hidden lg:flex), shown in topbar.lib/i18n/locales/en.jsonEnglish strings — flat key-value, NOT nested. 1770 keys.lib/i18n/locales/es.jsonSpanish strings — 1770 keys.lib/i18n/locales/fr.jsonFrench strings — 1770 keys. Generated Chat 52 via Claude API.lib/i18n/locales/it.jsonItalian strings — 1770 keys. Generated Chat 52 via Claude API.lib/i18n/locales/pt.jsonPortuguese strings — 1770 keys. Generated Chat 52 via Claude API.lib/i18n/locales/de.jsonGerman strings — 1770 keys. Generated Chat 52 via Claude API.app/partner/signup/page.tsxPartner signup — 5 steps. Captures addressLat/addressLng + fleetLat/fleetLng. Falls back to business address coords if no fleet coords. GA4 step tracking: signup_step_1_company_details through signup_step_5_terms. useEffect fires step 1 on mount.app/partner/onboarding/page.tsxPartner onboarding — 7 steps (location, currency, billing, fleet, drivers, payouts, golive). GA4 step tracking: onboarding_step_{stepname} fires on each step completion.app/api/partner/complete-signup/route.tsCreates auth user, partner_application, partner_profile. Saves base_lat/base_lng from fleet coords (falls back to business address coords). Sends application received email to partner + admin notification email to CAMEL_ADMIN_EMAILS.app/api/partner/stripe/connect/route.tsStripe Connect — stripeCountry() maps partner country to Stripe country code. Supports: ES, GB, AU, US, CA, FR, DE, IT, NL, PT, IE, NZ, SG, AE.app/api/admin/applications/resend-approval/route.tsResends approval email to approved-not-live partners. Stamps approval_email_last_sent_at.app/api/cron/onboarding-reminder/route.tsDaily cron 09:00 UTC — resends approval email to approved-not-live partners where last sent >48h ago.app/admin/approvals/page.tsxPartner approvals list + map. Map shows pending AND approved partners. Live partners rendered on top. "Resend Approval Email" button on approved-not-live rows.app/admin/approvals/PartnersMap.tsxLeaflet map — green dot = live, orange dot = not live. zIndex:0 wrapper prevents map overlapping header.app/admin/outreach/page.tsxOutreach UI — prospect table, engagement cards (Sent/Opened/Clicked — clickable filters), All + status cards, country filter, batch send, CSV import, sticky header, scrollable table.app/api/admin/outreach/send/route.tsSend logic — noreply@e.camel-global.com, body in EN/ES/FR/IT/PT/DE by country, 50/day limit. getLocale() maps: Spain→es, France→fr, Italy→it, Portugal→pt, Germany→de, others→en.app/api/admin/outreach/webhook/route.tsResend webhook — handles email.opened, email.clicked, email.complained, email.bounced. Updates opened_at, clicked_at, unsubscribed, status on outreach_prospects. Signature verification disabled (svix mismatch — TODO).app/components/portal/PortalSidebar.tsxSidebar for partner+admin — uses t() for all labels. Mobile language switcher shows EN/ES/FR/IT/PT/DE.app/components/partner/PartnerSidebar.tsxUnused — layout uses PortalSidebar instead.app/driver/layout.tsxDriver portal layout — CompactLanguageToggle and mobile dropdown both show EN/ES/FR/IT/PT/DE.
Key Libraries & Files — Customer (~/camel-customer)
FilePurposelib/supabase-customer/browser.tsSupabase browser client. detectSessionInUrl: false.lib/supabase-customer/server.tsExports createCustomerServerClient() and createCustomerServiceRoleSupabaseClient()lib/portal/generateBookingReceiptPDF.tsxBooking receipt PDF + email. EN/ES body. Platform Payment Notice included.lib/portal/generateCompletionStatementPDF.tsxCompletion statement PDF. Shows AMENDED when refunds exist.app/ClientRootLayout.tsxLanguageProvider wraps InnerLayout. PASSWORD_RECOVERY ignored.app/reset-password/layout.tsxStandalone layout — bypasses ClientRootLayout.app/page.tsxCustomer homepage — auth-aware nav.app/api/webhooks/stripe/route.tsStripe webhook — payment_intent.succeeded. Emails in correct language. GA4 purchase event via Measurement Protocol.app/api/test-booking/requests/[id]/route.tsGET booking detail — ownership enforced via .eq("customer_user_id", customerUser.id).app/bookings/[id]/page.tsxCustomer booking detail — shows post-completion refund block in amber.app/account/page.tsxCustomer account — VAT Invoice Details card (billing_address, tax_id).middleware.tsPass-through (NextResponse.next()). No server-side auth gate — see Future Work.
Invoicing / VAT Architecture (CRITICAL — Chat 50)
Camel is marketplace intermediary. Partner is the supplier. Partner issues VAT invoices to customers.

Booking receipt: NOT a VAT invoice. Platform Payment Notice in PDF + email (EN/ES).
Commission invoice: monthly to partner. English only (NTUK legal).
Invoice Data PDF: data sheet for partner to raise their own invoice. EN/ES.
Documented in: partner terms clause 9, operating rules section 9b, customer terms clause 10b.

Chat Widget Architecture (CRITICAL)
ChatWidget.tsx exists in both repos but NOT identical. Both use key={locale} to force remount.

localeRef ensures current locale sent to API. ⚠️ Never use useLanguage() outside LanguageProvider.
Email Architecture (CRITICAL)
Rule: Notification emails = customer's language. PDF attachments = always English.
Partner emails (Chat 52)

Approval email: sent from noreply@camel-global.com, includes partner name greeting, 7 onboarding steps, orange CTA button, white logo
Approval email resend: manual button on admin approvals page (approved+not-live only)
Onboarding reminder: cron resends approval email every 48h until partner goes live
approval_email_last_sent_at stamped on every send to prevent duplicates

Admin notification emails (Chat 51)

New partner application → CAMEL_ADMIN_EMAILS — added to complete-signup/route.ts
Includes: company name, contact, email, phone, country, address, link to admin approvals

Customer-facing emails:
EmailLocale sourceBid receivedcustomer_profiles.communication_localeBooking confirmed + receipt PDFcustomer_profiles.communication_localeCompletion emailcustomer_profiles.communication_localePost-completion refundcustomer_profiles.communication_localeReview remindercustomer_profiles.communication_locale
CRITICAL: Customer locale lookup
typescriptconst { data: custProfile } = await db
  .from("customer_profiles")
  .select("communication_locale")
  .eq("user_id", request.customer_user_id)
  .maybeSingle();
const locale = custProfile?.communication_locale === "es" ? "es" : "en";
⚠️ Do NOT use db.auth.admin.listUsers() in portal code to find customers
GA4 Tracking Architecture (CRITICAL)
Customer site (camel-global.com) — G-1Y758X38G4

All page views tracked via root layout
Cookie consent gates analytics
GA4 purchase event via Measurement Protocol on every confirmed booking

File: app/api/webhooks/stripe/route.ts (camel-customer)
Measurement ID: G-1Y758X38G4, API Secret: m8xBZ_30QNqmKliAbvC04A


GA4 internal traffic filter set up — own IP excluded (Chat 52)

Portal (portal.camel-global.com) — G-YCZMDQJDM7

All page views tracked via root layout
outreach_cta_click — fires on CTA clicks when utm_source=outreach
partner_signup_complete — fires on application-submitted page
Signup funnel events (Chat 51 — unique event names per step):

signup_step_1_company_details — fires on mount of signup page
signup_step_2_business_address — fires on Next from step 1
signup_step_3_fleet_address — fires on Next from step 2
signup_step_4_password — fires on Next from step 3
signup_step_5_terms — fires on Next from step 4


Onboarding funnel events (Chat 51):

onboarding_step_currency, onboarding_step_billing, onboarding_step_fleet
onboarding_step_drivers, onboarding_step_payouts, onboarding_step_golive



GA4 Funnel Explorations (set up in GA4 Explore)

"Partner Signup Funnel" — 5 steps using signup_step_* event names
"Partner Onboarding Funnel" — 6 steps using onboarding_step_* event names
No custom dimensions needed — each step has unique event name

Outreach tracking

UTM params on all links: utm_source=outreach&utm_medium=email&utm_campaign=founding-partner&utm_content=signup-button&utm_term={country}&ref={prospect_id}
Resend webhook tracks opens/clicks/complaints/bounces directly in outreach_prospects table

Outreach Email Architecture (CRITICAL — Chat 51/52)
Files: all in camel-portal only.
FilePurposeapp/admin/outreach/page.tsxOutreach UI — clickable Sent/Opened/Clicked cards, All+status filter cards, sticky header, CSV import, engagement filterapp/api/admin/outreach/send/route.tsSend logic — noreply@e.camel-global.com, body in EN/ES/FR/IT/PT/DE by country, 50/day limitapp/api/admin/outreach/webhook/route.tsResend webhook — auto-updates opened_at, clicked_at, unsubscribed, bounced statusapp/api/admin/outreach/prospects/route.tsGET/POST prospectsapp/api/admin/outreach/prospects/[id]/route.tsPATCH/DELETE prospectapp/api/admin/outreach/unsubscribe/route.tsPublic GET — sets unsubscribed=true
Outreach rules

From: Camel Global <noreply@e.camel-global.com> — subdomain protects main domain
e.camel-global.com fully verified in Resend (DKIM, SPF MX, SPF TXT, tracking CNAME links.e)
Click tracking ON, Open tracking ON
Resend webhook: https://portal.camel-global.com/api/admin/outreach/webhook

Listening: email.clicked, email.opened, email.complained, email.bounced
RESEND_WEBHOOK_SECRET set in Vercel (Sensitive, Production+Preview) — signature verification TODO


Sign Up button → portal homepage
Daily limit: 50, 1s delay between sends
CSV import: company_name + email required, contact_name/city/country/notes optional
Bounced emails → automatically set status = "bounced"
Complained emails → automatically set unsubscribed = true
Language detection: Spain→es, France→fr, Italy→it, Portugal→pt, Germany→de, others→en

DB columns added for outreach tracking (Chat 51)
sqlALTER TABLE outreach_prospects ADD COLUMN opened_at timestamptz;
ALTER TABLE outreach_prospects ADD COLUMN clicked_at timestamptz;
i18n Architecture (CRITICAL — Chat 52)
Supported locales: en, es, fr, it, pt, de — flat key-value JSON, NOT nested.

All 6 locale files have 1770 keys. English fallback for any missing key.

Browser auto-detects locale from navigator.languages on mount.
Language switcher locations

Desktop topbar: LanguageToggle component (all pages)
Mobile partner/admin sidebar: PortalSidebar langOptions array
Mobile driver dropdown: driver/layout.tsx langOptions + CompactLanguageToggle
Partner signup page: options array
Portal homepage: HomePageContent options array
Partner settings: 6 flag buttons saving to partner_profiles.communication_locale

Adding a new language — FULL CHECKLIST (Chat 52)
To add e.g. "nl" (Dutch), update ALL of the following:
1. lib/i18n/LanguageContext.tsx

Add "nl" to: export type Locale = "en" | "es" | "fr" | "it" | "pt" | "de" | "nl"
Add detection: if (code.startsWith("nl")) return "nl";

2. lib/i18n/useTranslation.ts

Add: import nl from "./locales/nl.json";
Add to translations object: { en, es, fr, it, pt, de, nl }

3. Create locale file — run Claude API translation script:
bashcat > /tmp/translate_new_lang.py << 'ENDOFFILE'
import json, os, time, urllib.request

with open('/Users/nicktrinnaman/camel-portal/.env.local') as f:
    for line in f:
        if 'ANTHROPIC_API_KEY' in line:
            key = line.strip().split('=',1)[1].strip('"').strip("'")
            os.environ['ANTHROPIC_API_KEY'] = key
            break

LANG = "nl"
LANG_NAME = "Dutch"

with open('/Users/nicktrinnaman/camel-portal/lib/i18n/locales/en.json') as f:
    en = json.load(f)

items = list(en.items())
chunks = [dict(items[i:i+50]) for i in range(0, len(items), 50)]
results = {}

for i, chunk in enumerate(chunks):
    print(f"Chunk {i+1}/{len(chunks)}...")
    for attempt in range(3):
        try:
            prompt = f"""Translate the VALUES of this JSON into {LANG_NAME}.
Keep ALL keys as-is. Keep {{variable}} placeholders, arrows, emojis, URLs, Camel Global, currency symbols unchanged.
Formal/professional B2B tone. Return ONLY valid JSON, no markdown.
{json.dumps(chunk, ensure_ascii=False, indent=2)}"""
            payload = json.dumps({"model": "claude-sonnet-4-6", "max_tokens": 3000,
                "messages": [{"role": "user", "content": prompt}]}).encode()
            req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=payload,
                headers={"x-api-key": os.environ['ANTHROPIC_API_KEY'],
                    "anthropic-version": "2023-06-01", "content-type": "application/json"})
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read())
            text = data['content'][0]['text'].strip()
            if text.startswith('`'): text = text.split('\n',1)[1].rsplit('`',1)[0].strip()
            results.update(json.loads(text))
            print(f"  OK {len(json.loads(text))} keys")
            break
        except Exception as e:
            print(f"  Attempt {attempt+1} failed: {e}")
            time.sleep(3)
    with open(f'/Users/nicktrinnaman/camel-portal/lib/i18n/locales/{LANG}.json', 'w') as f:
        json.dump({k: results[k] for k in en if k in results}, f, ensure_ascii=False, indent=2)
    time.sleep(1)

print(f"Done! {len(results)}/{len(en)} keys")
ENDOFFILE
python3 /tmp/translate_new_lang.py
4. Language switcher — add { code: "nl", label: "NL" } to ALL:

lib/i18n/LanguageToggle.tsx
app/components/portal/PortalSidebar.tsx — langOptions array
app/components/partner/PartnerSidebar.tsx — LANG_OPTIONS array
app/driver/layout.tsx — BOTH CompactLanguageToggle options AND langOptions
app/HomePageContent.tsx — options array
app/partner/signup/page.tsx — options array

5. app/partner/settings/page.tsx

Add { code: "nl", label: "🇳🇱 Nederlands" } to button list
Update all 3 type annotations: "en" | "es" | "fr" | "it" | "pt" | "de" | "nl"

6. app/api/admin/outreach/send/route.ts

Add to getLocale(): if (["netherlands", "nederland"].includes(c)) return "nl";
Add nl greeting, openingLine, subject, bodyNl, footerNl, CTA to buildEmailHtml()

7. lib/email.ts — sendApprovalEmail, sendRejectionEmail, sendAccountLiveEmail

Add nl body/subject/greeting alongside existing locales

8. lib/portal/partnerTerms.ts + operatingRules.ts (when translated)

Add PARTNER_TERMS_NL and OPERATING_RULES_NL arrays
Update PDF download functions to handle "nl"

Verification:
bashpython3 << 'EOF'
import json
with open('/Users/nicktrinnaman/camel-portal/lib/i18n/locales/en.json') as f: en = json.load(f)
for lang in ['fr','it','pt','de','nl']:
    try:
        with open(f'/Users/nicktrinnaman/camel-portal/lib/i18n/locales/{lang}.json') as f: loc = json.load(f)
        missing = [k for k in en if k not in loc]
        print(f"{lang.upper()}: {len(loc)}/{len(en)} keys — missing: {len(missing)}")
    except: print(f"{lang.upper()}: FILE MISSING")
EOF
Partner Signup & Map Architecture (CRITICAL — Chat 51 fixes)
Lat/lng at signup

signup/page.tsx sends addressLat/addressLng (business) + baseLat/baseLng (fleet) to complete-signup route
complete-signup/route.ts saves: base_lat: baseLat ?? addressLat, base_lng: baseLng ?? addressLng
If partner doesn't set fleet address, business address coords used as fallback

Admin approvals map

Shows pending AND approved partners (not just approved)
Live partners sorted to render on top of not-live at same location
Green dot = live, orange dot = not live

Backfilling existing partners without coords
sqlUPDATE partner_profiles SET base_lat = {lat}, base_lng = {lng} WHERE company_name = '{name}';
Security Architecture (CRITICAL)
URL tamper protection — confirmed secure

Customer API: .eq("customer_user_id", customerUser.id) — 404 on mismatch
Partner API: .eq("partner_user_id", userId) unless adminMode — 404 on mismatch
Identity from verified JWT only

robots.txt — confirmed correct

Customer: allows public pages, blocks /bookings/, /account/, /reset-password/, /api/
Portal: allows /, /partner/signup, /partner/terms, /partner/privacy only
Test sites: block everything

Other

CSP, Stripe Radar, 2FA, Domain Guard, SSL all active ✅
press@camel-global.com — confirmed exists in Fasthosts ✅

CRITICAL: DB Client Rules
One Supabase project (guhcavvpuveiovspzxmg.supabase.co).

completeBooking.tsx uses direct REST fetch with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

⚠️ Do NOT use db.auth.admin.listUsers() from portal client to find customers.
DB Schema
sql-- Chat 49
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

-- Chat 52
ALTER TABLE partner_applications ADD COLUMN approval_email_last_sent_at timestamptz;
DB State

Clean slate — all sandbox data deleted (Chat 51)
4 auth users: nicktrin@gmail.com (super_admin+customer), nickt@esposti.co.uk (admin), artur.kzn2006@gmail.com (partner), nicktrin+103@gmail.com (driver)
Job sequence: global_job_number_seq at 1000166+
Real partners: AUTOMOVILES BERROCAR S.L. (Spain, approved), Kingsman Chauffeur Services (Australia, approved)
Both manually geocoded and base_lat/base_lng set in Chat 51

Stripe Payment Architecture (CRITICAL)

LIVE keys active in Vercel
Webhook: https://www.camel-global.com/api/webhooks/stripe
Post-completion refund: uses transfer.amount_reversed for accuracy, shortfall absorbed by Camel
Commission: Math.max((car_hire_price * commission_rate) / 100, 10)
Stripe Connect country mapping: ES, GB, AU, US, CA, FR, DE, IT, NL, PT, IE, NZ, SG, AE — defaults to ES

Password Reset

Customer: exchange-reset-code → /reset-password → setSession at submit time
Partner: /partner/reset-password with hash tokens
Driver: /driver/reset-password

Completion Flow
camel-customer update route → POST /api/internal/complete-booking → completeBooking() → reverses transfer → refunds customer → emails all parties.
Payout Hold / Dispute

partner_bookings.payout_hold boolean, payout_hold_reason text
Monthly cron skips held bookings
Partner email on partner_applications.email (NOT partner_profiles)

Commission Invoice
Auto-generated: Vercel cron 1st of month 08:00 UTC. English only. Uses created_at.
Cron Jobs
CronScheduleFilePurpose/api/cron/monthly-payout0 8 1 * *app/cron/monthly-payout/route.tsMonthly partner payouts + commission invoices/api/cron/review-reminder0 10 * * *app/api/cron/review-reminder/route.tsDaily review reminder emails/api/cron/onboarding-reminder0 9 * * *app/api/cron/onboarding-reminder/route.tsDaily — resends approval email to approved-not-live partners where last sent >48h ago
PDF Logo

~/camel-portal/public/camel-invoice-logo.png
completeBooking.tsx: fs.readFileSync
Other PDFs: fetch from https://portal.camel-global.com/camel-invoice-logo.png

Map z-index
style={{ zIndex: 0, position: "relative" }} on map wrapper divs in:

app/partner/profile/MapPickerInner.tsx
app/admin/approvals/PartnersMap.tsx

Environment Variables (CRITICAL)
VariableRepoValueNEXT_PUBLIC_SITE_URL (Production)camel-customerhttps://www.camel-global.comNEXT_PUBLIC_SITE_URL (Preview)camel-customerhttps://test.camel-global.comSTRIPE_SECRET_KEYbothLIVE — sk_live_...z3peNEXT_PUBLIC_STRIPE_PUBLISHABLE_KEYcamel-customerLIVESTRIPE_WEBHOOK_SECRETcamel-customer onlyLIVEPORTAL_BASE_URLcamel-portalhttps://portal.camel-global.comRESEND_WEBHOOK_SECRETcamel-portalSet in Vercel (Sensitive) — for outreach webhookEMAIL_FROMcamel-portalCamel Global noreply@camel-global.comANTHROPIC_API_KEYcamel-portalSet in Vercel — also add to .env.local for translation scripts
Email Addresses
AddressNotesinfo@camel-global.comMailbox — Gmail via POPcontact@camel-global.comForwarder → artur@ + info@partners@camel-global.comForwarder → artur@ + info@noreply@camel-global.comForwarder → info@ + artur@ — all transactional emailsnoreply@e.camel-global.comResend subdomain — outreach emails onlyemail@camel-global.comForwarder → nicktrin@gmail.com + artur@press@camel-global.comForwarder → artur@ + info@ ✅ confirmed exists
Stable Tags
Portal (~/camel-portal)
TagDescriptionv-stable-chat51-live-stripeLive Stripe, DB cleanup, post-refund fix, map z-index, GA4v-stable-chat51-outreach-readyOutreach: e.camel-global.com, CSV import, batch dialog fixv-stable-chat51-outreach-trackingOutreach: open/click webhook, engagement cards, sticky headerv-stable-chat51-finalFinal Chat 51 — GA funnels, favicon, admin signup notification, map fixes, partner lat/lng at signupv-stable-chat52-languagesComplete FR/IT/PT/DE i18n, language switchers, outreach localisation, approval email redesign, onboarding reminder cron
Customer (~/camel-customer)
TagDescriptionv-stable-chat51-live-stripeLive Stripe, GA4 ecommerce purchase tracking, favicon
Rollback
bashcd ~/camel-portal && git checkout v-stable-chat52-languages
cd ~/camel-customer && git checkout v-stable-chat51-live-stripe
What Is Working ✅
Customer booking flow — all screen sizes, guest booking survives redirect

Partner bid submission and management

Driver job portal — EN/ES/FR/IT/PT/DE, step order enforced

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

Live Stripe — booking #1000167 confirmed

Admin email notification on new partner application (Chat 51)

Partner lat/lng captured at signup — falls back to business address coords (Chat 51)

Admin map — shows pending + approved, live on top, green=live orange=not-live (Chat 51)

Favicon — Camel logo on both sites (Chat 51)

Google Search Console — set up for camel-global.com and portal.camel-global.com (Chat 51)

GA4 signup funnel — 5 step events firing, funnel exploration set up in GA4 (Chat 51)

GA4 onboarding funnel — 6 step events firing, funnel exploration set up in GA4 (Chat 51)

Outreach — 300+ sent, 25% open rate, Resend webhook tracking opens/clicks/bounces/complaints

Outreach engagement UI — clickable Sent/Opened/Clicked filter cards, All status card (Chat 51)

FR, IT, PT, DE language support — full portal translation 1770 keys each, switchers on all pages/mobile/driver (Chat 52)

Outreach emails localised — FR/IT/PT/DE body, subject, greeting, footer, CTA (Chat 52)

Approval email redesigned — white logo, partner name greeting, 7 onboarding steps, orange CTA, noreply sender (Chat 52)

Resend approval email button — admin approvals page, approved+not-live partners only (Chat 52)

Onboarding reminder cron — 48h repeat, stamps approval_email_last_sent_at (Chat 52)

Stripe Connect country mapping — AU, US, FR, DE, IT, NL, PT, IE, NZ, SG, AE (Chat 52)

GA4 internal traffic filter — own IP excluded from analytics (Chat 52)

DB clean slate, real partners: Berrocar (Spain) + Kingsman (Australia) approved

robots.txt confirmed correct

Map z-index fixed
Future Work (Deferred)
🔲 Terms & Operating Rules PDF translations — FR, IT, PT, DE (Chat 53)

lib/portal/partnerTerms.ts — add PARTNER_TERMS_FR/IT/PT/DE arrays (copy PARTNER_TERMS_ES structure), update downloadPartnerTermsPDF() to accept full Locale type
lib/portal/operatingRules.ts — add OPERATING_RULES_FR/IT/PT/DE arrays, update downloadOperatingRulesPDF()
Use Claude API chunked translation script (same approach as Chat 52 locale files)
operating-rules page and partner account page call these — update locale param passing

🔲 Resend webhook signature verification — currently disabled (svix format mismatch). Add svix npm package and re-enable. Low risk as endpoint URL is obscure.

🔲 Server-side middleware auth gate — use Supabase official Next.js middleware helper. Test on staging first.

🔲 Commission invoice PDF — VAT number + 20% UK VAT once NTUK VAT registered

🔲 Xero monthly commission endpoint

🔲 DAC7 EU platform reporting

Collaborator Note
Collaborator works on camel-portal from Windows (C:/dev/camel-portal). Always git pull before starting.

camel-coming-soon is a git submodule — always shows modified, ignore it. Use git add <specific-file>.
Session Log
Chat 52 — Languages & i18n (Jun 26)

FR, IT, PT, DE added to Locale type, LanguageContext browser detection, LanguageToggle
Complete translations generated via Claude API chunked script (50 keys/chunk, 3 retries) — 1770 keys each
useTranslation.ts updated to import all 6 locale files
Partner settings — 6 language flag buttons saving to communication_locale
Outreach getLocale() — France→fr, Italy→it, Portugal→pt, Germany→de
Outreach emails fully localised in FR/IT/PT/DE — body, subject, greeting, footer, CTA
Language switcher added to all locations: PortalSidebar (mobile), driver layout (desktop CompactLanguageToggle + mobile dropdown), HomePageContent, partner signup
Hardcoded booking strings fixed — Invoice Data, Billing Address, Tax ID now use t()
Stripe Connect stripeCountry() expanded — AU, US, CA, FR, DE, IT, NL, PT, IE, NZ, SG, AE
GA4 internal traffic IP filter set up — own IP excluded from both GA4 properties
Approval email redesigned — white camel logo, partner company name greeting, 7 onboarding steps table, orange CTA button, sent from noreply@camel-global.com
Resend approval email button on admin approvals page — approved+not-live partners only
approval_email_last_sent_at column added to partner_applications
48h onboarding reminder cron — /api/cron/onboarding-reminder — runs daily 09:00 UTC
EMAIL_FROM env var updated to Camel Global noreply@camel-global.com
Stable tag: v-stable-chat52-languages

Chat 51 — Final updates (Jun 25)

Admin email notification on new partner application — added to complete-signup/route.ts
Partner lat/lng at signup — falls back to business address coords if no fleet address set
Admin map — now shows pending + approved partners; live partners render on top
Favicon — camelLogo-fav.png added to both repos, link tags in both layout.tsx
Google Search Console — set up for both domains
GA4 signup funnel — unique event per step, funnel set up in GA4 Explore
GA4 onboarding funnel — unique event per step, funnel set up in GA4 Explore
Outreach engagement cards now clickable as filters
Outreach webhook handles email.bounced → auto-sets status=bounced
Backfilled Berrocar (Sevilla) and Kingsman (Adelaide) with geocoded coords
Stable tag: v-stable-chat51-final

Chat 50 (Completed)
Invoicing obligations, VAT invoice data PDF, customer billing details
Chat 49 (Completed)
Post-completion refund system, site go-live, password reset fixes
Chat 48 (Completed)
GA tracking, payout hold dispute system, Stripe live setup
Chat 47 (Completed)
Partner outreach system
Chat 46 (Completed)
Driver step order + Chat widget EN/ES
Useful Commands
bash# Always pull before starting
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

# Check all locale files are complete
python3 << 'EOF'
import json
with open('/Users/nicktrinnaman/camel-portal/lib/i18n/locales/en.json') as f: en = json.load(f)
for lang in ['es','fr','it','pt','de']:
    with open(f'/Users/nicktrinnaman/camel-portal/lib/i18n/locales/{lang}.json') as f: loc = json.load(f)
    missing = [k for k in en if k not in loc]
    print(f"{lang.upper()}: {len(loc)}/{len(en)} keys — missing: {len(missing)}")
EOF

# Translate missing keys for a locale
python3 /tmp/translate_locales2.py

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

# camel-coming-soon is a submodule — always shows modified, ignore it
git add app/path/to/file.tsx && git commit -m "message" && git push origin main
Last updated: Chat 52 complete — FR/IT/PT/DE full i18n (1770 keys each), language switchers on all pages and mobile, outreach emails localised, approval email redesigned, onboarding reminder cron, Stripe country mapping expanded. Next: Chat 53 — Terms & Operating Rules PDF translations FR/IT/PT/DE.

### Chat 53b — i18n follow-up (legal note, chat, mobile toggle)
Triggered by /partner/signup screenshot (4 issues). Tag: v-stable-chat53b-i18n-fixes.

1. **Legal note** — removed "reference only" wording from PARTNER_TERMS/OPERATING_RULES
   legalNote (es/fr/it/pt/de), keeping only the "English prevails" line. First attempt
   corrupted the live files via multibyte paste; repaired with a pure-ASCII (\u-escaped)
   re.subn that overwrites legalNote regardless of current content. Files:
   lib/portal/partnerTerms.ts, lib/portal/operatingRules.ts.
2. **Chat now FR/IT/PT/DE** — app/api/chat/route.ts: replaced the es-or-en ternary with a
   LANG_NAMES map + ${langName}, so the model is told to reply in the actual selected
   language. app/components/ChatWidget.tsx: broadened type Locale to all 6 and added
   FR/IT/PT/DE STRINGS (welcome/suggestions/buttons), fixed stray "?" in en welcome.
   PORTAL widget only — customer-repo ChatWidget stays EN/ES (correct).
3. **Mobile language switcher** — the 6-button inline CompactLanguageToggle overflowed
   (DE → "D"). Replaced with a compact "EN ▾" dropdown in app/partner/signup/page.tsx
   and app/HomePageContent.tsx.
4. **Signup/onboarding** confirmed already fully t()-wired; only removed a leftover
   `locale as "en"|"es"` cast in signup Step 5.

Delivery lessons (paste pipeline): multibyte UTF-8 corrupts in terminal paste — always
ship patches as pure-ASCII \u escapes. Even base64 long pastes can take a single homoglyph
substitution (an "F" became Cyrillic "Ф") — gzip+base64 halves the payload and hard-fails
on any corruption instead of writing garbage. Validate code edits with `npx tsc --noEmit`
against a faithful fixture, not just structural string checks: the chat STRINGS were first
inserted into the value *type* block instead of the value object because the brace-counter
anchored on the first `{` after `const STRINGS` (the type) rather than the `= {` value open.
Backups this round: .chat53c / .chat53d / .chat53e.<stamp>.bak.

~~Terms & Operating Rules PDF translations — FR, IT, PT, DE~~ ✅ Chat 53
~~Localize chat widget + mobile language switcher to FR/IT/PT/DE~~ ✅ Chat 53b

### Chat 53f — partner terms/rules headings were still English
The Chat 52/53 translation run translated clause/rule BODIES but left most section
HEADINGS (titles / section names) in English — its validator only checked JSON shape,
not that text changed. Pages and PDF were correct; the arrays were the problem.
Fix: re-translated only the 17 terms titles + 14 rules section names per language,
keeping every clause body byte-identical; new guard rejects any heading returned
identical to English and retries. Files: lib/portal/partnerTerms.ts, operatingRules.ts.
Backups .chat53f.<stamp>.bak. Lesson: when validating machine translation, assert the
output DIFFERS from the source, not just that it parses.

### Chat 53f/g — finishing portal i18n (terms/rules/account + settings)
Two root causes, both outside the files we kept editing:
1. **Uncommitted working-tree fixes.** app/partner/{terms,operating-rules,account}/page.tsx
   had the locale-aware RULES_BY_LOCALE/TERMS_BY_LOCALE edits applied on disk since Chat 53
   but NEVER committed — HEAD still had `locale === "es" ? _ES : _EN`, so production served
   English for FR/IT/PT/DE. Fix: commit + push the three pages. LESSON: disk-correct ≠
   deployed; check `git show HEAD:<file>` / the live DOM, not just the working copy.
2. **DB CHECK constraint.** partner_profiles.communication_locale_check only allowed
   ('en','es'); picking FR/IT/PT/DE on /partner/settings threw "violates check constraint".
   Fix (Supabase SQL): drop + re-add CHECK allowing en,es,fr,it,pt,de. customer_profiles
   still en,es by design (customer site is EN/ES). LESSON: widening UI language options
   needs matching DB constraint changes.
Section headings (Chat 53f): re-translated FR/IT/PT/DE titles/section-names; bodies
byte-identical. Verified live via browser (DE renders German end-to-end; settings save persists).
---

### Chat 53f/g - finishing portal i18n (terms/rules/account + settings) [Jun 26]
Two root causes, both OUTSIDE the files we kept editing:

1. Uncommitted working-tree fixes. app/partner/{terms,operating-rules,account}/page.tsx
   had the locale-aware TERMS_BY_LOCALE / RULES_BY_LOCALE edits applied on disk since
   Chat 53 but were NEVER committed - HEAD still had `locale === "es" ? _ES : _EN`, so
   production served English for FR/IT/PT/DE. Fix: committed + pushed the three pages.
   LESSON: disk-correct is NOT deployed. When a fix "isn't taking", check
   `git show HEAD:<file>` and/or the live DOM, not just the working copy.

2. DB CHECK constraint. partner_profiles_communication_locale_check only allowed
   ('en','es'); choosing FR/IT/PT/DE on /partner/settings threw
   "violates check constraint". Fix (Supabase SQL): dropped + re-added the CHECK to
   allow en,es,fr,it,pt,de. customer_profiles left at en,es by design (customer site
   is EN/ES). LESSON: widening UI language options needs a matching DB constraint change.

Section headings (Chat 53f): re-translated FR/IT/PT/DE section titles + names; clause/rule
bodies left byte-identical. Old translation run validated JSON shape but not that text
changed from English, so untranslated headings slipped through; new script rejects any
heading identical to source and retries.

Verified live via browser automation: /partner/operating-rules and /partner/account render
German end-to-end for DE; /partner/settings saves Deutsch and persists across reload with
no constraint error.

Delivery note: long pastes corrupt. Multibyte UTF-8 mangles in terminal paste (use \u
escapes / pure ASCII); even base64 took a homoglyph hit once and a dropped char once - gzip
+base64 shrinks payload and hard-fails on corruption. Backups this stretch: .chat53c/d/e/f.

---

### PLANNED (not started): Customer-site full localization FR/IT/PT/DE [scoped Jun 27]
(Customer-repo work, mirrored here for sync.) Customer site (camel-customer) is EN/ES only at
every layer. Goal: add fr,it,pt,de to match the portal's six locales (en,es,fr,it,pt,de).
EXCLUDED by decision: customer terms, privacy, cookie pages STAY ENGLISH - do not touch.
Switcher MUST work on mobile. PDFs STAY ENGLISH (NTUK legal doc) - replicate existing ES
behaviour (email localized, PDF English).

Do in PHASES, each its own commit + deploy + live-verify (lesson: disk-correct != deployed;
verify git show HEAD + live DOM). Translation rule: translate EVERYTHING, reject any value
byte-identical to English and retry (lesson: old runs left English in; validator only checked
shape). API key in .env.local (ANTHROPIC_API_KEY). Deliver patches pure-ASCII (\u escapes),
py_compile-gated, backups, tsc-checked. Heredocs: run direct, never wrap in outer cat<<EOF.

PHASE 1 - JSON: lib/i18n/locales/ has en.json + es.json (both 449 keys, 0 missing/extra).
  Generate fr/it/pt/de from en.json (all 449 keys), reject-English guard, verify parity on disk.
PHASE 2 - wiring + switcher (mobile):
  - lib/i18n/LanguageContext.tsx: type Locale (line 5) en|es -> 6; stored check (line 20) -> 6;
    detect de/fr/it/pt (line 30+); default stays "en".
  - lib/i18n/useTranslation.ts: import fr/it/pt/de json; translations registry (line 7) -> 6.
  - app/page.tsx CompactLanguageToggle (line 89, options line 91-93) -> 6 options; used
    desktop (line 430) AND mobile burger (line 467). Also stray hardcoded <option> at line 991
    (partner-marketing block) has en,es,it,fr,de but NO pt - fix to all 6.
  - Other switcher refs: lib/i18n/LanguageToggle.tsx, app/ClientRootLayout.tsx, app/account/page.tsx.
PHASE 3 - chat:
  - app/components/ChatWidget.tsx: type Locale (line 6) -> 6; STRINGS (en line 21, es line 39)
    add fr/it/pt/de; STRINGS[locale] ?? en already safe (line 87).
  - app/api/chat/route.ts: locale parse (line 50) es-or-en -> accept 6; systemPrompt (lines 142,181)
    replace `locale==="es"?"Spanish":"English"` with a langName map (same fix as portal route).
PHASE 4 - emails (PDF stays English):
  - lib/email.ts: brandEmail(headingEN,headingES,bodyEN,bodyES,locale) (line ~73) -> per-locale
    lookup w/ EN fallback; fns sendCustomerBidReceivedEmail (line 109), sendCustomerBookingCompletedEmail
    (line ~144), sendReviewReminderEmail (line ~183): widen locale union to 6, add fr/it/pt/de
    subject+body strings.
  - lib/portal/generateBookingReceiptPDF.tsx: email HTML subjectES/htmlES (lines 555-556) -> 6;
    PDF BODY STAYS ENGLISH (header note line 7). companyName ES fallback line 469/90.
  - Locale plumbing ALREADY EXISTS + WORKS: app/api/webhooks/stripe/route.ts has getCustomerLocale()
    (reads customer_profiles.communication_locale, lines 116-120) + getPartnerLocale (line 126),
    passes locale into sendBookingReceiptEmail (line 358), confirmed email (375), partner email (444).
    Currently collapses to ("es"?"es":"en") at lines 120/134 - widen these to return the real 6.
  - customer_profiles.communication_locale CHECK constraint is en,es ONLY - MUST widen to 6 via
    Supabase SQL before fr/it/pt/de can be saved (same fix as partner_profiles in portal Chat 53f).
  - Note: booking email routes live under app/api/test-booking/ AND app/api/webhooks/stripe/ -
    confirm which are live vs scaffolding before editing (webhook is live; receipt route too).
VERIFY each phase live via browser automation (Claude in Chrome) on www.camel-global.com,
incl. mobile viewport for the switcher. Backups: .loc / .chatwidget / .email per phase.
Stable rollback tag before this work: v-stable-customer-prelocalize (camel-customer).

### Chat 54 — Customer-site full localization FR/IT/PT/DE [Jun 27]
camel-customer brought from EN/ES to all 6 locales (en,es,fr,it,pt,de) to match the
portal. Customer terms/privacy/cookie pages stay ENGLISH (by decision). All PDFs stay
ENGLISH (NTUK legal) — email localized, PDF English, same as the existing ES behaviour.
Done in 4 phases, each its own commit + deploy + live-verify.

PHASE 1 — locale JSON: generated fr/it/pt/de from en.json via Claude API chunked script
  (50 keys/chunk, reject-English guard). Started 449 keys; +1 (nav.language) in phase 2 → 450.
  All 6 files 450/450, 0 missing/extra. Commit 169b993.
PHASE 2 — wiring + switcher: LanguageContext (Locale type → 6, browser detect, stored check),
  useTranslation (import+registry → 6), marketing/translations.ts (added pt block — it has its
  OWN Lang system separate from useTranslation; pt was missing from both the object AND the
  <option> list). Switcher: replaced the EN/ES CompactLanguageToggle with a portal-style
  six-box LanguageBoxes (compact prop) in BOTH app/page.tsx AND app/ClientRootLayout.tsx —
  the latter is the header on all logged-in pages (account/bookings) and was the reason
  logged-in users only saw EN/ES. Mobile burger uses a LANGUAGE-labelled box row like the
  portal. nav.language key added to all 6 locale files. Commits fa5ef3e, 55289f9, 622c7f4, 6d9832f.
PHASE 3 — chat: ChatWidget.tsx type Locale → 6 + fr/it/pt/de STRINGS blocks; api/chat/route.ts
  replaced es-or-en ternary with a langName map (model told the real language); ClientRootLayout
  ChatWidget locale cast widened. NOTE: chat bubble only renders when isCustomerLoggedIn — not
  a bug, by design. Commit (phase 3).
PHASE 4 — emails (PDF stays English): widened customer_profiles.communication_locale CHECK
  constraint en,es → en,es,fr,it,pt,de via Supabase SQL (GATING step — FR/IT/PT/DE cannot be
  saved without it; same fix as partner_profiles in Chat 53f). lib/email.ts brandEmail →
  map-based per-locale w/ EN fallback + SIG map; 3 customer emails (bid/completed/review) → 6.
  app/api/webhooks/stripe: getCustomerLocale/getPartnerLocale return real 6 (coerceLocale guard);
  inline brandEmail → map-based; customer-confirmed + partner-new-booking bodies → 6 via string
  maps with dynamic ${...} values preserved. generateBookingReceiptPDF.tsx: email subject/html/
  platform-notice → 6; PDF <Text> components UNTOUCHED (stay English). Commit a17f953.

Delivery lessons:
- Two SEPARATE EN/ES switchers existed (page.tsx + ClientRootLayout.tsx) — logged-out homepage
  vs logged-in pages. Fixing one isn't enough; the bug surfaced as "only EN/ES when logged in".
- marketing/translations.ts is a self-contained i18n island (Lang = keyof typeof translations,
  data-i18n attrs, setLanguage) — adding pt needed the translations object AND the <option>.
- Cross-file type chicken-and-egg: widening webhook's getCustomerLocale to return 6 broke its
  call into generateBookingReceiptPDF (still "en"|"es"). Each file's rewrite was correct alone
  but neither passed tsc in isolation — applied BOTH then tsc ONCE (shimmed npx to no-op so the
  per-file scripts wrote without self-restoring, then ran real tsc; restore both only on fail).
- API JSON-mode returns trailing prose after the } — strip via brace-matching extract, not
  whole-response json.loads.
- Translation bundles excluded 'es' (already on disk) — but EM_STRINGS maps need all 6;
  re-add es verbatim from existing code before building Record<Locale,...> literals.
- One straight-quote inside a value (translator used " not ") breaks the TS string — scan for
  inner straight-quotes before splicing; convert to curly to match house style.

Branch protection: main requires PRs; pushes used admin bypass ("Bypassed rule violations").

Remaining / verify:
- LIVE EMAIL TEST not yet done: set a test customer communication_locale='de', trigger a booking
  confirmation, confirm email arrives German + PDF English.
- Other logged-in pages with bespoke headers (bookings/[id], checkout) not individually audited —
  most inherit ClientRootLayout so should be covered; spot-check if EN/ES appears anywhere.


---

### Chat 55 — Full email localization + new-request partner alert + UI language fixes [Jun 27]
Two repos touched. Stable rollback tags: `v-stable-chat55` on BOTH camel-portal and camel-customer.

**Customer-repo UI fixes (camel-customer)**
- `app/account/page.tsx` — email-language picker was hardcoded EN/ES; now shows all 6
  (en,es,fr,it,pt,de) via an EMAIL_LANGS array + EmailLocale type. DB constraint was already
  widened to 6 in Chat 54, so this was pure UI.
- `app/checkout/[bid_id]/page.tsx` — checkout renders its OWN nav (the global header in
  ClientRootLayout is suppressed on /checkout via `!isCheckoutPage`), so it had NO language
  switcher. Added a CheckoutNav: desktop inline 6-box switcher + mobile burger dropdown with a
  LANGUAGE row, byte-matching the global LanguageBoxes style. Reads useLanguage() from the same
  LanguageProvider, so it drives whole-app locale. Logo kept non-link (no abandonment path mid-pay).

**New feature — partners alerted to new requests (camel-customer)**
- Symptom: customer posts a request, in-radius car-hire companies were never emailed to bid.
  There was NO partner-alert email anywhere in either repo — never built.
- `lib/email.ts` (customer) — added `sendPartnerNewRequestEmail(to, {jobNumber, vehicleCategory,
  pickupArea, expiresAt, locale})`, 6-locale + EN fallback, links to PORTAL /partner/requests,
  shows request#/vehicle/pickup area/"respond before" deadline (formatted per locale). Also
  exported `Locale` + `coerceLocale()` (were previously un-exported).
- `app/api/test-booking/requests/route.ts` — the geo+fleet match already existed (haversine vs
  base_lat/base_lng + service_radius_km, fleet category/capacity) and wrote request_partner_matches,
  but never emailed. Now:
    1. added communication_locale to the partner_profiles select;
    2. after the match loop, looks up partner_applications for the matched user_ids and keeps ONLY
       status==='live' (partner_applications.email is the contact address);
    3. the LIVE set drives BOTH the match-rows insert AND the emails — so non-live partners are
       neither matched nor emailed (BEHAVIOUR CHANGE: previously approved-not-live in-range partners
       got match rows; now they don't);
    4. emails the live set via Promise.allSettled (non-blocking — a mail failure never fails
       request creation). One email per partner (eligiblePartners map dedupes by user_id).
  - "Live" = partner_applications.status === 'live' (set by refreshPartnerLiveStatus / make-live).
  - GOTCHA: a live partner with null base_lat/base_lng or service_radius_km silently never matches
    (loop skips null coords). SQL to audit:
    SELECT pa.company_name, pa.status, pa.email, pp.communication_locale, pp.base_lat, pp.base_lng,
           pp.service_radius_km
    FROM partner_applications pa JOIN partner_profiles pp ON pp.user_id = pa.user_id
    WHERE pa.status = 'live';

**Full email localization — every notification now honours communication_locale (camel-portal)**
Root problem (same shape as the bid-email bug): locale lookups collapsed `de→en` via
`=== "es" ? "es" : "en"`, and several emails had NO fr/it/pt/de branch at all. Fixed across:
- `lib/email.ts` (portal) — brandEmail + all 7 senders widened to EmailLocale (6) with per-locale
  subject/heading/body maps + EN fallback. Exported `EmailLocale` type + `coerceEmailLocale()` for
  routes/crons to reuse. Default stays "en" so it's backward-compatible. "Meet & Greet Car Hire"
  tagline stays English (brand). Tag commit shipped first (fixed bid email — confirmed German).
- Locale lookups changed from the es/en collapse to `coerceEmailLocale(...)` (real 6, EN fallback) in:
  - app/api/partner/bids/route.ts (customer bid-received)
  - app/api/admin/applications/make-live/route.ts (account-live)
  - app/api/admin/applications/update-status/route.ts (approval + rejection)
  - app/api/admin/applications/resend-approval/route.ts (approval resend)
  - app/api/cron/onboarding-reminder/route.ts (approval reminder)
  - app/api/cron/review-reminder/route.ts (customer review reminder)
- Bespoke inline-HTML emails (had hardcoded es?ES:EN, no other langs) rewritten to 6-locale string
  maps with EN fallback; their attached PDFs STAY ENGLISH (NTUK rule):
  - lib/portal/completeBooking.tsx — customer + partner COMPLETION emails refactored into
    buildCustomerCompletionEmail / buildPartnerCompletionEmail; the 2 locale lookups (partner ~441,
    customer ~452) now coerceEmailLocale. Stripe transfer-reversal/refund + StatementDocument PDF
    UNCHANGED. Fuel level VALUES (fuelLabel/QUARTER_LABELS → "½ Tank") stay English in all locales
    (matches prior ES behaviour); only labels/prose localized.
  - app/api/admin/bookings/[id]/post-refund/route.ts — customer refund email → 6-locale; Stripe
    reversal/refund + cap check + amended PDF UNCHANGED.
  - app/api/admin/bookings/[id]/resend-statement/route.ts — customer statement email (normal +
    amended) → 6-locale; PDF UNCHANGED.
- DELIBERATELY left English: invoice-data/route.ts:45 (feeds the Invoice Data PDF, not an email —
  PDF stays English); all internal [Admin] notification emails (internal audience).

**Method / lessons this session**
- Every file delivered as a download + tsc-verified (standalone or stubbed) before deploy — incl.
  JSX stub-tsc for completeBooking.tsx and react-pdf/Stripe/Supabase stubs. Stub-induced false
  errors (e.g. db typed `any` → Map value `{}`, NextRequest missing .json) were confirmed by
  running the ORIGINAL file under the same stub.
- I cannot run the repo's Python translation script (ANTHROPIC_API_KEY only in user's .env.local),
  so the FR/IT/PT/DE email strings were written directly (finite set), placeholders/${...} preserved.
- macOS gotcha: `~/Downloads` had com.apple.macl/provenance xattrs → `cp`/`cat <` from Downloads
  hit "Operation not permitted"; `cat src > dest` TRUNCATES dest even when the read fails (clobbered
  lib/email.ts once — restored via `git checkout HEAD -- lib/email.ts`). Fix: grant terminal
  Downloads/Full-Disk access in System Settings, or drag files via Finder. Never paste a line
  starting with `#` into zsh (it errors and can eat the next command / leave a quote> prompt).

Stable tags: v-stable-chat55 (camel-portal AND camel-customer).


---

## Chat 55 — Email localization sweep + webhook hardening + UI language fixes [Jun 27 2026]
Stable rollback tag: `v-stable-chat55` on BOTH camel-portal and camel-customer.
(This block supersedes any earlier partial Chat 55 note — it includes the webhook work.)

### Shipped (camel-customer)
- **Account email-language picker → 6 locales.** `app/account/page.tsx` was hardcoded EN/ES;
  now shows all 6 (en,es,fr,it,pt,de). DB constraint already widened in Chat 54.
- **Checkout language switcher (was entirely missing).** `app/checkout/[bid_id]/page.tsx` — the
  global header is suppressed on /checkout (ClientRootLayout `!isCheckoutPage`), so checkout had
  no switcher. Added CheckoutNav: desktop inline 6-box + mobile burger dropdown, matching the
  global LanguageBoxes style, reading useLanguage() from the same provider. Logo kept non-link.
- **NEW: partners emailed on new requests.** Previously the geo+fleet match wrote
  request_partner_matches but never emailed anyone — the alert was never built.
  - `lib/email.ts` — added `sendPartnerNewRequestEmail(to,{jobNumber,vehicleCategory,pickupArea,
    expiresAt,locale})`, 6-locale, links to PORTAL /partner/requests. Exported `Locale`+`coerceLocale()`.
  - `app/api/test-booking/requests/route.ts` — after matching, looks up partner_applications for the
    matched user_ids and keeps ONLY status==='live'; the LIVE set now drives BOTH the match-rows
    insert AND the emails (Promise.allSettled, non-blocking).
  - BEHAVIOUR CHANGE: approved-but-not-live in-range partners no longer get match rows.
  - GOTCHA: a live partner with null base_lat/base_lng or service_radius_km silently never matches.

### Shipped (camel-portal) — full email localization
Root cause (same as the bid-email bug): locale lookups collapsed de→en via `=="es"?"es":"en"`, and
several emails had no fr/it/pt/de branch. Every notification now honours communication_locale across
6 locales (EN fallback). Attached PDFs STAY ENGLISH (NTUK rule).
- `lib/email.ts` — brandEmail + all 7 senders widened to EmailLocale(6) + per-locale maps. Exported
  `EmailLocale` + `coerceEmailLocale()`.
- Lookups switched to `coerceEmailLocale(...)` in: partner/bids, admin/applications/make-live,
  update-status, resend-approval, cron/onboarding-reminder, cron/review-reminder.
- Bespoke inline-HTML emails rewritten to 6-locale string maps (PDFs untouched):
  `lib/portal/completeBooking.tsx` (customer + partner completion — refactored into
  buildCustomerCompletionEmail/buildPartnerCompletionEmail; Stripe reversal/refund + StatementDocument
  PDF byte-identical); `admin/bookings/[id]/post-refund/route.ts` (customer refund email; Stripe +
  cap check + PDF unchanged); `admin/bookings/[id]/resend-statement/route.ts` (customer statement
  email, normal + amended; PDF unchanged).
- Deliberately English: invoice-data/route.ts (feeds Invoice Data PDF, not an email); all internal
  [Admin] notification emails. Fuel level VALUES (fuelLabel/QUARTER_LABELS → "½ Tank") stay English
  in all locales — only labels/prose localized.

### Shipped (camel-portal) — Resend webhook signature verification [DONE]
- `app/api/admin/outreach/webhook/route.ts` now verifies svix signatures (`svix` npm package added).
  Bad/missing signature → 401; processing errors still → 200 (no Resend retry storms).
- GOTCHA (this is what "format mismatch" was): RESEND_WEBHOOK_SECRET in Vercel must be the EXACT
  Resend signing secret INCLUDING the `whsec_` prefix — no quotes, no trailing newline. A wrong/
  missing prefix makes svix throw "Base64Coder: incorrect characters for decoding", every event 401s,
  and open/click tracking silently stops. Env var changes require a redeploy. Verified working
  (live click incremented the count) after correcting the secret.

### Method / lessons
- Every file delivered as a download + tsc-verified (standalone or stubbed) before deploy. Stub-
  induced false errors (db typed `any`; NextRequest missing .json) confirmed by running the ORIGINAL
  file under the same stub.
- FR/IT/PT/DE email strings written directly (can't run the repo's translation script — ANTHROPIC_API_KEY
  is only in the user's .env.local).
- macOS: `~/Downloads` had com.apple.macl/provenance xattrs → cp/cat-from-Downloads = "Operation not
  permitted"; `cat src > dest` TRUNCATES dest even when the read fails (clobbered lib/email.ts once;
  restored via `git checkout HEAD -- lib/email.ts`). Fix: grant terminal Downloads/Full-Disk access,
  or drag via Finder. Never paste a line starting with `#` into zsh.

---

## OUTSTANDING — to do (Chat 56+)

### A. Verification / live tests (do soon — code is shipped, real-world send not yet confirmed)
- [ ] **Live German email test.** Set a test customer communication_locale='de', trigger a booking
      confirmation + a completion; confirm emails arrive in German with English PDFs. Now broad —
      the whole email surface was localized this session. Clicks track more reliably than opens.
- [ ] **Partner new-request alert — live test.** Confirm a live, in-radius partner actually receives
      "New booking request in your area". Run the null-coords audit first:
      SELECT pa.company_name, pa.status, pa.email, pp.communication_locale, pp.base_lat, pp.base_lng,
             pp.service_radius_km
      FROM partner_applications pa JOIN partner_profiles pp ON pp.user_id = pa.user_id
      WHERE pa.status='live';
- [ ] **bookings/[id] language switcher** spot-check (checkout was fixed this session; this page has a
      bespoke header and wasn't individually audited for EN/ES leaks).

### B. Deferred technical work
- [ ] **Server-side middleware auth gate.** middleware.ts is still pass-through (NextResponse.next()).
      DECISION: defence-in-depth only — data is already protected at the API layer (verified JWT +
      .eq ownership scoping). Riskier change (session/cookie handling); test on staging. Low priority.
- [ ] **Commission invoice VAT.** Add VAT number + 20% UK VAT to the commission invoice PDF once NTUK
      is VAT-registered.
- [ ] **Xero monthly commission endpoint** — not built.

### C. US market launch (currently "ready-but-not-activated" — real gaps below)
Handover frames US as a future market: USD is wired through the currency system, Stripe Connect
country map includes US — but the platform is built UK/NTUK + EU/Spain-shaped. None of the below is
a code blocker today; they are the work a real US launch would require. NOTE: tax/legal items here
need confirmation with a US tax/legal professional — they are flagged as areas to address, not advice.
- [ ] **Sales tax vs VAT.** The entire invoicing/commission architecture assumes UK VAT (and EU/Spain).
      The US has no VAT — it uses state/local sales tax with nexus rules. A US launch needs a US
      sales-tax model (likely a tax provider e.g. Stripe Tax / Avalara), not the VAT path.
- [ ] **Partner tax reporting: DAC7 → 1099-K.** DAC7 (the deferred EU platform-reporting item) is
      EU-specific. A US launch would instead need IRS 1099-K reporting for partner payouts, plus
      W-9/TIN collection at partner onboarding. Different system entirely.
- [ ] **Legal pages / locale.** Customer legal pages (terms, privacy) are EN/ES-only by design. US
      needs US-English content and US-specific terms/privacy (e.g. CCPA/state privacy), reviewed by
      counsel. Operating Rules / Terms PDFs would need a US variant.
- [ ] **USD end-to-end validation.** USD is wired and Stripe Connect lists US, but the full customer
      pay → partner payout (USD) path has not been live-tested. Validate before any US pilot.
- [ ] **Entity / banking / Stripe.** NTUK is a UK company. Confirm whether US operations need a US
      entity, US tax registration, and Stripe Connect onboarding for US-based partners (US bank
      accounts, SSN/EIN). Finance/legal task, not engineering.
- [ ] **i18n / formatting.** US date/number/address formats, US phone validation, and US-English copy
      (vs en-GB) where the UI currently assumes UK/EU conventions.

### Reference: removed from Future Work this session (done)
- Terms & Operating Rules PDF translations FR/IT/PT/DE — DONE.
- Resend webhook signature verification — DONE (this session).

# Handover — Chat 56

Continues from the Chat 55 handover. Two repos: **camel-portal** (partner/admin/driver portal) and **camel-customer** (customer booking site). Both Next.js, Supabase, Stripe Connect, 6-locale i18n (en/es/fr/it/pt/de).

Stable tags: `v-stable-chat55` (start of this session). Recommend tagging `v-stable-chat56` at the end (see rollback doc).

---

## What shipped this session

### 1. Mobile language-switcher consistency (portal)
All portal auth/marketing surfaces now use ONE pattern: desktop inline switcher (`lg+`), mobile **hamburger** whose dropdown holds a six-box LANGUAGE row (`t("settings.language.label")` + `flex-1 / py-2.5` active-orange), matching the driver authenticated header.
- Homepage, partner login, partner reset-password, partner signup, driver public header (login/signup/reset via `app/driver/layout.tsx`).
- Root cause fixed along the way: `LanguageToggle.tsx` has **no** `hidden lg:flex` (handover-55 note was wrong) — it renders at all breakpoints, which caused a double-up when a second mobile row was added. Fix = wrap inline toggle in `hidden lg:*` + single mobile treatment.

### 2. Stripe connect hardening (portal) — `71bfb3a` + `7cc88c9`
`app/api/partner/stripe/connect/route.ts`:
- `stripeCountry()` now **throws** on an unrecognised `base_country` instead of `|| "ES"`. The old silent Spain default created wrong-country Stripe accounts (a connected account's country is **locked at creation**), which is exactly what broke the Australian partner.
- Account settlement currency is **country-derived** (`COUNTRY_CURRENCY[countryCode]`), not the partner's display currency.
- On account creation, writes `default_currency = settlement currency` (uppercased) back to `partner_profiles` → **Stripe is the single source of truth** for partner currency.

### 3. Multi-currency rollout: AUD / NZD / CAD (both repos) — Phases 0–4
Added Australian Dollar, NZ Dollar, Canadian Dollar to the existing EUR/GBP/USD system. **Key architecture (confirmed with the code, corrects a stale comment):** the system is **bid-currency, NO FX** — the partner's currency (= their Stripe settlement currency, country-derived, read-only) is what they bid in, what the customer is charged, and what they're paid out. The `useCurrency`/rate layer is only a **secondary browse-display** aid, never the transactional path.

- **Phase 0 (foundation):** `lib/currency.ts` widened to 6; new shared exports `CURRENCIES`, `currencyLocale()`, `currencySymbol()`, `coerceCurrency()`, `isCurrency()`, `formatMoney()`. `lib/useCurrency.ts`, `app/api/currency/rate/route.ts`, and customer `lib/serverCurrency.ts` all handle 6. Rate route fetches AUD/NZD/CAD from frankfurter.app.
- **Phase 1 (coercion points):** every place that narrowed currency to EUR/GBP(/USD) now uses `coerceCurrency()` — portal `bids/route.ts`, `partner/requests/[id]`, `admin/accounts/[id]`; customer `create-intent`, `book/page.tsx`, `test-booking/{requests,bids/accept,requests/[id]}`. This is what lets an AUD bid be stored and charged as AUD.
- **Phase 2 (reporting/CSV):** the 4 reporting pages (`admin/bookings`, `admin/reports`, `partner/bookings`, `partner/reports`) iterate `CURRENCIES` instead of `["EUR","GBP","USD"]`; per-currency accumulators built dynamically from `CURRENCIES`. AUD/NZD/CAD now appear in breakdowns, filters, and CSV summary rows.
- **Phase 3 (read-only currency UI):** partner currency is Stripe-derived & locked. `partner/profile/page.tsx` shows all 6 correctly (was falling through to "Euro"). Onboarding `StepCurrency` is now **informational** (no picker, no DB write) — reused `onboarding.currency.*` keys, retext'd in all 6 locales, explaining currency is set at the Stripe payout step.
- **Phase 4 (formatting polish):** replaced the repeated `GBP→en-GB, USD→en-US, else es-ES` ternaries / 3-key locale maps with the shared `currencyLocale()` across booking-detail pages, PDFs, refund/statement routes, webhook. AUD/NZD/CAD now format natively (A$/NZ$/C$ with correct grouping).
- **Phase 5 (verification):** end-to-end tested by flipping test booking `1000167` through AUD→NZD→CAD and confirming bookings/reports/CSV/detail render correctly, then restored to EUR. **Passed.** (Data-only test, no live charge.)

The **€10 minimum-commission floor** (stored EUR) now converts to bid currency via a fixed `MIN_FLOOR_RATE` map in `create-intent` (approximate rates: AUD 1.63, NZD 1.78, CAD 1.47).

### 4. Australia city list + generic tax wording (portal) — `19a971a`
- Portal `lib/cities.ts` was stale (Spain/UK/FR/IT/DE/PT only). Replaced with the customer repo's fuller list — now includes **Australia** (7 cities), Netherlands, Ireland, expanded US/UK/Greece, UAE. Fixes AU partners being unable to find their city at signup.
- Genericized Spain-specific tax strings site-wide across all 6 locales: **"VAT / NIF" → "VAT / Tax number"** (localized per language), removed the "Spanish companies use a NIF… ESB12345678" hint/placeholder, softened the eligibility line. No new translation keys.

---

## Current currency model (important for future work)

- **One currency per partner = their Stripe account settlement currency** (country-derived at Stripe onboarding, written to `partner_profiles.default_currency`, **read-only** everywhere).
- **Bid currency = charge currency = payout currency = settlement currency.** No FX on the transactional path.
- Each bid/booking **snapshots** its currency at creation (`partner_bids.currency`, `partner_bookings.currency`) — history is immutable; changing a profile currency never rewrites past rows.
- Multi-currency-per-partner is deliberately **out of scope** (would require multiple Stripe accounts and reintroduce FX).
- Supported set is defined once in `lib/currency.ts` `CURRENCIES`. Adding a 7th currency = add it there + its `COUNTRY_MAP`/`COUNTRY_CURRENCY` entry in the connect route + a `MIN_FLOOR_RATE` entry + a rate in the rate route/`serverCurrency`. The shared helpers mean most consumers pick it up automatically.

---

## Stripe corridor reality (the AU/NZ payout blocker)

- Your UK platform uses **destination charges** (customer pays → funds auto-transfer to partner's connected account). This works **in-corridor only**: US, UK, EEA, **Canada**, Switzerland.
- **CAD is fully live** — Canada is in-corridor, no extra Stripe setup.
- **AU / NZ are OUT of corridor.** Cross-border transfers don't reach them, and recipient-service-agreement accounts can't receive cross-border transfers either. Confirmed by Stripe live chat.
- **The solution is Global Payouts** — a separate rail: funds land in the platform balance, then you explicitly send an outbound payment to the AU/NZ partner as a "recipient" (their bank details, per-payout FX quote, 0.25%+ fee). It is **limited public preview**, **Sales-gated** (not self-serve), verification takes a few business days.
- **Status:** email sent to Stripe Sales requesting Global Payouts access for AU/NZ (see the 5 questions below). **Nothing to build until they reply** — Q2 (reuse Connect accounts vs. separate recipients) and Q5 (destination-charge vs. separate-charge-plus-outbound) determine the whole shape of the build.

Questions pending with Stripe Sales:
1. Enable Global Payouts for UK platform, AU/NZ recipients — eligibility/timeline.
2. Reuse existing Connect accounts as recipients, or create separate Global Payouts recipient objects?
3. Exact recipient onboarding data required (bank/routing, address, business type)?
4. Available payout methods for AU/NZ (local bank vs card)?
5. Works with destination charges, or requires separate charges + explicit outbound payment per booking? FX/fee/settlement mechanics?

---

## Kingsman Chauffeur Services (the AU partner) — state

- `user_id = 116fd343-a034-4153-ac33-34bf1fcd7153`
- Old **Spanish** Stripe account `acct_1TmAtY96UBUllKs9` was created by the pre-fix silent-ES default → couldn't attach an AU bank (country locked). **Deleted in Stripe.**
- Profile now primed for a clean AU reconnect: `base_country = Australia`, `default_currency = AUD`, `stripe_account_id = NULL`.
- **Next:** partner reconnects via portal ("Connect Stripe") → route mints a fresh **AU** account (AUD settlement) → he can add his Australian bank and complete onboarding. Reconnect email drafted/sent.
- **Payout still blocked** until Global Payouts is enabled (above). Onboarding completes; live payout follows Stripe approval.

---

## Outstanding / to-do

**Blocking on Stripe (no code until they reply):**
- Global Payouts approval for AU/NZ → then build the AU/NZ payout path (likely: separate charge to platform balance + recipient creation + per-booking outbound payment + reconcile against existing `payout_status`/`payout_batch_id` columns). Scope as its own phased project.

**Carried over from Chat 55 (still open):**
- Live German-email test (set a test customer `communication_locale='de'`, trigger booking confirmation + completion, verify German email + English PDF).
- Partner new-request alert live test — run null-coords audit SQL first (live partners with null `base_lat`/`base_lng`/`service_radius_km` silently never match), then confirm a live in-radius partner receives the alert.
- `bookings/[id]` language-switcher spot-check (bespoke header, never audited for EN/ES leaks).
- Server-side middleware auth gate (`middleware.ts` still pass-through; defence-in-depth, low priority).
- Commission invoice VAT (blocked on NTUK VAT registration); Xero monthly commission endpoint (not built).
- US-market launch items (sales tax vs VAT, 1099-K/W-9, US legal pages, USD end-to-end, entity/banking) — need a US professional.

**Housekeeping:**
- `.bak` files piling up in both repos (`*.chat5*.bak`) — clutter `git status`. Sweep them out or add `*.bak` to `.gitignore` when convenient.
- `git` shows `camel-coming-soon` submodule always modified — ignore it, never `git add` it.

---

## Working-agreement notes (carried forward + reinforced this session)

- **Always check the actual file before rewriting** — never assume the artifact/comment is current. (Two stale-comment traps this session: the `LanguageToggle` "hidden lg:flex" note, and the `currency.ts` "all prices in EUR" comment — both wrong; the code was truth.)
- **Deliver as downloads or `python3 << 'PYEOF'` heredocs**, not pasted scripts. Browser downloads to `~/Downloads` sometimes don't land — heredocs are the reliable path. Never paste raw multi-line scripts into zsh (garbled / `event not found`).
- **zsh globs `[id]` paths** — always single-quote paths containing `[...]` in `git add`, `cat`, `sed`, etc. This bit us repeatedly.
- **Patch scripts must back up + assert + abort on mismatch** (never silent no-op). Validate against a faithful fixture when the file's too big to eyeball.
- **`tsc --noEmit` after every change; commit per logical unit.** Widening a shared type surfaces every hardcoded consumer — use tsc as the checklist.
- **Terminal command output frequently pasted back empty this session** — screenshots came through reliably. If a paste is blank, screenshot the terminal.
- Git commits show a "committer name/email not configured" notice — harmless; commits succeed. (Optionally `git config --global user.name/user.email` to silence.)

---

## Chat 57 — Revert recovery + outreach conversion diagnosis + signup banner [Jul 4 2026]

Stable tag: `v-stable-chat57` (camel-portal). Most of this session was (1) recovering an accidental
revert of the entire Chat 56 portal session, and (2) diagnosing why partner outreach converts poorly
and shipping a fix to the signup page. camel-customer was NOT affected by the revert and was not
changed this session (still at `v-stable-chat56`).

### 1. Accidental revert of all Chat 56 work — RECOVERED
- Symptom: after asking a previous chat for a "safe rollback + handover update", `git log` showed a
  stack of 13 `Revert "..."` commits on `origin/main` (all authored 22:06 same batch) that had backed
  out EVERY Chat 56 portal commit — the 6-currency phases (0–4), Stripe connect hardening, AU city
  list, and the mobile language-switcher work. `grep` confirmed the code was gone from disk
  (`CURRENCIES`=0, `COUNTRY_CURRENCY`=0). This was NOT intentional — a "rollback" request had been
  executed as `git revert` of the commits rather than a tag.
- Recovery: identified last good commit `19a971a` (end-of-Chat-56, "Add Australia + fuller city
  list…"). Tagged the broken tip as `backup-before-restore-chat56` (safety net), then
  `git reset --hard 19a971a`, cherry-picked back the one legit post-revert commit (the `.gitignore`
  `*.bak` change `5c0da15`), verified code was restored on disk (`CURRENCIES`=3 etc.), then
  `git push --force-with-lease origin main`. Re-tagged `v-stable-chat56` properly.
- **Vercel gotcha (important):** even after `main` was fixed, the live site still served the OLD
  reverted build because Vercel had auto-promoted a *revert* commit to Production. Git being correct
  does NOT mean production is correct. Fix: promote the correct deployment (`19a971a`) in the Vercel
  dashboard. LESSON: after any history recovery, check the Vercel **Production badge is on a good
  commit**, not just that git/`main` is right.
- **LESSON (headline):** a "safe rollback" means create a `git tag` (changes nothing) — NEVER
  `git revert` the commits (backs out working code). A tag is a bookmark; a revert is a deletion.

### 2. Outreach conversion diagnosis (GA4)
Outreach was ~616 sent, ~207 opens (34%), ~36 clicks, but only 2 signups. Investigated the whole
funnel:
- **List is clean.** `SELECT country, COUNT(*) FROM outreach_prospects GROUP BY country` = 1,449
  Spain, 1 UK. The "opens from Netherlands/Ireland" the user worried about are Apple Mail Privacy /
  corporate-scanner PROXY opens (they geolocate to Irish/Dutch datacentres), not real non-Spanish
  companies. Email open/click geo is unreliable for this reason; click counts are also inflated by
  proxy pre-fetch, so real human clicks < 36.
- **The drop is click → signup-form, not form abandonment.** GA4 funnel showed `/partner/signup`
  reached by only ~4 users over 90 days with **~4–9 second** engagement (a bounce), and
  `/partner/application-submitted` ~2–3 users (= the 2 real signups). The homepage (`/`) gets real
  prospect traffic (33s engagement) and tells the story well — but Step 1 of signup was a cold,
  context-free form that killed the momentum.
- **Open lead for next session:** `/partner/login` was getting ~3.5× MORE outreach traffic than
  `/partner/signup` (35 vs 10 views). New prospects shouldn't be hitting login — they have no
  account. Likely CTA ambiguity (homepage "Partner login" button next to "Apply", or email wording).
  Worth investigating — could be an easy conversion win.

### 3. GA4 saved-report gotcha (for future analytics work)
- Temporary filters in standard **Reports** (the filter chip) do NOT persist on save — GA4 clears
  them; only report structure (dimensions/metrics/date) saves. To keep a filtered view: use a
  **Comparison** (persists in Reports, shows alongside All Users) OR build it in **Explore**
  (filters persist fully — preferred).
- Built a permanent Explore exploration named **"Outreach Journey"** (Free-form): rows = Page path,
  values = Views + Avg engagement time, filters = `Session campaign exactly matches founding-partner`
  AND `Page path does not match regex .*(admin|driver|/partner/(dashboard|bookings|requests|reports|
  drivers|fleet|profile|settings|account|onboarding)).*`. Reopen after each batch to see the clean
  prospect funnel. NOTE on the regex: anchored `/(admin|driver)` did NOT reliably match; the
  `.*(...).* ` form does.
- **Internal Traffic filter:** created in Chat 52 but check it's set to **Active**, not **Testing**
  (Admin → Data settings → Data filters). In Testing it does nothing. It is not retroactive. (This is
  why the user's own traffic still appeared in older reports.) For outreach analysis it barely matters
  — filter by `session campaign = founding-partner`; you don't click your own outreach emails
  (except the test prospects nicktrin+101/+102, which DO pollute the campaign bucket — hence the
  page-path exclusion above).

### 4. Signup Step 1 fix — founding-partner banner (SHIPPED)
Root cause of the 4-second signup bounce: the excellent, story-rich homepage handed prospects to a
naked Step-1 form with zero reinforcement of the pitch. Fix = a bold reassurance banner.
- `app/partner/signup/page.tsx`: widened both `max-w-2xl` containers (header + card) to `max-w-4xl`;
  inserted a full-width **orange banner at the TOP of the card, above the ProgressBar** (so it shows
  on ALL 5 steps by design — reinforces free/quick throughout). Banner = "FOUNDING PARTNER INVITATION"
  label + three white cards: **FREE TO JOIN** / No monthly fees, ever · **5 MINUTES** / Quick and
  simple to apply · **MORE BOOKINGS** / Alongside your existing business.
- Deliberately DROPPED from earlier drafts (per user, marketing calls): commission % (it's a negative
  — don't advertise your cut), "100% fuel to you" (confusing to a cold reader), and any Spain
  reference (keeps it universal / non-dating). No € shown.
- i18n: reused/rewrote `signup.step1.reassure.*` keys (founding, stat1–3, sub1–3) across all 6
  locales (en/es/fr/it/pt/de). No logic, validation, GA tracking, or API touched — copy + layout only.
- Delivery method: pure-ASCII `python3 << 'PYEOF'` heredocs (backup + anchor-count assert + abort on
  mismatch), `npx tsc --noEmit` clean before each deploy. Backups `.chat57*.bak` (swept at end).

### To measure whether it worked
Reopen the "Outreach Journey" Explore after the next send batch and watch:
- `/partner/signup` **avg engagement time** — was ~4s; should climb if the banner reduces the bounce.
- `/partner/application-submitted` **count** — the real success metric (was ~2). Small numbers — give
  it a batch or two before judging.

### Housekeeping done this session
- `.bak` sweep + `*.bak` added to `.gitignore` (both repos) — early in session.
- Handover `.md` committed to both repos (Chat 56 section had been uncommitted on disk).
- `v-stable-chat56` tagged on BOTH repos (was missing); `v-stable-chat57` on camel-portal.
- Safety tag `backup-before-restore-chat56` still on the old broken portal tip — deletable once
  confident (`git tag -d backup-before-restore-chat56`, local only, never pushed).

### Still open / next session
- **Investigate `/partner/login` >> `/partner/signup` outreach traffic** (CTA ambiguity — likely
  quick win).
- Carried from Chat 56: Stripe Global Payouts for AU/NZ (blocked on Stripe Sales reply); live
  German-email test; partner new-request alert live test (run null-coords audit SQL first);
  `bookings/[id]` language-switcher spot-check; middleware auth gate; commission-invoice VAT; Xero
  endpoint; US-market items.

