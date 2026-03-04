"use client";

import { useState } from "react";
import { wandaApi } from "@/lib/api";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc } from "firebase/firestore";

export default function MigracionPage() {
    const [status, setStatus] = useState<string>("Esperando para iniciar...");
    const [loading, setLoading] = useState(false);

    const migrateData = async () => {
        setLoading(true);
        setStatus("Descargando datos de Google Sheets. Por favor, espera...");

        try {
            const data = await wandaApi.getAll();
            if (!data || !data.products || !data.clients || !data.orders) {
                setStatus("Error: No se pudo obtener la información completa de Google Sheets.");
                setLoading(false);
                return;
            }

            setStatus(`Datos obtenidos: ${data.products.length} productos, ${data.clients.length} clientes, ${data.orders.length} pedidos. Iniciando migración a Firestore...`);

            // Ayudante para subir en lotes (batch) para no saturar Firestore (Límite 500 ops/batch)
            const mapArrayToBatches = async (array: any[], collectionName: string, idField: string) => {
                const chunks = [];
                for (let i = 0; i < array.length; i += 400) {
                    chunks.push(array.slice(i, i + 400));
                }

                let chunkIndex = 1;
                for (const chunk of chunks) {
                    setStatus(`Migrando colección '${collectionName}' (Lote ${chunkIndex} de ${chunks.length})...`);
                    const batch = writeBatch(db);
                    chunk.forEach((item) => {
                        let docId = item[idField];
                        if (docId) {
                            // Aseguramos que el docId sea string válido para Firestore
                            docId = String(docId).replace(/\//g, "-").trim();
                            const docRef = doc(collection(db, collectionName), docId);
                            batch.set(docRef, item);
                        }
                    });
                    await batch.commit();
                    chunkIndex++;
                }
            };

            // 1. Migrar Productos (ID_Producto)
            // Se asume ID_Producto o id
            const productosFixed = data.products.map((p: any) => ({ ...p, id: p.ID_Producto || p.id }));
            await mapArrayToBatches(productosFixed, "products", "id");

            // 2. Migrar Clientes (ID_Cliente)
            const clientesFixed = data.clients.map((c: any) => ({ ...c, id: c.ID_Cliente || c.id }));
            await mapArrayToBatches(clientesFixed, "clients", "id");

            // 3. Migrar Pedidos
            await mapArrayToBatches(data.orders, "orders", "id");

            // 4. Migrar Liquidaciones
            if (data.liquidaciones && data.liquidaciones.length > 0) {
                await mapArrayToBatches(data.liquidaciones, "liquidations", "id");
            }

            // 5. Migrar Configuración
            if (data.config) {
                setStatus(`Migrando configuraciones globales...`);
                // Configuraciones irán en 1 solo documento global en la colección "settings"
                const batch = writeBatch(db);
                const configRef = doc(collection(db, "settings"), "global");
                batch.set(configRef, data.config);
                await batch.commit();
            }

            setStatus("¡Migración completada con éxito! Todos los datos de Sheets ahora están en Firestore.");

        } catch (error: any) {
            console.error(error);
            setStatus(`Error durante la migración: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 max-w-4xl mx-auto mt-20 bg-white shadow-xl rounded-xl border border-gray-200 text-gray-800">
            <h1 className="text-3xl font-bold mb-6 text-indigo-600">Herramienta de Migración</h1>
            <h2 className="text-xl mb-4 font-semibold text-gray-700">De Google Sheets a Cloud Firestore</h2>
            <p className="mb-6 text-gray-600">
                Al hacer clic en el botón de abajo, se descargarán todos los datos actuales de tu Google Sheets
                (Productos, Clientes, Pedidos, Liquidaciones y Configuración) y se copiarán a tu nueva base de datos en Firebase. <br /><br />
                <span className="font-bold text-amber-600">Nota:</span> Esta acción no eliminará ningún dato en Google Sheets.
            </p>

            <button
                onClick={migrateData}
                disabled={loading}
                className={`px-8 py-4 rounded-lg text-white font-bold transition-all shadow-md ${loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'}`}
            >
                {loading ? 'Sincronizando...' : 'Iniciar Migración a Firestore'}
            </button>

            <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-300 min-h-[120px]">
                <h3 className="font-bold text-gray-800 mb-2">Estado de la Operación:</h3>
                <p className="font-mono text-sm text-gray-700">{status}</p>
            </div>
        </div>
    );
}
