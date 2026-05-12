import { supabase } from "./supabase";
import type { YieldPoolPosition } from "./types";

export async function getYieldPoolPosition(
  walletPubkey: string,
  mint: string
): Promise<YieldPoolPosition | null> {
  const { data, error } = await supabase
    .from("yield_pool_positions")
    .select("*")
    .eq("wallet_pubkey", walletPubkey)
    .eq("mint", mint)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch yield pool position: ${error.message}`);
  }

  return data as YieldPoolPosition;
}

export async function increaseYieldPoolPosition(params: {
  wallet_pubkey: string;
  mint: string;
  amount: number;
}): Promise<YieldPoolPosition> {
  const current = await getYieldPoolPosition(params.wallet_pubkey, params.mint);
  const now = new Date().toISOString();

  if (!current) {
    const { data, error } = await supabase
      .from("yield_pool_positions")
      .insert({
        wallet_pubkey: params.wallet_pubkey,
        mint: params.mint,
        balance_amount: params.amount,
        total_deposited: params.amount,
        total_withdrawn: 0,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create yield pool position: ${error.message}`);
    return data as YieldPoolPosition;
  }

  const { data, error } = await supabase
    .from("yield_pool_positions")
    .update({
      balance_amount: current.balance_amount + params.amount,
      total_deposited: current.total_deposited + params.amount,
      updated_at: now,
    })
    .eq("id", current.id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update yield pool position: ${error.message}`);
  return data as YieldPoolPosition;
}

export async function decreaseYieldPoolPosition(params: {
  wallet_pubkey: string;
  mint: string;
  amount: number;
}): Promise<YieldPoolPosition> {
  const current = await getYieldPoolPosition(params.wallet_pubkey, params.mint);
  if (!current || current.balance_amount < params.amount) {
    throw new Error("Insufficient persisted pool balance for this withdrawal.");
  }

  const { data, error } = await supabase
    .from("yield_pool_positions")
    .update({
      balance_amount: Math.max(0, current.balance_amount - params.amount),
      total_withdrawn: current.total_withdrawn + params.amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update yield pool position: ${error.message}`);
  return data as YieldPoolPosition;
}
