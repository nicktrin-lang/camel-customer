import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import type { Metadata } from "next";
import ClientRootLayout from "./ClientRootLayout";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const BASE_URL = "https://www.camel-global.com";

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const isTestSite = host.includes("test.camel-global.com");

  if (isTestSite) {
    return {
      title: "Camel Global",
      description: "Meet & greet car hire, delivered to your door.",
      robots: {
        index: false, follow: false, nocache: true,
        googleBot: {
          index: false, follow: false, noimageindex: true,
          "max-video-preview": -1, "max-image-preview": "none", "max-snippet": -1,
        },
      },
    };
  }

  return {
    title: {
      default: "Camel Global | Meet & Greet Car Hire Delivered to You in Spain",
      template: "%s | Camel Global",
    },
    description: "Camel Global delivers hire cars directly to you at Málaga, Alicante, Valencia, Madrid, Barcelona and all major Spanish airports. No queues, no bus transfers — your car comes to you.",
    keywords: [
      "meet and greet car hire Spain",
      "car hire delivered to airport",
      "Málaga airport car hire delivery",
      "Alicante airport meet and greet car hire",
      "Valencia airport car hire",
      "Madrid airport car hire delivery",
      "Barcelona airport meet and greet",
      "Palma Mallorca airport car hire",
      "Ibiza airport car hire",
      "Tenerife airport car hire delivery",
      "Gran Canaria car hire",
      "Seville airport car hire",
      "car delivered to hotel Spain",
      "hire car delivered to you",
      "meet and greet car rental Spain",
      "airport car hire delivery service",
    ],
    authors: [{ name: "Camel Global", url: BASE_URL }],
    creator: "Camel Global",
    publisher: "NTUK Ltd",
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: BASE_URL,
    },
    openGraph: {
      type: "website",
      locale: "en_GB",
      url: BASE_URL,
      siteName: "Camel Global",
      title: "Camel Global | Meet & Greet Car Hire Delivered to You in Spain",
      description: "Skip the airport desk. We deliver hire cars directly to you at Málaga, Alicante, Valencia, Madrid, Barcelona and all major Spanish airports.",
      images: [
        {
          url: `${BASE_URL}/camel-logo.png`,
          width: 1200,
          height: 630,
          alt: "Camel Global — Meet & Greet Car Hire Spain",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Camel Global | Meet & Greet Car Hire Spain",
      description: "Your hire car delivered to you at any Spanish airport or hotel. No queues, no bus transfers.",
      images: [`${BASE_URL}/camel-logo.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

// GA only fires on the REAL public hosts. localhost, Vercel preview (*.vercel.app),
// IPs and any unknown host return "" so no gtag is injected — this is what stopped
// dev + preview traffic polluting the production property (the "localhost:3000"
// referrals and preview-crawler bot hits).
function getGaId(host: string): string {
  const h = host.toLowerCase();
  if (h.includes("test.camel-global.com")) return "G-G90QB28J12";              // staging property
  if (h === "camel-global.com" || h === "www.camel-global.com") return "G-1Y758X38G4"; // production
  return "";                                                                    // localhost / preview / unknown → no tracking
}

// Guides live at /<lang>/guides/... — set <html lang> to match so each post is
// declared in the language it's written in. Everything else stays "en".
function htmlLangFromPath(pathname: string): string {
  const m = pathname.match(/^\/(en|es|fr|it|pt|de)\/guides(\/|$)/);
  return m ? m[1] : "en";
}

// Sitewide Organization schema so search and AI engines have a canonical entity for
// Camel Global (name, logo, site, contact/social). Rendered as JSON-LD in <head>.
const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Camel Global",
  url: "https://www.camel-global.com",
  logo: "https://www.camel-global.com/camel-logo.png",
  description:
    "Meet and greet car hire across Spain's airports. Camel Global delivers your hire car to arrivals - no rental desk, no queue.",
  areaServed: "ES",
  sameAs: [] as string[],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const gaId = getGaId(host);
  const htmlLang = htmlLangFromPath(headerStore.get("x-pathname") || "");

  return (
    <html lang={htmlLang}>
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSONLD) }}
        />
        {gaId && (
          <>
            <script dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});try{if(localStorage.getItem('cookie_consent')==='accepted'){gtag('consent','update',{analytics_storage:'granted'});}}catch(e){}gtag('config','${gaId}',{send_page_view:true});`,
            }} />
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          </>
        )}
      </head>
      <body className={`${font.variable} min-h-screen flex flex-col`}>
        <ClientRootLayout fontClass={font.variable}>
          {children}
        </ClientRootLayout>
      </body>
    </html>
  );
}