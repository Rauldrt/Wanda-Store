"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, getDocs } from "firebase/firestore";
import { Package, Check, RefreshCw, Download, Search } from "lucide-react";

const OLD_API_URL = "https://script.google.com/macros/s/AKfycbxBuAYYQM5brzMeDJRh-vPu5L91F6GQfqyeogEE97g4ELO_J4R8ZLLCfJ67SXimDOIS_g/exec";
const OLD_API_KEY = "WANDA_SECRET_KEY_2024";

export default function MigracionPage() {
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [status, setStatus] = useState("Listo para buscar pedidos rezagados.");
    const [search, setSearch] = useState("");

    const fetchData = async () => {
        setLoading(true);
        setStatus("Conectando con Google Sheets y Firebase...");
        try {
            // Fetch Firebase Orders
            const fbSnap = await getDocs(collection(db, "orders"));
            const existingIds = new Set(fbSnap.docs.map(d => String(d.id)));

            // Fetch Old App Orders
            const url = `${OLD_API_URL}?action=get_all&key=${OLD_API_KEY}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data && data.orders) {
                // Filtrar solo los pedidos que NO están en firebase
                const missingOrders = data.orders.filter((o: any) => !existingIds.has(String(o.id)));
                missingOrders.reverse(); // Los más recientes primero
                setOrders(missingOrders);
                setStatus(`Se encontraron ${missingOrders.length} pedidos en la app vieja que NO están en Firebase.`);
            } else {
                setStatus("No se encontraron pedidos en la app antigua.");
            }
        } catch (error: any) {
            console.error(error);
            setStatus("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const selectAll = () => {
        const filtered = orders.filter(o =>
            o.id?.toLowerCase().includes(search.toLowerCase()) ||
            o.cliente_nombre?.toLowerCase().includes(search.toLowerCase())
        );
        const next = new Set(selectedIds);
        let allSelected = true;

        for (const o of filtered) {
            if (!next.has(String(o.id))) {
                allSelected = false;
                break;
            }
        }

        if (allSelected) {
            filtered.forEach(o => next.delete(String(o.id)));
        } else {
            filtered.forEach(o => next.add(String(o.id)));
        }

        setSelectedIds(next);
    };

    const syncSelected = async () => {
        if (selectedIds.size === 0) {
            alert("No hay pedidos seleccionados.");
            return;
        }

        if (!confirm(`¿Estás seguro de sincronizar los ${selectedIds.size} pedidos seleccionados hacia Firebase?`)) return;

        setLoading(true);
        setStatus(`Migrando ${selectedIds.size} pedidos...`);

        try {
            const toMigrate = orders.filter(o => selectedIds.has(String(o.id)));

            // Separar en batches de 400
            const chunks = [];
            for (let i = 0; i < toMigrate.length; i += 400) {
                chunks.push(toMigrate.slice(i, i + 400));
            }

            let bIndex = 1;
            for (const chunk of chunks) {
                setStatus(`Moviendo lote ${bIndex} de ${chunks.length}...`);
                const batch = writeBatch(db);
                chunk.forEach(ord => {
                    const idStr = String(ord.id).replace(/\//g, "-").trim();
                    const docRef = doc(collection(db, "orders"), idStr);
                    batch.set(docRef, ord);
                });
                await batch.commit();
                bIndex++;
            }

            setStatus("¡Migración exitosa!");
            setSelectedIds(new Set());
            await fetchData();

        } catch (error: any) {
            console.error(error);
            setStatus("Error al sincronizar: " + error.message);
            setLoading(false);
        }
    };

    const filteredOrders = orders.filter(o =>
        o.id?.toLowerCase().includes(search.toLowerCase()) ||
        o.cliente_nombre?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 md:p-10 max-w-6xl mx-auto min-h-screen">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">

                <div className="p-6 md:p-8 bg-indigo-600 border-b border-indigo-700 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-3">
                            <RefreshCw className={loading ? "animate-spin" : ""} /> Recuperador de Pedidos Rezagados
                        </h1>
                        <p className="opacity-80 text-sm mt-1">Sincroniza pedidos que quedaron sin pasar de Google Sheets a Firebase.</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex-1 md:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Search size={18} /> Buscar Olvidados
                        </button>
                        {selectedIds.size > 0 && (
                            <button
                                onClick={syncSelected}
                                disabled={loading}
                                className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Download size={18} /> Sincronizar ({selectedIds.size})
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 w-full md:w-auto">Estado: <span className="text-indigo-600 dark:text-indigo-400">{status}</span></p>

                    {orders.length > 0 && (
                        <div className="flex gap-2 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Buscar cliente o ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full md:w-64 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
                    {orders.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <Package size={64} className="mb-4" />
                            <p className="font-bold text-lg">No hay pedidos pendientes de migrar.</p>
                            <p className="text-sm">Click en "Buscar Olvidados" para revisar.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={selectAll}
                                        className="text-xs font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 px-4 py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                                    >
                                        Seleccionar Todo / Nada
                                    </button>
                                    <span className="text-sm font-bold text-slate-500">{selectedIds.size} marcados de {filteredOrders.length} filtrados</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {filteredOrders.map(order => {
                                    const isSelected = selectedIds.has(String(order.id));
                                    const subtotal = parseFloat(order.total) || 0;
                                    return (
                                        <div
                                            key={order.id}
                                            onClick={() => toggleSelection(String(order.id))}
                                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex gap-4 items-center ${isSelected
                                                    ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 shadow-md shadow-indigo-500/10'
                                                    : 'bg-white dark:bg-slate-900 border-transparent border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                        >
                                            <div className={`w-6 h-6 rounded-md shrink-0 border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600'
                                                }`}>
                                                {isSelected && <Check size={14} strokeWidth={4} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-black text-slate-800 dark:text-slate-100 truncate pr-4 text-sm">{order.cliente_nombre}</h4>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-slate-500">
                                                    <span>📅 {order.fecha ? new Date(order.fecha).toLocaleDateString() : 'Sin Fecha'}</span>
                                                    <span>📦 {order.items?.length || 0} ítems</span>
                                                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">#{String(order.id).slice(-6)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-xl font-black text-slate-800 dark:text-slate-100">${subtotal.toLocaleString()}</div>
                                                <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md inline-block mt-1 ${order.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' :
                                                        order.estado === 'Entregado' ? 'bg-emerald-100 text-emerald-700' :
                                                            'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {order.estado}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
