# UI

Next.js App Router. Local dev: `http-server` on `127.0.0.1:3001`, Next rewrites `/api/*` (see `next.config.ts`). Optional `ui/.env.local`: `BACKEND_INTERNAL_URL=...`

Cross-origin (Vercel): set `NEXT_PUBLIC_API_URL` and allow that origin in backend `CORS_ALLOWED_ORIGINS`.

```bash
npm install && npm run dev
```

`npm run test` — smoke script `scripts/check-http-server.mjs` (needs Postgres + backend).
