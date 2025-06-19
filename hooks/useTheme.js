import { useState, useEffect, useContext, createContext } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Get saved theme or default to light
        const savedTheme = localStorage.getItem('datacorp-theme');
        const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
        
        setTheme(initialTheme);
        applyThemeToDOM(initialTheme);
      } catch (error) {
        console.error('Theme initialization error:', error);
        setTheme('light');
        applyThemeToDOM('light');
      }
      
      setMounted(true);
    }
  }, []);

  // Simplified theme application
  const applyThemeToDOM = (newTheme) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      
      // Remove existing theme classes
      root.classList.remove('light', 'dark');
      
      // Add new theme class
      root.classList.add(newTheme);
      
      // Save to localStorage
      localStorage.setItem('datacorp-theme', newTheme);
    }
  };

  // Update theme when state changes
  useEffect(() => {
    if (mounted) {
      applyThemeToDOM(theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const setLightMode = () => {
    setTheme('light');
  };

  const setDarkMode = () => {
    setTheme('dark');
  };

  const value = {
    theme,
    toggleTheme,
    setLightMode,
    setDarkMode,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    mounted
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
