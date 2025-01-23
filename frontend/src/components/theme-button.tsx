"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export default function ThemeButton() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        fixed top-4 right-4
        z-[1000]
        rounded-full
        p-2.5 sm:p-3
        focus:outline-none focus:ring-2
        focus:ring-indigo-500/50 focus:ring-offset-2
        hover:shadow-lg hover:scale-110
        bg-white/80 dark:bg-gray-800/80
        backdrop-blur-sm
        border border-gray-200 dark:border-gray-700
        transition-all duration-300
        active:scale-95
        text-lg sm:text-xl
        hover:border-indigo-300 dark:hover:border-indigo-600
        shadow-sm hover:shadow-indigo-500/20
      `}
      aria-label="Toggle theme"
    >
      <span className="block transform transition-transform duration-200">
        {theme === "light" ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
