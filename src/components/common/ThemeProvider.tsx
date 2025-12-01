import { createContext, useContext, useEffect, useState } from "react";
import { useViewStore } from "@/stores/useViewStore";

const BREAKPOINT = 768;

export type Theme = "Dark" | "Light" | "System";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "System",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export const ThemeProvider = ({
  children,
  defaultTheme = "System",
  storageKey = "near-ai-theme",
  ...props
}: ThemeProviderProps) => {
  const { setIsMobile, setIsLeftSidebarOpen } = useViewStore();
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(storageKey) as Theme) || defaultTheme);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");
    if (theme === "System") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      console.log("Applying theme:", theme, systemTheme);

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme.toLowerCase());
  }, [theme]);

  useEffect(() => {
    setIsMobile(window.innerWidth < BREAKPOINT);

    const onResize = () => {
      if (window.innerWidth < BREAKPOINT) {
        setIsMobile(true);
        setIsLeftSidebarOpen(false);
      } else {
        setIsMobile(false);
        setIsLeftSidebarOpen(true);
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [setIsMobile, setIsLeftSidebarOpen]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
