"use client";

import { ExternalLink, Shield, Sparkles } from "lucide-react";
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
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-background/55 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl border border-primary/30 bg-primary/15 shadow-lg shadow-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">VeilLend</h1>
            <p className="hidden text-[11px] uppercase tracking-[0.24em] text-muted-foreground sm:block">
              Umbra private credit
            </p>
          </div>
          <Badge variant="outline" className="hidden border-primary/25 bg-primary/10 text-xs text-primary sm:inline-flex">
            <Sparkles className="mr-1 h-3 w-3" />
            Devnet
          </Badge>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {publicKey && (
            <>
              <Badge
                variant={status === "registered" ? "default" : "secondary"}
                className="hidden text-xs sm:inline-flex"
              >
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
            className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary md:inline-flex"
          >
            Faucet
            <ExternalLink className="h-3 w-3" />
          </a>
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
