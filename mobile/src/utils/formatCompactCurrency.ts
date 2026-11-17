/**
 * Format currency into compact notation
 * Examples: 745000 → "745k", 1500000 → "1.5tr", 200000 → "200k"
 */
export const formatCompactCurrency = (amount: number): string => {
  if (amount === 0) return "0đ";

  const absAmount = Math.abs(amount);

  // Trillion (tr - triệu)
  if (absAmount >= 1_000_000) {
    const value = absAmount / 1_000_000;
    if (value >= 10) {
      return `${Math.round(value)}tr`;
    }
    return `${value.toFixed(1).replace(/\.0+$/, "")}tr`;
  }

  // Thousand (k - nghìn)
  if (absAmount >= 1_000) {
    const value = absAmount / 1_000;
    if (value >= 100) {
      return `${Math.round(value)}k`;
    }
    return `${value.toFixed(1).replace(/\.0+$/, "")}k`;
  }

  // Less than 1000
  return `${Math.round(absAmount)}đ`;
};
