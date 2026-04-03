import { NextResponse } from "next/server";

const WATCHER_URL = process.env.WATCHER_URL || "http://localhost:4321";

export async function GET() {
  try {
    const res = await fetch(`${WATCHER_URL}/transactions`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Watcher returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ transactions: [] });
  }
}
