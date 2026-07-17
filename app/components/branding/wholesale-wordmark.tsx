export function WholesaleWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`wholesale-wordmark${compact ? " wholesale-wordmark--compact" : ""}`} aria-label="BLACKMARKET WHOLESALE">
      <span>BLACKMARKET</span>
      <strong>Wholesale</strong>
    </span>
  );
}
