/** What one credit is worth at the base price. Matches CreditValueUSD on the server. */
export const CREDIT_USD = 0.05;

/** The groups the pricing page shows, in order. Anything unlisted lands in "Other". */
export const SETTING_GROUPS: ReadonlyArray<{ readonly title: string; readonly keys: readonly string[] }> = [
  { title: "Free plan", keys: ["signup_grant", "free_price_multiplier_pct", "free_searches_per_day", "free_search_results"] },
  { title: "Pro plan", keys: ["pro_price_cents", "pro_limit_five_hour", "pro_limit_week", "overage_default_cap"] },
  { title: "Everyone", keys: ["daily_user_limit"] },
  { title: "Low balance warnings", keys: ["alert_kie_credits", "alert_apify_usd"] },
  { title: "Tax", keys: ["stripe_tax_enabled"] },
];
