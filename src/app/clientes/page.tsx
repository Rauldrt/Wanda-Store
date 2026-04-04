'use client';

import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import {
    Users,
    Search,
    Plus,
    MapPin,
    Phone,
    Mail,
    MoreVertical,
    Edit3,
    Trash2,
    MessageSquare,
    ChevronRight,
    Map as MapIcon,
    List,
    Filter,
    X,
    Save,
    Loader2,
    Building2,
    Calendar,
    ArrowUpRight,
    Info,
    ExternalLink,
    MapPinned,
    Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from "@/context/DataContext";
import { wandaApi } from "@/lib/api";
import { printOrders } from "@/lib/pdfUtils";
import ClientMapView, { getClientCoordinates } from '@/components/ClientMapView';

// --- UTIL: BÚSQUEDA FLEXIBLE ---
const normalizeText = (text: string) =>
    String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const smartSearch = (text: string, query: string) => {
    if (!query) return true;
    const normText = normalizeText(text);
    const terms = normalizeText(query).split(/\s+/).filter(t => t.length > 0);
    return terms.every(t => normText.includes(t));
};

export default function ClientesPage() {
    const { data, refreshData, setIsSyncing, isSyncing } = useData();
    const clients = data?.clients || [];
    const orders = data?.orders || [];
    const clientRequests = data?.client_requests || [];

    // Estados principales
    const [searchTerm, setSearchTerm] = useState("");
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const [viewMode, setViewMode] = useState<'list' | 'grid' | 'map'>('list');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});

    const [visibleCount, setVisibleCount] = useState(50);

    // Filtros
    const [activeFilter, setActiveFilter] = useState<'all' | 'no_gps' | 'requests'>('all');

    useEffect(() => {
        setVisibleCount(50);
    }, [deferredSearchTerm, activeFilter]);

    // Filtrado de clientes
    const filteredClients = useMemo(() => {
        if (activeFilter === 'requests') return clientRequests;

        return clients.filter((c: any) => {
            const searchPayload = `${c.Nombre_Negocio} ${c.ID_Cliente} ${c.Direccion} ${c.Zona} ${c.Contacto}`;
            const matchesSearch = smartSearch(searchPayload, deferredSearchTerm);

            if (activeFilter === 'no_gps') {
                const hasCoordinates = getClientCoordinates(c) !== null;
                return matchesSearch && !hasCoordinates;
            }
            return matchesSearch;
        });
    }, [clients, clientRequests, deferredSearchTerm, activeFilter]);

    // Estadísticas
    const stats = {
        total: clients.length,
        withGps: clients.filter((c: any) => getClientCoordinates(c) !== null).length,
        active: new Set(orders.map((o: any) => o.cliente_id)).size
    };

    const handleOpenDrawer = (client: any, mode: 'view' | 'edit' | 'create') => {
        setDrawerMode(mode);
        setSelectedClient(client);
        setFormData(mode === 'create' ? {
            ID_Cliente: 'Auto',
            Nombre_Negocio: '',
            Contacto: '',
            Direccion: '',
            Telefono: '',
            Email: '',
            Zona: '',
            Coordenadas_GPS: ''
        } : { ...client });
        setIsDrawerOpen(true);
    };

    const handleSave = async (data: any) => {
        try {
            setIsSyncing(true);
            const res = await wandaApi.saveClient(data);
            if (res.error) throw new Error(res.error);

            await refreshData(true);
            setIsDrawerOpen(false);
            alert("Cliente guardado correctamente");
        } catch (err: any) {
            alert("Error al guardar cliente: " + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleApproveRequest = async (request: any) => {
        try {
            setIsSyncing(true);
            const { id, ...clientData } = request;
            const res = await wandaApi.approveClientRequest(id, clientData);
            if (res.error) throw new Error(res.error);
            await refreshData(true);
            alert("Cliente aprobado y guardado correctamente.");
        } catch (err: any) {
            alert("Error al aprobar cliente: " + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDelete = async (id: string, isRequest = false) => {
        if (!confirm(`¿Estás seguro de eliminar esta ${isRequest ? 'solicitud' : 'cliente'}?`)) return;
        try {
            setIsSyncing(true);
            if (isRequest) {
                await wandaApi.rejectClientRequest(id);
            } else {
                await wandaApi.deleteClient(id);
            }
            await refreshData(true);
            if (selectedClient?.ID_Cliente === id || selectedClient?.id === id) setIsDrawerOpen(false);
        } catch (error) {
            alert("Error al eliminar");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="p-6 space-y-8 max-w-[1600px] mx-auto min-h-screen">
            {/* Cabecera y KPIs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner">
                            <Users size={20} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">Clientes</h2>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Gestiona tu cartera de clientes y rutas de preventa.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
                    <StatCard label="Total" value={stats.total} color="indigo" icon={<Users size={14} />} />
                    <StatCard label="Geoloc" value={stats.withGps} color="emerald" icon={<MapPin size={14} />} />
                    <StatCard label="Activos" value={stats.active} color="amber" icon={<ArrowUpRight size={14} />} />
                    <StatCard label="Solicitudes" value={clientRequests.length} color="rose" icon={<Info size={14} />} onClick={() => setActiveFilter('requests')} />
                </div>
            </div>

            {/* Controles y Búsqueda */}
            <div className="bg-[var(--card)] border border-[var(--border)] p-2 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, ID, dirección o zona..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-2xl text-sm font-bold focus:ring-2 ring-indigo-500/20 transition-all outline-none"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
                        <TabButton active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}>Todos</TabButton>
                        <TabButton active={activeFilter === 'no_gps'} onClick={() => setActiveFilter('no_gps')}>Sin GPS</TabButton>
                        <TabButton active={activeFilter === 'requests'} onClick={() => setActiveFilter('requests')}>
                            Solicitudes {clientRequests.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[8px]">{clientRequests.length}</span>}
                        </TabButton>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block" />

                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'text-slate-400'}`}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'map' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'text-slate-400'}`}
                        >
                            <MapPinned size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => handleOpenDrawer(null, 'create')}
                        className="bg-indigo-600 text-white p-3.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                        <Plus size={20} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* Listado de Clientes */}
            <div className="w-full">
                <AnimatePresence mode="popLayout">
                    {viewMode === 'map' ? (
                        <motion.div 
                            key="map-view" 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="col-span-full h-[70vh]"
                        >
                            <ClientMapView
                                clients={filteredClients}
                                onViewClient={(client) => handleOpenDrawer(client, 'view')}
                            />
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="list-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`grid gap-6 ${viewMode === 'list' ? 'grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-3'}`}
                        >
                            {filteredClients.slice(0, visibleCount).map((client: any) => (
                                <ClientCard
                                    key={client.id || client.ID_Cliente}
                                    client={client}
                                    isList={viewMode === 'list'}
                                    isRequest={activeFilter === 'requests'}
                                    onView={() => handleOpenDrawer(client, activeFilter === 'requests' ? 'edit' : 'view')}
                                    onEdit={() => handleOpenDrawer(client, 'edit')}
                                    onDelete={() => handleDelete(client.id || client.ID_Cliente, activeFilter === 'requests')}
                                    onApprove={() => handleApproveRequest(client)}
                                />
                            ))}
                            {filteredClients.length > visibleCount && (
                                <div className="col-span-full flex justify-center py-6">
                                    <button
                                        onClick={() => setVisibleCount(prev => prev + 50)}
                                        className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-200 transition-all active:scale-95"
                                    >
                                        Cargar más ({filteredClients.length - visibleCount} ocultos)
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* No resultados */}
            {filteredClients.length === 0 && (
                <div className="h-[40vh] flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Users size={32} />
                    </div>
                    <p className="font-bold text-sm">No se encontraron clientes que coincidan con tu búsqueda.</p>
                </div>
            )}

            {/* Drawer de ABM */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <ClientDrawer
                        mode={drawerMode}
                        data={formData}
                        setData={setFormData}
                        onClose={() => setIsDrawerOpen(false)}
                        onSave={handleSave}
                        saving={isSyncing}
                        onDelete={() => handleDelete(formData.ID_Cliente)}
                        onEdit={() => setDrawerMode('edit')}
                        clientOrders={orders.filter((o: any) => String(o.cliente_id) === String(formData.ID_Cliente) || String(o.id_cliente) === String(formData.ID_Cliente))}
                        products={data?.products}
                        config={data?.config}
                        sellers={data?.sellers}
                        allOrders={orders}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// --- SUBCOMPONENTES ---

function StatCard({ label, value, color, icon, onClick }: any) {
    const colors: any = {
        indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        rose: 'bg-rose-500/10 text-rose-600 border-rose-500/20'
    };

    return (
        <div
            onClick={onClick}
            className={`${colors[color]} border px-4 py-3 rounded-2xl flex flex-col ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
        >
            <div className="flex items-center gap-2 opacity-60 mb-1">
                {icon}
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-xl font-black">{value}</span>
        </div>
    );
}

function TabButton({ children, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-1.5 text-[11px] font-black uppercase tracking-tight rounded-lg transition-all ${active ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'text-slate-400'}`}
        >
            {children}
        </button>
    );
}

function ClientCard({ client, onView, onEdit, onDelete, isList, isRequest, onApprove }: any) {
    if (isList) {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 hover:shadow-lg hover:shadow-indigo-500/5 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 flex-shrink-0">
                        <Building2 size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-500 transition-all">
                            {client.Nombre_Negocio}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="font-mono font-bold uppercase">ID: {client.ID_Cliente || client.id}</span>
                            {(client.CUIT || client.CUIT_DNI) && <span>• CUIT: {client.CUIT || client.CUIT_DNI}</span>}
                            <span>•</span>
                            <span className="truncate italic">{client.Direccion}</span>
                        </div>
                    </div>
                </div>

                <div className="hidden md:flex flex-col items-end px-4 border-l border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{client.Zona || 'SIN ZONA'}</span>
                    <span className="text-[10px] font-bold text-slate-500">{client.Telefono || 'Sin Tel.'}</span>
                </div>

                <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-auto sm:ml-0">
                    {client.origen && <span className="text-[8px] font-black uppercase bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-lg">{client.origen}</span>}
                    {getClientCoordinates(client) !== null && <MapPinned size={16} className="text-emerald-500" />}

                    {isRequest ? (
                        <div className="flex gap-2">
                            <button onClick={onDelete} className="p-3 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl text-rose-500 transition-all active:scale-95">
                                <Trash2 size={18} />
                            </button>
                            <button onClick={onApprove} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95">
                                Aceptar
                            </button>
                        </div>
                    ) : (
                        <button onClick={onView} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-500 transition-all active:scale-95 shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900/50 sm:bg-transparent sm:border-transparent">
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-6 hover:shadow-xl hover:shadow-indigo-500/5 transition-all relative overflow-hidden"
        >
            {/* Indicador de Zona */}
            <div className="absolute top-0 right-0 px-6 py-8">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-[var(--border)]">
                    {client.Zona || 'SIN ZONA'}
                </span>
            </div>

            <div className="flex flex-col h-full">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 line-clamp-1 leading-tight group-hover:text-indigo-500 transition-colors">
                            {client.Nombre_Negocio}
                        </h3>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-tighter">ID: {client.ID_Cliente || client.id}</p>
                            {(client.CUIT || client.CUIT_DNI) && <><span className="text-slate-300 dark:text-slate-700">•</span><p className="text-[10px] font-mono font-bold text-slate-400">CUIT: {client.CUIT || client.CUIT_DNI}</p></>}
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">{client.Contacto || 'Sin Titular'}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                        <MapPin size={14} className="flex-shrink-0 text-indigo-500" />
                        <span className="text-xs font-medium line-clamp-1 italic">{client.Direccion}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                        <Phone size={14} className="flex-shrink-0 text-emerald-500" />
                        <span className="text-xs font-bold tracking-tight">{client.Telefono || 'Sin teléfono'}</span>
                    </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex gap-2">
                        {getClientCoordinates(client) !== null && (
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center" title="GPS Disponible">
                                <MapPinned size={16} />
                            </div>
                        )}
                        {client.Categoria && (
                            <div className="px-2 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-[8px] font-black uppercase" title="Categoría">
                                {client.Categoria}
                            </div>
                        )}
                        {client.origen && (
                            <div className="px-2 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[8px] font-black uppercase" title="Origen">
                                {client.origen}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {isRequest ? (
                            <>
                                <button
                                    onClick={onDelete}
                                    className="p-2.5 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button
                                    onClick={onApprove}
                                    className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95"
                                >
                                    Aceptar
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onEdit}
                                    className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-all"
                                >
                                    <Edit3 size={16} />
                                </button>
                                <button
                                    onClick={onView}
                                    className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    Ficha
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function ClientDrawer({ mode, data, setData, onClose, onSave, saving, onDelete, onEdit, clientOrders = [], products = [], config = {}, sellers = [], allOrders = [] }: any) {
    const isEditing = mode === 'edit' || mode === 'create';
    const [showOrders, setShowOrders] = useState(false);
    const [orderFilter, setOrderFilter] = useState('');

    const filteredOrders = useMemo(() => {
        if (!orderFilter) return clientOrders;
        const q = orderFilter.toLowerCase();
        return clientOrders.filter((o: any) => (o.fecha || '').includes(q) || (o.id || '').toLowerCase().includes(q));
    }, [clientOrders, orderFilter]);

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 h-full w-full max-w-xl bg-[var(--card)] z-[110] shadow-2xl flex flex-col border-l border-[var(--border)]"
            >
                {/* Header */}
                <div className="p-6 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--card)]/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${isEditing ? 'bg-indigo-600' : 'bg-slate-800'} shadow-lg`}>
                            {mode === 'create' ? <Plus size={24} /> : mode === 'edit' ? <Edit3 size={24} /> : <Users size={24} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black">
                                {mode === 'create' ? 'Nuevo Cliente' : mode === 'edit' ? 'Editar Ficha' : data.Nombre_Negocio}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                    ID: {data.ID_Cliente || data.id || 'NUEVO'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"><X size={24} /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scroll pb-32">
                    {/* Sección Principal */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-indigo-500">
                            <Info size={16} />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Información General</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <InputField
                                label="Nombre del Negocio / Cliente"
                                value={data.Nombre_Negocio}
                                onChange={(v: any) => setData({ ...data, Nombre_Negocio: v })}
                                readOnly={!isEditing}
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField
                                    label="Nombre de Contacto (Titular)"
                                    value={data.Contacto}
                                    onChange={(v: any) => setData({ ...data, Contacto: v })}
                                    readOnly={!isEditing}
                                />
                                <InputField
                                    label="Zona de Reparto"
                                    value={data.Zona}
                                    onChange={(v: any) => setData({ ...data, Zona: v })}
                                    readOnly={!isEditing}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Preventista Asignado
                                    </label>
                                    {!isEditing ? (
                                        <div className="w-full bg-slate-50/50 dark:bg-slate-950 border border-transparent rounded-2xl py-3.5 px-5 text-sm font-bold text-slate-800 dark:text-slate-100">
                                            {data.Vendedor_Asignado || data.vendedor || 'Sin asignar'}
                                        </div>
                                    ) : (
                                        <select
                                            value={data.Vendedor_Asignado || data.vendedor || ''}
                                            onChange={(e) => setData({ ...data, Vendedor_Asignado: e.target.value })}
                                            className="w-full bg-white dark:bg-slate-950 border border-[var(--border)] rounded-2xl py-3.5 px-5 text-sm font-bold outline-none hover:border-slate-300 transition-all focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                                        >
                                            <option value="">Seleccionar preventista...</option>
                                            {(sellers || []).map((s: any) => (
                                                <option key={s.id || s.ID_Vendedor} value={s.Nombre || s.ID_Vendedor}>
                                                    {s.Nombre}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField
                                    label="CUIT / DNI"
                                    value={data.CUIT_DNI || data.CUIT}
                                    onChange={(v: any) => setData({ ...data, CUIT_DNI: v })}
                                    readOnly={!isEditing}
                                />
                                <InputField
                                    label="Categoría"
                                    value={data.Categoria}
                                    placeholder="Mayorista, Minorista, etc."
                                    onChange={(v: any) => setData({ ...data, Categoria: v })}
                                    readOnly={!isEditing}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Contacto y Ubicación */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-emerald-500">
                            <MapPin size={16} />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Contacto y Ubicación</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-[var(--border)]">
                            <InputField
                                label="Dirección Completa"
                                value={data.Direccion}
                                onChange={(v: any) => setData({ ...data, Direccion: v })}
                                readOnly={!isEditing}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField
                                    label="Teléfono / WhatsApp"
                                    value={data.Telefono}
                                    onChange={(v: any) => setData({ ...data, Telefono: v })}
                                    readOnly={!isEditing}
                                />
                                <InputField
                                    label="Email"
                                    value={data.Email}
                                    onChange={(v: any) => setData({ ...data, Email: v })}
                                    readOnly={!isEditing}
                                />
                            </div>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <InputField
                                        label="Coordenadas GPS (Lat, Lng)"
                                        value={data.Coordenadas_GPS}
                                        onChange={(v: any) => setData({ ...data, Coordenadas_GPS: v })}
                                        placeholder="-34.6037, -58.3816"
                                        readOnly={!isEditing}
                                    />
                                </div>
                                {isEditing && (
                                    <button
                                        onClick={() => {
                                            if (navigator.geolocation) {
                                                navigator.geolocation.getCurrentPosition((pos) => {
                                                    setData({ ...data, Coordenadas_GPS: `${pos.coords.latitude}, ${pos.coords.longitude}` });
                                                }, (err) => alert("Error al obtener ubicación: " + err.message));
                                            } else {
                                                alert("Geolocalización no soportada en este navegador.");
                                            }
                                        }}
                                        className="h-12 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700 mb-1"
                                    >
                                        📍 Mi Posición
                                    </button>
                                )}
                            </div>
                            {data.Coordenadas_GPS && (
                                <a
                                    href={`https://www.google.com/maps?q=${data.Coordenadas_GPS}`}
                                    target="_blank"
                                    className="flex items-center justify-center gap-2 py-3 bg-emerald-500/10 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                                >
                                    <ExternalLink size={14} /> Ver en Google Maps
                                </a>
                            )}
                        </div>
                    </section>

                    {!isEditing && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 text-amber-500">
                                <Calendar size={16} />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Acciones Rápidas</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button className="flex flex-col items-center justify-center p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl text-indigo-600 hover:bg-indigo-500/10 transition-all">
                                    <MessageSquare size={24} className="mb-2" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
                                </button>
                                <button onClick={() => setShowOrders(!showOrders)} className="flex flex-col items-center justify-center p-6 bg-slate-500/5 border border-slate-500/10 rounded-3xl text-slate-600 hover:bg-slate-500/10 transition-all">
                                    <BookCopy size={24} className="mb-2" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{showOrders ? 'Ocultar Pedidos' : 'Ver Pedidos'}</span>
                                </button>
                            </div>

                            {showOrders && (
                                <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-4">
                                    <div className="flex items-center justify-between mt-6 mb-4">
                                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Historial de Pedidos ({clientOrders.length})</h5>
                                        <div className="relative w-40">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                            <input 
                                                type="text" 
                                                placeholder="Filtrar fecha..." 
                                                value={orderFilter}
                                                onChange={(e) => setOrderFilter(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-[10px] font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                            />
                                        </div>
                                    </div>
                                    {filteredOrders.length === 0 ? (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-[var(--border)] text-center text-slate-400 text-xs text-balance">
                                            {orderFilter ? `No hay pedidos que coincidan con "${orderFilter}"` : "No hay pedidos registrados para este cliente."}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredOrders.slice(0, 10).map((order: any) => (
                                                <div key={order.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-[var(--border)] flex justify-between items-center group hover:border-indigo-500/50 transition-all">
                                                     <div className="flex-1">
                                                         <div className="flex items-center gap-2 mb-1">
                                                             <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Pedido #{order.id?.slice(-6)}</p>
                                                             {order.reparto && (
                                                                 <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[8px] font-black uppercase">
                                                                     Reparto: {order.reparto}
                                                                 </span>
                                                             )}
                                                         </div>
                                                         <p className="text-[10px] text-slate-500 uppercase">{order.fecha || 'Fecha desconocida'}</p>
                                                     </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <p className="font-black text-indigo-600 text-sm">${parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${order.estado === 'Entregado' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                                {order.estado || 'Pendiente'}
                                                            </p>
                                                        </div>
                                                        <button 
                                                            onClick={() => printOrders([order], config, products, allOrders)}
                                                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-500 transition-all active:scale-90"
                                                            title="Imprimir Remito"
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    )}
                </div>

                {/* Footer Drawer */}
                <div className="p-8 border-t border-[var(--border)] bg-[var(--card)] sticky bottom-0 z-10 flex gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
                    {!isEditing ? (
                        <>
                            <button
                                onClick={onDelete}
                                className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500/20 transition-all active:scale-95 border border-rose-500/20"
                                title="Eliminar Cliente"
                            >
                                <Trash2 size={24} />
                            </button>
                            <button
                                onClick={onEdit}
                                className="flex-1 py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Edit3 size={16} /> Editar Carpeta
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 border border-[var(--border)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all text-slate-600"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => onSave(data)}
                                disabled={saving}
                                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 active:scale-95"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                                {saving ? 'Guardando...' : 'Guardar Cliente'}
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </>
    );
}

function InputField({ label, value, onChange, placeholder = "", readOnly = false, required = false }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <input
                type="text"
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                readOnly={readOnly}
                className={`
                    w-full bg-white dark:bg-slate-950 border border-[var(--border)] rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all
                    focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 text-slate-800 dark:text-slate-100
                    ${readOnly ? 'bg-slate-50/50 cursor-default border-transparent' : 'hover:border-slate-300 dark:hover:border-slate-700'}
                `}
            />
        </div>
    );
}

// Iconos adicionales que me faltaron importar
function BookCopy(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2z" /><path d="M18 17H9" /><path d="M18 13H9" /><path d="M18 9H9" /><path d="M11 3a2 2 0 0 0-2 2v2" /><path d="M9 3a2 2 0 0 1 2 2v2" /><path d="M7 8v10" /><path d="M9 11v-4" /></svg>
    );
}
