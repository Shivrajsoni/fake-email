export const dynamic = "force-static";

const MD = `# Fake Email — Disposable & Anonymous Inboxes

Generate a temporary email address in seconds. No signup. No tracking. Built for developers.

## What it does

- Create a disposable mailbox via the homepage form or the API.
- Receive incoming email at that address.
- Inbox auto-expires; nothing persists.

## Use it from an agent

1. \`POST https://fake-email.site/api/temporary-address\` — create a mailbox.
2. \`GET  https://fake-email.site/api/inbox/poll?address=<addr>\` — poll for messages.

See the API catalog at \`/.well-known/api-catalog\` and the agent skills at \`/.well-known/agent-skills/index.json\`.

## Links

- Web UI: https://fake-email.site/
- API docs: https://fake-email.site/docs/api
- OpenAPI: https://fake-email.site/openapi.json
- Health: https://fake-email.site/api/health
`;

export function GET() {
  return new Response(MD, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "x-markdown-tokens": String(estimateTokens(MD)),
      "Cache-Control": "public, max-age=300",
      Vary: "Accept",
    },
  });
}

function estimateTokens(s: string): number {
  return Math.ceil(s.length / 4);
}
