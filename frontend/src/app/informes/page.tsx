'use client';

import React, { useState, useMemo } from 'react';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Download,
    Calendar,
    Filter,
    DollarSign,
    Package,
    ArrowUpRight,
    PieChart
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from "@/context/DataContext";

export default function InformesPage() {
    const { data } = useData();
    const orders = data?.orders || [];
    const products = data?.products || [];

    const [dateRange, setDateRange] = useState('month'); // 'today', 'week', 'month', 'year', 'all'

    // Filtrar pedidos por fecha (acá asumo que las fechas están en formato ISO o algo parseable)
    const filteredOrders = useMemo(() => {
        const now = new Date();
        return orders.filter((o: any) => {
            if (!o.fecha) return false;
            const orderDate = new Date(o.fecha);
            if (dateRange === 'today') {
                return orderDate.toDateString() === now.toDateString();
            }
            if (dateRange === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return orderDate >= weekAgo;
            }
            if (dateRange === 'month') {
                return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
            }
            if (dateRange === 'year') {
                return orderDate.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }, [orders, dateRange]);

    // Estadísticas
    const stats = useMemo(() => {
        let totalRevenue = 0;
        let totalCost = 0;
        let pendingRevenue = 0;
        let cancelledRevenue = 0;

        const productSales: Record<string, { name: string, qty: number, revenue: number, totalCost: number, unitCost: number }> = {};

        filteredOrders.forEach((order: any) => {
            const revenue = parseFloat(order.total) || 0;

            if (order.estado === 'Cancelado' || order.estado === 'Rechazado') {
                cancelledRevenue += revenue;
                return;
            }

            const isFinalized = order.estado === 'Entregado' || order.estado === 'Entregado Parcial';

            if (!isFinalized) {
                pendingRevenue += revenue;
            } else {
                totalRevenue += revenue;

                // Intentar calcular costos basados en el listado de productos de la DB
                let costForOrder = 0;
                let hasDetails = false;

                try {
                    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                        hasDetails = true;
                        order.items.forEach((item: any) => {
                            // Buscar el producto en el catálogo para sacar su Costo o usar un % estimado
                            const prodInfo = products.find((p: any) => String(p.ID_Producto) === String(item.id_prod || item.id));
                            const costoPro = prodInfo && prodInfo.Costo ? parseFloat(prodInfo.Costo) : 0;
                            const unitCost = costoPro > 0 ? costoPro : (item.precio * 0.6); // 60% estimado si no hay costo definido

                            const itemCosto = unitCost * item.cantidad;
                            costForOrder += itemCosto;

                            const itemKey = item.id_prod || item.id || 'N/A';
                            // Acumular ventas por producto (SOLO para pedidos finalizados/entregados)
                            if (!productSales[itemKey]) {
                                productSales[itemKey] = { name: item.nombre || 'Desconocido', qty: 0, revenue: 0, totalCost: 0, unitCost: unitCost };
                            }
                            productSales[itemKey].qty += item.cantidad;
                            productSales[itemKey].revenue += (item.precio * item.cantidad);
                            productSales[itemKey].totalCost += itemCosto;
                        });
                    }
                } catch (e) {
                    console.error("Error al procesar detalle del pedido", e);
                }

                if (!hasDetails) {
                    costForOrder = revenue * 0.6; // Valor estimado por defecto si no tenemos ítems
                }

                totalCost += costForOrder;
            }
        });

        const grossProfit = totalRevenue - totalCost;
        const profitMargin = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;

        // Top 5 Productos
        const topProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        return {
            totalRevenue,
            totalCost,
            grossProfit,
            profitMargin,
            pendingRevenue,
            cancelledRevenue,
            totalOrders: filteredOrders.length,
            topProducts,
            allProductSales: Object.values(productSales)
        };
    }, [filteredOrders, products]);

    const handleExportCSV = (e: React.MouseEvent) => {
        e.preventDefault();
        const headers = ["ID Pedido", "Fecha", "Cliente", "Vendedor", "Estado", "Z/Reparto", "Total"];
        const rows = filteredOrders.map((o: any) => [
            o.id,
            o.fecha ? new Date(o.fecha).toLocaleDateString() : '',
            `"${o.cliente_nombre}"`,
            o.vendedor,
            o.estado,
            o.reparto || 'Sin Asignar',
            o.total
        ]);

        const csvString = [
            headers.join(","),
            ...rows.map((r: any[]) => r.join(","))
        ].join("\n");

        const dataUri = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvString);

        const link = document.createElement("a");
        link.setAttribute("href", dataUri);
        link.setAttribute("download", `informe_ventas_${dateRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportCMV = (e: React.MouseEvent) => {
        e.preventDefault();
        const headers = ["Producto", "Cantidad", "Costo Unitario", "Costo Total", "Ingreso Total", "Ganancia Bruta", "Recargo (%)"];
        const rows = stats.allProductSales.map((p: any) => {
            const profit = p.revenue - p.totalCost;
            const margin = p.totalCost > 0 ? (profit / p.totalCost) * 100 : 0;
            return [
                `"${p.name}"`,
                p.qty,
                Math.round(p.unitCost).toString(),
                Math.round(p.totalCost).toString(),
                Math.round(p.revenue).toString(),
                Math.round(profit).toString(),
                margin.toFixed(2)
            ];
        });

        const csvString = [
            headers.join(","),
            ...rows.map((r: any[]) => r.join(","))
        ].join("\n");

        const dataUri = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvString);

        const link = document.createElement("a");
        link.setAttribute("href", dataUri);
        link.setAttribute("download", `informe_cmv_${dateRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 space-y-8 max-w-[1600px] mx-auto min-h-screen">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner">
                            <BarChart3 size={20} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">Informes Financieros</h2>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Análisis de ventas, costos, y rentabilidad del negocio.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <div className="bg-white dark:bg-slate-900 border border-[var(--border)] rounded-xl flex items-center p-1 shadow-sm w-full sm:w-auto">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-slate-600 dark:text-slate-300 px-3 py-1.5 outline-none cursor-pointer w-full"
                        >
                            <option value="today">Hoy</option>
                            <option value="week">Última Semana</option>
                            <option value="month">Este Mes</option>
                            <option value="year">Este Año</option>
                            <option value="all">Todo el Histórico</option>
                        </select>
                    </div>

                    <div className="flex flex-col sm:flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 shadow-inner w-full sm:w-auto">
                        <button
                            onClick={handleExportCSV}
                            title="Exportar Reporte de Ventas"
                            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 px-4 py-2.5 rounded-lg hover:shadow-md transition-all font-bold text-[10px] uppercase tracking-widest active:scale-95 w-full sm:w-auto"
                        >
                            <Download size={14} /> Ventas
                        </button>
                        <button
                            onClick={handleExportCMV}
                            title="Exportar Costo de Mercadería Vendida (CMV)"
                            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 px-4 py-2.5 rounded-lg hover:shadow-md transition-all font-bold text-[10px] uppercase tracking-widest active:scale-95 w-full sm:w-auto"
                        >
                            <Download size={14} /> CMV
                        </button>
                    </div>
                </div>
            </div>

            {/* KPIs Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Ingresos Totales (Bruto)"
                    value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    subvalue={`${stats.totalOrders} pedidos realizados`}
                    icon={<DollarSign size={20} />}
                    color="indigo"
                />
                <MetricCard
                    title="Costo Operativo Estimado"
                    value={`$${stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    subvalue="Costo de mercancías"
                    icon={<TrendingDown size={20} />}
                    color="rose"
                />
                <MetricCard
                    title="Ganancia Bruta"
                    value={`$${stats.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    subvalue={`Rentabilidad`}
                    icon={<TrendingUp size={20} />}
                    color="emerald"
                />
                <MetricCard
                    title="Recargo Promedio"
                    value={`${stats.profitMargin.toFixed(1)}%`}
                    subvalue="Ganancia sobre costo"
                    icon={<PieChart size={20} />}
                    color={stats.profitMargin > 20 ? 'emerald' : 'amber'}
                />
            </div>

            {/* Segunda Fila de Análisis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Tabla de Top Productos */}
                <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                                <Package size={18} />
                            </div>
                            <h3 className="font-bold text-lg">Top Productos Más Vendidos</h3>
                        </div>
                    </div>

                    {stats.topProducts.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">
                            No hay datos suficientes
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {stats.topProducts.map((p, index) => {
                                const maxRevenue = stats.topProducts[0]?.revenue || 1;
                                const widthPercent = (p.revenue / maxRevenue) * 100;
                                return (
                                    <div key={index} className="flex flex-col gap-2">
                                        <div className="flex justify-between items-end text-sm">
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                                            <div className="text-right">
                                                <span className="font-black text-indigo-600">${p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                <span className="text-[10px] text-slate-400 ml-2">({p.qty} un)</span>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${widthPercent}%` }}
                                                transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                                                className="h-full bg-indigo-500 rounded-full"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Resumen Comercial secundario */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-lg mb-6">Estado de Ingresos</h3>

                        <div className="space-y-6">
                            <div className="border border-emerald-500/20 bg-emerald-500/10 rounded-2xl p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Capital Confirmado</p>
                                <p className="text-xl font-black text-emerald-600">${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                <p className="text-[10px] text-emerald-600/60 mt-2 font-medium">Pedidos entregados, en proceso o logística.</p>
                            </div>

                            <div className="border border-amber-500/20 bg-amber-500/10 rounded-2xl p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Capital en Suspenso</p>
                                <p className="text-xl font-black text-amber-600">${stats.pendingRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                <p className="text-[10px] text-amber-600/60 mt-2 font-medium">Pedidos pausados o con observaciones.</p>
                            </div>

                            <div className="border border-rose-500/20 bg-rose-500/10 rounded-2xl p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Capital Perdido</p>
                                <p className="text-xl font-black text-rose-500">${stats.cancelledRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                <p className="text-[10px] text-rose-500/60 mt-2 font-medium">Pedidos cancelados en este periodo.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function MetricCard({ title, value, subvalue, icon, color }: any) {
    const colorStyles: any = {
        indigo: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
        emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        rose: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    };

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group"
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${colorStyles[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{title}</p>
                <h3 className={`text-2xl font-black tracking-tight mb-2 ${colorStyles[color].split(' ')[1]}`}>
                    {value}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{subvalue}</p>
            </div>

            {/* Decoro */}
            <div className={`absolute -right-4 -bottom-4 opacity-10 pointer-events-none group-hover:scale-150 transition-all duration-500 ${colorStyles[color].split(' ')[1]}`}>
                {React.cloneElement(icon, { size: 100 })}
            </div>
        </motion.div>
    );
}
