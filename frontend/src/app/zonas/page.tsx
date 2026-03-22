'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from "@/context/DataContext";
import { wandaApi } from "@/lib/api";
import { 
    MapPinned, Users, CheckSquare, Square, Save, 
    ArrowRight, Loader2, Map as MapIcon, RotateCcw
} from 'lucide-react';

export default function ZonasPage() {
    const { data, refreshData, setIsSyncing } = useData();
    const clients = data?.clients || [];
    const sellers = data?.sellers || [];

    const [selectedZone, setSelectedZone] = useState<string>("Global");
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Lista de Zonas base generada de los preventistas
    const officialZones = useMemo(() => {
        const zones = new Set<string>();
        zones.add("Global");
        sellers.forEach((s: any) => {
            if (s.Zona) zones.add(s.Zona);
        });
        return Array.from(zones).sort();
    }, [sellers]);

    // Calcular cuántos clientes hay en cada Zona
    const zoneStats = useMemo(() => {
        const stats: Record<string, number> = {};
        clients.forEach((c: any) => {
            const z = c.Zona || "Global";
            stats[z] = (stats[z] || 0) + 1;
        });
        return stats;
    }, [clients]);

    // Identificar todas las zonas que existen en los clientes, incluso si un prev no la tiene
    const allZones = useMemo(() => {
        const set = new Set([...officialZones, ...Object.keys(zoneStats)]);
        return Array.from(set).sort();
    }, [officialZones, zoneStats]);

    // Clientes puramente filtrados por la zona activa
    const filteredClients = useMemo(() => {
        return clients.filter((c: any) => (c.Zona || "Global") === selectedZone);
    }, [clients, selectedZone]);

    // Selección global
    const toggleSelectAll = () => {
        if (selectedClients.length === filteredClients.length) {
            setSelectedClients([]);
        } else {
            setSelectedClients(filteredClients.map((c: any) => String(c.ID_Cliente || c.id)));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedClients(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const [targetZone, setTargetZone] = useState<string>("");

    const handleReassign = async () => {
        if (!targetZone) {
            alert("Por favor selecciona una Zona de destino primero.");
            return;
        }
        if (selectedClients.length === 0) {
            alert("Por favor selecciona al menos un cliente para reasignar.");
            return;
        }

        try {
            setIsUpdating(true);
            setIsSyncing(true);
            
            const changes = selectedClients.map(id => ({
                id,
                Zona: targetZone
            }));

            await wandaApi.bulkUpdateClients(changes);
            
            // Para mantener cache limpia local opcional
            await refreshData();
            
            setSelectedClients([]);
            setTargetZone("");
            alert(`¡Se reasignaron ${changes.length} clientes a la zona ${targetZone} exitosamente!`);
        } catch (e) {
            console.error(e);
            alert("Ocurrió un error reasignando zonas.");
        } finally {
            setIsUpdating(false);
            setIsSyncing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black text-[var(--foreground)] tracking-tight flex items-center gap-2">
                    <MapPinned className="text-indigo-500" />
                    Gestión de Zonas
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Agrupa a tus clientes por zona de cobertura y reasígnalos masivamente.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Panel Zonas */}
                <div className="w-full md:w-1/3 space-y-3">
                    <div className="bg-[var(--card)] p-4 rounded-xl shadow-sm border border-[var(--border)]">
                        <h3 className="font-bold text-sm text-[var(--foreground)] mb-3 opacity-70 uppercase">Tus Zonas</h3>
                        <div className="space-y-1">
                            {allZones.map(z => {
                                const count = zoneStats[z] || 0;
                                const isActive = selectedZone === z;
                                return (
                                    <button
                                        key={z}
                                        onClick={() => { setSelectedZone(z); setSelectedClients([]); }}
                                        className={`w-full text-left flex items-center justify-between p-3 rounded-lg transition-colors ${
                                            isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-200 dark:border-indigo-500/30' 
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <MapIcon size={16} className={isActive ? "opacity-100" : "opacity-50"} />
                                            <span className="truncate">{z}</span>
                                        </div>
                                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                            isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                        }`}>
                                            {count}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Panel Clientes e Info */}
                <div className="w-full md:w-2/3 bg-[var(--card)] shadow-sm border border-[var(--border)] rounded-xl flex flex-col min-h-[500px]">
                    
                    {/* Toolbar de acción masiva */}
                    <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900 rounded-t-xl">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-500 transition-colors bg-white dark:bg-slate-800 border border-[var(--border)] px-3 py-1.5 rounded-lg"
                            >
                                {selectedClients.length === filteredClients.length && filteredClients.length > 0 ? (
                                    <CheckSquare size={16} className="text-indigo-500" />
                                ) : (
                                    <Square size={16} />
                                )}
                                <span className="font-bold">Todos</span>
                            </button>
                            <span className="text-xs font-bold text-slate-400">
                                {selectedClients.length} seleccionados
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <select
                                value={targetZone}
                                onChange={(e) => setTargetZone(e.target.value)}
                                className="text-sm bg-white dark:bg-slate-900 border border-[var(--border)] rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 transition-colors w-full sm:w-48"
                            >
                                <option value="" disabled>Elegir Nueva Zona...</option>
                                {officialZones.map(z => (
                                    <option key={z} value={z}>{z}</option>
                                ))}
                            </select>
                            
                            <button
                                onClick={handleReassign}
                                disabled={isUpdating || selectedClients.length === 0 || !targetZone}
                                className="flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 disabled:dark:bg-slate-700 text-white font-bold py-1.5 px-4 rounded-lg transition-colors"
                            >
                                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                                <span className="hidden sm:inline">Mover</span>
                            </button>
                        </div>
                    </div>

                    {/* Tabla de Clientes listados */}
                    <div className="p-0 overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="border-b border-[var(--border)] text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                                    <th className="p-4 w-12 text-center">Sel</th>
                                    <th className="p-4 text-center w-20">ID</th>
                                    <th className="p-4">Negocio</th>
                                    <th className="p-4 hidden sm:table-cell">Dirección</th>
                                    <th className="p-4 text-right">Contacto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClients.map((c: any) => {
                                    const id = String(c.ID_Cliente || c.id);
                                    const isSelected = selectedClients.includes(id);
                                    return (
                                        <tr 
                                            key={id} 
                                            onClick={() => toggleSelect(id)}
                                            className={`border-b border-[var(--border)] transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                                                isSelected ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''
                                            }`}
                                        >
                                            <td className="p-4 text-center">
                                                {isSelected ? (
                                                    <CheckSquare size={16} className="text-indigo-500 mx-auto" />
                                                ) : (
                                                    <Square size={16} className="text-slate-300 mx-auto" />
                                                )}
                                            </td>
                                            <td className="p-4 text-center text-xs font-bold text-slate-400">
                                                #{id.substring(0, 6)}
                                            </td>
                                            <td className="p-4">
                                                <p className="font-bold text-sm text-[var(--foreground)]">{c.Nombre_Negocio}</p>
                                                <p className="text-xs text-slate-400 truncate max-w-[200px]">{c.Vendedor_Asignado || "Sin Vendedor"}</p>
                                            </td>
                                            <td className="p-4 hidden sm:table-cell text-xs text-slate-500">
                                                {c.Direccion}
                                            </td>
                                            <td className="p-4 text-right text-xs text-slate-500">
                                                {c.Contacto}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredClients.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                            No hay clientes en esta zona actualmente.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
