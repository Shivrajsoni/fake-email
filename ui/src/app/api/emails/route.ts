import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address query parameter is required." },
        { status: 400 }
      );
    }

    if (!process.env.BACKEND_URL) {
      console.error("BACKEND_URL environment variable is not set.");
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    // Safely construct the URL to prevent duplicate slashes or paths
    const baseUrl = process.env.BACKEND_URL.replace(/\/$/, ""); // Remove trailing slash
    const backendUrl = `${baseUrl}/api/email/${address}/summaries`;

    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const responseText = await backendResponse.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            responseText || "Received an invalid response from the backend.",
        },
        { status: backendResponse.status }
      );
    }

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to fetch emails from backend." },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    console.error("Error in Next.js API route (/api/emails):", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
