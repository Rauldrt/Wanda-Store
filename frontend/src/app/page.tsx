"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Package,
  Truck,
  Users,
  Search,
  ArrowUpRight,
  Clock,
  AlertCircle,
  RefreshCcw,
  ExternalLink,
  CheckCircle2
} from "lucide-react";
import { useData } from "@/context/DataContext";

export default function Home() {
  const { data, loading, error, refreshData } = useData();
  const [searchTerm, setSearchTerm] = useState("");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
        </div>
        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest animate-pulse">Sincronizando Base de Datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="tech-card border-red-500/20 bg-red-500/5 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-500 mb-2">Error de Conexión</h3>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => refreshData()}
            className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Reintentar Conexión
          </button>
        </div>
      </div>
    );
  }

  // Cálculos de KPIs
  const totalSales = data?.orders?.filter((p: any) => p.estado !== 'Cancelado').reduce((acc: number, p: any) => acc + (parseFloat(p.total) || 0), 0) || 0;
  const totalProducts = data?.products?.length || 0;
  const inLogistics = data?.orders?.filter((p: any) => p.reparto && p.estado !== 'Entregado').length || 0;
  const totalClients = data?.clients?.length || 0;

  // Filtrado de pedidos
  const filteredOrders = data?.orders?.filter((p: any) =>
    p.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id?.toString().includes(searchTerm)
  ).slice(0, 6) || [];

  return (
    <div className="space-y-8">
      {/* Saludo y Búsqueda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Base de Datos Online</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight">Ventas & Operaciones</h2>
          <p className="text-slate-500 text-sm">Monitoreo en tiempo real de Wanda Lácteos.</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente o ID..."
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
          />
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Facturación Bruta"
          value={`$${totalSales.toLocaleString()}`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="Mes Actual"
          color="indigo"
        />
        <StatCard
          title="Catálogo"
          value={totalProducts}
          icon={<Package className="w-5 h-5" />}
          trend="Skus Activos"
          color="emerald"
        />
        <StatCard
          title="En Movimiento"
          value={inLogistics}
          icon={<Truck className="w-5 h-5" />}
          trend="Logística"
          color="amber"
        />
        <StatCard
          title="Clientes"
          value={totalClients}
          icon={<Users className="w-5 h-5" />}
          trend="Puntos de Venta"
          color="blue"
        />
      </div>

      {/* Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tabla de Pedidos Reales */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Últimos Pedidos
            </h3>
            <button className="text-xs font-bold text-indigo-500 hover:underline">Ver Historial Completo</button>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest border border-dashed border-[var(--border)] rounded-2xl">
                  No se encontraron pedidos
                </div>
              ) : (
                filteredOrders.map((p: any, i: number) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="tech-card group flex items-center justify-between py-4 hover:border-indigo-500/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[10px] ${p.estado === 'Entregado' ? 'bg-emerald-500/10 text-emerald-500' :
                        p.estado === 'Cancelado' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                        {p.estado === 'Entregado' ? <CheckCircle2 size={16} /> : `#${p.id.toString().slice(-4)}`}
                      </div>
                      <div>
                        <p className="font-bold text-sm truncate max-w-[150px] sm:max-w-none">{p.cliente_nombre}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-slate-500 font-mono tracking-tighter">ID: {p.id}</p>
                          <span className="text-[8px] text-slate-400">•</span>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{p.vendedor || 'App'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-[9px] text-slate-400 mb-0.5">{new Date(p.fecha).toLocaleDateString()}</p>
                        <p className="font-black text-sm text-indigo-600">${parseFloat(p.total).toLocaleString()}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 group-hover:bg-indigo-500 transition-all group-hover:text-white">
                        <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar Derecha - Resumen Operativo */}
        <div className="space-y-6">
          <h3 className="font-bold text-lg">Resumen Operativo</h3>

          <div className="tech-card border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-transparent">
            <h4 className="font-bold text-xs uppercase tracking-widest text-indigo-500 mb-6">Estado de Repartos</h4>
            <div className="space-y-6">
              <RouteProgress
                label="Pedidos Entregados"
                current={data?.orders?.filter((p: any) => p.estado === 'Entregado').length || 0}
                total={data?.orders?.length || 0}
                color="emerald"
              />
              <RouteProgress
                label="Pdnt. Asignación"
                current={data?.orders?.filter((p: any) => !p.reparto && p.estado !== 'Cancelado').length || 0}
                total={data?.orders?.length || 0}
                color="indigo"
              />
              <RouteProgress
                label="En Preparación"
                current={data?.orders?.filter((p: any) => p.estado === 'En Preparación').length || 0}
                total={data?.orders?.length || 0}
                color="amber"
              />
            </div>
          </div>

          <div className="tech-card">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-sm">Resumen de Stock</h4>
              <button className="text-[10px] font-black text-indigo-500 underline uppercase">Reponer</button>
            </div>
            <div className="space-y-3">
              {data?.products?.slice(0, 3).map((prod: any) => (
                <div key={prod.ID_Producto} className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 truncate max-w-[120px]">{prod.Nombre}</span>
                  <span className={`font-bold ${parseFloat(prod.Stock_Actual) <= 5 ? 'text-rose-500' : 'text-[var(--foreground)]'}`}>
                    {parseFloat(prod.Stock_Actual).toFixed(0)} <span className="text-[8px] opacity-40">un</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color }: any) {
  const colors: any = {
    indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="tech-card group relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl border ${colors[color]} shadow-sm group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter ${colors[color]}`}>
          {trend}
        </span>
      </div>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-black tracking-tight">{value}</h3>
      </div>
      {/* Decoro tech */}
      <div className="absolute -bottom-2 -right-2 opacity-[0.03] text-indigo-900 group-hover:scale-150 transition-transform pointer-events-none">
        {icon}
      </div>
    </motion.div>
  );
}

function RouteProgress({ label, current, total, color }: any) {
  const percent = total > 0 ? (current / total) * 100 : 0;

  const bgColors: any = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest overflow-hidden">
        <span className="truncate mr-2">{label}</span>
        <span className="text-slate-400 flex-shrink-0">{current}/{total}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${bgColors[color]} shadow-[0_0_10px_rgba(99,102,241,0.3)]`}
        />
      </div>
    </div>
  );
}
