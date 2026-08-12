"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: object) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
    onTurnstileLoad?: () => void;
  }
}

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

let scriptLoaded = false;
let scriptLoading = false;
const onLoadCallbacks: Array<() => void> = [];

function loadTurnstileScript(cb: () => void) {
  if (scriptLoaded && window.turnstile) { cb(); return; }
  onLoadCallbacks.push(cb);
  if (scriptLoading) return;
  scriptLoading = true;

  window.onTurnstileLoad = () => {
    scriptLoaded = true;
    onLoadCallbacks.forEach(fn => fn());
    onLoadCallbacks.length = 0;
  };

  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

/**
 * Cloudflare Turnstile widget. Drop-in replacement for the old hCaptcha one —
 * same props, same "" -means-no-token contract — so callers did not change.
 *
 * Unlike hCaptcha this is normally non-interactive: Turnstile decides from
 * browser signals and usually resolves with no puzzle at all. Whether a user
 * ever sees a checkbox is a dashboard setting on the widget (Managed /
 * Non-interactive / Invisible), not something this component controls.
 *
 * Fails CLOSED: with no site key, or on an error/expiry/timeout, the token is
 * cleared and the caller's submit stays blocked. The server verifies the token
 * again anyway (lib/turnstile.ts) — this widget is never the security boundary.
 */
export default function Turnstile({ onVerify, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    function render() {
      if (!mounted || !containerRef.current || widgetId.current !== null) return;
      const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      if (!sitekey || !window.turnstile) return;
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey,
        callback: onVerify,
        "expired-callback": () => {
          onExpire?.();
          onVerify("");
        },
        // A challenge that errors or times out must not leave a stale token
        // behind — clear it so the form cannot be submitted on a dead check.
        "error-callback": () => { onVerify(""); },
        "timeout-callback": () => { onVerify(""); },
      });
    }

    loadTurnstileScript(render);

    return () => {
      mounted = false;
      // hCaptcha's version leaked a widget per mount. Turnstile exposes remove(),
      // so tear it down — these forms mount/unmount as users switch tabs.
      if (widgetId.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* already gone */ }
        widgetId.current = null;
      }
    };
  }, [onVerify, onExpire]);

  return <div ref={containerRef} className="mt-2" />;
}
