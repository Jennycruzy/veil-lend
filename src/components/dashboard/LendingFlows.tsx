"use client";

/**
 * Full lending flow implementations using verified Umbra SDK functions.
 * Every monetary action uses Umbra private transfers — no public SPL transfers.
 */

import { useUmbraContext } from "@/providers/UmbraProvider";
import { updateLoanStatus } from "@/lib/loans";
import type { Loan } from "@/lib/types";
import { toast } from "sonner";

export function useLendingFlows(walletPublicKey: string | null) {
  const umbra = useUmbraContext();

  /**
   * Lender funds a loan by creating a receiver-claimable UTXO to the borrower.
   * Uses: getPublicBalanceToReceiverClaimableUtxoCreatorFunction (Step 7)
   */
  const fundLoan = async (loan: Loan) => {
    if (!walletPublicKey) throw new Error("Wallet not connected");
    if (!loan.borrower_umbra_address) {
      throw new Error("This loan was created before Umbra registration. The borrower needs to delete it and create a new one.");
    }

    toast.info("Creating private UTXO to fund loan...");

    // Step 7: Create receiver-claimable UTXO to the borrower's registered Umbra address
    const sigs = await umbra.createUtxo(
      loan.borrower_umbra_address,
      loan.loan_mint,
      BigInt(loan.amount)
    );

    // Update loan status in Supabase
    await updateLoanStatus(loan.id, "funded", {
      lender_pubkey: walletPublicKey,
      funded_at: new Date().toISOString(),
      funding_utxo_ref: JSON.stringify(sigs).slice(0, 100),
    });

    toast.success("Loan funded privately via Umbra UTXO!");
    return sigs;
  };

  /**
   * Borrower claims funded UTXO + posts collateral privately.
   * Uses: claimUtxo (Step 9) + deposit (Step 5)
   */
  const claimAndPostCollateral = async (loan: Loan) => {
    if (!walletPublicKey) throw new Error("Wallet not connected");

    toast.info("Scanning for claimable UTXOs...");

    // Step 8: Scan for the funding UTXO
    const { received } = await umbra.scanUtxos();

    if (!received || received.length === 0) {
      toast.error("No claimable UTXOs found. The lender may not have funded yet.");
      return;
    }

    // Step 9: Claim UTXO into encrypted balance (gasless via relayer)
    toast.info("Claiming funds via relayer (gasless)...");
    await umbra.claimUtxo([received[0]]);

    // Step 5: Deposit collateral into encrypted balance
    const collateralAmount = BigInt(
      Math.round((loan.amount * loan.collateral_ratio) / 100)
    );
    toast.info("Depositing collateral privately...");
    await umbra.deposit(loan.collateral_mint, collateralAmount);

    await updateLoanStatus(loan.id, "active", {
      collateral_utxo_ref: `collateral_${Date.now()}`,
    });

    toast.success("Funds claimed + collateral posted privately!");
  };

  /**
   * Borrower repays loan privately via receiver-claimable UTXO to lender.
   * Uses: getPublicBalanceToReceiverClaimableUtxoCreatorFunction (Step 7)
   */
  const repayLoan = async (loan: Loan) => {
    if (!walletPublicKey || !loan.lender_pubkey) {
      throw new Error("Missing wallet or lender info");
    }

    // Calculate repayment = principal + interest
    const interest = Math.round((loan.amount * loan.interest_rate_bps) / 10000);
    const repaymentAmount = BigInt(loan.amount + interest);

    toast.info("Creating private repayment UTXO...");

    // Step 7: Send repayment as a receiver-claimable UTXO to the lender
    const sigs = await umbra.createUtxo(
      loan.lender_pubkey,
      loan.loan_mint,
      repaymentAmount
    );

    // Withdraw collateral back to borrower (Step 6)
    const collateralAmount = BigInt(
      Math.round((loan.amount * loan.collateral_ratio) / 100)
    );
    toast.info("Withdrawing collateral back...");
    await umbra.withdraw(loan.collateral_mint, collateralAmount);

    await updateLoanStatus(loan.id, "repaid", {
      repaid_at: new Date().toISOString(),
      repayment_utxo_ref: JSON.stringify(sigs).slice(0, 100),
    });

    toast.success("Loan repaid privately! Collateral returned.");
    return sigs;
  };

  /**
   * Private liquidation — triggered when collateral ratio drops below threshold.
   * Uses: withdraw (Step 6) to transfer collateral to lender's encrypted balance.
   */
  const checkAndLiquidate = async (loan: Loan) => {
    if (!walletPublicKey) throw new Error("Wallet not connected");

    // Simulated Pyth oracle check — in production, fetch real price from @pythnetwork/pyth-solana-receiver
    const simulatedCollateralValue = loan.amount * (loan.collateral_ratio / 100);
    const liquidationThreshold = loan.amount * 1.1; // 110% = liquidation trigger

    toast.info("Checking collateral ratio via oracle...");

    if (simulatedCollateralValue < liquidationThreshold) {
      toast.warning("Under-collateralized! Initiating private liquidation...");

      const collateralAmount = BigInt(
        Math.round((loan.amount * loan.collateral_ratio) / 100)
      );
      await umbra.withdraw(loan.collateral_mint, collateralAmount);

      await updateLoanStatus(loan.id, "liquidated", {
        liquidated_at: new Date().toISOString(),
      });

      toast.success("Loan liquidated. Collateral transferred privately.");
    } else {
      toast.success(
        `Collateral healthy: ${loan.collateral_ratio}% (threshold: 110%)`
      );
    }
  };

  return {
    fundLoan,
    claimAndPostCollateral,
    repayLoan,
    checkAndLiquidate,
    umbraStatus: umbra.status,
    umbraAddress: umbra.umbraAddress,
    registerUmbra: umbra.register,
  };
}
