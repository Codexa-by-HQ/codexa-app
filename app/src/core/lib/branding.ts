/**
 * An OAuth application's branding, applied to the whole UI.
 *
 * OAuth stores branding on each application: a logo for light and dark mode,
 * colour tokens for each mode, a radius and a font. Empty fields inherit the
 * Codexa emerald theme. Branding becomes one stylesheet with a light rule and
 * a dark rule, so switching theme is pure CSS and needs no re-render.
 *
 * The stylesheet is constructed rather than injected as a <style> element,
 * because the CSP allows only same origin styles and does not cover the
 * CSSOM. Every value is checked here again before it reaches CSS, so stored
 * data can never break out of a declaration.
 */

/** The colour tokens OAuth accepts, each mapped to its CSS variable. */
const COLOR_TOKENS = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  border: "--border",
  input: "--input",
  ring: "--ring",
  primary: "--primary",
  secondary: "--secondary",
} as const;

type ColorToken = keyof typeof COLOR_TOKENS;

export type BrandingTheme = Partial<Record<ColorToken, string>> & { radiusPx?: number };

export type Branding = {
  logo?: string;
  darkLogo?: string;
  lightTheme?: BrandingTheme;
  darkTheme?: BrandingTheme;
  fontFamily?: string;
};

/** The application a page belongs to, as OAuth reports it. */
export type BrandedApplication = { name: string; branding?: Branding };

const HEX = /^#[0-9a-f]{6}$/i;
/** The same rule OAuth validates with, which admits no CSS syntax. */
const FONT_FAMILY = /^[a-zA-Z][a-zA-Z0-9 ,'-]*$/;

/** WCAG relative luminance of a six digit hex colour. */
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/**
 * Text that stays readable on `hex`. OAuth stores no foreground for primary
 * or secondary, so it is chosen by whichever of near black or white contrasts
 * more.
 */
function readableOn(hex: string): string {
  const light = luminance(hex);
  return (light + 0.05) / 0.05 > 1.05 / (light + 0.05) ? "#0a0a0a" : "#ffffff";
}

/** The CSS declarations for one mode, including the tokens derived from it. */
function declarations(theme: BrandingTheme): string[] {
  const color = (token: ColorToken) => {
    const value = theme[token];
    return typeof value === "string" && HEX.test(value) ? value : undefined;
  };
  const out: string[] = [];

  for (const [token, variable] of Object.entries(COLOR_TOKENS)) {
    const value = color(token as ColorToken);
    if (value) out.push(`${variable}: ${value}`);
  }

  const primary = color("primary");
  if (primary) {
    const onPrimary = readableOn(primary);
    out.push(
      `--primary-foreground: ${onPrimary}`,
      `--sidebar-primary: var(--primary)`,
      `--sidebar-primary-foreground: ${onPrimary}`,
      // The brand panel, its halftone artwork and the frame follow the brand colour.
      `--panel: color-mix(in oklch, var(--primary) 14%, var(--background))`,
      `--panel-border: color-mix(in oklch, var(--primary) 30%, var(--background))`,
      `--panel-pattern: color-mix(in oklch, var(--primary) 20%, transparent)`,
      `--panel-pattern-shine: color-mix(in oklch, var(--primary) 50%, transparent)`,
      `--frame: color-mix(in oklch, var(--primary) 12%, color-mix(in oklch, var(--foreground) 8%, var(--background)))`,
      `--chart-1: color-mix(in oklch, var(--primary) 40%, var(--background))`,
      `--chart-2: color-mix(in oklch, var(--primary) 70%, var(--background))`,
      `--chart-3: var(--primary)`,
      `--chart-4: color-mix(in oklch, var(--primary) 75%, var(--foreground))`,
      `--chart-5: color-mix(in oklch, var(--primary) 50%, var(--foreground))`,
    );
    if (!color("ring")) out.push(`--ring: color-mix(in oklch, var(--primary) 55%, transparent)`);
  }
  const secondary = color("secondary");
  if (secondary) out.push(`--secondary-foreground: ${readableOn(secondary)}`);

  // The sidebar mirrors whichever base tokens the brand sets.
  if (color("background")) {
    out.push(`--sidebar: color-mix(in oklch, var(--foreground) 3%, var(--background))`);
  }
  if (color("foreground")) out.push(`--sidebar-foreground: var(--foreground)`);
  if (color("accent")) out.push(`--sidebar-accent: var(--accent)`);
  if (color("accentForeground")) out.push(`--sidebar-accent-foreground: var(--accent-foreground)`);
  if (color("border")) out.push(`--sidebar-border: var(--border)`);
  if (primary || color("ring")) out.push(`--sidebar-ring: var(--ring)`);

  const radius = theme.radiusPx;
  if (Number.isInteger(radius) && radius! >= 0 && radius! <= 24) out.push(`--radius: ${radius}px`);

  return out;
}

/** The stylesheet text for a branding, empty when it changes nothing. */
export function brandingCss(branding: Branding): string {
  const rules: string[] = [];
  const rule = (selector: string, lines: string[]) => {
    if (lines.length) rules.push(`${selector} {\n  ${lines.join(";\n  ")};\n}`);
  };
  // Two classes outrank the theme's single `:root` and `.dark` selectors.
  rule(":root:not(.dark)", branding.lightTheme ? declarations(branding.lightTheme) : []);
  rule(":root.dark", branding.darkTheme ? declarations(branding.darkTheme) : []);

  const font = branding.fontFamily?.trim();
  if (font && FONT_FAMILY.test(font)) {
    // Only fonts the device already has can load, since the CSP allows no remote fonts.
    rule(":root", [`font-family: ${font}, 'Figtree Variable', sans-serif`]);
  }
  return rules.join("\n");
}

/**
 * A logo URL the page can show: HTTPS, or this origin. The CSP blocks plain
 * HTTP images from elsewhere, so those fall back to the Codexa leaf.
 */
export function logoUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, location.origin);
    return url.protocol === "https:" || url.origin === location.origin ? url.href : undefined;
  } catch {
    return undefined;
  }
}

let current: BrandedApplication | null = null;
let applied = "";
let sheet: CSSStyleSheet | null = null;
const listeners = new Set<() => void>();

/**
 * The branded application for the page, as an external store. Loaders set it,
 * and components read it with useBranding.
 */
export const brandingStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: (): BrandedApplication | null => current,

  /** Brand the UI for `application`, or restore the Codexa theme with null. */
  apply(application: BrandedApplication | null) {
    const key = application ? JSON.stringify(application) : "";
    if (key === applied) return;
    applied = key;
    current = application;

    const css = application?.branding ? brandingCss(application.branding) : "";
    if (!sheet && css) {
      sheet = new CSSStyleSheet();
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    sheet?.replaceSync(css);
    for (const listener of listeners) listener();
  },
};
