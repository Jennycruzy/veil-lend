"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TOKEN_INFO, DUSDC_MINT } from "@/lib/constants";
import { getOpenLoans } from "@/lib/loans";
import type { Loan } from "@/lib/types";
import { Loader2, Eye } from "lucide-react";

interface BrowseLoansProps {
  onFundLoan: (loan: Loan) => void;
}

export function BrowseLoans({ onFundLoan }: BrowseLoansProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const data = await getOpenLoans();
      setLoans(data);
    } catch {
      // Supabase not configured — show empty state
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, mint: string) => {
    const info = TOKEN_INFO[mint];
    const decimals = info?.decimals ?? 6;
    return `${(amount / 10 ** decimals).toFixed(2)} ${info?.symbol ?? "???"}`;
  };

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
            Switch to "My Borrowings" to create one, or connect Supabase in .env.local.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
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
                  <Button size="sm" onClick={() => onFundLoan(loan)}>
                    Fund Privately
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
