import { useTranslation } from "react-i18next";

import App from "./App.tsx";

import { DirectionProvider } from "@/components/ui/direction.tsx";
import { ThemeProvider } from "@/providers/theme-provider.tsx";

export function Root() {
    const { i18n } = useTranslation();

    return (
        <DirectionProvider direction={i18n.dir() === "rtl" ? "rtl" : "ltr"}>
            {/* The app server's CSP (`style-src 'self'`) blocks the <style> tag that
                disableTransitionOnChange injects, so it stays off here. */}
            <ThemeProvider
                disableTransitionOnChange={false}
                defaultTheme="system"
                storageKey="codexa-app-theme"
            >
                <App />
            </ThemeProvider>
        </DirectionProvider>
    );
}
