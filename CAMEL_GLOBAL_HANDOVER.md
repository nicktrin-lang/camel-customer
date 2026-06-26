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
