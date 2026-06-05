import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Camel Global | Meet & Greet Car Hire Platform Spain",
  description: "Camel Global is the meet & greet car hire platform for Spain. We connect customers with trusted local car hire companies who deliver directly to airports, hotels and homes.",
};

export default function AboutPage() {
  return (
    <div className="w-full">

      <section className="w-full bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">About Camel Global</p>
          <h1 className="mb-6 text-4xl font-black leading-tight text-white md:text-6xl">
            Car hire that comes to you.
          </h1>
          <p className="max-w-2xl text-xl font-semibold leading-relaxed text-white">
            Camel Global was born on the theory that picking up a hire car shouldn&apos;t mean queuing at an
            airport desk or taking a bus to an off-site depot. Your car should be waiting for you — exactly
            where you need it, exactly when you need it.
          </p>
        </div>
      </section>

      <section className="w-full bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-3xl font-black text-black">What we do</h2>
          <p className="mb-5 text-base font-semibold text-black leading-relaxed">
            Camel Global is a meet &amp; greet car hire platform — think of it like Uber, but for car hire.
            Instead of you going to the car, a driver from a trusted local car hire company delivers it directly
            to your chosen location: your hotel, your home, the airport arrivals hall, wherever works for you.
          </p>
          <p className="mb-5 text-base font-semibold text-black leading-relaxed">
            You tell us where you need a car, when, and for how long. We send your request to verified car hire
            partners within 30km of your pickup point. They compete for your business by placing bids. You pick
            the offer that suits you — on price, on car type, on rating — and the booking is confirmed instantly.
          </p>
          <p className="text-base font-semibold text-black leading-relaxed">
            At the end of your hire, the driver collects the car from wherever you are. You only pay for the
            fuel you&apos;ve actually used, calculated to the nearest quarter tank. No surprises, no hidden charges.
          </p>
        </div>
      </section>

      <section className="w-full bg-[#f0f0f0] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-3xl font-black text-black">How it works</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { n: "01", title: "Submit a request", body: "Tell us your pickup location, drop-off point, dates, and the type of car you need. It takes about two minutes." },
              { n: "02", title: "Receive bids", body: "Verified local car hire partners near you see your request and place bids. You get to compare them side by side." },
              { n: "03", title: "Accept an offer", body: "Choose the bid that works for you. The booking is confirmed immediately and the partner is notified." },
              { n: "04", title: "Car delivered to you", body: "A driver delivers your car to your chosen location at the agreed time. Insurance documents are confirmed on handover." },
              { n: "05", title: "Drive", body: "Enjoy your hire. When you're done, drop the car to the agreed drop off and a driver will come and collect the car." },
              { n: "06", title: "Pay only for fuel used", body: "Fuel is recorded at delivery and collection. You pay only for what you've used, rounded to the nearest quarter tank." },
            ].map(({ n, title, body }) => (
              <div key={n} className="bg-white p-6">
                <p className="mb-2 text-3xl font-black text-black/20">{n}</p>
                <h3 className="mb-2 text-lg font-black text-black">{title}</h3>
                <p className="text-base font-semibold leading-relaxed text-black/70">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-3xl font-black text-black">Why Camel Global</h2>
          <p className="mb-5 text-base font-semibold text-black leading-relaxed">
            Traditional car hire is broken. Prices are opaque, pickup locations are inconvenient, and the
            experience at the desk is rarely pleasant. We believe there&apos;s a better way — one that puts you
            in control, brings competition to your doorstep, and rewards good car hire companies with good reviews.
          </p>
          <p className="mb-5 text-base font-semibold text-black leading-relaxed">
            Meet &amp; greet car hire is already in high demand but underserved by technology. We&apos;ve built
            the platform to scale — with full support for EUR, GBP, and USD, so expanding internationally is
            straightforward.
          </p>
          <p className="text-base font-semibold text-black leading-relaxed">
            We&apos;re a team with a clear goal: make car hire as easy as ordering a taxi.
          </p>
        </div>
      </section>

      <section className="w-full bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-3xl font-black text-white">Are you a car hire company?</h2>
          <p className="mb-8 max-w-2xl text-base font-semibold text-white leading-relaxed">
            Join the Camel Global partner network. You set your own prices, manage your own fleet.
            No monthly fees. No lock-in.
          </p>
          <a href="/partner/signup"
            className="inline-block bg-[#ff7a00] px-8 py-4 text-base font-black text-white hover:opacity-90 transition-opacity">
            Apply to become a partner →
          </a>
        </div>
      </section>

      <section className="w-full bg-[#f0f0f0] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-3xl font-black text-black">Got a question? Get in touch.</h2>
          <p className="mb-6 text-base font-semibold text-black leading-relaxed">
            Got a question or a partnership enquiry? We&apos;d love to hear from you.
          </p>
          <a href="/contact"
            className="inline-block bg-[#ff7a00] px-8 py-4 text-base font-black text-white hover:opacity-90 transition-opacity">
            Contact us →
          </a>
        </div>
      </section>

    </div>
  );
}