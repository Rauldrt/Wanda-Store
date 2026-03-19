"use client";

import React from 'react';
import GoogleMapReact from 'google-map-react';
import { Share2, ExternalLink } from 'lucide-react';

// You don't actually need an API key for development/demo if you accept the watermark
// But for production, you would add an API_KEY here.
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const Marker = ({ text, number, isLast, lat, lng, title }: any) => {
    const handleLocationClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, '_blank');
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        if (navigator.share) {
            navigator.share({
                title: 'Ubicación: ' + title,
                url: url
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(url);
            alert("Enlace copiado al portapapeles");
        }
    };

    return (
        <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transform: 'translate(-50%, -100%)'
        }} 
        className="group outline-none focus:outline-none" 
        tabIndex={0}
        // This blank onClick is required to trick iOS Safari into firing hover/focus pseudoclasses
        onClick={(e) => { e.currentTarget.focus(); }}
        >
            <div className={`w-8 h-8 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center ${isLast ? 'bg-rose-500 z-50 scale-125' : 'bg-indigo-500'}`}>
                <span className="text-[10px] text-white font-black">{number}</span>
            </div>

            {/* Tooltip on hover/focus with invisible bridge */}
            <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus:opacity-100 group-focus:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto absolute bottom-full pb-2 z-[100] transition-all flex flex-col items-center">
                <div className="bg-white px-3 py-3 rounded-2xl shadow-2xl w-max text-left border border-slate-100 flex flex-col gap-2">
                    <div>{text}</div>
                    <div className="flex gap-2 border-t border-slate-100 pt-2 mt-1">
                         <button onClick={handleLocationClick} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors">
                             <ExternalLink size={12} /> Abrir
                         </button>
                         <button onClick={handleShare} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors">
                             <Share2 size={12} /> Compartir
                         </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function MapView({ points }: { points: any[] }) {
    if (points.length === 0) {
        return <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-slate-200 rounded-[24px]">Sin ubicaciones registradas</div>
    }

    const startIdx = Math.floor(points.length / 2);
    const centerPoint = points[startIdx];

    return (
        <div style={{ height: '100%', width: '100%', borderRadius: '24px', overflow: 'hidden' }}>
            <GoogleMapReact
                bootstrapURLKeys={API_KEY ? { key: API_KEY } : undefined}
                defaultCenter={{
                    lat: centerPoint.lat,
                    lng: centerPoint.lng
                }}
                defaultZoom={13}
            >
                {points.map((p, i) => (
                    <Marker
                        key={i}
                        lat={p.lat}
                        lng={p.lng}
                        number={i + 1}
                        isLast={i === points.length - 1}
                        title={p.cliente}
                        text={
                            <>
                                <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest block">{p.hora}</span>
                                <h4 className="text-xs font-black text-slate-800 leading-tight mb-0.5">{p.cliente}</h4>
                                <span className="text-[10px] items-center justify-between w-full flex min-w-[120px]">
                                    <span className="text-slate-400 font-medium">{p.vendedor}</span>
                                    <span className="text-emerald-500 font-black">${p.total}</span>
                                </span>
                            </>
                        }
                    />
                ))}
            </GoogleMapReact>
        </div>
    );
}
