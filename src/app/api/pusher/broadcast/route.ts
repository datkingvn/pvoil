import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
  useTLS: true,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { state } = body;

    if (!state) {
      return NextResponse.json({ error: "Missing state" }, { status: 400 });
    }

    // Broadcast state update to all clients
    await pusher.trigger("game-sync", "state-update", {
      state,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Pusher] Broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to broadcast state" },
      { status: 500 }
    );
  }
}

