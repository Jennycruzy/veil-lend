"use client";

import { useState } from "react";
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
import { Search, ArrowDownToLine, ArrowUpFromLine, KeyRound, Vault } from "lucide-react";

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
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
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
