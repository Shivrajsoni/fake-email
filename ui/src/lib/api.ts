import { z } from "zod";

const GenerateBodySchema = z.object({
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

function apiBase(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw || typeof raw !== "string") {
    throw new Error(
      "VITE_API_URL is not set. Point it at your HTTP API (e.g. http://127.0.0.1:3001)."
    );
  }
  return raw.replace(/\/$/, "");
}

function pathSegment(address: string): string {
  return encodeURIComponent(address);
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      text || "Received an invalid (non-JSON) response from the server."
    );
  }
  if (!response.ok) {
    const err = data as { error?: string };
    throw new Error(err.error ?? `Request failed (${response.status})`);
  }
  return data as T;
}

export interface GenerateMailboxResponse {
  address: string;
  created_at?: string;
  expiry_in_sec?: number;
}

export async function generateMailbox(
  username: string | null
): Promise<GenerateMailboxResponse> {
  const normalized = username?.trim() || null;
  const validation = GenerateBodySchema.safeParse({ username: normalized });
  if (!validation.success) {
    const msg =
      validation.error.flatten().fieldErrors.username?.[0] ??
      "Invalid username.";
    throw new Error(msg);
  }

  const response = await fetch(`${apiBase()}/api/email/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: validation.data.username ?? null }),
  });

  return parseJson<GenerateMailboxResponse>(response);
}

export interface EmailSummary {
  id: string;
  from_address: string;
  subject: string;
  received_at: string;
  preview: string | null;
}

export async function listEmailSummaries(
  address: string
): Promise<EmailSummary[]> {
  const response = await fetch(
    `${apiBase()}/api/email/${pathSegment(address)}/summaries`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    }
  );
  return parseJson<EmailSummary[]>(response);
}

export interface EmailDetail {
  id: string;
  from_address: string;
  subject: string;
  body_plain: string | null;
  body_html: string | null;
  received_at: string;
}

export async function getEmailDetail(
  address: string,
  emailId: string
): Promise<EmailDetail> {
  const response = await fetch(
    `${apiBase()}/api/email/${pathSegment(address)}/${emailId}`,
    { method: "GET" }
  );
  return parseJson<EmailDetail>(response);
}

export async function deleteEmail(
  address: string,
  emailId: string
): Promise<EmailDetail> {
  const response = await fetch(
    `${apiBase()}/api/email/${pathSegment(address)}/${emailId}`,
    { method: "DELETE" }
  );
  return parseJson<EmailDetail>(response);
}

export async function deleteAllEmails(
  address: string
): Promise<{ deleted_count: number }> {
  const response = await fetch(
    `${apiBase()}/api/email/${pathSegment(address)}/all`,
    { method: "DELETE" }
  );
  return parseJson<{ deleted_count: number }>(response);
}
