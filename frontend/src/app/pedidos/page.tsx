"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Search, 
    Filter, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    ExternalLink, 
    MoreVertical, 
    MapPin, 
    Phone, 
    Package, 
    Calendar,
    ChevronDown,
    Trash2,
    Check,
    AlertCircle,
    ShoppingBag,
    Eye,
    Users,
    Zap,
    TrendingUp,
    Globe
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { wandaApi } from "@/lib/api";
import { printOrders } from "@/lib/pdfUtils";
import { Printer } from "lucide-react";

export default function PedidosAdmin() {
    const { data, loading, refreshData } = useData();
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("Todos");
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    const tabs = ["Todos", "Pendiente", "En Preparación", "Entregado", "PRUEBA", "Cancelado"];

    const filteredOrders = useMemo(() => {
        let orders = data?.orders || [];
        
        // Fix for ID sorting (newest first)
        orders = [...orders].sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        if (activeTab !== "Todos") {
            orders = orders.filter((o: any) => o.estado === activeTab);
        }

        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            orders = orders.filter((o: any) => 
                o.cliente_nombre?.toLowerCase().includes(query) || 
                o.id?.toString().includes(query)
            );
        }

        return orders;
    }, [data, activeTab, searchTerm]);

    const stats = useMemo(() => {
        const os = data?.orders || [];
        const today = new Date().toISOString().slice(0, 10);
        return {
            total: os.length,
            pending: os.filter((o: any) => o.estado === "Pendiente").length,
            today: os.filter((o: any) => o.fecha && o.fecha.startsWith(today)).length,
            revenue: os.filter((o: any) => o.estado !== "Cancelado").reduce((acc: number, o: any) => acc + (parseFloat(o.total) || 0), 0)
        };
    }, [data]);

    const updateOrderStatus = async (id: string, newStatus: string) => {
        if (!confirm(`¿Cambiar estado a ${newStatus}?`)) return;
        try {
            await wandaApi.updateStatus(id, newStatus);
            refreshData();
        } catch (e) {
            alert("Error al actualizar estado");
        }
    };

    const deleteOrder = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar permanentemente este pedido?")) return;
        try {
            await wandaApi.deleteOrder(id);
            refreshData();
        } catch (e) {
            alert("Error al eliminar pedido");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 animate-pulse">Sincronizando Pedidos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header Moderno */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-800 dark:text-white">Gestión de Pedidos</h1>
                    <p className="text-slate-500 text-sm mt-1">Control centralizado de ventas online y directas.</p>
                </div>

                <div className="grid grid-cols-2 md:flex gap-3">
                    <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center min-w-[120px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendientes</span>
                        <div className="flex items-center gap-2">
                           <span className="text-xl font-black text-amber-500">{stats.pending}</span>
                           <Clock size={14} className="text-amber-500/50" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center min-w-[120px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoy</span>
                        <div className="flex items-center gap-2">
                           <span className="text-xl font-black text-indigo-500">{stats.today}</span>
                           <Zap size={14} className="text-indigo-500/50" />
                        </div>
                    </div>
                    <div className="bg-indigo-500 px-8 py-3 rounded-3xl shadow-lg shadow-indigo-500/20 flex flex-col justify-center">
                        <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Ventas Totales</span>
                        <span className="text-xl font-black text-white">${stats.revenue.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Filtros e Interacción */}
            <div className="sticky top-0 z-30 bg-[var(--background)]/80 backdrop-blur-xl py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl gap-1 overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-xl' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar pedido o cliente..."
                        className="w-full md:w-80 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                    />
                </div>
            </div>

            {/* Grid de Pedidos Estilo E-commerce */}
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredOrders.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full py-24 text-center space-y-4"
                        >
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <ShoppingBag size={40} />
                            </div>
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No hay pedidos en esta sección</p>
                        </motion.div>
                    ) : (
                        filteredOrders.map((order: any) => (
                            <OrderCard 
                                key={order.id} 
                                order={order} 
                                globalData={data}
                                onSelect={() => setSelectedOrderId(order.id)}
                                onUpdateStatus={updateOrderStatus}
                                onDelete={deleteOrder}
                            />
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Modal de Detalle Moderno */}
            <AnimatePresence>
                {selectedOrderId && (
                    <OrderDetailModal 
                        order={data.orders.find((o:any) => o.id === selectedOrderId)} 
                        globalData={data}
                        onClose={() => setSelectedOrderId(null)} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function OrderCard({ order, globalData, onSelect, onUpdateStatus, onDelete }: any) {
    const statusColors: any = {
        "Pendiente": "text-amber-500 bg-amber-500/10 border-amber-500/20",
        "En Preparación": "text-blue-500 bg-blue-500/10 border-blue-500/20",
        "Entregado": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        "Cancelado": "text-rose-500 bg-rose-500/10 border-rose-500/20",
        "PRUEBA": "text-indigo-500 bg-indigo-500/10 border-indigo-500/20"
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group relative bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-black/20 hover:border-indigo-500/30 transition-all"
        >
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">#{order.id.toString().slice(-6)}</span>
                        {(order.vendedor === 'WEB' || order.vendedor === 'Web' || order.notas?.includes('[ONLINE]')) && (
                            <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border border-indigo-100 dark:border-indigo-900/30">
                                <Globe size={8} /> Online
                            </div>
                        )}
                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter border ${statusColors[order.estado] || statusColors.Pendiente}`}>
                            {order.estado}
                        </div>
                    </div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white line-clamp-1">{order.cliente_nombre}</h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                        onClick={() => printOrders([order], globalData?.config, globalData?.products, globalData?.orders)} 
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                        title="Imprimir Remito"
                   >
                        <Printer size={18} />
                   </button>
                   <button onClick={onSelect} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"><Eye size={18} /></button>
                   <button onClick={() => onDelete(order.id)} className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/10 text-rose-500 hover:bg-rose-100 transition-all"><Trash2 size={18} /></button>
                </div>
            </div>

            <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-slate-400">
                    <Calendar size={14} className="shrink-0" />
                    <span className="text-[10px] font-bold uppercase">{new Date(order.fecha).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                    <Package size={14} className="shrink-0" />
                    <span className="text-[10px] font-bold uppercase">{order.items?.length || 0} Productos</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-slate-400 group/map">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <MapPin size={14} className="shrink-0" />
                        <span className="text-[10px] font-bold uppercase line-clamp-1">{order.notas?.match(/Dir: (.*?) \| GPS/)?.[1] || order.direccion || "Entrega Local"}</span>
                    </div>
                    {((order.gps && order.gps !== "") || order.notas?.includes('GPS:')) && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const gps = order.gps || order.notas?.match(/GPS: (.*?) \|/)?.[1] || order.notas?.match(/GPS: (.*?)$/)?.[1];
                                if (gps) window.open(`https://www.google.com/maps/search/?api=1&query=${gps}`, '_blank');
                            }}
                            className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 opacity-0 group-hover/map:opacity-100 transition-all hover:bg-indigo-500 hover:text-white"
                            title="Ver en Google Maps"
                        >
                            <ExternalLink size={12} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Total</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">${parseFloat(order.total).toLocaleString()}</span>
                </div>
                
                <div className="flex gap-2">
                    {order.estado === 'Pendiente' && (
                        <button 
                            onClick={() => onUpdateStatus(order.id, 'En Preparación')}
                            className="bg-indigo-500 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            Preparar
                        </button>
                    )}
                    {order.estado === 'En Preparación' && (
                        <button 
                            onClick={() => onUpdateStatus(order.id, 'Entregado')}
                            className="bg-emerald-500 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            Entregar
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function OrderDetailModal({ order, globalData, onClose }: any) {
    if (!order) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
                onClick={onClose} 
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Detalle de Pedido</span>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white">#{order.id.slice(-8)}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => printOrders([order], globalData?.config, globalData?.products, globalData?.orders)}
                            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <Printer size={16} /> Imprimir Comprobante
                        </button>
                        <button onClick={onClose} className="w-12 h-12 flex items-center justify-center hover:bg-rose-500 hover:text-white rounded-2xl transition-all group">
                            <XCircle size={20} className="group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Información del Cliente */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[32px] p-6 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center">
                                <Users size={24} />
                            </div>
                            <div className="flex-1 space-y-2">
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Información del Cliente</h4>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{order.cliente_nombre}</p>
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-bold group">
                                <MapPin size={16} className="text-indigo-500" />
                                {order.direccion || "Retiro en Local"}
                                {((order.gps && order.gps !== "") || order.notas?.includes('GPS:')) && (
                                    <button 
                                        onClick={() => {
                                            const gps = order.gps || order.notas?.match(/GPS: (.*?) \|/)?.[1] || order.notas?.match(/GPS: (.*?)$/)?.[1];
                                            if (gps) window.open(`https://www.google.com/maps/search/?api=1&query=${gps}`, '_blank');
                                        }}
                                        className="ml-2 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full text-[10px] uppercase font-black hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-1 shadow-sm"
                                    >
                                        <ExternalLink size={10} /> Ver Mapa
                                    </button>
                                )}
                            </div>
                        </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Dirección</span>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{order.notas?.match(/Dir: (.*?) \| GPS/)?.[1] || "No especificada"}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Contacto</span>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{order.notas?.match(/Tel: (.*?) \| Dir/)?.[1] || "No especificada"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Productos */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Resumen de Productos</h4>
                        <div className="space-y-2">
                            {order.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-indigo-500/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-500 font-black text-xs">
                                            {item.cantidad}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800 dark:text-white">{item.nombre || item.id_producto}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{item.descripcion || 'Unidad Comercial'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-indigo-600">${parseFloat(item.subtotal || 0).toLocaleString()}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">${parseFloat(item.precio || 0).toLocaleString()} c/u</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Facturado</span>
                        <span className="text-3xl font-black text-slate-900 dark:text-white leading-none mt-1">${parseFloat(order.total).toLocaleString()}</span>
                    </div>
                    {order.gps && (
                        <a 
                            href={order.gps} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-indigo-500 text-white px-6 py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-black transition-all"
                        >
                            <MapPin size={18} />
                            Ver en Maps
                        </a>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
