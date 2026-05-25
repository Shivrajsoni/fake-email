import Link from "next/link";

const STATS = [
  { value: "0s", label: "Time to inbox" },
  { value: "0", label: "Signups required" },
  { value: "100%", label: "Free, forever" },
  { value: "REST", label: "Public API" },
];

const FEATURES = [
  {
    title: "Instant disposable inboxes",
    body: "Generate a new temporary email address in under a second. No registration, no captcha, no waiting room.",
  },
  {
    title: "Real-time inbox polling",
    body: "Incoming messages appear in the inbox within seconds of arrival, including attachments and HTML bodies.",
  },
  {
    title: "Zero tracking",
    body: "No accounts, no analytics fingerprinting, no third-party trackers loading on inbox pages.",
  },
  {
    title: "Developer REST API",
    body: "REST endpoints for creating mailboxes and polling messages. OpenAPI 3.1 spec for client codegen.",
  },
  {
    title: "Open-source backend",
    body: "Rust SMTP server and HTTP service available on GitHub. Audit the code, self-host, or fork it.",
  },
  {
    title: "Auto-expiring mailboxes",
    body: "Mailboxes are ephemeral — when they expire, all messages, attachments, and metadata are deleted.",
  },
];

const USE_CASES = [
  {
    h: "Sign up for a service without exposing your real email",
    p: "Trial a SaaS product, claim a coupon, or download a whitepaper without inviting newsletters into your primary inbox.",
  },
  {
    h: "Receive a one-time verification code",
    p: "Get the OTP or confirmation link, copy it, and walk away. The mailbox is gone before any marketing email arrives.",
  },
  {
    h: "QA and developer testing",
    p: "Drive automated tests that need a unique inbox per run. Hit the REST API directly — no scraping required.",
  },
  {
    h: "Avoid spam after a data breach",
    p: "Use a disposable address on forms you suspect will sell, share, or leak your contact information.",
  },
  {
    h: "Receive verification on a forum or download portal",
    p: "Get past mandatory email verification on file hosts, forums, and download walls without committing a real address.",
  },
  {
    h: "Public Wi-Fi captive portals",
    p: "Many airports, cafes, and hotels gate Wi-Fi behind an email address. A disposable inbox satisfies the form and dies on its own.",
  },
];

const COMPARE_ROWS = [
  { feature: "Free", us: "Yes", tempmail: "Yes (paid tier)", tenmin: "Yes", guerrilla: "Yes" },
  { feature: "No signup", us: "Yes", tempmail: "Yes", tenmin: "Yes", guerrilla: "Yes" },
  { feature: "Public REST API", us: "Yes", tempmail: "Paid", tenmin: "No", guerrilla: "Yes" },
  { feature: "OpenAPI 3.1 spec", us: "Yes", tempmail: "No", tenmin: "No", guerrilla: "No" },
  { feature: "Open source", us: "Yes", tempmail: "No", tenmin: "No", guerrilla: "No" },
  { feature: "llms.txt for AI agents", us: "Yes", tempmail: "No", tenmin: "No", guerrilla: "No" },
  { feature: "Custom username", us: "Yes", tempmail: "Yes", tenmin: "No", guerrilla: "Yes" },
  { feature: "Ad-free interface", us: "Yes", tempmail: "Paid", tenmin: "No", guerrilla: "No" },
];

const RELATED = [
  { href: "/disposable-email-address", title: "Disposable email address — what it is and how to use one" },
  { href: "/blog/how-disposable-email-works", title: "How disposable email works (full technical walkthrough)" },
  { href: "/docs/api", title: "REST API reference for developers" },
  { href: "/openapi.json", title: "OpenAPI 3.1 spec for codegen" },
];

const FAQ = [
  {
    q: "What is a disposable email address?",
    a: "A disposable email address — also called a temporary email, throwaway email, burner email, or fake email — is a short-lived inbox that lets you receive mail without revealing your real address. After a short period the inbox and any messages it received are deleted, so spam, marketing follow-ups, and leaked databases can never reach your real inbox.",
  },
  {
    q: "How is Fake Email different from temp-mail.org, 10minutemail, or Guerrilla Mail?",
    a: "Fake Email is open source, ships a public OpenAPI 3.1 spec, exposes an llms.txt and agent-skills index for AI agents, and the entire Rust backend is on GitHub for you to read or self-host. Most other temp-mail services are closed source, gate their API behind a paywall, or run on aging stacks with heavy ads.",
  },
  {
    q: "Is Fake Email really free?",
    a: "Yes. Every feature is free. There is no paid tier, no signup, no credit card, and no ads on the inbox page. The project is funded by its maintainers.",
  },
  {
    q: "How long does a temporary email last?",
    a: "Mailboxes are ephemeral and auto-expire. Treat each address as single-use; if you need a permanent inbox, use your regular provider.",
  },
  {
    q: "Can I send email from a disposable address?",
    a: "No. Fake Email is receive-only. This prevents abuse and keeps the service free for legitimate verification and testing use cases.",
  },
  {
    q: "Do you store, sell, or read my messages?",
    a: "No accounts exist, so there is nothing tied to a person. Mailboxes and their messages are purged on expiry. The service is operated as a privacy utility, not a data-collection funnel.",
  },
  {
    q: "Is there an API I can call from my app or tests?",
    a: "Yes. See the API reference at /docs/api and the OpenAPI 3.1 spec at /openapi.json. Endpoints include POST /api/temporary-address and GET /api/inbox/poll. The same endpoints power this website.",
  },
  {
    q: "Will incoming email show attachments?",
    a: "Yes. Attachments arrive alongside the message body while the mailbox is alive.",
  },
  {
    q: "Is Fake Email anonymous?",
    a: "No signup is required, so no personally identifying information is collected by the service itself. Network requests are subject to your network provider.",
  },
  {
    q: "Is disposable email legal?",
    a: "Using a disposable email address for privacy is legal in most jurisdictions. Always follow each website's terms of service and never use temporary email for fraud, harassment, or evading bans.",
  },
  {
    q: "Why might a website block disposable email addresses?",
    a: "Some platforms block known disposable domains to reduce trial abuse or duplicate-account fraud. If a signup is rejected, that site has chosen to require a permanent inbox.",
  },
  {
    q: "Can I receive verification codes (OTPs) here?",
    a: "Yes. Sign-up verification codes, magic links, and confirmation emails are all received normally. Many users generate a mailbox specifically to grab an OTP and discard the address.",
  },
  {
    q: "Can AI agents use Fake Email?",
    a: "Yes. Fake Email publishes an llms.txt, an OpenAPI spec, a /.well-known/api-catalog (RFC 9727), and an Agent Skills index (RFC v0.2.0). Agents can discover and call the service without a human in the loop.",
  },
  {
    q: "How does Fake Email compare to using a Gmail alias (the +tag trick)?",
    a: "A Gmail alias still lands in your real inbox and still ties the signup to your identity. A disposable address from Fake Email cannot be linked back to you and disappears when you are done.",
  },
];

export function HomeContent() {
  return (
    <>
      {/* Stats bar */}
      <section
        aria-labelledby="stats-heading"
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-10 sm:py-12 bg-parchment"
      >
        <h2 id="stats-heading" className="sr-only">
          Service at a glance
        </h2>
        <div className="mx-auto max-w-5xl grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
                {s.value}
              </span>
              <span className="mt-1 font-mono text-xs uppercase tracking-widest text-smoke">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Definition / explainer */}
      <section
        aria-labelledby="define-heading"
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
            Definition
          </span>
          <h2
            id="define-heading"
            className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
          >
            What is a fake email address?
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            A <strong>fake email</strong>, also called a <strong>disposable email</strong>,{" "}
            <strong>temporary email</strong>, <strong>throwaway email</strong>, or{" "}
            <strong>burner email</strong>, is a real, working inbox that receives mail
            for a short period of time and is then automatically deleted. You hand it
            out instead of your real address whenever you do not want a sign-up,
            verification flow, or marketing list reaching your primary mailbox.
          </p>
          <p className="mt-4 text-smoke leading-relaxed">
            Fake Email gives you one in under a second at <code>@fake-email.site</code>,
            with no registration, no captcha, and no tracking. Use it for{" "}
            <Link className="text-vermillion underline underline-offset-4" href="/disposable-email-address">
              disposable email signups
            </Link>
            , one-time codes, QA automation, or anywhere a real address is overkill.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="features-heading"
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-16 sm:py-20 bg-paper/40"
      >
        <div className="mx-auto max-w-5xl">
          <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
            Features
          </span>
          <h2
            id="features-heading"
            className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
          >
            Why use Fake Email
          </h2>
          <p className="mt-3 max-w-2xl text-smoke">
            A free temporary email service designed for developers, QA engineers,
            and privacy-minded users who need a clean inbox for one-off signups.
          </p>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="border border-chalk p-5 hover:border-vermillion transition-colors"
              >
                <h3 className="font-display font-bold text-ink text-lg">
                  {f.title}
                </h3>
                <p className="mt-2 text-smoke text-sm leading-relaxed">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="how-heading"
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-5xl">
          <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
            How it works
          </span>
          <h2
            id="how-heading"
            className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
          >
            How disposable email works
          </h2>
          <p className="mt-3 max-w-2xl text-smoke">
            Three steps. Total time to first inbox: under one second.
          </p>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3 list-none">
            <li className="border border-chalk p-5">
              <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
                Step 1
              </span>
              <h3 className="mt-2 font-display font-bold text-ink">
                Generate an address
              </h3>
              <p className="mt-2 text-sm text-smoke">
                Click <em>Generate</em> or pick a username. A new mailbox at{" "}
                <code>@fake-email.site</code> is yours instantly.
              </p>
            </li>
            <li className="border border-chalk p-5">
              <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
                Step 2
              </span>
              <h3 className="mt-2 font-display font-bold text-ink">
                Use it anywhere
              </h3>
              <p className="mt-2 text-sm text-smoke">
                Paste the address into a signup form, a CI test fixture, or any
                place that needs to send you a verification code.
              </p>
            </li>
            <li className="border border-chalk p-5">
              <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
                Step 3
              </span>
              <h3 className="mt-2 font-display font-bold text-ink">
                Read incoming mail
              </h3>
              <p className="mt-2 text-sm text-smoke">
                The inbox polls in real time. Click a message to read it.
                Mailboxes expire automatically.
              </p>
            </li>
          </ol>
          <p className="mt-8 text-sm text-smoke">
            Want the deep dive on what happens under the hood — SMTP, MX records,
            Rust pipelines, the lot?{" "}
            <Link
              href="/blog/how-disposable-email-works"
              className="text-vermillion underline underline-offset-4 font-medium"
            >
              Read the full technical walkthrough →
            </Link>
          </p>
        </div>
      </section>

      <section
        aria-labelledby="uses-heading"
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-16 sm:py-20 bg-paper/40"
      >
        <div className="mx-auto max-w-5xl">
          <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
            Use cases
          </span>
          <h2
            id="uses-heading"
            className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
          >
            When to use a temporary email
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 list-none">
            {USE_CASES.map((u) => (
              <li key={u.h} className="border-l-2 border-vermillion pl-5">
                <h3 className="font-display font-bold text-ink">{u.h}</h3>
                <p className="mt-2 text-sm text-smoke leading-relaxed">{u.p}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Compare to alternatives */}
      <section
        aria-labelledby="compare-heading"
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-5xl">
          <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
            Compare
          </span>
          <h2
            id="compare-heading"
            className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
          >
            Fake Email vs other temp-mail services
          </h2>
          <p className="mt-3 max-w-2xl text-smoke">
            Honest feature matrix against the three most-used disposable email
            providers. We document where they win, too.
          </p>
          <div className="mt-8 overflow-x-auto border border-chalk">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-chalk bg-parchment text-left">
                  <th className="px-4 py-3 font-display font-bold text-ink">Feature</th>
                  <th className="px-4 py-3 font-display font-bold text-vermillion">Fake Email</th>
                  <th className="px-4 py-3 font-display font-bold text-ink">temp-mail.org</th>
                  <th className="px-4 py-3 font-display font-bold text-ink">10minutemail</th>
                  <th className="px-4 py-3 font-display font-bold text-ink">Guerrilla Mail</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 1 ? "bg-paper/40" : ""}>
                    <td className="px-4 py-3 font-medium text-ink">{row.feature}</td>
                    <td className="px-4 py-3 text-ink font-mono">{row.us}</td>
                    <td className="px-4 py-3 text-smoke font-mono">{row.tempmail}</td>
                    <td className="px-4 py-3 text-smoke font-mono">{row.tenmin}</td>
                    <td className="px-4 py-3 text-smoke font-mono">{row.guerrilla}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-ash">
            Last verified: 2026-05-25. Competitor features change frequently —
            check their sites for the latest. If we are out of date,{" "}
            <a
              className="text-vermillion underline underline-offset-4"
              href="https://github.com/Shivrajsoni/fake-email/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              open an issue
            </a>
            .
          </p>
        </div>
      </section>

      <section
        aria-labelledby="api-heading"
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-16 sm:py-20 bg-paper/40"
      >
        <div className="mx-auto max-w-5xl">
          <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
            API
          </span>
          <h2
            id="api-heading"
            className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
          >
            REST API for developers
          </h2>
          <p className="mt-3 max-w-2xl text-smoke">
            Drive Fake Email from your test suite, CI pipeline, or bot. JSON in,
            JSON out, no auth.
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="border border-chalk p-5">
              <h3 className="font-display font-bold text-ink">
                Create a mailbox
              </h3>
              <pre className="mt-3 overflow-x-auto text-xs bg-ink text-page p-4 font-mono">
                <code>{`POST /api/temporary-address
Content-Type: application/json

{ "username": "alice" }

200 OK
{ "temp_email_addr": "alice@fake-email.site" }`}</code>
              </pre>
            </div>
            <div className="border border-chalk p-5">
              <h3 className="font-display font-bold text-ink">Poll an inbox</h3>
              <pre className="mt-3 overflow-x-auto text-xs bg-ink text-page p-4 font-mono">
                <code>{`GET /api/inbox/poll?address=alice@fake-email.site

200 OK
{ "messages": [ ... ] }`}</code>
              </pre>
            </div>
          </div>
          <p className="mt-6 text-sm text-smoke">
            Read the full reference in the{" "}
            <Link
              href="/docs/api"
              className="text-vermillion underline underline-offset-4 font-medium"
            >
              API docs
            </Link>
            , or pull the OpenAPI spec from{" "}
            <a
              href="/openapi.json"
              className="text-vermillion underline underline-offset-4 font-medium"
            >
              /openapi.json
            </a>
            . Agents can discover endpoints via{" "}
            <a
              href="/.well-known/api-catalog"
              className="text-vermillion underline underline-offset-4 font-medium"
            >
              /.well-known/api-catalog
            </a>
            .
          </p>
        </div>
      </section>

      <section
        aria-labelledby="faq-heading"
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
            FAQ
          </span>
          <h2
            id="faq-heading"
            className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
          >
            Frequently asked questions
          </h2>
          <dl className="mt-10 space-y-8">
            {FAQ.map((item) => (
              <div key={item.q}>
                <dt className="font-display font-bold text-ink text-lg">
                  {item.q}
                </dt>
                <dd className="mt-2 text-smoke leading-relaxed">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Related pages */}
      <section
        aria-labelledby="related-heading"
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-16 sm:py-20 bg-paper/40"
      >
        <div className="mx-auto max-w-3xl">
          <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
            Related
          </span>
          <h2
            id="related-heading"
            className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
          >
            Keep reading
          </h2>
          <ul className="mt-8 space-y-4">
            {RELATED.map((r) => (
              <li key={r.href} className="border-l-2 border-chalk pl-4 hover:border-vermillion transition-colors">
                <Link
                  href={r.href}
                  className="font-display font-bold text-ink hover:text-vermillion transition-colors"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer
        aria-label="Site footer"
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-10"
      >
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-smoke">
          <p>
            &copy; {new Date().getFullYear()} Fake Email. Open-source, free, and
            anonymous.
          </p>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              <li>
                <Link href="/" className="hover:text-vermillion">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/disposable-email-address" className="hover:text-vermillion">
                  Disposable email
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-vermillion">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/emails" className="hover:text-vermillion">
                  Inbox
                </Link>
              </li>
              <li>
                <Link href="/docs/api" className="hover:text-vermillion">
                  API
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Shivrajsoni/fake-email"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-vermillion"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}
