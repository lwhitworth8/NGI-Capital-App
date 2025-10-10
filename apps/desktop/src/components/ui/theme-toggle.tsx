'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'minimal' | 'button' | 'switch';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ThemeToggle({ variant = 'button', size = 'md', className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  if (!mounted) {
    return null;
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          'inline-flex items-center justify-center rounded-full p-2',
          'text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400',
          'transition-all duration-300 hover:bg-blue-50 dark:hover:bg-blue-900/20',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          size === 'sm' && 'p-1.5',
          size === 'lg' && 'p-3',
          className
        )}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <Moon className={cn(iconSize, 'transition-transform duration-300 hover:rotate-12')} />
        ) : (
          <Sun className={cn(iconSize, 'transition-transform duration-300 hover:rotate-12')} />
        )}
      </button>
    );
  }

  if (variant === 'switch') {
    return (
      <div className={cn('relative inline-flex items-center', className)}>
        <button
          onClick={toggleTheme}
          className={cn(
            'relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-300',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            theme === 'light'
              ? 'bg-gradient-to-r from-blue-400 to-blue-600'
              : 'bg-gradient-to-r from-gray-600 to-gray-800'
          )}
          aria-label="Toggle theme"
        >
          <span
            className={cn(
              'inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-all duration-300',
              'flex items-center justify-center',
              theme === 'light' ? 'translate-x-1' : 'translate-x-6'
            )}
          >
            {theme === 'light' ? (
              <Sun className="h-2.5 w-2.5 text-blue-600" />
            ) : (
              <Moon className="h-2.5 w-2.5 text-gray-600" />
            )}
          </span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium',
        'bg-white/10 dark:bg-gray-800/50 backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/50',
        'text-gray-700 dark:text-gray-200',
        'hover:bg-white/20 dark:hover:bg-gray-700/50',
        'transition-all duration-300 hover:scale-105',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'shadow-lg hover:shadow-xl',
        size === 'sm' && 'px-2 py-1 text-sm',
        size === 'lg' && 'px-4 py-3 text-base',
        className
      )}
      aria-label="Toggle theme"
    >
      <div className="relative">
        {theme === 'light' ? (
          <Moon className={cn(iconSize, 'transition-all duration-300 hover:rotate-12')} />
        ) : (
          <Sun className={cn(iconSize, 'transition-all duration-300 hover:rotate-12')} />
        )}
      </div>
      <span className="text-sm font-medium">
        {theme === 'light' ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}

// Advanced theme selector with system option
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {themes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
            theme === value
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          )}
          aria-label={`Switch to ${label.toLowerCase()} theme`}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}