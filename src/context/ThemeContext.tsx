import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'midnight' | 'day';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  isMidnight: boolean;
  isDay: boolean;
}

const THEME_STORAGE_KEY = 'mtl_app_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
      if (savedTheme === 'midnight' || savedTheme === 'day') {
        return savedTheme;
      }
    } catch (e) {
      console.warn('Unable to read theme preference from storage:', e);
    }
    return 'midnight'; // Default theme
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Unable to persist theme preference to storage:', e);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'midnight' ? 'day' : 'midnight');
  };

  // Sync DOM classes and CSS attributes whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', theme);
    
    if (theme === 'day') {
      root.classList.add('theme-day');
      root.classList.remove('theme-midnight', 'dark');
      body.classList.add('theme-day');
      body.classList.remove('theme-midnight', 'dark');
    } else {
      root.classList.add('theme-midnight', 'dark');
      root.classList.remove('theme-day');
      body.classList.add('theme-midnight', 'dark');
      body.classList.remove('theme-day');
    }
  }, [theme]);

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isMidnight: theme === 'midnight',
    isDay: theme === 'day'
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
