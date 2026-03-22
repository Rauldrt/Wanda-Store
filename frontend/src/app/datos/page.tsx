"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    FileSpreadsheet, Download, Upload, Package, Users, ShoppingCart, 
    ListFilter, Loader2, CheckCircle2, AlertCircle, Info, Database, Cloud,
    BarChart3, CalendarDays, Printer, LayoutDashboard, Search
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { sheetsSync } from "@/lib/sheetsSync";
import { wandaApi } from "@/lib/api";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, startOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DataCenterPage() {
    const { data, refreshData, setIsSyncing } = useData();
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'sync' | 'reportes'>('reportes');

    // Estado del reporte
    const [reportType, setReportType] = useState<'productos' | 'diario' | 'clientes' | 'producto_clientes'>('productos');
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [searchTerm, setSearchTerm] = useState("");

    const handleExport = (type: string) => {
        try {
            if (!data) return;
            switch(type) {
                case 'productos': sheetsSync.exportProducts(data.products || []); break;
                case 'clientes': sheetsSync.exportClients(data.clients || []); break;
                case 'pedidos': sheetsSync.exportOrders(data.orders || [], data.clients || []); break;
                case 'detalles': sheetsSync.exportOrderDetails(data.orders || [], data.clients || []); break;
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
                case 'productos': res = await sheetsSync.importProducts(text); break;
                case 'clientes': res = await sheetsSync.importClients(text); break;
                default: throw new Error("Importación no soportada para este tipo.");
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

    const handleBackfillZonas = async () => {
        if (!confirm("¿Deseas reasignar zonas a todos los clientes y pedidos según los preventistas actuales?")) return;
        try {
            setIsSyncing(true);
            const sellersObj: Record<string, string> = {};
            (data?.sellers || []).forEach((s: any) => {
                const z = s.Zona || "Global";
                if (s.Nombre) sellersObj[s.Nombre.trim().toUpperCase()] = z;
                if (s.ID_Preventista) sellersObj[s.ID_Preventista.trim().toUpperCase()] = z;
            });
            const res = await wandaApi.backfillZonas(sellersObj, data?.orders || [], data?.clients || []);
            showStatus('success', `Se reasignaron zonas a ${res.count} registros.`);
            await refreshData(true);
        } catch(e: any) {
            showStatus('error', `Error al reasignar zonas: ${e.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleExportReportToCsv = () => {
        if (!reportData.length) return showStatus('info', 'No hay datos para exportar.');
        const keys = Object.keys(reportData[0]).filter(k => k !== 'label');
        sheetsSync.exportToCSV(reportData, keys, `reporte_${reportType}_${startDate}_a_${endDate}`);
        showStatus('success', 'Reporte exportado exitosamente.');
    };

    const reportData = useMemo<any[]>(() => {
        if (!data || !data.orders) return [];

        const start = startOfDay(new Date(startDate + "T00:00:00"));
        const end = endOfDay(new Date(endDate + "T23:59:59"));

        const filteredOrders = data.orders.filter((o: any) => {
            if (!o.fecha) return false;
            const date = parseISO(o.fecha);
            return (date >= start && date <= end) && o.estado !== "CANCELADO";
        });

        if (reportType === 'productos') {
            const productSales: Record<string, { Producto: string, Cantidad: number, Ingresos: number }> = {};
            filteredOrders.forEach((o: any) => {
                if(o.items) {
                    o.items.forEach((it: any) => {
                        const id = it.id_producto || it.id || it.id_prod;
                        const name = it.nombre || it.producto || "Desconocido";
                        if (!productSales[id]) productSales[id] = { Producto: name, Cantidad: 0, Ingresos: 0 };
                        productSales[id].Cantidad += Number(it.cantidad) || 0;
                        productSales[id].Ingresos += (Number(it.cantidad) || 0) * (Number(it.precio || it.precio_unitario) || 0);
                    });
                }
            });
            let result = Object.values(productSales).sort((a,b) => b.Cantidad - a.Cantidad);
            if (searchTerm) {
                result = result.filter(r => r.Producto.toLowerCase().includes(searchTerm.toLowerCase()));
            }
            return result.slice(0, 50); // Muestra top 50
        }

        if (reportType === 'diario') {
            const daily: Record<string, { Fecha: string, label: string, Ingresos: number, Pedidos: number }> = {};
            filteredOrders.forEach((o: any) => {
                const dateKey = format(parseISO(o.fecha), 'yyyy-MM-dd');
                if (!daily[dateKey]) daily[dateKey] = { Fecha: dateKey, label: format(parseISO(o.fecha), 'dd MMM', {locale: es}), Ingresos: 0, Pedidos: 0 };
                daily[dateKey].Ingresos += Number(o.total) || 0;
                daily[dateKey].Pedidos += 1;
            });
            return Object.values(daily).sort((a,b) => a.Fecha.localeCompare(b.Fecha));
        }

        if (reportType === 'clientes') {
            const clientSales: Record<string, { Cliente: string, Ingresos: number, Pedidos: number }> = {};
            filteredOrders.forEach((o: any) => {
                const id = o.cliente_id || 'consumidor-final';
                const name = o.cliente_nombre || "Consumidor Final";
                if (!clientSales[id]) clientSales[id] = { Cliente: name, Ingresos: 0, Pedidos: 0 };
                clientSales[id].Ingresos += Number(o.total) || 0;
                clientSales[id].Pedidos += 1;
            });
            let result = Object.values(clientSales).sort((a,b) => b.Ingresos - a.Ingresos);
            if (searchTerm) {
                result = result.filter(r => r.Cliente.toLowerCase().includes(searchTerm.toLowerCase()));
            }
            return result.slice(0, 50); // Muestra top 50
        }

        if (reportType === 'producto_clientes') {
            const productClientSales: Record<string, { Relacion: string, Fecha: string, Producto: string, Cliente: string, Cantidad: number, Ingresos: number }> = {};
            filteredOrders.forEach((o: any) => {
                const clientId = o.cliente_nombre || "Consumidor Final";
                const dateStr = format(parseISO(o.fecha), 'dd/MM/yyyy');
                if(o.items) {
                    o.items.forEach((it: any) => {
                        const prodName = it.nombre || it.producto || "Desconocido";
                        const key = `${prodName}_${clientId}_${dateStr}`;
                        if (!productClientSales[key]) productClientSales[key] = { Relacion: `${prodName} ➔ ${clientId}`, Fecha: dateStr, Producto: prodName, Cliente: clientId, Cantidad: 0, Ingresos: 0 };
                        productClientSales[key].Cantidad += Number(it.cantidad) || 0;
                        productClientSales[key].Ingresos += (Number(it.cantidad) || 0) * (Number(it.precio || it.precio_unitario) || 0);
                    });
                }
            });
            let result = Object.values(productClientSales).sort((a,b) => b.Cantidad - a.Cantidad);
            if (searchTerm) {
                result = result.filter(r => r.Producto.toLowerCase().includes(searchTerm.toLowerCase()) || r.Cliente.toLowerCase().includes(searchTerm.toLowerCase()) || r.Fecha.includes(searchTerm));
            }
            return result.slice(0, 50); // Muestra top 50
        }

        return [];
    }, [data, reportType, startDate, endDate, searchTerm]);

    const renderCustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl shadow-xl shadow-indigo-500/10 backdrop-blur-md">
                    <p className="font-black text-slate-800 dark:text-white mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">{label}</p>
                    {payload.map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                            <span className="text-xs font-bold text-slate-500">{p.name}:</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                                {p.name === 'Ingresos' ? '$' + p.value.toLocaleString() : p.value.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-32">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full print:hidden">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                        <Database size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">Centro de Datos</h2>
                        <p className="text-sm text-slate-500 italic">Reportes, informes y sincronización masiva.</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('reportes')}
                        className={`px-6 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-all ${activeTab === 'reportes' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <BarChart3 size={16} /> Reportes
                    </button>
                    <button
                        onClick={() => setActiveTab('sync')}
                        className={`px-6 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-all ${activeTab === 'sync' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Cloud size={16} /> Sync Masiva
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {status && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 rounded-2xl border flex items-center gap-3 print:hidden ${
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

            {/* TAB REPORTES */}
            {activeTab === 'reportes' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                >
                    {/* Filtros Reporte */}
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-black/5 print:hidden">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest block">Tipo de Reporte</label>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto snap-x hide-scrollbar">
                                    <button onClick={() => setReportType('productos')} className={`flex-1 min-w-[80px] snap-center py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${reportType === 'productos' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Productos</button>
                                    <button onClick={() => setReportType('producto_clientes')} className={`flex-1 min-w-[120px] snap-center py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${reportType === 'producto_clientes' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Prod. x Cliente</button>
                                    <button onClick={() => setReportType('diario')} className={`flex-1 min-w-[80px] snap-center py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${reportType === 'diario' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Diario</button>
                                    <button onClick={() => setReportType('clientes')} className={`flex-1 min-w-[80px] snap-center py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${reportType === 'clientes' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Clientes</button>
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest block">Rango de Fechas</label>
                                <div className="flex items-center gap-2">
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-indigo-500 transition-colors" />
                                    <span className="text-slate-400 font-bold">-</span>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-indigo-500 transition-colors" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest block">Buscar <span className="text-slate-400">(Opcional)</span></label>
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={searchTerm} 
                                        onChange={e => setSearchTerm(e.target.value)} 
                                        placeholder={reportType === 'productos' ? 'Buscar producto...' : 'Buscar cliente...'}
                                        disabled={reportType === 'diario'}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm font-bold outline-none focus:border-indigo-500 transition-colors disabled:opacity-50" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-xl text-xs font-black uppercase transition-all hover:bg-indigo-100">
                                <Printer size={16} /> Imprimir Reporte
                            </button>
                            <button onClick={handleExportReportToCsv} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-xl text-xs font-black uppercase transition-all hover:bg-emerald-100">
                                <FileSpreadsheet size={16} /> Exportar Sheets (CSV)
                            </button>
                        </div>
                    </div>

                    {/* Gráfico y Tabla (Imprimible) */}
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-black/5 font-sans print:shadow-none print:border-none print:p-0">
                        
                        {/* Print Header */}
                        <div className="hidden print:block mb-8 pb-4 border-b-2 border-slate-900 border-dashed">
                            <h1 className="text-2xl font-black text-slate-900">
                                Reporte de {reportType === 'productos' ? 'Ventas por Producto' : reportType === 'diario' ? 'Ventas y Rendimiento Diario' : reportType === 'producto_clientes' ? 'Desglose Producto por Cliente' : 'Ventas por Cliente'}
                            </h1>
                            <p className="text-sm font-bold text-slate-500 mt-1">Período: {format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')}</p>
                            <p className="text-xs font-bold text-slate-400">Generado el: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                        </div>

                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6 print:hidden">Visión Gráfica</h3>
                        
                        {reportData.length > 0 ? (
                            <>
                                <div className="h-[350px] w-full print:h-[250px] print:mb-8">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {reportType === 'diario' ? (
                                            <LineChart data={reportData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dx={-10} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dx={10} />
                                                <Tooltip content={renderCustomTooltip} />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 800, paddingBottom: "10px" }} />
                                                <Line yAxisId="left" type="monotone" name="Ingresos" dataKey="Ingresos" stroke="#6366f1" strokeWidth={4} activeDot={{ r: 8, strokeWidth: 0, fill: '#4f46e5' }} />
                                                <Line yAxisId="right" type="monotone" name="Pedidos" dataKey="Pedidos" stroke="#10b981" strokeWidth={4} activeDot={{ r: 8, strokeWidth: 0, fill: '#059669' }} />
                                            </LineChart>
                                        ) : (
                                            <BarChart data={reportData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                                <XAxis dataKey={reportType === 'productos' ? 'Producto' : reportType === 'producto_clientes' ? 'Relacion' : 'Cliente'} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} tickFormatter={(v) => typeof v === 'string' ? v.substring(0,10) + (v.length > 10 ? '...':'') : v} />
                                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dx={-10} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dx={10} />
                                                <Tooltip content={renderCustomTooltip} />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 800, paddingBottom: "10px" }} />
                                                <Bar yAxisId="left" name="Ingresos" dataKey="Ingresos" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                                <Bar yAxisId="right" name={reportType === 'clientes' ? 'Pedidos' : 'Cantidad'} dataKey={reportType === 'clientes' ? 'Pedidos' : 'Cantidad'} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>

                                <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-8 print:border-none print:pt-0">
                                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-4 print:text-lg print:border-b print:pb-2">Tabla Detallada</h3>
                                    <div className="overflow-x-auto w-full">
                                        <table className="w-full text-left border-collapse min-w-max">
                                            <thead>
                                                <tr>
                                                    {Object.keys(reportData[0]).filter(k => k !== 'label').map(key => (
                                                        <th key={key} className="py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 dark:border-slate-800 print:border-slate-300">
                                                            {key}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.map((row: any, i) => (
                                                    <tr key={i} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/20'}`}>
                                                        {Object.keys(row).filter(k => k !== 'label').map(key => (
                                                            <td key={key} className="py-3 px-4 text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 print:border-slate-300">
                                                                {key === 'Ingresos' ? `$${row[key].toLocaleString()}` : row[key]}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                <tr className="bg-indigo-50/50 dark:bg-indigo-500/10 !font-black text-indigo-700 dark:text-indigo-400 text-sm print:bg-slate-100 print:text-slate-900 print:border-t-2 print:border-slate-400">
                                                    <td className="py-4 px-4 font-black">TOTAL</td>
                                                    <td className="py-4 px-4 font-black">
                                                        {reportType === 'diario' 
                                                            ? '' 
                                                            : reportData.reduce((acc: number, val: any) => acc + (val.Cantidad || val.Pedidos || 0), 0)
                                                        }
                                                    </td>
                                                    <td className="py-4 px-4 font-black">
                                                        ${reportData.reduce((acc: number, val: any) => acc + (val.Ingresos || 0), 0).toLocaleString()}
                                                    </td>
                                                    {reportType === 'diario' && (
                                                        <td className="py-4 px-4 font-black">
                                                            {reportData.reduce((acc: number, val: any) => acc + (val.Pedidos || 0), 0)}
                                                        </td>
                                                    )}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-[28px] border border-dashed border-slate-200 dark:border-slate-700">
                                <LayoutDashboard size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-lg font-black text-slate-600 dark:text-slate-300">Sin datos para mostrar</h3>
                                <p className="text-xs font-bold text-slate-400 mt-2">Prueba cambiando el rango de fechas o los filtros para visualizar la actividad.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* TAB SYNC MASIVA */}
            {activeTab === 'sync' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6 print:hidden"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DataCard title="Productos" description="Catálogo, precios, stock y categorías." icon={<Package size={24} />} onExport={() => handleExport('productos')} onImport={(f: File) => handleImport('productos', f)} canImport={true} />
                        <DataCard title="Clientes" description="Base de datos de negocios, saldos y zonas." icon={<Users size={24} />} onExport={() => handleExport('clientes')} onImport={(f: File) => handleImport('clientes', f)} canImport={true} />
                        <DataCard title="Pedidos" description="Cabeceras de pedidos realizados (Historial)." icon={<ShoppingCart size={24} />} onExport={() => handleExport('pedidos')} canImport={false} />
                        <DataCard title="Detalles de Pedidos" description="Reporte extendido fila a fila por cada producto vendido." icon={<ListFilter size={24} />} onExport={() => handleExport('detalles')} canImport={false} />
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-3xl p-8 space-y-4">
                        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500">
                            <Database size={20} />
                            <h4 className="font-black text-xs uppercase tracking-widest">Reasignación de Zonas</h4>
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                            Rellena y actualiza masivamente la base de datos de <strong>Pedidos y Clientes</strong> con la zona correspondiente según el preventista asignado a cada uno. Útil para aplicar límites de acción.
                        </p>
                        <button
                            onClick={handleBackfillZonas}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Cloud size={16} /> Reasignar Zonas Ahora
                        </button>
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
                </motion.div>
            )}
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
