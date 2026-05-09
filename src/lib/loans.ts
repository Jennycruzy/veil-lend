import { supabase } from "./supabase";
import type { Loan, LoanStatus } from "./types";

// --- CRUD operations for loan metadata ---
// All data here is public off-chain metadata. No private keys or Umbra secrets.

export async function createLoan(params: {
  borrower_pubkey: string;
  borrower_umbra_address: string;
  amount: number;
  collateral_mint: string;
  loan_mint: string;
  collateral_ratio: number;
  term_days: number;
  interest_rate_bps: number;
}): Promise<Loan> {
  const { data, error } = await supabase
    .from("loans")
    .insert({ ...params, status: "open" as LoanStatus })
    .select()
    .single();
  if (error) throw new Error(`Failed to create loan: ${error.message}`);
  return data as Loan;
}

export async function getOpenLoans(): Promise<Loan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch loans: ${error.message}`);
  return (data ?? []) as Loan[];
}

export async function getLoansByBorrower(pubkey: string): Promise<Loan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("borrower_pubkey", pubkey)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch borrower loans: ${error.message}`);
  return (data ?? []) as Loan[];
}

export async function getLoansByLender(pubkey: string): Promise<Loan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("lender_pubkey", pubkey)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch lender loans: ${error.message}`);
  return (data ?? []) as Loan[];
}

export async function updateLoanStatus(
  loanId: string,
  status: LoanStatus,
  extra?: Partial<Pick<Loan, "lender_pubkey" | "funded_at" | "repaid_at" | "liquidated_at" | "funding_utxo_ref" | "collateral_utxo_ref" | "repayment_utxo_ref">>
): Promise<Loan> {
  const { data, error } = await supabase
    .from("loans")
    .update({ status, ...extra })
    .eq("id", loanId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update loan: ${error.message}`);
  return data as Loan;
}

export async function getLoanById(loanId: string): Promise<Loan | null> {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loanId)
    .single();
  if (error) return null;
  return data as Loan;
}
