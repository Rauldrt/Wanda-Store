"use client";

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icons
const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

export default function MapView({ points }: { points: any[] }) {
    if (points.length === 0) {
        return <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Sin ubicaciones registradas</div>
    }

    const startIdx = Math.floor(points.length / 2);
    const centerPoint = points[startIdx];
    const pathPositions = points.map(p => [p.lat, p.lng] as [number, number]);

    return (
        <MapContainer center={[centerPoint.lat, centerPoint.lng]} zoom={14} style={{ height: '100%', width: '100%', borderRadius: '24px', zIndex: 10 }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {points.map((p, i) => (
                <Marker key={i} position={[p.lat, p.lng]} icon={icon}>
                    <Popup className="custom-popup">
                        <div className="font-sans min-w-[150px]">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{p.hora}</span>
                            <h4 className="text-sm font-black text-slate-800 leading-tight my-1">{p.cliente}</h4>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-500 font-bold">{p.vendedor}</span>
                                <span className="text-xs font-black text-indigo-500">${p.total}</span>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
            <Polyline positions={pathPositions} color="#6366f1" weight={4} opacity={0.6} />
        </MapContainer>
    );
}
