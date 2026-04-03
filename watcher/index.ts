import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import * as fs from "fs";
import * as http from "http";
import { getWallet, getBalance, createSubaddress, transfer, watchDeposits } from "../lib/xmr";
import { getSolanaKey } from "../lib/db";

const WXMR_MINT = new PublicKey("4WzLuLAL6vjnPRfgNYMVeUGvsLGbE1qTDzDCpooXc3Zb");
const PROGRAM_ID = new PublicKey("CHhFsbCVnsVvFCH1cQ43zfJKbXhKGF81EG5q9f97gBaS");
const SOLANA_RPC = "http://127.0.0.1:8899";
const HTTP_PORT = parseInt(process.env.WATCHER_PORT || "4321");

const keypairPath = process.env.SOLANA_KEYPAIR || `${process.env.HOME}/.config/solana/id.json`;
const rawKeypair = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
const authority = Keypair.fromSecretKey(Uint8Array.from(rawKeypair));

const processed = new Set<string>();

async function mintWxmr(
  program: anchor.Program,
  provider: anchor.AnchorProvider,
  recipientPubkey: PublicKey,
  amount: bigint,
  txHash: string
) {
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    authority,
    WXMR_MINT,
    recipientPubkey
  );

  const hashBytes = Buffer.alloc(32);
  Buffer.from(txHash.slice(0, 64), "hex").copy(hashBytes);

  await program.methods
    .mintWxmr(new anchor.BN(amount.toString()), Array.from(hashBytes))
    .accounts({
      mint: WXMR_MINT,
      recipientTokenAccount: tokenAccount.address,
      authority: authority.publicKey,
    })
    .signers([authority])
    .rpc();

  console.log(`[MINT] ${amount} piconero -> ${recipientPubkey.toBase58()}`);
}

async function watchBurns(program: anchor.Program) {
  program.addEventListener("burnEvent", async (event: any) => {
    const xmrAddress = Buffer.from(event.xmrAddress)
      .toString("utf-8")
      .replace(/\0/g, "")
      .trim();

    const amount = BigInt(event.amount.toString());
    console.log(`[BURN] ${amount} piconero -> ${xmrAddress}`);

    try {
      await transfer(amount, xmrAddress);
    } catch (e) {
      console.error(`[ERROR] Failed to release XMR:`, e);
    }
  });

  console.log("[INFO] Watching for wXMR burn events...");
}

async function main() {
  const connection = new Connection(SOLANA_RPC, "confirmed");
  const wallet = new anchor.Wallet(authority);
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync("../target/idl/wxmr_bridge.json", "utf-8"));
  const program = new anchor.Program(idl, provider);

  console.log(`[INFO] Authority: ${authority.publicKey.toBase58()}`);
  console.log(`[INFO] Mint: ${WXMR_MINT.toBase58()}`);
  console.log(`[INFO] Program: ${PROGRAM_ID.toBase58()}`);

  // Initialise XMR wallet
  await getWallet();

  await watchBurns(program);

  await watchDeposits(async (txHash, amount, subaddress) => {
    if (processed.has(txHash)) return;

    const solanaPubkey = getSolanaKey(subaddress);
    if (!solanaPubkey) {
      console.log(`[SKIP] ${txHash.slice(0, 8)}... no subaddress mapping`);
      processed.add(txHash);
      return;
    }

    await mintWxmr(program, provider, new PublicKey(solanaPubkey), amount, txHash);
    processed.add(txHash);
  });

  console.log("[INFO] Watcher running...");

  // HTTP server for dashboard API
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, `http://localhost:${HTTP_PORT}`);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
      if (req.method === "GET" && url.pathname === "/balance") {
        const balance = await getBalance();
        res.writeHead(200);
        res.end(JSON.stringify(balance));
        return;
      }

      if (req.method === "POST" && url.pathname === "/subaddress") {
        let body = "";
        req.on("data", (chunk: Buffer) => { body += chunk; });
        await new Promise<void>((resolve) => req.on("end", () => resolve()));
        const { solanaPubkey } = JSON.parse(body);
        const subaddress = await createSubaddress(solanaPubkey);
        res.writeHead(200);
        res.end(JSON.stringify({ subaddress }));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
    } catch (e: any) {
      console.error(`[HTTP] ${req.method} ${url.pathname} error:`, e.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });

  server.listen(HTTP_PORT, () => {
    console.log(`[HTTP] API server on http://localhost:${HTTP_PORT}`);
  });
}

main().catch(console.error);