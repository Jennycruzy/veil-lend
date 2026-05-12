"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUmbraContext } from "@/providers/UmbraProvider";
import { DUSDC_MINT } from "@/lib/constants";
import { getOpenLoans } from "@/lib/loans";
import {
  decreaseYieldPoolPosition,
  getYieldPoolPosition,
  increaseYieldPoolPosition,
} from "@/lib/yield-pool";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Vault } from "lucide-react";

export function YieldPool() {
  const umbra = useUmbraContext();
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount] = useState("50");
  const [depositing, setDepositing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [loadingPosition, setLoadingPosition] = useState(false);
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

  useEffect(() => {
    if (!publicKey) {
      setPoolBalance(0);
      return;
    }

    const loadPosition = async () => {
      setLoadingPosition(true);
      try {
        const position = await getYieldPoolPosition(publicKey.toBase58(), DUSDC_MINT);
        setPoolBalance((position?.balance_amount ?? 0) / 1_000_000);
      } catch {
        setPoolBalance(0);
      } finally {
        setLoadingPosition(false);
      }
    };

    queueMicrotask(() => void loadPosition());
  }, [publicKey]);

  const getWalletDusdcBalance = async () => {
    if (!publicKey) return BigInt(0);

    const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      mint: new PublicKey(DUSDC_MINT),
    });

    return accounts.value.reduce((total, account) => {
      const rawAmount = account.account.data.parsed.info.tokenAmount.amount as string;
      return total + BigInt(rawAmount);
    }, BigInt(0));
  };

  const formatPoolError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("0x1") || message.toLowerCase().includes("insufficient")) {
      return "Transaction failed because the wallet does not have enough devnet dUSDC or SOL for this action.";
    }

    if (message.length > 180) {
      return "Transaction failed. Check that the wallet is on devnet, registered with Umbra, and has enough encrypted balance plus SOL for fees.";
    }

    return message;
  };

  const validateReadyState = async () => {
    if (!publicKey) throw new Error("Connect wallet first.");
    const walletAddress = publicKey.toBase58();
    if (umbra.status === "error") throw new Error(umbra.error ?? "Umbra is not ready.");
    if (umbra.status === "connecting" || umbra.status === "registering") {
      throw new Error("Umbra is still initializing. Try again when the status shows connected or registered.");
    }

    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new Error("Enter a valid dUSDC amount.");
    }

    const solBalance = await connection.getBalance(publicKey);
    if (solBalance < 5_000_000) {
      throw new Error("This action needs a small amount of devnet SOL for transaction fees.");
    }

    return { parsedAmount, walletAddress };
  };

  const handleDeposit = async () => {
    setDepositing(true);
    try {
      const { parsedAmount, walletAddress } = await validateReadyState();
      const amountBase = BigInt(Math.round(parsedAmount * 1_000_000));
      const dusdcBalance = await getWalletDusdcBalance();
      if (dusdcBalance < amountBase) {
        throw new Error(`Insufficient dUSDC balance. Need ${amount} dUSDC in this wallet before depositing.`);
      }

      await umbra.deposit(DUSDC_MINT, amountBase);
      const position = await increaseYieldPoolPosition({
        wallet_pubkey: walletAddress,
        mint: DUSDC_MINT,
        amount: Number(amountBase),
      });
      setPoolBalance(position.balance_amount / 1_000_000);
      toast.success(`Deposited ${amount} dUSDC into private yield pool!`);
    } catch (e) {
      toast.error(formatPoolError(e));
    } finally {
      setDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      const { parsedAmount, walletAddress } = await validateReadyState();
      if (parsedAmount > poolBalance) {
        throw new Error(`Insufficient pool balance. You have ${poolBalance.toFixed(2)} dUSDC available.`);
      }

      const amountBase = BigInt(Math.round(parsedAmount * 1_000_000));
      await umbra.withdraw(walletAddress, DUSDC_MINT, amountBase);
      const position = await decreaseYieldPoolPosition({
        wallet_pubkey: walletAddress,
        mint: DUSDC_MINT,
        amount: Number(amountBase),
      });
      setPoolBalance(position.balance_amount / 1_000_000);
      toast.success(`Withdrew ${amount} dUSDC from private yield pool!`);
    } catch (e) {
      toast.error(formatPoolError(e));
    } finally {
      setWithdrawing(false);
    }
  };

  const actionDisabled = depositing || withdrawing;

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
                <p className="text-2xl font-bold">
                  {loadingPosition ? "--" : poolBalance.toFixed(2)}
                </p>
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (dUSDC)"
              className="flex-1"
            />
            <Button onClick={handleDeposit} disabled={actionDisabled}>
              {depositing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowDownToLine className="h-4 w-4 mr-2" />
              )}
              Deposit Privately
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={actionDisabled || poolBalance <= 0}
              variant="outline"
            >
              {withdrawing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowUpFromLine className="h-4 w-4 mr-2" />
              )}
              Withdraw
            </Button>
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Badge variant="outline">How it works</Badge>
            </h3>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Your dUSDC is deposited into a private encrypted balance</li>
              <li>The pool auto-matches your funds to open loan requests from the marketplace</li>
              <li>Borrowers repay via private UTXOs and interest accrues to your balance</li>
              <li>Withdraw anytime back to your public wallet</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
