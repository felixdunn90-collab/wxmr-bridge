import { NextResponse } from "next/server";

const WATCHER_URL = process.env.WATCHER_URL || "http://localhost:4321";

export async function GET() {
  try {
    const res = await fetch(`${WATCHER_URL}/balance`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Watcher returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Fallback: return zeros if watcher is not available
    return NextResponse.json({
      balance: "0",
      unlocked: "0",
      balanceXmr: "0.000000000000",
      unlockedXmr: "0.000000000000",
      note: "Watcher not running",
    });
  }
}
