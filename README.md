# VeilLend

VeilLend is a private lending marketplace for Solana devnet that keeps loan intent, collateral movement, and repayment flow out of public view by routing value through the verified Umbra quickstart primitives.

It is built for the Umbra Frontier Hackathon and is designed to demonstrate a real user flow, not just a mock UI.

---

## The Problem

Public on-chain lending leaks too much:

- Borrowers expose when they want capital, how much they need, and what collateral they can post
- Lenders reveal their strategy, capital allocation, and risk appetite
- Repayment history becomes permanent public reputation data
- Liquidation risk is visible early enough for other actors to react against users

That makes lending behavior easier to track, copy, front-run, and profile.

## What VeilLend Solves

VeilLend moves the sensitive parts of the lending lifecycle into private Umbra flows while keeping marketplace metadata usable for the frontend.

- Loan requests are stored off-chain in Supabase
- Funds move through receiver-claimable UTXOs instead of public SPL transfers
- Collateral is deposited into encrypted balances
- Repayment is sent privately to the lender
- Claims can be completed gaslessly through the Umbra relayer
- A credit passport screen demonstrates scoped disclosure for lender review

The result is a private credit workflow that still feels like a normal marketplace.

---

## Current Build

This repository currently ships:

- A public landing page with a route into the marketplace
- A marketplace view with `Browse`, `Borrowings`, `Lendings`, `Yield Pool`, and `Passport` tabs
- A top-left `Home` button on private pages to return to the landing screen
- A dedicated Umbra SDK test page at `/test`
- Devnet support with `dUSDC` and `dUSDT` faucet flows
- Solflare and Phantom-compatible transaction signing through the wallet adapter

### Main User Flows

- `Browse` lets a lender fund open requests privately
- `Borrowings` lets a borrower create a request, post collateral, and repay privately
- `Lendings` shows funded positions and liquidation checks
- `Yield Pool` shows the private pool concept for matched liquidity
- `Passport` shows scoped disclosure and reputation summary UX

### Wallet and Network Notes

- The app is intended for devnet
- Phantom, Solflare, and similar Solana wallets should be set to devnet
- Token movement uses real Umbra signing and transaction flows
- Marketplace metadata remains off-chain

---

## Umbra SDK Integration

The build uses the official Umbra quickstart primitives:

| Flow | Umbra Function |
|------|----------------|
| Initialize | `getUmbraClient` |
| Register | `getUserRegistrationFunction` |
| Deposit collateral | `getPublicBalanceToEncryptedBalanceDirectDepositorFunction` |
| Withdraw collateral | `getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction` |
| Create private funding / repayment UTXOs | `getPublicBalanceToReceiverClaimableUtxoCreatorFunction` |
| Scan claimable UTXOs | `getClaimableUtxoScannerFunction` |
| Claim UTXOs gaslessly | `getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction` + `getUmbraRelayer` |

Packages used:

- `@umbra-privacy/sdk`
- `@umbra-privacy/web-zk-prover`
- `@solana/kit`
- `@solana/web3.js`

---

## Devnet Tokens

You need faucet tokens before using the marketplace.

| Token | Mint Address | Faucet |
|------|--------------|--------|
| dUSDC | `4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7` | [faucet.umbraprivacy.com](https://faucet.umbraprivacy.com) |
| dUSDT | `DXQwBNGgyQ2BzGWxEriJPVmXYFQBsQbXvfvfSNTaJkL6` | [faucet.umbraprivacy.com](https://faucet.umbraprivacy.com) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- A Solana wallet extension set to devnet
- A Supabase project for loan metadata

### Setup

```bash
git clone https://github.com/your-username/veillend.git
cd veillend
nvm use 20
pnpm install
cp .env.local.example .env.local
```

Fill in your Supabase URL and anon key in `.env.local`.

### Database Setup

1. Create a Supabase project
2. Open the SQL editor
3. Run `supabase-schema.sql`
4. Copy the project URL and anon key into `.env.local`

### Run Locally

```bash
pnpm dev
```

Open `http://localhost:3000`.

### Test Umbra SDK

Open `http://localhost:3000/test` to run the sequential Umbra SDK integration checks.

### Marketplace Route

- Landing page: `/`
- Marketplace: `/marketplace`
- Test page: `/test`

Use the `Home` button inside the marketplace to return to the landing page.

---

## Why This Build Matters

VeilLend shows that private lending on Solana does not have to sacrifice usability.

It gives the user:

- A place to publish a loan request without exposing the full intent publicly
- A private funding path that does not broadcast the borrower-lender negotiation in plain SPL transfers
- A private collateral and repayment flow
- A clean demo of how selective disclosure can support credit review without exposing the full account history

This is the core value: keep the lending market functional while removing the public data exhaust that makes DeFi lending easy to surveil.

---

## Architecture

```text
src/
  app/
    page.tsx          Root landing and dashboard switch
    marketplace/page.tsx Private marketplace route
    test/page.tsx     Umbra SDK integration test page
    layout.tsx        Root layout and app shell
  components/
    Header.tsx        Top navigation and wallet state
    HomeContent.tsx   Landing page content
    Dashboard.tsx     Marketplace tabs and Home button
    UmbraTestPanel.tsx Sequential SDK test runner
    dashboard/
      BrowseLoans.tsx    Open loan marketplace
      MyBorrowings.tsx   Borrower requests, collateral, repayment
      MyLendings.tsx     Lender positions and liquidation checks
      CreditPassport.tsx Scoped disclosure and reputation view
      YieldPool.tsx      Private pool concept
      LendingFlows.tsx   Umbra-powered lending operations
  lib/
    umbra.ts         Umbra helpers and test page hooks
    loans.ts         Supabase loan metadata CRUD
    supabase.ts      Lazy Supabase client
    constants.ts     Mints, endpoints, and app constants
  providers/
    WalletProvider.tsx Wallet adapter setup
    UmbraProvider.tsx  Umbra client and signer bridge
```

---

## Status

This is a devnet prototype with real private transfer plumbing and some product surfaces that are intentionally framed as demonstrations, especially the scoped disclosure passport experience.

## License

MIT
