"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { Shield, ExternalLink } from "lucide-react";
import { UMBRA_FAUCET_URL } from "@/lib/constants";

export default function Home() {
  const { publicKey } = useWallet();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {publicKey ? (
        <Dashboard />
      ) : (
        <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          <Shield className="h-16 w-16 text-primary" />
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Private Lending on Solana</h2>
            <p className="text-muted-foreground max-w-md">
              Borrow and lend with full privacy. Every deposit, payment, and repayment
              is shielded by Umbra Protocol.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <p>Connect your wallet above to get started.</p>
            <a
              href={UMBRA_FAUCET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Get dUSDC/dUSDT from the faucet
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </main>
      )}
    </div>
  );
}
