// ============================================================
// AICOIN PRICING CONFIGURATION
// ============================================================

export const INITIAL_PRICE = {
  usd: 0.001,
  aicPerPool: 100_000_000,
  usdcPerPool: 100_000,
};

export const POOL_CONFIG = {
  fee: 3000,
  tickLower: -887220,
  tickUpper: 887220,
};

export function calculatePrice(aicReserve: number, usdcReserve: number): number {
  if (aicReserve === 0) return 0;
  return usdcReserve / aicReserve;
}

export function formatAICPrice(priceInUSD: number): string {
  if (priceInUSD >= 1) return `$${priceInUSD.toFixed(2)}`;
  if (priceInUSD >= 0.01) return `$${priceInUSD.toFixed(4)}`;
  return `$${priceInUSD.toFixed(6)}`;
}