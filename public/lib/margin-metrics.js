export function orderLineMargin(line = {}) {
  const quantity = Math.max(1, Number(line.qty || 1));
  const wholesale = parseCurrency(line.wholesale) || Number(line.lineWholesale || 0) / quantity;
  const retail = parseCurrency(line.map) || Number(line.lineMap || 0) / quantity;
  if (!retail) return "—";
  return `${(((retail - wholesale) / retail) * 100).toFixed(2)}%`;
}

function parseCurrency(value) {
  const number = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}
