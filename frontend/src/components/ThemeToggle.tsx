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
      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-transparent" />
    );
  }

  // Obtenemos el tema "activo" (si es system, resolvedTheme nos dice si es light o dark)
  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    // Si estamos en system, pasamos a light
    if (theme === "system") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("system");
    }
  };

  const Icon = theme === "system" ? Monitor : isDark ? Moon : Sun;

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-xl transition-all flex items-center justify-center border active:scale-95 shadow-sm
        ${isDark 
          ? "bg-slate-800 border-white/10 text-indigo-400 hover:bg-slate-700" 
          : "bg-slate-100 border-black/5 text-amber-500 hover:bg-slate-200"
        }
      `}
      title={`Tema: ${theme === 'system' ? 'Automático' : theme === 'dark' ? 'Oscuro' : 'Claro'}`}
    >
      <Icon size={18} />
    </button>
  );
}
