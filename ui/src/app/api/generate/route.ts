import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = GenerateEmailRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid username.",
          details: validationResult.error.flatten().fieldErrors.username,
        },
        { status: 400 }
      );
    }

    const { username } = validationResult.data;

    if (!process.env.BACKEND_URL) {
      console.error("BACKEND_URL environment variable is not set.");
      return NextResponse.json(
        { error: "Server configuration error: BACKEND_URL is not set." },
        { status: 500 }
      );
    }

    // Safely construct the URL to prevent duplicate slashes or paths
    const baseUrl = process.env.BACKEND_URL.replace(/\/$/, ""); // Remove trailing slash
    const backendUrl = `${baseUrl}/api/email/generate`;

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: username || null }),
    });

    const responseText = await backendResponse.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json(
        {
          error: "Received an invalid (non-JSON) response from the backend.",
          details: responseText,
        },
        { status: backendResponse.status }
      );
    }

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.error || "An unknown error occurred from the backend." },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }
    console.error(
      "A critical error occurred in Next.js API route (/api/generate):",
      error
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
