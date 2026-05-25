import { NextResponse, type NextRequest } from "next/server";

const MD_ROUTE_MAP: Record<string, string> = {
  "/": "/agent-md/home",
  "/emails": "/agent-md/emails",
  "/docs/api": "/agent-md/docs-api",
};

function wantsMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  const lower = accept.toLowerCase();
  if (!lower.includes("text/markdown")) return false;
  if (lower.includes("text/html")) {
    const html = parseQ(lower, "text/html");
    const md = parseQ(lower, "text/markdown");
    return md >= html;
  }
  return true;
}

function parseQ(accept: string, mime: string): number {
  const idx = accept.indexOf(mime);
  if (idx < 0) return 0;
  const tail = accept.slice(idx + mime.length);
  const m = tail.match(/^\s*;\s*q=([0-9.]+)/);
  return m ? parseFloat(m[1]) : 1;
}

export function proxy(req: NextRequest) {
  const target = MD_ROUTE_MAP[req.nextUrl.pathname];
  if (!target) return NextResponse.next();
  if (!wantsMarkdown(req.headers.get("accept"))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = target;
  const res = NextResponse.rewrite(url);
  res.headers.set("Vary", "Accept");
  return res;
}

export const config = {
  matcher: ["/", "/emails", "/docs/api"],
};
