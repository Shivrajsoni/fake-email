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

const FAQ_ITEMS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "What is a disposable email address?",
    a: "A disposable email address — also called a temporary email, throwaway email, burner email, or fake email — is a short-lived inbox that lets you receive mail without revealing your real address. After a short period the inbox and any messages it received are deleted.",
  },
  {
    q: "How is Fake Email different from temp-mail.org, 10minutemail, or Guerrilla Mail?",
    a: "Fake Email is open source, ships a public OpenAPI 3.1 spec, exposes an llms.txt and agent-skills index for AI agents, and the entire Rust backend is on GitHub for you to read or self-host.",
  },
  {
    q: "Is Fake Email really free?",
    a: "Yes. Every feature is free. There is no paid tier, no signup, no credit card, and no ads on the inbox page.",
  },
  {
    q: "How long does a temporary email last?",
    a: "Mailboxes are ephemeral and auto-expire. Treat each address as single-use.",
  },
  {
    q: "Can I send email from a disposable address?",
    a: "No. Fake Email is receive-only to prevent abuse and keep the service free.",
  },
  {
    q: "Do you store, sell, or read my messages?",
    a: "No accounts exist, so there is nothing tied to a person. Mailboxes and their messages are purged on expiry.",
  },
  {
    q: "Is there an API I can call from my app or tests?",
    a: "Yes. See /docs/api and /openapi.json. Endpoints include POST /api/temporary-address and GET /api/inbox/poll.",
  },
  {
    q: "Will incoming email show attachments?",
    a: "Yes. Attachments arrive alongside the message body while the mailbox is alive.",
  },
  {
    q: "Is Fake Email anonymous?",
    a: "No signup is required, so no personally identifying information is collected by the service.",
  },
  {
    q: "Is disposable email legal?",
    a: "Using a disposable email address for privacy is legal in most jurisdictions. Always follow each website's terms of service.",
  },
  {
    q: "Why might a website block disposable email addresses?",
    a: "Some platforms block known disposable domains to reduce trial abuse or duplicate-account fraud.",
  },
  {
    q: "Can I receive verification codes (OTPs) here?",
    a: "Yes. Sign-up verification codes, magic links, and confirmation emails are all received normally.",
  },
  {
    q: "Can AI agents use Fake Email?",
    a: "Yes. Fake Email publishes llms.txt, an OpenAPI spec, a /.well-known/api-catalog, and an Agent Skills index. Agents can discover and call the service without a human in the loop.",
  },
  {
    q: "How does Fake Email compare to using a Gmail alias?",
    a: "A Gmail alias still lands in your real inbox and still ties the signup to your identity. A disposable address from Fake Email cannot be linked back to you and disappears when you are done.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${SITE_URL}/#faq`,
  mainEntity: FAQ_ITEMS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
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
