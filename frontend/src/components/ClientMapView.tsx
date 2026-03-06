"use client";

import React, { useState } from 'react';
import GoogleMapReact from 'google-map-react';
import { MapPin, Building2, ChevronRight } from 'lucide-react';

const API_KEY = ''; // Add API key if needed

const ClientMarker = ({ client, onView }: any) => {
    const [showLabel, setShowLabel] = useState(false);

    return (
        <div
            style={{ position: 'relative', transform: 'translate(-50%, -100%)', cursor: 'pointer', zIndex: showLabel ? 100 : 1 }}
            onMouseEnter={() => setShowLabel(true)}
            onMouseLeave={() => setShowLabel(false)}
            onClick={(e) => {
                e.stopPropagation();
                onView();
            }}
        >
            <div className={`w-8 h-8 rounded-xl bg-white shadow-lg border-2 flex items-center justify-center transition-all ${showLabel ? 'border-indigo-500 scale-110' : 'border-indigo-200'}`}>
                <MapPin size={16} className="text-indigo-500" strokeWidth={3} />
            </div>

            {showLabel && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-4 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                            <Building2 size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black text-xs text-slate-800 dark:text-slate-100 truncate uppercase tracking-tight">
                                {client.Nombre_Negocio}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-bold truncate italic">{client.Direccion}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase tracking-widest">{client.Zona || 'SIN ZONA'}</span>
                        </div>
                        <span className="text-indigo-500 text-[10px] font-black uppercase flex items-center gap-1">
                            Ver Ficha <ChevronRight size={12} />
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export function getClientCoordinates(c: any): { lat: number, lng: number } | null {
    if (!c) return null;

    // 1. Buscamos valores de lat/lng en todas las variantes posibles
    let latVal = c.Latitud ?? c.latitud ?? c.lat ?? c.LAT ?? c.latitude ?? c.Latitude ?? c.LATITUD;
    let lngVal = c.Longitud ?? c.longitud ?? c.lng ?? c.LONG ?? c.lon ?? c.LON ?? c.longitude ?? c.Longitude ?? c.LONGITUD;

    // Si aún no lo encuentra, buscamos keys ignorando mayúsculas/minúsculas
    if (latVal === undefined) {
        const latKey = Object.keys(c).find(k => ['lat', 'latitud', 'latitude'].includes(k.toLowerCase().trim()));
        if (latKey) latVal = c[latKey];
    }
    if (lngVal === undefined) {
        const lngKey = Object.keys(c).find(k => ['lng', 'lon', 'long', 'longitud', 'longitude'].includes(k.toLowerCase().trim()));
        if (lngKey) lngVal = c[lngKey];
    }

    if (latVal !== undefined && latVal !== null && String(latVal).trim() !== "" &&
        lngVal !== undefined && lngVal !== null && String(lngVal).trim() !== "") {
        const lat = parseFloat(String(latVal).replace(',', '.'));
        const lng = parseFloat(String(lngVal).replace(',', '.'));
        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
            return { lat, lng };
        }
    }

    // 2. Buscar en campos tipo string (Ej: "-34.123, -58.456")
    const coordsStr = String(c.Coordenadas_GPS || c.gps || c.Ubicacion || "");
    if (coordsStr && coordsStr.trim() !== "") {
        const gpsRegex = /(-?\d+[.,]\d+)[,\s]+(-?\d+[.,]\d+)/;
        const match = coordsStr.match(gpsRegex);
        if (match) {
            const lat = parseFloat(match[1].replace(',', '.'));
            const lng = parseFloat(match[2].replace(',', '.'));
            if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
                return { lat, lng };
            }
        }
    }

    return null;
}

export default function ClientMapView({ clients, onViewClient }: { clients: any[], onViewClient: (c: any) => void }) {
    // Parse coordinates and filter clients that have valid ones
    const points = clients.map(c => {
        const coords = getClientCoordinates(c);
        if (coords) {
            return { ...c, lat: coords.lat, lng: coords.lng };
        }
        return null;
    }).filter(Boolean) as any[];

    const defaultCenter = points.length > 0
        ? { lat: points[0].lat, lng: points[0].lng }
        : { lat: -34.6037, lng: -58.3816 }; // Buenos Aires as fallback

    if (points.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 space-y-4">
                <MapPin size={48} className="opacity-20" />
                <p className="font-black uppercase tracking-widest text-xs">No hay clientes con coordenadas válidas para mostrar</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full rounded-[2.5rem] overflow-hidden border border-[var(--border)] shadow-inner relative min-h-[500px]">
            <GoogleMapReact
                bootstrapURLKeys={API_KEY ? { key: API_KEY } : undefined}
                defaultCenter={defaultCenter}
                defaultZoom={11}
            >
                {points.map((p, i) => (
                    <ClientMarker
                        key={p.id || p.ID_Cliente || i}
                        lat={p.lat}
                        lng={p.lng}
                        client={p}
                        onView={() => onViewClient(p)}
                    />
                ))}
            </GoogleMapReact>

            <div className="absolute bottom-6 left-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-xl z-10 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                    {points.length} Clientes Ubicados
                </span>
            </div>
        </div>
    );
}
