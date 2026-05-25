import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb, breadcrumbJsonLd } from "@/components/Breadcrumb";

const SITE_URL = "https://fake-email.site";
const PATH = "/blog";

export const metadata: Metadata = {
  title: "Blog — Disposable Email, Privacy & Dev Notes | Fake Email",
  description:
    "How disposable email works, privacy guides, QA automation patterns, and engineering notes from the team building an open-source temp-mail service.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Fake Email Blog",
    description:
      "Disposable email guides, privacy notes, and engineering posts from the team.",
    url: `${SITE_URL}${PATH}`,
    type: "website",
  },
};

export const POSTS: ReadonlyArray<{
  slug: string;
  title: string;
  description: string;
  date: string;
  tag: string;
}> = [
  {
    slug: "deploying-rust-with-nix-github-actions-scp",
    title:
      "Deploying a Rust service with Nix, GitHub Actions, and SCP — the full guide",
    description:
      "Nix flake with Crane for local reproducibility, plain cargo on Ubuntu in CI for the deploy binary, scp + ssh to ship, systemd to run. Every file, every gotcha.",
    date: "2026-05-25",
    tag: "Engineering",
  },
  {
    slug: "how-disposable-email-works",
    title: "How disposable email works — a full technical walkthrough",
    description:
      "From DNS MX records to Rust SMTP servers to real-time polling. The complete pipeline behind a disposable inbox, explained step by step.",
    date: "2026-05-25",
    tag: "Engineering",
  },
];

const BREADCRUMB_JSONLD = breadcrumbJsonLd([
  { name: "Home", href: "/" },
  { name: "Blog", href: PATH },
]);

const BLOG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": `${SITE_URL}${PATH}#blog`,
  name: "Fake Email Blog",
  url: `${SITE_URL}${PATH}`,
  publisher: { "@id": `${SITE_URL}/#organization` },
  blogPost: POSTS.map((p) => ({
    "@type": "BlogPosting",
    headline: p.title,
    url: `${SITE_URL}${PATH}/${p.slug}`,
    datePublished: p.date,
  })),
};

export default function BlogIndexPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([BREADCRUMB_JSONLD, BLOG_JSONLD]),
        }}
      />
      <main className="mx-auto max-w-3xl px-6 sm:px-12 lg:px-20 py-12 sm:py-16">
        <Breadcrumb crumbs={[{ name: "Home", href: "/" }, { name: "Blog" }]} />

        <header className="mt-8">
          <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
            Notes
          </span>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink leading-[1.05]">
            Blog
          </h1>
          <p className="mt-5 text-smoke leading-relaxed text-lg">
            Disposable-email explainers, privacy notes, and engineering posts from
            the team building an open-source temp-mail service in Rust.
          </p>
        </header>

        <ul className="mt-12 space-y-10">
          {POSTS.map((p) => (
            <li key={p.slug} className="border-l-2 border-vermillion pl-6">
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono uppercase tracking-widest text-smoke">
                <time dateTime={p.date}>{p.date}</time>
                <span className="text-chalk">·</span>
                <span className="text-vermillion">{p.tag}</span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
                <Link href={`${PATH}/${p.slug}`} className="hover:text-vermillion transition-colors">
                  {p.title}
                </Link>
              </h2>
              <p className="mt-3 text-smoke leading-relaxed">{p.description}</p>
              <Link
                href={`${PATH}/${p.slug}`}
                className="mt-3 inline-block text-sm font-bold uppercase tracking-widest text-vermillion hover:text-ink transition-colors"
              >
                Read post →
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
