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

export const viewport = {
  themeColor: "#ff3b3b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://fake-email.site"),
  appleWebApp: {
    capable: true,
    title: "Fake Email",
    statusBarStyle: "black-translucent",
  },
  alternates: {
    canonical: "/",
  },
  title: {
    default: "Fake Email \u2013 Disposable & Anonymous Inboxes",
    template: "%s | Fake Email",
  },
  description: "Generate disposable email addresses instantly. No signups, no tracking, built for developers with ease. Check your emails seamlessly in real-time.",
  keywords: ["fake email", "disposable email", "temp mail", "developer email", "anonymous email inbox"],
  authors: [{ name: "Fake Email Team" }],
  creator: "Fake Email Team",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://fake-email.site",
    title: "Fake Email \u2013 Disposable & Anonymous Inboxes",
    description: "Generate disposable email addresses instantly. No signups, no tracking.",
    siteName: "Fake Email",
    images: [
      {
        url: "https://fake-email.site/icon.png",
        width: 1200,
        height: 630,
        alt: "Fake Email Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fake Email \u2013 Disposable Inboxes",
    description: "Generate disposable email addresses instantly. No signups, no tracking.",
    images: ["https://fake-email.site/icon.png"],
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "Fake Email",
                "url": "https://fake-email.site",
                "description": "Generate disposable email addresses instantly. No signups, no tracking.",
              },
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "Fake Email",
                "operatingSystem": "All",
                "applicationCategory": "UtilitiesApplication",
                "url": "https://fake-email.site",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD"
                }
              }
            ])
          }}
        />
      </head>
      <body>
        <Navbar />
        <div className="pt-16 sm:pt-20">
          {children}
        </div>
      </body>
    </html>
  );
}
