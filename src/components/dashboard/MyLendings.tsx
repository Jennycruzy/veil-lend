"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TOKEN_INFO } from "@/lib/constants";
import { getLoansByLender } from "@/lib/loans";
import type { Loan } from "@/lib/types";
import { Loader2, TrendingUp } from "lucide-react";

interface MyLendingsProps {
  onLiquidate: (loan: Loan) => void;
}

export function MyLendings({ onLiquidate }: MyLendingsProps) {
  const { publicKey } = useWallet();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLoans = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const data = await getLoansByLender(publicKey.toBase58());
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

  const formatAmount = (amt: number, mint: string) => {
    const info = TOKEN_INFO[mint];
    return `${(amt / 10 ** (info?.decimals ?? 6)).toFixed(2)} ${info?.symbol ?? "???"}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">You have not funded any loans yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Browse open requests and fund privately with Umbra.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Borrower</TableHead>
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
                  <Badge>{loan.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{loan.borrower_pubkey.slice(0, 8)}...</TableCell>
                <TableCell>{loan.collateral_ratio}%</TableCell>
                <TableCell>{loan.term_days}d</TableCell>
                <TableCell>{(loan.interest_rate_bps / 100).toFixed(1)}%</TableCell>
                <TableCell>
                  {loan.status === "active" && (
                    <Button size="sm" variant="destructive" onClick={() => onLiquidate(loan)}>
                      Check Liquidation
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
