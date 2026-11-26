/** Where the video is aimed, for the "Country" choice. Anything not listed can be typed as Custom. */
export const COUNTRIES: readonly { readonly value: string; readonly label: string }[] = [
  "Argentina", "Australia", "Austria", "Bangladesh", "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia",
  "Czechia", "Denmark", "Egypt", "Ethiopia", "Finland", "France", "Germany", "Ghana", "Greece", "Hong Kong",
  "India", "Indonesia", "Ireland", "Israel", "Italy", "Japan", "Kenya", "Malaysia", "Mexico", "Morocco",
  "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Saudi Arabia", "Senegal", "Singapore", "South Africa", "South Korea", "Spain", "Sweden",
  "Switzerland", "Taiwan", "Tanzania", "Thailand", "Turkey", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Vietnam",
].map((name) => ({ value: name, label: name }));
