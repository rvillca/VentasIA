import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme] = useState<Theme>('light');

  useEffect(() => {
    try {
      localStorage.removeItem('chiquiminisos_theme_mode');
    } catch (e) {
      console.error(e);
    }

    const root = document.documentElement;
    root.classList.add('light');
    root.classList.remove('dark');
    document.body.style.backgroundColor = '#FBF7EF';
    document.body.style.color = '#1A2B5C';
  }, []);

  const toggleTheme = () => {
    // Single light theme enforced
  };

  const setTheme = () => {
    // Single light theme enforced
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: 'light',
        isDark: false,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

