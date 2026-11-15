import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslations from "./locals/en/translation.json" with { type: "json" };
import arTranslations from "./locals/ar/translation.json" with { type: "json" };
import urTranslations from "./locals/ur/translation.json" with { type: "json" };

/** Supported locales, keep in sync with public/boot.js. */
export const LANGUAGES = ["en", "ar", "ur"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Each language's own name, shown in the language picker. */
export const LANGUAGE_NAMES: Record<Language, string> = {
    en: "English",
    ar: "العربية",
    ur: "اردو",
};

/** Keep <html lang/dir> in sync. Registered before init so the first resolve is covered too. */
i18n.on("languageChanged", (language) => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = i18n.dir(language);
    document.title = i18n.t("shell.documentTitle", { lng: language });
});

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: enTranslations },
            ar: { translation: arTranslations },
            ur: { translation: urTranslations },
        },
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
        interpolation: {
            escapeValue: false, // React already escapes output.
        },
    })
    .catch(console.error);

export default i18n;
