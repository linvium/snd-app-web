import { NextResponse } from "next/server";
import { createSession } from "@/lib/kyc";
import { getCurrentUserId } from "@/lib/auth";

export async function POST() {
  const workflowId = process.env.DIDIT_WORKFLOW_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!workflowId || !appUrl) {
    console.error("DIDIT_WORKFLOW_ID or NEXT_PUBLIC_APP_URL is not set");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  // vendor_data comes from the server-side session, never from the request
  // body — otherwise a caller could kick off someone else's verification.
  const vendorData = await getCurrentUserId();

  try {
    const session = await createSession({
      workflow_id: workflowId,
      vendor_data: vendorData,
      callback: `${appUrl}/kyc/done`,
      language: "sr",
    });

    // session_token is a secret capability token — never return it, only the url.
    return NextResponse.json({
      url: session.url,
      sessionId: session.session_id,
      status: session.status,
    });
  } catch (err) {
    console.error("Failed to create Didit session:", err);
    return NextResponse.json({ error: "could not start verification" }, { status: 502 });
  }
}
