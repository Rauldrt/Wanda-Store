"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { wandaApi } from '@/lib/api';

interface DataContextType {
    data: any;
    loading: boolean;
    isSyncing: boolean;
    error: string | null;
    refreshData: (isSilent?: boolean) => Promise<void>;
    setIsSyncing: (val: boolean) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const CACHE_KEY = "wanda_cloud_data_cache";

export function DataProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<any>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(CACHE_KEY);
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    });
    const [loading, setLoading] = useState(!data); // No cargar si ya hay cache
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent && !data) setLoading(true); // Solo mostrar loader si no hay nada en cache
            const res = await wandaApi.getAll();
            if (res.error) throw new Error(res.error);

            setData(res);
            if (typeof window !== 'undefined') {
                localStorage.setItem(CACHE_KEY, JSON.stringify(res));
            }
            setError(null);
        } catch (err: any) {
            console.error("Fetch data error:", err);
            // Si hay error pero tenemos cache, no mostramos error crítico, solo un aviso opcional
            if (!data) {
                setError(err.message || "Error al sincronizar. Verifica tu conexión.");
            }
        } finally {
            setLoading(false);
            setIsSyncing(false);
        }
    }, [data]);

    useEffect(() => {
        fetchData(!!data); // Si ya tenemos data del cache, hacemos el fetch silencioso
        const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <DataContext.Provider value={{
            data,
            loading,
            isSyncing,
            error,
            refreshData: fetchData,
            setIsSyncing
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
