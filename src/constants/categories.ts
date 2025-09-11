export const CATEGORIES = [
  "Roads",
  "Sanitation",
  "StreetLighting",
  "Water",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];
