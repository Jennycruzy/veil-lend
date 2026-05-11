"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BadgeCheck,
  ClipboardCheck,
  Copy,
  Download,
  EyeOff,
  FileKey,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Unlock,
} from "lucide-react";
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
  scope: "repayment" | "terms" | "risk";
}

export function CreditPassport() {
  const { publicKey } = useWallet();
  const [entries, setEntries] = useState<PassportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingKey, setViewingKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadHistory = useCallback(async () => {
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
            scope: loan.status === "repaid" ? "repayment" : "terms",
          };
        })
      );
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  // Load loan metadata history from the off-chain metadata store.
  useEffect(() => {
    if (publicKey) queueMicrotask(() => void loadHistory());
  }, [publicKey, loadHistory]);

  // Viewing key demo — Umbra MVK selective disclosure to be added post-hackathon per official docs.
  // The official quickstart pasted for this project exposes no MVK function, so
  // this creates an obvious non-production demo token for the UI flow only.
  const generateViewingKey = async () => {
    if (!publicKey) {
      toast.error("Connect wallet first");
      return;
    }

    setGenerating(true);
    try {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      const demoKey = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      setViewingKey(`demo-mvk-${publicKey.toBase58().slice(0, 6)}-${demoKey}`);
      toast.success("Demo viewing key generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Viewing key demo failed");
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

  const setScope = (index: number, scope: PassportEntry["scope"]) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, scope } : e)));
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
  const repaid = entries.filter((e) => e.status === "repaid").length;
  const active = entries.filter((e) => e.status === "active").length;
  const liquidated = entries.filter((e) => e.status === "liquidated").length;
  const completionRate = entries.length > 0 ? Math.round((repaid / entries.length) * 100) : 0;
  const veilScore = Math.max(
    320,
    Math.min(850, 560 + repaid * 55 - active * 12 - liquidated * 140 + disclosedEntries.length * 18)
  );
  const riskBand = veilScore >= 740 ? "Prime" : veilScore >= 660 ? "Verified" : "Thin file";
  const disclosedPayload = disclosedEntries.length > 0
    ? JSON.stringify(
        {
          passportType: "VeilLend scoped credit disclosure",
          wallet: publicKey?.toBase58() ?? null,
          viewingKey,
          veilScore,
          riskBand,
          completionRate,
          disclosedAt: new Date().toISOString(),
          disclosedLoans: disclosedEntries.map(({ loanId, amount, status, date, scope }) => ({
          loanId,
          amount,
          status,
          date,
            scope,
          })),
          hiddenLoans: entries.length - disclosedEntries.length,
        },
        null,
        2
      )
    : null;

  const exportProofSummary = () => {
    if (!disclosedPayload) {
      toast.error("Select at least one loan to disclose");
      return;
    }

    const blob = new Blob([disclosedPayload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `veillend-passport-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Proof summary exported");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              VeilScore
            </CardTitle>
            <CardDescription>
              Scoped reputation from disclosed loan history. Hidden loans remain hidden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between rounded-lg border bg-muted/30 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Private credit band</p>
                <p className="mt-2 text-4xl font-semibold">{veilScore}</p>
              </div>
              <Badge className="mb-1" variant={riskBand === "Prime" ? "default" : "outline"}>
                {riskBand}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-lg font-semibold">{completionRate}%</p>
                <p className="text-[11px] text-muted-foreground">completion</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-lg font-semibold">{disclosedEntries.length}</p>
                <p className="text-[11px] text-muted-foreground">shared</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-3">
                <p className="text-lg font-semibold">{entries.length - disclosedEntries.length}</p>
                <p className="text-[11px] text-muted-foreground">hidden</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Credit Passport
          </CardTitle>
          <CardDescription>
            Demo a scoped disclosure flow. Official Umbra MVK functions are not
            present in the approved quickstart, so this screen is intentionally
            marked as a non-production placeholder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Connected wallet:{" "}
                <code className="text-primary">
                  {publicKey ? publicKey.toBase58() : "Connect wallet"}
                </code>
              </p>
              <p className="rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">
                Viewing key demo — Umbra MVK selective disclosure to be added
                post-hackathon per official docs.
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
              Generate Demo Viewing Key
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
        </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Disclosure Console
          </CardTitle>
          <CardDescription>
            Select loan-specific scopes for a lender. The export contains only selected records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Loan History
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
                  <div className="hidden items-center gap-1 sm:flex">
                    {(["repayment", "terms", "risk"] as const).map((scope) => (
                      <Button
                        key={scope}
                        size="xs"
                        variant={entry.scope === scope ? "default" : "outline"}
                        onClick={() => setScope(i, scope)}
                        className="capitalize"
                      >
                        {scope}
                      </Button>
                    ))}
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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-medium">
                    Lender Verification View ({disclosedEntries.length} disclosed)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    The proof summary masks undisclosed records and exports as lender-verifiable JSON.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={exportProofSummary}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Proof
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Badge variant="outline" className="justify-center">
                  <FileKey className="h-3 w-3" />
                  Scoped key
                </Badge>
                <Badge variant="outline" className="justify-center">
                  <ShieldCheck className="h-3 w-3" />
                  Score {veilScore}
                </Badge>
                <Badge variant="outline" className="justify-center">
                  <EyeOff className="h-3 w-3" />
                  {entries.length - disclosedEntries.length} hidden
                </Badge>
              </div>
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
