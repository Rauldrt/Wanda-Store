"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { wandaApi } from '@/lib/api';
import { Product, Client, Order, Seller, WandaConfig, ClientRequest, Liquidation } from '@/types/wanda';

interface DataState {
    products: Product[];
    clients: Client[];
    orders: Order[];
    sellers: Seller[];
    config: WandaConfig;
    liquidaciones?: Liquidation[];
    client_requests?: ClientRequest[];
}

interface DataContextType {
    data: DataState | null;
    loading: boolean;
    isSyncing: boolean;
    error: string | null;
    refreshData: (isSilent?: boolean) => Promise<void>;
    setIsSyncing: (val: boolean) => void;
    activeAlert: { id: string; client: string; total: number } | null;
    setActiveAlert: (alert: { id: string; client: string; total: number } | null) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const CACHE_KEY = "wanda_cloud_data_cache";

const playNotificationTone = () => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const audioCtx = new AudioContextClass();
        
        const playTone = (freq: number, duration: number, delay: number) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
            osc.start(audioCtx.currentTime + delay);
            osc.stop(audioCtx.currentTime + delay + duration);
        };

        // Doble pitido premium ascendente (Re5 y La5)
        playTone(587.33, 0.15, 0); 
        playTone(880.00, 0.3, 0.15); 
    } catch (e) {
        console.warn("Audio Context bloqueado o no soportado:", e);
    }
};

export function DataProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<DataState | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeAlert, setActiveAlert] = useState<{ id: string; client: string; total: number } | null>(null);

    const dataRef = useRef<DataState | null>(null);
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        // Load from cache on mount (client-side only)
        const saved = localStorage.getItem(CACHE_KEY);
        if (saved) {
            setData(JSON.parse(saved));
            setLoading(false);
        }
    }, []);

    const fetchData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent && !localStorage.getItem(CACHE_KEY)) setLoading(true);
            const oldOrders = dataRef.current?.orders || [];
            const res = await wandaApi.getAll();
            if (res.error) throw new Error(res.error);

            setData(res as unknown as DataState);
            if (typeof window !== 'undefined') {
                localStorage.setItem(CACHE_KEY, JSON.stringify(res));
            }
            setError(null);

            const newOrders = (res as any).orders || [];
            
            // Si ya teníamos pedidos y ahora llegaron más
            if (oldOrders.length > 0 && newOrders.length > oldOrders.length) {
                const oldIds = new Set(oldOrders.map((o: any) => o.id));
                const newlyAdded = newOrders.filter((o: any) => !oldIds.has(o.id));
                
                if (newlyAdded.length > 0) {
                    const isTienda = typeof window !== 'undefined' && window.location.pathname.includes('/tienda');
                    if (!isTienda) {
                        const order = newlyAdded[0];
                        setActiveAlert({
                            id: order.id,
                            client: order.cliente_nombre || order.cliente?.Nombre_Negocio || "Cliente Online",
                            total: parseFloat(order.total) || 0
                        });
                        playNotificationTone();
                    }
                }
            }
        } catch (err: unknown) {
            console.error("Fetch data error:", err);
            if (!localStorage.getItem(CACHE_KEY)) {
                const errMsg = err instanceof Error ? err.message : "Error al sincronizar. Verifica tu conexión.";
                setError(errMsg);
            }
        } finally {
            setLoading(false);
            setIsSyncing(false);
        }
    }, []);

    useEffect(() => {
        fetchData(!!data); // Se ejecuta al montar
        
        // Polling rápido (30s) en páginas de administración para alertar pedidos rápido
        const isTienda = typeof window !== 'undefined' && window.location.pathname.includes('/tienda');
        const intervalTime = isTienda ? 5 * 60 * 1000 : 30 * 1000;

        const interval = setInterval(() => fetchData(true), intervalTime);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <DataContext.Provider value={{
            data,
            loading,
            isSyncing,
            error,
            refreshData: fetchData,
            setIsSyncing,
            activeAlert,
            setActiveAlert
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData debe usarse dentro de un DataProvider');
    }
    return context;
}
