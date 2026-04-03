# wXMR Bridge — Agent Handoff Document

## Project Overview
A wrapped Monero token (wXMR) on Solana. Users deposit stagenet XMR and receive wXMR SPL tokens. Users burn wXMR and receive XMR back. Built for trust-minimised, auditable operation.

## Repository Structure
```
wxmr-bridge/
  programs/wxmr-bridge/src/lib.rs   # Anchor program (mint/burn/initialize)
  lib/
    xmr.ts                           # monero-ts wallet wrapper (shared)
    db.ts                            # SQLite subaddress mappings (shared)
  watcher/
    index.ts                         # Federation watcher daemon
    package.json
    tsconfig.json
  dashboard/
    app/
      page.tsx                       # Main dashboard UI (dark mode, brutalist)
      api/
        reserve/route.ts             # GET /api/reserve — XMR balance
        supply/route.ts              # GET /api/supply — wXMR supply
        deposit-address/route.ts     # POST /api/deposit-address — create subaddress
    lib/
      xmr.ts                         # Copy of lib/xmr.ts for Next.js
      db.ts                          # Copy of lib/db.ts for Next.js
  scripts/
    initialize.ts                    # One-time bridge initialization
    mint.ts                          # Test mint script
    burn.ts                          # Test burn script
```

## Key Addresses (Localnet/Stagenet)
- **Program ID**: `CHhFsbCVnsVvFCH1cQ43zfJKbXhKGF81EG5q9f97gBaS`
- **wXMR Mint**: `4WzLuLAL6vjnPRfgNYMVeUGvsLGbE1qTDzDCpooXc3Zb`
- **Bridge PDA**: `F9BrCjGV4gEQptudwuXDDCXGJaHFxEbWukSmS1MrRX9u` (mint authority)
- **Authority wallet**: `Cv3vCZcsPQgwqgkfdLAbs423u589pJBCoUFjVPKcEJaR`
- **XMR Reserve (stagenet)**: `59Qp8URJKRMFhzZhiELXucU4znvkNkydKdU2QE2TA2BVdnRxAhaHGw6CRgPwevHNXPLEbyxqj1zj5T5FxmqsRvheHdJ7oBm`

## Current Status
- [x] Anchor program deployed to localnet — mint/burn/initialize instructions working
- [x] wXMR SPL token created (12 decimals, mint authority = bridge PDA)
- [x] Bridge initialized via `scripts/initialize.ts`
- [x] SQLite DB for subaddress → Solana pubkey mappings (`watcher/mappings.db`)
- [x] Watcher daemon using monero-ts (event-based via `onOutputReceived`)
- [x] Dashboard (Next.js, dark mode, brutalist) with deposit widget
- [ ] End-to-end deposit test (subaddress → mint) not yet confirmed working
- [ ] Dashboard APIs returning data (better-sqlite3 Node version mismatch blocking)
- [ ] `.gitignore` + GitHub push not done
- [ ] burn → XMR release not tested end-to-end

## Known Issues
1. **better-sqlite3 Node version mismatch**: `dashboard/node_modules/better-sqlite3` compiled against wrong NODE_MODULE_VERSION. Fix: `cd dashboard && npm rebuild better-sqlite3`. Also run `npm rebuild better-sqlite3` at root for watcher.
2. **dashboard/lib/xmr.ts still uses old fetch-based approach**: Replace with `cp lib/xmr.ts dashboard/lib/xmr.ts` — the new version uses monero-ts directly.
3. **monero-wallet-rpc is not used anymore**: Replaced by monero-ts `openWalletFull`. Do not start monero-wallet-rpc.
4. **Watcher requires wallet password via env**: Run as `XMR_WALLET_PASSWORD="password" yarn start`

## How to Run Everything

### 1. Local Solana validator
```bash
solana-test-validator --quiet &
```

### 2. Watcher
```bash
cd ~/wxmr-bridge/watcher
XMR_WALLET_PASSWORD="your_password" yarn start
```

### 3. Dashboard
```bash
cd ~/wxmr-bridge/dashboard
npm run dev
```

## Tech Stack
| Layer | Tool |
|---|---|
| Token | SPL Token (legacy, not Token-2022) |
| Bridge program | Anchor (Rust) |
| XMR wallet | monero-ts (WebAssembly) |
| Subaddress DB | better-sqlite3 |
| Federation daemon | TypeScript |
| Dashboard | Next.js + Tailwind |
| Stagenet node | node3.monerodevs.org:38089 |

## Next Steps (in order)
1. Fix better-sqlite3 rebuild in dashboard
2. Verify dashboard APIs return data at localhost:3000/api/reserve and /api/supply
3. Test deposit widget — enter Solana pubkey, confirm subaddress generated
4. Send stagenet XMR from test wallet to generated subaddress
5. Confirm watcher mints wXMR after 10 confirmations
6. Test burn → XMR release end-to-end
7. Set up .gitignore (exclude wallet files, keypairs, .env, mappings.db)
8. Push to GitHub

## .gitignore (add these)
```
.env
*.json.key
mappings.db
wxmr-reserve-stagenet
wxmr-reserve-stagenet.keys
wxmr-test-sender
wxmr-test-sender.keys
target/deploy/*-keypair.json
~/.config/solana/id.json
```

## Important Notes
- wXMR uses 12 decimals to match XMR (1 XMR = 1,000,000,000,000 piconero)
- Monero stagenet addresses start with `5`
- The bridge is currently single-custodian (v1). v2 plan is Monero native multisig + Squads on Solana
- `lib/xmr.ts` and `dashboard/lib/xmr.ts` must be kept in sync manually (Next.js cannot import outside its root)
- monero-ts uses WebAssembly — it is heavy to initialise (~2-3s) but handles syncing automatically
