"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Package,
    Search,
    Filter,
    Edit3,
    Trash2,
    Plus,
    Image as ImageIcon,
    DollarSign,
    Box,
    Save,
    X,
    Loader2,
    Tag,
    Scale,
    Layers,
    AlertCircle,
    LayoutGrid,
    List,
    TrendingUp,
    Percent,
    Zap,
    ArrowUp,
    ArrowDown,
    Weight,
    Scale as ScaleIcon,
    Truck,
    Copy,
    FileSpreadsheet,
    Eye,
    EyeOff
} from "lucide-react";
import { wandaApi } from "@/lib/api";
import { useData } from "@/context/DataContext";

// --- UTIL: CÁLCULO DE RENTABILIDAD ---
const calculateProfitability = (price: number, cost: number) => {
    if (!price || price <= 0) return 0;
    return ((price - cost) / price) * 100;
};

// --- UTIL: BÚSQUEDA FLEXIBLE ---
const normalizeText = (text: string) =>
    String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const smartSearch = (text: string, query: string) => {
    if (!query) return true;
    const normText = normalizeText(text);
    const terms = normalizeText(query).split(/\s+/).filter(t => t.length > 0);
    return terms.every(t => normText.includes(t));
};

export default function ProductosPage() {
    const { data, refreshData } = useData();
    const products = useMemo(() => data?.products || [], [data?.products]);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [showMetrics, setShowMetrics] = useState(false);

    // Estados para Edición Masiva
    const [isMassEditing, setIsMassEditing] = useState(false);
    const [editedProducts, setEditedProducts] = useState<any[]>([]);

    // Estados para Ajuste Masivo de Precios
    const [isAdjustOverlayOpen, setIsAdjustOverlayOpen] = useState(false);
    const [adjustConfig, setAdjustConfig] = useState({
        type: 'percent' as 'percent' | 'fixed',
        value: 0,
        target: 'Precio_Unitario' as 'Precio_Unitario' | 'Costo'
    });

    // Estados para el Drawer de Edición Individual
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [drawerMode, setDrawerMode] = useState<'edit' | 'create'>('edit');

    // Estados para Ordenamiento y Filtros Críticos
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'Nombre', direction: 'asc' });
    const [quickStatus, setQuickStatus] = useState<'all' | 'no_stock' | 'low_margin' | 'weighable'>('all');

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const categories = ["ALL", ...new Set(products.map((p: any) => p.Categoria).filter(Boolean).sort() as string[])];

    const filteredProducts = useMemo(() => {
        const result = products.filter((p: any) => {
            const searchPayload = `${p.Nombre} ${p.ID_Producto} ${p.Categoria}`;
            const matchesSearch = smartSearch(searchPayload, searchTerm);
            const matchesCat = categoryFilter === "ALL" || p.Categoria === categoryFilter;

            let matchesStatus = true;
            if (quickStatus === 'no_stock') matchesStatus = parseFloat(p.Stock_Actual || 0) <= 0;
            if (quickStatus === 'low_margin') {
                const m = calculateProfitability(parseFloat(p.Precio_Unitario), parseFloat(p.Costo));
                matchesStatus = m < 15;
            }
            if (quickStatus === 'weighable') matchesStatus = p.Unidad === 'Kg';

            return matchesSearch && matchesCat && matchesStatus;
        });

        if (sortConfig.key && sortConfig.direction) {
            result.sort((a: any, b: any) => {
                let valA: any = a[sortConfig.key];
                let valB: any = b[sortConfig.key];

                if (sortConfig.key === 'margin') {
                    valA = calculateProfitability(parseFloat(a.Precio_Unitario), parseFloat(a.Costo));
                    valB = calculateProfitability(parseFloat(b.Precio_Unitario), parseFloat(b.Costo));
                } else if (['Precio_Unitario', 'Costo', 'Stock_Actual', 'Peso_Promedio', 'Unidades_Bulto'].includes(sortConfig.key)) {
                    valA = parseFloat(valA || 0);
                    valB = parseFloat(valB || 0);
                } else {
                    valA = String(valA || "").toLowerCase();
                    valB = String(valB || "").toLowerCase();
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [products, searchTerm, categoryFilter, quickStatus, sortConfig]);

    // KPIs de Inventario
    const stats = useMemo(() => {
        const totalStockVal = filteredProducts.reduce((acc: any, p: any) => acc + (parseFloat(p.Stock_Actual || 0) * parseFloat(p.Precio_Unitario || 0)), 0);
        const totalWeightVal = filteredProducts.reduce((acc: any, p: any) => acc + (parseFloat(p.Stock_Actual || 0) * parseFloat(p.Peso_Promedio || 0)), 0);
        const lowStockCount = filteredProducts.filter((p: any) => parseFloat(p.Stock_Actual) <= 5).length;

        return {
            valuation: totalStockVal,
            weight: totalWeightVal,
            lowStock: lowStockCount
        };
    }, [filteredProducts]);

    // Sincronizar editedProducts cuando se entra en modo edición masiva
    const toggleMassEdit = () => {
        if (!isMassEditing) {
            setEditedProducts(JSON.parse(JSON.stringify(filteredProducts)));
            setViewMode('list');
        } else {
            setEditedProducts([]);
        }
        setIsMassEditing(!isMassEditing);
    };

    const handleBulkFieldChange = (id: any, field: string, value: any) => {
        setEditedProducts(prev => prev.map(p =>
            String(p.ID_Producto) === String(id) ? { ...p, [field]: value } : p
        ));
    };

    const applyMassAdjustment = () => {
        const value = parseFloat(adjustConfig.value as any);
        if (isNaN(value)) return;

        setEditedProducts(prev => prev.map(p => {
            const currentVal = parseFloat(p[adjustConfig.target] || 0);
            let newVal = currentVal;

            if (adjustConfig.type === 'percent') {
                newVal = currentVal * (1 + (value / 100));
            } else {
                newVal = currentVal + value;
            }

            return { ...p, [adjustConfig.target]: newVal.toFixed(2) };
        }));
        setIsAdjustOverlayOpen(false);
    };

    const handleSaveBulk = async () => {
        try {
            setSaving(true);
            const res = await wandaApi.bulkUpdateProducts(editedProducts);
            if (res.result === "OK" || !res.error) {
                await refreshData(true);
                setIsMassEditing(false);
            } else {
                alert("Error al guardar cambios masivos: " + res.error);
            }
        } catch (err) {
            console.error(err);
            alert("Error de conexión.");
        } finally {
            setSaving(false);
        }
    };

    const openEditDrawer = (product: any) => {
        setDrawerMode('edit');
        setFormData({ ...product });
        setIsDrawerOpen(true);
    };

    const openCreateDrawer = () => {
        setDrawerMode('create');
        setFormData({
            ID_Producto: 'Auto',
            Nombre: '',
            Categoria: '',
            Precio_Unitario: 0,
            Stock_Actual: 0,
            Costo: 0,
            Unidades_Bulto: 1,
            Unidad: 'Unid',
            Peso_Promedio: 1,
            Imagen_URL: '',
            Es_Oferta: false,
            Nota_Oferta: ''
        });
        setIsDrawerOpen(true);
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.")) return;
        try {
            setSaving(true);
            const res = await wandaApi.deleteProduct(id);
            if (res.result === "OK" || !res.error) {
                await refreshData(true);
            } else {
                alert("Error al eliminar: " + res.error);
            }
        } catch (err) {
            console.error(err);
            alert("Error de conexión.");
        } finally {
            setSaving(false);
        }
    };

    // Clonación de Producto
    const handleDuplicateProduct = (product: any) => {
        const clone = {
            ...product,
            ID_Producto: 'Auto',
            Nombre: `${product.Nombre} (Copia)`,
            Stock_Actual: 0
        };
        setFormData(clone);
        setDrawerMode('create');
        setIsDrawerOpen(true);
    };

    // Exportación a CSV
    const handleExportCSV = () => {
        const headers = ["ID_Producto", "Nombre", "Categoria", "Unidad", "Precio_Unitario", "Costo", "Stock_Actual", "Peso_Promedio", "Unidades_Bulto"];
        const csvContent = [
            headers.join(";"),
            ...filteredProducts.map((p: any) => headers.map(h => `"${p[h] || ''}"`).join(";"))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `wanda_inventario_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Hacer disponible globalmente para subcomponentes si no se quiere pasar por n niveles de props
    useEffect(() => {
        (window as any).handleDeleteProduct = handleDeleteProduct;
        (window as any).handleDuplicateProduct = handleDuplicateProduct;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredProducts]);

    const handleSaveIndividual = async () => {
        try {
            if (!formData.Nombre) {
                alert("El nombre del producto es obligatorio.");
                return;
            }
            setSaving(true);
            const res = await wandaApi.saveProduct(formData);
            if (res.result === "OK" || res.status === "success" || !res.error) {
                await refreshData(true);
                setIsDrawerOpen(false);
            } else {
                alert("Error al guardar: " + (res.error || "Desconocido"));
            }
        } catch (err) {
            console.error("Error saving product:", err);
            alert("Error de conexión al guardar.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 relative min-h-screen pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-slate-800 dark:text-slate-100">
                <div>
                    <h2 className="text-3xl font-black tracking-tight">Inventario de Productos</h2>
                    <p className="text-slate-500 text-sm italic">Gestión inteligente de stock, logística y rentabilidad.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {!isMassEditing && (
                        <>
                            <div className="flex bg-[var(--card)] border border-[var(--border)] p-1 rounded-xl shadow-sm">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <LayoutGrid size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <List size={18} />
                                </button>
                            </div>
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-200 dark:border-emerald-500/20"
                            >
                                <FileSpreadsheet size={16} /> Exportar
                            </button>
                            <button
                                onClick={toggleMassEdit}
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-[var(--border)]"
                            >
                                <Edit3 size={16} /> Edición Masiva
                            </button>
                            <button
                                onClick={openCreateDrawer}
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                            >
                                <Plus size={16} /> Nuevo
                            </button>
                        </>
                    )}

                    {isMassEditing && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsAdjustOverlayOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                            >
                                <Zap size={16} /> Ajustar Precios
                            </button>
                            <button
                                onClick={toggleMassEdit}
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-[var(--border)]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveBulk}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Guardar Todo
                            </button>
                        </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer bg-[var(--card)] border border-[var(--border)] px-3 sm:px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all group ml-auto sm:ml-0">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={showMetrics}
                                onChange={(e) => setShowMetrics(e.target.checked)}
                            />
                            <div className={`block w-9 h-5 rounded-full transition-colors ${showMetrics ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                            <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${showMetrics ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                        <span className="text-[10px] sm:text-xs font-black text-slate-500 group-hover:text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                            {showMetrics ? <EyeOff size={14} className="hidden sm:block" /> : <Eye size={14} className="hidden sm:block" />}
                            <span className="hidden sm:inline">{showMetrics ? "Ocultar Métricas" : "Mostrar Métricas"}</span>
                            <span className="sm:hidden">{showMetrics ? "Ocultar" : "Métricas"}</span>
                        </span>
                    </label>
                </div>
            </div>

            {/* Panel de Estadísticas Rápidas */}

            <AnimatePresence>
                {showMetrics && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-3xl shadow-sm flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                    <DollarSign size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valorización de Stock</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-slate-100">${stats.valuation.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-3xl shadow-sm flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <Truck size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carga Total Est. (Kg)</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-slate-100">{stats.weight.toLocaleString(undefined, { maximumFractionDigits: 1 })} Kg</p>
                                </div>
                            </div>
                            <div className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-3xl shadow-sm flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas de Reposición</p>
                                    <p className={`text-xl font-black ${stats.lowStock > 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>{stats.lowStock} Items</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* BARRA DE HERRAMIENTAS AJUSTE MASIVO */}
            <AnimatePresence>
                {isAdjustOverlayOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-[2rem] p-6 flex flex-wrap items-end gap-6 shadow-inner">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Aplicar a</label>
                                <select
                                    value={adjustConfig.target}
                                    onChange={(e) => setAdjustConfig({ ...adjustConfig, target: e.target.value as any })}
                                    className="block bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                                >
                                    <option value="Precio_Unitario">Precio de Venta</option>
                                    <option value="Costo">Costo de Compra</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Tipo de Ajuste</label>
                                <div className="flex bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-xl p-1">
                                    <button
                                        onClick={() => setAdjustConfig({ ...adjustConfig, type: 'percent' })}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${adjustConfig.type === 'percent' ? 'bg-amber-500 text-white' : 'text-slate-400'}`}
                                    >
                                        Porcentaje (%)
                                    </button>
                                    <button
                                        onClick={() => setAdjustConfig({ ...adjustConfig, type: 'fixed' })}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${adjustConfig.type === 'fixed' ? 'bg-amber-500 text-white' : 'text-slate-400'}`}
                                    >
                                        Monto Fijo ($)
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 flex-1 min-w-[120px]">
                                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Valor (+ o -)</label>
                                <input
                                    type="number"
                                    value={adjustConfig.value}
                                    onChange={(e) => setAdjustConfig({ ...adjustConfig, value: parseFloat(e.target.value) })}
                                    placeholder="Ej: 10 o -5"
                                    className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-2 text-sm font-bold outline-none text-slate-800 dark:text-slate-100"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={applyMassAdjustment}
                                    className="px-6 py-2 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all"
                                >
                                    Correr Proceso
                                </button>
                                <button
                                    onClick={() => setIsAdjustOverlayOpen(false)}
                                    className="p-2.5 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toolbar Principal y Filtros de Estado */}
            <div className="flex flex-col xl:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, SKU o categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm text-slate-800 dark:text-slate-100"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Filtros Rápidos */}
                    <div className="flex flex-wrap w-full sm:w-auto p-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm">
                        {[
                            { id: 'all', label: 'Todos', icon: Package },
                            { id: 'no_stock', label: 'Sin Stock', icon: Box },
                            { id: 'low_margin', label: 'Baja Rent.', icon: Percent },
                            { id: 'weighable', label: 'Pesables', icon: Weight }
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => setQuickStatus(btn.id as any)}
                                className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-2 sm:px-4 py-2 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${quickStatus === btn.id ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <btn.icon size={12} className="hidden xs:block" /> {btn.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex w-full sm:w-auto items-center gap-2 bg-[var(--card)] border border-[var(--border)] p-1.5 rounded-2xl shadow-sm text-slate-800 dark:text-slate-100">
                        <Filter size={14} className="ml-2 text-slate-400 shrink-0" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="bg-transparent text-xs font-bold px-4 py-1.5 outline-none cursor-pointer w-full sm:min-w-[150px]"
                        >
                            {categories.map((cat: any) => (
                                <option key={cat} value={cat}>{cat === 'ALL' ? 'Todas las Categorías' : cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Listado / Tabla */}
            {viewMode === 'list' || isMassEditing ? (
                <div className="tech-card p-0 overflow-hidden border border-[var(--border)] shadow-xl bg-[var(--card)]">
                    <div className="overflow-x-auto custom-scroll">
                        <table className="w-full text-left border-collapse min-w-[1400px]">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border)]">
                                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50" onClick={() => handleSort('Nombre')}>
                                        <div className="flex items-center gap-2">
                                            Producto {sortConfig.key === 'Nombre' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50" onClick={() => handleSort('Categoria')}>
                                        <div className="flex items-center gap-2">
                                            Categoría {sortConfig.key === 'Categoria' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50" onClick={() => handleSort('Precio_Unitario')}>
                                        <div className="flex items-center justify-end gap-2">
                                            Economía {sortConfig.key === 'Precio_Unitario' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50" onClick={() => handleSort('margin')}>
                                        <div className="flex items-center justify-center gap-2">
                                            Margen {sortConfig.key === 'margin' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50" onClick={() => handleSort('Stock_Actual')}>
                                        <div className="flex items-center justify-end gap-2">
                                            Stock {sortConfig.key === 'Stock_Actual' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />)}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-right">Carga Est.</th>
                                    {!isMassEditing && <th className="px-6 py-4 text-center">⚙️</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                <AnimatePresence>
                                    {(isMassEditing ? editedProducts : filteredProducts).map((product: any, idx: number) => (
                                        <tr key={product.ID_Producto} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                            {isMassEditing ? (
                                                <MassEditRow
                                                    product={product}
                                                    onChange={handleBulkFieldChange}
                                                    categories={categories}
                                                />
                                            ) : (
                                                <ProductRow
                                                    product={product}
                                                    onEdit={openEditDrawer}
                                                />
                                            )}
                                        </tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                        {filteredProducts.map((product: any, idx: number) => (
                            <ProductCard key={product.ID_Producto} product={product} idx={idx} onEdit={openEditDrawer} />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* DRAWER INDIVIDUAL */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <ProductDrawer
                        onClose={() => setIsDrawerOpen(false)}
                        formData={formData}
                        setFormData={setFormData}
                        onSave={handleSaveIndividual}
                        saving={saving}
                        drawerMode={drawerMode}
                        categories={categories}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// --- SUBCOMPONENTE: FILA DE EDICIÓN MASIVA ---
function MassEditRow({ product, onChange, categories }: any) {
    const margin = calculateProfitability(parseFloat(product.Precio_Unitario), parseFloat(product.Costo));
    const estimatedWeight = (parseFloat(product.Stock_Actual || 0) * parseFloat(product.Peso || 0)).toFixed(2);

    return (
        <>
            <td className="px-4 py-2 min-w-[250px]">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">#{product.ID_Producto}</span>
                    <input
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                        value={product.Nombre}
                        onChange={(e) => onChange(product.ID_Producto, 'Nombre', e.target.value)}
                    />
                </div>
            </td>
            <td className="px-4 py-2 text-slate-800 dark:text-slate-100">
                <select
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    value={product.Categoria}
                    onChange={(e) => onChange(product.ID_Producto, 'Categoria', e.target.value)}
                >
                    {categories.filter((c: any) => c !== 'ALL').map((c: any) => <option key={c} value={c}>{c}</option>)}
                </select>
            </td>
            <td className="px-4 py-2 text-right">
                <div className="flex flex-col gap-1 items-end">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">$</span>
                        <input
                            type="number"
                            className="w-32 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl pl-6 pr-3 py-2 text-sm font-black text-indigo-500 outline-none"
                            value={product.Precio_Unitario}
                            onChange={(e) => onChange(product.ID_Producto, 'Precio_Unitario', e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">C:</span>
                        <input
                            type="number"
                            className="w-32 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl pl-6 pr-3 py-2 text-[11px] font-bold text-slate-500 outline-none"
                            value={product.Costo}
                            onChange={(e) => onChange(product.ID_Producto, 'Costo', e.target.value)}
                        />
                    </div>
                </div>
            </td>
            <td className="px-4 py-2 text-center">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${margin >= 30 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                    margin >= 15 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        'bg-rose-500/10 border-rose-500/20 text-rose-500'
                    }`}>
                    <span className="text-xs font-black tracking-tight">{margin.toFixed(1)}%</span>
                </div>
            </td>
            <td className="px-4 py-2 text-right">
                <div className="flex flex-col gap-2 items-end">
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            className="w-20 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-black text-slate-700 dark:text-slate-300 outline-none"
                            value={product.Stock_Actual}
                            onChange={(e) => onChange(product.ID_Producto, 'Stock_Actual', e.target.value)}
                        />
                        <select
                            className="bg-transparent text-[10px] font-black uppercase text-slate-400 outline-none"
                            value={product.Unidad}
                            onChange={(e) => onChange(product.ID_Producto, 'Unidad', e.target.value)}
                        >
                            <option value="Unid">Unid</option>
                            <option value="Kg">Kg</option>
                            <option value="Lt">Lt</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase">UB:</span>
                            <input
                                type="number"
                                className="w-16 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl px-2 py-1 text-[10px] font-bold text-slate-500 outline-none"
                                value={product.Unidades_Bulto}
                                onChange={(e) => onChange(product.ID_Producto, 'Unidades_Bulto', e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Peso P:</span>
                            <input
                                type="number"
                                className="w-16 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl px-2 py-1 text-[10px] font-bold text-slate-500 outline-none"
                                value={product.Peso_Promedio}
                                onChange={(e) => onChange(product.ID_Producto, 'Peso_Promedio', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-amber-600">{estimatedWeight} Kg</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase">Carga Est.</span>
                </div>
            </td>
        </>
    );
}

// --- SUBCOMPONENTE DE TARJETA ---
function ProductCard({ product, idx, onEdit }: any) {
    const margin = calculateProfitability(parseFloat(product.Precio_Unitario), parseFloat(product.Costo));
    const totalWeight = (parseFloat(product.Stock_Actual || 0) * parseFloat(product.Peso_Promedio || 0)).toFixed(1);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(idx * 0.02, 0.5) }}
            className="tech-card p-0 group overflow-hidden hover:border-indigo-500/30 transition-all cursor-default"
        >
            <div className="p-5 flex gap-4">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-[var(--border)] flex-shrink-0">
                    {product.Imagen_URL ? (
                        <img src={product.Imagen_URL} alt={product.Nombre} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon size={20} />
                        </div>
                    )}
                    {parseFloat(product.Stock_Actual) <= 5 && (
                        <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-center">
                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex gap-1">
                            <span className="text-[8px] font-black py-0.5 px-2 rounded-full bg-indigo-500/10 text-indigo-500 uppercase tracking-widest border border-indigo-500/10">
                                {product.Categoria || 'S/C'}
                            </span>
                            {product.Unidad === 'Kg' && (
                                <span className="text-[8px] font-black py-0.5 px-2 rounded-full bg-amber-500/10 text-amber-600 uppercase tracking-widest border border-amber-500/10">
                                    Pesable
                                </span>
                            )}
                        </div>
                        <div className={`flex items-center gap-1 text-[9px] font-black ${margin >= 30 ? 'text-emerald-500' : margin >= 15 ? 'text-amber-500' : 'text-rose-500'}`}>
                            <TrendingUp size={10} />
                            {margin.toFixed(1)}%
                        </div>
                    </div>
                    <h4 className="font-bold text-sm truncate mb-3 text-slate-800 dark:text-slate-100">{product.Nombre}</h4>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-[var(--border)]/50">
                            <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Precio</p>
                            <p className="font-black text-xs text-indigo-600">${parseFloat(product.Precio_Unitario || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-[var(--border)]/50">
                            <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Stock</p>
                            <p className={`font-black text-xs ${parseFloat(product.Stock_Actual) <= 5 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                {parseFloat(product.Stock_Actual || 0).toFixed(0)} <span className="text-[8px] opacity-40 font-medium">{product.Unidad || 'un'}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-900/30 px-5 py-3 border-t border-[var(--border)] flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 text-slate-400">
                <div className="flex gap-4 text-[8px] font-bold text-slate-400 uppercase tracking-widest overflow-hidden">
                    <span className="truncate flex items-center gap-1"><ScaleIcon size={10} /> {totalWeight} Kg Est.</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onEdit(product)}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-[var(--border)] hover:bg-indigo-500 hover:text-white transition-all shadow-sm active:scale-90"
                    >
                        <Edit3 size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); (window as any).handleDuplicateProduct?.(product); }}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-[var(--border)] hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-90"
                        title="Duplicar Producto"
                    >
                        <Copy size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); (window as any).handleDeleteProduct?.(product.ID_Producto); }}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-[var(--border)] hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// --- SUBCOMPONENTE DE FILA (LISTA) ---
function ProductRow({ product, onEdit }: any) {
    const isLowStock = parseFloat(product.Stock_Actual) <= 5;
    const margin = calculateProfitability(parseFloat(product.Precio_Unitario), parseFloat(product.Costo));
    const estimatedWeight = (parseFloat(product.Stock_Actual || 0) * parseFloat(product.Peso_Promedio || 0)).toFixed(2);

    return (
        <>
            <td className="px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-[var(--border)] overflow-hidden flex-shrink-0">
                        {product.Imagen_URL ? (
                            <img src={product.Imagen_URL} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={16} /></div>
                        )}
                    </div>
                    <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{product.Nombre}</p>
                        <div className="flex items-center gap-2">
                            <p className="text-[9px] font-mono text-slate-400 uppercase">ID: {product.ID_Producto}</p>
                            {parseFloat(product.Peso_Promedio) > 0 && (
                                <span className="text-[8px] font-black text-amber-500 flex items-center gap-0.5">
                                    <Weight size={8} /> {product.Peso_Promedio}Kg avg.
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className="text-[9px] font-black py-1 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-widest border border-[var(--border)]">
                    {product.Categoria || 'Sin Cat.'}
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="space-y-0.5">
                    <p className="font-black text-sm text-indigo-600">${parseFloat(product.Precio_Unitario || 0).toLocaleString()}</p>
                    <div className="flex items-center justify-end gap-1.5 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Costo:</span>
                        <span className="text-[9px] font-black text-slate-600 dark:text-slate-300">${product.Costo || 0}</span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${margin >= 30 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                    margin >= 15 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        'bg-rose-500/10 border-rose-500/20 text-rose-500'
                    }`}>
                    <TrendingUp size={12} strokeWidth={3} />
                    <span className="text-xs font-black tracking-tight">{margin.toFixed(1)}%</span>
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex flex-col items-end">
                    <div className={`flex items-center gap-2 font-black text-sm ${isLowStock ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
                        {parseFloat(product.Stock_Actual || 0).toFixed(0)} <span className="text-[10px] opacity-40 font-bold uppercase">{product.Unidad || 'un'}</span>
                        {isLowStock && <AlertCircle size={12} className="animate-pulse" />}
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-[8px] text-slate-400 uppercase tracking-tighter">UB: {product.Unidades_Bulto || 1}</p>
                        <p className="text-[8px] text-slate-400 uppercase tracking-tighter">•</p>
                        <p className="text-[8px] text-slate-400 uppercase tracking-tighter">Stock Actual</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-amber-600">{estimatedWeight} Kg</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Carga Total Est.</span>
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(product)}
                        className="p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-slate-500 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all shadow-sm active:scale-95"
                    >
                        <Edit3 size={14} />
                    </button>
                    <button
                        onClick={() => (window as any).handleDuplicateProduct?.(product)}
                        className="p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-slate-500 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-sm active:scale-95"
                        title="Duplicar Producto"
                    >
                        <Copy size={14} />
                    </button>
                    <button
                        onClick={() => (window as any).handleDeleteProduct?.(String(product.ID_Producto))}
                        className="p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-slate-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all shadow-sm active:scale-95"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </td>
        </>
    );
}

// --- SUBCOMPONENTE DRAWER ---
function ProductDrawer({ onClose, formData, setFormData, onSave, saving, drawerMode, categories }: any) {
    const currentMargin = calculateProfitability(parseFloat(formData.Precio_Unitario || 0), parseFloat(formData.Costo || 0));
    const profit = (parseFloat(formData.Precio_Unitario || 0) - parseFloat(formData.Costo || 0));
    const estimatedStockWeight = (parseFloat(formData.Stock_Actual || 0) * parseFloat(formData.Peso_Promedio || 0)).toFixed(2);

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-slate-950/40 z-[110] backdrop-blur-[2px]"
            />
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-full max-w-xl bg-[var(--card)] z-[120] shadow-2xl border-l border-[var(--border)] flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-4 text-slate-800 dark:text-slate-100">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-inner">
                            {drawerMode === 'edit' ? <Edit3 size={24} /> : <Plus size={24} />}
                        </div>
                        <div>
                            <h3 className="font-black text-xl tracking-tight">
                                {drawerMode === 'edit' ? 'Ficha de Producto' : 'Nuevo Producto'}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                    ID: {formData.ID_Producto}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-90 text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Contenido Formulario */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scroll pb-32">

                    {/* Dashboard de Rentabilidad y Logística */}
                    <div className="grid grid-cols-1 gap-4">
                        <section className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/10 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <TrendingUp size={120} />
                            </div>
                            <div className="relative">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300 mb-6 flex items-center gap-2">
                                    <Percent size={12} /> Análisis de Margen Neto
                                </h4>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-indigo-200/50">Utilidad Bruta</p>
                                        <p className="text-3xl font-black">${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        <p className="text-[10px] text-indigo-400 font-bold mt-1">por unidad vendida</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-indigo-200/50">Rentabilidad</p>
                                        <p className={`text-3xl font-black ${currentMargin >= 30 ? 'text-emerald-400' : currentMargin >= 15 ? 'text-amber-400' : 'text-rose-400'}`}>
                                            {currentMargin.toFixed(1)}%
                                        </p>
                                        <div className="flex items-center justify-end gap-1 mt-1">
                                            <div className={`w-2 h-2 rounded-full ${currentMargin >= 30 ? 'bg-emerald-400' : currentMargin >= 15 ? 'bg-amber-400' : 'bg-rose-400'}`} />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Marque Actual</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-center justify-between text-amber-700 dark:text-amber-400">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                    <ScaleIcon size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Estimación de Inventario</p>
                                    <p className="text-lg font-black">{estimatedStockWeight} Kilogramos</p>
                                </div>
                            </div>
                            <div className="text-right text-[10px] font-bold max-w-[120px] leading-tight opacity-60 italic">
                                Según Peso Promedio de {formData.Peso_Promedio || 0}kg
                            </div>
                        </section>
                    </div>

                    {/* Campos Formulario */}
                    <div className="space-y-8 text-slate-800 dark:text-slate-100">
                        {/* 1. Identificación */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.25em] flex items-center gap-3">
                                <Tag size={12} className="text-indigo-500" /> Identificación del Artículo
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-full space-y-2">
                                    <InputField
                                        label="Nombre Completo"
                                        value={formData.Nombre}
                                        onChange={(v: any) => setFormData({ ...formData, Nombre: v })}
                                        placeholder="Ej: Leche Entera Wanda 1L"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        Categoría
                                    </label>
                                    <div className="relative">
                                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            list="drawer-cats"
                                            value={formData.Categoria || ""}
                                            onChange={(e: any) => setFormData({ ...formData, Categoria: e.target.value })}
                                            placeholder="Seleccionar o crear..."
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-[var(--border)] rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-slate-800 dark:text-slate-100"
                                        />
                                        <datalist id="drawer-cats">
                                            {categories.filter((c: any) => c !== 'ALL').map((c: any) => <option key={c} value={c} />)}
                                        </datalist>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        Unidad de Medida
                                    </label>
                                    <select
                                        value={formData.Unidad || "Unid"}
                                        onChange={(e) => setFormData({ ...formData, Unidad: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-[var(--border)] rounded-2xl py-3.5 px-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all appearance-none text-slate-800 dark:text-slate-100"
                                    >
                                        <option value="Unid">Unidad</option>
                                        <option value="Kg">Kilogramo (Kg)</option>
                                        <option value="Lt">Litro (Lt)</option>
                                        <option value="Pack">Pack / Bulto</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* 2. Economía e Inventario */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.25em] flex items-center gap-3">
                                <DollarSign size={12} /> Valores Comerciales & Stock
                            </h4>
                            <div className="grid grid-cols-2 gap-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-[var(--border)]/50">
                                <InputField
                                    label="Precio de Venta ($)"
                                    value={formData.Precio_Unitario}
                                    type="number"
                                    onChange={(v: any) => setFormData({ ...formData, Precio_Unitario: v })}
                                    highlight
                                />
                                <InputField
                                    label="Stock Fisico Actual"
                                    value={formData.Stock_Actual}
                                    type="number"
                                    onChange={(v: any) => setFormData({ ...formData, Stock_Actual: v })}
                                    color={parseFloat(formData.Stock_Actual) <= 5 ? "rose" : "slate"}
                                />
                                <InputField
                                    label="Costo Unitario ($)"
                                    value={formData.Costo}
                                    type="number"
                                    onChange={(v: any) => setFormData({ ...formData, Costo: v })}
                                    highlight
                                />
                                <InputField
                                    label="Cant. por Bulto (UB)"
                                    value={formData.Unidades_Bulto}
                                    type="number"
                                    onChange={(v: any) => setFormData({ ...formData, Unidades_Bulto: v })}
                                />
                            </div>
                        </section>

                        {/* 3. Logística */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.25em] flex items-center gap-3">
                                <Scale size={12} /> Especificaciones Logísticas
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField
                                    label="Peso Promedio x Pieza (Kg)"
                                    value={formData.Peso_Promedio}
                                    type="number"
                                    step="0.001"
                                    onChange={(v: any) => setFormData({ ...formData, Peso_Promedio: v })}
                                    placeholder="Ej: 0.850"
                                />
                                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-3">
                                    <AlertCircle size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-indigo-600/80 font-medium leading-relaxed italic">
                                        Modificando manualmente el **Stock** o el **Peso**, el sistema ajustará automáticamente la estimación de carga total del inventario.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* 4. Multimedia */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.25em] flex items-center gap-3">
                                <Layers size={12} /> Multimedia
                            </h4>
                            <div className="space-y-4">
                                <InputField
                                    label="URL Imagen"
                                    value={formData.Imagen_URL}
                                    onChange={(v: any) => setFormData({ ...formData, Imagen_URL: v })}
                                    placeholder="https://"
                                />
                                {formData.Imagen_URL && (
                                    <div className="w-32 h-32 rounded-3xl overflow-hidden border border-[var(--border)]">
                                        <img src={formData.Imagen_URL} className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 5. Promoción y Ofertas (MD3) */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-rose-500 tracking-[0.25em] flex items-center gap-3">
                                <Zap size={12} /> Promoción & Alta Prioridad
                            </h4>
                            <div className="p-6 rounded-3xl bg-rose-50/30 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Marcar como Oferta</span>
                                        <span className="text-[10px] text-slate-500 italic">Aparecerá en el carrusel de preventa</span>
                                    </div>
                                    <button
                                        onClick={() => setFormData({ ...formData, Es_Oferta: !formData.Es_Oferta })}
                                        className={`w-12 h-6 rounded-full transition-all relative ${formData.Es_Oferta ? 'bg-rose-500 shadow-md shadow-rose-500/20' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.Es_Oferta ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                                <InputField
                                    label="Etiqueta de Oferta"
                                    value={formData.Nota_Oferta}
                                    onChange={(v: any) => setFormData({ ...formData, Nota_Oferta: v })}
                                    placeholder="Ej: -20% OFF hoy"
                                />
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer Drawer */}
                <div className="p-8 border-t border-[var(--border)] bg-white dark:bg-slate-900 sticky bottom-0 z-10 flex gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 border border-[var(--border)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 text-slate-600 dark:text-slate-300"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 active:scale-95"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                        {saving ? 'Guardando...' : 'Aplicar Cambios'}
                    </button>
                </div>
            </motion.div>
        </>
    );
}

// Componente Helper para Inputs
function InputField({ label, value, onChange, type = "text", placeholder = "", highlight = false, color = "slate", step = "any" }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <input
                type={type}
                step={step}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`
          w-full bg-slate-50 dark:bg-slate-950 border border-[var(--border)] rounded-2xl py-3 px-5 text-sm font-bold outline-none transition-all
          focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 text-slate-800 dark:text-slate-100
          ${highlight ? 'text-indigo-600 font-black' : 'text-slate-700 dark:text-slate-200'}
          ${color === 'rose' ? 'text-rose-500 border-rose-200' : ''}
        `}
            />
        </div>
    );
}
