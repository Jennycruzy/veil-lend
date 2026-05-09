"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Header } from "@/components/Header";
import { UmbraTestPanel } from "@/components/UmbraTestPanel";

export default function TestPage() {
  const { publicKey } = useWallet();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex flex-col items-center p-6 gap-6">
        <h2 className="text-2xl font-bold">Umbra SDK Integration Test</h2>
        {publicKey ? (
          <UmbraTestPanel walletPublicKey={publicKey.toBase58()} />
        ) : (
          <p className="text-muted-foreground">Connect wallet to run tests.</p>
        )}
      </main>
    </div>
  );
}
