import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/webhooks/suno
 * Receives async callbacks from kie.ai when a generation task completes.
 * We primarily use polling for status, but kie.ai requires a callBackUrl.
 * This endpoint logs the event and returns 200 so kie.ai doesn't retry.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log for debugging (visible in Vercel function logs)
    const { code, data } = body ?? {};
    if (code === 200 && data) {
      console.log("[suno-webhook] Task complete:", {
        taskId: data.taskId,
        status: data.status,
        tracks: data.data?.length ?? 0,
      });
    } else {
      console.log("[suno-webhook] Received:", JSON.stringify(body).slice(0, 300));
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    // Always return 200 to prevent kie.ai retries
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
