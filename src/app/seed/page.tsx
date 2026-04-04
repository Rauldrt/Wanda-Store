"use client";
import { useState, useEffect } from 'react';
import { wandaApi } from '@/lib/api';
import Link from 'next/link';

export default function SeedPage() {
    const [status, setStatus] = useState<string>('Esperando...');
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    const startSeeding = async () => {
        setStatus('Procesando...');
        addLog('Iniciando carga de datos...');

        const products = [
            { ID_Producto: 'PROD-001', Nombre: 'Queso Cremoso Wanda (4kg)', Precio_Unitario: 4500, Stock_Actual: 100, Categoria: 'Quesos' },
            { ID_Producto: 'PROD-002', Nombre: 'Queso Sardo Wanda (1kg)', Precio_Unitario: 5500, Stock_Actual: 50, Categoria: 'Quesos' },
            { ID_Producto: 'PROD-003', Nombre: 'Leche Entera Wanda (1L)', Precio_Unitario: 1200, Stock_Actual: 240, Categoria: 'Lácteos' },
            { ID_Producto: 'PROD-004', Nombre: 'Manteca Superior Wanda (200g)', Precio_Unitario: 800, Stock_Actual: 150, Categoria: 'Lácteos' },
            { ID_Producto: 'PROD-005', Nombre: 'Dulce de Leche Repostero (400g)', Precio_Unitario: 1800, Stock_Actual: 80, Categoria: 'Dulces' },
            { ID_Producto: 'PROD-006', Nombre: 'Yogur Entero Vainilla Wanda', Precio_Unitario: 1100, Stock_Actual: 120, Categoria: 'Lácteos' },
            { ID_Producto: 'PROD-007', Nombre: 'Mozzarella Trozada Wanda', Precio_Unitario: 4800, Stock_Actual: 60, Categoria: 'Quesos' },
            { ID_Producto: 'PROD-008', Nombre: 'Queso Tybo en Fetas', Precio_Unitario: 5200, Stock_Actual: 40, Categoria: 'Quesos' },
            { ID_Producto: 'PROD-009', Nombre: 'Crema de Leche Wanda (250cc)', Precio_Unitario: 1500, Stock_Actual: 90, Categoria: 'Lácteos' },
            { ID_Producto: 'PROD-010', Nombre: 'Ricotta Entera Wanda', Precio_Unitario: 2100, Stock_Actual: 35, Categoria: 'Quesos' },
        ];

        try {
            // Guardar configuración inicial de Admin
            addLog('Configurando claves de acceso Admin...');
            await wandaApi.saveConfig({
                AUTH_ADMIN_PASSWORD: 'admin',
                TIENDA_NAME: 'Wanda Online Store',
                TIENDA_DESC: 'Nueva tienda oficial de Wanda en línea'
            });

            // Guardar productos
            for (const p of products) {
                addLog(`Cargando: ${p.Nombre}...`);
                await wandaApi.saveProduct(p);
            }

            setStatus('¡ÉXITO!');
            addLog('✅ Todos los productos y la config han sido cargados.');
        } catch (e: any) {
            setStatus('ERROR');
            addLog(`❌ Error: ${e.message}`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-black text-white font-sans">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Wanda Seed Tool
            </h1>
            <p className="mb-8 text-zinc-400">Presiona el botón para inyectar los datos en el nuevo proyecto de Firebase.</p>
            
            <button 
                onClick={startSeeding}
                disabled={status === 'Procesando...'}
                className="px-8 py-3 bg-white text-black rounded-full font-bold hover:scale-105 transition-all disabled:opacity-50"
            >
                {status === 'Esperando...' ? 'Cargar Catálogo Inicial' : status}
            </button>

            <div className="mt-8 w-full max-w-md bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 h-64 overflow-y-auto">
                {logs.map((log, i) => (
                    <div key={i} className="text-sm text-zinc-500 mb-1 font-mono">{log}</div>
                ))}
            </div>

            <div className="mt-8 flex gap-4">
                <Link href="/login" className="text-blue-400 hover:underline">Volver al Login</Link>
                <Link href="/" className="text-blue-400 hover:underline">Ir al Dashboard</Link>
            </div>
        </div>
    );
}
