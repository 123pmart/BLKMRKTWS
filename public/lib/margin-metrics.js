/**
 * @typedef {{ qty?: number, wholesale?: string | number, map?: string | number, lineWholesale?: number, lineMap?: number }} MarginLine
 */

/** @param {MarginLine} line */
export function orderLineMarginPercent(line = {}) {
  const quantity = Math.max(1, Number(line.qty || 1));
  const wholesale = parseCurrency(line.wholesale) || Number(line.lineWholesale || 0) / quantity;
  const retail = parseCurrency(line.map) || Number(line.lineMap || 0) / quantity;
  if (!retail) return null;
  return ((retail - wholesale) / retail) * 100;
}

/** @param {MarginLine} line */
export function formatOrderLineMargin(line = {}) {
  const margin = orderLineMarginPercent(line);
  return margin === null ? "—" : `${margin.toFixed(2)}%`;
}

/** @param {unknown} value */
function parseCurrency(value) {
  const number = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}
