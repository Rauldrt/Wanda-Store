"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Truck, 
    ChevronRight, 
    MoreHorizontal, 
    Calendar, 
    CheckCircle2, 
    Clock, 
    XCircle, 
    FileText, 
    Plus, 
    Search, 
    MapPin, 
    User, 
    DollarSign, 
    CreditCard, 
    AlertCircle,
    ArrowLeft,
    Layers,
    Trash2,
    RefreshCw,
    Printer,
    Edit3,
    Check
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { wandaApi } from "@/lib/api";

export default function LogisticaPage() {
    const { data, loading, refreshData } = useData();
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("Rutas");
    const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // --- CÁLCULOS Y DATOS ---

    const pendingOrders = useMemo(() => {
        return data?.orders?.filter((o: any) => o.estado === "Pendiente" || o.estado === "En Preparación") || [];
    }, [data]);

    const activeRoutes = useMemo(() => {
        const routes: Record<string, any[]> = {};
        data?.orders?.forEach((o: any) => {
            if (o.reparto && (o.estado === "En Preparación" || o.estado === "Pendiente")) {
                if (!routes[o.reparto]) routes[o.reparto] = [];
                routes[o.reparto].push(o);
            }
        });
        return Object.entries(routes).map(([name, orders]) => ({
            name,
            orders,
            total: orders.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0),
            count: orders.length
        }));
    }, [data]);

    const liquidations = useMemo(() => {
        return (data?.liquidaciones || []).sort((a: any, b: any) => new Date(b.FECHA).getTime() - new Date(a.FECHA).getTime());
    }, [data]);

    // --- ACCIONES ---

    const handleAssignRoute = async (orderIds: string[], routeName: string) => {
        if (!routeName) return;
        setIsProcessing(true);
        try {
            await wandaApi.asignarRepartoMasivo(orderIds, routeName);
            refreshData();
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReleaseRoute = async (routeName: string) => {
        if (!confirm(`¿Estás seguro de liberar todos los pedidos de la ruta ${routeName}? Volverán a estado 'Pendiente'.`)) return;
        setIsProcessing(true);
        try {
            await wandaApi.liberarReparto(routeName);
            refreshData();
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 animate-pulse">Cargando Módulo Logístico...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header con Stats */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-indigo-500 mb-2">
                        <Truck size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Operaciones Logísticas</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-800 dark:text-white">Reparto & Liquidación</h1>
                    <p className="text-slate-500 text-sm mt-1">Gestión de rutas terrestres y cierre de caja por chofer.</p>
                </div>

                <div className="grid grid-cols-2 md:flex gap-3">
                    <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rutas Activas</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-indigo-500">{activeRoutes.length}</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pedidos x Salir</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-amber-500">{pendingOrders.length}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSelectedRoute("NEW")}
                        className="bg-indigo-500 px-6 py-4 rounded-3xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 text-white hover:scale-105 active:scale-95 transition-all outline-none border-none"
                    >
                        <Plus size={18} />
                        <span className="text-[11px] font-black uppercase tracking-widest">Nueva Ruta</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 py-4 flex items-center justify-between border-b border-[var(--border)]">
                <div className="flex gap-2">
                    {["Rutas", "Historial", "Mesa de Ayuda"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Servicio en línea</span>
                </div>
            </div>

            {/* Contenido Principal */}
            <div>
                {activeTab === "Rutas" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {activeRoutes.length === 0 ? (
                            <div className="col-span-full py-20 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px] text-center space-y-4">
                                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                    <Layers size={40} className="text-slate-200" />
                                </div>
                                <div className="max-w-xs mx-auto">
                                    <h4 className="font-bold text-slate-400">Sin rutas armadas</h4>
                                    <p className="text-xs text-slate-500">Comienza asignando pedidos a un reparto para visualizar y liquidar rutas.</p>
                                </div>
                            </div>
                        ) : (
                            activeRoutes.map((route, i) => (
                                <RouteCard 
                                    key={route.name} 
                                    route={route} 
                                    onView={() => setSelectedRoute(route.name)}
                                    onRelease={() => handleReleaseRoute(route.name)}
                                />
                            ))
                        )}
                    </div>
                )}

                {activeTab === "Historial" && (
                    <div className="tech-card overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase">ID / Fecha</th>
                                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Reparto</th>
                                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-right">Recaudación</th>
                                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {liquidations.map((liq: any) => (
                                    <tr key={liq.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-sm text-slate-700 dark:text-slate-200">#{liq.id.slice(-6)}</div>
                                            <div className="text-[10px] text-slate-400">{new Date(liq.FECHA).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 flex items-center justify-center text-indigo-500 font-black text-[10px]">
                                                    {liq.REPARTO.slice(0, 1)}
                                                </div>
                                                <span className="font-bold text-xs uppercase">{liq.REPARTO}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="font-black text-indigo-600">${liq.TOTAL_NETO?.toLocaleString()}</div>
                                            <div className="text-[9px] text-slate-400 uppercase">Neto Final</div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-all"><Printer size={16} /></button>
                                                <button className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-all"><FileText size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modales y Paneles Laterales (Mock de lógica compleja) */}
            <AnimatePresence>
                {selectedRoute && (
                    <RouteDetailModal 
                        routeName={selectedRoute} 
                        onClose={() => setSelectedRoute(null)} 
                        refreshData={refreshData}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function RouteCard({ route, onView, onRelease }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="tech-card group flex flex-col p-6 hover:border-indigo-500/50 transition-all cursor-pointer"
            onClick={onView}
        >
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500 shadow-xl shadow-indigo-500/20 text-white rounded-[20px] flex items-center justify-center">
                        <Truck size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-lg uppercase tracking-tight">{route.name}</h4>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{route.count} Entregas</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-bold text-emerald-500 uppercase">En Proceso</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onRelease(); }} 
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            <div className="flex-1 space-y-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 rounded-2xl flex justify-between items-center transition-colors">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor de Carga</span>
                        <span className="font-black text-lg text-indigo-500">${route.total.toLocaleString()}</span>
                    </div>
                    <div className="w-1 h-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
                    <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rentabilidad Est.</span>
                        <span className="block font-bold text-sm text-emerald-500">18.5%</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <Calendar size={12} />
                    <span>Salida: Hoy</span>
                </div>
                <div className="flex items-center gap-1 text-indigo-500 group-hover:gap-3 transition-all">
                    <span>Gestionar</span>
                    <ChevronRight size={14} />
                </div>
            </div>
        </motion.div>
    );
}

function RouteDetailModal({ routeName, onClose, refreshData }: any) {
    const { data } = useData();
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [newRouteName, setNewRouteName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    
    const orders = useMemo(() => {
        if (routeName === "NEW") return data?.orders?.filter((o: any) => !o.reparto && (o.estado === "Pendiente" || o.estado === "En Preparación")) || [];
        return data?.orders?.filter((o: any) => o.reparto === routeName) || [];
    }, [data, routeName]);

    const totalSelected = useMemo(() => {
        if (routeName !== "NEW") return orders.reduce((acc: number, o: any) => acc + (parseFloat(o.total) || 0), 0);
        return orders.filter((o: any) => selectedOrders.includes(o.id)).reduce((acc: number, o: any) => acc + (parseFloat(o.total) || 0), 0);
    }, [orders, selectedOrders, routeName]);

    const handleCreateRoute = async () => {
        if (!newRouteName || selectedOrders.length === 0) {
            alert("Completa el nombre y selecciona al menos un pedido.");
            return;
        }
        setIsSaving(true);
        try {
            await wandaApi.asignarRepartoMasivo(selectedOrders, newRouteName);
            refreshData();
            onClose();
        } catch (e) {
            alert("Error al crear ruta");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleOrderSelection = (id: string) => {
        setSelectedOrders(prev => prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={onClose} />
            <motion.div 
                layoutId={`route-${routeName}`}
                className="relative w-full max-w-4xl bg-white dark:bg-slate-950 rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]"
            >
                {/* Panel lateral izquierdo - Info de Ruta */}
                <div className="w-full md:w-80 bg-indigo-600 p-10 flex flex-col justify-between text-white border-r border-indigo-500/20">
                    <div>
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-[24px] flex items-center justify-center mb-8">
                            <Truck size={32} />
                        </div>
                        {routeName === 'NEW' ? (
                            <div className="space-y-4">
                                <h2 className="text-2xl font-black uppercase tracking-tight">Nuevo Reparto</h2>
                                <input 
                                    type="text" 
                                    value={newRouteName}
                                    onChange={(e) => setNewRouteName(e.target.value)}
                                    placeholder="Nombre de Ruta" 
                                    className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 px-4 text-xs font-bold outline-none border-none placeholder:text-indigo-200" 
                                />
                            </div>
                        ) : (
                            <>
                                <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">{routeName}</h2>
                                <div className="flex items-center gap-2 text-indigo-100/60 text-xs font-bold mb-8">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                    ACTIVA PARA REPARTO
                                </div>
                            </>
                        )}
                        
                        <div className="space-y-6 mt-8">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-indigo-200/50 uppercase tracking-[0.2em] mb-1">Carga Bruta</span>
                                <span className="text-3xl font-black">${totalSelected.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-indigo-200/50 uppercase tracking-[0.2em] mb-1">Puntos de Entrega</span>
                                <span className="text-xl font-bold">{routeName === 'NEW' ? selectedOrders.length : orders.length} Clientes</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {routeName === 'NEW' ? (
                            <button 
                                onClick={handleCreateRoute}
                                disabled={isSaving}
                                className="w-full py-4 bg-white text-indigo-600 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSaving ? "Guardando..." : "Crear Reparto"}
                            </button>
                        ) : (
                            <button className="w-full py-4 bg-white text-indigo-600 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                                Descargar Hoja de Ruta
                            </button>
                        )}
                    </div>
                </div>

                {/* Contenido principal - Lista de Pedidos */}
                <div className="flex-1 overflow-y-auto custom-scroll p-10">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="font-black text-xl text-slate-800 dark:text-white flex items-center gap-2">
                             <Layers size={20} className="text-indigo-500" />
                             Manifiesto de Carga
                        </h3>
                        <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all">
                            <XCircle size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {orders.length === 0 ? (
                            <div className="py-20 text-center text-slate-400 font-bold uppercase text-[10px]">No hay pedidos disponibles</div>
                        ) : (
                            orders.map((o: any, i: number) => (
                                <motion.div 
                                    key={o.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => routeName === 'NEW' && toggleOrderSelection(o.id)}
                                    className={`p-6 border rounded-[28px] flex items-center justify-between hover:border-indigo-500/30 transition-all group cursor-pointer ${
                                        routeName === 'NEW' && selectedOrders.includes(o.id) 
                                        ? 'bg-indigo-500/5 border-indigo-500/50' 
                                        : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] shadow-sm transition-colors ${
                                            routeName === 'NEW' && selectedOrders.includes(o.id) ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-slate-800 text-indigo-500'
                                        }`}>
                                            {routeName === 'NEW' && selectedOrders.includes(o.id) ? <Check size={16} /> : `#${o.id.toString().slice(-4)}`}
                                        </div>
                                        <div>
                                            <p className="font-black text-sm">{o.cliente_nombre}</p>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase">
                                                <div className="flex items-center gap-1"><User size={10} /> {o.vendedor}</div>
                                                <div className="flex items-center gap-1"><MapPin size={10} /> {o.zona || "General"}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-6">
                                        <div className="hidden sm:block">
                                            <p className="font-black text-sm text-indigo-600">${parseFloat(o.total || 0).toLocaleString()}</p>
                                            <p className="text-[9px] text-slate-400 uppercase font-black">{o.items?.length || 0} ITEMS</p>
                                        </div>
                                        {routeName !== 'NEW' && (
                                            <button className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-300 group-hover:text-rose-500 transition-all">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
