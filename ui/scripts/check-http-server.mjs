#!/usr/bin/env node
/**
 * Smoke-check that `http-server` matches what the UI calls (same paths as `src/lib/backend.ts`).
 * Uses Node's built-in fetch — no Vitest/Vite.
 *
 *   npm run test
 *   BACKEND_URL=http://127.0.0.1:3001 npm run test
 */

const base = (process.env.BACKEND_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function main() {
  const health = await fetch(`${base}/api/health`);
  if (!health.ok) {
    fail(
      `GET /api/health expected 200, got ${health.status}. Is http-server up at ${base}?`,
    );
  }
  const healthText = await health.text();
  if (healthText !== "OK") {
    fail(`GET /api/health body expected "OK", got ${JSON.stringify(healthText)}`);
  }
  console.log("ok  GET /api/health");

  const create = await fetch(`${base}/api/temporary-address`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: null }),
  });
  if (!create.ok) {
    fail(`POST /api/temporary-address expected 200, got ${create.status}`);
  }
  const created = await create.json();
  const addr = created.temp_email_addr;
  if (typeof addr !== "string" || !addr.includes("@")) {
    fail(`unexpected body: ${JSON.stringify(created)}`);
  }
  console.log("ok  POST /api/temporary-address");

  const pollUrl = `${base}/api/inbox/poll?${new URLSearchParams({ address: addr })}`;
  const poll = await fetch(pollUrl, { cache: "no-store" });
  if (!poll.ok) {
    fail(`GET /api/inbox/poll expected 200, got ${poll.status}`);
  }
  const inbox = await poll.json();
  if (inbox.temp_email_addr !== addr || inbox.new_mail_count !== 0) {
    fail(`unexpected poll body: ${JSON.stringify(inbox)}`);
  }
  if (!Array.isArray(inbox.messages) || inbox.messages.length !== 0) {
    fail(`expected empty messages: ${JSON.stringify(inbox)}`);
  }
  console.log("ok  GET /api/inbox/poll (empty inbox)");

  const bad = await fetch(
    `${base}/api/inbox/poll?${new URLSearchParams({ address: "missing@nowhere.test" })}`,
    { cache: "no-store" },
  );
  if (bad.status !== 404) {
    fail(`GET /api/inbox/poll unknown address expected 404, got ${bad.status}`);
  }
  console.log("ok  GET /api/inbox/poll (404 unknown address)");

  console.log("\nAll checks passed against", base);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
