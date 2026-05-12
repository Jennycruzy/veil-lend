-- VeilLend Supabase Schema
-- Run this in the Supabase SQL Editor to create the metadata tables.
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

CREATE TABLE IF NOT EXISTS yield_pool_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_pubkey TEXT NOT NULL,
  mint TEXT NOT NULL,
  balance_amount BIGINT NOT NULL DEFAULT 0,
  total_deposited BIGINT NOT NULL DEFAULT 0,
  total_withdrawn BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wallet_pubkey, mint)
);

CREATE INDEX IF NOT EXISTS idx_yield_pool_positions_wallet ON yield_pool_positions(wallet_pubkey);

ALTER TABLE yield_pool_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all yield pool metadata for hackathon" ON yield_pool_positions FOR ALL USING (true) WITH CHECK (true);
