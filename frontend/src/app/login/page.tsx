"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, User, Lock, ArrowRight, Store, ChevronRight, Globe, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";

export default function LoginPage() {
    const [role, setRole] = useState<'admin' | 'preventista' | null>(null);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulación de validación
        if (role === 'admin' && password === 'dev-tienda') {
            localStorage.setItem("user_role", "admin");
            localStorage.setItem("is_logged_in", "true");
            localStorage.setItem("user_name", "Admin Dev");
            router.push('/productos');
            return;
        }

        if (role === 'admin' && password !== 'admin123') {
            alert("Contraseña de Admin incorrecta (prueba admin123)");
            setLoading(false);
            return;
        }
        if (role === 'preventista' && password !== 'wanda2024') {
            alert("Contraseña de Preventista incorrecta (prueba wanda2024)");
            setLoading(false);
            return;
        }
        setTimeout(() => {
            localStorage.setItem("user_role", role as string);
            localStorage.setItem("is_logged_in", "true");

            if (role === 'admin') router.push('/productos');
            else router.push('/preventa');
        }, 800);
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            localStorage.setItem("user_role", "cliente");
            localStorage.setItem("is_logged_in", "true");
            localStorage.setItem("user_email", user.email || "");
            localStorage.setItem("user_name", user.displayName || "");
            localStorage.setItem("user_photo", user.photoURL || "");

            router.push('/tienda');
        } catch (error) {
            console.error("Error en login Google:", error);
            alert("No se pudo iniciar sesión con Google");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 p-8 relative z-10 border border-slate-100"
            >
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl shadow-indigo-500/20 rotate-3">
                        <Store size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">WANDA</h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Sistemas de Distribución</p>
                </div>

                {!role ? (
                    <div className="space-y-4">
                        <p className="text-center text-slate-500 font-medium mb-6">Selecciona tu perfil para ingresar</p>

                        <button
                            onClick={() => setRole('admin')}
                            className="w-full flex items-center justify-between p-6 bg-slate-50 hover:bg-indigo-50 border-2 border-transparent hover:border-indigo-500/20 rounded-[28px] transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-500 shadow-sm transition-colors">
                                    <Shield size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-black text-slate-800">Administrador</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión Total</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            onClick={() => setRole('preventista')}
                            className="w-full flex items-center justify-between p-6 bg-slate-50 hover:bg-emerald-50 border-2 border-transparent hover:border-emerald-500/20 rounded-[28px] transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 shadow-sm transition-colors">
                                    <User size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-black text-slate-800">Preventista</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pedidos Móvil</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            onClick={() => {
                                localStorage.setItem("user_role", "cliente");
                                localStorage.setItem("is_logged_in", "true");
                                localStorage.setItem("user_name", "Visitante");
                                localStorage.setItem("user_email", "visitante@wanda.com");
                                router.push('/tienda');
                            }}
                            className="w-full flex items-center justify-between p-6 bg-slate-900 text-white rounded-[28px] transition-all hover:bg-black shadow-lg shadow-black/10 active:scale-95 group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white shadow-sm transition-colors">
                                    <Globe size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-black">Tienda Online</h3>
                                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Acceso Directo (Dev)</p>
                                </div>
                            </div>
                            <ChevronRight className="text-white/30 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                ) : (
                    <motion.form
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onSubmit={handleLogin}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <button
                                type="button"
                                onClick={() => { setRole(null); setPassword(""); }}
                                className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <ArrowRight className="rotate-180" size={20} />
                            </button>
                            <h2 className="text-xl font-black text-slate-800 capitalize">{role}</h2>
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Introduce tu clave"
                                className="w-full bg-slate-50 hover:bg-slate-100/50 border-2 border-slate-100 focus:border-indigo-500/20 focus:bg-white rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-bold text-slate-800"
                            />
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-indigo-500 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? "Verificando..." : "Ingresar"}
                            {!loading && <ArrowRight size={16} />}
                        </button>

                        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Protección de Acceso Wanda © 2024
                        </p>
                    </motion.form>
                )}
            </motion.div>
        </div>
    );
}
