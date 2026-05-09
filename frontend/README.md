# Regtech Frontend

Next.js 16 + Solana app for issuing and verifying training credentials. The frontend talks to an [Anchor program](https://github.com/XcavateBlockchain/regtech-contracts) (`Smart Contracts`) through a Codama-generated TypeScript client and signs on-chain operations through per-company Swig wallets.

For a deep dive on how the wallet/on-chain stack fits together, see [`notes/wallet-stack.md`](./notes/wallet-stack.md). For product-side roles and flows see [`DEMO_GUIDE.md`](./DEMO_GUIDE.md).

## Stack

| Layer |
|---|---|
| Anchor IDL |
| Codama-generated client
| Solana Kit + React Hooks |
| Phantom wallet (user) |
| Swig (company vault) |
| Metaplex (NFT credentials) |
Credential asset (NFT) | An mpl-core asset minted into the global collection and transferred to the recipient wallet (e.g. an employee who completes a module).


## Prerequisites

- [Bun](https://bun.sh) ≥ 1.x (lockfile is `bun.lock`)
- Postgres database (set `DATABASE_URL`)
- Phantom App ID — create at <https://phantom.com/portal> and allowlist 
- Solana RPC URL (devnet by default)


## Setup

```bash
# 1. Install deps (also runs `prisma generate` via postinstall)
bun install

# 2. Configure env
cp .env.example .env.local
# edit .env.local — see required vars below

# 3. Apply DB schema
bunx prisma migrate dev
```

Required env vars (see [`.env.example`](./.env.example) for the full list):

- `NEXT_PUBLIC_PHANTOM_APP_ID`
- `NEXT_PUBLIC_SOLANA_RPC_URL`, `NEXT_PUBLIC_SOLANA_WS_URL`
- `NEXT_PUBLIC_APP_URL`
- `XCAVATE_ADMIN_PRIVATE_KEY`, `XCAVATE_ADMIN_PUBLIC_KEY`, `XCAVATE_GLOBAL_COLLECTION_ADDRESS`
- `DATABASE_URL`
- AWS S3 vars if using uploads

## Run

```bash
# Dev server (http://localhost:3000)
bun dev

# Production build (also runs `prisma migrate deploy`)
bun run build
bun run start

# Regenerate the Codama client after the IDL changes
bun run codama:js

# Lint / format / typecheck
bun run check         # lint + typecheck
bun run lint
bun run typecheck
bun run format
bun run format:fix
```
