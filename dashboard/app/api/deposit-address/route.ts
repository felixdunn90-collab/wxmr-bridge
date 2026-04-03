import { NextRequest, NextResponse } from "next/server";

const WATCHER_URL = process.env.WATCHER_URL || "http://localhost:4321";

export async function POST(req: NextRequest) {
  try {
    const { solanaPubkey } = await req.json();
    if (!solanaPubkey || solanaPubkey.length < 32 || solanaPubkey.length > 44) {
      return NextResponse.json({ error: "Invalid Solana pubkey" }, { status: 400 });
    }

    const res = await fetch(`${WATCHER_URL}/subaddress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solanaPubkey }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      return NextResponse.json(
        { error: err?.error || "Failed to generate deposit address" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Watcher not running. Start the watcher first." },
      { status: 503 }
    );
  }
}
