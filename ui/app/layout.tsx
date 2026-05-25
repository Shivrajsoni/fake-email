import type { Metadata } from "next";
import { Syne, Outfit, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import "../src/globals.css";

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-syne",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

const SITE_URL = "https://fake-email.site";
const SITE_NAME = "Fake Email";
const SITE_TAGLINE = "Disposable & Anonymous Inboxes";
const SITE_DESC =
  "Generate disposable email addresses instantly. Free temporary email service for developers, signups, and verification — no registration, no tracking, real-time inbox.";

export const viewport = {
  themeColor: "#ff3b3b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  colorScheme: "light dark" as const,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  alternates: {
    canonical: "/",
    types: {
      "application/json": "/openapi.json",
    },
  },
  title: {
    default: `${SITE_NAME} – ${SITE_TAGLINE} | Free Temp Mail`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: [
    "fake email",
    "disposable email",
    "temp mail",
    "temporary email",
    "throwaway email",
    "anonymous email",
    "free temp mail",
    "10 minute mail",
    "burner email",
    "developer email testing",
    "email verification testing",
    "no signup email",
    "private email inbox",
  ],
  category: "Technology",
  classification: "Free Web Utility",
  authors: [{ name: "Fake Email Team", url: SITE_URL }],
  creator: "Fake Email Team",
  publisher: "Fake Email",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  referrer: "strict-origin-when-cross-origin",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    title: `${SITE_NAME} – ${SITE_TAGLINE}`,
    description: SITE_DESC,
    siteName: SITE_NAME,
    images: [
      {
        url: `${SITE_URL}/icon.png`,
        width: 1200,
        height: 630,
        alt: "Fake Email — disposable anonymous inbox",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} – ${SITE_TAGLINE}`,
    description: SITE_DESC,
    images: [`${SITE_URL}/icon.png`],
    creator: "@fakeemail",
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "any" },
    ],
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/icon.png`,
    width: 512,
    height: 512,
  },
  sameAs: ["https://github.com/Shivrajsoni/fake-email"],
} as const;

const WEBSITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: SITE_DESC,
  inLanguage: "en-US",
  publisher: { "@id": `${SITE_URL}/#organization` },
} as const;

const WEBAPPLICATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": `${SITE_URL}/#webapp`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESC,
  applicationCategory: "UtilitiesApplication",
  applicationSubCategory: "Email Tool",
  operatingSystem: "All",
  browserRequirements: "Requires JavaScript. Modern browser.",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Instant disposable email address generation",
    "Real-time inbox polling",
    "No registration required",
    "No tracking",
    "Open-source backend",
    "REST API for developers",
  ],
  publisher: { "@id": `${SITE_URL}/#organization` },
} as const;

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${SITE_URL}/#faq`,
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a disposable email address?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A disposable email address is a temporary inbox you can use for signups, verification, and testing without exposing your real address. It auto-expires after a short period.",
      },
    },
    {
      "@type": "Question",
      name: "Is Fake Email free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Fake Email is completely free, requires no registration, and does not track users.",
      },
    },
    {
      "@type": "Question",
      name: "How long does a temporary email last?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Temporary mailboxes are ephemeral and auto-expire. Treat them as short-lived inboxes for one-time use.",
      },
    },
    {
      "@type": "Question",
      name: "Can I receive attachments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Incoming messages and their attachments appear in your inbox while the mailbox is alive.",
      },
    },
    {
      "@type": "Question",
      name: "Is there an API?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. See /docs/api and /openapi.json for the REST API. Endpoints include POST /api/temporary-address and GET /api/inbox/poll.",
      },
    },
    {
      "@type": "Question",
      name: "Is Fake Email safe and anonymous?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No signup is required and no personal data is stored. Mailboxes are anonymous and auto-expire.",
      },
    },
  ],
} as const;

const JSONLD_GRAPH = [
  ORGANIZATION_JSONLD,
  WEBSITE_JSONLD,
  WEBAPPLICATION_JSONLD,
  FAQ_JSONLD,
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${outfit.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(JSONLD_GRAPH),
          }}
        />
      </head>
      <body>
        <Navbar />
        <div className="pt-16 sm:pt-20">{children}</div>
      </body>
    </html>
  );
}
