/**
 * The colours an application's branding may set for each theme, in the order
 * the editor shows them, as OAuth Base's `BrandingThemeSchema` names them.
 * Foregrounds for primary and secondary are derived, so they stay readable.
 */
export const BRANDING_COLORS = [
  "primary",
  "secondary",
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "border",
  "input",
  "ring",
] as const;
