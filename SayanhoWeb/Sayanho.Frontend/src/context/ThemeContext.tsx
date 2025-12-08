import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeColors {
    canvasBackground: string;
    panelBackground: string;
    text: string;
    menuBackground: string;
    toolbarBackground: string;
    menuForeground: string;
    menuText: string;
    border: string;
    glassBackground: string;
    glassBorder: string;
    accent: string;
    accentForeground: string;
    muted: string;
    mutedForeground: string;
}

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>('light');

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const colors: ThemeColors = {
        canvasBackground: theme === 'dark' ? '#020617' : '#f0f4f8', // Slate 950 / Cool Gray
        panelBackground: theme === 'dark' ? 'rgba(2, 6, 23, 0.8)' : 'rgba(255, 255, 255, 0.6)', // Deeper dark / More transparent light
        text: theme === 'dark' ? '#f8fafc' : '#1e293b',
        menuBackground: theme === 'dark' ? 'rgba(2, 6, 23, 0.9)' : 'rgba(255, 255, 255, 0.8)',
        toolbarBackground: theme === 'dark' ? 'rgba(2, 6, 23, 0.8)' : 'rgba(255, 255, 255, 0.6)',
        menuForeground: '#ffffff',
        menuText: theme === 'dark' ? '#f8fafc' : '#1e293b',
        border: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        glassBackground: theme === 'dark' ? 'rgba(2, 6, 23, 0.8)' : 'rgba(255, 255, 255, 0.6)',
        glassBorder: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)',
        accent: '#818cf8', // Indigo 400
        accentForeground: '#ffffff',
        muted: theme === 'dark' ? '#1e293b' : '#e2e8f0',
        mutedForeground: theme === 'dark' ? '#94a3b8' : '#64748b',
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
