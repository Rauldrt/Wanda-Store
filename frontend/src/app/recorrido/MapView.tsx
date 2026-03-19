"use client";

import React, { useState } from 'react';
import GoogleMapReact from 'google-map-react';

// You don't actually need an API key for development/demo if you accept the watermark
// But for production, you would add an API_KEY here.
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const Marker = ({ text, number, isLast }: any) => (
    <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        transform: 'translate(-50%, -100%)'
    }}>
        <div className={`w-8 h-8 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center ${isLast ? 'bg-rose-500 z-50 scale-125' : 'bg-indigo-500'}`}>
            <span className="text-[10px] text-white font-black">{number}</span>
        </div>

        {/* Tooltip on hover */}
        <div className="opacity-0 hover:opacity-100 absolute bottom-full mb-2 bg-white px-3 py-2 rounded-xl shadow-xl w-max transition-opacity z-[100] text-left border border-slate-100">
            {text}
        </div>
    </div>
);

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
