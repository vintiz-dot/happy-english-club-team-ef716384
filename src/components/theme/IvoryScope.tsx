import { ReactNode, useCallback, useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { ThemeProvider, useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { IvoryContext } from "@/hooks/useIvory";
import { BOOT_KEY, DEFAULT_THEME, isIvoryRoute, readThemeChoice, themeKey, type ThemeChoice } from "@/lib/ivoryScope";

/** Browser bar colour: the old navy outside the system, paper / deep ink inside it. */
const THEME_COLOR = { legacy: "#1e3a8a", light: "#F7F2E9", dark: "#0A111E" } as const;

/**
 * Puts data-hec-theme="ivory" on <html> while the current route is migrated
 * (src/lib/ivoryScope.ts), so the header, the page, and every portalled
 * dialog / popover / toast take the system together. Dark mode (A4.3) lives
 * here too: a choice of System / Light / Dark, remembered per device and per
 * signed-in user. Screens that are not migrated yet are always drawn light,
 * because their dark styles were never finished (A1 plan, A4.3).
 */
export function IvoryScope({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const ivory = isIvoryRoute(pathname, search);

  useLayoutEffect(() => {
    const de = document.documentElement;
    if (ivory) de.setAttribute("data-hec-theme", "ivory");
    else de.removeAttribute("data-hec-theme");
  }, [ivory]);

  return (
    <IvoryContext.Provider value={ivory}>
      <ThemeProvider
        attribute="class"
        defaultTheme={DEFAULT_THEME}
        enableSystem
        enableColorScheme={false}
        disableTransitionOnChange
        storageKey="hec-theme-active"
        forcedTheme={ivory ? undefined : "light"}
      >
        <ThemeSync ivory={ivory} />
        {children}
      </ThemeProvider>
    </IvoryContext.Provider>
  );
}

function ThemeSync({ ivory }: { ivory: boolean }) {
  const { user, loading } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const uid = user?.id ?? null;

  // The signed-in person's own choice; a second user on the same tablet gets theirs.
  useEffect(() => {
    if (loading || !uid) return;
    let saved: string | null = null;
    try { saved = localStorage.getItem(themeKey(uid)); } catch { /* private mode */ }
    setTheme(readThemeChoice(saved));
  }, [uid, loading, setTheme]);

  // What the inline script in index.html applies before the first paint, and the browser bar colour.
  useEffect(() => {
    const choice = readThemeChoice(theme);
    try { localStorage.setItem(BOOT_KEY, JSON.stringify({ ivory, theme: choice })); } catch { /* private mode */ }
    const dark = ivory && resolvedTheme === "dark";
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) =>
      m.setAttribute("content", !ivory ? THEME_COLOR.legacy : dark ? THEME_COLOR.dark : THEME_COLOR.light),
    );
  }, [ivory, theme, resolvedTheme]);

  return null;
}

/** The current choice and a setter that remembers it for this user on this device. */
export function useThemeChoice(): [ThemeChoice, (next: ThemeChoice) => void] {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const uid = user?.id ?? null;
  const set = useCallback(
    (next: ThemeChoice) => {
      setTheme(next);
      try { localStorage.setItem(themeKey(uid), next); } catch { /* private mode */ }
    },
    [setTheme, uid],
  );
  return [readThemeChoice(theme ?? DEFAULT_THEME), set];
}
