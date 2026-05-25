import type { NextConfig } from "next";

/** Upstream http-server (server-side only; browser calls same-origin /api/*). */
const backendInternalUrl =
  process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:3001";

const AGENT_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</.well-known/agent-skills/index.json>; rel="agent-skills"; type="application/json"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</docs/api>; rel="service-doc"; type="text/html"',
  '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '</api/health>; rel="status"; type="application/json"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
].join(", ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendInternalUrl.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/",
        headers: [
          { key: "Link", value: AGENT_LINK_HEADER },
          { key: "Vary", value: "Accept" },
        ],
      },
      {
        source: "/emails",
        headers: [
          { key: "Link", value: AGENT_LINK_HEADER },
          { key: "Vary", value: "Accept" },
        ],
      },
      {
        source: "/docs/api",
        headers: [
          { key: "Link", value: AGENT_LINK_HEADER },
          { key: "Vary", value: "Accept" },
        ],
      },
      {
        source: "/llms.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        source: "/openapi.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/vnd.oai.openapi+json; charset=utf-8",
          },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        source: "/.well-known/api-catalog",
        headers: [
          {
            key: "Content-Type",
            value: "application/linkset+json; charset=utf-8",
          },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
      {
        source: "/.well-known/agent-skills/index.json",
        headers: [
          { key: "Content-Type", value: "application/json; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
    ];
  },
};

export default nextConfig;
