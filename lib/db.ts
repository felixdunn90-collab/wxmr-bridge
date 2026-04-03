import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../watcher/mappings.db");
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS subaddress_mappings (
    subaddress TEXT PRIMARY KEY,
    solana_pubkey TEXT NOT NULL,
    account_index INTEGER NOT NULL,
    address_index INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

export function saveMapping(
  subaddress: string,
  solanaPubkey: string,
  accountIndex: number,
  addressIndex: number
) {
  db.prepare(`
    INSERT OR IGNORE INTO subaddress_mappings
    (subaddress, solana_pubkey, account_index, address_index, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(subaddress, solanaPubkey, accountIndex, addressIndex, Date.now());
}

export function getSolanaKey(subaddress: string): string | null {
  const row = db.prepare(
    "SELECT solana_pubkey FROM subaddress_mappings WHERE subaddress = ?"
  ).get(subaddress) as any;
  return row?.solana_pubkey ?? null;
}

export function getExistingSubaddress(solanaPubkey: string): string | null {
  const row = db.prepare(
    "SELECT subaddress FROM subaddress_mappings WHERE solana_pubkey = ?"
  ).get(solanaPubkey) as any;
  return row?.subaddress ?? null;
}

export default db;
