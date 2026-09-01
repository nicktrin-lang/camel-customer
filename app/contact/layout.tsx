import type { Metadata } from "next";

// /contact is a client component and can't export metadata itself; this server layout
// gives the page a unique, indexable title/description/canonical.
export const metadata: Metadata = {
  title: { absolute: "Contact Camel Global: Support & Partnerships" },
  description:
    "Get in touch with Camel Global - questions about a booking, becoming a meet and greet car hire partner, press, or anything else. We are here to help.",
  alternates: { canonical: "https://www.camel-global.com/contact" },
  openGraph: {
    title: "Contact Camel Global",
    description: "Questions about a booking, partnerships, or press - contact our team.",
    url: "https://www.camel-global.com/contact",
    type: "website",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
