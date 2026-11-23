/**
 * Common target markets for social video discovery.
 * Prioritizes requested Southeast Asian and global hubs, with Other for custom typing.
 */
export const TARGET_COUNTRIES = [
  "Worldwide",
  "Singapore",
  "Malaysia",
  "Thailand",
  "Vietnam",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Indonesia",
  "Philippines",
  "India",
  "Japan",
  "South Korea",
  "Germany",
  "France",
  "Nigeria",
  "Kenya",
  "South Africa",
  "United Arab Emirates",
  "Saudi Arabia",
  "Brazil",
  "Mexico",
  "Other",
] as const;

export const OTHER_COUNTRY = "Other";

export function resolveCountry(choice: string, custom: string): string {
  if (choice === OTHER_COUNTRY) {
    return custom.trim() || "Worldwide";
  }
  return choice || "Worldwide";
}
