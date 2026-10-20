const TAX_RATE = 0.08;

/** Mirrors Sauce Demo: 8% tax rounded to cents, then added to the item total. */
export function sauceTotals(prices: readonly number[]): {
  subtotal: string;
  tax: string;
  total: string;
} {
  const subtotal = prices.reduce((sum, price) => sum + price, 0);
  const tax = (subtotal * TAX_RATE).toFixed(2);
  const total = (subtotal + Number(tax)).toFixed(2);

  return {
    subtotal: subtotal.toFixed(2),
    tax,
    total,
  };
}
