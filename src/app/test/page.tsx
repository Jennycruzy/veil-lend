"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { UmbraTestPanel } from "@/components/UmbraTestPanel";

export default function TestPage() {
  const { publicKey } = useWallet();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex flex-1 flex-col items-center p-6">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold">Umbra SDK Integration Test</h2>
            {!publicKey && (
              <p className="text-muted-foreground">Connect wallet to run tests.</p>
            )}
          </div>

          {publicKey && <UmbraTestPanel walletPublicKey={publicKey.toBase58()} />}
        </div>
      </main>
    </div>
  );
}
