# VeilLend — Private Lending Marketplace on Solana

**The most advanced private lending protocol on Solana, powered by [Umbra Protocol](https://umbraprivacy.com).**

Built for the Umbra Frontier Hackathon.

---

## The Problem

Public DeFi lending exposes every position on-chain:
- Liquidation snipers front-run under-collateralized borrowers
- Permanent debt history creates unjust blacklists
- Lenders' capital allocation strategies are visible to competitors

## The Solution

VeilLend makes every step of the lending lifecycle private using Umbra's confidential transaction SDK:

1. **Shielded Loan Marketplace** — Borrowers post requests anonymously. Lenders browse without revealing intent.
2. **Private Loan Funding** — Lenders send funds via Umbra receiver-claimable UTXOs. No public transfer visible.
3. **Confidential Collateral** — Borrowers deposit collateral into encrypted balances.
4. **Private Repayment** — Repayments flow through Umbra UTXOs back to lenders.
5. **Private Liquidation** — Under-collateralization triggers confidential collateral transfer (Pyth oracle).
6. **Credit Passport** — Borrowers generate scoped viewing keys for selective disclosure of repayment history.
7. **Private Yield Pool** — Lenders deposit into a shared encrypted pool that auto-matches small loans.
8. **Gasless Operations** — All claims and repayments use the Umbra Relayer.

---

## Umbra SDK Integration

Every monetary flow uses **only** verified functions from the [official Umbra quickstart](https://sdk.umbraprivacy.com/quickstart):

| Flow | Umbra Function |
|------|---------------|
| Initialize | `getUmbraClient` + `createInMemorySigner` |
| Register | `getUserRegistrationFunction` (confidential + anonymous) |
| Deposit collateral | `getPublicBalanceToEncryptedBalanceDirectDepositorFunction` |
| Withdraw | `getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction` |
| Fund loan / Repay | `getPublicBalanceToReceiverClaimableUtxoCreatorFunction` + ZK prover |
| Scan UTXOs | `getClaimableUtxoScannerFunction` |
| Claim (gasless) | `getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction` + relayer |

Packages: `@umbra-privacy/sdk` + `@umbra-privacy/web-zk-prover`

---

## Devnet Tokens

**You must claim test tokens before using VeilLend.**

| Token | Mint Address | Faucet |
|-------|-------------|--------|
| dUSDC | `4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7` | [faucet.umbraprivacy.com](https://faucet.umbraprivacy.com) |
| dUSDT | `DXQwBNGgyQ2BzGWxEriJPVmXYFQBsQbXvfvfSNTaJkL6` | [faucet.umbraprivacy.com](https://faucet.umbraprivacy.com) |

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm
- Phantom or Solflare wallet (set to **Devnet**)
- Supabase project (free tier) for loan metadata

### Setup

```bash
git clone https://github.com/your-username/veillend.git
cd veillend
nvm use 20  # or ensure Node 20+
pnpm install
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key in .env.local
```

### Database Setup

1. Create a free Supabase project at [supabase.com](https://supabase.com)
2. Open the SQL Editor and run `supabase-schema.sql`
3. Copy your project URL and anon key to `.env.local`

### Run Locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Test Umbra SDK

Visit [http://localhost:3000/test](http://localhost:3000/test) to run all 7 Umbra SDK steps in sequence.

### Deploy to Vercel

```bash
npx vercel --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Architecture

```
src/
  app/
    page.tsx          — Main dashboard (wallet connect + 5-tab interface)
    test/page.tsx     — Umbra SDK integration test page
    layout.tsx        — Root layout (dark mode, providers)
  components/
    Header.tsx        — Nav bar with Umbra status badge
    Dashboard.tsx     — Tab controller for all views
    UmbraTestPanel.tsx — Sequential SDK test runner
    dashboard/
      BrowseLoans.tsx     — Open loan marketplace
      MyBorrowings.tsx    — Borrower view + create loan form
      MyLendings.tsx      — Lender view + liquidation check
      CreditPassport.tsx  — Scoped viewing key demo
      YieldPool.tsx       — Private yield pool deposit
      LendingFlows.tsx    — All Umbra-powered lending operations
  lib/
    umbra.ts      — useUmbra hook (all SDK functions)
    constants.ts  — Mint addresses, endpoints
    supabase.ts   — Supabase client (lazy init)
    loans.ts      — CRUD for loan metadata
    types.ts      — TypeScript types
  providers/
    WalletProvider.tsx  — Phantom + Solflare
    QueryProvider.tsx   — TanStack React Query
```

---

## Credit Passport (Viewing Keys)

The Credit Passport feature demonstrates **selective disclosure** of repayment history using scoped viewing keys. In the current Umbra SDK quickstart, explicit Master Viewing Key (MVK) functions are not yet exposed. The UI provides a full demo experience with simulated key generation and per-loan disclosure toggles.

> Viewing key demo — Umbra MVK selective disclosure to be added post-hackathon per official docs.

---

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- @umbra-privacy/sdk + @umbra-privacy/web-zk-prover
- @solana/wallet-adapter (Phantom, Solflare)
- @tanstack/react-query
- Supabase (off-chain loan metadata)
- Lucide icons

---

## Demo Video Script (4 minutes)

### 0:00-0:30 — The Problem
"Every DeFi loan on Solana is public. Liquidation bots snipe your positions. Your debt history follows you forever. VeilLend changes this."

### 0:30-1:00 — Connect & Register
Show: Connect Phantom (devnet). Umbra status badge turns "registered". "One click registers your confidential + anonymous Umbra account. From here, everything is private."

### 1:00-1:45 — Borrower Posts Loan Request
Show: My Borrowings tab, New Request form, Post 100 dUSDC loan at 150% collateral. "The request metadata is stored off-chain. No on-chain trace of the borrow intent."

### 1:45-2:30 — Lender Funds Privately
Show: Browse tab, Click "Fund Privately", Umbra creates a receiver-claimable UTXO. "The lender sends dUSDC as a private UTXO. Check Solana Explorer — you see NOTHING. No sender, no receiver, no amount."

### 2:30-3:15 — Borrower Claims + Posts Collateral
Show: My Borrowings, "Post Collateral", Scan UTXOs, Claim via relayer (gasless!), Deposit collateral. "The borrower claims the funds into their encrypted balance — zero gas cost thanks to Umbra Relayer. Then posts collateral privately."

### 3:15-3:45 — Private Repayment
Show: My Borrowings, "Repay Privately", UTXO sent to lender. "Repayment is another private UTXO. The lender can verify receipt. The world sees nothing."

### 3:45-4:00 — Credit Passport
Show: Passport tab, Generate viewing key, Toggle loan disclosures. "For future loans, the borrower generates a scoped viewing key. Lenders verify only the specific loans you choose to reveal. Privacy AND reputation."

---

## License

MIT
