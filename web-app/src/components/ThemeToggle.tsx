'use client';

import { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Initialize theme from localStorage or system preference
    useEffect(() => {
        setMounted(true);

        // Check localStorage first
        const stored = localStorage.getItem('theme');
        if (stored) {
            const isDarkMode = stored === 'dark';
            setIsDark(isDarkMode);
            updateTheme(isDarkMode);
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDark(prefersDark);
            updateTheme(prefersDark);
        }
    }, []);

    const updateTheme = (dark: boolean) => {
        if (dark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const toggleTheme = () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);
        updateTheme(newIsDark);
        localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    };

    // Avoid hydration mismatch
    if (!mounted) {
        return (
            <button className="p-2 rounded-lg text-gray-400">
                <Lightbulb className="w-5 h-5" />
            </button>
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
        >
            <Lightbulb
                className={`w-5 h-5 transition-all duration-300 ${isDark
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-600'
                    }`}
            />
        </button>
    );
}
