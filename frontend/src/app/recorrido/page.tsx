"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useData } from "@/context/DataContext";
import dynamic from "next/dynamic";
import { Search, MapPin, Calendar, User as UserIcon, Navigation, Route } from "lucide-react";

// @ts-ignore
const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center animate-pulse bg-slate-100 dark:bg-slate-800 rounded-[32px]"><MapPin className="text-indigo-200 dark:text-slate-600" size={48} /></div> });

export default function RecorridoPage() {
    const { data } = useData();
    const pedidos = data?.pedidos || [];

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedVendedor, setSelectedVendedor] = useState<string>("Todos");

    useEffect(() => {
        // Init today's date if empty using local timezone to avoid UTC day-shifting
        if (!selectedDate) {
            const d = new Date();
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            setSelectedDate(`${yyyy}-${mm}-${dd}`);
        }
    }, [selectedDate]);

    // Extract all map points
    const mapPoints = useMemo(() => {
        const points: any[] = [];
        const gpsRegex = /(?:q=|lat=)([-0-9.]+),\s*([-0-9.]+)/i;

        pedidos.forEach((p: any) => {
            if (!p.fecha) return;
            const pDateObj = new Date(p.fecha);

            // Avoid failing with invalid dates
            if (isNaN(pDateObj.getTime())) return;

            // Reconstruct the YYYY-MM-DD from local timezone
            const pYear = pDateObj.getFullYear();
            const pMonth = String(pDateObj.getMonth() + 1).padStart(2, '0');
            const pDay = String(pDateObj.getDate()).padStart(2, '0');
            const dateStr = `${pYear}-${pMonth}-${pDay}`;

            if (selectedDate && dateStr !== selectedDate) return;
            if (selectedVendedor !== "Todos" && p.vendedor !== selectedVendedor) return;

            // Buscar en notas y por si a caso en reparto (debido al bug previo de columnas)
            const concatenatedText = `${p.notas || ""} ${p.reparto || ""}`;

            if (concatenatedText.includes('GPS') || concatenatedText.includes('maps.google')) {
                const match = concatenatedText.match(gpsRegex);
                if (match) {
                    points.push({
                        lat: parseFloat(match[1]),
                        lng: parseFloat(match[2]),
                        cliente: p.cliente_nombre,
                        vendedor: p.vendedor,
                        hora: pDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        total: p.total,
                        timestamp: pDateObj.getTime()
                    });
                }
            }
        });

        return points.sort((a, b) => a.timestamp - b.timestamp);
    }, [pedidos, selectedDate, selectedVendedor]);

    const vendedores = useMemo(() => {
        const set = new Set<string>();
        pedidos.forEach((p: any) => { if (p.vendedor && p.vendedor !== 'Web') set.add(p.vendedor) });
        return Array.from(set);
    }, [pedidos]);

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-800 dark:text-white">
                        <Route className="text-indigo-500" size={32} />
                        Recorrido
                    </h1>
                    <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">
                        Supervisión GPS en Tiempo Real
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm">
                        <Calendar size={18} className="text-slate-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-300 w-full"
                        />
                    </div>
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm">
                        <UserIcon size={18} className="text-slate-400" />
                        <select
                            value={selectedVendedor}
                            onChange={(e) => setSelectedVendedor(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-300 appearance-none min-w-[120px] cursor-pointer w-full"
                        >
                            <option value="Todos">Todos los Prev.</option>
                            {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-900 rounded-[32px] p-2 sm:p-4 shadow-xl shadow-black/5 border border-slate-100 dark:border-slate-800 flex flex-col relative z-0 overflow-hidden">
                <div className="absolute top-8 left-8 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-5 py-3 rounded-[20px] shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col pointer-events-none">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Puntos Registrados</span>
                    <span className="text-3xl font-black text-indigo-500 leading-none">{mapPoints.length}</span>
                </div>
                {typeof window !== "undefined" && <MapView points={mapPoints} />}
            </div>
        </div>
    );
}
