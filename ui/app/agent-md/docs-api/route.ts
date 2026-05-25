export const dynamic = "force-static";

const MD = `# Fake Email API

Programmatic disposable mailboxes. JSON in, JSON out. No auth.

Base URL: \`https://fake-email.site\`

## Endpoints

### \`POST /api/temporary-address\`

Create a temporary mailbox.

Request body (optional):

\`\`\`json
{ "username": "alice" }
\`\`\`

Response:

\`\`\`json
{ "temp_email_addr": "alice@fake-email.site" }
\`\`\`

### \`GET /api/inbox/poll\`

Poll a mailbox for messages.

Query: \`address=<email>\` (required)

Response: \`{ "messages": [...] }\`

### \`GET /api/health\`

Liveness probe.

## Discovery

- OpenAPI: \`/openapi.json\`
- API catalog (RFC 9727): \`/.well-known/api-catalog\`
- Agent skills (Agent Skills Discovery v0.2.0): \`/.well-known/agent-skills/index.json\`
`;

export function GET() {
  return new Response(MD, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "x-markdown-tokens": String(Math.ceil(MD.length / 4)),
      "Cache-Control": "public, max-age=300",
      Vary: "Accept",
    },
  });
}
