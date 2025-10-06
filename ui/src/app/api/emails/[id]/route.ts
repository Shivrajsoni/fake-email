import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// The backend API requires both the temporary address and the email ID.
// We'll pass the address as a query parameter to this Next.js route.
// e.g., GET /api/emails/some-uuid?address=user@example.com

// GET /api/emails/[id] - Fetches a single email by its ID
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const address = request.nextUrl.searchParams.get("address");

  if (!id || !address) {
    return NextResponse.json(
      { error: "Email ID and temporary address are required." },
      { status: 400 }
    );
  }

  try {
    const backendUrl = `http://127.0.0.1:3001/api/email/${address}/${id}`;
    const backendResponse = await fetch(backendUrl);
    const responseText = await backendResponse.text();

    if (!backendResponse.ok) {
      try {
        const errorJson = JSON.parse(responseText);
        return NextResponse.json(
          { error: errorJson.error || "Failed to fetch email." },
          { status: backendResponse.status }
        );
      } catch (e) {
        return NextResponse.json(
          { error: responseText },
          { status: backendResponse.status }
        );
      }
    }

    const email = JSON.parse(responseText);
    return NextResponse.json(email);
  } catch (error) {
    console.error("Error fetching email:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// DELETE /api/emails/[id] - Deletes a single email by its ID
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const address = request.nextUrl.searchParams.get("address");

  if (!id || !address) {
    return NextResponse.json(
      { error: "Email ID and temporary address are required." },
      { status: 400 }
    );
  }

  try {
    const backendUrl = `http://127.0.0.1:3001/api/email/${address}/${id}`;
    const backendResponse = await fetch(backendUrl, { method: "DELETE" });
    const responseText = await backendResponse.text();

    if (!backendResponse.ok) {
      try {
        const errorJson = JSON.parse(responseText);
        return NextResponse.json(
          { error: errorJson.error || "Failed to delete email." },
          { status: backendResponse.status }
        );
      } catch (e) {
        return NextResponse.json(
          { error: responseText },
          { status: backendResponse.status }
        );
      }
    }

    const deletedEmail = JSON.parse(responseText);
    return NextResponse.json(deletedEmail);
  } catch (error) {
    console.error("Error deleting email:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
