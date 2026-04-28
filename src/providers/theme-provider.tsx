import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

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
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;

    // Temporarily disable all CSS transitions so the theme switch is instant.
    root.classList.add('disable-transitions');

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    // Force a synchronous style/layout recompute so the new theme variables
    // are committed while transitions are still suppressed.
    void root.offsetHeight;

    // We need the browser to actually *paint* one frame with `transition: none`
    // before we re-enable transitions, otherwise removing the class in the
    // same frame as the recolour re-arms the transition right before paint
    // and we still see the bulk recolour animate.
    //
    // A single rAF fires *before* the next paint, so the class is gone again
    // by the time the paint happens — we need two: the first lets the recolour
    // paint with transitions off, the second is the earliest safe point to
    // drop the override.
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => {
        root.classList.remove('disable-transitions');
      });
    });

    return () => {
      cancelAnimationFrame(outerId);
      cancelAnimationFrame(innerId);
    };
  }, [theme]);

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
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
