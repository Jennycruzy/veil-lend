"use client";

import { Shield } from "lucide-react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUmbraContext } from "@/providers/UmbraProvider";
import { UMBRA_FAUCET_URL } from "@/lib/constants";
import { toast } from "sonner";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

export function Header() {
  const { publicKey } = useWallet();
  const { status, umbraAddress, register } = useUmbraContext();

  const handleRegister = async () => {
    try {
      await register();
      toast.success("Umbra account registered!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Registration failed");
    }
  };

  return (
    <header className="w-full border-b border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">VeilLend</h1>
          <Badge variant="outline" className="text-xs">Devnet</Badge>
        </div>

        <div className="flex items-center gap-3">
          {publicKey && (
            <>
              <Badge variant={status === "registered" ? "default" : "secondary"} className="text-xs">
                Umbra: {status}
              </Badge>
              {umbraAddress && (
                <span className="text-xs text-muted-foreground font-mono hidden md:inline">
                  {umbraAddress.slice(0, 6)}...{umbraAddress.slice(-4)}
                </span>
              )}
              {status === "connected" && (
                <Button size="sm" variant="outline" onClick={handleRegister} className="text-xs h-7">
                  Register Umbra
                </Button>
              )}
            </>
          )}
          <a
            href={UMBRA_FAUCET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Faucet
          </a>
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
