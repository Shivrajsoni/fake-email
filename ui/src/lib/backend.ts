import { z } from "zod";

const GenerateEmailRequestSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long." })
    .max(20, { message: "Username must be no more than 20 characters long." })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Username can only contain letters, numbers, and underscores.",
    })
    .optional()
    .nullable(),
});

/**
 * Base URL for API calls from the browser.
 * - Empty string: same-origin `/api/*` (Next.js rewrites to http-server — no CORS).
 * - Set `NEXT_PUBLIC_API_URL` only when the UI and API are on different hosts and the API sends CORS headers.
 */
export function getBackendBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw == null || raw === "") {
    return "";
  }
  return String(raw).replace(/\/$/, "");
}

export interface ReceivedEmail {
  id: string;
  from_addr: string;
  to_addr: string;
  subject: string;
  body_text: string | null;
  received_at: string;
}

export interface InboxPollResponse {
  temp_email_addr: string;
  new_mail_count: number;
  next_since: string | null;
  messages: ReceivedEmail[];
}

export async function generateMailbox(
  body: unknown,
): Promise<{ temp_email_addr?: string }> {
  const validationResult = GenerateEmailRequestSchema.safeParse(body);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors.username;
    const msg = fieldErrors?.join(", ") || "Invalid username.";
    throw new Error(msg);
  }

  const { username } = validationResult.data;
  const baseUrl = getBackendBaseUrl();
  const backendResponse = await fetch(`${baseUrl}/api/temporary-address`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username ?? null }),
  });

  const responseText = await backendResponse.text();
  let data: { temp_email_addr?: string; error?: string };
  try {
    data = JSON.parse(responseText) as {
      temp_email_addr?: string;
      error?: string;
    };
  } catch {
    throw new Error(
      responseText || "Received an invalid (non-JSON) response from the backend.",
    );
  }

  if (!backendResponse.ok) {
    throw new Error(data.error || "An unknown error occurred from the backend.");
  }

  return data;
}

function backendErrorMessage(responseText: string, fallback: string): string {
  try {
    const j = JSON.parse(responseText) as { error?: string };
    return j.error || responseText || fallback;
  } catch {
    return responseText || fallback;
  }
}

export async function pollInbox(
  address: string,
  since: string | null,
): Promise<InboxPollResponse> {
  const baseUrl = getBackendBaseUrl();
  const params = new URLSearchParams({ address });
  if (since) {
    params.set("since", since);
  }
  const backendUrl = baseUrl
    ? `${baseUrl}/api/inbox/poll?${params}`
    : `/api/inbox/poll?${params}`;
  const backendResponse = await fetch(backendUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const responseText = await backendResponse.text();
  let data: InboxPollResponse | { error?: string };
  try {
    data = JSON.parse(responseText) as InboxPollResponse | { error?: string };
  } catch {
    throw new Error(
      responseText || "Received an invalid response from the backend.",
    );
  }
  if (!backendResponse.ok) {
    throw new Error(
      backendErrorMessage(responseText, "Failed to fetch emails from backend."),
    );
  }
  return data as InboxPollResponse;
}
