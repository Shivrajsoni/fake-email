---
name: temp-mailbox
description: Create a disposable email inbox on fake-email.site for verification and signup flows.
type: skill
version: 1.0.0
---

# Temp Mailbox

Create a disposable, anonymous email address on `fake-email.site`. Useful for one-time verification codes, signup flows, and developer testing where a persistent inbox is not required.

## Endpoint

`POST https://fake-email.site/api/temporary-address`

### Request

Content-Type: `application/json`

```json
{
  "username": "alice"
}
```

- `username` (string, optional): preferred local-part. Omit or pass `null` for a random one.

### Response

```json
{
  "temp_email_addr": "alice@fake-email.site"
}
```

## Example

```bash
curl -X POST https://fake-email.site/api/temporary-address \
  -H "Content-Type: application/json" \
  -d '{"username":"alice"}'
```

## Notes

- No authentication required.
- Mailboxes auto-expire; treat them as ephemeral.
- Follow up with the `inbox-poll` skill to read incoming messages.
