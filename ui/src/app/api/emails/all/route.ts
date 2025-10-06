import { NextRequest, NextResponse } from "next/server";

// DELETE /api/emails/all?address=user@example.com
export async function DELETE(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Temporary address is required." },
      { status: 400 }
    );
  }

  try {
    const backendUrl = `http://127.0.0.1:3001/api/email/${address}/all`;
    const backendResponse = await fetch(backendUrl, {
      method: "DELETE",
    });

    const responseText = await backendResponse.text();

    if (!backendResponse.ok) {
      try {
        const errorJson = JSON.parse(responseText);
        return NextResponse.json(
          { error: errorJson.error || "Failed to delete emails." },
          { status: backendResponse.status }
        );
      } catch (e) {
        // The error response from backend was not JSON
        return NextResponse.json(
          { error: responseText },
          { status: backendResponse.status }
        );
      }
    }

    const data = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting all emails:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
