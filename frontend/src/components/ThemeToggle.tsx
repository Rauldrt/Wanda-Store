"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-lg bg-[var(--card)] border border-[var(--border)] animate-pulse" />
    );
  }

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
      <button
        onClick={() => setTheme("light")}
        className={`p-1.5 rounded-lg transition-all ${
          theme === "light"
            ? "bg-white dark:bg-transparent shadow-sm text-amber-500"
            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        }`}
        title="Modo Claro"
      >
        <Sun size={16} />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-1.5 rounded-lg transition-all ${
          theme === "system"
            ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-500"
            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        }`}
        title="Modo Automático"
      >
        <Monitor size={16} />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-1.5 rounded-lg transition-all ${
          theme === "dark"
            ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-400"
            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        }`}
        title="Modo Oscuro"
      >
        <Moon size={16} />
      </button>
    </div>
  );
}
