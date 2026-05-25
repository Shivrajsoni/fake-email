import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb, breadcrumbJsonLd } from "@/components/Breadcrumb";

const SITE_URL = "https://fake-email.site";
const PATH = "/blog/how-disposable-email-works";
const PUBLISHED = "2026-05-25";
const MODIFIED = "2026-05-25";

export const metadata: Metadata = {
  title: "How Disposable Email Works — Full Technical Walkthrough | Fake Email",
  description:
    "From DNS MX records to SMTP servers to real-time HTTP polling. The complete pipeline behind a disposable email inbox, explained step by step, with the open-source Rust implementation as the worked example.",
  alternates: { canonical: PATH },
  keywords: [
    "how disposable email works",
    "how temp mail works",
    "disposable email explained",
    "smtp server temp mail",
    "rust smtp server",
    "mx record temp mail",
    "disposable email architecture",
  ],
  openGraph: {
    title: "How disposable email works",
    description:
      "DNS, SMTP, queues, real-time polling — the full disposable-email pipeline, explained.",
    url: `${SITE_URL}${PATH}`,
    type: "article",
    publishedTime: PUBLISHED,
    modifiedTime: MODIFIED,
  },
  twitter: {
    card: "summary_large_image",
    title: "How disposable email works",
    description:
      "DNS, SMTP, queues, real-time polling — the full disposable-email pipeline.",
  },
};

const BREADCRUMB_JSONLD = breadcrumbJsonLd([
  { name: "Home", href: "/" },
  { name: "Blog", href: "/blog" },
  { name: "How disposable email works", href: PATH },
]);

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": `${SITE_URL}${PATH}#article`,
  mainEntityOfPage: `${SITE_URL}${PATH}`,
  headline: "How disposable email works — a full technical walkthrough",
  description:
    "From DNS MX records to SMTP servers to real-time HTTP polling, the complete pipeline behind a disposable email inbox.",
  inLanguage: "en-US",
  datePublished: PUBLISHED,
  dateModified: MODIFIED,
  image: `${SITE_URL}/icon.png`,
  author: {
    "@type": "Person",
    name: "Shivraj Soni",
    url: "https://github.com/Shivrajsoni",
  },
  publisher: { "@id": `${SITE_URL}/#organization` },
  keywords: [
    "disposable email",
    "temp mail",
    "smtp",
    "mx records",
    "rust",
    "open source email",
  ],
  about: {
    "@type": "Thing",
    name: "Disposable email",
  },
};

const HOWTO_JSONLD = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to use a disposable email inbox",
  description:
    "Generate a disposable email address, paste it into a signup form, and read incoming mail in real time before the inbox expires.",
  totalTime: "PT1M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Generate an address",
      text: "Visit https://fake-email.site and click Generate. A new mailbox at @fake-email.site is yours instantly.",
      url: `${SITE_URL}/`,
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Use the address",
      text: "Paste the address into the signup form, CI test fixture, or wherever needs a verification email.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Read incoming mail",
      text: "The inbox polls in real time. Click any message to read it. The mailbox auto-expires.",
      url: `${SITE_URL}/emails`,
    },
  ],
};

export default function HowItWorksPost() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([BREADCRUMB_JSONLD, ARTICLE_JSONLD, HOWTO_JSONLD]),
        }}
      />
      <main className="mx-auto max-w-3xl px-6 sm:px-12 lg:px-20 py-12 sm:py-16">
        <Breadcrumb
          crumbs={[
            { name: "Home", href: "/" },
            { name: "Blog", href: "/blog" },
            { name: "How disposable email works" },
          ]}
        />

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono uppercase tracking-widest text-smoke">
            <time dateTime={PUBLISHED}>{PUBLISHED}</time>
            <span className="text-chalk">·</span>
            <span className="text-vermillion">Engineering</span>
            <span className="text-chalk">·</span>
            <span>14 min read</span>
          </div>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink leading-[1.05]">
            How disposable email works
          </h1>
          <p className="mt-5 text-smoke leading-relaxed text-lg">
            A disposable email address looks magical from the outside. Click a
            button, get a fresh inbox, watch verification codes show up in
            real time, walk away. Under the hood it is a small stack of
            well-understood protocols glued together with care. This is the full
            walkthrough — DNS, SMTP, storage, polling — using Fake Email&apos;s
            open-source Rust implementation as the worked example.
          </p>
        </header>

        <nav aria-label="Table of contents" className="mt-10 border border-chalk p-5 bg-parchment">
          <h2 className="font-display font-bold text-ink text-sm uppercase tracking-widest text-vermillion">
            On this page
          </h2>
          <ol className="mt-3 space-y-1 text-sm text-smoke list-decimal pl-5">
            <li><a className="hover:text-vermillion" href="#what">What is a disposable email address?</a></li>
            <li><a className="hover:text-vermillion" href="#pipeline">The end-to-end pipeline</a></li>
            <li><a className="hover:text-vermillion" href="#mx">Step 1: DNS and the MX record</a></li>
            <li><a className="hover:text-vermillion" href="#smtp">Step 2: The inbound SMTP server</a></li>
            <li><a className="hover:text-vermillion" href="#parse">Step 3: Parsing and storing the message</a></li>
            <li><a className="hover:text-vermillion" href="#poll">Step 4: Real-time polling from the browser</a></li>
            <li><a className="hover:text-vermillion" href="#expire">Step 5: Expiry and cleanup</a></li>
            <li><a className="hover:text-vermillion" href="#api">Doing all of this from code</a></li>
            <li><a className="hover:text-vermillion" href="#safety">Privacy, abuse, and what we don&apos;t store</a></li>
            <li><a className="hover:text-vermillion" href="#try">Try it now</a></li>
          </ol>
        </nav>

        <section id="what" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            1. What is a disposable email address?
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            A <strong>disposable email address</strong> — also called{" "}
            <em>temp mail</em>, <em>throwaway email</em>, <em>burner email</em>,{" "}
            or <em>fake email</em> — is a real, working inbox at a public domain
            that anyone can claim for a few minutes and then abandon. The
            critical property is that it is a real RFC 5321 / RFC 5322 inbox:
            actual SMTP servers around the world will accept{" "}
            <code>RCPT TO: &lt;alice@fake-email.site&gt;</code>, deliver the
            message, and you will see it in a browser tab.
          </p>
          <p className="mt-4 text-smoke leading-relaxed">
            From the user&apos;s point of view, three things matter: you do not
            sign up, you receive mail almost instantly, and the inbox vanishes
            when you are done. Behind that is a chain of moving parts — DNS, an
            inbound SMTP server, a parser, a database, an HTTP API, and a
            polling UI. Let&apos;s walk it.
          </p>
        </section>

        <section id="pipeline" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            2. The end-to-end pipeline
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            When someone sends a message to{" "}
            <code>alice@fake-email.site</code>, this is the path of the
            envelope from their <em>send</em> button to your browser tab:
          </p>
          <pre className="mt-6 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`Sender's MTA  ──► DNS lookup: MX for fake-email.site
              ──► resolves to mail.fake-email.site (your EC2)
              ──► TCP connection to port 25
              ──► SMTP conversation (HELO, MAIL FROM, RCPT TO, DATA)
              ──► RFC 5322 message bytes received

Rust SMTP server (this codebase)
              ──► parses headers + body, normalizes UTF-8
              ──► writes (mailbox_id, message) row to Postgres

Browser tab on /emails
              ──► HTTP GET /api/inbox/poll?address=alice@fake-email.site
              ──► server reads from Postgres, returns JSON
              ──► UI renders new messages

Background expiry job
              ──► deletes rows older than TTL
              ──► messages + metadata gone, no trace`}
          </pre>
          <p className="mt-6 text-smoke leading-relaxed">
            Every piece has a 50-year-old standards document behind it. The novelty
            is gluing them together cleanly. Let&apos;s zoom in.
          </p>
        </section>

        <section id="mx" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            3. Step 1 — DNS and the MX record
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            Email delivery starts with DNS. When a sender&apos;s Mail Transfer
            Agent (Gmail&apos;s outbound servers, Postfix at a corporate mail
            relay, SendGrid&apos;s edge — anything) needs to deliver mail to{" "}
            <code>alice@fake-email.site</code>, it asks for the{" "}
            <strong>MX (Mail eXchanger) record</strong> of{" "}
            <code>fake-email.site</code>:
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono">
{`$ dig MX fake-email.site +short
10 mail.fake-email.site.`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            The MX response says: &ldquo;to deliver mail for this domain, connect to{" "}
            <code>mail.fake-email.site</code> on port 25.&rdquo; A separate{" "}
            <strong>A record</strong> resolves <code>mail.fake-email.site</code>{" "}
            to the EC2 instance&apos;s elastic IP. Two DNS records — that is the
            whole &ldquo;routing layer.&rdquo;
          </p>
          <p className="mt-4 text-smoke leading-relaxed">
            Two things have to be right at this layer or nothing else matters:
          </p>
          <ul className="mt-3 space-y-2 text-smoke list-disc pl-5">
            <li>
              <strong>The MX record points to a real hostname</strong> (not a CNAME, not an IP — RFC 5321 §5.1 forbids both).
            </li>
            <li>
              <strong>Port 25 inbound is open</strong> at the cloud provider.
              AWS blocks port 25 by default; you have to file a request to lift
              the limit before the SMTP server can ever receive a packet.
            </li>
          </ul>
        </section>

        <section id="smtp" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            4. Step 2 — The inbound SMTP server
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            Once a TCP connection arrives on port 25, the SMTP conversation
            begins. SMTP is line-based and amusingly chatty. A real exchange
            looks like this (lines starting <code>&lt;</code> are ours, lines
            starting <code>&gt;</code> are the sender):
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`< 220 mail.fake-email.site Service ready
> EHLO sender.example.com
< 250-mail.fake-email.site
< 250 SIZE 10485760
> MAIL FROM:<bob@example.com>
< 250 OK
> RCPT TO:<alice@fake-email.site>
< 250 OK
> DATA
< 354 Start mail input; end with <CRLF>.<CRLF>
> From: bob@example.com
> To: alice@fake-email.site
> Subject: Your verification code
>
> Your code is 482910.
> .
< 250 OK: queued
> QUIT
< 221 Bye`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            Fake Email&apos;s SMTP server is a Rust binary in{" "}
            <code>crates/smtp/</code>. It listens on port 25, accepts the
            conversation, validates that the <code>RCPT TO</code> domain matches
            our configured domain, and reads the full message bytes after the{" "}
            <code>DATA</code> command. That is the minimum viable inbound MTA.
          </p>
          <p className="mt-4 text-smoke leading-relaxed">
            For a production temp-mail service you also want:
          </p>
          <ul className="mt-3 space-y-2 text-smoke list-disc pl-5">
            <li><strong>Per-IP rate limiting</strong> at this layer to slow down spam blasts before they hit the DB.</li>
            <li><strong>SIZE advertisement</strong> so senders self-truncate huge bodies before transmitting.</li>
            <li><strong>Connection timeouts</strong> on every state — a slow sender shouldn&apos;t pin a worker.</li>
            <li><strong>STARTTLS</strong> if you want sender-side encryption (not strictly required for receive-only public temp-mail, but increases delivery reputation).</li>
          </ul>
        </section>

        <section id="parse" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            5. Step 3 — Parsing and storing the message
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            The SMTP server hands the raw message bytes — an RFC 5322 message —
            to a parser. RFC 5322 defines the headers (<code>From</code>,{" "}
            <code>To</code>, <code>Subject</code>, <code>Date</code>,{" "}
            <code>Message-ID</code>) plus the body. MIME (RFC 2045–2049) extends
            the body to allow attachments, HTML, alternative encodings, and
            character set declarations. A robust parser must handle:
          </p>
          <ul className="mt-3 space-y-2 text-smoke list-disc pl-5">
            <li>Folded headers (header values broken across multiple physical lines).</li>
            <li><code>Content-Transfer-Encoding: quoted-printable</code> and <code>base64</code>.</li>
            <li>Multiple character sets — UTF-8, ISO-8859-1, Windows-1252, sometimes worse.</li>
            <li>Multipart bodies: <code>multipart/alternative</code> for HTML+text, <code>multipart/mixed</code> for attachments.</li>
            <li>Hostile bodies. Some senders ship malformed MIME boundaries hoping you crash.</li>
          </ul>
          <p className="mt-5 text-smoke leading-relaxed">
            Once parsed, the server writes a row to Postgres:
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`INSERT INTO messages (
  id, mailbox_address, sender, subject, body_text, body_html,
  attachments, received_at, expires_at
) VALUES (
  gen_random_uuid(),
  'alice@fake-email.site',
  'bob@example.com',
  'Your verification code',
  'Your code is 482910.',
  NULL,
  '[]'::jsonb,
  now(),
  now() + interval '15 minutes'
);`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            Note the <code>expires_at</code> column: the message&apos;s
            self-destruct time is decided at insert. There is no separate
            decision needed at expiry — a background job just deletes anything
            past its TTL.
          </p>
        </section>

        <section id="poll" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            6. Step 4 — Real-time polling from the browser
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            With the message safely in Postgres, the user&apos;s open browser
            tab is the consumer. Fake Email uses straightforward HTTP polling
            against{" "}
            <code>GET /api/inbox/poll?address=alice@fake-email.site</code>. The
            HTTP server in <code>crates/http-server/</code> reads:
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`SELECT id, sender, subject, body_text, body_html, attachments, received_at
FROM messages
WHERE mailbox_address = $1
ORDER BY received_at DESC;`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            The client (the <code>EmailsPage</code> React component) polls this
            every few seconds. The UI diffs the returned list against what it
            has rendered and slides new messages into view. We picked HTTP
            polling over WebSockets or SSE for three reasons:
          </p>
          <ul className="mt-3 space-y-2 text-smoke list-disc pl-5">
            <li><strong>Stateless.</strong> Any HTTP server behind any load balancer answers any request — no per-connection state to migrate.</li>
            <li><strong>Cache-friendly.</strong> The endpoint is cacheable for very short windows (sub-second), which absorbs hot tabs without DB pressure.</li>
            <li><strong>Robust to client hibernation.</strong> Closed laptop lids and reopened tabs just resume polling; no reconnect handshake.</li>
          </ul>
          <p className="mt-5 text-smoke leading-relaxed">
            For higher fanout you would layer Postgres <code>LISTEN/NOTIFY</code>{" "}
            and SSE on top. We have not needed it yet.
          </p>
        </section>

        <section id="expire" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            7. Step 5 — Expiry and cleanup
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            Expiry is the whole point of a disposable email service. We delete
            aggressively:
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`-- runs every minute via a background tokio task
DELETE FROM messages WHERE expires_at < now();
DELETE FROM mailboxes WHERE last_seen_at < now() - interval '1 hour';`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            Once a row is deleted, the bytes are gone from active storage. WAL
            and replicas rotate them out within hours. There is no &ldquo;archive&rdquo;
            tier, no &ldquo;cold storage,&rdquo; no analytics warehouse fed by these
            tables. The data was always meant to die.
          </p>
        </section>

        <section id="api" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            8. Doing all of this from code
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            Everything the website does, the public REST API does. Most people
            think &ldquo;temp mail&rdquo; and picture a webpage. Developers should picture
            two HTTP calls.
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`# 1. create a mailbox
curl -X POST https://fake-email.site/api/temporary-address \\
     -H 'content-type: application/json' \\
     -d '{"username":"alice"}'
# { "temp_email_addr": "alice@fake-email.site" }

# 2. paste the address somewhere, then poll
curl 'https://fake-email.site/api/inbox/poll?address=alice@fake-email.site'
# { "messages": [ { "subject": "Your code", "body_text": "..." } ] }`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            In JavaScript / Playwright / Cypress for end-to-end email
            verification tests:
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`const res = await fetch("https://fake-email.site/api/temporary-address", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({}),
});
const { temp_email_addr } = await res.json();

await page.fill('input[name="email"]', temp_email_addr);
await page.click('button[type="submit"]');

// poll until the OTP arrives
for (let i = 0; i < 30; i++) {
  const inbox = await fetch(
    \`https://fake-email.site/api/inbox/poll?address=\${temp_email_addr}\`,
  ).then((r) => r.json());
  const msg = inbox.messages.find((m) => /Your code is/.test(m.body_text));
  if (msg) {
    const code = msg.body_text.match(/\\d{6}/)?.[0];
    await page.fill('input[name="otp"]', code);
    break;
  }
  await new Promise((r) => setTimeout(r, 1000));
}`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            Full reference:{" "}
            <Link href="/docs/api" className="text-vermillion underline underline-offset-4">
              /docs/api
            </Link>
            . Machine-readable OpenAPI 3.1 spec:{" "}
            <a href="/openapi.json" className="text-vermillion underline underline-offset-4">
              /openapi.json
            </a>
            .
          </p>
        </section>

        <section id="safety" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            9. Privacy, abuse, and what we don&apos;t store
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            Two questions any temp-mail user should be able to answer at a glance:
          </p>
          <h3 className="mt-6 font-display font-bold text-ink text-lg">What gets stored?</h3>
          <ul className="mt-3 space-y-2 text-smoke list-disc pl-5">
            <li>The mailbox address (until expiry).</li>
            <li>The received messages (until expiry).</li>
            <li>Nothing tied to a person — there is no account, no signup, no profile.</li>
          </ul>
          <h3 className="mt-6 font-display font-bold text-ink text-lg">What does NOT get stored?</h3>
          <ul className="mt-3 space-y-2 text-smoke list-disc pl-5">
            <li>No user account. No password. No name. No phone.</li>
            <li>No third-party analytics, no fingerprinting library, no ad tags.</li>
            <li>No long-term retention. After expiry rows are deleted; WAL rotates.</li>
          </ul>
          <h3 className="mt-6 font-display font-bold text-ink text-lg">What about abuse?</h3>
          <p className="mt-3 text-smoke leading-relaxed">
            The service is receive-only — you cannot send mail through Fake
            Email. That single restriction shuts down the biggest abuse vector
            (using temp-mail as an open relay). For other kinds of abuse —
            using disposable addresses to evade bans, abuse trial systems,
            etc. — the website where you signed up is the right enforcement
            point, not us.
          </p>
        </section>

        <section id="try" className="mt-14 border-t border-chalk pt-10">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            10. Try it now
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            That is the whole stack. DNS, SMTP, parser, Postgres, polling,
            cleanup. Open source, free, no signup.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="h-12 px-6 bg-ink text-page font-display font-bold text-sm uppercase tracking-[0.15em] hover:bg-vermillion transition-colors flex items-center"
            >
              Generate a disposable email →
            </Link>
            <Link
              href="/docs/api"
              className="h-12 px-6 border-2 border-ink text-ink font-display font-bold text-sm uppercase tracking-[0.15em] hover:bg-ink hover:text-page transition-colors flex items-center"
            >
              Read the API docs
            </Link>
            <a
              href="https://github.com/Shivrajsoni/fake-email"
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 px-6 border-2 border-chalk text-smoke font-display font-bold text-sm uppercase tracking-[0.15em] hover:border-vermillion hover:text-vermillion transition-colors flex items-center"
            >
              GitHub
            </a>
          </div>
        </section>

        <section className="mt-16 border-t border-chalk pt-10">
          <h2 className="font-display text-xl font-bold text-ink">Keep reading</h2>
          <ul className="mt-5 space-y-3 text-smoke">
            <li>
              <Link href="/disposable-email-address" className="text-vermillion underline underline-offset-4 hover:text-ink">
                Disposable email address — concept overview
              </Link>
            </li>
            <li>
              <Link href="/docs/api" className="text-vermillion underline underline-offset-4 hover:text-ink">
                REST API reference
              </Link>
            </li>
            <li>
              <Link href="/blog" className="text-vermillion underline underline-offset-4 hover:text-ink">
                All blog posts
              </Link>
            </li>
          </ul>
        </section>

        <footer className="mt-16 border-t border-chalk pt-6 text-xs text-ash">
          <p>
            Written by{" "}
            <a
              href="https://github.com/Shivrajsoni"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vermillion underline underline-offset-4"
            >
              Shivraj Soni
            </a>
            , maintainer of{" "}
            <a
              href="https://github.com/Shivrajsoni/fake-email"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vermillion underline underline-offset-4"
            >
              the open-source backend
            </a>
            . Published {PUBLISHED}. Last verified {MODIFIED}.
          </p>
        </footer>
      </main>
    </>
  );
}
