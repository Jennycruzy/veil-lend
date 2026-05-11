"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DUSDC_MINT, DUSDT_MINT, TOKEN_INFO } from "@/lib/constants";
import { createLoan, getLoansByBorrower } from "@/lib/loans";
import type { Loan } from "@/lib/types";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

interface MyBorrowingsProps {
  onRepay: (loan: Loan) => void;
  onPostCollateral: (loan: Loan) => void;
  umbraAddress: string | null;
}

export function MyBorrowings({ onRepay, onPostCollateral, umbraAddress }: MyBorrowingsProps) {
  const { publicKey } = useWallet();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [amount, setAmount] = useState("100");
  const [collateralRatio, setCollateralRatio] = useState("150");
  const [termDays, setTermDays] = useState("30");
  const [interestBps, setInterestBps] = useState("500");

  const loadLoans = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const data = await getLoansByBorrower(publicKey.toBase58());
      setLoans(data);
    } catch {
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (publicKey) queueMicrotask(() => void loadLoans());
  }, [publicKey, loadLoans]);

  const handleCreate = async () => {
    if (!publicKey) return;
    if (!umbraAddress) {
      toast.error("Umbra not initialized — wait for Umbra status to show 'registered'");
      return;
    }
    setSubmitting(true);
    try {
      await createLoan({
        borrower_pubkey: publicKey.toBase58(),
        borrower_umbra_address: umbraAddress,
        amount: Math.round(parseFloat(amount) * 1_000_000), // convert to base units
        collateral_mint: DUSDT_MINT,
        loan_mint: DUSDC_MINT,
        collateral_ratio: parseInt(collateralRatio),
        term_days: parseInt(termDays),
        interest_rate_bps: parseInt(interestBps),
      });
      toast.success("Loan request posted to the marketplace!");
      setShowForm(false);
      await loadLoans();
    } catch (e) {
      toast.error(`Failed to create loan: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = (amt: number, mint: string) => {
    const info = TOKEN_INFO[mint];
    return `${(amt / 10 ** (info?.decimals ?? 6)).toFixed(2)} ${info?.symbol ?? "???"}`;
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "open": return "secondary";
      case "funded": return "outline";
      case "active": return "default";
      case "repaid": return "default";
      case "liquidated": return "destructive";
      default: return "secondary" as const;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Loan Requests</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          New Request
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Post Shielded Loan Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Amount (dUSDC)</label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Collateral Ratio (%)</label>
                <Input type="number" value={collateralRatio} onChange={(e) => setCollateralRatio(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Term (days)</label>
                <Input type="number" value={termDays} onChange={(e) => setTermDays(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Interest Rate (bps)</label>
                <Input type="number" value={interestBps} onChange={(e) => setInterestBps(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Collateral: dUSDT | Borrowing: dUSDC | Metadata stored off-chain
            </p>
            <Button onClick={handleCreate} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Post Loan Request
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : loans.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No borrowing requests yet. Click New Request to get started.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ratio</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-mono">{formatAmount(loan.amount, loan.loan_mint)}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(loan.status) as "default"}>{loan.status}</Badge>
                    </TableCell>
                    <TableCell>{loan.collateral_ratio}%</TableCell>
                    <TableCell>{loan.term_days}d</TableCell>
                    <TableCell>{(loan.interest_rate_bps / 100).toFixed(1)}%</TableCell>
                    <TableCell>
                      {loan.status === "funded" && (
                        <Button size="sm" variant="outline" onClick={() => onPostCollateral(loan)}>
                          Post Collateral
                        </Button>
                      )}
                      {loan.status === "active" && (
                        <Button size="sm" onClick={() => onRepay(loan)}>
                          Repay Privately
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
