import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Aplica o tema no documento inteiro e sincroniza o fundo do body com os
 * tokens CSS globais para evitar flashes de cor na primeira pintura.
 */
const applyThemeToDocument = (isDark: boolean) => {
  const html = document.documentElement;
  const body = document.body;

  html.classList.toggle('dark', isDark);
  html.classList.toggle('light', !isDark);
  body.classList.toggle('dark', isDark);
  body.classList.toggle('light', !isDark);
  body.style.backgroundColor = 'var(--page-bg)';
  body.style.color = 'var(--text-strong)';
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    applyThemeToDocument(isDark);
  }, [isDark]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyThemeToDocument(saved ? saved === 'dark' : prefersDark);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((previousTheme) => !previousTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }

  return context;
};
