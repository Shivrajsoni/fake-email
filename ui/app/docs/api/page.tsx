import type { Metadata } from "next";

const SITE_URL = "https://fake-email.site";

export const metadata: Metadata = {
  title: "API Docs – Fake Email REST API for disposable mailboxes",
  description:
    "REST API reference for Fake Email. Create temporary mailboxes and poll messages programmatically. JSON, no auth, OpenAPI spec available.",
  alternates: { canonical: "/docs/api" },
  keywords: [
    "fake email api",
    "disposable email api",
    "temp mail api",
    "openapi temp mail",
    "email verification api",
  ],
  openGraph: {
    title: "Fake Email API",
    description:
      "Programmatic disposable mailboxes. JSON in, JSON out. No auth.",
    url: `${SITE_URL}/docs/api`,
    type: "article",
  },
};

const BREADCRUMB_JSONLD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${SITE_URL}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "API Docs",
      item: `${SITE_URL}/docs/api`,
    },
  ],
};

const TECHARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Fake Email REST API",
  description:
    "Reference for the Fake Email REST API: create temporary mailboxes and poll messages.",
  inLanguage: "en-US",
  proficiencyLevel: "Beginner",
  mainEntityOfPage: `${SITE_URL}/docs/api`,
  author: {
    "@type": "Organization",
    name: "Fake Email",
    url: SITE_URL,
  },
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export default function ApiDocsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([BREADCRUMB_JSONLD, TECHARTICLE_JSONLD]),
        }}
      />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <nav aria-label="Breadcrumb" className="text-sm text-smoke mb-6">
          <ol className="flex gap-2">
            <li>
              <a href="/" className="hover:text-vermillion">
                Home
              </a>
            </li>
            <li>/</li>
            <li aria-current="page" className="text-ink font-medium">
              API Docs
            </li>
          </ol>
        </nav>

        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Fake Email API
        </h1>
        <p className="mt-4 text-smoke leading-relaxed">
          Programmatic disposable mailboxes. All endpoints return JSON, no auth
          required. Base URL: <code>https://fake-email.site</code>.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-ink">
          Discovery
        </h2>
        <ul className="mt-3 list-disc pl-5 text-smoke space-y-1">
          <li>
            OpenAPI 3.1 spec:{" "}
            <a className="text-vermillion underline" href="/openapi.json">
              /openapi.json
            </a>
          </li>
          <li>
            API catalog (RFC 9727):{" "}
            <a
              className="text-vermillion underline"
              href="/.well-known/api-catalog"
            >
              /.well-known/api-catalog
            </a>
          </li>
          <li>
            Agent skills:{" "}
            <a
              className="text-vermillion underline"
              href="/.well-known/agent-skills/index.json"
            >
              /.well-known/agent-skills/index.json
            </a>
          </li>
          <li>
            Health probe:{" "}
            <a className="text-vermillion underline" href="/api/health">
              /api/health
            </a>
          </li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-bold text-ink">
          POST /api/temporary-address
        </h2>
        <p className="mt-2 text-smoke">
          Create a temporary mailbox. Body is optional; omit <code>username</code>
          for a random one.
        </p>
        <pre className="mt-3 overflow-x-auto bg-ink text-page text-xs p-4 font-mono">
          <code>{`curl -X POST https://fake-email.site/api/temporary-address \\
  -H "Content-Type: application/json" \\
  -d '{"username":"alice"}'

# => {"temp_email_addr":"alice@fake-email.site"}`}</code>
        </pre>

        <h2 className="mt-10 font-display text-2xl font-bold text-ink">
          GET /api/inbox/poll
        </h2>
        <p className="mt-2 text-smoke">
          Poll messages delivered to a temporary mailbox.
        </p>
        <pre className="mt-3 overflow-x-auto bg-ink text-page text-xs p-4 font-mono">
          <code>{`curl "https://fake-email.site/api/inbox/poll?address=alice@fake-email.site"`}</code>
        </pre>

        <h2 className="mt-10 font-display text-2xl font-bold text-ink">
          GET /api/health
        </h2>
        <p className="mt-2 text-smoke">Liveness probe for monitoring.</p>
        <pre className="mt-3 overflow-x-auto bg-ink text-page text-xs p-4 font-mono">
          <code>{`curl https://fake-email.site/api/health`}</code>
        </pre>
      </main>
    </>
  );
}
