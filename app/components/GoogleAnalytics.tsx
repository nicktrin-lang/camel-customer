"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: any[]) => void;
  }
}

// This component handles SPA page_view events on client-side navigation only.
// The actual gtag scripts are injected in app/layout.tsx server-side.
export default function GoogleAnalyticsPageView() {
  const pathname = usePathname();
  const firstRun = useRef(true);

  useEffect(() => {
    // The initial page_view is already sent by gtag('config', …, { send_page_view: true })
    // in layout.tsx, so skip the first run and fire page_view only on SPA navigation.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: window.location.pathname + window.location.search,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [pathname]);

  return null;
}