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

export function DataProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const res = await wandaApi.getAll();
            if (res.error) throw new Error(res.error);
            setData(res);
            setError(null);
        } catch (err: any) {
            setError(err.message || "Error al sincronizar con Google Sheets.");
        } finally {
            setLoading(false);
            setIsSyncing(false); // Reset on fetch done
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Opcional: Auto-refresco cada 5 minutos en segundo plano
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
