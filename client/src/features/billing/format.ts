/** 1000 and "usd" become "$10.00". */
export function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

/** What one credit costs in this pack, for comparing packs. */
export function perCredit(cents: number, credits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(cents / 100 / credits);
}
