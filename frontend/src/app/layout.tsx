"use client";


import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  Settings,
  Bell,
  Menu,
  X,
  Loader2,
  Store,
  BarChart3,
  Map,
  Save,
  Layout,
  DatabaseBackup,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { DataProvider, useData } from "@/context/DataContext";
import { migrateLocalStorageToFirebase } from "@/lib/migration";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="antialiased h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Wanda" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body suppressHydrationWarning className={`${inter.className} min-h-screen bg-[var(--background)] flex`}>
        <DataProvider>
          <LayoutContent>{children}</LayoutContent>
        </DataProvider>
      </body>
    </html>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { loading, isSyncing, error } = useData();

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- MIGRACIÓN DE DATOS LOCALES ---
  useEffect(() => {
    try {
      migrateLocalStorageToFirebase();
    } catch (e) {
      console.error("Migration failed:", e);
    }
  }, []);

  // --- LÓGICA DE PROTECCIÓN DE RUTAS ---
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("is_logged_in");
    const role = localStorage.getItem("user_role");

    if (!isLoggedIn && pathname !== '/login' && pathname !== '/landing' && pathname !== '/migracion' && pathname !== '/preventa' && pathname !== '/tienda') {
      router.push('/login');
    } else if (isLoggedIn && pathname === '/login') {
      if (role === 'admin') router.push('/productos');
      else if (role === 'cliente') router.push('/tienda');
      else router.push('/preventa');
    }

    // Si el usuario es preventista y trata de entrar al admin, lo mandamos a /preventa
    if (role === 'preventista' && pathname !== '/preventa' && pathname !== '/tienda' && pathname !== '/login') {
      router.push('/preventa');
    }

    // Si el usuario es admin y entra a tienda, lo dejamos. Pero si entra a otra cosa que no sea admin, lo dejamos.
    // La lógica actual redirigía si el path no era /preventa, ahora excluimos /tienda de las restricciones.
    if (role === 'admin' && pathname === '/preventa') {
      router.push('/productos');
    }

    // --- LIMPIEZA DE PWA EN MODO DEV ---
    if (process.env.NODE_ENV === 'development' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }

  }, [pathname, router]);

  const navItems = [
    { href: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { href: "/productos", icon: <Package size={18} />, label: "Productos" },
    { href: "/logistica", icon: <Truck size={18} />, label: "Logística" },
    { href: "/recorrido", icon: <Map size={18} />, label: "Recorrido" },
    { href: "/clientes", icon: <Users size={18} />, label: "Clientes" },
    { href: "/vendedores", icon: <Users size={18} />, label: "Vendedores" },
    { href: "/informes", icon: <BarChart3 size={18} />, label: "Informes" },
    { href: "/landing", icon: <Layout size={18} />, label: "Presentación" },
    { href: "/migracion", icon: <DatabaseBackup size={18} />, label: "Migración" },
    { href: "/settings", icon: <Settings size={18} />, label: "Ajustes" },
  ];

  if (!mounted || loading) {
    return (
      <div className="flex-1 h-screen flex flex-col items-center justify-center gap-4 bg-[var(--background)] w-full">
        <div className="relative group/logo">
          <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border border-indigo-500/50 flex items-center justify-center text-indigo-400 font-black shadow-2xl">
            <span className="text-2xl tracking-tighter drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]">&lt;/&gt;</span>
          </div>
        </div>
        <div className="text-center mt-4">
          <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Wanda <span className="text-indigo-500">Cloud</span></p>
          <p className="text-[10px] text-slate-500 font-medium italic">Distribución Inteligente</p>
        </div>
      </div>
    );
  }

  // RENDERIZADO ESPECIAL PARA PAGINAS SIN SIDEBAR (Login, Preventa, Tienda, Landing)
  const isMinimalLayout = pathname === '/login' || pathname === '/preventa' || pathname === '/tienda' || pathname === '/landing';

  if (isMinimalLayout) {
    return <main className="flex-1 w-full h-full min-h-screen">{children}</main>;
  }

  return (
    <>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed md:sticky top-0 left-0 z-[101] h-screen bg-[var(--card)] border-r border-[var(--border)] transition-all duration-300 flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0 w-72' : `-translate-x-full md:translate-x-0 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
      `}>
        <div className="p-4 md:p-6 h-full flex flex-col overflow-y-auto custom-scroll overflow-x-hidden">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} mb-10 relative`}>
            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="relative group/logo cursor-pointer shrink-0" onClick={() => router.push('/landing')} title="Wanda Cloud">
                <div className="absolute inset-0 bg-indigo-500 blur opacity-10 group-hover:opacity-30 transition-opacity" />
                <div className="relative w-8 h-8 rounded-lg bg-slate-900 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-xs">
                  <span>&lt;/&gt;</span>
                </div>
              </div>
              {!isSidebarCollapsed && <span className="font-black text-xl uppercase italic whitespace-nowrap">Wanda <span className="text-indigo-500">Cloud</span></span>}
            </div>
            
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 shrink-0">
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-1.5 flex-1">
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={pathname === item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                collapsed={isSidebarCollapsed}
              />
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-[var(--border)] flex flex-col gap-4">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
              className="hidden md:flex items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors mx-auto w-full"
            >
              {isSidebarCollapsed ? <ChevronRight size={18} /> : (
                <div className="flex items-center justify-between w-full px-2">
                  <span className="text-xs font-bold shrink-0">Colapsar</span>
                  <ChevronLeft size={18} className="shrink-0" />
                </div>
              )}
            </button>

            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center flex-col gap-4' : 'justify-between px-2'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-500 uppercase" title={(pathname !== '/login' && typeof window !== 'undefined') ? localStorage.getItem('user_role') || 'Usuario' : 'WA'}>
                  {(pathname !== '/login' && typeof window !== 'undefined') ? (localStorage.getItem('user_role')?.slice(0, 2) || 'WA') : 'WA'}
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">Usuario</p>
                    <p className="text-[10px] text-slate-500 truncate capitalize">{(pathname !== '/login' && typeof window !== 'undefined') ? localStorage.getItem('user_role') : 'Cargando...'}</p>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => {
                  localStorage.removeItem("user_role");
                  localStorage.removeItem("is_logged_in");
                  localStorage.removeItem("user_name");
                  localStorage.removeItem("user_email");
                  localStorage.removeItem("user_photo");
                  localStorage.removeItem("vendedor_name");
                  localStorage.removeItem("vendedor_id");
                  window.location.href = '/login';
                }}
                className={`p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 ${isSidebarCollapsed ? 'mx-auto' : ''}`}
                title="Cerrar Sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <header className="h-16 border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md sticky top-0 z-[50] px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-bold text-xs text-[var(--foreground)] opacity-70 uppercase tracking-widest hidden sm:block">
              {navItems.find(i => i.href === pathname)?.label || "Operaciones"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {error && (
              <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/10 animate-pulse">
                Error de Sincronización
              </span>
            )}
            <button className="p-2 text-slate-400 hover:text-indigo-500 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--card)]" />
            </button>
            <div className="h-8 w-[1px] bg-[var(--border)] mx-1" />
            <div className="text-right">
              <p className="text-xs font-bold leading-none mb-1">Venta Directa</p>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Sincronizado</p>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8 flex-1">
          {children}
        </main>
      </div>
    </>
  );
}

function NavItem({ label, href, icon, active, onClick, collapsed }: any) {
  return (
    <Link href={href} onClick={onClick}>
      <div className={`
        flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} rounded-xl transition-all duration-300 group cursor-pointer border
        ${active
          ? 'bg-indigo-500 text-white font-bold border-indigo-400 shadow-lg shadow-indigo-500/10'
          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 border-transparent hover:border-[var(--border)]'}
      `} title={collapsed ? label : undefined}>
        <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'} transition-colors shrink-0`}>
          {icon}
        </span>
        {!collapsed && <span className="text-sm truncate">{label}</span>}
        {active && !collapsed && (
          <motion.div
            layoutId="nav-active"
            className="ml-auto w-1 h-1 rounded-full bg-white shrink-0"
          />
        )}
      </div>
    </Link>
  );
}
