import type { Metadata } from "next";
import { EmailsPage } from "@/screens/EmailsPage";

export const metadata: Metadata = {
  title: "Inbox – Read messages for your disposable email",
  description:
    "Live inbox for your temporary Fake Email address. Auto-refreshes as new messages arrive. No signup required.",
  alternates: { canonical: "/emails" },
  robots: {
    index: false,
    follow: true,
    nocache: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export default function Page() {
  return <EmailsPage />;
}
