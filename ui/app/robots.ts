import { MetadataRoute } from "next";

const SITE_URL = "https://fake-email.site";

const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "DuckAssistBot",
  "Meta-ExternalAgent",
  "MistralAI-User",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/docs/",
          "/openapi.json",
          "/manifest.json",
          "/.well-known/",
        ],
        disallow: ["/api/", "/emails", "/agent-md/"],
      },
      ...AI_BOTS.map((ua) => ({
        userAgent: ua,
        allow: [
          "/",
          "/docs/",
          "/openapi.json",
          "/.well-known/",
        ],
        disallow: ["/api/", "/emails", "/agent-md/"],
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
