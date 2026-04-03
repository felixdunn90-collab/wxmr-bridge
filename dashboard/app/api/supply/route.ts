import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";

const SOLANA_RPC = process.env.SOLANA_RPC_URL || "http://127.0.0.1:8899";
const WXMR_MINT = new PublicKey(
  process.env.WXMR_MINT || "4WzLuLAL6vjnPRfgNYMVeUGvsLGbE1qTDzDCpooXc3Zb"
);

export async function GET() {
  try {
    const connection = new Connection(SOLANA_RPC, "confirmed");
    const mint = await getMint(connection, WXMR_MINT);

    const supply = Number(mint.supply);
    const supplyXmr = (supply / 1e12).toFixed(12);

    return NextResponse.json({
      supply,
      supplyXmr,
      decimals: mint.decimals,
      mintAuthority: mint.mintAuthority?.toBase58() ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch wXMR supply" }, { status: 500 });
  }
}
