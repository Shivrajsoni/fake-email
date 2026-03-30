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

export function getBackendBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw == null || raw === "") {
    console.warn(
      "VITE_API_URL is unset; defaulting to http://127.0.0.1:3001. Set it in .env for production.",
    );
    return "http://127.0.0.1:3001";
  }
  return String(raw).replace(/\/$/, "");
}

export async function generateMailbox(body: unknown): Promise<{ address?: string }> {
  const validationResult = GenerateEmailRequestSchema.safeParse(body);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors.username;
    const msg = fieldErrors?.join(", ") || "Invalid username.";
    throw new Error(msg);
  }

  const { username } = validationResult.data;
  const baseUrl = getBackendBaseUrl();
  const backendResponse = await fetch(`${baseUrl}/api/email/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username ?? null }),
  });

  const responseText = await backendResponse.text();
  let data: { address?: string; error?: string };
  try {
    data = JSON.parse(responseText) as { address?: string; error?: string };
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

export async function fetchEmailSummaries(address: string): Promise<unknown> {
  const baseUrl = getBackendBaseUrl();
  const backendUrl = `${baseUrl}/api/email/${encodeURIComponent(address)}/summaries`;
  const backendResponse = await fetch(backendUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const responseText = await backendResponse.text();
  let data: { error?: string };
  try {
    data = JSON.parse(responseText) as { error?: string };
  } catch {
    throw new Error(
      responseText || "Received an invalid response from the backend.",
    );
  }
  if (!backendResponse.ok) {
    throw new Error(data.error || "Failed to fetch emails from backend.");
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

export async function fetchEmailDetail(
  address: string,
  id: string,
): Promise<unknown> {
  const baseUrl = getBackendBaseUrl();
  const backendUrl = `${baseUrl}/api/email/${encodeURIComponent(address)}/${encodeURIComponent(id)}`;
  const backendResponse = await fetch(backendUrl);
  const responseText = await backendResponse.text();
  if (!backendResponse.ok) {
    throw new Error(backendErrorMessage(responseText, "Failed to fetch email."));
  }
  return JSON.parse(responseText) as unknown;
}

export async function deleteEmail(address: string, id: string): Promise<unknown> {
  const baseUrl = getBackendBaseUrl();
  const backendUrl = `${baseUrl}/api/email/${encodeURIComponent(address)}/${encodeURIComponent(id)}`;
  const backendResponse = await fetch(backendUrl, { method: "DELETE" });
  const responseText = await backendResponse.text();
  if (!backendResponse.ok) {
    throw new Error(backendErrorMessage(responseText, "Failed to delete email."));
  }
  return JSON.parse(responseText) as unknown;
}

export async function deleteAllEmails(address: string): Promise<{
  deleted_count?: number;
}> {
  const baseUrl = getBackendBaseUrl();
  const backendUrl = `${baseUrl}/api/email/${encodeURIComponent(address)}/all`;
  const backendResponse = await fetch(backendUrl, { method: "DELETE" });
  const responseText = await backendResponse.text();
  if (!backendResponse.ok) {
    throw new Error(backendErrorMessage(responseText, "Failed to delete emails."));
  }
  return JSON.parse(responseText) as { deleted_count?: number };
}
