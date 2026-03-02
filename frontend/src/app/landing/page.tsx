"use client";

import { motion } from "framer-motion";
import {
    Package,
    Truck,
    TrendingUp,
    Users,
    Image as ImageIcon,
    Search,
    Zap,
    ShieldCheck,
    ArrowRight,
    ChevronRight,
    Layout,
    CheckCircle2,
    Store,
    Code2
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
    const features = [
        {
            title: "Control de Inventario Inteligente",
            description: "Gestión en tiempo real con análisis de rentabilidad, cálculo de márgenes y alertas de reposición automática.",
            icon: <Package className="w-8 h-8 text-indigo-500" />,
            color: "indigo"
        },
        {
            title: "Logística Optimizada",
            description: "Seguimiento de rutas de reparto, estados de entrega y liquidación de carga en un solo panel.",
            icon: <Truck className="w-8 h-8 text-emerald-500" />,
            color: "emerald"
        },
        {
            title: "CRM de Clientes",
            description: "Seguimiento exhaustivo de puntos de venta, historial de pedidos y perfiles de facturación mensuales.",
            icon: <Users className="w-8 h-8 text-blue-500" />,
            color: "blue"
        },
        {
            title: "Automatización Multimedia",
            description: "Búsqueda inteligente de imágenes vía Google Search para mantener un catálogo visual siempre actualizado.",
            icon: <Search className="w-8 h-8 text-amber-500" />,
            color: "amber"
        },
        {
            title: "Análisis de Ventas",
            description: "KPIs financieros instantáneos, reportes de facturación y tendencias de mercado para decisiones rápidas.",
            icon: <TrendingUp className="w-8 h-8 text-rose-500" />,
            color: "rose"
        },
        {
            title: "Acciones Masivas",
            description: "Ajuste de precios por porcentaje o monto fijo en segundos. Duplicación y edición masiva de artículos.",
            icon: <Zap className="w-8 h-8 text-purple-500" />,
            color: "purple"
        }
    ];

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-indigo-500/30">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-[100] backdrop-blur-xl border-b border-slate-800/50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative group/logo">
                            <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-40 group-hover/logo:opacity-100 transition-opacity" />
                            <div className="relative w-11 h-11 rounded-xl bg-slate-900 border border-indigo-500/50 flex items-center justify-center text-indigo-400 font-black shadow-2xl">
                                <span className="text-xl tracking-tighter drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]">&lt;/&gt;</span>
                            </div>
                        </div>
                        <span className="text-xl font-black tracking-tighter uppercase italic">Wanda <span className="text-indigo-500">Cloud</span></span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <a href="#features" className="hover:text-white transition-colors">Características</a>
                        <a href="#stats" className="hover:text-white transition-colors">Tecnología</a>
                        <Link href="/login" className="px-6 py-3 bg-white text-slate-900 rounded-full hover:bg-slate-200 transition-all shadow-xl font-black">
                            Iniciar App
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 px-6 overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-indigo-500/10 blur-[150px] rounded-full -z-10" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -z-10" />

                <div className="max-w-7xl mx-auto text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="inline-block px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                            Next-Gen Management System
                        </span>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-tight bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
                            Potenciá tu distribución <br /> con <span className="text-indigo-500">Cloud</span>.
                        </h1>
                        <p className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl font-medium leading-relaxed mt-6">
                            Gestiona stock, rutas, finanzas y clientes. <br />
                            Diseñado para la eficiencia operativa de la próxima generación.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
                    >
                        <Link href="/login" className="group relative px-8 py-5 bg-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-600/30 overflow-hidden text-white">
                            <span className="relative z-10 flex items-center gap-2">Explorar Dashboard <ArrowRight className="w-4 h-4" /></span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </Link>
                        <a href="#features" className="px-8 py-5 bg-slate-900 border border-slate-800 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all text-white">
                            Ver Características
                        </a>
                    </motion.div>

                    {/* Screenshot Preview with Video Demo */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 1 }}
                        className="relative mt-20"
                    >
                        <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] -z-10 rounded-[3rem]" />
                        <div className="rounded-[3rem] border border-slate-800 bg-slate-900/50 p-4 shadow-2xl backdrop-blur-md overflow-hidden">
                            <div className="h-10 flex items-center gap-2 px-4 border-b border-slate-800 mb-4 opacity-50">
                                <div className="w-3 h-3 rounded-full bg-rose-500" />
                                <div className="w-3 h-3 rounded-full bg-amber-500" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <div className="ml-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Wanda Cloud • Demo Admin</div>
                            </div>
                            <div className="aspect-video bg-slate-950 rounded-[2rem] flex items-center justify-center group overflow-hidden">
                                <img
                                    src="/demo_admin.webp"
                                    alt="App Preview"
                                    className="w-full h-full object-cover rounded-[2rem] opacity-90 group-hover:opacity-100 transition-opacity"
                                />
                                <div className="absolute inset-0 bg-indigo-900/20 mix-blend-overlay pointer-events-none" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* App Ecosystem Sections */}
            <section className="py-20 px-6 space-y-32">
                {/* Preventa Section */}
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex-1 space-y-8"
                    >
                        <div className="w-16 h-16 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <Zap size={32} />
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight">
                            Módulo de <span className="text-indigo-500">Preventa</span> para Terreno.
                        </h2>
                        <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed">
                            Equipá a tus vendedores con una herramienta que funciona sin internet.
                            Búsqueda por voz, promociones automáticas y geolocalización GPS en cada pedido.
                        </p>
                        <ul className="space-y-4">
                            {['Sincronización Offline nativa', 'Búsqueda Inteligente por Voz', 'Cálculo de Promociones en Tiempo Real', 'Geofencing de Clientes'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-300 font-bold">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px]">
                                        <CheckCircle2 size={12} />
                                    </div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex-1 relative group"
                    >
                        <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full group-hover:bg-indigo-500/30 transition-all" />
                        <div className="relative rounded-[2.5rem] border border-slate-800 bg-slate-900/40 backdrop-blur-md overflow-hidden shadow-2xl aspect-[4/3] flex items-center justify-center">
                            <img
                                src="/preventa_mock.png"
                                alt="Preventa Demo"
                                className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-indigo-950/20 group-hover:bg-transparent transition-colors">
                                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-2xl">
                                    <Zap size={28} className="animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Tienda Online Section */}
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-20">
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex-1 space-y-8"
                    >
                        <div className="w-16 h-16 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Store size={32} />
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight">
                            <span className="text-emerald-500">Tienda Online</span> Directa al Cliente.
                        </h2>
                        <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed">
                            Tus clientes pueden realizar pedidos las 24 horas. Una experiencia de compra
                            optimizada para móviles que se sincroniza instantáneamente con tu stock oficial.
                        </p>
                        <ul className="space-y-4">
                            {['Autocompletado de Datos Frecuentes', 'Historial de Pedidos por WhatsApp', 'Interfaz Fluida y Rápida', 'Control de Stock en Vivo'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-300 font-bold">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px]">
                                        <CheckCircle2 size={12} />
                                    </div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex-1 relative group"
                    >
                        <div className="absolute inset-0 bg-emerald-500/20 blur-[80px] rounded-full group-hover:bg-emerald-500/30 transition-all" />
                        <div className="relative rounded-[2.5rem] border border-slate-800 bg-slate-900/40 backdrop-blur-md overflow-hidden shadow-2xl aspect-[4/3] flex items-center justify-center">
                            <img
                                src="/tienda_mock.png"
                                alt="Tienda Demo"
                                className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/20 group-hover:bg-transparent transition-colors">
                                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-2xl">
                                    <Store size={28} className="animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Technology Section (Old Stats renamed) */}
            <section id="stats" className="py-32 px-6 bg-slate-950/50 border-y border-slate-800/50">
                <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
                    <div>
                        <p className="text-4xl font-black text-white mb-2">100%</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Google Cloud Native</p>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-white mb-2">&lt; 1s</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Tiempo de Sincronización</p>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-white mb-2">32k+</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Líneas de Código</p>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-white mb-2">UX</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Diseño Mobile-First</p>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20 space-y-4">
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Funciones de Clase Mundial.</h2>
                        <p className="text-slate-500 font-medium">Todo lo que necesitas para dominar la cadena de suministros.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -10 }}
                                className="group p-8 rounded-[2.5rem] bg-slate-900/50 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] transition-all duration-500 shadow-xl"
                            >
                                <div className={`w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-inner`}>
                                    {f.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-4">{f.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                    {f.description}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Explorar módulo <ChevronRight className="w-4 h-4" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-32 px-6">
                <div className="max-w-5xl mx-auto rounded-[3rem] bg-indigo-600 p-12 md:p-24 text-center space-y-8 relative overflow-hidden text-white shadow-2xl shadow-indigo-600/20">
                    <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 -translate-y-12">
                        <Zap size={240} />
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight relative z-10">
                        ¿Listo para optimizar Wanda Lácteos?
                    </h2>
                    <p className="text-indigo-100 text-lg md:text-xl font-medium max-w-2xl mx-auto relative z-10">
                        Únete a los vendedores y distribuidores que ya están usando esta tecnología.
                    </p>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative z-10 inline-block">
                        <Link href="/login" className="px-12 py-6 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-100 transition-all">
                            Iniciar Sesión Ahora
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-slate-800/50 bg-slate-950/80">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-4">
                        <span className="text-lg font-black text-indigo-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]">&lt;/&gt;</span>
                        <span className="text-lg font-black tracking-tighter uppercase italic">Wanda <span className="text-indigo-500 text-sm">Cloud</span></span>
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center">
                        © 2024 Wanda Lácteos • Advanced Coding Solutions • v2.4.0
                    </p>
                    <div className="flex items-center gap-6">
                        <ShieldCheck className="w-5 h-5 text-slate-700" />
                        <div className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/10">
                            Live
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
