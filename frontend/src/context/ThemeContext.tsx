import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Aplicar tema no html e body
  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    const html = document.documentElement;
    const body = document.body;

    if (isDark) {
      html.classList.add('dark');
      html.classList.remove('light');
      body.classList.add('dark');
      body.classList.remove('light');
      // Definir cor de fundo padrão para dark mode
      body.style.backgroundColor = '#0f172a';
      body.style.color = '#f8fafc';
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
      body.classList.remove('dark');
      body.classList.add('light');
      // Definir cor de fundo padrão para light mode
      body.style.backgroundColor = '#f8fafc';
      body.style.color = '#0f172a';
    }
  }, [isDark]);

  // Aplicar tema imediatamente na montagem para evitar flash
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = saved ? saved === 'dark' : prefersDark;

    const html = document.documentElement;
    const body = document.body;

    if (shouldBeDark) {
      html.classList.add('dark');
      body.classList.add('dark');
      body.style.backgroundColor = '#0f172a';
    } else {
      html.classList.add('light');
      body.classList.add('light');
      body.style.backgroundColor = '#f8fafc';
    }
  }, []);

  const toggleTheme = useCallback(() => setIsDark(prev => !prev), []);

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
