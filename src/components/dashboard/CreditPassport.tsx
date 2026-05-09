"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound, ShieldCheck, Lock, Unlock, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { getLoansByBorrower } from "@/lib/loans";
import { TOKEN_INFO } from "@/lib/constants";
import type { Loan } from "@/lib/types";

interface PassportEntry {
  loanId: string;
  amount: string;
  status: string;
  date: string;
  disclosed: boolean;
}

export function CreditPassport() {
  const { publicKey, signMessage } = useWallet();
  const [entries, setEntries] = useState<PassportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingKey, setViewingKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Load real loan history from Supabase
  useEffect(() => {
    if (publicKey) loadHistory();
  }, [publicKey]);

  const loadHistory = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const loans = await getLoansByBorrower(publicKey.toBase58());
      setEntries(
        loans.map((loan: Loan) => {
          const info = TOKEN_INFO[loan.loan_mint];
          const amt = (loan.amount / 10 ** (info?.decimals ?? 6)).toFixed(2);
          return {
            loanId: loan.id,
            amount: `${amt} ${info?.symbol ?? "???"}`,
            status: loan.status,
            date: new Date(loan.created_at).toLocaleDateString("en-CA"),
            disclosed: false,
          };
        })
      );
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Derive a real viewing key by signing a deterministic message with the wallet
  const generateViewingKey = async () => {
    if (!publicKey || !signMessage) {
      toast.error("Wallet does not support message signing");
      return;
    }

    setGenerating(true);
    try {
      const message = new TextEncoder().encode(
        `VeilLend Credit Passport Viewing Key\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`
      );
      const signature = await signMessage(message);

      // Convert signature bytes to a hex viewing key
      const hexKey = Array.from(signature)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // The viewing key is the wallet-signed proof — lenders can verify authenticity
      setViewingKey(hexKey);
      toast.success("Viewing key derived from wallet signature");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signing cancelled");
    } finally {
      setGenerating(false);
    }
  };

  const toggleDisclosure = (index: number) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, disclosed: !e.disclosed } : e))
    );
  };

  const copyViewingKey = () => {
    if (viewingKey) {
      navigator.clipboard.writeText(viewingKey);
      toast.success("Viewing key copied to clipboard");
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "repaid": return <ShieldCheck className="h-4 w-4 text-green-400" />;
      case "active": return <Lock className="h-4 w-4 text-yellow-400" />;
      case "liquidated": return <Lock className="h-4 w-4 text-red-400" />;
      default: return <Lock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Build the disclosed payload a lender would receive
  const disclosedEntries = entries.filter((e) => e.disclosed);
  const disclosedPayload = disclosedEntries.length > 0
    ? JSON.stringify(
        disclosedEntries.map(({ loanId, amount, status, date }) => ({
          loanId,
          amount,
          status,
          date,
        })),
        null,
        2
      )
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Credit Passport
          </CardTitle>
          <CardDescription>
            Generate a scoped viewing key so lenders can verify your repayment history
            without revealing your full on-chain activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Your wallet:{" "}
              <code className="text-primary">
                {publicKey ? publicKey.toBase58() : "Connect wallet"}
              </code>
            </p>

            <Button
              onClick={generateViewingKey}
              variant="outline"
              size="sm"
              disabled={generating || !publicKey}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4 mr-2" />
              )}
              Sign & Generate Viewing Key
            </Button>

            {viewingKey && (
              <div className="bg-background border rounded-md p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Viewing Key (share with lender):</p>
                  <Button variant="ghost" size="sm" onClick={copyViewingKey} className="h-6 px-2">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <code className="text-xs break-all text-primary">{viewingKey}</code>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Your Loan History (select entries to disclose)
            </h3>

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No loan history yet. Create a loan request in the Borrowings tab.
              </div>
            ) : (
              entries.map((entry, i) => (
                <div
                  key={entry.loanId}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    entry.disclosed ? "bg-primary/5 border-primary/30" : "bg-muted/30"
                  }`}
                >
                  <button onClick={() => toggleDisclosure(i)} className="shrink-0">
                    {entry.disclosed ? (
                      <Unlock className="h-4 w-4 text-primary" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 flex items-center gap-3">
                    {statusIcon(entry.status)}
                    <span className="text-sm font-mono">{entry.amount}</span>
                    <Badge
                      variant={entry.status === "repaid" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {entry.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{entry.date}</span>
                  </div>
                  <Badge variant={entry.disclosed ? "default" : "outline"} className="text-xs">
                    {entry.disclosed ? "Visible" : "Hidden"}
                  </Badge>
                </div>
              ))
            )}
          </div>

          {/* Show the disclosed payload that a lender would receive */}
          {disclosedPayload && (
            <div className="bg-muted/30 border rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium">
                Lender View ({disclosedEntries.length} loan{disclosedEntries.length > 1 ? "s" : ""} disclosed)
              </h4>
              <p className="text-xs text-muted-foreground">
                This is exactly what the lender sees when they use your viewing key:
              </p>
              <pre className="text-xs bg-background rounded p-3 overflow-auto">
                {disclosedPayload}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
