import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Terms of Use | Camel Global",
  description: "The terms that apply when you use Camel Global to book meet & greet car hire in Spain. Includes our 48-hour cancellation policy, document requirements and refund terms.",
};

const EFFECTIVE_DATE  = "1 June 2026";
const COMPANY_NAME    = "NTUK Ltd (trading as Camel Global)";
const COMPANY_REG     = "08765474";
const COMPANY_ADDRESS = "Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN";

export default function CustomerTermsPage() {
  return (
    <div className="w-full">

      {/* Hero */}
      <section className="w-full bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Legal</p>
          <h1 className="mb-3 text-4xl font-black text-white md:text-6xl">Customer Terms of Use</h1>
          <p className="text-white/60 text-sm font-semibold">Effective: {EFFECTIVE_DATE}</p>
        </div>
      </section>

      {/* Content */}
      <section className="w-full bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl space-y-8 text-black leading-relaxed">

          <p className="text-base font-semibold">
            These terms apply when you use the Camel Global platform as a customer to request and book a
            hire car. Please read them — they explain how the platform works, what we&apos;re responsible for,
            and what we&apos;re not. If anything isn&apos;t clear, use our{" "}
            <a href="/contact" className="text-[#ff7a00] hover:underline">contact form</a>.
          </p>

          <hr className="border-black/10" />

          <div>
            <h2 className="text-2xl font-black text-black mb-3">1. Who we are</h2>
            <p className="text-base font-semibold">
              {COMPANY_NAME} (&quot;Camel&quot;, &quot;we&quot;, &quot;us&quot;) is registered in England &amp; Wales
              (company number {COMPANY_REG}), registered address {COMPANY_ADDRESS}.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">2. What Camel Global actually is</h2>
            <div className="bg-[#f0f0f0] px-5 py-4 mb-4">
              <p className="text-base font-black text-black">
                Camel Global is a platform intermediary, not a car hire company.
              </p>
            </div>
            <p className="text-base font-semibold mb-3">
              When you accept a bid and confirm a booking, you are entering into a car hire contract directly
              with the partner (the car hire company). Camel Global facilitates that transaction — we connect
              you with available partners, process the booking, and manage the job from request to completion —
              but the rental agreement is between you and the partner.
            </p>
            <p className="text-base font-semibold">
              This means the partner is responsible for the condition of the vehicle, the insurance,
              and the fulfilment of your hire. Camel Global is responsible for the platform and the
              booking process described in these terms.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">3. Creating an account</h2>
            <p className="text-base font-semibold mb-3">
              You need to create an account to make a booking. You must provide accurate information and
              keep your login details secure. You&apos;re responsible for any activity on your account.
            </p>
            <p className="text-base font-semibold">
              You must be 18 or over to create an account. By registering you confirm this.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">4. Making a booking</h2>
            <p className="text-base font-semibold mb-3">
              When you submit a request, it&apos;s sent to verified partners within range of your pickup location.
              Partners may or may not place a bid — we can&apos;t guarantee that any specific partner or number
              of partners will respond.
            </p>
            <p className="text-base font-semibold mb-3">
              When you accept a bid, your booking is confirmed. At that point, a contract is formed between
              you and the partner for the hire of that vehicle on the agreed terms. Camel Global is not a
              party to that contract.
            </p>
            <p className="text-base font-semibold">
              You&apos;ll receive a confirmation by email. Please check the details carefully and contact us
              immediately if anything looks wrong.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">5. Driver age requirements</h2>
            <div className="bg-[#f0f0f0] px-5 py-4 mb-4">
              <p className="text-base font-black text-black">
                The minimum age to hire a car through Camel Global is 21 years old.
              </p>
            </div>
            <p className="text-base font-semibold mb-3">
              All drivers — including the main driver and any additional drivers — must be at least 21 years
              old at the time of collection. Bookings cannot be made for drivers under 21.
            </p>
            <p className="text-base font-semibold mb-3">
              Drivers aged 21 to 24 may be subject to a <strong>young driver surcharge</strong>. Where a
              partner applies a young driver surcharge, it will be included in their bid price — the total
              you see on the bid already reflects this charge. The full amount is paid through Camel Global
              at the time of booking in the same way as the car hire fee.
            </p>
            <p className="text-base font-semibold">
              All drivers must have held a full, valid driving licence for at least one year. It is your
              responsibility to ensure all drivers listed on the booking meet these requirements.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">6. Documents required at collection</h2>
            <div className="bg-[#f0f0f0] px-5 py-4 mb-4">
              <p className="text-base font-black text-black">
                All drivers must bring physical copies of the following documents. Digital copies on a mobile phone may not be accepted.
              </p>
            </div>
            <p className="text-base font-semibold mb-4">
              The following must be presented for <strong>every driver</strong> listed on the booking at the time of vehicle collection:
            </p>
            <ul className="space-y-3 mb-5">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-[#ff7a00] text-white text-[10px] font-black">1</span>
                <div>
                  <p className="font-black text-black">Valid driving licence</p>
                  <p className="text-sm font-semibold text-black/60">Must be a full licence held for at least one year. EU licences in Roman alphabet are required. If your licence is not in Roman alphabet (e.g. Arabic, Chinese, Cyrillic), you must also bring a valid International Driving Permit alongside your original licence.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-[#ff7a00] text-white text-[10px] font-black">2</span>
                <div>
                  <p className="font-black text-black">Passport or national identity document</p>
                  <p className="text-sm font-semibold text-black/60">A valid passport or government-issued photo ID is required for all drivers listed on the booking.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-[#ff7a00] text-white text-[10px] font-black">3</span>
                <div>
                  <p className="font-black text-black">Credit card — only if a security deposit applies</p>
                  <p className="text-sm font-semibold text-black/60">Most Camel Global bookings require no payment at collection. However, if the car hire company requires a security deposit, this will be clearly stated on their bid before you accept. In that case, a credit card in the lead driver&apos;s name must be presented at collection. Debit cards cannot be used for deposit blocking. The deposit is handled directly between you and the car hire company — it is not collected by Camel Global.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-[#ff7a00] text-white text-[10px] font-black">4</span>
                <div>
                  <p className="font-black text-black">Booking confirmation receipt</p>
                  <p className="text-sm font-semibold text-black/60">Your booking confirmation receipt is emailed to you immediately after payment. Print a copy or have it ready to show on your device at collection.</p>
                </div>
              </li>
            </ul>
            <div className="border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-black text-amber-800 mb-1">⚠ Important</p>
              <p className="text-sm font-semibold text-amber-700">
                Failure to present the required documents for all drivers at the time of collection may result in the vehicle being withheld by the car hire company. In this circumstance, Camel Global cannot be held responsible and cancellation terms will apply.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">7. Security deposit</h2>
            <p className="text-base font-semibold mb-3">
              The car hire company may place a <strong>security deposit hold</strong> on the lead driver&apos;s
              credit card at the time of collection. This is separate from the fuel deposit paid through
              Camel Global. The security deposit is held as a guarantee against damage or loss during the hire
              period and is released when the vehicle is returned in satisfactory condition.
            </p>
            <p className="text-base font-semibold mb-3">
              Where a security deposit applies, the partner is required to state the amount and method
              on their bid before you accept it. You should review this before confirming your booking.
            </p>
            <p className="text-base font-semibold">
              Camel Global does not collect or hold security deposits. Any security deposit is handled
              entirely between you and the car hire company.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">8. Mileage</h2>
            <p className="text-base font-semibold mb-3">
              Some hire rates include unlimited mileage; others impose a daily or total kilometre limit.
              Where a mileage limit applies, the partner is required to state it clearly on their bid.
              You should review the mileage terms before accepting a bid.
            </p>
            <p className="text-base font-semibold">
              Exceeding a stated mileage allowance may result in additional charges payable directly to the
              car hire company. Camel Global is not responsible for excess mileage charges.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">9. Fuel charges</h2>
            <p className="text-base font-semibold mb-3">
              Fuel is recorded by the driver at delivery and again at collection. You are charged only for
              the fuel you have used during your hire, rounded to the nearest quarter tank. The partner
              sets the fuel rate, which is shown clearly before you accept a bid.
            </p>
            <p className="text-base font-semibold">
              Both you and the driver independently confirm the fuel level at each stage. If you disagree
              with a recorded reading, contact us within 48 hours of collection.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">10. Payments</h2>
            <p className="text-base font-semibold mb-3">
              The hire price shown in the bid is the price you pay through Camel Global (plus any fuel charge
              calculated at the end of the hire). All prices shown include any applicable taxes unless
              otherwise stated.
            </p>
            <p className="text-base font-semibold mb-3">
              Any young driver surcharges or security deposits stated on the bid are payable directly to the
              car hire company at the time of collection — these are not collected by Camel Global.
            </p>
            <p className="text-base font-semibold">
              Payments through the platform are processed securely. Camel Global collects payment on
              behalf of the partner. Your payment to Camel Global satisfies your obligation to pay
              the partner for the amounts collected through the platform.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">10b. Booking receipt and VAT invoices</h2>
            <div className="bg-[#f0f0f0] px-5 py-4 mb-4">
              <p className="text-base font-black text-black">
                The booking confirmation receipt issued by Camel Global is not a VAT invoice for car hire services.
              </p>
            </div>
            <p className="text-base font-semibold mb-3">
              When you make a payment through the Camel Global platform, you will receive a booking confirmation
              receipt issued by NTUK Ltd (trading as Camel Global). This document confirms that Camel Global
              has received your payment as a marketplace intermediary — it is a platform payment receipt, not
              a VAT invoice for the car hire service itself.
            </p>
            <p className="text-base font-semibold mb-3">
              The car hire service is provided directly by the partner (the independent car hire company named
              on your booking). The partner is the supplier of that service for tax and invoicing purposes.
              If you require a VAT invoice for the car hire — for example for business expense purposes —
              you must request one directly from the car hire company.
            </p>
            <p className="text-base font-semibold">
              Camel Global is not responsible for issuing VAT invoices for car hire services and cannot
              do so on behalf of any partner.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">11. Cancellations and refunds</h2>

            <div className="bg-[#f0f0f0] px-5 py-4 mb-5">
              <p className="text-base font-black text-black mb-1">Cancellation policy summary</p>
              <p className="text-sm font-semibold text-black/70">
                The refund you receive depends on when you cancel relative to your scheduled pickup time.
                This policy is fixed and applies to all bookings on the platform.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="border-l-4 border-green-500 pl-4">
                <p className="text-base font-black text-black mb-1">More than 48 hours before pickup — Full refund</p>
                <p className="text-base font-semibold text-black/70">
                  If you cancel more than 48 hours before your scheduled pickup time, you will receive a full
                  refund of everything you paid — including the car hire fee and the fuel deposit.
                </p>
              </div>
              <div className="border-l-4 border-amber-500 pl-4">
                <p className="text-base font-black text-black mb-1">Within 48 hours of pickup — Partial refund</p>
                <p className="text-base font-semibold text-black/70">
                  If you cancel within 48 hours of your scheduled pickup time, the car hire fee is
                  non-refundable. The fuel deposit will always be refunded in full.
                </p>
              </div>
              <div className="border-l-4 border-red-500 pl-4">
                <p className="text-base font-black text-black mb-1">Once the hire has started — No refund</p>
                <p className="text-base font-semibold text-black/70">
                  Once the vehicle has been delivered and the hire is underway, the car hire fee is
                  non-refundable. Fuel is settled based on actual usage at the end of the hire.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-base font-semibold">
                <strong>Partner cancellations:</strong> If the car hire company cancels your booking for any
                reason, you will receive a full refund of everything paid through Camel Global, regardless of timing.
              </p>
              <p className="text-base font-semibold">
                <strong>How to cancel:</strong> You can cancel a booking directly from your bookings page,
                provided the hire has not yet started. Refunds are processed automatically within 5–10
                working days.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">12. Insurance and your responsibilities</h2>
            <p className="text-base font-semibold mb-3">
              Every vehicle delivered through Camel Global is covered by insurance arranged by the
              partner with zero excess. Insurance documents are confirmed on handover — you&apos;ll be asked
              to confirm receipt on the platform before driving away.
            </p>
            <p className="text-base font-semibold mb-3">
              You are responsible for driving the vehicle legally — with a valid licence, within the
              terms of the insurance, and in accordance with local road laws. All drivers listed on
              the booking must hold a valid licence. Any damage, fines, or liabilities incurred during
              the hire are your responsibility unless caused by a fault with the vehicle.
            </p>
            <p className="text-base font-semibold">
              Camel Global does not provide insurance and is not liable for incidents arising during
              the hire period.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">13. Our liability</h2>
            <p className="text-base font-semibold mb-2">Camel Global is a platform intermediary. We are responsible for:</p>
            <ul className="list-disc list-inside text-base font-semibold space-y-1 mb-4">
              <li>Operating the platform and booking system</li>
              <li>Verifying that partners have completed our onboarding process</li>
              <li>Processing your payment correctly</li>
              <li>Communicating booking details accurately</li>
            </ul>
            <p className="text-base font-semibold mb-2">We are not responsible for:</p>
            <ul className="list-disc list-inside text-base font-semibold space-y-1 mb-4">
              <li>The condition or suitability of the vehicle provided by the partner</li>
              <li>A partner failing to deliver or collect as agreed</li>
              <li>Incidents, accidents, damage, or loss during the hire period</li>
              <li>Charges payable directly to the partner (security deposits, young driver surcharges, excess mileage)</li>
              <li>Delays caused by circumstances outside our control</li>
              <li>Issuing VAT invoices for car hire services — these are the responsibility of the car hire company</li>
            </ul>
            <p className="text-base font-semibold">
              Nothing in these terms limits our liability for death or personal injury caused by our
              negligence, fraud, or anything else that cannot be excluded by law.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">14. Reviews</h2>
            <p className="text-base font-semibold">
              After a booking completes, you may be invited to leave a review of the partner. Reviews
              must be honest and based on your actual experience. We reserve the right to remove reviews
              that are abusive, false, or in breach of these terms.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">15. Your account and data</h2>
            <p className="text-base font-semibold">
              You can delete your account at any time from your settings page. We&apos;ll remove your login
              access immediately. Booking and financial records are retained as required by law.
              See our <a href="/privacy" className="text-[#ff7a00] hover:underline">Privacy Policy</a> for full details.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">16. Changes to these terms</h2>
            <p className="text-base font-semibold">
              We may update these terms from time to time. The version in force when you made your
              booking applies to that booking. For future bookings, the current version applies.
              We&apos;ll notify you of significant changes by email.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">17. Governing law</h2>
            <p className="text-base font-semibold">
              These terms are governed by the laws of England and Wales. Any disputes will be subject
              to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">18. Contact</h2>
            <p className="text-base font-semibold">
              Questions or complaints? Use our{" "}
              <a href="/contact" className="text-[#ff7a00] hover:underline">contact form</a>.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
