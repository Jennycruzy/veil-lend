-- VeilLend Supabase Schema
-- Run this in the Supabase SQL Editor to create the loans table.
-- NEVER store private keys or Umbra sensitive data here — only public metadata.

CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_pubkey TEXT NOT NULL,
  borrower_umbra_address TEXT NOT NULL,
  lender_pubkey TEXT,
  amount BIGINT NOT NULL,
  collateral_mint TEXT NOT NULL,
  loan_mint TEXT NOT NULL,
  collateral_ratio INTEGER NOT NULL DEFAULT 150,
  term_days INTEGER NOT NULL DEFAULT 30,
  interest_rate_bps INTEGER NOT NULL DEFAULT 500,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'funded', 'active', 'repaid', 'liquidated', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  funded_at TIMESTAMPTZ,
  repaid_at TIMESTAMPTZ,
  liquidated_at TIMESTAMPTZ,
  funding_utxo_ref TEXT,
  collateral_utxo_ref TEXT,
  repayment_utxo_ref TEXT
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower_pubkey);
CREATE INDEX IF NOT EXISTS idx_loans_lender ON loans(lender_pubkey);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

-- Enable Row Level Security (allow all for hackathon demo — tighten for production)
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for hackathon" ON loans FOR ALL USING (true) WITH CHECK (true);
