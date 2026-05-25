import { NextResponse } from "next/server";

export const dynamic = "force-static";

const SITE = "https://fake-email.site";

export function GET() {
  const body = {
    linkset: [
      {
        anchor: `${SITE}/api`,
        "service-desc": [
          {
            href: `${SITE}/openapi.json`,
            type: "application/vnd.oai.openapi+json",
          },
        ],
        "service-doc": [
          {
            href: `${SITE}/docs/api`,
            type: "text/html",
          },
        ],
        status: [
          {
            href: `${SITE}/api/health`,
            type: "application/json",
          },
        ],
        author: [
          {
            href: `${SITE}/`,
          },
        ],
      },
    ],
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/linkset+json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
