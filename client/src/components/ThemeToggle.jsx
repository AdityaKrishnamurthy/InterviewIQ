import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = '', style = {} }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      style={style}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <span className="theme-toggle-icon">
        {isDark ? '☀️' : '🌙'}
      </span>
    </button>
  );
};

export default ThemeToggle;
