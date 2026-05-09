export type LoanStatus =
  | "open" // borrower posted request, awaiting lender
  | "funded" // lender sent UTXO
  | "active" // borrower claimed funds + posted collateral
  | "repaid" // borrower repaid privately
  | "liquidated" // under-collateralized, liquidation triggered
  | "expired"; // term passed without action

export interface Loan {
  id: string;
  borrower_pubkey: string;
  borrower_umbra_address: string;
  lender_pubkey: string | null;
  amount: number; // in token base units (e.g., 1_000_000 = 1 dUSDC)
  collateral_mint: string; // dUSDC or dUSDT mint address
  loan_mint: string; // token being borrowed
  collateral_ratio: number; // e.g., 150 means 150%
  term_days: number;
  interest_rate_bps: number; // basis points, e.g., 500 = 5%
  status: LoanStatus;
  created_at: string;
  funded_at: string | null;
  repaid_at: string | null;
  liquidated_at: string | null;
  // Umbra UTXO reference (opaque identifier, NOT a private key)
  funding_utxo_ref: string | null;
  collateral_utxo_ref: string | null;
  repayment_utxo_ref: string | null;
}
