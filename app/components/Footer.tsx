"use client";

import Link from "next/link";
import Image from "next/image";

const year = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white">

      {/* Ready to book CTA */}
      <div className="border-b border-white/10 py-14">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl">Ready to book?</h2>
          <p className="mt-2 text-base font-bold text-white/70">No account needed to start.</p>
          <Link href="/book"
            className="mt-6 inline-block bg-[#ff7a00] px-10 py-4 text-base font-black text-white hover:opacity-90 transition-opacity">
            Book Now →
          </Link>
          <p className="mt-4 text-sm font-bold text-white/70">
            Already have an account?{" "}
            <Link href="/login" className="text-white underline hover:opacity-80">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Links */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">

          {/* Logo + tagline */}
          <div className="shrink-0">
            <Image src="/camel-logo.png" alt="Camel Global — Meet and Greet Car Hire Spain" width={200} height={70} className="h-14 w-auto mb-4 brightness-0 invert" />
            <p className="max-w-[200px] text-sm font-bold text-white/60 leading-relaxed">
              Meet &amp; greet car hire, delivered to your door.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-10 md:gap-14">

            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/50">Company</p>
              <Link href="/about"                                         className="text-sm font-bold text-white hover:underline">About Us</Link>
              <a    href="https://portal.camel-global.com/partner/signup" className="text-sm font-bold text-white hover:underline">Become a Partner</a>
              <Link href="/contact"                                        className="text-sm font-bold text-white hover:underline">Contact</Link>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/50">Legal</p>
              <Link href="/terms"   className="text-sm font-bold text-white hover:underline">Customer Terms</Link>
              <Link href="/privacy" className="text-sm font-bold text-white hover:underline">Privacy Policy</Link>
              <Link href="/cookies" className="text-sm font-bold text-white hover:underline">Cookie Policy</Link>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/50">Account</p>
              <Link href="/login"    className="text-sm font-bold text-white hover:underline">Sign In</Link>
              <Link href="/signup"   className="text-sm font-bold text-white hover:underline">Create Account</Link>
              <Link href="/bookings" className="text-sm font-bold text-white hover:underline">My Bookings</Link>
            </div>

          </div>
        </div>

        <div className="mt-10 border-t border-white/20 pt-6">
          <p className="text-xs font-bold text-white leading-relaxed">
            © {year} NTUK Ltd. All rights reserved. Trading as Camel Global. · Registered in England &amp; Wales · Company No. 08765474
          </p>
        </div>
      </div>
    </footer>
  );
}