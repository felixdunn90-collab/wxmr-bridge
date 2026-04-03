import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WxmrBridge } from "../target/types/wxmr_bridge";
import { PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

const MINT = new PublicKey("4WzLuLAL6vjnPRfgNYMVeUGvsLGbE1qTDzDCpooXc3Zb");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WxmrBridge as Program<WxmrBridge>;

  // Create a token account for the recipient (ourselves for testing)
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    (provider.wallet as anchor.Wallet).payer,
    MINT,
    provider.wallet.publicKey
  );

  // Fake XMR tx hash for testing
  const xmrTxHash = Buffer.alloc(32, 1);

  const tx = await program.methods
    .mintWxmr(new anchor.BN(1_000_000_000_000), Array.from(xmrTxHash))
    .accounts({
      mint: MINT,
      recipientTokenAccount: tokenAccount.address,
      authority: provider.wallet.publicKey,
    })
    .rpc();

  console.log("Minted tx:", tx);
}

main().catch(console.error);