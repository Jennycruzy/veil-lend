"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TOKEN_INFO } from "@/lib/constants";
import { getOpenLoans } from "@/lib/loans";
import type { Loan } from "@/lib/types";
import { Eye, FileKey, Loader2, LockKeyhole, ShieldCheck, UserRoundCheck, Vault } from "lucide-react";

interface BrowseLoansProps {
  onFundLoan: (loan: Loan) => void;
}

export function BrowseLoans({ onFundLoan }: BrowseLoansProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const loadLoans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOpenLoans();
      setLoans(data);
    } catch {
      // Off-chain metadata store not configured — show empty state
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadLoans());
  }, [loadLoans]);

  const formatAmount = (amount: number, mint: string) => {
    const info = TOKEN_INFO[mint];
    const decimals = info?.decimals ?? 6;
    return `${(amount / 10 ** decimals).toFixed(2)} ${info?.symbol ?? "???"}`;
  };

  const getDealScore = (loan: Loan) => {
    const ratioBuffer = Math.max(0, loan.collateral_ratio - 110);
    const termPenalty = Math.max(0, loan.term_days - 30);
    const rateSignal = Math.min(70, loan.interest_rate_bps / 20);
    return Math.max(420, Math.min(840, Math.round(610 + ratioBuffer * 2 + rateSignal - termPenalty)));
  };

  const selectedScore = selectedLoan ? getDealScore(selectedLoan) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No open loan requests yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Switch to My Borrowings to create one, or connect the off-chain metadata store in .env.local.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Open Loan Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Collateral</TableHead>
                <TableHead>Ratio</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-mono">{formatAmount(loan.amount, loan.loan_mint)}</TableCell>
                  <TableCell>{TOKEN_INFO[loan.collateral_mint]?.symbol ?? "?"}</TableCell>
                  <TableCell>{loan.collateral_ratio}%</TableCell>
                  <TableCell>{loan.term_days}d</TableCell>
                  <TableCell>{(loan.interest_rate_bps / 100).toFixed(1)}%</TableCell>
                  <TableCell className="font-mono text-xs">{loan.borrower_pubkey.slice(0, 8)}...</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedLoan(loan)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Deal Room
                      </Button>
                      <Button size="sm" onClick={() => onFundLoan(loan)}>
                        <LockKeyhole className="h-4 w-4 mr-1" />
                        Fund
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedLoan)} onOpenChange={(open) => !open && setSelectedLoan(null)}>
        {selectedLoan && (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Vault className="h-5 w-5 text-primary" />
                Private Deal Room
              </DialogTitle>
              <DialogDescription>
                Review masked borrower data, scoped reputation, and the private settlement route before funding.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Borrower</span>
                  <Badge variant="outline">
                    <UserRoundCheck className="h-3 w-3" />
                    masked
                  </Badge>
                </div>
                <p className="font-mono text-sm">{selectedLoan.borrower_pubkey.slice(0, 10)}...{selectedLoan.borrower_pubkey.slice(-6)}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground">VeilScore</p>
                    <p className="text-2xl font-semibold">{selectedScore}</p>
                  </div>
                  <div className="rounded-md bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground">Band</p>
                    <p className="text-2xl font-semibold">{selectedScore && selectedScore > 720 ? "Prime" : "Verified"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Requested</p>
                    <p className="font-mono">{formatAmount(selectedLoan.amount, selectedLoan.loan_mint)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Collateral</p>
                    <p>{selectedLoan.collateral_ratio}% {TOKEN_INFO[selectedLoan.collateral_mint]?.symbol ?? "token"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Term</p>
                    <p>{selectedLoan.term_days} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rate</p>
                    <p>{(selectedLoan.interest_rate_bps / 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Privacy receipt
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <span>Counterparty masked</span>
                    <span>Funds via Umbra UTXO</span>
                    <span>Claim via relayer</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md border bg-background/40 p-3 text-xs text-muted-foreground">
                  <FileKey className="h-4 w-4 text-primary" />
                  Passport proof can be requested before funding without exposing full wallet history.
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedLoan(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  onFundLoan(selectedLoan);
                  setSelectedLoan(null);
                }}
              >
                <LockKeyhole className="h-4 w-4 mr-2" />
                Fund Privately
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
