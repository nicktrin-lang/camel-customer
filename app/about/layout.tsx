import type { Metadata } from "next";

// /about is a client component and can't export metadata itself; this server layout
// gives the page a unique, indexable title/description/canonical instead of inheriting
// the homepage's.
export const metadata: Metadata = {
  title: { absolute: "About Camel Global: Meet & Greet Car Hire in Spain" },
  description:
    "How Camel Global works: we deliver your hire car straight to airport arrivals across Spain - no rental desk, no queue. Learn about our meet and greet car service.",
  alternates: { canonical: "https://www.camel-global.com/about" },
  openGraph: {
    title: "About Camel Global",
    description: "We deliver your hire car to airport arrivals across Spain - no desk, no queue.",
    url: "https://www.camel-global.com/about",
    type: "website",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
