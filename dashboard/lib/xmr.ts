import moneroTs from "monero-ts";
import { saveMapping, getExistingSubaddress } from "./db";

const WALLET_PATH = process.env.XMR_WALLET_PATH || `${process.env.HOME}/wxmr-reserve-stagenet`;
const WALLET_PASSWORD = process.env.XMR_WALLET_PASSWORD || "";
const DAEMON_URI = process.env.XMR_DAEMON_URI || "http://node3.monerodevs.org:38089";

let walletInstance: moneroTs.MoneroWalletFull | null = null;

export async function getWallet(): Promise<moneroTs.MoneroWalletFull> {
  if (walletInstance) return walletInstance;

  walletInstance = await moneroTs.openWalletFull({
    path: WALLET_PATH,
    password: WALLET_PASSWORD,
    networkType: moneroTs.MoneroNetworkType.STAGENET,
    server: DAEMON_URI,
  });

  console.log("[XMR] Wallet opened:", await walletInstance.getPrimaryAddress());
  await walletInstance.startSyncing(10000);
  return walletInstance;
}

export async function getBalance() {
  const wallet = await getWallet();
  const balance = await wallet.getBalance();
  const unlocked = await wallet.getUnlockedBalance();

  return {
    balance: balance.toString(),
    unlocked: unlocked.toString(),
    balanceXmr: (Number(balance) / 1e12).toFixed(12),
    unlockedXmr: (Number(unlocked) / 1e12).toFixed(12),
  };
}

export async function createSubaddress(solanaPubkey: string): Promise<string> {
  const existing = getExistingSubaddress(solanaPubkey);
  if (existing) return existing;

  const wallet = await getWallet();
  const subaddress = await wallet.createSubaddress(0, solanaPubkey);
  const address = subaddress.getAddress()!;
  const index = subaddress.getIndex()!;

  saveMapping(address, solanaPubkey, 0, index);
  console.log(`[XMR] Subaddress created: ${address} -> ${solanaPubkey}`);
  return address;
}

export async function transfer(amount: bigint, address: string): Promise<string> {
  const wallet = await getWallet();

  const tx = await wallet.createTx({
    accountIndex: 0,
    address,
    amount,
    relay: true,
  });

  const hash = tx.getHash()!;
  console.log(`[XMR] Transfer sent. TX: ${hash}`);
  return hash;
}

export async function watchDeposits(
  onDeposit: (txHash: string, amount: bigint, subaddress: string) => Promise<void>
) {
  const wallet = await getWallet();

  await wallet.addListener(new class extends moneroTs.MoneroWalletListener {
    async onOutputReceived(output: moneroTs.MoneroOutputWallet) {
      const tx = output.getTx();
      if (!tx?.getIsConfirmed()) return;
      if ((tx.getNumConfirmations() ?? 0) < 10) return;

      const txHash = tx.getHash()!;
      const amount = output.getAmount()!;
      const subaddressIndex = output.getSubaddressIndex()!;
      const subaddressInfo = await wallet.getSubaddress(0, subaddressIndex);
      const subaddress = subaddressInfo.getAddress()!;

      try {
        await onDeposit(txHash, amount, subaddress);
      } catch (e) {
        console.error(`[XMR] onDeposit error for ${txHash}:`, e);
      }
    }
  });

  console.log("[XMR] Watching for deposits...");
}