import { Theme } from '@extension/shared';
import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Theme type derived from Theme enum for type-safe theme handling
 */
type ThemeType = `${Theme}`;

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: ThemeType;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
};

const initialState: ThemeProviderState = {
  theme: Theme.SYSTEM,
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export const ThemeProvider = ({
  children,
  defaultTheme = Theme.SYSTEM,
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) => {
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem(storageKey) as ThemeType) || defaultTheme);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove(Theme.LIGHT, Theme.DARK);

    if (theme === Theme.SYSTEM) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT;

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: ThemeType) => {
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
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

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
