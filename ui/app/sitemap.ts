import { MetadataRoute } from "next";

const SITE_URL = "https://fake-email.site";
const lastModified = new Date();

type Entry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

const PAGES: Entry[] = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/disposable-email-address", changeFrequency: "weekly", priority: 0.9 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/blog/how-disposable-email-works", changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/deploying-rust-with-nix-github-actions-scp", changeFrequency: "monthly", priority: 0.8 },
  { path: "/docs/api", changeFrequency: "monthly", priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
