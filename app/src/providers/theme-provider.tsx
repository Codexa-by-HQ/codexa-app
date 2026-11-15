import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

type ThemeProviderProps = {
    children: ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
    disableTransitionOnChange?: boolean;
};

type ThemeProviderState = {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
};

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";
const THEME_VALUES: Theme[] = ["dark", "light", "system"];

// create context
const ThemeProviderContext = createContext<
    ThemeProviderState | undefined
>(undefined);

function isTheme(value: string | null): value is Theme {
    if (value === null) {
        return false;
    }

    return THEME_VALUES.includes(value as Theme);
}

function getSystemTheme(): ResolvedTheme {
    if (window.matchMedia(COLOR_SCHEME_QUERY).matches) {
        return "dark";
    }

    return "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
    return theme === "system" ? getSystemTheme() : theme;
}

function disableTransitionsTemporarily() {
    const style = document.createElement("style");

    style.appendChild(
        document.createTextNode(
            "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}",
        ),
    );

    document.head.appendChild(style);

    return () => {
        window.getComputedStyle(document.body);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                style.remove();
            });
        });
    };
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "codexa-app-theme",
    disableTransitionOnChange = true,
    ...props
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem(storageKey);

        if (isTheme(storedTheme)) {
            return storedTheme;
        }

        return defaultTheme;
    });

    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
        () => {
            const storedTheme = localStorage.getItem(storageKey);

            if (isTheme(storedTheme)) {
                return resolveTheme(storedTheme);
            }

            return resolveTheme(defaultTheme);
        },
    );

    const applyTheme = useCallback(
        (nextTheme: Theme) => {
            const root = document.documentElement;
            const nextResolvedTheme = resolveTheme(nextTheme);

            const restoreTransitions = disableTransitionOnChange
                ? disableTransitionsTemporarily()
                : null;

            root.classList.remove("light", "dark");
            root.classList.add(nextResolvedTheme);

            setResolvedTheme(nextResolvedTheme);

            if (restoreTransitions) {
                restoreTransitions();
            }
        },
        [disableTransitionOnChange],
    );

    const setTheme = useCallback(
        (nextTheme: Theme) => {
            const nextResolvedTheme = resolveTheme(nextTheme);

            localStorage.setItem(storageKey, nextTheme);

            setThemeState(nextTheme);
            setResolvedTheme(nextResolvedTheme);
        },
        [storageKey],
    );

    useEffect(() => {
        applyTheme(theme);

        if (theme !== "system") {
            return undefined;
        }

        const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY);

        const handleChange = () => {
            applyTheme("system");
        };

        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, [theme, applyTheme]);

    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.storageArea !== localStorage) {
                return;
            }

            if (event.key !== storageKey) {
                return;
            }

            const nextTheme = isTheme(event.newValue)
                ? event.newValue
                : defaultTheme;

            setThemeState(nextTheme);
            setResolvedTheme(resolveTheme(nextTheme));
        };

        window.addEventListener("storage", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, [defaultTheme, storageKey]);

    return (
        <ThemeProviderContext.Provider
            {...props}
            value={{
                theme,
                resolvedTheme,
                setTheme,
            }}
        >
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
};
