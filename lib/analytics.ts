// GA4 events for the customer booking path. Client-side only; every call is a no-op
// when gtag isn't loaded (localhost, unknown hosts) and can never throw into the page.
//
// The funnel, in order (GA4: Explore → Funnel exploration):
//   booking_form_start      first interaction with the homepage booking form
//   booking_form_error      validation stopped them (reason = which field)
//   booking_submit          valid form submitted (logged_in tells you if login comes next)
//   login / sign_up         GA4 recommended events, with booking_in_progress
//   booking_request_created request saved, partners are being asked for quotes
//   view_bids               they're looking at one or more quotes
//   bid_accept              clicked "Accept & pay" on a quote
//   begin_checkout          checkout loaded with a payment form (fired in the checkout page)
//   add_payment_info        clicked Pay
//   payment_failed          Stripe declined / errored (reason = Stripe's message)
//   payment_complete        landed back on the booking after paying
//   purchase                server-side from the Stripe webhook (revenue)

type Params = Record<string, string | number | boolean | null | undefined | object>;

export function track(event: string, params: Params = {}) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", event, params);
    }
  } catch {
    // Analytics must never break the booking flow.
  }
}

/** Fires an event at most once per browser tab session for this key — for steps a page
 *  can render repeatedly (polling, re-renders, refreshes). */
export function trackOnce(key: string, event: string, params: Params = {}) {
  try {
    const k = `camel_ga_once:${key}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
  } catch {
    // Storage blocked: fall through and fire anyway rather than lose the step.
  }
  track(event, params);
}
