"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useSearchParams } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ExternalLink, LockKeyhole, RadioTower, Shield, Sparkles } from "lucide-react";
import { DUSDC_MINT, DUSDT_MINT, UMBRA_FAUCET_URL } from "@/lib/constants";

export function HomeContent() {
  const { publicKey } = useWallet();
  const searchParams = useSearchParams();
  const showLanding = searchParams.get("view") === "landing";

  return publicKey && !showLanding ? (
    <Dashboard />
  ) : (
    <main className="relative mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-4 py-12 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
      <section className="space-y-8">
        <Badge className="border-primary/20 bg-primary/10 text-primary" variant="outline">
          <Sparkles className="mr-1 h-3 w-3" />
          Devnet private credit marketplace
        </Badge>
        <div className="space-y-5">
          <h2 className="max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-balance sm:text-6xl lg:text-7xl">
            Lending positions that do not leak your strategy.
          </h2>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            VeilLend uses the verified Umbra quickstart primitives for
            confidential registration, encrypted deposits, receiver-claimable
            UTXOs, relayer claims, and private credit-market metadata.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={UMBRA_FAUCET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-xl shadow-primary/10 transition-transform hover:-translate-y-0.5"
          >
            Claim dUSDC / dUSDT
            <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href="/test"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            Run Umbra test page
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
          <code className="rounded-xl border border-white/10 bg-black/20 p-3">
            dUSDC {DUSDC_MINT}
          </code>
          <code className="rounded-xl border border-white/10 bg-black/20 p-3">
            dUSDT {DUSDT_MINT}
          </code>
        </div>
      </section>

      <section className="veil-card relative rounded-[2rem] p-5">
        <div className="absolute right-8 top-8 h-28 w-28 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative space-y-5">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/15">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Shielded loan request</p>
                  <p className="text-xs text-muted-foreground">Off-chain metadata, private settlement</p>
                </div>
              </div>
              <Badge variant="outline" className="border-primary/25 text-primary">Open</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="mt-2 text-2xl font-semibold">100</p>
                <p className="text-xs text-primary">dUSDC</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-xs text-muted-foreground">Collateral</p>
                <p className="mt-2 text-2xl font-semibold">150%</p>
                <p className="text-xs text-primary">dUSDT</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-xs text-muted-foreground">Term</p>
                <p className="mt-2 text-2xl font-semibold">30d</p>
                <p className="text-xs text-primary">5.0% APR</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <LockKeyhole className="mb-4 h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Receiver-claimable UTXOs</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Funding and repayments use the verified Umbra private payment path.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <RadioTower className="mb-4 h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Relayer claims</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Claimable UTXOs are claimed into encrypted balances via Umbra Relayer.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
