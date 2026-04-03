import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WxmrBridge } from "../target/types/wxmr_bridge";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const MINT = new PublicKey("4WzLuLAL6vjnPRfgNYMVeUGvsLGbE1qTDzDCpooXc3Zb");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WxmrBridge as Program<WxmrBridge>;

  const userTokenAccount = getAssociatedTokenAddressSync(
    MINT,
    provider.wallet.publicKey
  );

  // Monero address as bytes (padded to 97)
  const xmrAddress = Buffer.alloc(97);
  Buffer.from("44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3QZnADm2Sq").copy(xmrAddress);

  const tx = await program.methods
    .burnWxmr(new anchor.BN(1_000_000_000_000), Array.from(xmrAddress))
    .accounts({
      mint: MINT,
      userTokenAccount,
      user: provider.wallet.publicKey,
    })
    .rpc();

  console.log("Burn tx:", tx);
}

main().catch(console.error);