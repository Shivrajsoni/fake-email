export const dynamic = "force-static";

const MD = `# Inbox

This page shows messages delivered to your temporary mailbox.

The mailbox address is stored client-side in \`sessionStorage\` under the key \`temp_address\`. To use the inbox programmatically, hit the API directly instead of scraping this page.

## API

- \`GET https://fake-email.site/api/inbox/poll?address=<your-temp-address>\`

Returns a JSON object with a \`messages\` array. Each message includes the sender, subject, body, and timestamp.

## Related

- Create a mailbox: \`POST https://fake-email.site/api/temporary-address\`
- API docs: https://fake-email.site/docs/api
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
