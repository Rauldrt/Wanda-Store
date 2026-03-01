"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Save, Loader2, MessageSquare, AlertCircle, Plus, Trash2, Layers, Tag, Package, ShoppingCart, Target } from "lucide-react";
import { wandaApi } from "@/lib/api";
import { useData } from "@/context/DataContext";

interface SystemNotification {
    id: string;
    title: string;
    text: string;
    active: boolean;
    type: 'info' | 'offer' | 'priority';
}

interface Promotion {
    id: string;
    name: string;
    type: 'BOX' | 'QTY';
    target: 'ALL' | string; // ALL or Product ID
    threshold: number; // 1 for BOX, X for QTY
    discount: number; // percentage
    active: boolean;
}

export default function SettingsPage() {
    const { data, refreshData, setIsSyncing, isSyncing } = useData();
    const products = data?.products || [];
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [config, setConfig] = useState<Record<string, string>>({
        EMPRESA: "WANDA DISTRIBUCIONES",
        REMITO_TITULO: "REMITO",
        REMITO_DIRECCION: "",
        REMITO_TELEFONO: ""
    });

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const res = await wandaApi.getConfig();
                if (res) {
                    if (res.SYSTEM_NOTIFICATIONS) {
                        try {
                            setNotifications(JSON.parse(res.SYSTEM_NOTIFICATIONS));
                        } catch (e) {
                            console.error("Error parsing notifications", e);
                            setNotifications([]);
                        }
                    }
                    if (res.SYSTEM_PROMOTIONS) {
                        try {
                            setPromotions(JSON.parse(res.SYSTEM_PROMOTIONS));
                        } catch (e) {
                            console.error("Error parsing promotions", e);
                            setPromotions([]);
                        }
                    }
                    // Cargar otros campos
                    setConfig(prev => ({
                        ...prev,
                        EMPRESA: res.EMPRESA || prev.EMPRESA,
                        REMITO_TITULO: res.REMITO_TITULO || prev.REMITO_TITULO,
                        REMITO_DIRECCION: res.REMITO_DIRECCION || prev.REMITO_DIRECCION,
                        REMITO_TELEFONO: res.REMITO_TELEFONO || prev.REMITO_TELEFONO
                    }));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadConfig();
    }, []);

    const handleSave = async () => {
        try {
            setIsSyncing(true);
            await wandaApi.saveConfig({
                ...config,
                SYSTEM_NOTIFICATIONS: JSON.stringify(notifications),
                SYSTEM_PROMOTIONS: JSON.stringify(promotions)
            });
            await refreshData(true);
            alert("Configuración guardada correctamente");
        } catch (err) {
            alert("Error al guardar");
        } finally {
            setIsSyncing(false);
        }
    };

    const addNotification = () => {
        const newNotif: SystemNotification = {
            id: Date.now().toString(),
            title: "Nuevo Aviso",
            text: "",
            active: true,
            type: 'info'
        };
        setNotifications([...notifications, newNotif]);
    };

    const removeNotification = (id: string) => {
        setNotifications(notifications.filter(n => n.id !== id));
    };

    const updateNotification = (id: string, updates: Partial<SystemNotification>) => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, ...updates } : n));
    };

    const addPromotion = () => {
        const newPromo: Promotion = {
            id: Date.now().toString(),
            name: "Nueva Promo",
            type: 'BOX',
            target: 'ALL',
            threshold: 1,
            discount: 5,
            active: true
        };
        setPromotions([...promotions, newPromo]);
    };

    const removePromotion = (id: string) => {
        setPromotions(promotions.filter(p => p.id !== id));
    };

    const updatePromotion = (id: string, updates: Partial<Promotion>) => {
        setPromotions(promotions.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    if (loading) return (
        <div className="h-[60vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-32">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">Configuración</h2>
                <p className="text-sm text-slate-500 italic">Gestiona los avisos y parámetros globales del sistema.</p>
            </div>

            {/* Sección Membrete / Empresa */}
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-black/5 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Layers size={14} className="text-indigo-500" /> Identidad y Remitos
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre de Empresa</label>
                        <input
                            value={config.EMPRESA}
                            onChange={e => setConfig({ ...config, EMPRESA: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 outline-none"
                            placeholder="WANDA DISTRIBUCIONES"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Título del Remito</label>
                        <input
                            value={config.REMITO_TITULO}
                            onChange={e => setConfig({ ...config, REMITO_TITULO: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 outline-none"
                            placeholder="REMITO"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Dirección (Membrete)</label>
                        <input
                            value={config.REMITO_DIRECCION}
                            onChange={e => setConfig({ ...config, REMITO_DIRECCION: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 outline-none"
                            placeholder="Calle Falsa 123, Ciudad"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Teléfono (Membrete)</label>
                        <input
                            value={config.REMITO_TELEFONO}
                            onChange={e => setConfig({ ...config, REMITO_TELEFONO: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 outline-none"
                            placeholder="+54 9 11 1234-5678"
                        />
                    </div>
                </div>
            </div>

            {/* Sección Promociones */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-black uppercase tracking-widest text-slate-400 text-[10px] flex items-center gap-2">
                        <Tag size={14} className="text-rose-500" /> Reglas de Promoción
                    </h3>
                    <button
                        onClick={addPromotion}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                    >
                        <Plus size={14} /> Nueva Promo
                    </button>
                </div>

                <AnimatePresence mode="popLayout">
                    {promotions.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] text-center space-y-3"
                        >
                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                <Tag size={20} />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">No hay reglas de promoción. Los descuentos se aplicarán manualmente.</p>
                        </motion.div>
                    ) : (
                        promotions.map((promo) => (
                            <motion.div
                                key={promo.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-black/5 space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${promo.active ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-100 text-slate-400'}`}>
                                            <Tag size={18} />
                                        </div>
                                        <div>
                                            <input
                                                value={promo.name}
                                                onChange={(e) => updatePromotion(promo.id, { name: e.target.value })}
                                                className="text-sm font-black bg-transparent border-none p-0 focus:ring-0 outline-none text-slate-800 dark:text-slate-100"
                                                placeholder="Nombre de la promo..."
                                            />
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Auto-aplicable</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updatePromotion(promo.id, { active: !promo.active })}
                                            className={`w-12 h-6 rounded-full transition-all relative ${promo.active ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${promo.active ? 'left-7' : 'left-1'}`} />
                                        </button>
                                        <button
                                            onClick={() => removePromotion(promo.id)}
                                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                                            <Target size={10} /> Aplicar a
                                        </label>
                                        <select
                                            value={promo.target}
                                            onChange={(e) => updatePromotion(promo.id, { target: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-[11px] font-bold outline-none"
                                        >
                                            <option value="ALL">Todo el catálogo</option>
                                            {products.map((p: any) => (
                                                <option key={p.ID_Producto} value={p.ID_Producto}>{p.Nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                                            <ShoppingCart size={10} /> Condición
                                        </label>
                                        <select
                                            value={promo.type}
                                            onChange={(e) => updatePromotion(promo.id, { type: e.target.value as any })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-[11px] font-bold outline-none"
                                        >
                                            <option value="BOX">Por Bulto Cerrado</option>
                                            <option value="QTY">Por Cantidad Mínima</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                                            <Package size={10} /> Umbral / Cantidad
                                        </label>
                                        <input
                                            type="number"
                                            value={promo.threshold}
                                            onChange={(e) => updatePromotion(promo.id, { threshold: parseInt(e.target.value) || 1 })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-[11px] font-bold outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                                            <Tag size={10} /> Descuento (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={promo.discount}
                                            onChange={(e) => updatePromotion(promo.id, { discount: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-[11px] font-bold outline-none text-rose-600"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-black uppercase tracking-widest text-slate-400 text-[10px] flex items-center gap-2">
                        <Bell size={14} className="text-indigo-500" /> Tablón de Anuncios
                    </h3>
                    <button
                        onClick={addNotification}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all active:scale-95"
                    >
                        <Plus size={14} /> Nuevo Aviso
                    </button>
                </div>

                <AnimatePresence mode="popLayout">
                    {notifications.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] text-center space-y-3"
                        >
                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                <MessageSquare size={20} />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">No hay avisos activos. Los preventistas no verán banners informativos.</p>
                        </motion.div>
                    ) : (
                        notifications.map((notif) => (
                            <motion.div
                                key={notif.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-black/5 space-y-4 text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${notif.active ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 text-slate-400'}`}>
                                            <Bell size={18} />
                                        </div>
                                        <div className="flex flex-col">
                                            <input
                                                value={notif.title}
                                                onChange={(e) => updateNotification(notif.id, { title: e.target.value })}
                                                className="text-sm font-black bg-transparent border-none p-0 focus:ring-0 outline-none text-slate-800 dark:text-slate-100"
                                                placeholder="Título del aviso..."
                                            />
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">ID: {notif.id}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateNotification(notif.id, { active: !notif.active })}
                                            className={`w-12 h-6 rounded-full transition-all relative ${notif.active ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notif.active ? 'left-7' : 'left-1'}`} />
                                        </button>
                                        <button
                                            onClick={() => removeNotification(notif.id)}
                                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        Contenido del Aviso
                                    </label>
                                    <textarea
                                        value={notif.text}
                                        onChange={(e) => updateNotification(notif.id, { text: e.target.value })}
                                        placeholder="Escribe el mensaje aquí..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all min-h-[80px]"
                                    />
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white dark:from-slate-950 to-transparent pointer-events-none">
                <div className="max-w-2xl mx-auto pointer-events-auto">
                    <button
                        onClick={handleSave}
                        disabled={isSyncing}
                        className="w-full py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-50"
                    >
                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                        {isSyncing ? 'Guardando...' : 'Aplicar Cambios Globales'}
                    </button>
                </div>
            </div>
        </div>
    );
}

