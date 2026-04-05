"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Package,
    Search,
    Filter,
    Edit3,
    Trash2,
    Settings2,
    ChevronDown,
    Plus,
    Upload,
    Download,
    Image as ImageIcon,
    ExternalLink,
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
    EyeOff,
    Globe,
    ChevronRight,
    Camera as CameraIcon,
    Link as LinkIcon,
} from "lucide-react";
import { wandaApi } from "@/lib/api";
import { useData } from "@/context/DataContext";
import { getImageUrl, normalizeText, smartSearch } from "@/lib/utils";
import { analyzeProductImage } from "@/app/actions/gemini";

// --- HELPERS ---
const calculateProfitability = (price: number, cost: number) => {
    if (!cost || cost === 0) return 0;
    return ((price - cost) / cost) * 100;
};

// --- COMPONENTE: FILTER CHIP ---
const FilterChip = ({ label, active, onClick, icon: Icon }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${
            active 
            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' 
            : 'bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 border border-slate-100 dark:border-slate-800'
        }`}
    >
        {Icon && <Icon size={14} />}
        {label}
    </button>
);


export default function ProductosPage() {
    const { data, refreshData, setIsSyncing, isSyncing } = useData();
    const products = useMemo(() => data?.products || [], [data?.products]);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showMetrics, setShowMetrics] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importPreview, setImportPreview] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchOnlyByCode, setSearchOnlyByCode] = useState(false);

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

    // Estado para Carga Rápida de Imagen
    const [quickImageTarget, setQuickImageTarget] = useState<any>(null);
    const quickImageFileInputRef = useRef<HTMLInputElement>(null);

    const handleQuickImageAction = (product: any, type: 'camera' | 'upload' | 'url') => {
        setQuickImageTarget(product);
        if (type === 'url') {
            const url = prompt("Ingrese la URL de la imagen para: " + product.Nombre);
            if (url) {
                confirmQuickImage(product, url);
            }
        } else {
            if (quickImageFileInputRef.current) {
                quickImageFileInputRef.current.setAttribute('capture', type === 'camera' ? 'environment' : '');
                quickImageFileInputRef.current.click();
            }
        }
    };

    const handleQuickImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !quickImageTarget) return;

        try {
            setIsSyncing(true);
            const imageUrl = await wandaApi.uploadImage(file, `quick_pics/${Date.now()}_${file.name}`);
            await confirmQuickImage(quickImageTarget, imageUrl);
        } catch (error) {
            console.error(error);
            alert("Error al subir imagen rápida.");
        } finally {
            setIsSyncing(false);
            setQuickImageTarget(null);
            if (e.target) e.target.value = "";
        }
    };

    const confirmQuickImage = async (product: any, imageUrl: string) => {
        try {
            setIsSyncing(true);
            await wandaApi.saveProduct({ ...product, Imagen_URL: imageUrl });
            await refreshData(true);
        } catch (error) {
            console.error(error);
            alert("Error al actualizar imagen del producto.");
        } finally {
            setIsSyncing(false);
        }
    };

    // Estados para el Drawer de Edición Individual
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [drawerMode, setDrawerMode] = useState<'edit' | 'create'>('edit');

    // Estados para Ordenamiento y Filtros Críticos
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'Nombre', direction: 'asc' });
    const [quickStatus, setQuickStatus] = useState<'all' | 'no_stock' | 'low_margin' | 'weighable' | 'no_image'>('all');

    // Nuevos filtros de ocultamiento globales
    const config = data?.config || {};
    const [hideLowPrice, setHideLowPrice] = useState(config.HIDE_LOW_PRICE === 'true' || config.HIDE_LOW_PRICE === true);
    const [hideNoStock, setHideNoStock] = useState(config.HIDE_NO_STOCK === 'true' || config.HIDE_NO_STOCK === true);

    const handleToggleHideLowPrice = async (checked: boolean) => {
        try {
            setIsSyncing(true);
            setHideLowPrice(checked);
            await wandaApi.saveConfig({ HIDE_LOW_PRICE: checked });
            await refreshData(true);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleToggleHideNoStock = async (checked: boolean) => {
        try {
            setIsSyncing(true);
            setHideNoStock(checked);
            await wandaApi.saveConfig({ HIDE_NO_STOCK: checked });
            await refreshData(true);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const categories = ["ALL", ...new Set(products.map((p: any) => p.Categoria).filter(Boolean).sort() as string[])];

    const filteredProducts = useMemo(() => {
        const result = products.filter((p: any) => {
            let matchesSearch = true;
            if (searchTerm) {
                if (searchOnlyByCode) {
                    const query = normalizeText(searchTerm).trim();
                    matchesSearch = normalizeText(p.ID_Producto) === query;
                } else {
                    const searchPayload = `${p.Nombre} ${p.ID_Producto} ${p.Categoria}`;
                    matchesSearch = smartSearch(searchPayload, searchTerm);
                }
            }
            const matchesCat = categoryFilter === "ALL" || p.Categoria === categoryFilter;

            let matchesStatus = true;
            if (quickStatus === 'no_stock') matchesStatus = parseFloat(p.Stock_Actual || 0) <= 0;
            if (quickStatus === 'low_margin') {
                const m = calculateProfitability(parseFloat(p.Precio_Unitario), parseFloat(p.Costo));
                matchesStatus = m < 15;
            }
            if (quickStatus === 'weighable') matchesStatus = p.Unidad === 'Kg';
            if (quickStatus === 'no_image') matchesStatus = !p.Imagen_URL;

            // Criterios de ocultamiento
            if (hideLowPrice && parseFloat(p.Precio_Unitario || 0) < 1) return false;
            if (hideNoStock && parseFloat(p.Stock_Actual || 0) <= 0) return false;

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
    }, [products, searchTerm, categoryFilter, quickStatus, sortConfig, hideLowPrice, hideNoStock, searchOnlyByCode]);

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
        setEditedProducts(prev => prev.map(p => {
            if (String(p.ID_Producto) === String(id)) {
                let updated = { ...p, [field]: value };
                
                // Si cambia el costo, intentamos mantener el margen previo ajustando el precio
                if (field === 'Costo') {
                    const oldCost = parseFloat(p.Costo || 0);
                    const oldPrice = parseFloat(p.Precio_Unitario || 0);
                    const newCost = parseFloat(value || 0);
                    
                    if (oldCost > 0) {
                        const margin = ((oldPrice - oldCost) / oldCost);
                        updated.Precio_Unitario = (newCost * (1 + margin)).toFixed(2);
                    }
                }
                
                return updated;
            }
            return p;
        }));
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

    const handleMassSave = async () => {
        try {
            setIsSyncing(true);
            const res = await wandaApi.bulkUpdateProducts(editedProducts);
            if (res.error) throw new Error(res.error);
            setIsMassEditing(false);
            setEditedProducts([]);
            await refreshData(true);
            alert("Productos actualizados masivamente");
        } catch (err: any) {
            console.error(err);
            alert("Error al guardar cambios masivos: " + err.message);
        } finally {
            setIsSyncing(false);
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
            setIsSyncing(true);
            const res = await wandaApi.deleteProduct(id);
            if (res.error) throw new Error(res.error);
            await refreshData(true);
            alert("Producto eliminado correctamente.");
        } catch (err: any) {
            console.error(err);
            alert("Error al eliminar: " + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    // Clonación de Producto
    const handleDuplicateProduct = (product: any) => {
        const { id, ...rest } = product; // Remove original ID property
        const clone = {
            ...rest,
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

        const BOM = "\uFEFF";
        const blob = new Blob([BOM, csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        // Formateo seguro de fecha para el nombre del archivo
        const now = new Date();
        const dateStr = `${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}`;
        const fileName = `inventario_wanda_${dateStr}.csv`;

        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Hacer disponible globalmente para subcomponentes si no se quiere pasar por n niveles de props
    useEffect(() => {
        (window as any).handleDeleteProduct = handleDeleteProduct;
        (window as any).handleDuplicateProduct = handleDuplicateProduct;
        (window as any).handleQuickImageAction = handleQuickImageAction;
        (window as any).triggerImportFile = () => fileInputRef.current?.click();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredProducts, quickImageTarget]);

    const handleSaveIndividual = async () => {
        try {
            if (!formData.Nombre) {
                alert("El nombre del producto es obligatorio.");
                return;
            }
            setIsSyncing(true);
            const res = await wandaApi.saveProduct(formData);
            if (res.error) throw new Error(res.error);

            setIsDrawerOpen(false);
            setFormData({});
            await refreshData(true);
            alert(drawerMode === 'create' ? "Producto creado con éxito" : "Producto actualizado");
        } catch (err: any) {
            console.error("Error saving product:", err);
            alert("Error al guardar: " + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleConfirmImport = async () => {
        if (importPreview.length === 0) return;
        
        setIsImporting(true);
        try {
            await wandaApi.bulkUpdateProducts(importPreview);
            await refreshData();
            setShowImportModal(false);
            setImportPreview([]);
            alert(`Sincronización exitosa: ${importPreview.length} productos actualizados.`);
        } catch (error) {
            console.error(error);
            alert("Error al sincronizar los productos.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
            if (lines.length < 2) {
                alert("El archivo parece estar vacío o mal formateado.");
                return;
            }

            const headerLine = lines[0];
            const sep = headerLine.includes(";") ? ";" : ",";
            const headers = headerLine.split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
            
            const parsedData = lines.slice(1).map(line => {
                const values = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
                const obj: any = {};
                headers.forEach((header, index) => {
                    if (values[index] !== undefined) {
                        obj[header] = values[index];
                    }
                });
                return obj;
            });

            // Normalización mínima (Convertir números)
            const normalized = parsedData.map(item => ({
                ...item,
                ID_Producto: item.ID_Producto || item.SKU || item.id || `PROD-${Math.random().toString(36).substr(2, 9)}`,
                Precio_Unitario: parseFloat(item.Precio_Unitario || item.Precio || 0),
                Costo: parseFloat(item.Costo || 0),
                Stock_Actual: parseFloat(item.Stock_Actual || item.Stock || 0),
                Unidades_Bulto: parseInt(item.Unidades_Bulto || 1)
            }));

            setImportPreview(normalized);
        };
        reader.readAsText(file);
    };

    const deleteFromPreview = (idx: number) => {
        setImportPreview(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-6 relative min-h-screen pb-20">
            {/* Input oculto para carga de archivos */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv"
                onChange={handleFileChange}
            />

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-2 border-b border-slate-100 dark:border-slate-800/50">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Package size={12} /> Gestión de Inventario Premium
                    </span>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Catálogo Wanda</h1>
                    <p className="text-slate-500 text-sm mt-1">Control de stock, logística y rentabilidad en tiempo real.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-500 shadow-md scale-105' : 'text-slate-400 hover:text-slate-500'}`}
                            title="Vista Cuadrícula"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-500 shadow-md scale-105' : 'text-slate-400 hover:text-slate-500'}`}
                            title="Vista Lista"
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden lg:block" />

                    <div className="hidden lg:flex flex-wrap items-center gap-3">
                        {!isMassEditing && (
                            <>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleExportCSV}
                                        className="p-3 bg-white dark:bg-slate-900 text-slate-400 hover:text-emerald-500 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all shadow-sm group"
                                        title="Exportar CSV"
                                    >
                                        <Download size={20} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                    <button
                                        onClick={() => setShowImportModal(true)}
                                        className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 hover:border-indigo-500 transition-all shadow-sm group"
                                    >
                                        <Upload size={16} className="group-hover:scale-110 transition-transform" />
                                        Importar
                                    </button>
                                </div>

                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${
                                        showAdvanced 
                                        ? 'bg-slate-800 text-white border-slate-700' 
                                        : 'bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 border-slate-100 dark:border-slate-800'
                                    }`}
                                >
                                    <Settings2 size={16} className={showAdvanced ? 'rotate-90 transition-transform' : 'transition-transform'} />
                                    {showAdvanced ? 'Cerrar Filtros' : 'Filtros'}
                                </button>

                                <button
                                    onClick={openCreateDrawer}
                                    className="flex items-center gap-3 px-7 py-3 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                                >
                                    <Plus size={18} /> Nuevo Producto
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Acciones de Auditoría (Fuera del flex-row superior para mejor control) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                    {/* Acciones Rápidas Móvil (Solo visible en responsive) */}
                    <div className="flex lg:hidden overflow-x-auto pb-2 gap-3 no-scrollbar w-full">
                        <button
                            onClick={openCreateDrawer}
                            className="shrink-0 flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20"
                        >
                            <Plus size={16} /> Nuevo
                        </button>
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="shrink-0 flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                        >
                            <Filter size={16} /> {showAdvanced ? 'Filtros' : 'Filtros'}
                        </button>
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="shrink-0 flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                        >
                            <Upload size={16} /> Importar
                        </button>
                    </div>

                    {isMassEditing && (
                        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                            <button
                                onClick={() => setIsAdjustOverlayOpen(true)}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                            >
                                <Zap size={16} /> Ajustar Precios
                            </button>
                            <button
                                onClick={toggleMassEdit}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleMassSave}
                                disabled={isSyncing}
                                className="w-full lg:w-auto flex items-center justify-center gap-3 px-7 py-3 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all disabled:opacity-50"
                            >
                                {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Guardar ({editedProducts.length})
                            </button>
                        </div>
                    )}
                </div>

            {/* Panel Avanzado / Collapsible */}
            <AnimatePresence>
                {showAdvanced && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                        exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] p-8">
                            <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                        {[
                                            { id: 'all', icon: Package, label: 'Todo' },
                                            { id: 'no_stock', icon: Box, label: 'Sin Stock' },
                                            { id: 'low_margin', icon: Percent, label: 'Bajo Margen' },
                                            { id: 'weighable', icon: Weight, label: 'Pesables' }
                                        ].map((btn) => (
                                            <button
                                                key={btn.id}
                                                onClick={() => setQuickStatus(btn.id as any)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                                                    quickStatus === btn.id 
                                                    ? 'bg-indigo-500 text-white shadow-md' 
                                                    : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                <btn.icon size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{btn.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-6 bg-white dark:bg-slate-900 px-6 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" className="sr-only" checked={hideNoStock} onChange={(e) => handleToggleHideNoStock(e.target.checked)} />
                                            <div className={`w-8 h-4.5 rounded-full relative transition-all ${hideNoStock ? 'bg-rose-500' : 'bg-slate-200'}`}>
                                                <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${hideNoStock ? 'right-0.5' : 'left-0.5'}`} />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-rose-500 transition-colors">Ocultar Out Stock</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:border-indigo-500/30 transition-all group">
                                        <input type="checkbox" className="sr-only" checked={showMetrics} onChange={(e) => setShowMetrics(e.target.checked)} />
                                        <div className={`p-1.5 rounded-lg transition-all ${showMetrics ? 'bg-indigo-500 text-white' : 'bg-slate-50 text-slate-400 dark:bg-slate-800'}`}>
                                            <TrendingUp size={16} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-500">Métricas</span>
                                    </label>

                                    {!isMassEditing && (
                                        <button
                                            onClick={toggleMassEdit}
                                            className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm group"
                                        >
                                            <Edit3 size={16} className="group-hover:text-indigo-500 transition-colors" />
                                            Modo Auditoría
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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

            {/* BARRA DE BÚSQUEDA PREMIUM */}
            <div className="flex flex-col gap-4 mb-4 mt-6">

                <div className="flex flex-col lg:flex-row items-center gap-6">
                    {/* Barra de Búsqueda Premium */}
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder={searchOnlyByCode ? "Ingresar código exacto..." : "Buscar por nombre, SKU o categoría..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-32 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-indigo-500/30 rounded-[22px] text-sm font-bold shadow-xl shadow-slate-200/20 dark:shadow-black/20 outline-none transition-all placeholder:text-slate-400"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
                                <input type="checkbox" className="sr-only" checked={searchOnlyByCode} onChange={(e) => setSearchOnlyByCode(e.target.checked)} />
                                <div className={`w-8 h-4 rounded-full relative transition-all ${searchOnlyByCode ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${searchOnlyByCode ? 'right-0.5' : 'left-0.5'}`} />
                                </div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SKU</span>
                            </label>
                        </div>
                    </div>

                    {/* Chips de Categoría */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar scroll-smooth">
                        {categories.slice(0, 5).map((cat: any) => (
                            <FilterChip 
                                key={cat} 
                                label={cat === 'ALL' ? 'Todos' : cat} 
                                active={categoryFilter === cat} 
                                onClick={() => setCategoryFilter(cat)} 
                            />
                        ))}
                    </div>


                </div>
            </div>

            {/* Listado / Tabla */}
            {viewMode === 'list' || isMassEditing ? (
                <div className="tech-card p-0 overflow-hidden border border-[var(--border)] shadow-xl bg-[var(--card)]">
                    <div className="overflow-x-auto custom-scroll">
                        <table className="w-full text-left border-collapse min-w-[1400px]">
                                <thead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-5 text-left sticky left-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort('Nombre')}>
                                            <div className="flex items-center gap-2">
                                                Producto {sortConfig.key === 'Nombre' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-5 text-left cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => handleSort('Precio_Unitario')}>
                                            <div className="flex items-center gap-2">
                                                Valores {sortConfig.key === 'Precio_Unitario' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-5 text-center cursor-pointer hover:text-amber-500 transition-colors" onClick={() => handleSort('margin')}>
                                            <div className="flex items-center justify-center gap-2">
                                                Margen {sortConfig.key === 'margin' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-5 text-center cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort('Stock_Actual')}>
                                            <div className="flex items-center justify-center gap-2">
                                                Stock {sortConfig.key === 'Stock_Actual' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                            </div>
                                        </th>
                                        {!isMassEditing && <th className="px-6 py-5 text-center">Acciones</th>}
                                    </tr>
                                </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                <AnimatePresence>
                                    {(isMassEditing ? editedProducts : filteredProducts).map((product: any, idx: number) => (
                                        <tr key={product.ID_Producto} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors hidden lg:table-row">
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
                        
                        {/* Vista de lista optimizada para móvil (visible solo en MD e inferiores) */}
                        <div className="flex flex-col lg:hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                           <AnimatePresence>
                                {filteredProducts.map((product: any, idx: number) => (
                                    <MobileProductCard 
                                        key={product.ID_Producto} 
                                        product={product} 
                                        onEdit={openEditDrawer} 
                                    />
                                ))}
                           </AnimatePresence>
                        </div>
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
                        saving={isSyncing}
                        drawerMode={drawerMode}
                        categories={categories}
                    />
                )}
            </AnimatePresence>

            {/* BOTÓN FLOTANTE MÓVIL (FAB) */}
            <AnimatePresence>
                {!isDrawerOpen && (
                    <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="fixed bottom-24 right-5 z-[100] lg:hidden"
                    >
                        <motion.button
                            layoutId="fab-modal"
                            whileTap={{ scale: 0.9 }}
                            onClick={openCreateDrawer}
                            className="w-16 h-16 bg-indigo-500 text-white rounded-[24px] flex items-center justify-center shadow-2xl shadow-indigo-500/40 border-4 border-white dark:border-slate-950"
                        >
                            <Plus size={32} strokeWidth={3} />
                        </motion.button>
                    </motion.div>
                )}
                {/* Hidden Quick Pic Input */}
                <input 
                    type="file" 
                    ref={quickImageFileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleQuickImageFileChange} 
                />
            </AnimatePresence>
        </div>
    );
}

// --- SUBCOMPONENTE MODAL DE IMPORTACIÓN ---
function ImportModal({ onClose, preview, onConfirm, onDelete, importing }: any) {
    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-slate-950/60 z-[200] backdrop-blur-md"
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="fixed inset-4 md:inset-20 bg-white dark:bg-slate-900 z-[210] rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
            >
                {/* Header Modal */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Upload size={20} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Previsualización de Importación</h2>
                        </div>
                        <p className="text-slate-500 text-xs mt-1 font-medium italic">Revisa los datos antes de impactar en la base de datos de producción.</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center hover:bg-rose-500 hover:text-white rounded-2xl transition-all group active:scale-90">
                        <X size={20} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>

                {/* Contenido / Tabla de Preview */}
                <div className="flex-1 overflow-auto p-4 md:p-8 custom-scroll bg-slate-50 dark:bg-slate-950/20">
                    {preview.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-6 p-20 text-center">
                            <div className="w-24 h-24 rounded-[40px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300">
                                <FileSpreadsheet size={48} strokeWidth={1} />
                            </div>
                            <div className="max-w-md mx-auto space-y-4">
                                <h3 className="text-xl font-black text-slate-800 dark:text-white">Instrucciones de Importación</h3>
                                <div className="text-slate-500 text-sm space-y-2 text-left bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm leading-relaxed font-medium">
                                    <p className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                                        El archivo debe ser un <b>.CSV</b> separado por punto y coma (;) o comas (,).
                                    </p>
                                    <p className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                                        Columnas requeridas: <b>ID_Producto</b>, <b>Nombre</b>, <b>Categoria</b>, <b>Precio_Unitario</b>, <b>Stock_Actual</b>.
                                    </p>
                                    <p className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                                        Si el <b>ID_Producto</b> ya existe, el producto se actualizará. Si no, se creará uno nuevo.
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => (window as any).triggerImportFile?.()}
                                className="px-10 py-5 bg-indigo-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-3"
                            >
                                <FileSpreadsheet size={18} />
                                Seleccionar Archivo CSV Ahora
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-xl p-0 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">Producto</th>
                                        <th className="px-6 py-4 uppercase">Categoría</th>
                                        <th className="px-6 py-4 text-right">Precio</th>
                                        <th className="px-6 py-4 text-center">Stock</th>
                                        <th className="px-6 py-4 text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-50 dark:divide-slate-800">
                                    {preview.map((item: any, idx: number) => (
                                        <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-800 dark:text-white">{item.Nombre}</span>
                                                    <span className="text-[9px] font-mono text-slate-400">SKU: {item.ID_Producto}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{item.Categoria}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="text-sm font-black text-emerald-600">${item.Precio_Unitario}</span>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-300">{item.Stock_Actual} u</span>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <button onClick={() => onDelete(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Modal */}
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950/80 backdrop-blur-xl">
                    <div className="flex items-center gap-4 text-slate-400">
                        <FileSpreadsheet size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{preview.length} registros detectados</span>
                    </div>
                    
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-8 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                        >
                            Desechar Todo
                        </button>
                        <button
                            disabled={preview.length === 0 || importing}
                            onClick={onConfirm}
                            className="px-10 py-4 bg-indigo-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-40"
                        >
                            {importing ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} />}
                            {importing ? 'Syncing...' : 'Subir e Integrar en Cloud'}
                        </button>
                    </div>
                </div>

            </motion.div>
        </>
    );
}

// --- SUBCOMPONENTE: FILA DE EDICIÓN MASIVA ---
function MassEditRow({ product, onChange, categories }: any) {
    const margin = calculateProfitability(parseFloat(product.Precio_Unitario), parseFloat(product.Costo));
    const estimatedWeight = (parseFloat(product.Stock_Actual || 0) * parseFloat(product.Peso || 0)).toFixed(2);

    return (
        <>
            <td className="px-4 py-2 min-w-[300px] sticky left-0 z-10 bg-[var(--card)] group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">#{product.ID_Producto}</span>
                    <input
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
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

// --- SUBCOMPONENTE DE TARJETA ESTILO E-COMMERCE ---
function ProductCard({ product, idx, onEdit }: any) {
    const margin = calculateProfitability(parseFloat(product.Precio_Unitario), parseFloat(product.Costo));
    const isLowStock = parseFloat(product.Stock_Actual) <= 5;
    const isOutOfStock = parseFloat(product.Stock_Actual) <= 0;
    const [longPressActive, setLongPressActive] = useState(false);
    const timerRef = useRef<any>(null);

    const startPress = () => {
        timerRef.current = setTimeout(() => {
            setLongPressActive(true);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 600);
    };

    const endPress = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(idx * 0.02, 0.4) }}
            className="group relative bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden border-2 border-white dark:border-slate-800 shadow-2xl shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:-translate-y-1 transition-all duration-300 ring-1 ring-slate-100 dark:ring-white/5"
        >
            {/* Imagen del Producto */}
            <div 
                onPointerDown={startPress}
                onPointerUp={endPress}
                onContextMenu={(e) => { e.preventDefault(); setLongPressActive(true); }}
                className="relative aspect-[16/9] md:aspect-[16/7] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center p-3 cursor-pointer"
            >
                {product.Imagen_URL ? (
                    <img 
                        src={getImageUrl(product.Imagen_URL)} 
                        alt={product.Nombre} 
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" 
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <ImageIcon size={32} strokeWidth={1} className="text-slate-300" />
                        <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Click Largo para Foto</span>
                    </div>
                )}

                {/* Overlay de Carga Rápida (Se activa con long press) */}
                <AnimatePresence>
                    {longPressActive && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 z-20 flex flex-col items-center justify-center gap-4 backdrop-blur-sm"
                            onMouseLeave={() => setLongPressActive(false)}
                        >
                            <div className="flex gap-4">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); (window as any).handleQuickImageAction(product, 'camera'); setLongPressActive(false); }}
                                    className="w-12 h-12 rounded-2xl bg-indigo-500 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                                ><CameraIcon size={20} /></button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); (window as any).handleQuickImageAction(product, 'upload'); setLongPressActive(false); }}
                                    className="w-12 h-12 rounded-2xl bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                                ><Upload size={20} /></button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); (window as any).handleQuickImageAction(product, 'url'); setLongPressActive(false); }}
                                    className="w-12 h-12 rounded-2xl bg-amber-500 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                                ><LinkIcon size={20} /></button>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setLongPressActive(false); }}
                                className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                Cancelar
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Badges Flotantes */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {product.Es_Oferta && (
                        <div className="bg-rose-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 flex items-center gap-1.5">
                            <Zap size={10} fill="currentColor" /> Oferta
                        </div>
                    )}
                    {isLowStock && !isOutOfStock && (
                        <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">
                            Stock Bajo
                        </div>
                    )}
                    {product.Visible_Online !== false && (
                        <div className="bg-indigo-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center gap-1.5">
                            <Globe size={10} /> Online
                        </div>
                    )}
                    {isOutOfStock && (
                        <div className="bg-slate-800 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
                            Sin Stock
                        </div>
                    )}
                </div>

                {/* Acciones Rápidas (Overlay Táctil Optimizado) */}
                <div className="absolute inset-0 bg-transparent lg:bg-indigo-900/10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all flex items-center justify-center lg:items-center lg:justify-center gap-1.5 backdrop-blur-none lg:backdrop-blur-[2px]">
                    <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 p-1.5 rounded-2xl shadow-xl border border-white dark:border-slate-700 pointer-events-auto">
                        <button onClick={() => onEdit(product)} className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl flex items-center justify-center text-indigo-500 hover:scale-110 active:scale-95 transition-all">
                            <Edit3 size={16} />
                        </button>
                        <button onClick={() => (window as any).handleDuplicateProduct?.(product)} className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl flex items-center justify-center text-emerald-500 hover:scale-110 active:scale-95 transition-all" title="Duplicar">
                            <Copy size={16} />
                        </button>
                        <button onClick={() => (window as any).handleDeleteProduct?.(product.ID_Producto)} className="w-9 h-9 bg-rose-50 dark:bg-rose-900/10 rounded-xl flex items-center justify-center text-rose-500 hover:scale-110 active:scale-95 transition-all">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Info del Producto */}
            <div className="p-3">
                <div className="flex justify-between items-start mb-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{product.Categoria || "General"}</span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500 text-[8.5px] font-black uppercase">
                        <Percent size={9} /> {margin.toFixed(0)}%
                    </div>
                </div>
                <h4 className="text-[14px] font-black text-slate-800 dark:text-white mb-1 line-clamp-1 leading-tight">{product.Nombre}</h4>

                <div className="flex items-end justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col text-slate-900 dark:text-white">
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest leading-none">P. Online</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-lg font-black leading-none">${parseFloat(product.Precio_Unitario || 0).toLocaleString()}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">/{product.Unidad === 'Kg' ? 'Kg' : 'u'}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest leading-none">Stock</span>
                        <p className={`text-[13px] font-black mt-0.5 leading-none ${isLowStock ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
                            {parseFloat(product.Stock_Actual).toFixed(0)} <span className="text-[9px] opacity-60">{product.Unidad}</span>
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// --- SUBCOMPONENTE DE FILA (LISTA) MODERNIZADA ---
function ProductRow({ product, onEdit }: any) {
    const isLowStock = parseFloat(product.Stock_Actual) <= 5;
    const margin = calculateProfitability(parseFloat(product.Precio_Unitario), parseFloat(product.Costo));

    return (
        <>
            <td className="px-6 py-4 sticky left-0 z-10 bg-[var(--card)] group-hover:bg-slate-50 dark:group-hover:bg-slate-900 transition-colors border-r border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 overflow-hidden shrink-0 flex items-center justify-center p-1 group-hover:scale-110 transition-transform">
                        {product.Imagen_URL ? (
                            <img src={getImageUrl(product.Imagen_URL)} className="w-full h-full object-contain" />
                        ) : (
                            <ImageIcon size={18} className="text-slate-300" />
                        )}
                    </div>
                    <div>
                        <p className="font-black text-sm text-slate-800 dark:text-white truncate max-w-[200px]">{product.Nombre}</p>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/10 px-2 py-0.5 rounded-lg">{product.Categoria || "S/C"}</span>
                           <span className="text-[8px] font-bold text-slate-400">SKU: {product.ID_Producto}</span>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono">${parseFloat(product.Precio_Unitario).toLocaleString()}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Costo: ${product.Costo}</span>
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${margin >= 30 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                    margin >= 15 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        'bg-rose-500/10 border-rose-500/20 text-rose-500'
                    }`}>
                    <span className="text-[10px] font-black uppercase tracking-tight">{margin.toFixed(0)}%</span>
                </div>
            </td>
            <td className="px-6 py-4">
               <div className="flex flex-col items-center">
                    <div className={`text-sm font-black ${isLowStock ? 'text-rose-500' : 'text-slate-700 dark:text-white'}`}>
                        {parseFloat(product.Stock_Actual).toFixed(0)} <span className="text-[10px] opacity-40 uppercase">{product.Unidad}</span>
                    </div>
                    {isLowStock && <div className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-0.5">Reponer</div>}
               </div>
            </td>
            <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => onEdit(product)} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all shadow-sm active:scale-95"><Edit3 size={16} /></button>
                    <button onClick={() => (window as any).handleDuplicateProduct?.(product)} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all shadow-sm active:scale-95"><Copy size={16} /></button>
                    <button onClick={() => (window as any).handleDeleteProduct?.(product.ID_Producto)} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all shadow-sm active:scale-95"><Trash2 size={16} /></button>
                </div>
            </td>
        </>
    );
}

// --- NUEVO SUBCOMPONENTE: TARJETA LISTA MÓVIL (ULTRA OPTIMIZADA) ---
function MobileProductCard({ product, onEdit }: any) {
    const margin = calculateProfitability(parseFloat(product.Precio_Unitario), parseFloat(product.Costo));
    const isLowStock = parseFloat(product.Stock_Actual) <= 5;
    const isOutOfStock = parseFloat(product.Stock_Actual) <= 0;
    const [longPressActive, setLongPressActive] = useState(false);
    const timerRef = useRef<any>(null);

    const startPress = () => {
        timerRef.current = setTimeout(() => {
            setLongPressActive(true);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 600);
    };

    const endPress = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onPointerDown={startPress}
            onPointerUp={endPress}
            onContextMenu={(e) => { e.preventDefault(); setLongPressActive(true); }}
            className="p-2 relative flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all active:scale-[0.98] border-b border-slate-100/50 dark:border-slate-800/50 border-2 border-white dark:border-slate-800/20 rounded-2xl mb-1 shadow-sm"
            onClick={() => onEdit(product)}
        >
            {/* Overlay de Imagen para Móvil */}
            <AnimatePresence>
                {longPressActive && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 z-30 flex items-center justify-around px-4 backdrop-blur-md rounded-2xl"
                        onClick={(e) => { e.stopPropagation(); }}
                    >
                        <button 
                            onClick={(e) => { e.stopPropagation(); (window as any).handleQuickImageAction(product, 'camera'); setLongPressActive(false); }}
                            className="flex flex-col items-center gap-1 text-indigo-500 hover:scale-110 transition-transform"
                        ><CameraIcon size={20} /><span className="text-[8px] font-black uppercase">Foto</span></button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); (window as any).handleQuickImageAction(product, 'upload'); setLongPressActive(false); }}
                            className="flex flex-col items-center gap-1 text-emerald-500 hover:scale-110 transition-transform"
                        ><Upload size={20} /><span className="text-[8px] font-black uppercase">Subir</span></button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); (window as any).handleQuickImageAction(product, 'url'); setLongPressActive(false); }}
                            className="flex flex-col items-center gap-1 text-amber-500 hover:scale-110 transition-transform"
                        ><LinkIcon size={20} /><span className="text-[8px] font-black uppercase">URL</span></button>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1" />
                        <button onClick={(e) => { e.stopPropagation(); setLongPressActive(false); }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X size={20} /></button>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shrink-0 overflow-hidden flex items-center justify-center shadow-inner">
                    {product.Imagen_URL ? (
                        <img src={getImageUrl(product.Imagen_URL)} className="w-full h-full object-contain" alt="" />
                    ) : (
                        <div className="flex gap-1">
                            <CameraIcon size={12} className="text-indigo-400" />
                            <Upload size={12} className="text-emerald-400" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-[12.5px] font-black text-slate-800 dark:text-white truncate leading-none uppercase tracking-tight">{product.Nombre}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[7.5px] font-black text-indigo-500 uppercase tracking-widest leading-none">{product.Categoria || 'S/C'}</span>
                        <div className={`px-1.5 py-0.5 rounded-md text-[8px] font-black leading-none ${isLowStock ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            {parseFloat(product.Stock_Actual).toFixed(0)} {product.Unidad}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <div className="text-right flex flex-col items-end">
                    <p className="text-xs font-black text-slate-900 dark:text-white leading-none">$ {parseFloat(product.Precio_Unitario).toLocaleString()}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${margin >= 20 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="text-[8px] font-bold text-slate-400 leading-none">{margin.toFixed(0)}% Util.</span>
                    </div>
                </div>
                
                <div className="flex items-center bg-slate-50 dark:bg-slate-800/40 p-1 rounded-xl ml-1 border border-slate-100/50 dark:border-slate-800/50">
                    <button 
                        onClick={(e) => { e.stopPropagation(); (window as any).handleDuplicateProduct?.(product); }}
                        className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                    >
                        <Copy size={13} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); (window as any).handleDeleteProduct?.(product.ID_Producto); }}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// --- SUBCOMPONENTE DRAWER ---
function ProductDrawer({ onClose, formData, setFormData, onSave, saving, drawerMode, categories }: any) {
    const currentMargin = calculateProfitability(parseFloat(formData.Precio_Unitario || 0), parseFloat(formData.Costo || 0));
    const profit = (parseFloat(formData.Precio_Unitario || 0) - parseFloat(formData.Costo || 0));
    const estimatedStockWeight = (parseFloat(formData.Stock_Actual || 0) * parseFloat(formData.Peso_Promedio || 0)).toFixed(2);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const aiFileInputRef = useRef<HTMLInputElement>(null);

    const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsAnalyzing(true);

            // 1. Convert to Base64 for Gemini
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
            const base64Image = await base64Promise;

            // 2. Scan with Gemini (Parallel with upload)
            const analysisPromise = analyzeProductImage(base64Image);
            
            // 3. Upload to Firebase Storage
            const uploadPromise = wandaApi.uploadImage(file, `products/${Date.now()}_${file.name}`);

            const [analysis, imageUrl] = await Promise.all([analysisPromise, uploadPromise]);

            // 4. Update Form Data
            setFormData((prev: any) => ({
                ...prev,
                Nombre: analysis.nombre || prev.Nombre,
                Categoria: analysis.categoria || prev.Categoria,
                Costo: analysis.precio_costo || prev.Costo,
                Precio_Unitario: analysis.precio_venta || prev.Precio_Unitario,
                Imagen_URL: imageUrl || prev.Imagen_URL,
                Unidad: analysis.unidad && analysis.unidad.toLowerCase().includes('kg') ? 'Kg' : (prev.Unidad || 'Unid'),
                Descripcion: analysis.descripcion || prev.Descripcion
            }));

            alert("Producto analizado con éxito por IA.");
        } catch (err: any) {
            console.error("AI Analysis Error:", err);
            alert("Error al analizar la imagen: " + err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

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
                layoutId={drawerMode === 'create' ? 'fab-modal' : undefined}
                initial={drawerMode === 'create' ? false : { x: "100%" }}
                animate={{ x: 0 }}
                exit={drawerMode === 'create' ? { opacity: 0 } : { x: "100%" }}
                transition={{ 
                    duration: 0.5, 
                    ease: [0.2, 0.0, 0, 1.0], // MD3 Standard Easing
                }}
                className={`
                    fixed z-[120] bg-[var(--card)] shadow-2xl flex flex-col overflow-hidden
                    ${drawerMode === 'create' 
                        ? 'inset-0 sm:inset-6 md:inset-auto md:right-10 md:top-10 md:bottom-10 md:w-[600px] border-2 border-[var(--border)] rounded-[28px] sm:rounded-[32px]' 
                        : 'right-0 top-0 h-full w-full max-w-xl border-l border-[var(--border)] rounded-none'
                    }
                `}
            >
                {/* AI File Input Oculto */}
                <input 
                    type="file" 
                    ref={aiFileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleImageScan} 
                />

                {/* Header Premium */}
                <div className="p-8 border-b border-[var(--border)] bg-white/50 dark:bg-slate-900/50 flex items-center justify-between sticky top-0 z-[130] backdrop-blur-xl rounded-t-[32px]">
                    <div className="flex items-center gap-6">
                        <div 
                            onClick={() => aiFileInputRef.current?.click()}
                            className="w-20 h-20 rounded-[32px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20 group relative overflow-hidden cursor-pointer"
                        >
                            {isAnalyzing ? (
                                <motion.div 
                                    className="absolute inset-0 bg-indigo-500 flex flex-col items-center justify-center gap-1"
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }}
                                >
                                    <Loader2 className="animate-spin" size={24} />
                                    <span className="text-[8px] font-black uppercase">IA...</span>
                                </motion.div>
                            ) : formData.Imagen_URL ? (
                                <img src={getImageUrl(formData.Imagen_URL)} className="w-full h-full object-cover p-1.5 rounded-[32px] group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <div className="flex flex-col items-center gap-1">
                                    <Plus size={24} strokeWidth={2.5} />
                                    <ImageIcon size={14} className="opacity-60" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Zap size={20} className="text-white fill-white" />
                            </div>
                        </div>
                        
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="font-black text-3xl tracking-tight text-slate-800 dark:text-white leading-none">
                                    {drawerMode === 'edit' ? 'Edición Maestro' : 'Nuevo Producto'}
                                </h3>
                                <button
                                    onClick={() => aiFileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                                >
                                    <Zap size={10} fill="currentColor" /> Scan con IA
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-3">
                                <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] text-slate-500 uppercase font-black tracking-widest border border-slate-200/50 dark:border-slate-700/50">
                                    SKU: {formData.ID_Producto || 'AUTO-ID'}
                                </span>
                                {formData.Stock_Actual > 0 ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-emerald-600 uppercase">En Existencias</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/5 rounded-xl border border-rose-500/10">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-rose-600 uppercase">Sin Stock</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/50 hover:bg-rose-500 hover:text-white rounded-[20px] transition-all group active:scale-95 border border-slate-200/50 dark:border-slate-700/50"
                    >
                        <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Contenido Seccionado */}
                <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scroll pb-40">
                    
                    {/* SECCIÓN 1: IDENTIFICACIÓN Y CATEGORÍA */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                        <div className="md:col-span-12 space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] ml-1">Descripción del Producto</label>
                                <input
                                    type="text"
                                    value={formData.Nombre}
                                    onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                                    placeholder="Nombre oficial del producto..."
                                    className="w-full text-4xl font-black bg-transparent border-none outline-none placeholder:text-slate-200 dark:placeholder:text-slate-800 focus:ring-0 text-slate-800 dark:text-white"
                                />
                                <div className="h-[2px] w-full bg-gradient-to-r from-indigo-500/50 to-transparent" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría Principal</label>
                                    <div className="relative group">
                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <input
                                            list="drawer-cats"
                                            value={formData.Categoria || ""}
                                            onChange={(e: any) => setFormData({ ...formData, Categoria: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-100 dark:border-slate-800 rounded-[20px] py-4 pl-12 pr-6 text-sm font-bold focus:border-indigo-500/30 outline-none transition-all"
                                        />
                                        <datalist id="drawer-cats">
                                            {categories.filter((c: any) => c !== 'ALL').map((c: any) => <option key={c} value={c} />)}
                                        </datalist>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidad Comercial</label>
                                    <div className="relative group">
                                        <ScaleIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <select
                                            value={formData.Unidad || "Unid"}
                                            onChange={(e) => setFormData({ ...formData, Unidad: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-100 dark:border-slate-800 rounded-[20px] py-4 pl-12 pr-6 text-sm font-bold focus:border-indigo-500/30 outline-none transition-all appearance-none"
                                        >
                                            <option value="Unid">Unidades (Piezas)</option>
                                            <option value="Kg">Peso (Kilogramos)</option>
                                            <option value="Pack">Pack / Bulto Cerrado</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: ECONOMÍA Y RENTABILIDAD */}
                    <div className="space-y-8">
                         <div className="flex items-center gap-4">
                            <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-[0.4em]">Finanzas & Márgenes</h4>
                            <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800" />
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 grid grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800/50">
                                <InputField
                                    label="Precio de Venta Final"
                                    value={formData.Precio_Unitario}
                                    type="number"
                                    onChange={(v: any) => setFormData({ ...formData, Precio_Unitario: v })}
                                    highlight
                                />
                                <InputField
                                    label="Costo de Compra"
                                    value={formData.Costo}
                                    type="number"
                                    onChange={(v: any) => {
                                        const cost = parseFloat(v) || 0;
                                        const margin = currentMargin / 100;
                                        const newPrice = cost * (1 + margin);
                                        setFormData({ ...formData, Costo: v, Precio_Unitario: cost > 0 ? newPrice.toFixed(2) : formData.Precio_Unitario });
                                    }}
                                />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recargo (% Markup)</label>
                                    <div className="relative">
                                        <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                                        <input
                                            type="number"
                                            value={currentMargin.toFixed(1)}
                                            onChange={(e) => {
                                                const m = parseFloat(e.target.value) || 0;
                                                const cost = parseFloat(formData.Costo || 0);
                                                const newPrice = cost * (1 + m/100);
                                                setFormData({ ...formData, Precio_Unitario: newPrice.toFixed(2) });
                                            }}
                                            className="w-full bg-emerald-500/5 border-2 border-emerald-500/20 rounded-[20px] py-3.5 pl-12 pr-6 text-sm font-black text-emerald-600 outline-none"
                                        />
                                    </div>
                                </div>
                                <InputField
                                    label="Unidades por Bulto"
                                    value={formData.Unidades_Bulto}
                                    type="number"
                                    onChange={(v: any) => setFormData({ ...formData, Unidades_Bulto: v })}
                                />
                            </div>

                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-500/20 flex flex-col justify-between overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <TrendingUp size={100} />
                                </div>
                                <div className="relative">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Ganancia Est. x Unidad</p>
                                    <p className="text-5xl font-black">${profit.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
                                    <div className="mt-4 flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${currentMargin >= 25 ? 'bg-emerald-400/20 text-emerald-400' : 'bg-amber-400/20 text-amber-400'}`}>
                                            ROI: {currentMargin.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="relative mt-auto pt-6 border-t border-white/10">
                                    <p className="text-[9px] font-medium opacity-50 italic">Calculado sobre costo neto sin IVA ni logística.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: INVENTARIO Y LOGÍSTICA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-[0.4em]">Control de Stock</h4>
                            <div className="p-8 rounded-[32px] bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Existencias Actuales</p>
                                        <p className="text-4xl font-black mt-1 text-slate-800 dark:text-white">{formData.Stock_Actual} <span className="text-sm font-bold opacity-40">{formData.Unidad}</span></p>
                                    </div>
                                    <Box size={40} className="text-slate-200 dark:text-slate-800" />
                                </div>
                                <div className="space-y-4">
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="500" 
                                        value={formData.Stock_Actual} 
                                        onChange={(e) => setFormData({ ...formData, Stock_Actual: e.target.value })}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                                        <span>Agotado</span>
                                        <span>Bajo</span>
                                        <span>Óptimo</span>
                                        <span>Exceso</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-[0.4em]">Logística de Pesos</h4>
                            <div className="p-8 rounded-[32px] bg-amber-500/5 border border-amber-500/10 space-y-6">
                                <div className="flex items-start gap-4">
                                    <Weight className="text-amber-500 mt-1" size={24} />
                                    <div>
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Peso Promedio x Pieza</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <input
                                                type="number"
                                                step="0.001"
                                                value={formData.Peso_Promedio}
                                                onChange={(e) => setFormData({ ...formData, Peso_Promedio: e.target.value })}
                                                className="bg-transparent text-3xl font-black text-amber-700 dark:text-amber-400 w-24 border-b-2 border-amber-500/20 outline-none focus:border-amber-500 transition-all"
                                            />
                                            <span className="text-sm font-black text-amber-500/60 uppercase">KG</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-950/40 p-4 rounded-2xl flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carga Total Estimada</span>
                                    <span className="text-sm font-black text-slate-800 dark:text-white">{estimatedStockWeight} kg</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 4: MULTIMEDIA Y VISIBILIDAD */}
                    <div className="space-y-8">
                         <div className="flex items-center gap-4">
                            <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-[0.4em]">Identidad Visual</h4>
                            <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL de la Imagen (Web)</label>
                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                            <input
                                                type="text"
                                                value={formData.Imagen_URL}
                                                onChange={(e) => setFormData({ ...formData, Imagen_URL: e.target.value })}
                                                placeholder="https://..."
                                                className="w-full bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-100 dark:border-slate-800 rounded-[20px] py-4 pl-12 pr-6 text-sm font-bold focus:border-indigo-500 transition-all"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                const query = encodeURIComponent(`${formData.Nombre || ''} ${formData.Categoria || ''} wanda`);
                                                window.open(`https://www.google.com/search?q=${query}&tbm=isch`, '_blank');
                                            }}
                                            className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-[20px] hover:bg-slate-200 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                                        >
                                            <Search size={16} /> Buscar
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-6 p-6 rounded-[32px] bg-rose-500/5 border border-rose-500/10">
                                        <div className="flex-1">
                                            <p className="text-sm font-black text-slate-800 dark:text-white">En Oferta</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Priorizar en carrusel</p>
                                        </div>
                                        <button
                                            onClick={() => setFormData({ ...formData, Es_Oferta: !formData.Es_Oferta })}
                                            className={`w-14 h-8 rounded-full transition-all relative ${formData.Es_Oferta ? 'bg-rose-500 shadow-lg shadow-rose-500/30' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${formData.Es_Oferta ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-6 p-6 rounded-[32px] bg-indigo-500/5 border border-indigo-500/10">
                                        <div className="flex-1">
                                            <p className="text-sm font-black text-slate-800 dark:text-white">Visible Online</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Mostrar en Tienda</p>
                                        </div>
                                        <button
                                            onClick={() => setFormData({ ...formData, Visible_Online: !formData.Visible_Online })}
                                            className={`w-14 h-8 rounded-full transition-all relative ${formData.Visible_Online !== false ? 'bg-indigo-500 shadow-lg shadow-indigo-500/30' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${formData.Visible_Online !== false ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-900 rounded-[40px] overflow-hidden min-h-[280px] group relative">
                                {formData.Imagen_URL ? (
                                    <>
                                        <img 
                                            src={getImageUrl(formData.Imagen_URL)} 
                                            className="w-full h-full object-contain p-8 group-hover:scale-105 transition-transform duration-700" 
                                            onError={(e: any) => { (e.target as any).src = 'https://placehold.co/400x400?text=No+Imagen'; }}
                                        />
                                        <button 
                                            onClick={() => setFormData({ ...formData, Imagen_URL: '' })}
                                            className="absolute top-6 right-6 p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl text-rose-500 shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 text-slate-300">
                                        <ImageIcon size={60} strokeWidth={1} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Sin Visualización</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Acción Flotante */}
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky bottom-0 z-10 flex gap-6">
                    <button
                        onClick={onClose}
                        className="px-8 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        Descartar
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="flex-1 py-5 bg-indigo-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/40 disabled:opacity-50 group"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} className="group-hover:scale-110 transition-transform" />}
                        {saving ? 'Procesando...' : 'Guardar Ficha Técnica'}
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

