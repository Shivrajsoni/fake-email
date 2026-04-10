import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../src/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-app-sans",
});

export const metadata: Metadata = {
  title: "Fake Email",
  description: "Temporary inbox for fast testing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
