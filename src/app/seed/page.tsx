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
            { ID_Producto: 'PERF-001', Nombre: 'Yara Lattafa (Femenino)', Precio_Unitario: 35000, Stock_Actual: 20, Categoria: 'FEMENINOS', Costo: 20000, Precio_Decant: 4500, Stock_Decant: 15, Volumen_Decant: '10ml', Unidad: 'Unid' },
            { ID_Producto: 'PERF-002', Nombre: 'Asad Lattafa (Masculino)', Precio_Unitario: 32000, Stock_Actual: 15, Categoria: 'MASCULINOS', Costo: 18000, Precio_Decant: 4200, Stock_Decant: 10, Volumen_Decant: '10ml', Unidad: 'Unid' },
            { ID_Producto: 'PERF-003', Nombre: 'Khamrah Lattafa (Unisex)', Precio_Unitario: 40000, Stock_Actual: 25, Categoria: 'UNISEX', Costo: 25000, Precio_Decant: 5000, Stock_Decant: 20, Volumen_Decant: '10ml', Unidad: 'Unid' },
            { ID_Producto: 'PERF-004', Nombre: 'Club de Nuit Intense Man', Precio_Unitario: 38000, Stock_Actual: 18, Categoria: 'MASCULINOS', Costo: 22000, Precio_Decant: 4800, Stock_Decant: 12, Volumen_Decant: '8ml', Unidad: 'Unid' },
            { ID_Producto: 'PERF-005', Nombre: 'Santal Oud (Unisex)', Precio_Unitario: 28000, Stock_Actual: 10, Categoria: 'UNISEX', Costo: 15000, Precio_Decant: 3800, Stock_Decant: 8, Volumen_Decant: '10ml', Unidad: 'Unid' },
            { ID_Producto: 'PERF-006', Nombre: 'Baby Musk Sweet (Infantil)', Precio_Unitario: 12000, Stock_Actual: 30, Categoria: 'INFANTILES', Costo: 7000, Unidad: 'Unid' },
            { ID_Producto: 'PERF-007', Nombre: 'Crema Velvet Oud (Cuidado)', Precio_Unitario: 9500, Stock_Actual: 45, Categoria: 'CUIDADO PERSONAL', Costo: 5000, Unidad: 'Unid' },
            { ID_Producto: 'PERF-008', Nombre: 'Royal Amber Room Spray', Precio_Unitario: 8500, Stock_Actual: 15, Categoria: 'PARA EL HOGAR', Costo: 4500, Unidad: 'Unid' }
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
