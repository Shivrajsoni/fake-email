import Link from "next/link";

const FEATURES = [
  {
    title: "Instant disposable inboxes",
    body: "Generate a new temporary email address in under a second. No registration, no captcha.",
  },
  {
    title: "Real-time inbox polling",
    body: "Incoming messages appear in the inbox within seconds of arrival, including attachments.",
  },
  {
    title: "Zero tracking",
    body: "No accounts, no analytics fingerprinting, no third-party trackers loading on inbox pages.",
  },
  {
    title: "Developer API",
    body: "REST endpoints for creating mailboxes and polling messages. OpenAPI spec available for tooling.",
  },
  {
    title: "Open-source backend",
    body: "Rust SMTP server and HTTP service available on GitHub. Audit the code or self-host.",
  },
  {
    title: "Auto-expiring mailboxes",
    body: "Mailboxes are ephemeral — when they expire, all messages and metadata are gone.",
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
    h: "Avoid spam after a leak",
    p: "Use a disposable address on forms you suspect will sell or leak your contact information.",
  },
];

const FAQ = [
  {
    q: "What is a disposable email address?",
    a: "A disposable (or temporary) email address is a short-lived inbox that lets you receive mail without revealing your real address. After a short period the inbox and any messages it received are deleted.",
  },
  {
    q: "Is Fake Email really free?",
    a: "Yes. Every feature is free. There is no paid tier, no signup, and no credit card. The project is funded by its maintainers.",
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
    q: "Do you store or sell my data?",
    a: "No accounts exist, so there is nothing tied to a person. Mailboxes and their messages are purged on expiry.",
  },
  {
    q: "Is there an API I can call from my app or tests?",
    a: "Yes. See the API docs at /docs/api and the OpenAPI spec at /openapi.json. The same endpoints power this site.",
  },
  {
    q: "Will the email I receive show attachments?",
    a: "Yes. Attachments arrive alongside the message body while the mailbox is alive.",
  },
  {
    q: "Is Fake Email anonymous?",
    a: "There is no signup, so no personally identifying information is collected by the service itself. Network requests are subject to your network provider.",
  },
];

export function HomeContent() {
  return (
    <>
      <section
        aria-labelledby="features-heading"
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="features-heading"
            className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
          >
            Why use Fake Email
          </h2>
          <p className="mt-3 max-w-2xl text-smoke">
            A free temporary email service designed for developers, QA
            engineers, and anyone who needs a clean inbox for one-off signups.
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
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-16 sm:py-20 bg-paper/40"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="how-heading"
            className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
          >
            How disposable email works
          </h2>
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
        </div>
      </section>

      <section
        aria-labelledby="uses-heading"
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="uses-heading"
            className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
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

      <section
        aria-labelledby="api-heading"
        className="border-t border-chalk px-6 sm:px-12 lg:px-20 py-16 sm:py-20 bg-paper/40"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="api-heading"
            className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
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
          <h2
            id="faq-heading"
            className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
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
            <ul className="flex flex-wrap gap-4">
              <li>
                <Link href="/" className="hover:text-vermillion">
                  Home
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
