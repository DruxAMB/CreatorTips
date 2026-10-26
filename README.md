# CreatorTips — Tip by Handle on BOT Chain

Supporters send BOT to a creator by handle (a Telegram or X-style username)
instead of a raw wallet address. Each tip splits **95% to the creator, 5% to
the treasury** — enforced on-chain.

## Contract

`contracts/CreatorTips.sol` — UUPS-upgradeable; `ReentrancyGuardUpgradeable.sol`
is a local shim (the vendored OZ upgradeable lib predates it).

- `setHandle(handle)` — one handle per wallet; lowercase `a-z0-9._-`, 2–32 chars,
  enforced on-chain → `HandleSet` event
- `tipHandle(handle)` payable — 95/5 split, `MIN_TIP` 0.001 BOT → `Tipped` event
- `resolveHandle(handle) → address` / `handleOf(address)` / `totalTipped()`
- `setTreasury(addr)` — owner only

## Contract deps

`contracts/lib/` vendors OpenZeppelin + forge-std (gitignored — copy from
`bot-oracle/contracts/lib` or `forge install` if Foundry is available).

## Deploy

```bash
npm install
cp .env.example .env           # DEPLOYER_KEY + OWNER_ADDRESS + TREASURY_ADDRESS
npm run deploy
```

## App

```bash
cd app && npm install && npm run dev
```

Handle lookup with claimed/unclaimed state, preset + custom tip amounts,
claim-your-handle flow, and a live feed of recent `Tipped` events.
