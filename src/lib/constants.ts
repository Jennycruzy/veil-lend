// Verified Umbra devnet dummy token mint addresses (official May 2026 announcement)
export const DUSDC_MINT = "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7";
export const DUSDT_MINT = "DXQwBNGgyQ2BzGWxEriJPVmXYFQBsQbXvfvfSNTaJkL6";

export const UMBRA_FAUCET_URL = "https://faucet.umbraprivacy.com";
export const UMBRA_RPC_URL = "https://api.devnet.solana.com";
export const UMBRA_RPC_WS_URL = "wss://api.devnet.solana.com";
export const UMBRA_INDEXER_URL = "https://utxo-indexer.api.umbraprivacy.com";
export const UMBRA_RELAYER_URL = "https://relayer.api.umbraprivacy.com";

export const TOKEN_INFO: Record<string, { symbol: string; name: string; decimals: number }> = {
  [DUSDC_MINT]: { symbol: "dUSDC", name: "Dummy USDC", decimals: 6 },
  [DUSDT_MINT]: { symbol: "dUSDT", name: "Dummy USDT", decimals: 6 },
};
