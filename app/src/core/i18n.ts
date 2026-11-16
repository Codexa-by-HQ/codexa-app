import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import coreAr from "./locales/ar.json" with { type: "json" };
import coreEn from "./locales/en.json" with { type: "json" };
import coreUr from "./locales/ur.json" with { type: "json" };
import userAr from "@/locales/ar/translation.json" with { type: "json" };
import userEn from "@/locales/en/translation.json" with { type: "json" };
import userUr from "@/locales/ur/translation.json" with { type: "json" };

/** Supported locales. Keep in sync with public/boot.js. */
export const LANGUAGES = ["en", "ar", "ur"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Each language's own name, shown in the language picker. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  ar: "العربية",
  ur: "اردو",
};

type Strings = { [key: string]: string | Strings };

/** Lays `override` over `base` key by key, so a user string wins over core's. */
function layer(base: Strings, override: Strings): Strings {
  const result: Strings = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    result[key] = typeof value === "object" && typeof current === "object"
      ? layer(current, value)
      : value;
  }
  return result;
}

/**
 * Core strings with the user's from src/locales layered on top. One namespace
 * holds both, so a user page adds its own keys and can also rename core text,
 * such as `shell.product`, without touching src/core.
 */
const resources: Resource = {
  en: { translation: layer(coreEn, userEn as Strings) },
  ar: { translation: layer(coreAr, userAr as Strings) },
  ur: { translation: layer(coreUr, userUr as Strings) },
};

/** Keeps <html lang dir> in step. Registered before init, so the first language is covered. */
i18n.on("languageChanged", (language) => {
  const root = document.documentElement;
  root.lang = language;
  root.dir = i18n.dir(language);
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: LANGUAGES,
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    detection: {
      // Stored preference first, then the browser's own language.
      // Keep in sync with public/boot.js.
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
    // React already escapes output.
    interpolation: { escapeValue: false },
  })
  .catch(console.error);

export default i18n;
