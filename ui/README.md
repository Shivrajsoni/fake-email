# UI

This UI is a [Next.js](https://nextjs.org) App Router frontend for the fake-email backend.

## Getting Started

By default the UI calls **`/api/...` on the same origin** (e.g. `http://localhost:3000`). Next.js **rewrites** those requests to `http-server` (see [`next.config.ts`](next.config.ts)), so the browser never cross-origin fetches and **CORS is not required** for local dev.

Optional `ui/.env.local`:

```bash
# Only if http-server is not on 127.0.0.1:3001 (same machine default)
BACKEND_INTERNAL_URL=http://127.0.0.1:3001
```

Only set `NEXT_PUBLIC_API_URL` when the UI is hosted separately from Next’s rewrite (cross-origin); then the Rust API must allow that origin in `CORS_ALLOWED_ORIGINS`.

Ensure `http-server` is running. If you bypass the proxy and call the API directly from the browser, `CORS_ALLOWED_ORIGINS` must include `http://localhost:3000`.

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

Routes live under the App Router at the project root:

- [`app/page.tsx`](app/page.tsx) → `/` (generate a temporary mailbox)
- [`app/emails/page.tsx`](app/emails/page.tsx) → `/emails` (poll inbox and view messages)

Screen components stay in [`src/screens/`](src/screens/).

## Smoke check (UI ↔ `http-server`)

[`scripts/check-http-server.mjs`](scripts/check-http-server.mjs) hits the same HTTP paths the app uses (`/api/health`, `/api/temporary-address`, `/api/inbox/poll`). It is plain Node (`fetch`), not a separate bundler or test framework.

With Postgres and `http-server` running:

```bash
npm run test
# BACKEND_URL=http://127.0.0.1:3001 npm run test
```

## Styling (Tailwind v4 + Next.js)

- **PostCSS**: [`postcss.config.mjs`](postcss.config.mjs) uses [`@tailwindcss/postcss`](https://tailwindcss.com/docs/installation/framework-guides/nextjs) so `@import "tailwindcss"` and utilities work like the old Vite `@tailwindcss/vite` setup.
- **Sources**: [`src/globals.css`](src/globals.css) declares `@source` for `app/` and `src/` so class names in those trees are always generated.
- **Theme**: `<html>` is `className="dark"` in [`app/layout.tsx`](app/layout.tsx) so `dark:` utilities and CSS variables match the previous dark UI; body uses `font-sans`, `antialiased`, and `min-h-dvh` from the global base layer.
- **Fonts**: [Inter](https://fonts.google.com/specimen/Inter) is loaded via `next/font/google` and wired through `--font-app-sans` into the Tailwind `@theme` font stack.

## Learn More

To learn more about Next.js:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - interactive tutorial.
