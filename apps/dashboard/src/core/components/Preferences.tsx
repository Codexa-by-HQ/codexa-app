import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ComputerIcon,
  LanguageSkillIcon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/core/components/IconButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/core/contexts/Theme";
import { features } from "@/core/lib/env";
import { LANGUAGE_NAMES, LANGUAGES } from "@/core/i18n";

const THEME_ORDER = ["light", "dark", "system"] as const;
const THEME_ICON = { light: Sun03Icon, dark: Moon02Icon, system: ComputerIcon };

/** Cycles light, dark and system on each click. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
  const label = t("shell.theme", { theme: t(`shell.themes.${theme}`) });

  return (
    <IconButton label={label} onClick={() => setTheme(next)}>
      {/* Keyed so the icon replays its entrance on every switch. */}
      <HugeiconsIcon key={theme} icon={THEME_ICON[theme]} className="animate-pop" />
    </IconButton>
  );
}

const LANGUAGE_ITEMS = LANGUAGES.map((value) => ({
  value,
  label: LANGUAGE_NAMES[value],
}));

/** The language picker. On a small screen only its icon shows. */
export function LanguageSelect() {
  const { t, i18n } = useTranslation();

  return (
    <Select
      items={LANGUAGE_ITEMS}
      value={i18n.resolvedLanguage ?? "en"}
      onValueChange={(language) => {
        if (language) void i18n.changeLanguage(language);
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={t("shell.switchLanguage")}
        className="border-transparent bg-transparent px-2 max-sm:*:data-[slot=select-value]:hidden max-sm:[&>svg:last-child]:hidden"
      >
        <HugeiconsIcon icon={LanguageSkillIcon} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false}>
        {LANGUAGE_ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value} lang={item.value}>
            <Badge variant="secondary" className="w-7 font-mono text-[10px] uppercase">
              {item.value}
            </Badge>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * The language picker and theme toggle shown at the top of every page. Either
 * can be switched off per deployment with its `VITE_ENABLE_` variable.
 */
export function PreferenceControls() {
  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      {features.languageSwitcher && <LanguageSelect />}
      {features.themeSwitcher && <ThemeToggle />}
    </div>
  );
}
