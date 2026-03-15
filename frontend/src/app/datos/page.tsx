"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    FileSpreadsheet, 
    Download, 
    Upload, 
    Package, 
    Users, 
    ShoppingCart, 
    ListFilter, 
    Loader2, 
    CheckCircle2, 
    AlertCircle,
    Info,
    Database,
    Cloud
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { sheetsSync } from "@/lib/sheetsSync";

export default function DataCenterPage() {
    const { data, refreshData, setIsSyncing, isSyncing } = useData();
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

    const handleExport = (type: string) => {
        try {
            if (!data) return;
            
            switch(type) {
                case 'productos':
                    sheetsSync.exportProducts(data.products || []);
                    break;
                case 'clientes':
                    sheetsSync.exportClients(data.clients || []);
                    break;
                case 'pedidos':
                    sheetsSync.exportOrders(data.orders || []);
                    break;
                case 'detalles':
                    sheetsSync.exportOrderDetails(data.orders || []);
                    break;
            }
            showStatus('success', `Exportación de ${type} completada.`);
        } catch (e: any) {
            showStatus('error', `Error al exportar: ${e.message}`);
        }
    };

    const handleImport = async (type: string, file: File) => {
        try {
            setIsSyncing(true);
            const text = await file.text();
            let res;
            
            switch(type) {
                case 'productos':
                    res = await sheetsSync.importProducts(text);
                    break;
                case 'clientes':
                    res = await sheetsSync.importClients(text);
                    break;
                default:
                    throw new Error("Importación no soportada para este tipo.");
            }

            if (res.success) {
                showStatus('success', `Importación exitosa: ${res.count} registros procesados.`);
                await refreshData(true);
            } else {
                showStatus('error', res.message || "Error desconocido.");
            }
        } catch (e: any) {
            showStatus('error', `Error al importar: ${e.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const showStatus = (type: 'success' | 'error' | 'info', message: string) => {
        setStatus({ type, message });
        setTimeout(() => setStatus(null), 5000);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-32">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                        <Cloud size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">Centro de Datos</h2>
                        <p className="text-sm text-slate-500 italic">Sincronización masiva con Google Sheets y CSV.</p>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {status && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 rounded-2xl border flex items-center gap-3 ${
                            status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' :
                            status.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400' :
                            'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400'
                        }`}
                    >
                        {status.type === 'success' ? <CheckCircle2 size={18} /> : status.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
                        <p className="text-xs font-bold">{status.message}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DataCard 
                    title="Productos" 
                    description="Catálogo, precios, stock y categorías."
                    icon={<Package size={24} />}
                    onExport={() => handleExport('productos')}
                    onImport={(f: File) => handleImport('productos', f)}
                    canImport={true}
                />
                <DataCard 
                    title="Clientes" 
                    description="Base de datos de negocios, saldos y zonas."
                    icon={<Users size={24} />}
                    onExport={() => handleExport('clientes')}
                    onImport={(f: File) => handleImport('clientes', f)}
                    canImport={true}
                />
                <DataCard 
                    title="Pedidos" 
                    description="Cabeceras de pedidos realizados (Historial)."
                    icon={<ShoppingCart size={24} />}
                    onExport={() => handleExport('pedidos')}
                    canImport={false}
                />
                <DataCard 
                    title="Detalles de Pedidos" 
                    description="Reporte extendido fila a fila por cada producto vendido."
                    icon={<ListFilter size={24} />}
                    onExport={() => handleExport('detalles')}
                    canImport={false}
                />
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-8 space-y-4">
                <div className="flex items-center gap-3 text-indigo-500">
                    <Info size={20} />
                    <h4 className="font-black text-xs uppercase tracking-widest">Instrucciones para Google Sheets</h4>
                </div>
                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    <p>Para trabajar con Google Sheets de forma eficiente, sigue estos pasos:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>Exporta los datos actuales usando los botones de arriba. Los archivos se descargarán en formato CSV (separado por puntos y comas).</li>
                        <li>Abre Google Sheets e importa el archivo CSV (Archivo -{'>'} Importar -{'>'} Subir).</li>
                        <li>Realiza los cambios masivos que necesites (precios, actualización de stock, nuevos clientes).</li>
                        <li>Cuando termines, descarga la hoja como <strong>Valores separados por comas (CSV)</strong>.</li>
                        <li>Usa el botón "Importar" en esta pantalla para subir el archivo actualizado.</li>
                    </ol>
                    <p className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
                        ⚠️ ATENCIÓN: No modifiques el nombre de las columnas (cabecera) ni el ID de los registros existentes, ya que esto podría causar duplicados o errores en la base de datos.
                    </p>
                </div>
            </div>
        </div>
    );
}

function DataCard({ title, description, icon, onExport, onImport, canImport }: any) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-black/5 flex flex-col justify-between group hover:border-indigo-500/30 transition-all">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    {canImport && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <Database size={12} /> Sync Habilitada
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{title}</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">{description}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-8">
                <button
                    onClick={onExport}
                    className="flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                >
                    <Download size={14} /> Exportar
                </button>
                
                {canImport ? (
                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".csv"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) onImport(file);
                                e.target.value = '';
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <button className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20">
                            <Upload size={14} /> Importar
                        </button>
                    </div>
                ) : (
                    <button disabled className="py-3 bg-slate-50 dark:bg-slate-950 text-slate-300 dark:text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-800 cursor-not-allowed">
                         Solo Lectura
                    </button>
                )}
            </div>
        </div>
    );
}
