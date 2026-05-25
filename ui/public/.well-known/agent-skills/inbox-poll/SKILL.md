---
name: inbox-poll
description: Poll a disposable mailbox on fake-email.site for newly received email messages.
type: skill
version: 1.0.0
---

# Inbox Poll

Read messages delivered to a disposable mailbox previously created via the `temp-mailbox` skill.

## Endpoint

`GET https://fake-email.site/api/inbox/poll`

### Query parameters

- `address` (string, required): the temporary email address returned by `POST /api/temporary-address`.

### Response

```json
{
  "messages": [
    {
      "from": "noreply@example.com",
      "subject": "Verify your email",
      "body": "Your code is 123456",
      "received_at": "2026-05-25T10:00:00Z"
    }
  ]
}
```

## Example

```bash
curl "https://fake-email.site/api/inbox/poll?address=alice@fake-email.site"
```

## Notes

- Poll periodically; do not hammer the endpoint. A 2–5 second interval is reasonable.
- Messages may disappear when the mailbox expires.
