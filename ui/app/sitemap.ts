import { MetadataRoute } from "next";

const SITE_URL = "https://fake-email.site";
const lastModified = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/docs/api`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
