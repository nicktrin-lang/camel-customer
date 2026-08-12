import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | Camel Global",
  description: "How NTUK Ltd (trading as Camel Global) uses cookies and how to manage your preferences.",
};

const EFFECTIVE_DATE = "1 April 2026";

export default function CookiesPage() {
  return (
    <div className="w-full">

      {/* Hero */}
      <section className="w-full bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Legal</p>
          <h1 className="mb-3 text-4xl font-black text-white md:text-6xl">Cookie Policy</h1>
          <p className="text-white/60 text-sm font-semibold">Effective: {EFFECTIVE_DATE}</p>
        </div>
      </section>

      {/* Content */}
      <section className="w-full bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl space-y-8 text-black leading-relaxed">

          <p className="text-base font-semibold">
            This page explains what cookies are, which ones we use on the Camel Global platform,
            and how you can control them. If you have questions, use our{" "}
            <a href="/contact" className="text-[#ff7a00] hover:underline">contact form</a>.
          </p>

          <hr className="border-black/10" />

          <div>
            <h2 className="text-2xl font-black text-black mb-3">What are cookies?</h2>
            <p className="text-base font-semibold">
              Cookies are small text files stored on your device when you visit a website.
              They&apos;re used for all sorts of things — from keeping you logged in, to understanding
              how people use a site so we can improve it. Some cookies are essential and the site
              won&apos;t work without them. Others are optional.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-4">Cookies we use</h2>

            {/* Essential */}
            <div className="mb-4 overflow-hidden">
              <div className="bg-black px-5 py-3 flex items-center gap-3">
                <span className="inline-block bg-white px-3 py-0.5 text-xs font-black text-black">Essential</span>
                <span className="text-sm font-bold text-white">Always active — cannot be turned off</span>
              </div>
              <div className="bg-[#f0f0f0] px-5 py-4 space-y-4 text-sm">
                <div>
                  <p className="font-black text-black">Authentication cookies (Supabase)</p>
                  <p className="font-semibold text-black/70 mt-1">These keep you logged in to your account. Without them, you&apos;d be signed out every time you navigate to a new page. They expire when your session ends or after a fixed period.</p>
                </div>
                <div>
                  <p className="font-black text-black">Cookie consent preference (localStorage)</p>
                  <p className="font-semibold text-black/70 mt-1">Stores whether you&apos;ve accepted or rejected non-essential cookies, so we don&apos;t ask you every time you visit. This is stored in your browser&apos;s local storage, not as a traditional cookie.</p>
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="overflow-hidden">
              <div className="bg-[#ff7a00] px-5 py-3 flex items-center gap-3">
                <span className="inline-block bg-white px-3 py-0.5 text-xs font-black text-[#ff7a00]">Analytics</span>
                <span className="text-sm font-bold text-white">Only set if you accept cookies</span>
              </div>
              <div className="bg-[#f0f0f0] px-5 py-4 space-y-3 text-sm">
                <div>
                  <p className="font-black text-black">Google Analytics (_ga, _ga_*)</p>
                  <p className="font-semibold text-black/70 mt-1">
                    These help us understand how people use the site — which pages are popular,
                    how long people spend on each page, and where they come from. The data is
                    aggregated and anonymous. We use it to improve the platform.
                    Google&apos;s own privacy policy governs how Google handles this data.
                  </p>
                  <p className="font-semibold text-black/50 mt-1">Expires: up to 2 years.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">How to manage your preferences</h2>
            <p className="text-base font-semibold mb-3">
              When you first visit the site, a banner at the bottom of the screen lets you accept all cookies
              or reject non-essential ones. If you change your mind:
            </p>
            <ul className="list-disc list-inside space-y-2 text-base font-semibold">
              <li>Clear your browser&apos;s local storage for camel-global.com and the banner will reappear</li>
              <li>Use your browser&apos;s built-in cookie settings to delete or block cookies at any time</li>
              <li>Visit your browser&apos;s privacy settings to manage advertising and analytics preferences</li>
            </ul>
            <p className="mt-3 text-base font-semibold">
              Note: blocking essential cookies will break the login functionality of the platform.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">Third-party cookies</h2>
            <p className="text-base font-semibold">
              Some features on this site use third-party services that may set their own cookies —
              including Google Maps (for location features) and Cloudflare Turnstile (for bot prevention on
              sign-in forms). These services have their own privacy and cookie policies which we
              encourage you to review directly with those providers.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">Changes to this policy</h2>
            <p className="text-base font-semibold">
              We may update this page as we add new features or change our analytics setup.
              The effective date at the top will always reflect the most recent version.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black mb-3">Questions?</h2>
            <p className="text-base font-semibold">
              Use our <a href="/contact" className="text-[#ff7a00] hover:underline">contact form</a> and we&apos;ll get back to you.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}