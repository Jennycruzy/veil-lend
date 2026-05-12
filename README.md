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
7. **Private Reputation / VeilScore** — Lenders get a scoped reputation signal without exposing full history.
8. **Private Deal Room** — Each listing opens a masked lender review panel before funding.
9. **Private Yield Pool** — Lenders deposit into a shared encrypted pool that auto-matches small loans.
10. **Gasless Operations** — All claims and repayments use the Umbra Relayer.

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

### Judge-Ready Flow

The main dashboard now includes:

- A top-of-page `Home` link above the private credit console
- A private deal room in `Browse Loans` for masked lender review
- `VeilScore` reputation signals in the Credit Passport
- Scoped disclosure controls for repayment, terms, and risk
- Exportable proof summaries for lender review

Use the home link to switch back to the public landing view with `/?view=landing`.

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
    page.tsx          — Root route with landing + dashboard switch
    test/page.tsx     — Umbra SDK integration test page
    layout.tsx        — Root layout (dark mode, providers)
  components/
    Header.tsx        — Nav bar with Umbra status badge
    Dashboard.tsx     — Tab controller for all views + top home link
    HomeContent.tsx   — Landing view and dashboard gate
    UmbraTestPanel.tsx — Sequential SDK test runner
    dashboard/
      BrowseLoans.tsx     — Open loan marketplace
      MyBorrowings.tsx    — Borrower view + create loan form
      MyLendings.tsx      — Lender view + liquidation check
      CreditPassport.tsx  — Scoped viewing key demo + VeilScore
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

The current UI also includes:

- `VeilScore` as a privacy-preserving reputation summary
- Loan-specific scope toggles for `repayment`, `terms`, and `risk`
- Exportable proof summaries for lender review
- Hidden-loan counts so disclosed history stays minimal

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

## License

MIT
