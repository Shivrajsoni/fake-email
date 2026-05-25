import type { Metadata } from "next";
import { HomePage } from "@/screens/HomePage";
import { HomeContent } from "@/components/HomeContent";

export const metadata: Metadata = {
  title: "Fake Email – Free Disposable & Anonymous Inboxes",
  description:
    "Create a free disposable email address in one click. Real-time inbox, no signup, no tracking. Built for developers, signups, and email verification testing.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Fake Email – Free Disposable & Anonymous Inboxes",
    description:
      "Create a free disposable email address in one click. Real-time inbox, no signup, no tracking.",
    url: "https://fake-email.site/",
    type: "website",
  },
};

export default function Page() {
  return (
    <>
      <HomePage />
      <HomeContent />
    </>
  );
}
