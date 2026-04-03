import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WxmrBridge } from "../target/types/wxmr_bridge";
import { PublicKey } from "@solana/web3.js";

const MINT = new PublicKey("4WzLuLAL6vjnPRfgNYMVeUGvsLGbE1qTDzDCpooXc3Zb");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WxmrBridge as Program<WxmrBridge>;

  const [bridgeState] = PublicKey.findProgramAddressSync(
    [Buffer.from("bridge_state")],
    program.programId
  );

  const tx = await program.methods
  .initialize(provider.wallet.publicKey)
  .accounts({
    mint: MINT,
    payer: provider.wallet.publicKey,
  })
  .rpc();

  console.log("Bridge initialized:", tx);
  console.log("Bridge state PDA:", bridgeState.toBase58());
}

main().catch(console.error);