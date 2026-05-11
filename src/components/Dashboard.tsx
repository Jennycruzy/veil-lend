"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrowseLoans } from "@/components/dashboard/BrowseLoans";
import { MyBorrowings } from "@/components/dashboard/MyBorrowings";
import { MyLendings } from "@/components/dashboard/MyLendings";
import { CreditPassport } from "@/components/dashboard/CreditPassport";
import { YieldPool } from "@/components/dashboard/YieldPool";
import { useLendingFlows } from "@/components/dashboard/LendingFlows";
import { useWallet } from "@solana/wallet-adapter-react";
import type { Loan } from "@/lib/types";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, KeyRound, Search, Vault } from "lucide-react";

export function Dashboard() {
  const { publicKey } = useWallet();
  const flows = useLendingFlows(publicKey?.toBase58() ?? null);
  const [activeTab, setActiveTab] = useState("browse");

  const wrap = (fn: (loan: Loan) => Promise<unknown>) => async (loan: Loan) => {
    try {
      await fn(loan);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-4 flex justify-start">
        <Link
          href="/?view=landing"
          className="inline-flex h-8 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Home
        </Link>
      </div>
      <section className="mb-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-primary">
              Private credit console
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Operate loans without exposing wallet intent.
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Marketplace metadata stays off-chain. Token movement is routed
              through the verified Umbra quickstart primitives and devnet dummy mints.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-2xl font-semibold">5</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tabs</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-2xl font-semibold">2</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Mints</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-2xl font-semibold">0</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Public flows</p>
            </div>
          </div>
        </div>
      </section>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 sm:grid-cols-5">
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="borrowings" className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" />
            Borrowings
          </TabsTrigger>
          <TabsTrigger value="lendings" className="flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4" />
            Lendings
          </TabsTrigger>
          <TabsTrigger value="pool" className="flex items-center gap-2">
            <Vault className="h-4 w-4" />
            Yield Pool
          </TabsTrigger>
          <TabsTrigger value="passport" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Passport
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <BrowseLoans onFundLoan={wrap(flows.fundLoan)} />
        </TabsContent>

        <TabsContent value="borrowings">
          <MyBorrowings
            onRepay={wrap(flows.repayLoan)}
            onPostCollateral={wrap(flows.claimAndPostCollateral)}
            umbraAddress={flows.umbraAddress}
          />
        </TabsContent>

        <TabsContent value="lendings">
          <MyLendings onLiquidate={wrap(flows.checkAndLiquidate)} />
        </TabsContent>

        <TabsContent value="pool">
          <YieldPool />
        </TabsContent>

        <TabsContent value="passport">
          <CreditPassport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
