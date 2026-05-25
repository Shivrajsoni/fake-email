import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb, breadcrumbJsonLd } from "@/components/Breadcrumb";

const SITE_URL = "https://fake-email.site";
const PATH = "/disposable-email-address";

export const metadata: Metadata = {
  title: "Disposable Email Address — Free, No Signup | Fake Email",
  description:
    "What a disposable email address is, when to use one, and how to generate one in under a second. Free, anonymous, no signup, real-time inbox, OpenAPI for developers.",
  alternates: { canonical: PATH },
  keywords: [
    "disposable email address",
    "disposable email",
    "free disposable email",
    "disposable email generator",
    "throwaway email",
    "anonymous email",
    "burner email",
    "temp mail",
  ],
  openGraph: {
    title: "Disposable Email Address — Free, No Signup",
    description:
      "Generate a working disposable email address in under a second. Free, anonymous, real-time inbox.",
    url: `${SITE_URL}${PATH}`,
    type: "article",
  },
};

const FAQ_ITEMS = [
  {
    q: "What exactly is a disposable email address?",
    a: "A disposable email address is a real, working inbox that receives messages for a limited time and is then deleted automatically. You hand it out instead of your real address whenever you do not want a signup or verification flow reaching your primary inbox.",
  },
  {
    q: "Is it really free?",
    a: "Yes. Fake Email does not charge for anything. There is no paid tier and no rate-limited free tier. The project is funded by its maintainers.",
  },
  {
    q: "How long does the address live?",
    a: "Mailboxes auto-expire after a short period. Treat each address as single-use. If you need a permanent inbox, use your normal provider.",
  },
  {
    q: "Can a website tell I am using a disposable email?",
    a: "Sometimes. Many platforms keep blocklists of common disposable email domains and reject signups from them. If that happens, the site has chosen to require a permanent inbox.",
  },
  {
    q: "Can I send mail from the disposable address?",
    a: "No. The service is receive-only. This prevents abuse and keeps the service usable for legitimate verification and testing.",
  },
  {
    q: "What is the difference between disposable email, temp mail, throwaway email, and burner email?",
    a: "They are synonyms. Different communities prefer different terms — developers say temp mail or throwaway, privacy folks say burner — but the underlying tool is the same: a short-lived inbox you do not have to sign up for.",
  },
  {
    q: "Can a disposable email receive OTP / verification codes?",
    a: "Yes. Verification codes, magic links, and confirmation emails arrive normally. Many users generate a disposable address specifically to grab a single code and discard the address.",
  },
  {
    q: "Is using a disposable email legal?",
    a: "Using one for privacy is legal in most jurisdictions. Always follow each site's terms of service and never use temporary email for fraud, harassment, or evading bans.",
  },
];

const BREADCRUMB_JSONLD = breadcrumbJsonLd([
  { name: "Home", href: "/" },
  { name: "Disposable email address", href: PATH },
]);

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${SITE_URL}${PATH}#faq`,
  mainEntity: FAQ_ITEMS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const WEBAPP_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Fake Email Disposable Address Generator",
  url: `${SITE_URL}${PATH}`,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "All",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export default function DisposableEmailPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([BREADCRUMB_JSONLD, FAQ_JSONLD, WEBAPP_JSONLD]),
        }}
      />
      <main className="mx-auto max-w-3xl px-6 sm:px-12 lg:px-20 py-12 sm:py-16">
        <Breadcrumb
          crumbs={[
            { name: "Home", href: "/" },
            { name: "Disposable email address" },
          ]}
        />

        <header className="mt-8">
          <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
            Concept
          </span>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink leading-[1.05]">
            Disposable email address
          </h1>
          <p className="mt-5 text-smoke leading-relaxed text-lg">
            A disposable email address is a real, working inbox that receives mail
            for a short period of time and is then deleted automatically. You hand
            it out instead of your real email whenever you do not want a signup
            form, free trial, or verification flow reaching your primary inbox.
          </p>
        </header>

        <section aria-labelledby="cta-heading" className="mt-10 border border-chalk p-6 bg-parchment">
          <h2 id="cta-heading" className="sr-only">
            Generate one now
          </h2>
          <p className="text-ink">
            <strong>Need one now?</strong>{" "}
            <Link href="/" className="text-vermillion underline underline-offset-4 font-medium">
              Generate a disposable email address →
            </Link>{" "}
            Takes under a second. No signup.
          </p>
        </section>

        <h2 className="mt-14 font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          When to use one
        </h2>
        <ul className="mt-5 space-y-3 text-smoke leading-relaxed">
          <li>
            <strong className="text-ink">SaaS trials and freebies.</strong>{" "}
            Sign up, claim the trial or download, walk away clean.
          </li>
          <li>
            <strong className="text-ink">One-time verification codes.</strong>{" "}
            Grab the OTP, confirm the action, and let the inbox die.
          </li>
          <li>
            <strong className="text-ink">QA and automated testing.</strong>{" "}
            Spin up a unique inbox per test run via the REST API.
          </li>
          <li>
            <strong className="text-ink">Forums and download portals.</strong>{" "}
            Pass mandatory email verification without committing your real address.
          </li>
          <li>
            <strong className="text-ink">Captive Wi-Fi portals.</strong>{" "}
            Airports, cafes, and hotels often gate the network behind an email — disposable solves it instantly.
          </li>
          <li>
            <strong className="text-ink">Defending against a leak.</strong>{" "}
            When you suspect a form will sell or leak your details, give it nothing real.
          </li>
        </ul>

        <h2 className="mt-14 font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          When NOT to use one
        </h2>
        <ul className="mt-5 space-y-3 text-smoke leading-relaxed">
          <li>
            <strong className="text-ink">Accounts you actually need.</strong>{" "}
            Banking, government services, primary work tools — use a real, recoverable address.
          </li>
          <li>
            <strong className="text-ink">Anything requiring password recovery.</strong>{" "}
            When the mailbox expires, your reset link goes with it.
          </li>
          <li>
            <strong className="text-ink">Long-lived subscriptions you want to keep.</strong>{" "}
            Newsletters you genuinely read, paid services — pick an alias or your real address.
          </li>
        </ul>

        <h2 className="mt-14 font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          How to generate a disposable email address here
        </h2>
        <ol className="mt-5 space-y-3 text-smoke leading-relaxed list-decimal pl-5">
          <li>
            Open the{" "}
            <Link href="/" className="text-vermillion underline underline-offset-4">
              homepage
            </Link>
            . Optionally type a custom username — leave blank for a random one.
          </li>
          <li>
            Click <em>Generate</em>. You will be redirected to your inbox at{" "}
            <code>fake-email.site/emails</code>.
          </li>
          <li>
            Paste the address wherever it is needed. The inbox polls in real time
            and shows incoming messages within seconds.
          </li>
          <li>
            When you are done, simply close the tab. The mailbox auto-expires.
          </li>
        </ol>
        <p className="mt-6 text-sm text-smoke">
          Need to do this from code? Hit{" "}
          <Link href="/docs/api" className="text-vermillion underline underline-offset-4">
            the REST API
          </Link>{" "}
          directly. POST <code>/api/temporary-address</code>, GET{" "}
          <code>/api/inbox/poll</code>, done.
        </p>

        <h2 className="mt-14 font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          Disposable email vs Gmail alias
        </h2>
        <p className="mt-5 text-smoke leading-relaxed">
          A Gmail alias (the <code>you+tag@gmail.com</code> trick) still routes
          mail to your real inbox and still ties the signup to your identity. A
          disposable address from Fake Email cannot be linked back to you, does
          not pollute your inbox, and disappears when you are finished. Use
          aliases for filtering. Use disposable addresses when you do not want a
          relationship to exist at all.
        </p>

        <h2 className="mt-14 font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          Frequently asked questions
        </h2>
        <dl className="mt-8 space-y-7">
          {FAQ_ITEMS.map((item) => (
            <div key={item.q}>
              <dt className="font-display font-bold text-ink text-lg">{item.q}</dt>
              <dd className="mt-2 text-smoke leading-relaxed">{item.a}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-16 border-t border-chalk pt-10">
          <h2 className="font-display text-xl font-bold text-ink">Keep reading</h2>
          <ul className="mt-5 space-y-3 text-smoke">
            <li>
              <Link href="/blog/how-disposable-email-works" className="text-vermillion underline underline-offset-4 hover:text-ink">
                How disposable email works — technical walkthrough
              </Link>
            </li>
            <li>
              <Link href="/docs/api" className="text-vermillion underline underline-offset-4 hover:text-ink">
                REST API reference
              </Link>
            </li>
            <li>
              <Link href="/" className="text-vermillion underline underline-offset-4 hover:text-ink">
                Generate a disposable address now
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
