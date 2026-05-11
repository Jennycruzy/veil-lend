"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUmbraContext } from "@/providers/UmbraProvider";
import { DUSDC_MINT } from "@/lib/constants";
import { getOpenLoans } from "@/lib/loans";
import { toast } from "sonner";
import { Vault, TrendingUp, Loader2 } from "lucide-react";

export function YieldPool() {
  const umbra = useUmbraContext();
  const [amount, setAmount] = useState("50");
  const [depositing, setDepositing] = useState(false);
  const [poolBalance, setPoolBalance] = useState(0);
  const [openLoanCount, setOpenLoanCount] = useState(0);
  const [avgInterestBps, setAvgInterestBps] = useState(0);

  const loadPoolStats = useCallback(async () => {
    try {
      const loans = await getOpenLoans();
      setOpenLoanCount(loans.length);
      if (loans.length > 0) {
        const totalBps = loans.reduce((sum, l) => sum + l.interest_rate_bps, 0);
        setAvgInterestBps(Math.round(totalBps / loans.length));
      }
    } catch {
      // Supabase not configured
    }
  }, []);

  // Load real pool stats from Supabase.
  useEffect(() => {
    queueMicrotask(() => void loadPoolStats());
  }, [loadPoolStats]);

  const handleDeposit = async () => {
    setDepositing(true);
    try {
      // Step 5: Deposit into encrypted balance (this is the private yield pool)
      const amountBase = BigInt(Math.round(parseFloat(amount) * 1_000_000));
      await umbra.deposit(DUSDC_MINT, amountBase);
      setPoolBalance((prev) => prev + parseFloat(amount));
      toast.success(`Deposited ${amount} dUSDC into private yield pool!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deposit failed");
    } finally {
      setDepositing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vault className="h-5 w-5" />
            Private Yield Pool
          </CardTitle>
          <CardDescription>
            Deposit dUSDC into a shared encrypted pool that auto-matches small loans.
            All deposits stay private via Umbra encrypted balances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{poolBalance.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Your Pool Balance (dUSDC)</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-green-400">
                  {avgInterestBps > 0 ? `${(avgInterestBps / 100).toFixed(1)}%` : "--"}
                </p>
                <p className="text-xs text-muted-foreground">Avg Loan Rate (from marketplace)</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{openLoanCount}</p>
                <p className="text-xs text-muted-foreground">Open Loan Requests</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (dUSDC)"
              className="flex-1"
            />
            <Button onClick={handleDeposit} disabled={depositing}>
              {depositing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <TrendingUp className="h-4 w-4 mr-2" />
              )}
              Deposit Privately
            </Button>
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Badge variant="outline">How it works</Badge>
            </h3>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Your dUSDC is deposited into an Umbra encrypted balance (Step 5 of SDK)</li>
              <li>The pool auto-matches your funds to open loan requests from the marketplace</li>
              <li>Borrowers repay via private UTXOs — interest accrues to your encrypted balance</li>
              <li>Withdraw anytime back to your public wallet (Step 6 of SDK)</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
