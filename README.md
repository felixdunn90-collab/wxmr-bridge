# wXMR Bridge

A wrapped Monero token on Solana. Deposit stagenet XMR, receive wXMR SPL tokens. Burn wXMR, receive XMR back. Auditable and trust-minimised.

## Architecture

```
User deposits XMR ──► Reserve wallet (stagenet)
                         │
                         ▼  Watcher detects confirmed deposit
                    Mint wXMR SPL ──► User's Solana wallet

User burns wXMR ──► Anchor burn instruction
                      │
                      ▼  Watcher catches BurnEvent
                 Release XMR ──► User's Monero address
```

The bridge runs as a single-custodian federation (v1). The bridge authority is the only key that can mint wXMR, and it releases XMR in response to burn events emitted by the on-chain program.

## Components

| Component | Description |
|---|---|
| `programs/wxmr-bridge` | Anchor program (initialize, mint_wxmr, burn_wxmr) |
| `watcher/` | Federation daemon -- watches Monero deposits, mints wXMR, listens for burns, releases XMR |
| `dashboard/` | Next.js frontend -- reserve balance, wXMR supply, deposit address generation, transaction history |
| `lib/` | Shared Monero wallet wrapper and SQLite subaddress database |
| `scripts/` | One-time initialization and test helpers |

## How It Works

### Deposits

1. User submits their Solana wallet address through the dashboard
2. The watcher generates a unique Monero subaddress and records the mapping in SQLite
3. User sends XMR to that subaddress
4. The watcher detects the incoming transaction, waits for 10 confirmations, then calls `mint_wxmr` on the bridge program
5. wXMR SPL tokens are minted to the user's associated token account

### Withdrawals (Burn)

1. User sends a `burn_wxmr` instruction to the bridge program, specifying their Monero destination address
2. The bridge burns the wXMR and emits a `BurnEvent`
3. The watcher listens for burn events and automatically sends the equivalent XMR to the specified address
4. Transaction status is exposed via the dashboard API

## Quick Start

### Prerequisites

- Rust (latest stable) and the Anchor CLI
- Node.js 18+
- Solana CLI tools (`solana-test-validator`, `solana`)
- A Monero stagenet wallet file

### 1. Start a local Solana validator

```
solana-test-validator --quiet &
```

### 2. Start the watcher

```
cd watcher
yarn install
XMR_WALLET_PASSWORD="your_password" yarn start
```

The watcher opens your Monero stagenet wallet, starts syncing, and exposes an HTTP API on port 4321:

- `GET /balance` -- reserve wallet balance
- `POST /subaddress` -- create a deposit subaddress
- `GET /transactions` -- recent bridge transactions

### 3. Start the dashboard

```
cd dashboard
npm install
npm run dev
```

Open `http://localhost:3000`.

### 4. (First run) Initialise the bridge

If this is a fresh deployment, run the initialization script before using the dashboard:

```
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 \
ANCHOR_WALLET=~/.config/solana/id.json \
npx ts-node scripts/initialize.ts
```

### 5. Test

Mint test wXMR:

```
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 \
ANCHOR_WALLET=~/.config/solana/id.json \
npx ts-node scripts/mint.ts
```

Burn test wXMR:

```
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 \
ANCHOR_WALLET=~/.config/solana/id.json \
npx ts-node scripts/burn.ts
```

## Deployed Addresses (Stagenet / Localnet)

| Item | Address |
|---|---|
| Program ID | `CHhFsbCVnsVvFCH1cQ43zfJKbXhKGF81EG5q9f97gBaS` |
| wXMR Mint | `4WzLuLAL6vjnPRfgNYMVeUGvsLGbE1qTDzDCpooXc3Zb` |
| Bridge PDA (mint authority) | `F9BrCjGV4gEQptudwuXDDCXGJaHFxEbWukSmS1MrRX9u` |
| Bridge Authority | `Cv3vCZcsPQgwqgkfdLAbs423u589pJBCoUFjVPKcEJaR` |
| XMR Reserve Wallet | `59Qp8URJKRMFhzZhiELXucU4znvkNkydKdU2QE2TA2BVdnRxAhaHGw6CRgPwevHNXPLEbyxqj1zj5T5FxmqsRvheHdJ7oBm` |

## Token Details

- **Decimals**: 12 (matches Monero's piconero unit: 1 XMR = 10^12 piconero)
- **Token program**: SPL Token (legacy, not Token-2022)
- **Mint authority**: Bridge PDA -- only the Anchor program can mint via CPI

## Security Considerations

- The bridge program is deployed to localnet and the reserve wallet runs on Monero stagenet for development. Mainnet deployment requires a multi-signature federation.
- The bridge authority keypair is the single custodian of the reserve. Protect it accordingly.
- Subaddress-to-pubkey mappings are stored in `watcher/mappings.db`. Back this up if operating in production.

## Roadmap

- v2: Multi-signature federation for Monero (native multisig) + Squads multisig on Solana
- On-chain deposit verification via Merkle proofs
- Public reserve audit endpoint
