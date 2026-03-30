/**
 * @typedef {Object} Order
 * @property {string} symbol
 * @property {number} price
 * @property {number} volume
 * @property {string} side
 */

// Pre-defined hot list to test fast-path lookups
const HOT_SYMBOLS = new Set(['/GC', '/SI']);

// Mock limit for risk management simulation
const MAX_NOTIONAL = 10_000_000;

/**
 * Validates an order.
 * This function is the target for V8 optimization.
 * 
 * @param {Order} order 
 * @returns {boolean}
 */
export function validateOrder(order) {
  if (!order) return false;

  // 1. Input validation
  if (!order.symbol || typeof order.symbol !== 'string' || order.symbol.length === 0) return false;
  if (typeof order.price !== 'number' || order.price <= 0) return false;
  if (typeof order.volume !== 'number' || order.volume <= 0) return false;
  if (order.side !== 'BUY' && order.side !== 'SELL') return false;

  // 2. Return here if we only want input validation:
  // In this case, TurboFan will optimize the validateOrder away completely
  // return true

  // 3. Some extra room for V8 improvement:

  // High-Performance Lookup (TurboFan does some Set optimization)
  if (!HOT_SYMBOLS.has(order.symbol)) return false;

  // Notional Calculation (Float64 math can be optimized)
  const notional = order.price * order.volume;
  if ((notional > MAX_NOTIONAL)) return false;

  // Simulated Risk-Score (Arithmetic loop can be optimized)
  // This loop increases the "complexity" so V8's TurboFan has more to optimize
  let riskScore = 0;
  for (let i = 0; i < 10; i++) {
    riskScore += (notional / (i + 1.1)) * 0.01;
  }

  return (riskScore < MAX_NOTIONAL);
}

/**
 * Factory for creating monomorphic order objects.
 */
export function createOrder(symbol, price, volume, side) {
  // TurboFan likes seeing all objects come from the same function, helps it optimize faster
  return {
    symbol,
    price,
    volume,
    side
  };
}
