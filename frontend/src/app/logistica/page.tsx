"use client";
// Deployment trigger: 2026-03-06

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Truck,
    Package,
    MapPin,
    ArrowRight,
    Plus,
    CheckCircle2,
    Printer,
    Trash2,
    ChevronRight,
    Info,
    X,
    LayoutGrid,
    List,
    Search,
    Filter,
    ArrowLeft,
    ChevronLeft,
    CheckCircle,
    PackageIcon,
    AlertCircle,
    User,
    Calendar,
    ChevronDown,
    ChevronUp,
    Clock,
    MessageCircle,
    Copy,
    Save,
    RotateCcw,
    Check,
    CreditCard,
    DollarSign,
    Loader2,
    Settings,
    Edit2,
    Minus,
    Layers,
    Eye,
    ShoppingCart,
    Tag,
    Scale,
    Box,
    Shield
} from "lucide-react";
import { wandaApi } from "@/lib/api";
import { useData } from "@/context/DataContext";
import { increment } from "firebase/firestore";

const printSettlement = (data: {
    reparto: string,
    chofer: string,
    fecha: string,
    id: string,
    efectivo: number,
    transf: number,
    gastosTotal: number,
    totalNeto: number,
    billetes: any,
    gastos: any[],
    ordenes: any[],
    totalDevoluciones: number,
    balanceDiferencia: number,
    netoARendir: number,
    devoluciones?: any[],
    cuentasCorrientes?: any[],
    totalCuentasCorrientes?: number,
    transferenciasExtras?: any[],
    totalTransferenciasExtras?: number
}, mode: 'full' | 'audit' = 'full') => {
    const win = window.open('', '_blank');
    if (!win) return;

    const billRows = Object.entries(data.billetes || {}).map(([den, qty]) => {
        const amount = Number(den) * (qty as number);
        if (amount === 0) return '';
        return `<tr><td>$${den}</td><td>x${qty}</td><td style="text-align:right">$${amount.toLocaleString()}</td></tr>`;
    }).join('');

    const gastosRows = (data.gastos || []).map((g: any) => `
        <tr>
            <td>${g.desc || 'Gasto'}</td>
            <td style="text-align:right">$${(g.monto || 0).toLocaleString()}</td>
        </tr>
    `).join('');

    const orderRows = data.ordenes.map((o: any) => {
        const hasDiff = Math.abs((o.total_original || 0) - (o.total || 0)) > 1;
        return `
            <tr>
                <td>${o.cliente_nombre || o.id}</td>
                <td>${o.estado}</td>
                <td style="text-align:right">$${(o.efectivo || 0).toLocaleString()}</td>
                <td style="text-align:right">$${(o.transf || 0).toLocaleString()}</td>
                <td style="text-align:right; font-weight: 900; color: #4338ca;">$${(o.total || 0).toLocaleString()}</td>
                <td style="text-align:center; font-size: 8px; color: #ef4444; font-weight: 900;">${hasDiff ? 'VER DESCUENTO' : ''}</td>
            </tr>
        `;
    }).join('');

    const returnRows = (data.devoluciones || []).map((d: any) => `
        <tr>
            <td>${d.nombre || d.id_prod}</td>
            <td>${d.qty} ${d.formato || 'UNID'}</td>
            <td style="text-align:right">$${(d.precio || 0).toLocaleString()}</td>
            <td style="text-align:right">$${(d.subtotal || 0).toLocaleString()}</td>
        </tr>
    `).join('');

    const ccRows = (data.cuentasCorrientes || []).map((cc: any) => `
        <tr>
            <td>${cc.cliente}</td>
            <td># ${cc.orderId}</td>
            <td style="text-align:right">$${(cc.monto || 0).toLocaleString()}</td>
        </tr>
    `).join('');

    win.document.write(`
        <html>
            <head>
                <title>Liquidación - ${data.reparto}</title>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; padding: 20px; color: #1e293b; max-width: 1000px; margin: 0 auto; line-height: 1.4; }
                    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
                    h1 { font-size: 22px; font-weight: 950; margin: 0; text-transform: uppercase; color: #4338ca; letter-spacing: -0.5px; }
                    .meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #64748b; font-weight: 900; }
                    
                    .main-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 30px; margin-bottom: 30px; }
                    .column { display: flex; flex-direction: column; gap: 20px; }
                    
                    .card { background: #f8fafc; padding: 16px; border: 1px solid #e2e8f0; border-radius: 16px; }
                    .card-title { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1e293b; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
                    
                    .stat-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; font-weight: 800; }
                    .stat-val { font-family: monospace; }
                    .stat-total { border-top: 1px solid #cbd5e1; margin-top: 8px; padding-top: 8px; font-size: 15px; font-weight: 900; }
                    
                    .audit-card { 
                        background: #1e293b; color: white; padding: 18px; border-radius: 18px;
                        border: 3px solid ${Math.abs(data.balanceDiferencia) < 0.01 ? '#10b981' : (data.balanceDiferencia > 0 ? '#ef4444' : '#10b981')};
                        box-shadow: 0 15px 35px rgba(30, 41, 59, 0.2);
                    }
                    .audit-label-main { font-size: 11px; text-transform: uppercase; font-weight: 950; color: #818cf8; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; }
                    .audit-row { display: flex; justify-content: space-between; font-size: 13px; padding: 2px 0; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.05); }
                    .audit-main { font-size: 24px; font-weight: 950; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; border-top: 2px solid rgba(255,255,255,0.1); padding-top: 10px; }
                    .audit-status { font-size: 12px; font-weight: 950; letter-spacing: 1px; }

                    table { width: 100%; border-collapse: collapse; }
                    th { text-align: left; font-size: 9px; text-transform: uppercase; color: #64748b; padding: 8px 6px; border-bottom: 2px solid #e2e8f0; }
                    td { padding: 8px 6px; border-bottom: 1px solid #f1f5f9; font-size: 11px; font-weight: 800; color: #1e293b; }
                    
                    .proforma-tag { background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 6px; font-size: 10px; font-weight: 950; }
                    @media print { .no-print { display: none; } body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h1>Liquidación de Ruta ${mode === 'audit' ? '(Solo Auditoría)' : ''}</h1>
                        ${data.id.startsWith('PROFORMA') ? '<span class="proforma-tag">BORRADOR / PROFORMA</span>' : ''}
                    </div>
                    <div class="meta">
                        <span>REPARTO: ${data.reparto}</span>
                        <span>CHOFER: ${data.chofer || 'N/A'}</span>
                        <span>FECHA: ${data.fecha}</span>
                        <span>ID: ${data.id}</span>
                    </div>
                </div>

                <div class="main-layout">
                    <!-- Columna Izquierda: Desgloses -->
                    <div class="column">
                        <div class="card">
                            <div class="card-title">Desglose de Billetes</div>
                            <table>
                                <thead>
                                    <tr><th>Denom.</th><th>Cant.</th><th style="text-align:right">Subtotal</th></tr>
                                </thead>
                                <tbody>
                                    ${billRows || '<tr><td colspan="3" style="text-align:center">Sin efectivo</td></tr>'}
                                </tbody>
                            </table>
                        </div>

                        <div class="card">
                            <div class="card-title">Gastos Detallados</div>
                            <table>
                                <thead>
                                    <tr><th>Descripción</th><th style="text-align:right">Monto</th></tr>
                                </thead>
                                <tbody>
                                    ${gastosRows || '<tr><td colspan="2" style="text-align:center">Sin gastos</td></tr>'}
                                </tbody>
                            </table>
                        </div>

                        <div class="card">
                            <div class="card-title">Cuentas Corrientes (No Cobrado)</div>
                            <table>
                                <thead>
                                    <tr><th>Cliente</th><th>Boleta</th><th style="text-align:right">Monto</th></tr>
                                </thead>
                                <tbody>
                                    ${ccRows || '<tr><td colspan="3" style="text-align:center">Sin Cuentas Corrientes</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Columna Derecha: Auditoría Unificada -->
                    <div class="column">
                        <div class="audit-card">
                            <div class="audit-label-main">Auditoría de Liquidación</div>
                            
                            <div class="audit-row" style="color: #c7d2fe; font-size: 16px;">
                                <span>Neto a Rendir (Ventas)</span>
                                <span>$${(data.netoARendir || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>

                            <div style="padding-left: 15px; border-left: 3px solid rgba(255,255,255,0.1); margin: 6px 0; display: flex; flex-direction: column; gap: 0;">
                                <div class="audit-row" style="opacity: 0.9;">
                                    <span>(-) Total Devoluciones</span>
                                    <span>$${(data.totalDevoluciones || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="audit-row" style="opacity: 0.9;">
                                    <span>(-) Gastos de Ruta</span>
                                    <span>$${(data.gastosTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="audit-row" style="opacity: 0.9;">
                                    <span>(-) Cuentas Corrientes</span>
                                    <span>$${(data.totalCuentasCorrientes || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="audit-row" style="opacity: 0.9;">
                                    <span>(-) Efectivo (Desglose)</span>
                                    <span>$${data.efectivo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="audit-row" style="opacity: 0.9; margin-bottom: 0;">
                                    <span>(-) Transferencias</span>
                                    <span>$${data.transf.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div class="audit-main">
                                <div class="audit-status" style="color: ${Math.abs(data.balanceDiferencia) < 0.01 ? '#34d399' : (data.balanceDiferencia > 0 ? '#fb7185' : '#34d399')};">
                                    ${Math.abs(data.balanceDiferencia) < 0.01 ? 'BALANCEADO' : (data.balanceDiferencia < 0 ? 'SOBRANTE' : 'FALTANTE')}
                                </div>
                                <div style="color: ${Math.abs(data.balanceDiferencia) < 0.01 ? '#34d399' : (data.balanceDiferencia > 0 ? '#fb7185' : '#34d399')};">
                                    $${Math.abs(data.balanceDiferencia).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            
                            <div style="font-size: 10px; color: #94a3b8; margin-top: 20px; text-align: center; font-style: italic; font-weight: 700;">
                                Fórmula: (Neto a Rendir) - (Devoluciones + Gastos + CC + Efectivo + Transf)
                            </div>
                        </div>
                    </div>
                </div>

                ${mode === 'full' ? `
                <div style="font-size: 13px; font-weight: 950; text-transform: uppercase; margin: 40px 0 15px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                    Detalle de Pedidos (${data.ordenes.length})
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Cliente / ID</th>
                            <th>Estado</th>
                            <th style="text-align:right">Efectivo</th>
                            <th style="text-align:right">Transf.</th>
                            <th style="text-align:right">Rendido</th>
                            <th style="text-align:center">Obs.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orderRows}
                    </tbody>
                </table>
                ` : ''}

                ${(mode === 'audit' || mode === 'full') && (data.devoluciones && data.devoluciones.length > 0) ? `
                <div style="font-size: 13px; font-weight: 950; text-transform: uppercase; margin: 30px 0 15px; color: #b91c1c; border-bottom: 2px solid #fee2e2; padding-bottom: 8px;">
                    Detalle de Mercadería Devuelta / Rechazos (${data.devoluciones.length})
                </div>
                <table style="background: #fff5f5;">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th style="text-align:right">Precio</th>
                            <th style="text-align:right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${returnRows}
                    </tbody>
                </table>
                ` : ''}

                <div style="margin-top: 70px; display: flex; justify-content: space-between;">
                    <div style="border-top: 2px solid #1e293b; width: 220px; text-align: center; padding-top: 8px; font-size: 10px; font-weight: 950;">FIRMA CHOFER</div>
                    <div style="border-top: 2px solid #1e293b; width: 220px; text-align: center; padding-top: 8px; font-size: 10px; font-weight: 950;">FIRMA ADMINISTRACIÓN</div>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
        </html>
    `);
    win.document.close();
};

const normalizeText = (text: string) =>
    String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const smartSearch = (text: string, query: string) => {
    if (!query) return true;
    const normText = normalizeText(text);
    const terms = normalizeText(query).split(/\s+/).filter(t => t.length > 0);
    return terms.every(t => normText.includes(t));
};

export default function LogisticaPage() {
    const { data, loading, refreshData, setIsSyncing } = useData();
    const [activeTab, setActiveTab] = useState<'pendientes' | 'rutas' | 'historial' | 'comisiones' | 'resumenes'>('pendientes');
    const [selectedSettlementsSummary, setSelectedSettlementsSummary] = useState<string[]>([]);
    const [summarySearch, setSummarySearch] = useState("");
    const [commissionParams, setCommissionParams] = useState({
        pct_chofer: 1.5,
        fijo_entrega: 500,
        pct_preventista: 2.0
    });
    const [commsDateRange, setCommsDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const products: any[] = data?.products || [];
    const rawOrders: any[] = data?.orders || [];

    // Tratamiento especial para pesables: convertir piezas a Kg estimado si vienen en formato de unidades/piezas
    // Esto asegura que en logística ya trabajemos sobre pesaje estimado desde el inicio.
    const orders = useMemo(() => {
        if (!products.length || !rawOrders.length) return rawOrders;

        return rawOrders.map((order: any) => ({
            ...order,
            items: (order.items || []).map((it: any) => {
                const id = it.id_prod || it.id_producto || it.id;
                const product = products.find((p: any) => String(p.ID_Producto) === String(id));
                const isDetalleBulto = String(it.detalle || it.nombre || '').toUpperCase().includes('BULTO');
                const detectedFormat = (it._formato || it.formato || (isDetalleBulto ? 'BULTO' : '')).toUpperCase();

                // Normalización base del item para que el resto del código no falle
                const normalized = {
                    ...it,
                    id_prod: id,
                    _formato: detectedFormat || 'UNID'
                };

                if (!product) return normalized;

                const isKg = (product.Unidad || '').toLowerCase() === 'kg';
                if (!isKg) return normalized;

                const weightAvg = parseFloat(String(product.Peso || product.Peso_Promedio || "1").replace(',', '.'));
                const priceKg = parseFloat(String(product.Precio_Unitario || "0").replace(',', '.'));
                const itemPrice = parseFloat(String(it.precio || "0").replace(',', '.')) || 0;

                // Si el precio del item se parece más al precio por pieza (kg * peso) que al precio por kg,
                // entonces es porque viene del preventista en modo "pieza" y debemos normalizarlo a Kg para logística.
                const piecePrice = priceKg * weightAvg;
                const diffKg = Math.abs(itemPrice - priceKg);
                const diffPiece = Math.abs(itemPrice - piecePrice);

                if (diffPiece < diffKg || (itemPrice > priceKg * 1.5 && weightAvg > 1.1)) {
                    return {
                        ...normalized,
                        cantidad: (parseFloat(it.cantidad) || 0) * weightAvg,
                        precio: priceKg,
                        _formato: 'KG', // En logística trabajamos siempre sobre la unidad base (Kg)
                        _pesableTratado: true
                    };
                }
                return normalized;
            })
        }));
    }, [rawOrders, products]);

    const clients: any[] = data?.clients || [];
    const liquidaciones: any[] = data?.liquidaciones || [];

    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'grouped'>('grid');
    const [searchTerm, setSearchTerm] = useState("");
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };


    const [filterDate, setFilterDate] = useState("");
    const [filterSeller, setFilterSeller] = useState("");
    const [editingRoute, setEditingRoute] = useState<string | null>(null);
    const [settlingRoute, setSettlingRoute] = useState<string | null>(null);
    const [viewingOrdersRoute, setViewingOrdersRoute] = useState<string | null>(null);
    const [viewingDetailId, setViewingDetailId] = useState<string | null>(null);
    const [routeSearchTerm, setRouteSearchTerm] = useState("");
    const [routeViewMode, setRouteViewMode] = useState<'grid' | 'list'>('grid');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignRouteName, setAssignRouteName] = useState("");

    const allPendingOrders = useMemo(() => {
        return orders.filter(o => (o.estado === 'Pendiente' || o.estado === 'En Preparación' || !o.estado) && (!o.reparto || o.reparto === '' || o.reparto === 'null'));
    }, [orders]);

    const availableSellers = useMemo(() => {
        const set = new Set(allPendingOrders.map(o => o.vendedor).filter(Boolean));
        return Array.from(set).sort();
    }, [allPendingOrders]);

    const availableDates = useMemo(() => {
        const set = new Set(allPendingOrders.map(o => o.fecha).filter(Boolean));
        return Array.from(set).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [allPendingOrders]);

    const filteredPendingOrders = useMemo(() => {
        return allPendingOrders.filter(o => {
            const matchesSearch = !searchTerm ||
                o.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.direccion?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesDate = !filterDate || o.fecha === filterDate;
            const matchesSeller = !filterSeller || o.vendedor === filterSeller;

            return matchesSearch && matchesDate && matchesSeller;
        });
    }, [allPendingOrders, searchTerm, filterDate, filterSeller]);

    const routeInfo = useMemo(() => {
        // 1. Obtener todos los nombres de reparto únicos de órdenes activas
        const activeOrders = orders.filter(o => o.estado === 'Pendiente' || o.estado === 'En Preparación' || !o.estado);
        const activeRouteNames = Array.from(new Set(activeOrders.map(o => o.reparto).filter(r => r && r !== 'null' && r !== '')));

        // 2. Obtener todos los nombres de reparto únicos del historial
        const historicalRouteNames = Array.from(new Set(liquidaciones.map(l => l.REPARTO).filter(Boolean)));

        // 3. Crear una lista maestra ordenada de todos los repartos que han existido para asignar un número correlativo estable
        const allEverRoutes = Array.from(new Set([...activeRouteNames, ...historicalRouteNames])).sort();

        // 4. Construir el objeto de información para las rutas actualmente activas
        return allEverRoutes
            .filter(name => activeRouteNames.includes(name))
            .map(name => {
                const isReopened = historicalRouteNames.includes(name);
                const index = allEverRoutes.indexOf(name) + 1;
                return { name, index, isReopened };
            })
            .filter(route => !routeSearchTerm || smartSearch(route.name, routeSearchTerm));
    }, [orders, liquidaciones, routeSearchTerm]);

    const recentRoutes = useMemo(() => {
        const routeData: Record<string, { name: string, lastDate: string }> = {};
        orders.forEach(o => {
            if (o.reparto && o.reparto !== 'null' && o.reparto !== '') {
                // Normalizamos la fecha para comparar (ISO o simple string)
                const d = o.fecha || '';
                if (!routeData[o.reparto] || d > routeData[o.reparto].lastDate) {
                    routeData[o.reparto] = { name: o.reparto, lastDate: d };
                }
            }
        });
        return Object.values(routeData).sort((a, b) => b.lastDate.localeCompare(a.lastDate)).map(r => r.name);
    }, [orders]);

    const groupedPendingOrders = useMemo(() => {
        const groups: Record<string, Record<string, any[]>> = {};
        filteredPendingOrders.forEach(o => {
            const seller = o.vendedor || 'Sin Vendedor';
            let date = 'Sin Fecha';
            if (o.fecha) {
                try {
                    // Si viene como ISO "2023-10-27T15:30:00Z" o simple "2023-10-27 15:30:00"
                    // Nos quedamos con la parte anterior al espacio o T
                    date = o.fecha.split('T')[0].split(' ')[0];
                } catch (e) {
                    date = o.fecha;
                }
            }
            if (!groups[seller]) groups[seller] = {};
            if (!groups[seller][date]) groups[seller][date] = [];
            groups[seller][date].push(o);
        });
        return groups;
    }, [filteredPendingOrders]);

    const toggleOrderSelection = (id: string) => {
        const next = new Set(selectedOrders);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedOrders(next);
    };

    const toggleSelectAll = () => {
        if (selectedOrders.size === filteredPendingOrders.length && filteredPendingOrders.length > 0) {
            setSelectedOrders(new Set());
        } else {
            setSelectedOrders(new Set(filteredPendingOrders.map(o => o.id)));
        }
    };

    const handleAssignToRoute = () => {
        if (selectedOrders.size === 0) return;
        setAssignRouteName(recentRoutes[0] || "");
        setShowAssignModal(true);
    };

    const submitRouteAssignment = async (routeName: string) => {
        if (!routeName) return;

        try {
            setIsSyncing(true);

            // 1. Obtener los pedidos completos para reprocesar
            const idsToAssign = Array.from(selectedOrders);
            const ordersToProcess = orders.filter(o => idsToAssign.includes(o.id));

            // 2. Reprocesar: Normalizar Bultos a Unidades
            const processedOrders = ordersToProcess.map(order => {
                const normalizedItems = (order.items || []).map((it: any) => {
                    const id = it.id_prod || it.id_producto || it.id;
                    let p = products.find(prod => String(prod.ID_Producto) === String(id));
                    if (!p && it.nombre) {
                        p = products.find(prod => String(prod.Nombre || '').trim().toLowerCase() === String(it.nombre).trim().toLowerCase());
                    }
                    if (!p) return { ...it, id_prod: id };

                    const rawUb = p.UB || p.Unidades_Bulto || "1";
                    const ub = parseFloat(String(rawUb).replace(',', '.'));
                    const isKg = (p.Unidad || '').toLowerCase() === 'kg';
                    const isDetalleBulto = String(it.detalle || it.nombre || '').toUpperCase().includes('BULTO');
                    const formatVal = String(it._formato || it.formato || (isDetalleBulto ? 'BULTO' : '')).toUpperCase();

                    if (formatVal === 'BULTO' && ub > 1) {
                        return {
                            ...it,
                            id_prod: id,
                            cantidad: (parseFloat(String(it.cantidad || "0").replace(',', '.')) || 0) * ub,
                            precio: (parseFloat(String(it.precio || "0").replace(',', '.')) || 0) / ub,
                            _formato: isKg ? 'KG' : 'UNID'
                        };
                    }
                    return { ...it, id_prod: id };
                });

                return {
                    ...order,
                    estado: "En Preparación",
                    reparto: routeName,
                    items: normalizedItems
                };
            });

            // 3. Guardar cambios masivamente
            const res = await wandaApi.updateBulkOrders(processedOrders);
            if (res.error) throw new Error(res.error);

            setSelectedOrders(new Set());
            await refreshData(true);
            setShowAssignModal(false);
            alert("Pedidos reprocesados y asignados correctamente");
        } catch (error: any) {
            alert("Error al asignar o procesar pedidos: " + (error.message || error));
        } finally {
            setIsSyncing(false);
        }
    };

    const handleLiberarReparto = async (routeName: string) => {
        if (!confirm(`¿Está seguro de liberar todos los pedidos de la ruta ${routeName}?`)) return;

        try {
            setIsSyncing(true);
            const res = await wandaApi.liberarReparto(routeName);
            if (res.error) throw new Error(res.error);
            if (res.result?.includes("ERROR")) throw new Error(res.result);

            await refreshData(true);
            alert("Ruta liberada correctamente");
        } catch (error: any) {
            alert("Error al liberar pedidos: " + (error.message || error));
        } finally {
            setIsSyncing(false);
        }
    };

    const handleQuitarPedidoDeRuta = async (orderId: string) => {
        if (!confirm("¿Deseas quitar este pedido del reparto actual?")) return;
        try {
            setIsSyncing(true);
            const res = await wandaApi.asignarRepartoMasivo([orderId], "");
            if (res.error) throw new Error(res.error);
            await refreshData(true);
        } catch (error: any) {
            alert("Error al quitar: " + (error.message || error));
        } finally {
            setIsSyncing(false);
        }
    };


    const handleUpdatePendingOrder = async (updated: any) => {
        try {
            setIsSyncing(true);
            // Normalización de BULTO a UNID para consistencia en la DB
            const normalizedOrder = {
                ...updated,
                items: updated.items.map((it: any) => {
                    if (it._formato === 'BULTO') {
                        const product = products.find((p: any) => String(p.ID_Producto) === String(it.id_prod));
                        const rawUb = product?.UB || product?.Unidades_Bulto || "1";
                        const ub = parseFloat(String(rawUb).replace(',', '.'));
                        if (ub > 1) {
                            return {
                                ...it,
                                cantidad: (parseFloat(it.cantidad) || 0) * ub,
                                precio: (parseFloat(it.precio) || 0) / ub,
                                _formato: (product?.Unidad || 'UNID').toUpperCase()
                            };
                        }
                    }
                    return it;
                })
            };
            await wandaApi.saveOrderCorrection(normalizedOrder);
            await refreshData(true);
            setViewingDetailId(null);
            alert("Pedido actualizado correctamente.");
        } catch (err) {
            console.error(err);
            alert("Error al actualizar el pedido.");
        } finally {
            setIsSyncing(false);
        }
    };


    const handlePrintWeeklySummary = (selectedLiqs: any[]) => {
        const win = window.open('', '_blank');
        if (!win) return;

        const totals = selectedLiqs.reduce((acc, l) => {
            let efecReal = l.EFECTIVO || 0;
            try {
                if (l.DRAFT_JSON) {
                    const draft = JSON.parse(l.DRAFT_JSON);
                    if (draft.billetes) {
                        efecReal = Object.entries(draft.billetes).reduce((subAcc, [den, qty]) => subAcc + (Number(den) * (qty as number)), 0);
                    }
                }
            } catch (e) { }

            return {
                efectivo: acc.efectivo + efecReal,
                transf: acc.transf + (l.TRANSF || 0),
                cc: acc.cc + (l.CUENTAS_CORRIENTES || 0),
                gastos: acc.gastos + (l.GASTOS || 0),
                devoluciones: acc.devoluciones + (l.DEVOLUCIONES || 0)
            };
        }, { efectivo: 0, transf: 0, cc: 0, gastos: 0, devoluciones: 0 });

        const rows = selectedLiqs.map(l => {
            let efecReal = l.EFECTIVO || 0;
            try {
                if (l.DRAFT_JSON) {
                    const draft = JSON.parse(l.DRAFT_JSON);
                    if (draft.billetes) {
                        efecReal = Object.entries(draft.billetes).reduce((subAcc, [den, qty]) => subAcc + (Number(den) * (qty as number)), 0);
                    }
                }
            } catch (e) { }

            return `
            <tr>
                <td>${l.REPARTO}<br/><small>${new Date(l.FECHA).toLocaleDateString()}</small></td>
                <td style="text-align:right">$${efecReal.toLocaleString()}</td>
                <td style="text-align:right">$${(l.TRANSF || 0).toLocaleString()}</td>
                <td style="text-align:right">$${(l.CUENTAS_CORRIENTES || 0).toLocaleString()}</td>
                <td style="text-align:right">$${(l.GASTOS || 0).toLocaleString()}</td>
                <td style="text-align:right">$${(l.DEVOLUCIONES || 0).toLocaleString()}</td>
            </tr>
        `}).join('');

        win.document.write(`
            <html>
                <head>
                    <title>Resumen Semanal de Repartos</title>
                    <style>
                        body { font-family: sans-serif; padding: 30px; color: #333; }
                        h1 { font-size: 20px; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ccc; padding: 10px; font-size: 12px; }
                        th { background: #f2f2f2; text-transform: uppercase; font-size: 10px; }
                        .total-row { background: #000; color: #fff; font-weight: bold; }
                        .footer { margin-top: 40px; font-size: 10px; color: #666; text-align: right; }
                    </style>
                </head>
                <body>
                    <h1>Resumen Semanal / Agrupado</h1>
                    <p>Filtro aplicado: ${selectedLiqs.length} repartos seleccionados.</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Reparto / Fecha</th>
                                <th>Efectivo</th>
                                <th>Transferencia</th>
                                <th>Cta. Cte.</th>
                                <th>Gastos</th>
                                <th>Devoluciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td>TOTALES</td>
                                <td style="text-align:right">$${totals.efectivo.toLocaleString()}</td>
                                <td style="text-align:right">$${totals.transf.toLocaleString()}</td>
                                <td style="text-align:right">$${totals.cc.toLocaleString()}</td>
                                <td style="text-align:right">$${totals.gastos.toLocaleString()}</td>
                                <td style="text-align:right">$${totals.devoluciones.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="footer">Generado el ${new Date().toLocaleString()}</div>
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        win.document.close();
    };


    const printOrders = (rawOrderList: any[]) => {
        // Filtrar pedidos vacíos (total 0)
        const orderList = rawOrderList.filter(o => (parseFloat(String(o.total).replace(',', '.')) || 0) > 0);

        const printWindow = window.open('', '_blank');
        if (!printWindow || orderList.length === 0) return;

        const html = `
            <html>
            <head>
                <title>Remitos de Entrega</title>
                <style>
                    body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #000; line-height: 1.2; }
                    .print-page { page-break-after: always; padding: 10px; display: flex; flex-direction: column; gap: 15px; }
                    .copy-type {
                        position: absolute; 
                        top: 4px; 
                        right: 12px; 
                        font-size: 10px; 
                        font-weight: bold; 
                        text-transform: uppercase; 
                        color: #999; 
                    }
                    .remito { 
                        position: relative;
                        border: 2px solid #000; 
                        padding: 8px 12px; 
                        display: flex;
                        flex-direction: column;
                        background: #fff;
                        height: 135mm;
                        box-sizing: border-box;
                    }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 5px; }
                    .company { font-size: 18px; font-weight: 900; text-transform: uppercase; background: #ffea00; display: inline-block; padding: 2px 5px;}
                    .company-details { font-size: 9px; margin-top: 2px; text-transform: uppercase; }
                    .x-box { border: 2px solid #000; text-align: center; padding: 2px 10px; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 40px; margin-top: 5px;}
                    .x-mark { font-size: 26px; font-weight: 900; line-height: 1; margin-bottom: 2px;}
                    .x-sub { font-size: 6px; font-weight: bold; text-transform: uppercase; line-height: 1.1;}

                    .info-box { border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 5px; font-size: 10px; display: flex; flex-direction: column; gap: 4px; }
                    .info-row { display: flex; justify-content: space-between; }

                    .table-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column;}
                    table { width: 100%; border-collapse: collapse; height: 100%; }
                    th { border: 1px solid #000; border-top: none; padding: 4px; font-size: 9px; font-weight: 900; text-align: center; }
                    th:last-child { border-right: none; }
                    td { border-right: 1px solid #000; border-left: 1px solid #000; padding: 2px 4px; font-size: 11px; vertical-align: top; }
                    td.num { text-align: right; }
                    td.cen { text-align: center; }
                    td:first-child { border-left: none; }
                    td:last-child { border-right: none; }
                    tr.item-row td { border-bottom: none; border-top: none; height: 1%; } /* 1% makes row fit content tightly */
                    tr.stretcher-row td { border-bottom: none; border-top: none; height: auto; }

                    .footer { border-top: 2px solid #000; margin-top: auto; padding-top: 5px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .obs { width: 50%; font-size: 8px; color: #666; }
                    .totals-box { width: 45%; display: flex; flex-direction: column; align-items: flex-end;}
                    .subtotal-row { display: flex; justify-content: space-between; width: 100%; font-size: 11px; margin-bottom: 2px;}
                    .total-row { display: flex; justify-content: space-between; width: 100%; font-size: 13px; font-weight: 900; border-top: 1px solid #000; margin-top: 2px; padding-top: 2px;}

                    @media print {
                        @page { size: A4; margin: 10mm; }
                        .print-page { padding: 0; margin: 0; gap: 8mm;}
                        .remito { height: 134mm; }
                        .remito.long-format { height: 275mm; }
                    }
                </style>
            </head>
            <body>
                ${orderList.map((order, index) => {
            // Filtrar items con cantidad 0
            const activeItems = (order.items || []).filter((it: any) => {
                const q = parseFloat(String(it.cantidad || it.CANTIDAD || 0).replace(',', '.'));
                return q > 0;
            });
            const isLong = activeItems.length > 17;
            const copies = ['ORIGINAL', 'DUPLICADO'].map((type) => `
                            <div class="remito ${isLong ? 'long-format' : ''}">
                                <div class="copy-type">${type}</div>
                                <div class="header">
                                        <div style="width: 45%;">
                                            <div class="company">${data?.config?.EMPRESA || 'WANDA DISTRIBUCIONES'}</div>
                                            <div class="company-details">${data?.config?.REMITO_DIRECCION || ''}</div>
                                            <div class="company-details">Tel: ${data?.config?.REMITO_TELEFONO || ''}</div>
                                        </div>
                                        <div style="display: flex; gap: 10px; align-items: center; width: 30%;">
                                            <div class="x-box">
                                                <span class="x-mark">X</span>
                                                <span class="x-sub">Doc. no válido<br>como factura</span>
                                            </div>
                                            <div>
                                                ${(() => {
                    let orderIdx = index + 1;
                    if (order.reparto) {
                        // Filtramos igual que en la Hoja de Ruta para que el número sea idéntico
                        const inRoute = orders.filter(o => o.reparto === order.reparto && (parseFloat(String(o.total).replace(',', '.')) || 0) > 0);
                        const foundIdx = inRoute.findIndex(o => o.id === order.id);
                        if (foundIdx !== -1) orderIdx = foundIdx + 1;
                        return `<div style="font-weight: 900; font-size: 14px; color: #000; border: 2px solid #000; padding: 1px 5px; background: #eee; margin-bottom: 2px;">ORDEN: ${orderIdx}</div>`;
                    }
                    return orderList.length > 1 ? `<div style="font-weight: bold; font-size: 9px; color: #555;">Bulto ${index + 1}/${orderList.length}</div>` : '';
                })()}
                                                <div style="font-weight: 900; font-size: 10px; margin-top: 1px;">PEDIDO</div>
                                                <div style="font-weight: 900; font-size: 14px; margin-top: -2px;">${order.id.slice(-8)}</div>
                                            </div>
                                        </div>
                                        <div style="width: 25%; text-align: right; font-size: 10px; font-weight: bold;">
                                            <div>Fecha: ${order.fecha}</div>
                                            <div style="margin-top:2px;">Vendedor: ${order.vendedor || 'S/V'}</div>
                                        </div>
                                    </div>
                                    
                                    <div class="info-box">
                                        <div class="info-row">
                                            <div style="width: 70%;"><strong>Señor(es):</strong> ${order.cliente_nombre}</div>
                                            <div style="width: 30%;"><strong>CUIT/DNI:</strong> -</div>
                                        </div>
                                        <div><strong>Domicilio:</strong> ${order.direccion || 'Sin dirección registrada'}</div>
                                        <div class="info-row">
                                            <div style="width: 40%;"><strong>Tip/Resp:</strong> -</div>
                                            <div style="width: 30%;"><strong>Fma pago:</strong> -</div>
                                            <div style="width: 30%; text-align: right;">${order.vendedor || 'S/V'}</div>
                                        </div>
                                        ${order.notas ? `<div><strong>Notas:</strong> ${order.notas}</div>` : ''}
                                    </div>
                                    
                                    <div class="table-wrapper">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th width="12%">CANT.</th>
                                                     <th width="8%">FACTOR</th>
                                                    <th width="40%">DESCRIPCIÓN</th>
                                                    <th width="15%">P. UNIT.</th>
                                                    <th width="10%">BONIF.</th>
                                                    <th width="15%">TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${activeItems.map((item: any) => {
                    const qty = item.cantidad || item.CANTIDAD || 0;
                    const bul = item.bultos || item.BULTOS || 0;
                    const uni = item.unidades || item.UNIDADES || 0;

                    const pId = item.id_prod || item.id_producto || item.id;
                    const prod = (data?.products || []).find((p: any) => String(p.ID_Producto) === String(pId));
                    const isKg = item.unidad_medida === 'kg' || prod?.Unidad?.toLowerCase() === 'kg';
                    const unitLabel = isKg ? 'kg' : 'un';
                    const format = (item.formato || item._formato || (String(item.nombre || '').toUpperCase().includes('BULTO') ? 'BULTO' : 'UNIDAD')).toUpperCase();

                    let qtyDisplay = '';
                    if (isKg) {
                        qtyDisplay = `${qty.toFixed(3)} Kg`;
                    } else if (bul > 0 || uni > 0) {
                        if (bul > 0 && uni > 0) qtyDisplay = `${bul} B / ${uni} ${unitLabel}`;
                        else if (bul > 0) qtyDisplay = `${bul} BUL`;
                        else qtyDisplay = `${uni} ${unitLabel}`;
                    } else {
                        qtyDisplay = format === 'BULTO' ? `${qty} BUL` : `${qty} ${unitLabel}`;
                    }

                    const factor = prod?.UB || prod?.Unidades_Bulto || 1;
                    const factorDisplay = format === 'BULTO' ? `x${factor}` : '-';

                    return `
                                                            <tr class="item-row">
                                                                <td class="cen">${qtyDisplay}</td>
                                                                <td class="cen" style="color: #666; font-size: 9px;">${factorDisplay}</td>
                                                                <td>${item.nombre}</td>
                                                                <td class="num">$${(parseFloat(String(item.precio).replace(',', '.')) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                <td class="cen">${(parseFloat(String(item.descuento || 0).replace(',', '.')) || 0) > 0 ? `${(parseFloat(String(item.descuento || 0).replace(',', '.')) || 0)}%` : '-'}</td>
                                                                <td class="num">$${(parseFloat(String(item.subtotal).replace(',', '.')) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                            </tr>
                                                        `;
                }).join('')}
                                                ${/* Relleno para que el remito tenga altura constante */ Array(Math.max(0, 17 - activeItems.length)).fill(0).map(() => `
                                                    <tr class="item-row">
                                                        <td class="cen">&nbsp;</td>
                                                        <td class="cen">&nbsp;</td>
                                                        <td>&nbsp;</td>
                                                        <td class="num">&nbsp;</td>
                                                        <td class="cen">&nbsp;</td>
                                                        <td class="num">&nbsp;</td>
                                                    </tr>
                                                `).join('')}
                                                <tr class="stretcher-row">
                                                    <td class="cen"></td>
                                                    <td class="cen"></td>
                                                    <td></td>
                                                    <td class="num"></td>
                                                    <td class="cen"></td>
                                                    <td class="num"></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <div class="footer">
                                        <div class="obs">
                                            ESTE DOCUMENTO NO TIENE VALOR FISCAL. ENTREGA SUJETA A DISPONIBILIDAD DE STOCK. EL RECEPTOR CONFORMA LA RECEPCIÓN DE LA MERCADERÍA.
                                        </div>
                                        <div class="totals-box">
                                            <div class="subtotal-row">
                                                <span>Subtotal:</span>
                                                <span>$${(parseFloat(String(order.total).replace(',', '.')) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div class="subtotal-row">
                                                <span>Descuentos:</span>
                                                <span>$0</span>
                                            </div>
                                            <div class="total-row">
                                                <span>TOTAL:</span>
                                                <span>$${(parseFloat(String(order.total).replace(',', '.')) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `);

            if (isLong) {
                return copies.map(copy => `<div class="print-page">${copy}</div>`).join('');
            } else {
                return `<div class="print-page">${copies.join('')}</div>`;
            }
        }).join('')}

                <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const printPickingList = (orderList: any[], routeName?: string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const aggregates: Record<string, any> = {};
        orderList.forEach(order => {
            order.items?.forEach((item: any) => {
                const parsedQty = parseFloat(String(item.cantidad).replace(',', '.')) || 0;
                if (parsedQty <= 0) return;

                const id = item.id_prod || item.id_producto || item.id || item.nombre;
                let prod = products.find((p: any) => String(p.ID_Producto) === String(id));
                if (!prod && item.nombre) {
                    prod = products.find((p: any) => String(p.Nombre || '').trim().toLowerCase() === String(item.nombre).trim().toLowerCase());
                }
                const isKg = (prod?.Unidad || '').toLowerCase() === 'kg';
                const baseUnit = String(prod?.Unidad || 'UNID').toUpperCase();

                const rawUb = prod?.UB ?? prod?.Unidades_Bulto;
                const parsedUb = parseFloat(String(rawUb || "1").replace(',', '.'));
                const ub = (!rawUb || String(rawUb).trim() === '' || isNaN(parsedUb) || parsedUb === 0) ? 1 : parsedUb;

                if (!aggregates[id]) {
                    aggregates[id] = {
                        nombre: item.nombre,
                        cantidad: 0,
                        isKg: isKg,
                        ub: ub,
                        baseUnit: baseUnit,
                        clientes: []
                    };
                }

                let itemQty = parsedQty;
                const isDetalleBulto = String(item.detalle || item.nombre || '').toUpperCase().includes('BULTO');
                const formatVal = String(item._formato || item.formato || (isDetalleBulto ? 'BULTO' : '')).toUpperCase();

                if (formatVal === 'BULTO' && ub > 1) {
                    itemQty *= ub;
                }

                aggregates[id].cantidad += itemQty;
                aggregates[id].clientes.push({
                    nombre: order.cliente_nombre,
                    cantidad: itemQty,
                    ub: ub,
                    isKg: isKg
                });
            });
        });

        const formatCompact = (qty: number, ub: number, isKg: boolean, baseUnit: string) => {
            if (isKg) return `${qty.toFixed(2)} KG`;
            const unitLabel = baseUnit.toUpperCase().startsWith('UNID') || baseUnit.toUpperCase() === 'U' ? 'U' : baseUnit;
            if (ub <= 1) return `${qty} ${unitLabel} `;
            const bul = Math.floor(qty / ub);
            const uni = Math.round((qty % ub) * 100) / 100;
            const suffix = `<small style="font-weight: bold; font-size: 10px; color: #333; margin-left: 4px;">(x${ub} ${unitLabel})</small>`;
            if (bul === 0) return `${uni} ${unitLabel}`;
            if (uni === 0) return `<b>${bul} BUL</b> ${suffix}`;
            return `<b>${bul} BUL + ${uni} ${unitLabel}</b> ${suffix}`;
        };

        const sorted = Object.values(aggregates).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const pesables = sorted.filter(i => i.isKg);
        const noPesables = sorted.filter(i => !i.isKg);

        const html = `
            <html>
            <head>
                <title>Picking List - ${routeName || 'Selección'}</title>
                <style>
                    body { font-family: sans-serif; padding: 15px; line-height: 1.1; color: #222; }
                    .header-print { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #000; padding-bottom: 5px; margin-bottom: 12px; }
                    h1 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
                    .meta { font-weight: bold; color: #666; font-size: 10px; }
                    .section { margin-top: 15px; }
                    .section h2 { background: #333; color: #fff; padding: 3px 10px; border-radius: 3px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #aaa; padding: 2px 8px; text-align: left; vertical-align: middle; }
                    th { border-bottom: 2px solid #000; font-size: 9px; font-weight: 900; background: #f2f2f2; }
                    .check { width: 14px; height: 14px; border: 1px solid #000; border-radius: 2px; display: inline-block; vertical-align: middle; }
                    .qty { font-size: 13px; font-weight: 900; color: #4338ca; }
                    .client-list { margin-top: 4px; font-size: 11px; color: #333; border-top: 1px dashed #ccc; padding-top: 4px; }
                    .client-item { display: flex; justify-content: space-between; margin-bottom: 2px; }
                </style>
            </head>
            <body>
                <div class="header-print">
                    <div>
                        <div class="meta">${data?.config?.EMPRESA || 'WANDA DISTRIBUCIONES'}</div>
                        <div class="meta">PLANILLA DE CARGA / PICKING</div>
                        <h1>${routeName || 'SELECCIÓN'}</h1>
                    </div>
                    <div style="text-align: right">
                        <div class="meta">Fecha: ${new Date().toLocaleDateString()}</div>
                        <div class="meta">Cant. Pedidos: ${orderList.length}</div>
                    </div>
                </div>

                ${noPesables.length > 0 ? `
                    <div class="section">
                        <h2>Productos Generales (Unidades)</h2>
                        <table style="border-spacing: 0; border-collapse: collapse; width: auto; min-width: 60%;">
                            <thead>
                                <tr>
                                    <th style="padding: 2px 8px;">PRODUCTO / DESCRIPCIÓN</th>
                                    <th style="padding: 2px 8px; text-align: left;">CANT.</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${noPesables.map(item => `
                                    <tr style="line-height: 1.0;">
                                        <td style="font-weight: bold; font-size: 11px; padding: 1px 8px;">${item.nombre}</td>
                                        <td class="qty" style="padding: 1px 8px; font-size: 13px; white-space: nowrap;">${formatCompact(item.cantidad, item.ub, item.isKg, item.baseUnit)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                ${pesables.length > 0 ? `
                    <div class="section">
                        <h2>Productos Pesables (Balanza)</h2>
                        <p style="font-size: 10px; color: #666; margin-top: 2px;">* Los productos pesables muestran KG ESTIMADO si no han sido corregidos en el gestor de rutas.</p>
                        <table>

                            <thead>
                                <tr>
                                    <th width="40">LISTO</th>
                                    <th width="120">KG ESTIMADO</th>
                                    <th>PRODUCTO Y DESGLOSE POR CLIENTE</th>
                                    <th width="200">PESO REAL (ANOTAR)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pesables.map(item => `
                                    <tr>
                                        <td align="center"><div class="check"></div></td>
                                        <td class="qty">${item.cantidad.toFixed(2)} KG</td>
                                        <td>
                                            <div style="font-weight: bold; font-size: 14px;">${item.nombre}</div>
                                            <div class="client-list">
                                                ${item.clientes.map((c: any) => `
                                                    <div class="client-item">
                                                        <span>• ${c.nombre}</span>
                                                        <span>${c.cantidad.toFixed(2)} KG</span>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </td>
                                        <td style="font-size: 18px; color: #ccc;">________________</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                <div style="margin-top: 50px; border-top: 1px dashed #ccc; padding-top: 20px;">
                    <p style="font-size: 12px; font-weight: bold;">Notas / Observaciones de Carga:</p>
                    <div style="height: 100px; border: 1px solid #eee;"></div>
                </div>

                <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const printRouteSheet = (rawOrderList: any[], routeName: string) => {
        const orderList = rawOrderList.filter(o => (parseFloat(String(o.total).replace(',', '.')) || 0) > 0);
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const totalValue = orderList.reduce((acc, o) => acc + (parseFloat(String(o.total).replace(',', '.')) || 0), 0);

        const html = `
            <html>
            <head>
                <title>Hoja de Ruta - ${routeName}</title>
                <style>
                    body { font-family: sans-serif; padding: 10px; line-height: 1; font-size: 10.5px; color: #333; }
                    .header-route { display: flex; justify-content: space-between; border-bottom: 2px solid #4338ca; padding-bottom: 4px; margin-bottom: 10px; }
                    h1 { margin: 0; font-size: 16px; font-weight: 900; color: #4338ca; text-transform: uppercase; }
                    table { width: 100%; border-collapse: collapse; margin-top: 2px; }
                    th, td { border: 1px solid #ccc; padding: 1px 6px; text-align: left; }
                    th { background: #f8fafc; font-weight: 900; text-transform: uppercase; font-size: 8.5px; color: #64748b; }
                    .footer { margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                    .firma { border-top: 1px solid #000; padding-top: 3px; text-align: center; font-weight: bold; text-transform: uppercase; font-size: 8.5px; }
                    .summary { background: #f1f5f9; padding: 6px 12px; border-radius: 6px; margin-top: 10px; display: flex; gap: 20px; font-size: 9px; }
                    .summary-item b { font-size: 11px; color: #4338ca; }
                </style>
            </head>
            <body>
                <div class="header-route">
                    <div>
                        <div style="font-weight: bold; color: #4338ca; font-size: 11px; margin-bottom: 0px;">${data?.config?.EMPRESA || 'WANDA DISTRIBUCIONES'}</div>
                        <div style="font-weight: bold; color: #64748b; font-size: 9px; margin-bottom: 2px;">REPARTO / LOGÍSTICA</div>
                        <h1>${routeName}</h1>
                    </div>
                    <div style="text-align: right">
                        <div style="font-weight: bold; font-size: 10px;">Fecha: ${new Date().toLocaleDateString()}</div>
                        <div style="color: #64748b; font-size: 9px;">Planilla de Control de Entregas</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th width="5%">ORD.</th>
                            <th width="45%">CLIENTE / DIRECCIÓN</th>
                            <th width="15%">IMPORTE</th>
                            <th width="35%">ANOTACIONES CHOFER</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orderList.map((order, i) => `
                            <tr style="height: 20px;">
                                <td align="center"><b>${i + 1}</b></td>
                                <td>
                                    <div style="font-weight: bold; font-size: 11px;">${order.cliente_nombre}</div>
                                </td>
                                <td align="right" style="font-weight: bold; font-size: 11px;">
                                    $${(parseFloat(String(order.total).replace(',', '.')) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="summary">
                    <div class="summary-item">Total Pedidos: <b>${orderList.length}</b></div>
                    <div class="summary-item">Valor Total: <b>$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></div>
                    <div class="summary-item">Bultos Totales: <b>${Math.round(orderList.reduce((acc, o) => {
            return acc + (o.items?.reduce((iAcc: number, it: any) => {
                const p = products.find(prod => String(prod.ID_Producto) === String(it.id_prod || it.id_producto || it.id));
                const rawUb = p?.UB || p?.Unidades_Bulto || "1";
                const ub = parseFloat(String(rawUb).replace(',', '.')) || 1;
                const isKg = (p?.Unidad || '').toLowerCase() === 'kg';
                if (isKg) return iAcc;
                return iAcc + (parseFloat(String(it.cantidad).replace(',', '.')) / ub);
            }, 0) || 0);
        }, 0))}</b></div>
                </div>

                <div class="footer">
                    <div>
                        <div style="margin-bottom: 40px;">KM SALIDA: __________ | KM LLEGADA: __________</div>
                        <div class="firma">Firma chofer / entregador</div>
                    </div>
                    <div>
                        <div style="margin-bottom: 40px;">HORA SALIDA: __________ | HORA LLEGADA: __________</div>
                        <div class="firma">Control de salida (Depósito)</div>
                    </div>
                </div>

                <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    if (loading && !data) return <div className="h-[60vh] flex items-center justify-center">Sincronizando logística...</div>;

    return (
        <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner">
                        <Truck size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">Logística</h2>
                        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] mt-0.5">Gestión de entregas y optimización</p>
                    </div>
                </div>

                <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-[var(--border)] relative overflow-x-auto no-scrollbar backdrop-blur-sm shadow-inner w-full lg:w-auto pb-1.5 lg:pb-1.5">
                    {[
                        { id: 'pendientes', label: 'Pendientes', count: allPendingOrders.length, icon: Package },
                        { id: 'rutas', label: 'Hojas de Ruta', count: routeInfo.length, icon: Truck },
                        { id: 'historial', label: 'Historial', count: liquidaciones.length, icon: RotateCcw },
                        { id: 'comisiones', label: 'Comisiones', icon: CreditCard },
                        { id: 'resumenes', label: 'Resúmenes', icon: Layers, color: 'amber' }
                    ].map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    relative px-4 sm:px-5 py-2.5 flex items-center gap-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-tight rounded-xl transition-all duration-300 z-10 flex-shrink-0
                                    ${isActive
                                        ? 'text-white'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}
                                `}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabBg"
                                        className={`absolute inset-0 ${tab.color === 'amber' ? 'bg-amber-500 shadow-amber-500/30' : 'bg-indigo-600 shadow-indigo-500/30'} rounded-xl shadow-xl z-[-1]`}
                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                    />
                                )}
                                <Icon size={16} className={`${isActive ? 'scale-110' : 'opacity-60'} transition-all duration-300`} />
                                <span className="whitespace-nowrap">{tab.label}</span>
                                {tab.count !== undefined && (
                                    <span className={`
                                        px-2 py-0.5 rounded-full text-[9px] font-black min-w-[20px] text-center
                                        ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}
                                    `}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-4">
                    {activeTab === 'pendientes' && (
                        <div className="space-y-6">
                            <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-sm space-y-4">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Buscar por cliente, ID o dirección..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                        <div className="relative w-full sm:w-auto">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                            <select
                                                value={filterDate}
                                                onChange={(e) => setFilterDate(e.target.value)}
                                                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl text-xs font-bold appearance-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                            >
                                                <option value="">Todas las fechas</option>
                                                {availableDates.map(date => (
                                                    <option key={date} value={date}>{date}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                        </div>
                                        <div className="relative w-full sm:w-auto">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                            <select
                                                value={filterSeller}
                                                onChange={(e) => setFilterSeller(e.target.value)}
                                                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl text-xs font-bold appearance-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                            >
                                                <option value="">Todos los vendedores</option>
                                                {availableSellers.map(seller => (
                                                    <option key={seller} value={seller}>{seller}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-dashed border-[var(--border)]">
                                    <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-[var(--border)] shadow-inner">
                                        {[
                                            { id: 'grid', icon: LayoutGrid, title: 'Vista Grilla' },
                                            { id: 'list', icon: List, title: 'Vista Lista' },
                                            { id: 'grouped', icon: Layers, title: 'Vista Agrupada' }
                                        ].map((mode) => (
                                            <button
                                                key={mode.id}
                                                onClick={() => setViewMode(mode.id as any)}
                                                className={`p-2 rounded-lg transition-all duration-200 ${viewMode === mode.id ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                                title={mode.title}
                                            >
                                                <mode.icon size={16} />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                        {filteredPendingOrders.length} resultados • {selectedOrders.size} seleccionados
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                    {selectedOrders.size > 0 && (
                                        <button
                                            onClick={() => printOrders(Array.from(selectedOrders).map(id => orders.find(o => o.id === id)))}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-all shadow-lg"
                                            title="Imprimir Remitos Seleccionados"
                                        >
                                            <Printer size={14} /> Remitos ({selectedOrders.size})
                                        </button>
                                    )}
                                    {selectedOrders.size > 0 && (
                                        <button
                                            onClick={() => printPickingList(Array.from(selectedOrders).map(id => orders.find(o => o.id === id)))}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg"
                                            title="Imprimir Picking de los seleccionados"
                                        >
                                            <Package size={14} /> Picking
                                        </button>
                                    )}
                                    {selectedOrders.size > 0 && (
                                        <button
                                            onClick={handleAssignToRoute}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/10"
                                        >
                                            <Plus size={14} /> Asignar a Ruta
                                        </button>
                                    )}
                                </div>
                            </div>

                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredPendingOrders.length === 0 ? (
                                        <div className="col-span-full p-12 text-center text-slate-400 font-bold bg-[var(--card)] rounded-2xl border border-dashed border-[var(--border)]">
                                            No se encontraron pedidos con los filtros actuales
                                        </div>
                                    ) : (
                                        filteredPendingOrders.map(order => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                isSelected={selectedOrders.has(order.id)}
                                                onSelect={() => toggleOrderSelection(order.id)}
                                                onViewDetail={() => setViewingDetailId(order.id)}
                                                onPrint={() => printOrders([order])}
                                            />
                                        ))
                                    )}
                                </div>
                            ) : viewMode === 'list' ? (
                                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden overflow-x-auto shadow-sm">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border)]">
                                                <th className="p-4 text-left w-10">
                                                    <div
                                                        onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${selectedOrders.size === filteredPendingOrders.length && filteredPendingOrders.length > 0 ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'border-slate-300 bg-white'} `}
                                                    >
                                                        {selectedOrders.size === filteredPendingOrders.length && filteredPendingOrders.length > 0 && <CheckCircle2 size={12} />}
                                                        {selectedOrders.size > 0 && selectedOrders.size < filteredPendingOrders.length && <div className="w-2.5 h-0.5 bg-slate-400 rounded-full" />}
                                                    </div>
                                                </th>
                                                <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                                                <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Pedido</th>
                                                <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</th>
                                                <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                                                <th className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Ver</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)] text-sm">
                                            {filteredPendingOrders.map(order => (
                                                <tr
                                                    key={order.id}
                                                    className={`hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-colors cursor-pointer ${selectedOrders.has(order.id) ? 'bg-indigo-500/5' : ''} `}
                                                    onClick={() => toggleOrderSelection(order.id)}
                                                >
                                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                                        <div
                                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedOrders.has(order.id) ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'border-slate-300 bg-white'} `}
                                                        >
                                                            {selectedOrders.has(order.id) && <CheckCircle2 size={12} />}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-slate-800 dark:text-slate-100">{order.cliente_nombre}</div>
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{order.vendedor}</div>
                                                    </td>
                                                    <td className="p-4 text-[10px] font-black text-slate-400">#{order.id}</td>
                                                    <td className="p-4 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                                        {order.items?.length || 0} items
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-200">
                                                            {order.estado || 'Pendiente'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right font-black text-indigo-600">
                                                        ${parseFloat(order.total).toLocaleString()}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setViewingDetailId(order.id); }}
                                                            className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredPendingOrders.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                                                        No se encontraron pedidos con los filtros actuales
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {Object.keys(groupedPendingOrders).sort().map(seller => {
                                        const sellerKey = `seller_${seller}`;
                                        const isSellerExpanded = expandedGroups.has(sellerKey);
                                        const datesInSeller = Object.keys(groupedPendingOrders[seller]).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                                        const totalOrdersInSeller = datesInSeller.reduce((acc, d) => acc + groupedPendingOrders[seller][d].length, 0);

                                        return (
                                            <div key={seller} className="space-y-4">
                                                <div
                                                    onClick={() => toggleGroup(sellerKey)}
                                                    className="flex items-center justify-between group cursor-pointer bg-slate-100 dark:bg-slate-800/50 p-3 rounded-2xl border border-[var(--border)] sticky top-0 z-10 backdrop-blur-md"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                            <User size={14} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-100">{seller}</h4>
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase">{totalOrdersInSeller} pedidos en total</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="hidden sm:flex gap-2">
                                                            <span className="text-[10px] font-black bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-[var(--border)]">{datesInSeller.length} días de actividad</span>
                                                        </div>
                                                        {isSellerExpanded ? <ChevronUp size={16} className="text-indigo-500" /> : <ChevronDown size={16} className="text-slate-400" />}
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {isSellerExpanded && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 p-1">
                                                                {datesInSeller.map(date => {
                                                                    const groupOrders = groupedPendingOrders[seller][date];
                                                                    const totalGroup = groupOrders.reduce((acc, o) => acc + parseFloat(o.total), 0);
                                                                    const allGroupSelected = groupOrders.every(o => selectedOrders.has(o.id));
                                                                    const dateKey = `date_${seller}_${date}`;
                                                                    const isDateExpanded = expandedGroups.has(dateKey);

                                                                    return (
                                                                        <div key={date} className={`tech - card border transition - all overflow - hidden ${isDateExpanded ? 'border-indigo-500/50 ring-4 ring-indigo-500/5' : 'border-[var(--border)]'} `}>
                                                                            <div
                                                                                onClick={() => toggleGroup(dateKey)}
                                                                                className={`p - 4 flex justify - between items - center cursor - pointer transition - colors ${isDateExpanded ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'} `}
                                                                            >
                                                                                <div className="flex items-center gap-4">
                                                                                    <div className={`w - 10 h - 10 rounded - xl flex items - center justify - center transition - all ${isDateExpanded ? 'bg-indigo-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} `}>
                                                                                        <Calendar size={18} />
                                                                                    </div>
                                                                                    <div>
                                                                                        <h5 className="font-bold text-sm">{date}</h5>
                                                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-tight">${totalGroup.toLocaleString()}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-3">
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            const next = new Set(selectedOrders);
                                                                                            if (allGroupSelected) {
                                                                                                groupOrders.forEach(o => next.delete(o.id));
                                                                                            } else {
                                                                                                groupOrders.forEach(o => next.add(o.id));
                                                                                            }
                                                                                            setSelectedOrders(next);
                                                                                        }}
                                                                                        className={`px - 3 py - 1.5 rounded - xl text - [9px] font - black uppercase transition - all flex items - center gap - 2 ${allGroupSelected ? 'bg-indigo-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'} `}
                                                                                    >
                                                                                        <Check size={12} strokeWidth={4} />
                                                                                        {allGroupSelected ? 'Todos' : 'Marcar'}
                                                                                    </button>
                                                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors">
                                                                                        {isDateExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <AnimatePresence>
                                                                                {isDateExpanded && (
                                                                                    <motion.div
                                                                                        initial={{ opacity: 0, height: 0 }}
                                                                                        animate={{ opacity: 1, height: 'auto' }}
                                                                                        exit={{ opacity: 0, height: 0 }}
                                                                                        className="bg-slate-50/50 dark:bg-slate-900/40 border-t border-[var(--border)]"
                                                                                    >
                                                                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                                                            {groupOrders.map(order => {
                                                                                                const orderKey = `order_${order.id}`;
                                                                                                const isOrderExpanded = expandedGroups.has(orderKey);
                                                                                                const isSelected = selectedOrders.has(order.id);

                                                                                                return (
                                                                                                    <div key={order.id} className="group">
                                                                                                        <div
                                                                                                            className={`p - 3 flex items - center gap - 3 transition - colors hover: bg - indigo - 500 / 5 cursor - pointer ${isSelected ? 'bg-indigo-500/10' : ''} `}
                                                                                                            onClick={(e) => {
                                                                                                                if ((e.target as HTMLElement).closest('.collapse-btn')) return;
                                                                                                                toggleOrderSelection(order.id);
                                                                                                            }}
                                                                                                        >
                                                                                                            <div
                                                                                                                className={`w - 4 h - 4 rounded border flex items - center justify - center transition - all ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'} `}
                                                                                                            >
                                                                                                                {isSelected && <Check size={10} strokeWidth={4} />}
                                                                                                            </div>
                                                                                                            <div className="flex-1 min-w-0">
                                                                                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{order.cliente_nombre}</p>
                                                                                                                <div className="flex items-center gap-2">
                                                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">#{order.id}</span>
                                                                                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                                                                                    <span className="text-[9px] font-black text-indigo-500">${parseFloat(order.total).toLocaleString()}</span>
                                                                                                                </div>
                                                                                                                {order.notas && (
                                                                                                                    <div className="mt-1.5 flex items-start gap-1 p-1.5 bg-amber-50 dark:bg-amber-500/5 rounded-lg border border-amber-100 dark:border-amber-500/10">
                                                                                                                        <Info size={8} className="text-amber-500 shrink-0 mt-0.5" />
                                                                                                                        <p className="text-[8px] font-bold text-amber-700 dark:text-amber-400 line-clamp-2">{order.notas}</p>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                            <div className="flex items-center gap-1">
                                                                                                                <button
                                                                                                                    onClick={(e) => { e.stopPropagation(); setViewingDetailId(order.id); }}
                                                                                                                    className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors"
                                                                                                                >
                                                                                                                    <Eye size={14} />
                                                                                                                </button>
                                                                                                                <button
                                                                                                                    onClick={(e) => { e.stopPropagation(); toggleGroup(orderKey); }}
                                                                                                                    className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors collapse-btn"
                                                                                                                >
                                                                                                                    {isOrderExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                                                                </button>
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        <AnimatePresence>
                                                                                                            {isOrderExpanded && (
                                                                                                                <motion.div
                                                                                                                    initial={{ opacity: 0, height: 0 }}
                                                                                                                    animate={{ opacity: 1, height: 'auto' }}
                                                                                                                    exit={{ opacity: 0, height: 0 }}
                                                                                                                    className="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800"
                                                                                                                >
                                                                                                                    <div className="space-y-1 mt-2">
                                                                                                                        {order.items?.map((it: any, i: number) => (
                                                                                                                            <div key={i} className="flex justify-between items-center text-[10px] py-1 border-b border-dashed border-slate-100 dark:border-slate-800 last:border-0">
                                                                                                                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                                                                                                                    <span className="font-black text-indigo-500 mr-1.5">{it.cantidad}</span>
                                                                                                                                    {it.nombre}
                                                                                                                                </span>
                                                                                                                                <span className="font-bold text-slate-400">${parseFloat(it.subtotal || 0).toLocaleString()}</span>
                                                                                                                            </div>
                                                                                                                        ))}
                                                                                                                    </div>
                                                                                                                    <div className="mt-3 flex justify-end gap-2">
                                                                                                                        <button
                                                                                                                            onClick={() => printOrders([order])}
                                                                                                                            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                                                                                                                        >
                                                                                                                            <Printer size={12} /> Imprimir
                                                                                                                        </button>
                                                                                                                    </div>
                                                                                                                </motion.div>
                                                                                                            )}
                                                                                                        </AnimatePresence>
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                        <div className="p-3 bg-indigo-500/5 border-t border-[var(--border)] flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-500">
                                                                                            <span>Subtotal Día</span>
                                                                                            <span className="text-sm">${totalGroup.toLocaleString()}</span>
                                                                                        </div>
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                    {Object.keys(groupedPendingOrders).length === 0 && (
                                        <div className="p-12 text-center text-slate-400 font-bold bg-[var(--card)] rounded-2xl border border-dashed border-[var(--border)]">
                                            No se encontraron pedidos para agrupar
                                        </div>
                                    )}
                                </div>

                            )}
                        </div>
                    )}

                    {activeTab === 'rutas' && (
                        <div className="space-y-6">
                            <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-sm">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Buscar hoja de ruta por nombre de chofer o transporte..."
                                            value={routeSearchTerm}
                                            onChange={(e) => setRouteSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-[var(--border)] shadow-inner">
                                        <button
                                            onClick={() => setRouteViewMode('grid')}
                                            className={`p-2 rounded-lg transition-all duration-200 ${routeViewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                            title="Vista Grilla"
                                        >
                                            <LayoutGrid size={16} />
                                        </button>
                                        <button
                                            onClick={() => setRouteViewMode('list')}
                                            className={`p-2 rounded-lg transition-all duration-200 ${routeViewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                            title="Vista Lista"
                                        >
                                            <List size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {routeInfo.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 font-bold bg-[var(--card)] rounded-2xl border border-dashed border-[var(--border)]">
                                    No se encontraron hojas de ruta {routeSearchTerm ? 'que coincidan con la búsqueda' : 'activas'}
                                </div>
                            ) : routeViewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {routeInfo.map(route => (
                                        <RouteCard
                                            key={route.name}
                                            name={route.name}
                                            index={route.index}
                                            isReopened={route.isReopened}
                                            orderCount={orders.filter(o => o.reparto === route.name).length}
                                            onManage={() => setEditingRoute(route.name)}
                                            onViewOrders={() => setViewingOrdersRoute(route.name)}
                                            onDelete={() => handleLiberarReparto(route.name)}
                                            onPrintRemitos={() => printOrders(orders.filter(o => o.reparto === route.name))}
                                            onPrintRouteSheet={() => printRouteSheet(orders.filter(o => o.reparto === route.name), route.name)}
                                            onPrintPicking={() => printPickingList(orders.filter(o => o.reparto === route.name), route.name)}
                                            onSettlement={() => setSettlingRoute(route.name)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden overflow-x-auto shadow-sm">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border)]">
                                                <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">#</th>
                                                <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ruta / Chofer</th>
                                                <th className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Entregas</th>
                                                <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Estado</th>
                                                <th className="p-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-64">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {routeInfo.map(route => {
                                                const count = orders.filter(o => o.reparto === route.name).length;
                                                return (
                                                    <tr key={route.name} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${route.isReopened ? 'bg-amber-500/5' : ''}`}>
                                                        <td className="p-4">
                                                            <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black border border-[var(--border)] shadow-sm">
                                                                {route.index}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <Truck size={14} className={route.isReopened ? 'text-amber-500' : 'text-indigo-500'} />
                                                                <span className={`font-bold ${route.isReopened ? 'text-amber-700 dark:text-amber-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                    {route.name}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500">
                                                                {count}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            {route.isReopened ? (
                                                                <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 text-[9px] font-black uppercase tracking-wider border border-amber-500/20">
                                                                    Reabierta
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-600 text-[9px] font-black uppercase tracking-wider border border-indigo-500/20">
                                                                    Activa
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button onClick={() => setViewingOrdersRoute(route.name)} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors" title="Ver Pedidos"><Eye size={16} /></button>
                                                                <button onClick={() => setEditingRoute(route.name)} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors" title="Gestionar"><Edit2 size={16} /></button>
                                                                <button onClick={() => printOrders(orders.filter(o => o.reparto === route.name))} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors" title="Imprimir Remitos"><Printer size={16} /></button>
                                                                <button onClick={() => printPickingList(orders.filter(o => o.reparto === route.name), route.name)} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Picking"><Package size={16} /></button>
                                                                <button onClick={() => printRouteSheet(orders.filter(o => o.reparto === route.name), route.name)} className="p-2 text-slate-400 hover:text-amber-500 transition-colors" title="Hoja de Ruta"><MapPin size={16} /></button>
                                                                <button onClick={() => setSettlingRoute(route.name)} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors" title="Liquidar"><CheckCircle size={16} /></button>
                                                                <button onClick={() => handleLiberarReparto(route.name)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Liberar Ruta"><Trash2 size={16} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'historial' && (
                        <div className="space-y-4">
                            {liquidaciones.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 bg-[var(--card)] rounded-2xl border border-[var(--border)]">
                                    No hay liquidaciones en el historial.
                                </div>
                            ) : (
                                liquidaciones.map((liq) => (
                                    <SettlementHistoryCard
                                        key={liq.id}
                                        liquidacion={liq}
                                        onRevert={async () => {
                                            if (!confirm(`¿Estás seguro de REVERTIR la liquidación ${liq.id}? Esto restaurará los estados de los pedidos y borrará este registro.`)) return;
                                            try {
                                                // --- RECUPERACIÓN DE DATOS ---
                                                // Restauramos el borrador en LocalStorage y Nube para que el usuario pueda seguir editando
                                                if (liq.DRAFT_JSON && liq.REPARTO) {
                                                    const draftData = JSON.parse(liq.DRAFT_JSON);
                                                    draftData.updatedAt = new Date().toISOString();
                                                    localStorage.setItem(`wanda_settlement_${liq.REPARTO} `, JSON.stringify(draftData));
                                                    await wandaApi.saveSettlementDraft(liq.REPARTO, draftData);
                                                }

                                                const res = await wandaApi.revertLiquidacion(liq.id);
                                                if (res.result === 'OK') {
                                                    alert("Liquidación revertida con éxito. Los datos han sido restaurados y sincronizados en 'Rendir Ruta'.");
                                                    refreshData(true);
                                                } else {
                                                    alert("Error al revertir: " + JSON.stringify(res));
                                                }
                                            } catch (e) {
                                                alert("Error de conexión");
                                            }
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'comisiones' && (() => {
                        const filteredLiqs = liquidaciones.filter(l => {
                            const date = l.FECHA_SISTEMA || l.FECHA;
                            return date >= commsDateRange.start && date <= commsDateRange.end;
                        });

                        const driverComms: Record<string, { totalDelivered: number, count: number, fixed: number, var: number, final: number }> = {};
                        const sellerComms: Record<string, { totalDelivered: number, var: number, final: number }> = {};

                        filteredLiqs.forEach(liq => {
                            const driver = liq.CHOFER || "Sin Chofer";
                            if (!driverComms[driver]) driverComms[driver] = { totalDelivered: 0, count: 0, fixed: 0, var: 0, final: 0 };

                            let ords: any[] = [];
                            try {
                                const wrapper = JSON.parse(liq.ORDENES_JSON || '{}');
                                ords = wrapper.ordenes || [];
                            } catch (e) { }

                            ords.forEach((o: any) => {
                                if (o.estado === 'Entregado' || o.estado === 'Parcial') {
                                    const total = parseFloat(String(o.total).replace(',', '.')) || 0;
                                    driverComms[driver].totalDelivered += total;
                                    driverComms[driver].count += 1;

                                    const seller = o.vendedor || "Sin Vendedor";
                                    if (!sellerComms[seller]) sellerComms[seller] = { totalDelivered: 0, var: 0, final: 0 };
                                    sellerComms[seller].totalDelivered += total;
                                }
                            });
                        });

                        // Calculate totals
                        Object.keys(driverComms).forEach(d => {
                            const c = driverComms[d];
                            c.fixed = c.count * commissionParams.fijo_entrega;
                            c.var = (c.totalDelivered * commissionParams.pct_chofer) / 100;
                            c.final = c.fixed + c.var;
                        });

                        Object.keys(sellerComms).forEach(s => {
                            const c = sellerComms[s];
                            c.var = (c.totalDelivered * commissionParams.pct_preventista) / 100;
                            c.final = c.var;
                        });

                        return (
                            <div className="space-y-8 pb-10">
                                {/* Parameters & Filters */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm">
                                    <div className="md:col-span-2 grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Inicio</label>
                                            <input
                                                type="date"
                                                value={commsDateRange.start}
                                                onChange={e => setCommsDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl text-xs font-bold font-mono"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Fin</label>
                                            <input
                                                type="date"
                                                value={commsDateRange.end}
                                                onChange={e => setCommsDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl text-xs font-bold font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-indigo-500 uppercase flex justify-between">
                                            % Chofer <span>{commissionParams.pct_chofer}%</span>
                                        </label>
                                        <input
                                            type="range" min="0" max="10" step="0.1"
                                            value={commissionParams.pct_chofer}
                                            onChange={e => setCommissionParams(prev => ({ ...prev, pct_chofer: parseFloat(e.target.value) }))}
                                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-emerald-500 uppercase flex justify-between">
                                            % Ventas <span>{commissionParams.pct_preventista}%</span>
                                        </label>
                                        <input
                                            type="range" min="0" max="10" step="0.1"
                                            value={commissionParams.pct_preventista}
                                            onChange={e => setCommissionParams(prev => ({ ...prev, pct_preventista: parseFloat(e.target.value) }))}
                                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        />
                                    </div>
                                    <div className="md:col-start-3 space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">
                                            Fijo x Entrega <span>${commissionParams.fijo_entrega}</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={commissionParams.fijo_entrega}
                                            onChange={e => setCommissionParams(prev => ({ ...prev, fijo_entrega: parseInt(e.target.value) || 0 }))}
                                            className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl text-xs font-bold"
                                        />
                                    </div>
                                </div>

                                {/* Results Tables */}
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    {/* DRIVERS */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                                            <Truck size={16} /> Choferes / Reparto
                                        </h3>
                                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-[var(--border)]">
                                                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                        <th className="p-4">Chofer</th>
                                                        <th className="p-4 text-center">Entregas</th>
                                                        <th className="p-4 text-right">Total Entregado</th>
                                                        <th className="p-4 text-right">Comisión</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {Object.entries(driverComms).map(([name, data]) => (
                                                        <tr key={name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <td className="p-4">
                                                                <div className="font-bold text-xs">{name}</div>
                                                            </td>
                                                            <td className="p-4 text-center font-black text-[10px] text-slate-400">
                                                                {data.count}
                                                            </td>
                                                            <td className="p-4 text-right font-bold text-xs">
                                                                ${data.totalDelivered.toLocaleString()}
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <div className="font-black text-indigo-600">${Math.round(data.final).toLocaleString()}</div>
                                                                <div className="text-[8px] text-slate-400 font-bold uppercase">
                                                                    Fijo ${data.fixed.toLocaleString()} + Var ${Math.round(data.var).toLocaleString()}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {Object.keys(driverComms).length === 0 && (
                                                        <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-bold text-xs italic">No hay datos en este rango</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* PREVENTISTAS */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                            <User size={16} /> Preventistas / Ventas
                                        </h3>
                                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-[var(--border)]">
                                                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                        <th className="p-4">Vendedor</th>
                                                        <th className="p-4 text-right">Monto Entregado</th>
                                                        <th className="p-4 text-right">Comisión</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {Object.entries(sellerComms).map(([name, data]) => (
                                                        <tr key={name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <td className="p-4">
                                                                <div className="font-bold text-xs">{name}</div>
                                                            </td>
                                                            <td className="p-4 text-right font-bold text-xs">
                                                                ${data.totalDelivered.toLocaleString()}
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <div className="font-black text-emerald-600">${Math.round(data.final).toLocaleString()}</div>
                                                                <div className="text-[8px] text-slate-400 font-bold uppercase">
                                                                    Calculado al {commissionParams.pct_preventista}%
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {Object.keys(sellerComms).length === 0 && (
                                                        <tr><td colSpan={3} className="p-8 text-center text-slate-400 font-bold text-xs italic">No hay datos en este rango</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {activeTab === 'resumenes' && (
                        <div className="space-y-6">
                            <div className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-3xl shadow-sm space-y-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Selección de Repartos</h3>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Elige los repartos para agrupar en el resumen mensual/semanal</p>
                                    </div>
                                    <div className="relative w-full md:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Buscar liquidación..."
                                            value={summarySearch}
                                            onChange={(e) => setSummarySearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-2 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-[var(--border)]">
                                    {liquidaciones
                                        .filter(l => !summarySearch || normalizeText(l.REPARTO).includes(normalizeText(summarySearch)) || normalizeText(l.CHOFER).includes(normalizeText(summarySearch)))
                                        .sort((a, b) => b.FECHA.localeCompare(a.FECHA))
                                        .map(liq => (
                                            <div
                                                key={liq.id}
                                                onClick={() => {
                                                    setSelectedSettlementsSummary(prev =>
                                                        prev.includes(liq.id) ? prev.filter(id => id !== liq.id) : [...prev, liq.id]
                                                    );
                                                }}
                                                className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedSettlementsSummary.includes(liq.id) ? 'border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-200'} `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${selectedSettlementsSummary.includes(liq.id) ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'border-slate-300 bg-white'} `}>
                                                        {selectedSettlementsSummary.includes(liq.id) && <Check size={10} strokeWidth={4} />}
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black uppercase truncate max-w-[120px]">{liq.REPARTO}</div>
                                                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                                            {new Date(liq.FECHA).toLocaleDateString()} • {liq.CHOFER || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[9px] font-black text-amber-600">${(liq.TOTAL_NETO || 0).toLocaleString()}</div>
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                {selectedSettlementsSummary.length > 0 && (
                                    <div className="pt-6 border-t border-[var(--border)] space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex justify-between items-end">
                                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Vista Previa del Resumen</h4>
                                            <button
                                                onClick={() => handlePrintWeeklySummary(liquidaciones.filter(l => selectedSettlementsSummary.includes(l.id)))}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                                            >
                                                <Printer size={14} /> Imprimir Resumen ({selectedSettlementsSummary.length})
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-[var(--border)]">
                                                    <tr>
                                                        <th className="p-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Reparto / Fecha</th>
                                                        <th className="p-3 font-black text-slate-400 uppercase tracking-widest text-[9px] text-right">Efectivo</th>
                                                        <th className="p-3 font-black text-slate-400 uppercase tracking-widest text-[9px] text-right">MP / Transf</th>
                                                        <th className="p-3 font-black text-slate-400 uppercase tracking-widest text-[9px] text-right">Cta Cte</th>
                                                        <th className="p-3 font-black text-slate-400 uppercase tracking-widest text-[9px] text-right">Gastos</th>
                                                        <th className="p-3 font-black text-slate-400 uppercase tracking-widest text-[9px] text-right">Devoluciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {liquidaciones
                                                        .filter(l => selectedSettlementsSummary.includes(l.id))
                                                        .map(l => (
                                                            <tr key={l.id} className="hover:bg-amber-500/5 transition-colors">
                                                                <td className="p-3">
                                                                    <div className="font-extrabold text-slate-900 dark:text-slate-100">{l.REPARTO}</div>
                                                                    <div className="text-[9px] text-slate-400 font-bold uppercase">{new Date(l.FECHA).toLocaleDateString()}</div>
                                                                </td>
                                                                <td className="p-3 text-right font-black text-slate-700 dark:text-slate-300">
                                                                    ${(l.EFECTIVO || 0).toLocaleString()}
                                                                </td>
                                                                <td className="p-3 text-right font-black text-indigo-600">
                                                                    ${(l.TRANSF || 0).toLocaleString()}
                                                                </td>
                                                                <td className="p-3 text-right font-black text-amber-600">
                                                                    ${(l.CUENTAS_CORRIENTES || 0).toLocaleString()}
                                                                </td>
                                                                <td className="p-3 text-right font-black text-orange-600">
                                                                    ${(l.GASTOS || 0).toLocaleString()}
                                                                </td>
                                                                <td className="p-3 text-right font-black text-rose-600">
                                                                    ${(l.DEVOLUCIONES || 0).toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                                <tfoot className="bg-slate-900 text-white font-black uppercase tracking-widest text-[10px]">
                                                    <tr>
                                                        <td className="p-4">Totales Consolidados</td>
                                                        <td className="p-4 text-right">
                                                            ${liquidaciones.filter(l => selectedSettlementsSummary.includes(l.id)).reduce((acc, l) => acc + (l.EFECTIVO || 0), 0).toLocaleString()}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            ${liquidaciones.filter(l => selectedSettlementsSummary.includes(l.id)).reduce((acc, l) => acc + (l.TRANSF || 0), 0).toLocaleString()}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            ${liquidaciones.filter(l => selectedSettlementsSummary.includes(l.id)).reduce((acc, l) => acc + (l.CUENTAS_CORRIENTES || 0), 0).toLocaleString()}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            ${liquidaciones.filter(l => selectedSettlementsSummary.includes(l.id)).reduce((acc, l) => acc + (l.GASTOS || 0), 0).toLocaleString()}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            ${liquidaciones.filter(l => selectedSettlementsSummary.includes(l.id)).reduce((acc, l) => acc + (l.DEVOLUCIONES || 0), 0).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {selectedSettlementsSummary.length === 0 && (
                                    <div className="p-20 text-center space-y-4">
                                        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-600">
                                            <Layers size={40} />
                                        </div>
                                        <div className="max-w-xs mx-auto">
                                            <p className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Comienza seleccionando repartos</p>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                Marca los repartos en la lista superior para generar la tabla de resumen.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="tech-card border-indigo-500/20">
                        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                            <Info size={16} className="text-indigo-500" />
                            Estado General
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-[var(--border)]">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Sin Ruta</span>
                                <span className="font-black text-indigo-500">{allPendingOrders.length}</span>
                            </div>
                            <div className="flex justify-between items-center bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10">
                                <span className="text-[10px] font-bold text-indigo-500 uppercase">En Viaje</span>
                                <span className="font-black text-indigo-500">{orders.filter(o => o.estado === 'En Ruta').length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="tech-card">
                        <h3 className="font-bold text-sm mb-4">Picking List</h3>
                        <p className="text-[10px] text-slate-500 mb-4">Imprime el consolidado de carga para el depósito.</p>
                        <button className="w-full py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all">
                            <Printer size={14} /> Consolidado Total
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {editingRoute && (
                    <RouteManagerModal
                        key={`${editingRoute}_${refreshCounter} `}
                        routeName={editingRoute}
                        orders={orders.filter(o => o.reparto === editingRoute)}
                        clients={clients}
                        products={products}
                        config={data?.config}
                        onClose={() => setEditingRoute(null)}
                        onRefresh={async () => {
                            await refreshData(true);
                            setRefreshCounter(prev => prev + 1);
                        }}

                        onPrintOrder={(id: string) => {
                            const orderToPrint = orders.find(o => o.id === id);
                            if (orderToPrint) printOrders([orderToPrint]);
                        }}
                        onPrintRemitos={(ordersToPrint) => printOrders(ordersToPrint)}
                        onPrintPickingList={(ordersToPrint, name) => printPickingList(ordersToPrint, name)}
                        onPrintRouteSheet={(ordersToPrint, name) => printRouteSheet(ordersToPrint, name)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAssignModal && (
                    <AssignRouteModal
                        recentRoutes={recentRoutes}
                        onClose={() => setShowAssignModal(false)}
                        onSubmit={submitRouteAssignment}
                        initialValue={assignRouteName}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {viewingDetailId && (() => {
                    const currentIndex = filteredPendingOrders.findIndex((o: any) => o.id === viewingDetailId);
                    const hasPrev = currentIndex > 0;
                    const hasNext = currentIndex !== -1 && currentIndex < filteredPendingOrders.length - 1;

                    return (
                        <OrderDetailModal
                            order={orders.find((o: any) => o.id === viewingDetailId)}
                            products={products}
                            clients={clients}
                            config={data?.config}
                            onClose={() => setViewingDetailId(null)}
                            onPrint={() => printOrders([orders.find((o: any) => o.id === viewingDetailId)])}
                            onUpdateOrder={handleUpdatePendingOrder}
                            onNavigatePrev={hasPrev ? () => setViewingDetailId(filteredPendingOrders[currentIndex - 1].id) : undefined}
                            onNavigateNext={hasNext ? () => setViewingDetailId(filteredPendingOrders[currentIndex + 1].id) : undefined}
                        />
                    );
                })()}
            </AnimatePresence>

            <AnimatePresence>
                {viewingOrdersRoute && (
                    <RouteOrdersModal
                        routeName={viewingOrdersRoute}
                        orders={orders.filter(o => o.reparto === viewingOrdersRoute)}
                        onClose={() => setViewingOrdersRoute(null)}
                        onRemoveOrder={handleQuitarPedidoDeRuta}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {settlingRoute && (
                    <RouteSettlementModal
                        routeName={settlingRoute}
                        orders={orders.filter(o => o.reparto === settlingRoute)}
                        products={products}
                        onClose={() => setSettlingRoute(null)}
                        onRefresh={refreshData}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}


function AssignRouteModal({ recentRoutes, onClose, onSubmit, initialValue }: {
    recentRoutes: string[];
    onClose: () => void;
    onSubmit: (name: string) => void;
    initialValue: string;
}) {
    const [routeName, setRouteName] = useState(initialValue);
    const [searchTerm, setSearchTerm] = useState("");
    const [showOptions, setShowOptions] = useState(false);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return recentRoutes;
        return recentRoutes.filter(r => r.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [recentRoutes, searchTerm]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-[var(--border)]"
            >
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Truck size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-lg">Asignar Ruta</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chofer / Vehículo / Recorrido</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nombre de la Ruta</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={routeName}
                                    onChange={(e) => {
                                        setRouteName(e.target.value);
                                        setSearchTerm(e.target.value);
                                        setShowOptions(true);
                                    }}
                                    onFocus={() => setShowOptions(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && routeName.trim()) {
                                            e.preventDefault();
                                            onSubmit(routeName);
                                        }
                                    }}
                                    placeholder="Escriba o seleccione..."
                                    className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-[var(--border)] rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                                <ChevronDown
                                    size={18}
                                    className={`absolute right - 3 top - 1 / 2 - translate - y - 1 / 2 text - slate - 400 transition - transform ${showOptions ? 'rotate-180' : ''} `}
                                    onClick={() => setShowOptions(!showOptions)}
                                />
                            </div>

                            <AnimatePresence>
                                {showOptions && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                                    >
                                        <div className="p-1">
                                            {filteredOptions.length > 0 ? (
                                                filteredOptions.map((opt, i) => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => {
                                                            setRouteName(opt);
                                                            setShowOptions(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-500 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-between group"
                                                    >
                                                        <span>{opt}</span>
                                                        {i === 0 && !searchTerm && (
                                                            <span className="text-[8px] bg-indigo-500 text-white px-2 py-0.5 rounded-full group-hover:bg-white group-hover:text-indigo-500">ÚLTIMA</span>
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <button
                                                    onClick={() => onSubmit(routeName)}
                                                    className="w-full text-left px-4 py-3 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 group"
                                                >
                                                    <Plus size={14} className="group-hover:scale-110 transition-transform" />
                                                    Crear ruta nueva: <span className="font-black">"{routeName}"</span>
                                                    <span className="ml-auto text-[8px] opacity-50 uppercase tracking-widest hidden sm:block">o presione Enter</span>
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-500/5 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/10">
                            <div className="flex gap-3">
                                <Info size={16} className="text-indigo-500 shrink-0" />
                                <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 leading-normal uppercase">
                                    Al asignar a una ruta existente, los pedidos nuevos se sumarán a la hoja de ruta actual.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onSubmit(routeName)}
                            disabled={!routeName.trim()}
                            className="flex-2 py-3 px-8 bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none"
                        >
                            Confirmar Asignación
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}


function ProductReplaceModal({ products, onClose, onSelect, currentProductName, initialQty }: {
    products: any[];
    onClose: () => void;
    onSelect: (p: any, qty: number) => void;
    currentProductName: string;
    initialQty: number;
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [qty, setQty] = useState(initialQty);

    const filtered = useMemo(() => {
        if (searchTerm.length < 2) return [];
        return products.filter((p: any) =>
            smartSearch(p.Nombre || "", searchTerm) ||
            smartSearch(String(p.ID_Producto || ""), searchTerm)
        ).slice(0, 10);
    }, [products, searchTerm]);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden shadow-indigo-500/10 border border-[var(--border)]"
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                                <RotateCcw size={20} />
                            </div>
                            <div>
                                <h4 className="font-black text-lg">{selectedProduct ? 'Ajustar Cantidad' : 'Reemplazar Producto'}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Original: {currentProductName}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                            <X size={20} />
                        </button>
                    </div>

                    {!selectedProduct ? (
                        <>
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Buscar producto por nombre o ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {searchTerm.length < 2 ? (
                                    <div className="p-12 text-center">
                                        <Package className="mx-auto text-slate-200 mb-2" size={40} />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Escribe al menos 2 letras...</p>
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <AlertCircle className="mx-auto text-rose-200 mb-2" size={40} />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No se encontraron productos</p>
                                    </div>
                                ) : (
                                    filtered.map((p) => (
                                        <button
                                            key={p.ID_Producto}
                                            onClick={() => setSelectedProduct(p)}
                                            className="w-full p-4 flex justify-between items-center bg-white dark:bg-slate-800 border border-[var(--border)] rounded-2xl hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/10 transition-all text-left group"
                                        >
                                            <div>
                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-500 transition-colors">{p.Nombre}</p>
                                                <div className="flex gap-3 items-center mt-1">
                                                    <span className="text-[10px] text-slate-400 font-mono tracking-tighter">ID: {p.ID_Producto}</span>
                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">${parseFloat(String(p.Precio_Unitario || "0").replace(',', '.')).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Nuevo Producto Seleccionado</p>
                                <p className="font-bold text-slate-800 dark:text-slate-100">{selectedProduct.Nombre}</p>
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Cantidad a entregar</label>
                                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-2 rounded-3xl border border-[var(--border)] shadow-inner">
                                    <button
                                        onClick={() => setQty(q => Math.max(0, q - 1))}
                                        className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-600 hover:text-indigo-500 active:scale-95 transition-all text-xl font-black"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={qty}
                                        onChange={(e) => setQty(parseFloat(e.target.value.replace(',', '.')) || 0)}
                                        className="w-24 text-center bg-transparent text-2xl font-black outline-none"
                                    />
                                    <button
                                        onClick={() => setQty(q => q + 1)}
                                        className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-600 hover:text-indigo-500 active:scale-95 transition-all text-xl font-black"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-2xl transition-all"
                                >
                                    Volver a Buscar
                                </button>
                                <button
                                    onClick={() => onSelect(selectedProduct, qty)}
                                    className="flex-[2] py-4 bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                                >
                                    Confirmar Reemplazo
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

function RouteManagerModal({ routeName, orders, clients, products, config, onClose, onRefresh, onPrintOrder, onPrintRemitos, onPrintPickingList, onPrintRouteSheet }: {
    routeName: string;
    orders: any[];
    clients: any[];
    products: any[];
    config: any;
    onClose: () => void;
    onRefresh: () => void;
    onPrintOrder: (id: string) => void;
    onPrintRemitos: (orders: any[]) => void;
    onPrintPickingList: (orders: any[], name: string) => void;
    onPrintRouteSheet: (orders: any[], name: string) => void;
}) {
    const { setIsSyncing, isSyncing } = useData();
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
    const [localOrders, setLocalOrders] = useState(() => {
        const _orders = JSON.parse(JSON.stringify(orders));
        _orders.forEach((o: any) => {
            if (o.items) {
                o.items.forEach((item: any) => {
                    item._formato = item._formato || item.formato || 'UNID';
                });
            }
        });
        return _orders;
    });
    const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
    const [orderDetailId, setOrderDetailId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<"consolidated" | "orders">("orders");
    const [consolidationFilter, setConsolidationFilter] = useState<'all' | 'pesables' | 'no-pesables'>('all');
    const [replacingItem, setReplacingItem] = useState<{ orderId: string, itemIdx: number, currentName: string, currentQty: number } | null>(null);

    const consolidated = useMemo(() => {
        const map: Record<string, any> = {};
        localOrders.forEach((order: any) => {
            (order.items || []).forEach((item: any, idx: number) => {
                const key = item.id_prod || item.id_producto || item.id || item.nombre;
                // Intento buscar por ID, y si falla busco por nombre (para pedidos importados con IDs viejos)
                let product = products.find((p: any) => String(p.ID_Producto) === String(key));
                if (!product && item.nombre) {
                    product = products.find((p: any) => String(p.Nombre).trim().toLowerCase() === String(item.nombre).trim().toLowerCase());
                }

                const isKg = (product?.Unidad || '').toLowerCase() === 'kg';
                const baseUnit = String(product?.Unidad || 'UNID').toUpperCase();
                const rawUb = product?.UB ?? product?.Unidades_Bulto;
                const ub = (!rawUb || String(rawUb).trim() === '' || isNaN(parseFloat(String(rawUb).replace(',', '.'))) || parseFloat(String(rawUb).replace(',', '.')) === 0) ? 1 : parseFloat(String(rawUb).replace(',', '.'));

                if (!map[key]) {
                    map[key] = {
                        id_prod: item.id_prod,
                        nombre: item.nombre,
                        totalQty: 0,
                        totalPrice: 0,
                        isKg,
                        ub,
                        baseUnit,
                        deliveries: []
                    };
                }

                let qtyInUnits = parseFloat(String(item.cantidad).replace(',', '.')) || 0;
                const isDetalleBulto = String(item.detalle || item.nombre || '').toUpperCase().includes('BULTO');
                const formatVal = String(item._formato || item.formato || (isDetalleBulto ? 'BULTO' : '')).toUpperCase();
                // Si el item viene marcado como bulto en el objeto (aunque intentemos normalizar), multiplicamos
                if (formatVal === 'BULTO' && ub > 1) qtyInUnits *= ub;

                const itemPrice = parseFloat(item.precio) || 0;
                const itemDiscPercent = parseFloat(item.descuento || 0);
                const itemSubtotalGross = qtyInUnits * itemPrice;
                const subtotal = itemSubtotalGross * (1 - itemDiscPercent / 100);

                map[key].totalQty += qtyInUnits;
                map[key].totalPrice += subtotal;

                const pesoPromedio = parseFloat(product?.Peso || product?.Peso_Promedio || 0);

                map[key].deliveries.push({
                    orderId: order.id,
                    itemIdx: idx,
                    cliente: order.cliente_nombre,
                    cantidadVenta: qtyInUnits, // Total en unidades para cálculos
                    cantidadVisual: parseFloat(item.cantidad) || 0, // Lo que se ve en el input
                    precioCatalogo: parseFloat(product?.Precio_Unitario || item.precio),
                    pesoPromedio,
                    isKg,
                    ub,
                    baseUnit,
                    precio: item.precio,
                    descuento: item.descuento || 0,
                    formato: item._formato || item.formato || (String(item.detalle || '').toUpperCase().includes('BULTO') ? 'BULTO' : 'UNID')
                });
            });
        });
        return Object.values(map).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
    }, [localOrders, products]);

    const filteredConsolidated = useMemo(() => {
        return consolidated.filter((prod: any) => {
            const matchesSearch = smartSearch(prod.nombre, searchTerm) ||
                prod.deliveries.some((d: any) => smartSearch(d.cliente, searchTerm));

            if (!matchesSearch) return false;

            if (consolidationFilter === 'pesables') return prod.isKg;
            if (consolidationFilter === 'no-pesables') return !prod.isKg;
            return true;
        });
    }, [consolidated, searchTerm, consolidationFilter]);

    const filteredOrders = useMemo(() => {
        return localOrders.filter((order: any) =>
            smartSearch(order.cliente_nombre || "", searchTerm) ||
            smartSearch(order.id || "", searchTerm) ||
            (order.items || []).some((it: any) => smartSearch(it.nombre || "", searchTerm))
        );
    }, [localOrders, searchTerm]);

    const formatQtyWithBultos = (qty: number, ub: number, isKg: boolean, baseUnit: string) => {
        if (isKg) return `${qty.toFixed(2)} Kg`;
        const unitLabel = baseUnit.toUpperCase().startsWith('UNID') || baseUnit.toUpperCase() === 'U' ? 'U' : baseUnit;
        if (ub <= 1) return `${qty} ${unitLabel} `;
        const bul = Math.floor(qty / ub);
        const uni = Math.round((qty % ub) * 100) / 100;
        if (bul === 0) return `${uni} ${unitLabel} `;
        if (uni === 0) return `${bul} BUL`;
        return `${bul} BUL + ${uni} ${unitLabel} `;
    };

    const totalRuta = useMemo(() => {
        return localOrders.reduce((acc: number, o: any) => acc + (parseFloat(o.total) || 0), 0);
    }, [localOrders]);

    const toggleProduct = (id: string) => {
        setExpandedProduct(prev => (prev === id ? null : id));
    };

    const handleShareWhatsApp = () => {
        let msg = `🚚 * HOJA DE RUTA: ${routeName}*\n🗓️ ${new Date().toLocaleDateString()} \n\n`;
        const uniqueClients = [...new Set(localOrders.map((o: any) => o.cliente_nombre))];

        uniqueClients.forEach((cn, i) => {
            const client = clients.find((c: any) => c.Nombre_Negocio === cn) || {};
            const dir = client.Direccion ? `${client.Direccion}, ${client.Zona || ''} `.trim() : 'Sin dirección';
            msg += `* ${i + 1}. ${cn}*\n🏠 ${dir} \n📞 ${client.Telefono || 'N/A'} \n\n`;
        });

        const stops = localOrders.map((o: any) => {
            const c = clients.find((cl: any) => cl.Nombre_Negocio === o.cliente_nombre) || {};
            return c.Direccion ? encodeURIComponent(c.Direccion) : null;
        }).filter(Boolean);

        if (stops.length > 0) {
            msg += `🗺️ * Recorrido Google Maps:*\nhttps://www.google.com/maps/dir//${stops.join('/')}\n`;
        }

        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleUpdateItem = (orderId: string, itemIdx: number, updates: any) => {
        setLocalOrders((prev: any) => prev.map((order: any) => {
            if (order.id !== orderId) return order;
            const newItems = order.items.map((it: any, idx: number) => {
                if (idx !== itemIdx) return it;
                const nextItem = { ...it, ...updates };
                const nextCant = parseFloat(String(nextItem.cantidad).replace(',', '.')) || 0;
                const nextPrice = parseFloat(String(nextItem.precio).replace(',', '.')) || 0;
                const sub = nextCant * nextPrice;
                const descPercent = parseFloat(String(nextItem.descuento || 0).replace(',', '.')) || 0;
                nextItem.subtotal = sub * (1 - descPercent / 100);
                return nextItem;
            });

            const newTotal = newItems.reduce((acc: number, i: any) => acc + (parseFloat(String(i.subtotal).replace(',', '.')) || 0), 0);
            const globalDiscPercent = parseFloat(String(order.descuento_general || 0).replace(',', '.')) || 0;
            return { ...order, items: newItems, total: newTotal * (1 - globalDiscPercent / 100), _editado: true };
        }));
    };

    const handleToggleFormatoItem = (orderId: string, itemIdx: number) => {
        setLocalOrders((prev: any) => prev.map((order: any) => {
            if (order.id !== orderId) return order;
            const newItems = order.items.map((it: any, idx: number) => {
                if (idx !== itemIdx) return it;

                const pid = it.id_prod || it.id_producto || it.id;
                let product = products.find((p: any) => String(p.ID_Producto) === String(pid));
                if (!product && it.nombre) {
                    product = products.find((p: any) => String(p.Nombre || '').trim().toLowerCase() === String(it.nombre).trim().toLowerCase());
                }
                if (!product) return it;

                const rawUb = product.UB || product.Unidades_Bulto || "1";
                const ub = parseFloat(String(rawUb).replace(',', '.')) || 1;
                const isKg = (product.Unidad || '').toLowerCase() === 'kg';
                if (isKg) return it;

                const isDetalleBulto = String(it.detalle || it.nombre || '').toUpperCase().includes('BULTO');
                const formatVal = String(it._formato || it.formato || (isDetalleBulto ? 'BULTO' : '')).toUpperCase();
                const isBulto = formatVal === 'BULTO';

                const currentPrice = parseFloat(String(it.precio).replace(',', '.')) || 0;
                const currentQty = parseFloat(String(it.cantidad).replace(',', '.')) || 0;

                let nextItem = { ...it };
                if (isBulto) {
                    nextItem._formato = 'UNID';
                    nextItem.precio = currentPrice / ub;
                    nextItem.cantidad = currentQty * ub;
                } else {
                    nextItem._formato = 'BULTO';
                    nextItem.precio = currentPrice * ub;
                    nextItem.cantidad = currentQty / ub;
                }

                // Recalcular subtotal del item
                const nextCant = parseFloat(String(nextItem.cantidad)) || 0;
                const nextPrice = parseFloat(String(nextItem.precio)) || 0;
                const descPercent = parseFloat(String(nextItem.descuento || 0)) || 0;
                nextItem.subtotal = (nextCant * nextPrice) * (1 - descPercent / 100);

                return nextItem;
            });

            const newTotal = newItems.reduce((acc: number, i: any) => acc + (parseFloat(String(i.subtotal)) || 0), 0);
            const globalDiscPercent = parseFloat(String(order.descuento_general || 0)) || 0;
            return { ...order, items: newItems, total: newTotal * (1 - globalDiscPercent / 100), _editado: true };
        }));
    };


    const handleReplaceProductItem = (orderId: string, itemIdx: number, newProduct: any, newQty: number) => {
        const newPrice = parseFloat(String(newProduct.Precio_Unitario || "0").replace(',', '.')) || 0;
        const rawUb = newProduct.UB || newProduct.Unidades_Bulto || "1";
        const newUb = parseFloat(String(rawUb).replace(',', '.')) || 1;

        const order = localOrders.find((o: any) => o.id === orderId);
        const item = order?.items[itemIdx];
        if (!item) return;

        const isDetalleBulto = String(item.detalle || item.nombre || '').toUpperCase().includes('BULTO');
        const formatVal = String(item._formato || item.formato || (isDetalleBulto ? 'BULTO' : '')).toUpperCase();
        const isBulto = formatVal === 'BULTO';

        const finalPrice = isBulto && newUb > 1 ? newPrice * newUb : newPrice;

        handleUpdateItem(orderId, itemIdx, {
            id_prod: newProduct.ID_Producto,
            id_producto: newProduct.ID_Producto,
            nombre: newProduct.Nombre,
            precio: finalPrice,
            cantidad: newQty,
            _formato: isBulto ? 'BULTO' : 'UNID'
        });

        setReplacingItem(null);
    };


    const handleSave = async () => {
        const edited = localOrders.filter((o: any) => o._editado);
        if (edited.length === 0) return onClose();

        try {
            setIsSyncing(true);
            for (const order of edited) {
                // Normalizamos los items para que el backend siempre reciba UNIDADES
                // Esto evita que el stock se descuente mal si se guardó como BULTO
                const normalizedOrder = {
                    ...order,
                    items: order.items.map((it: any) => {
                        if (it._formato === 'BULTO') {
                            const product = products.find((p: any) => String(p.ID_Producto) === String(it.id_prod));
                            const rawUb = product?.UB || product?.Unidades_Bulto || "1";
                            const ub = parseFloat(String(rawUb).replace(',', '.'));
                            return {
                                ...it,
                                cantidad: (parseFloat(it.cantidad) || 0) * ub,
                                precio: (parseFloat(it.precio) || 0) / ub,
                                _formato: 'UNID'
                            };
                        }
                        return it;
                    })
                };
                await wandaApi.saveOrderCorrection(normalizedOrder);
            }
            alert("Cambios guardados con éxito.");
            await onRefresh();
            onClose();
        } catch (err) {
            alert("Error al guardar cambios");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
                <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-slate-100 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-xl font-black">Gestionar Ruta: {routeName}</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{localOrders.length} pedidos • Total: ${totalRuta.toLocaleString()}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-4">
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        <button onClick={handleShareWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/10 hover:brightness-110 active:scale-95 transition-all">
                            <MessageCircle size={16} /> WhatsApp Chofer
                        </button>
                        <button
                            onClick={() => onPrintPickingList(localOrders, routeName)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 active:scale-95 transition-all"
                        >
                            <Printer size={16} /> Picking List
                        </button>
                        <button
                            onClick={() => onPrintRouteSheet(localOrders, routeName)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black hover:bg-slate-50 active:scale-95 transition-all"
                        >
                            <Copy size={16} /> Hoja de Ruta
                        </button>
                        <button
                            onClick={() => onPrintRemitos(localOrders)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-black hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-500/10"
                        >
                            <Printer size={16} /> Remitos de Ruta
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder={viewMode === 'consolidated' ? "Buscar por producto o por cliente..." : "Buscar por cliente, comprobante o producto..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm text-slate-800 dark:text-slate-100"
                            />
                        </div>
                        <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-2xl p-1 shrink-0 h-[46px]">
                            <button
                                onClick={() => setViewMode('orders')}
                                className={`flex-1 px-4 py-1 text-xs font-bold rounded-xl transition-all ${viewMode === 'orders' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Pedidos (${localOrders.length})
                            </button>
                            <button
                                onClick={() => setViewMode('consolidated')}
                                className={`flex-1 px-4 py-1 text-xs font-bold rounded-xl transition-all ${viewMode === 'consolidated' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Consolidados
                            </button>
                        </div>
                    </div>

                    {viewMode === 'consolidated' && (
                        <div className="flex gap-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            {[
                                { id: 'all', label: 'Todos', icon: Package },
                                { id: 'pesables', label: 'Pesables', icon: Scale },
                                { id: 'no-pesables', label: 'No Pesables', icon: Box }
                            ].map((f) => {
                                const Icon = f.icon as any;
                                return (
                                    <button
                                        key={f.id}
                                        onClick={() => setConsolidationFilter(f.id as any)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${consolidationFilter === f.id ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 text-slate-500 border-[var(--border)] hover:border-slate-400'}`}
                                    >
                                        <Icon size={12} />
                                        {f.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="space-y-3">
                        {viewMode === 'consolidated' && (
                            filteredConsolidated.length === 0 ? (
                                <div className="text-center p-8 text-slate-400 font-bold">No se encontraron productos o clientes con esa búsqueda.</div>
                            ) : filteredConsolidated.map((prod: any) => {
                                const isExpanded = expandedProduct === (prod.id_prod || prod.nombre);
                                return (
                                    <div key={prod.id_prod || prod.nombre} className={`border rounded-2xl overflow-hidden transition-all ${isExpanded ? 'border-indigo-500 ring-4 ring-indigo-500/5' : 'border-[var(--border)]'}`}>
                                        <div
                                            onClick={() => toggleProduct(prod.id_prod || prod.nombre)}
                                            className={`p-4 flex justify-between items-center cursor-pointer ${isExpanded ? 'bg-indigo-50 dark:bg-indigo-500/5' : 'bg-white dark:bg-slate-800'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {isExpanded ? <ChevronUp size={16} className="text-indigo-500" /> : <ChevronDown size={16} className="text-slate-400" />}
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">{prod.nombre}</span>
                                                    {prod.isKg && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Producto Pesable (Kg)</span>}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-black text-sm text-indigo-600">
                                                    {formatQtyWithBultos(prod.totalQty, prod.ub, prod.isKg, prod.baseUnit)}
                                                </span>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="bg-slate-50 dark:bg-slate-900/30 divide-y divide-[var(--border)]">
                                                {prod.deliveries.map((delivery: any, idx: number) => {
                                                    const order = localOrders.find((o: any) => o.id === delivery.orderId);
                                                    const item = order?.items[delivery.itemIdx];
                                                    const itemPrice = parseFloat(item?.precio || 0);
                                                    const itemDiscount = parseFloat(item?.descuento || 0);
                                                    const itemQty = parseFloat(item?.cantidad || 0);

                                                    return (
                                                        <div key={idx} className="p-4 flex justify-between items-center bg-white dark:bg-transparent">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">
                                                                        {idx + 1}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-xs">{delivery.cliente}</p>
                                                                        <div className="flex items-center gap-3 mt-1">
                                                                            <span className="text-[10px] text-slate-400 font-mono tracking-tighter">#{order.id}</span>
                                                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{order.vendedor}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {order.notas && (
                                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1.5 flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-500/20">
                                                                        <Info size={10} /> {order.notas}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-6">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex flex-col items-end mr-2">
                                                                        <label className="text-[8px] font-black text-slate-400 uppercase">Cantidad</label>
                                                                        <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 rounded-lg px-2 border border-slate-200 dark:border-slate-700 h-8">
                                                                            <input
                                                                                type="text"
                                                                                inputMode="decimal"
                                                                                value={rawInputs[`${delivery.orderId}_${delivery.itemIdx}_qty`] ?? delivery.cantidadVisual}
                                                                                onChange={(e) => {
                                                                                    const valStr = e.target.value;
                                                                                    setRawInputs(prev => ({ ...prev, [`${delivery.orderId}_${delivery.itemIdx}_qty`]: valStr }));
                                                                                    const valNum = parseFloat(valStr.replace(',', '.'));
                                                                                    if (!isNaN(valNum)) handleUpdateItem(delivery.orderId, delivery.itemIdx, { cantidad: valNum });
                                                                                }}
                                                                                onBlur={() => setRawInputs(prev => {
                                                                                    const next = { ...prev };
                                                                                    delete next[`${delivery.orderId}_${delivery.itemIdx}_qty`];
                                                                                    return next;
                                                                                })}
                                                                                className="w-12 text-center font-black text-xs bg-transparent outline-none"
                                                                            />
                                                                            <button
                                                                                onClick={() => handleToggleFormatoItem(delivery.orderId, delivery.itemIdx)}
                                                                                className={`px-1 rounded text-[8px] font-black uppercase transition-all ${String(item?.formato || item?._formato || '').toUpperCase() === 'BULTO' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                                                                                title="Cambiar entre Bulto y Unidad"
                                                                            >
                                                                                {(String(item?.formato || item?._formato || '').toUpperCase() === 'BULTO' && delivery.ub > 1) ? 'BUL' : (delivery.isKg ? 'KG' : delivery.baseUnit)}
                                                                            </button>
                                                                        </div>

                                                                    </div>

                                                                    <div className="text-right">
                                                                        <label className="text-[8px] font-black text-slate-400 uppercase block">Subtotal</label>
                                                                        <p className="text-[11px] font-black text-indigo-600">
                                                                            ${(itemQty * itemPrice * (1 - itemDiscount / 100)).toLocaleString()}
                                                                        </p>
                                                                        {itemDiscount > 0 && <p className="text-[8px] font-black text-rose-500">-{itemDiscount}%</p>}
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setReplacingItem({
                                                                                orderId: delivery.orderId,
                                                                                itemIdx: delivery.itemIdx,
                                                                                currentName: item?.nombre || prod.nombre,
                                                                                currentQty: parseFloat(item?.cantidad) || 0
                                                                            });
                                                                        }}
                                                                        className="p-2 bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl transition-all"
                                                                        title="Reemplazar Producto"
                                                                    >
                                                                        <RotateCcw size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOrderDetailId(delivery.orderId);
                                                                        }}
                                                                        className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                                                                    >
                                                                        Edición Fina
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {prod.isKg && (
                                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/5 text-center border-t border-emerald-100">
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase">Espacio para Peso Real en Balanza disponible en Remito impreso</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            }))}

                        {viewMode === 'orders' && (
                            filteredOrders.length === 0 ? (
                                <div className="text-center p-8 text-slate-400 font-bold">No se encontraron pedidos con esa búsqueda.</div>
                            ) : filteredOrders.map((order: any) => (
                                <div key={order.id} className="border border-[var(--border)] bg-white dark:bg-slate-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-indigo-500 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-black text-lg text-slate-800 dark:text-slate-100">{order.cliente_nombre}</span>
                                            {order._editado && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">Editado</span>}
                                            {order.items?.length > 14 && <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1"><AlertCircle size={10} /> Remito Largo</span>}
                                        </div>
                                        <div className="text-xs text-slate-500 font-bold font-mono tracking-tight">#{order.id} • {order.items?.length || 0} ítems</div>
                                        {order.direccion && <div className="text-xs text-slate-500 mt-1">📍 {order.direccion}</div>}
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                                        <div className="text-right">
                                            <div className="text-[10px] font-black uppercase text-slate-400">Total a pagar</div>
                                            <div className="font-black text-lg text-indigo-600">${parseFloat(order.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onPrintRemitos([order])}
                                                className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-xl text-slate-500 hover:bg-slate-200 hover:text-indigo-600 transition-all"
                                                title="Imprimir Remito Individual"
                                            >
                                                <Printer size={18} />
                                            </button>
                                            <button
                                                onClick={() => setOrderDetailId(order.id)}
                                                className="px-5 py-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-sm whitespace-nowrap"
                                            >
                                                Ver / Editar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {orderDetailId && (() => {
                        const currentIndex = localOrders.findIndex((o: any) => o.id === orderDetailId);
                        const hasPrev = currentIndex > 0;
                        const hasNext = currentIndex !== -1 && currentIndex < localOrders.length - 1;

                        return (
                            <OrderDetailModal
                                order={localOrders.find((o: any) => o.id === orderDetailId)}
                                products={products}
                                clients={clients}
                                config={config}
                                onClose={() => setOrderDetailId(null)}
                                onUpdateOrder={(updated: any) => {
                                    setLocalOrders((prev: any) => prev.map((o: any) => o.id === updated.id ? { ...updated, _editado: true } : o));
                                    setOrderDetailId(null);
                                }}
                                onPrint={() => {
                                    const orderToPrintParams = localOrders.find((o: any) => o.id === orderDetailId);
                                    if (orderToPrintParams) onPrintRemitos([orderToPrintParams]);
                                }}
                                onNavigatePrev={hasPrev ? () => setOrderDetailId(localOrders[currentIndex - 1].id) : undefined}
                                onNavigateNext={hasNext ? () => setOrderDetailId(localOrders[currentIndex + 1].id) : undefined}
                            />
                        );
                    })()}
                </AnimatePresence>

                <AnimatePresence>
                    {replacingItem && (
                        <ProductReplaceModal
                            products={products}
                            onClose={() => setReplacingItem(null)}
                            onSelect={(newProduct, newQty) => handleReplaceProductItem(replacingItem.orderId, replacingItem.itemIdx, newProduct, newQty)}
                            currentProductName={replacingItem.currentName}
                            initialQty={replacingItem.currentQty}
                        />
                    )}
                </AnimatePresence>

                <div className="p-6 border-t border-[var(--border)] flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
                    <button onClick={() => onRefresh()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors">
                        <RotateCcw size={14} /> Deshacer cambios
                    </button>
                    <button
                        disabled={isSyncing}
                        onClick={handleSave}
                        className="flex items-center gap-2 px-8 py-3 bg-indigo-500 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all disabled:opacity-50"
                    >
                        <Save size={18} /> {isSyncing ? 'Guardando...' : 'Guardar y Cerrar'}
                    </button>
                </div>
            </motion.div >
        </motion.div >
    );
}

function RouteSettlementModal({ routeName, orders, products, onClose, onRefresh }: any) {
    const { setIsSyncing, isSyncing } = useData();
    const [localOrders, setLocalOrders] = useState(
        orders.map((o: any) => ({
            ...o,
            estado_rendicion: 'Entregado', // 'Entregado', 'Rechazado', 'Parcial'
            total_original: parseFloat(o.total),
            total_final: parseFloat(o.total),
            items_originales: JSON.parse(JSON.stringify(o.items || [])),
            pago_efectivo: parseFloat(o.total),
            pago_transferencia: 0
        }))
    );
    const [pagos, setPagos] = useState({ efectivo: 0, transferencia: 0 });
    const [gastos, setGastos] = useState<{ desc: string, monto: number }[]>([]);
    const [chofer, setChofer] = useState("");
    const [editingPartialId, setEditingPartialId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchTerm, setSearchTerm] = useState("");

    // --- NUEVO: ESTADO PARA MÉTODO ALTERNATIVO ---
    const [settlementMethod, setSettlementMethod] = useState<'standard' | 'alternative'>('standard');
    const [devoluciones, setDevoluciones] = useState<{ id_prod: string, nombre: string, qty: number, precio: number, subtotal: number, formato?: string, ub?: number }[]>([]);
    const [showReturnDropdown, setShowReturnDropdown] = useState(false);
    const [returnSearch, setReturnSearch] = useState("");
    const [draftStatus, setDraftStatus] = useState<'saved' | 'saving' | 'none'>('none');
    const [showBillBreakdown, setShowBillBreakdown] = useState(false);
    const [billetes, setBilletes] = useState<Record<number, number>>({});
    const [cuentasCorrientes, setCuentasCorrientes] = useState<{ orderId: string, cliente: string, monto: number }[]>([]);
    const [ccSearch, setCcSearch] = useState("");
    const [showCcDropdown, setShowCcDropdown] = useState(false);
    const [transferenciasExtras, setTransferenciasExtras] = useState<{ orderId: string, cliente: string, monto: number }[]>([]);
    const [trSearch, setTrSearch] = useState("");
    const [showTrDropdown, setShowTrDropdown] = useState(false);
    const [isGastosExpanded, setIsGastosExpanded] = useState(false);
    const [isTrExpanded, setIsTrExpanded] = useState(false);
    const [isCcExpanded, setIsCcExpanded] = useState(false);

    // Optimized products filtering for manual returns
    const filteredReturnProducts = useMemo(() => {
        if (!returnSearch.trim()) return products.slice(0, 30);
        return products.filter((p: any) => {
            const searchData = `${p.Nombre || p.nombre || ''} ${p.ID_Producto || p.id || ''} ${p.PRODUCTO || ''} ${p.ID || ''}`;
            return smartSearch(searchData, returnSearch);
        }).slice(0, 30);
    }, [products, returnSearch]);

    // --- PERSISTENCIA: Cargar borrador ---
    useEffect(() => {
        const loadDraft = async () => {
            let data: any = null;
            // 1. Intentar LocalStorage (más rápido)
            const savedLocal = localStorage.getItem(`wanda_settlement_${routeName}`);
            if (savedLocal) {
                try { data = JSON.parse(savedLocal); } catch (e) { }
            }

            // 2. Consultar Nube (Firestore)
            try {
                const savedCloud = await wandaApi.getSettlementDraft(routeName);
                // Si el de la nube es más nuevo o el local no existe, usamos el de la nube
                if (savedCloud && (!data || new Date(savedCloud.updatedAt) > new Date(data.updatedAt || 0))) {
                    data = savedCloud;
                }
            } catch (e) { }

            if (data) {
                if (data.localOrders) setLocalOrders(data.localOrders);
                if (data.pagos) setPagos(data.pagos);
                if (data.gastos) setGastos(data.gastos);
                if (data.chofer) setChofer(data.chofer);
                if (data.settlementMethod) setSettlementMethod(data.settlementMethod);
                if (data.devoluciones) setDevoluciones(data.devoluciones);
                if (data.billetes) setBilletes(data.billetes);
                if (data.cuentasCorrientes) setCuentasCorrientes(data.cuentasCorrientes);
                if (data.transferenciasExtras) setTransferenciasExtras(data.transferenciasExtras);
                setDraftStatus('saved');
            }
        };
        loadDraft();
    }, [routeName]);

    // --- PERSISTENCIA: Guardar borrador autom. ---
    useEffect(() => {
        setDraftStatus('saving');
        const timeout = setTimeout(async () => {
            const dataToSave = {
                localOrders,
                pagos,
                gastos,
                chofer,
                settlementMethod,
                devoluciones,
                billetes,
                cuentasCorrientes,
                transferenciasExtras,
                updatedAt: new Date().toISOString()
            };

            // Guardar en LocalStorage
            localStorage.setItem(`wanda_settlement_${routeName}`, JSON.stringify(dataToSave));

            // Sincronizar con Firestore (Nube) para otros dispositivos
            try {
                await wandaApi.saveSettlementDraft(routeName, dataToSave);
                setDraftStatus('saved');
            } catch (e) {
                // Si falla la nube, al menos guardamos en local
                setDraftStatus('saved');
            }
        }, 1200);

        return () => clearTimeout(timeout);
    }, [localOrders, pagos, gastos, chofer, settlementMethod, devoluciones, billetes, cuentasCorrientes, transferenciasExtras, routeName]);

    const clearDraft = async () => {
        localStorage.removeItem(`wanda_settlement_${routeName}`);
        try {
            await wandaApi.deleteSettlementDraft(routeName);
        } catch (e) { }
    };

    const filteredOrders = useMemo(() => {
        if (!searchTerm.trim()) return localOrders;

        const terms = searchTerm.toLowerCase().trim().split(/\s+/);

        return localOrders.filter((o: any) => {
            const searchableText = [
                o.cliente_nombre,
                o.id,
                o.direccion,
                o.vendedor
            ].filter(Boolean).join(' ').toLowerCase();

            return terms.every(term => searchableText.includes(term));
        });
    }, [localOrders, searchTerm]);

    const totalRendicion = localOrders.reduce((acc: number, o: any) => {
        if (o.estado_rendicion === 'Rechazado') return acc;
        return acc + o.total_final;
    }, 0);

    const totalCargaRuta = orders.reduce((acc: number, o: any) => acc + (parseFloat(o.total) || 0), 0);
    const totalDevolucionesVal = devoluciones.reduce((acc, d) => acc + d.subtotal, 0);
    const totalPagosPedidos = localOrders.reduce((acc: number, o: any) => acc + (o.pago_efectivo || 0) + (o.pago_transferencia || 0), 0);

    const totalGastos = gastos.reduce((acc, g) => acc + g.monto, 0);
    const totalCuentasCorrientes = cuentasCorrientes.reduce((acc, cc) => acc + (cc.monto || 0), 0);
    const totalTransferenciasExtras = transferenciasExtras.reduce((acc, tr) => acc + (tr.monto || 0), 0);

    const totalEfectivoDesglose = useMemo(() => {
        return Object.entries(billetes).reduce((acc, [den, qty]) => acc + (Number(den) * (qty as number)), 0);
    }, [billetes]);

    const totalTransfCalculado = useMemo(() => {
        if (settlementMethod === 'standard') return pagos.transferencia;
        return localOrders.reduce((acc: number, o: any) => acc + (o.pago_transferencia || 0), 0) + totalTransferenciasExtras;
    }, [settlementMethod, pagos.transferencia, localOrders, totalTransferenciasExtras]);

    const netoARendir = settlementMethod === 'standard' ? totalRendicion : totalCargaRuta;

    // Diferencia: (neto a rendir) - (total devoluciones + gasto + efectivo segun desglose + transferencias)
    const balanceDiferencia = netoARendir - (
        (settlementMethod === 'alternative' ? totalDevolucionesVal : 0) +
        totalGastos +
        totalCuentasCorrientes +
        totalEfectivoDesglose +
        totalTransfCalculado
    );

    const totalCaja = settlementMethod === 'standard'
        ? (pagos.efectivo + pagos.transferencia)
        : totalPagosPedidos;

    const handlePrintDraft = (mode: 'full' | 'audit' = 'full') => {
        const totalGastosLoc = gastos.reduce((acc, g) => acc + (g.monto || 0), 0);
        const efectivoLoc = settlementMethod === 'alternative'
            ? localOrders.reduce((acc: number, o: any) => acc + (o.pago_efectivo || 0), 0)
            : (pagos.efectivo || 0);
        const transfLoc = settlementMethod === 'alternative'
            ? localOrders.reduce((acc: number, o: any) => acc + (o.pago_transferencia || 0), 0) + totalTransferenciasExtras
            : (pagos.transferencia || 0);

        printSettlement({
            reparto: routeName,
            chofer,
            fecha: new Date().toLocaleString(),
            id: `PROFORMA-${new Date().getTime()}`,
            efectivo: totalEfectivoDesglose, // Usamos el desglose real para el reporte
            transf: transfLoc,
            gastosTotal: totalGastosLoc,
            totalNeto: (totalEfectivoDesglose + transfLoc) - totalGastosLoc, // No confundir con la auditoría
            totalDevoluciones: settlementMethod === 'alternative' ? totalDevolucionesVal : 0,
            balanceDiferencia: balanceDiferencia,
            netoARendir: netoARendir,
            billetes,
            gastos,
            cuentasCorrientes,
            totalCuentasCorrientes,
            transferenciasExtras,
            totalTransferenciasExtras,
            ordenes: localOrders.map((o: any) => ({
                id: o.id,
                cliente_nombre: o.cliente_nombre,
                estado: o.estado_rendicion || 'Entregado',
                total: o.total_final,
                total_original: o.total_original,
                efectivo: o.pago_efectivo,
                transf: o.pago_transferencia
            })),
            devoluciones: devoluciones
        }, mode);
    };

    const handleSave = async () => {
        try {
            setIsSyncing(true);

            // Si es método alternativo, pre-procesamos los estados basados en pagos o marcándolos como entregados
            // y procesamos el stock de las devoluciones manuales.
            let finalOrders = JSON.parse(JSON.stringify(localOrders));
            const stockAdjustments: any[] = [];

            if (settlementMethod === 'alternative') {
                // En el método alternativo, asumimos que todo se entregó menos lo que ingresamos como devolución manual
                finalOrders = finalOrders.map((o: any) => ({
                    ...o,
                    estado: 'Entregado',
                    total: o.total_original
                }));

                // Devoluciones manuales
                devoluciones.forEach(d => {
                    const ub = parseFloat(String(d.ub || "1"));
                    const finalQty = d.formato === 'BULTO' ? d.qty * ub : d.qty;
                    stockAdjustments.push({ id: d.id_prod, Stock: finalQty });
                });
            } else {
                // En método estándar, calculamos los deltas de pedidos parciales
                finalOrders.forEach((ord: any) => {
                    if (ord.estado_rendicion === 'Parcial') {
                        (ord.items || []).forEach((item: any) => {
                            const original = (ord.items_originales || []).find((oi: any) => String(oi.id_prod) === String(item.id_prod));
                            if (original && original.cantidad > item.cantidad) {
                                stockAdjustments.push({
                                    id: item.id_prod,
                                    Stock: original.cantidad - item.cantidad
                                });
                            }
                        });
                    }
                });
            }

            const payload = {
                reparto: routeName,
                chofer,
                stockAdjustments,
                ordenes: finalOrders.map((o: any) => ({
                    id: o.id,
                    estado: o.estado_rendicion || 'Entregado',
                    total: o.total_final || o.total_original,
                    items: o.items
                })),
                pagos: settlementMethod === 'alternative' ? {
                    efectivo: localOrders.reduce((acc: number, o: any) => acc + (o.pago_efectivo || 0), 0),
                    transferencia: localOrders.reduce((acc: number, o: any) => acc + (o.pago_transferencia || 0), 0) + totalTransferenciasExtras
                } : pagos,
                gastos,
                cuentas_corrientes: cuentasCorrientes,
                total_cuentas_corrientes: totalCuentasCorrientes,
                total_devoluciones: settlementMethod === 'alternative' ? devoluciones.reduce((acc, d) => acc + (d.subtotal || 0), 0) : 0,
                notas: `Liquidación de ruta ${routeName}${settlementMethod === 'alternative' ? ' (Método Alternativo)' : ''}`,
                desglose_billetes: billetes,
                // Metadata para recuperación:
                _full_draft: {
                    localOrders, pagos, gastos, chofer, settlementMethod, devoluciones, billetes, cuentasCorrientes, transferenciasExtras
                }
            };

            const res = await wandaApi.liquidarRuta(payload);
            if (res.result === 'OK' || !res.error) {
                alert("Ruta liquidada con éxito");
                await clearDraft(); // Limpiar borrador local y nube
                await onRefresh();
                onClose();
            } else {
                alert("Error al liquidar: " + (res.error || res.result || JSON.stringify(res)));
            }
        } catch (err) {
            console.error(err);
            alert("Error de conexión");
        } finally {
            setIsSyncing(false);
        }
    };

    const toggleStatus = (orderId: string, status: string) => {
        setLocalOrders((prev: any[]) => prev.map((o: any) => {
            if (o.id === orderId) {
                let totalFinal = o.total_original;
                if (status === 'Rechazado') totalFinal = 0;
                return { ...o, estado_rendicion: status, total_final: totalFinal };
            }
            return o;
        }));
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[98vh] sm:h-[96vh] rounded-[30px] sm:rounded-[40px] overflow-hidden shadow-2xl flex flex-col border border-white/20"
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-[var(--border)] flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10 shadow-inner flex-shrink-0">
                            <Check size={20} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-lg font-black tracking-tight leading-none truncate">Rendición de Ruta</h3>
                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner relative overflow-hidden backdrop-blur-sm">
                                    {[
                                        { id: 'standard', label: 'Estándar' },
                                        { id: 'alternative', label: 'Alternativo' }
                                    ].map((method) => {
                                        const isActive = settlementMethod === method.id;
                                        return (
                                            <button
                                                key={method.id}
                                                onClick={() => setSettlementMethod(method.id as any)}
                                                className={`
                                                    relative px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 z-10
                                                    ${isActive ? 'text-white' : 'text-white/40 hover:text-white/60'}
                                                `}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="settlementTabBg"
                                                        className="absolute inset-0 bg-indigo-500 shadow-lg shadow-indigo-500/40 rounded-lg z-[-1]"
                                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                                    />
                                                )}
                                                {method.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest truncate">{routeName}</p>
                                <span className="text-slate-500 text-[10px] opacity-30 hidden sm:inline">|</span>
                                <input
                                    type="text"
                                    placeholder="NOMBRE CHOFER"
                                    value={chofer}
                                    onChange={e => setChofer(e.target.value)}
                                    className="bg-white/10 border-none rounded-lg px-2 py-1 text-[10px] font-black text-white placeholder:text-white/30 focus:ring-1 ring-white/20 w-32 sm:w-48"
                                />
                                <div className="relative group flex items-center gap-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={12} />
                                        <input
                                            type="text"
                                            placeholder="BUSCAR PEDIDO..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="bg-white/10 border-none rounded-lg pl-8 pr-3 py-1 text-[10px] font-black text-white placeholder:text-white/30 focus:ring-1 ring-white/20 w-32 sm:w-48 uppercase"
                                        />
                                    </div>
                                    {draftStatus !== 'none' && (
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter transition-all ${draftStatus === 'saving' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                            <div className={`w-1 h-1 rounded-full ${draftStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                                            {draftStatus === 'saving' ? 'Sincronizando nube...' : 'Sincronizado en la nube'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    <div className="flex-[1.5] flex flex-col relative border-r border-[var(--border)]">
                        <div className="flex-1 overflow-auto p-6 space-y-4 custom-scrollbar">
                            {settlementMethod === 'standard' ? (
                                <>
                                    <div className="flex flex-col gap-3 mb-6 px-2">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <LayoutGrid size={14} className="text-indigo-500" /> Detalle de Entregas
                                        </h4>
                                        <div className="flex items-center justify-end">
                                            <div className="flex items-center gap-2">
                                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                                    <button
                                                        onClick={() => setViewMode('grid')}
                                                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-500 shadow-sm' : 'text-slate-400'}`}
                                                    >
                                                        <LayoutGrid size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setViewMode('list')}
                                                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-500 shadow-sm' : 'text-slate-400'}`}
                                                    >
                                                        <List size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {viewMode === 'grid' ? (
                                        <div className="space-y-4">
                                            {filteredOrders.map((order: any) => (
                                                <div key={order.id} className={`p-5 rounded-3xl border transition-all ${order.estado_rendicion === 'Rechazado' ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-500/5 dark:border-rose-500/20 grayscale' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 shadow-sm'}`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <p className="font-black text-sm text-slate-800 dark:text-slate-100">{order.cliente_nombre}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono">#{order.id.slice(-8)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`font-black text-sm ${order.estado_rendicion === 'Rechazado' ? 'text-rose-500' : 'text-indigo-600'}`}>
                                                                ${order.total_final.toLocaleString()}
                                                            </p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter line-through">
                                                                Orig: ${order.total_original.toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        {['Entregado', 'Parcial', 'Rechazado'].map(st => (
                                                            <button
                                                                key={st}
                                                                onClick={() => toggleStatus(order.id, st)}
                                                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${order.estado_rendicion === st
                                                                    ? (st === 'Entregado' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                                        : st === 'Rechazado' ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20'
                                                                            : 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20')
                                                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-300'
                                                                    }`}
                                                            >
                                                                {st}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {order.estado_rendicion === 'Parcial' && (
                                                        <button
                                                            onClick={() => setEditingPartialId(order.id)}
                                                            className="w-full mt-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-xl text-[9px] font-black uppercase border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Edit2 size={12} /> Ajustar Cantidades
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-slate-900 rounded-[30px] border border-[var(--border)] overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        <th className="px-6 py-4">Cliente / ID</th>
                                                        <th className="px-6 py-4">Importe</th>
                                                        <th className="px-6 py-4 text-center">Estado</th>
                                                        <th className="px-6 py-4 text-right">Ajuste</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {filteredOrders.map((order: any) => (
                                                        <tr key={order.id} className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${order.estado_rendicion === 'Rechazado' ? 'opacity-50' : ''}`}>
                                                            <td className="px-6 py-4">
                                                                <p className="font-bold text-xs">{order.cliente_nombre}</p>
                                                                <p className="text-[9px] font-mono text-slate-400">#{order.id.slice(-6)}</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <p className={`font-black text-xs ${order.estado_rendicion === 'Rechazado' ? 'text-rose-500' : 'text-indigo-600'}`}>
                                                                    ${order.total_final.toLocaleString()}
                                                                </p>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex justify-center">
                                                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                                                                        {['E', 'P', 'R'].map((label, idx) => {
                                                                            const statuses = ['Entregado', 'Parcial', 'Rechazado'];
                                                                            const st = statuses[idx];
                                                                            const isActive = order.estado_rendicion === st;
                                                                            return (
                                                                                <button
                                                                                    key={st}
                                                                                    onClick={() => toggleStatus(order.id, st)}
                                                                                    className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black transition-all ${isActive
                                                                                        ? (st === 'Entregado' ? 'bg-emerald-500 text-white' : st === 'Rechazado' ? 'bg-rose-500 text-white' : 'bg-indigo-500 text-white')
                                                                                        : 'text-slate-400 hover:text-slate-600'
                                                                                        }`}
                                                                                >
                                                                                    {label}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {order.estado_rendicion === 'Parcial' && (
                                                                    <button
                                                                        onClick={() => setEditingPartialId(order.id)}
                                                                        className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-lg"
                                                                    >
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            ) : (
                                // --- MÉTODO ALTERNATIVO: DEVOLUCIONES MANUALES ---
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <RotateCcw size={14} className="text-rose-500" /> Ingreso de Devoluciones (Stock)
                                            </h4>
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] max-h-[400px] overflow-y-auto custom-scrollbar">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        <th className="px-4 py-3">Producto</th>
                                                        <th className="px-4 py-3 text-center">Cant.</th>
                                                        <th className="px-4 py-3 text-center">Precio</th>
                                                        <th className="px-4 py-3 text-right">Subtotal</th>
                                                        <th className="px-4 py-3 text-right">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {devoluciones.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-bold text-xs italic">
                                                                No hay devoluciones registradas manualmente
                                                            </td>
                                                        </tr>
                                                    ) : devoluciones.map((dev, idx) => (
                                                        <tr key={dev.id_prod}>
                                                            <td className="px-4 py-3">
                                                                <p className="font-bold text-xs">{dev.nombre}</p>
                                                                <p className="text-[9px] font-mono text-slate-400">{dev.id_prod}</p>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex flex-col items-center gap-1.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="number"
                                                                            id={`dev-qty-${dev.id_prod}`}
                                                                            value={dev.qty}
                                                                            onChange={(e) => {
                                                                                const n = parseFloat(e.target.value) || 0;
                                                                                setDevoluciones((prev: any[]) => prev.map((d: any, i: number) => i === idx ? { ...d, qty: n, subtotal: n * d.precio * (d.formato === 'BULTO' ? (d.ub || 1) : 1) } : d));
                                                                            }}
                                                                            className="w-12 text-center bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1 text-xs font-black focus:ring-1 ring-indigo-500 transition-all outline-none"
                                                                        />
                                                                    </div>
                                                                    {(dev.ub || 1) > 1 && (
                                                                        <button
                                                                            onClick={() => {
                                                                                const nextFmt = dev.formato === 'UNID' ? 'BULTO' : 'UNID';
                                                                                setDevoluciones((prev: any[]) => prev.map((d: any, i: number) => i === idx ? { ...d, formato: nextFmt, subtotal: d.qty * d.precio * (nextFmt === 'BULTO' ? (d.ub || 1) : 1) } : d));
                                                                            }}
                                                                            className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border transition-all ${dev.formato === 'BULTO' ? 'bg-amber-500 border-amber-500 text-white' : 'border-indigo-200 text-indigo-500 hover:bg-indigo-50 dark:border-indigo-900/30'}`}
                                                                        >
                                                                            {dev.formato} (x{dev.ub || 1})
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex justify-center">
                                                                    <input
                                                                        type="number"
                                                                        value={dev.precio}
                                                                        onChange={(e) => {
                                                                            const p = parseFloat(e.target.value) || 0;
                                                                            setDevoluciones((prev: any[]) => prev.map((d: any, i: number) => i === idx ? { ...d, precio: p, subtotal: d.qty * p * (d.formato === 'BULTO' ? d.ub : 1) } : d));
                                                                        }}
                                                                        className="w-16 text-center bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1 text-xs font-black focus:ring-1 ring-indigo-500 transition-all outline-none"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <p className="font-black text-xs text-rose-500">${dev.subtotal.toLocaleString()}</p>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <button
                                                                    onClick={() => setDevoluciones(devoluciones.filter((_, i) => i !== idx))}
                                                                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <DollarSign size={14} className="text-emerald-500" /> Cobranza por Pedido
                                        </h4>
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        <th className="px-4 py-3">Cliente</th>
                                                        <th className="px-4 py-3">Total Pedido</th>
                                                        <th className="px-4 py-3 text-center">Pagado EF</th>
                                                        <th className="px-4 py-3 text-center">Pagado TR</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {filteredOrders.map((order: any) => (
                                                        <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <p className="font-bold text-xs">{order.cliente_nombre}</p>
                                                                <p className="text-[9px] font-mono text-slate-400">#{order.id.slice(-6)}</p>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <p className="font-black text-xs text-indigo-600">${order.total_original.toLocaleString()}</p>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex justify-center">
                                                                    <input
                                                                        type="number"
                                                                        value={order.pago_efectivo || ''}
                                                                        onChange={(e) => {
                                                                            const val = parseFloat(e.target.value) || 0;
                                                                            setLocalOrders((prev: any[]) => prev.map((o: any) => o.id === order.id ? { ...o, pago_efectivo: val } : o));
                                                                        }}
                                                                        className="w-20 bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1.5 px-2 text-center text-xs font-black text-emerald-600"
                                                                        placeholder="$ 0"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex justify-center">
                                                                    <input
                                                                        type="number"
                                                                        value={order.pago_transferencia || ''}
                                                                        onChange={(e) => {
                                                                            const val = parseFloat(e.target.value) || 0;
                                                                            setLocalOrders((prev: any[]) => prev.map((o: any) => o.id === order.id ? { ...o, pago_transferencia: val } : o));
                                                                        }}
                                                                        className="w-20 bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1.5 px-2 text-center text-xs font-black text-blue-600"
                                                                        placeholder="$ 0"
                                                                    />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* FAB para Agregar Devolución - Solo en modo alternativo */}
                        {settlementMethod === 'alternative' && (
                            <div className="absolute bottom-8 right-8 z-[70] flex flex-col items-end">
                                <AnimatePresence>
                                    {showReturnDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="mb-4 w-72 bg-white dark:bg-slate-800 border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden p-2 origin-bottom-right"
                                        >
                                            <input
                                                type="text"
                                                placeholder="Buscar producto..."
                                                autoFocus
                                                value={returnSearch}
                                                onChange={(e) => setReturnSearch(e.target.value)}
                                                className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs font-bold mb-2 outline-none"
                                            />
                                            <div className="max-h-48 overflow-auto space-y-1 custom-scrollbar">
                                                {filteredReturnProducts.map((p: any) => {
                                                    const itemPrice = parseFloat(String(p.Precio_Unitario || p.precio || 0).replace(',', '.'));
                                                    return (
                                                        <button
                                                            key={p.ID_Producto || p.id}
                                                            onClick={() => {
                                                                const pid = p.ID_Producto || p.id;
                                                                const pName = p.Nombre || p.nombre || p.PRODUCTO;
                                                                const rawUb = p.UB || p.Unidades_Bulto || "1";
                                                                const ub = parseFloat(String(rawUb).replace(',', '.'));

                                                                setDevoluciones((prev) => {
                                                                    const exists = prev.find(d => String(d.id_prod) === String(pid));
                                                                    if (exists) {
                                                                        return prev.map((d) => String(d.id_prod) === String(pid) ? { ...d, qty: d.qty + 1, subtotal: (d.qty + 1) * (d.precio || 0) * (d.formato === 'BULTO' ? (d.ub || 1) : 1) } : d);
                                                                    } else {
                                                                        return [...prev, {
                                                                            id_prod: String(pid),
                                                                            nombre: pName,
                                                                            qty: 1,
                                                                            precio: itemPrice,
                                                                            subtotal: itemPrice,
                                                                            formato: 'UNID',
                                                                            ub: ub
                                                                        }];
                                                                    }
                                                                });
                                                                setShowReturnDropdown(false);
                                                                setReturnSearch("");
                                                                setTimeout(() => {
                                                                    const input = document.getElementById(`dev-qty-${pid}`);
                                                                    if (input) {
                                                                        input.focus();
                                                                        (input as HTMLInputElement).select();
                                                                    }
                                                                }, 50);
                                                            }}
                                                            className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0"
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <span className="truncate mr-2">{p.Nombre || p.nombre || p.PRODUCTO}</span>
                                                                <span className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md font-black shrink-0">${itemPrice.toLocaleString()}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                                {filteredReturnProducts.length === 0 && (
                                                    <div className="p-4 text-center text-[10px] text-slate-400 font-bold uppercase">No se encontraron productos</div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button
                                    onClick={() => setShowReturnDropdown(!showReturnDropdown)}
                                    className="w-14 h-14 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(244,63,94,0.4)] hover:scale-110 active:scale-95 transition-all group"
                                    title="Agregar Devolución"
                                >
                                    <Plus size={24} className={`transition-transform duration-300 ${showReturnDropdown ? 'rotate-45' : ''}`} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Resumen y Caja */}
                    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 space-y-6 overflow-auto border-l border-white dark:border-white/5 shadow-2xl relative">
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <DollarSign size={14} className="text-indigo-500" /> Conciliación de Caja
                            </h4>

                            {settlementMethod === 'standard' ? (
                                <div className="space-y-3">
                                    <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner">
                                                <DollarSign size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Efectivo Recibido</label>
                                                <input
                                                    type="number"
                                                    value={pagos.efectivo || ''}
                                                    onChange={e => setPagos({ ...pagos, efectivo: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowBillBreakdown(true)}
                                                className={`p-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 ${Object.keys(billetes).length > 0 ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`}
                                                title="Desglose de Billetes"
                                            >
                                                <List size={18} />
                                                {Object.keys(billetes).length > 0 && <span className="text-[10px] font-black">{Object.values(billetes).reduce((a, b) => a + (b as number), 0)}</span>}
                                            </button>
                                        </div>
                                        <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner">
                                                <CreditCard size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Transferencias / Otros</label>
                                                <input
                                                    type="number"
                                                    value={pagos.transferencia || ''}
                                                    onChange={e => setPagos({ ...pagos, transferencia: parseFloat(e.target.value) || 0 })}
                                                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-xl font-black text-slate-800 dark:text-slate-100"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-500/5 rounded-3xl border border-indigo-100 dark:border-indigo-500/20 space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase px-1">
                                        <span>Total Cobrado Efectivo</span>
                                        <span className="text-emerald-600 font-black">${localOrders.reduce((acc: number, o: any) => acc + (o.pago_efectivo || 0), 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase px-1">
                                        <span>Total Transferencias</span>
                                        <span className="text-blue-600 font-black">${localOrders.reduce((acc: number, o: any) => acc + (o.pago_transferencia || 0), 0).toLocaleString()}</span>
                                    </div>
                                    <div className="h-px bg-indigo-100 dark:bg-indigo-500/20" />
                                    <div className="flex justify-between items-center text-xs font-black text-indigo-600 px-1">
                                        <span>Total Pagos Recibidos</span>
                                        <span>${totalPagosPedidos.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold text-rose-500 uppercase px-1">
                                        <span>Menos Gastos</span>
                                        <span className="font-black">-${totalGastos.toLocaleString()}</span>
                                    </div>
                                    {Object.keys(billetes).length > 0 && (
                                        <div className="p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                            <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Desglose Guardado ({Object.values(billetes).reduce((a, b) => a + (b as number), 0)} billetes)</p>
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(billetes).map(([den, qty]) => (qty as number) > 0 && (
                                                    <span key={den} className="text-[8px] font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-100">${den} x{qty}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setShowBillBreakdown(true)}
                                        className="w-full mt-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <List size={14} /> {Object.keys(billetes).length > 0 ? 'Editar Desglose' : 'Desglosar Billetes'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <AnimatePresence>
                            {showBillBreakdown && (
                                <BillBreakdownModal
                                    billetes={billetes}
                                    onChange={(newBilletes: any) => {
                                        setBilletes(newBilletes);
                                        const sum = Object.entries(newBilletes).reduce((acc, [den, qty]) => acc + (Number(den) * (qty as number)), 0);
                                        if (settlementMethod === 'standard') {
                                            setPagos(prev => ({ ...prev, efectivo: sum }));
                                        }
                                    }}
                                    onClose={() => setShowBillBreakdown(false)}
                                />
                            )}
                        </AnimatePresence>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h4 
                                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:text-slate-600 transition-colors"
                                    onClick={() => setIsGastosExpanded(!isGastosExpanded)}
                                >
                                    {isGastosExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                    <RotateCcw size={14} className="text-rose-500" /> Gastos de Ruta
                                </h4>
                                <button
                                    onClick={() => {
                                        setGastos([...gastos, { desc: '', monto: 0 }]);
                                        setIsGastosExpanded(true);
                                    }}
                                    className="p-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            {isGastosExpanded && (
                                <div className="space-y-2">
                                    {gastos.map((g, idx) => (
                                        <div key={idx} className="flex gap-2 animate-in slide-in-from-right-4">
                                            <input
                                                placeholder="Descripción"
                                                value={g.desc}
                                                onChange={e => {
                                                    const next = [...gastos];
                                                    next[idx].desc = e.target.value;
                                                    setGastos(next);
                                                }}
                                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Monto"
                                                value={g.monto || ''}
                                                onChange={e => {
                                                    const next = [...gastos];
                                                    next[idx].monto = parseFloat(e.target.value) || 0;
                                                    setGastos(next);
                                                }}
                                                className="w-24 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-black text-rose-500"
                                            />
                                            <button
                                                onClick={() => setGastos(gastos.filter((_, i) => i !== idx))}
                                                className="p-2 text-slate-300 hover:text-rose-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {settlementMethod === 'alternative' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 
                                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:text-slate-600 transition-colors"
                                        onClick={() => setIsTrExpanded(!isTrExpanded)}
                                    >
                                        {isTrExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                        <DollarSign size={14} className="text-indigo-500" /> Transferencias
                                    </h4>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowTrDropdown(!showTrDropdown)}
                                            className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1"
                                        >
                                            <Plus size={14} /> <span className="text-[10px] font-black">AGREGAR</span>
                                        </button>

                                        {showTrDropdown && (
                                            <div className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                                                <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                                    <input
                                                        placeholder="Buscar boleta / cliente..."
                                                        value={trSearch}
                                                        onChange={e => setTrSearch(e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[10px] font-bold outline-none"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-auto">
                                                    {localOrders.filter((o: any) =>
                                                        !transferenciasExtras.some((tr: any) => tr.orderId === o.id) &&
                                                        smartSearch(`${o.cliente_nombre} ${o.id}`, trSearch)
                                                    ).map((o: any) => (
                                                        <button
                                                            key={o.id}
                                                            onClick={() => {
                                                                const montoTR = o.total_final || o.total;
                                                                setTransferenciasExtras([...transferenciasExtras, {
                                                                    orderId: o.id,
                                                                    cliente: o.cliente_nombre,
                                                                    monto: montoTR
                                                                }]);
                                                                setLocalOrders((prev: any[]) => prev.map((lo: any) => lo.id === o.id ? { ...lo, pago_efectivo: 0, pago_transferencia: 0 } : lo));
                                                                setShowTrDropdown(false);
                                                                setTrSearch("");
                                                                setIsTrExpanded(true);
                                                            }}
                                                            className="w-full px-4 py-2 text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border-b border-slate-50 dark:border-slate-800 last:border-0"
                                                        >
                                                            <div className="text-[10px] font-black truncate">{o.cliente_nombre}</div>
                                                            <div className="flex justify-between items-center opacity-60">
                                                                <span className="text-[9px] font-bold"># {o.id}</span>
                                                                <span className="text-[9px] font-black text-indigo-600">$ {parseFloat(o.total_final).toLocaleString()}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                    {localOrders.filter((o: any) => !transferenciasExtras.some((tr: any) => tr.orderId === o.id)).length === 0 && (
                                                        <div className="p-4 text-center text-[10px] text-slate-400 font-bold uppercase">No hay boletas disponibles</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isTrExpanded && (
                                    <div className="space-y-2 mb-6">
                                        {transferenciasExtras.map((tr, idx) => (
                                        <div key={idx} className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center group hover:border-indigo-500/50 transition-all">
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-slate-800 dark:text-slate-100 truncate">{tr.cliente}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">BOLETA # {tr.orderId}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right flex items-center gap-1">
                                                    <span className="text-[10px] font-black text-indigo-600">$</span>
                                                    <input
                                                        type="number"
                                                        value={tr.monto}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            const next = [...transferenciasExtras];
                                                            next[idx].monto = val;
                                                            setTransferenciasExtras(next);
                                                        }}
                                                        className="w-20 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-800 rounded-lg px-2 py-1 text-[10px] font-black text-indigo-600 outline-none text-right"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const removed = transferenciasExtras[idx];
                                                        setTransferenciasExtras(transferenciasExtras.filter((_, i) => i !== idx));
                                                        setLocalOrders((prev: any[]) => prev.map((lo: any) => lo.id === removed.orderId ? { ...lo, pago_efectivo: lo.total_final } : lo));
                                                    }}
                                                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h4 
                                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:text-slate-600 transition-colors"
                                    onClick={() => setIsCcExpanded(!isCcExpanded)}
                                >
                                    {isCcExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                    <Clock size={14} className="text-amber-500" /> Cuentas Corrientes
                                </h4>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowCcDropdown(!showCcDropdown)}
                                        className="p-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all flex items-center gap-1"
                                    >
                                        <Plus size={14} /> <span className="text-[10px] font-black">AGREGAR</span>
                                    </button>

                                    {showCcDropdown && (
                                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                                            <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                                <input
                                                    placeholder="Buscar boleta / cliente..."
                                                    value={ccSearch}
                                                    onChange={e => setCcSearch(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[10px] font-bold outline-none"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="max-h-48 overflow-auto">
                                                {localOrders.filter((o: any) =>
                                                    !cuentasCorrientes.some((cc: any) => cc.orderId === o.id) &&
                                                    smartSearch(`${o.cliente_nombre} ${o.id}`, ccSearch)
                                                ).map((o: any) => (
                                                    <button
                                                        key={o.id}
                                                        onClick={() => {
                                                            const montoCC = o.total_final || o.total;
                                                            setCuentasCorrientes([...cuentasCorrientes, {
                                                                orderId: o.id,
                                                                cliente: o.cliente_nombre,
                                                                monto: montoCC
                                                            }]);
                                                            // Al pasar a CC, si estamos en modo estándar, seteamos pagos a 0 para ese pedido
                                                            setLocalOrders((prev: any[]) => prev.map((lo: any) => lo.id === o.id ? { ...lo, pago_efectivo: 0, pago_transferencia: 0 } : lo));
                                                            setShowCcDropdown(false);
                                                            setCcSearch("");
                                                            setIsCcExpanded(true);
                                                        }}
                                                        className="w-full px-4 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-500/10 border-b border-slate-50 dark:border-slate-800 last:border-0"
                                                    >
                                                        <div className="text-[10px] font-black truncate">{o.cliente_nombre}</div>
                                                        <div className="flex justify-between items-center opacity-60">
                                                            <span className="text-[9px] font-bold"># {o.id}</span>
                                                            <span className="text-[9px] font-black text-amber-600">$ {parseFloat(o.total_final).toLocaleString()}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                                {localOrders.filter((o: any) => !cuentasCorrientes.some((cc: any) => cc.orderId === o.id)).length === 0 && (
                                                    <div className="p-4 text-center text-[10px] text-slate-400 font-bold uppercase">No hay boletas disponibles</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isCcExpanded && (
                                <div className="space-y-2">
                                    {cuentasCorrientes.map((cc, idx) => (
                                        <div key={idx} className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center group hover:border-amber-500/50 transition-all">
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-slate-800 dark:text-slate-100 truncate">{cc.cliente}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">BOLETA # {cc.orderId}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right flex items-center gap-1">
                                                    <span className="text-[10px] font-black text-amber-600">$</span>
                                                    <input
                                                        type="number"
                                                        value={cc.monto}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            const next = [...cuentasCorrientes];
                                                            next[idx].monto = val;
                                                            setCuentasCorrientes(next);
                                                        }}
                                                        className="w-20 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-800 rounded-lg px-2 py-1 text-[10px] font-black text-amber-600 outline-none text-right"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const removed = cuentasCorrientes[idx];
                                                        setCuentasCorrientes(cuentasCorrientes.filter((_, i) => i !== idx));
                                                        // Restauramos pago efectivo si se quita de CC (comportamiento por defecto)
                                                        setLocalOrders((prev: any[]) => prev.map((lo: any) => lo.id === removed.orderId ? { ...lo, pago_efectivo: lo.total_final } : lo));
                                                    }}
                                                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-[var(--border)] mt-auto space-y-4">
                            <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest px-2">
                                <span>{settlementMethod === 'standard' ? 'Total Vendido' : 'Carga Total Distribuida'}</span>
                                <span className="text-slate-600 dark:text-slate-100">${(settlementMethod === 'standard' ? totalRendicion : totalCargaRuta).toLocaleString()}</span>
                            </div>
                            {settlementMethod === 'alternative' && (
                                <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest px-2">
                                    <span>Total Devoluciones</span>
                                    <span className="text-rose-500">-${totalDevolucionesVal.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest px-2">
                                <span>Gastos de Ruta</span>
                                <span className="text-rose-500">-${totalGastos.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest px-2">
                                <span>Cuentas Corrientes</span>
                                <span className="text-rose-500">-${totalCuentasCorrientes.toLocaleString()}</span>
                            </div>

                            <div className="p-6 bg-slate-900 dark:bg-white rounded-[32px] text-white dark:text-slate-900 shadow-2xl shadow-indigo-500/10">
                                <div className="flex justify-between items-end mb-1">
                                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Saldo a Rendir (Ventas)</p>
                                    <div className="text-right">
                                        <p className={`text-[10px] font-black px-2 py-0.5 rounded-full ${Math.abs(balanceDiferencia) < 0.01
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : balanceDiferencia > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            {Math.abs(balanceDiferencia) < 0.01
                                                ? 'BALANCEADO'
                                                : `${balanceDiferencia < 0 ? 'SOBRANTE' : 'FALTANTE'}: $${Math.abs(balanceDiferencia).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                            }
                                        </p>
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black mb-4">
                                    ${netoARendir.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </h3>

                                <div className="space-y-1 mb-4 border-y border-white/10 py-3">
                                    <div className="flex justify-between items-center text-[10px] font-bold opacity-60 uppercase">
                                        <span>Efectivo (Desglose)</span>
                                        <span>$ {totalEfectivoDesglose.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold opacity-60 uppercase">
                                        <span>Transferencias</span>
                                        <span>$ {totalTransfCalculado.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold text-rose-300 uppercase">
                                        <span>Gastos</span>
                                        <span>- $ {totalGastos.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold text-rose-300 uppercase">
                                        <span>Ctas. Corrientes</span>
                                        <span>- $ {totalCuentasCorrientes.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {settlementMethod === 'alternative' && (
                                        <div className="flex justify-between items-center text-[10px] font-bold text-rose-300 uppercase">
                                            <span>Devoluciones</span>
                                            <span>- $ {totalDevolucionesVal.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="text-[9px] font-black uppercase opacity-60 tracking-tighter text-indigo-200">Total Auditado (Dinero + Gastos + Dev + CC)</div>
                                    <div className="text-lg font-black">$ {(totalEfectivoDesglose + totalTransfCalculado + totalGastos + totalCuentasCorrientes + (settlementMethod === 'alternative' ? totalDevolucionesVal : 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handlePrintDraft('full')}
                                        className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex flex-col items-center justify-center gap-1 border border-slate-200 dark:border-slate-700"
                                    >
                                        <Printer size={14} /> <span>Reporte Full</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handlePrintDraft('audit')}
                                        className="w-full py-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex flex-col items-center justify-center gap-1 border border-indigo-100 dark:border-indigo-900/30"
                                    >
                                        <Shield size={14} /> <span>Solo Auditoría</span>
                                    </button>
                                </div>
                                <button
                                    disabled={isSyncing}
                                    onClick={handleSave}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-[32px] text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check size={20} />}
                                    {isSyncing ? 'Liquidando...' : 'Finalizar y Cerrar Ruta'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub-Modal para Entrega Parcial */}
                <AnimatePresence>
                    {editingPartialId && (
                        <PartialDeliveryEditor
                            order={localOrders.find((o: any) => o.id === editingPartialId)}
                            products={products}
                            onClose={() => setEditingPartialId(null)}
                            onSave={(updatedOrder: any) => {
                                setLocalOrders((prev: any[]) => prev.map((o: any) => o.id === updatedOrder.id ? { ...updatedOrder, estado_rendicion: 'Parcial' } : o));
                                setEditingPartialId(null);
                            }}
                        />
                    )}
                </AnimatePresence>


            </motion.div>
        </motion.div >
    );
}

function BillBreakdownModal({ billetes, onChange, onClose }: any) {
    const denominations = [20000, 10000, 2000, 1000, 500, 200, 100, 50, 20, 10];
    const total = Object.entries(billetes).reduce((acc, [den, qty]) => acc + (Number(den) * (qty as number)), 0);

    const handleQtyChange = (den: number, val: string) => {
        const n = parseInt(val) || 0;
        onChange({ ...billetes, [den]: n });
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] shadow-3xl overflow-hidden border border-white/20"
            >
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="font-black text-xl">Desglose de Billetes</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculadora de efectivo</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
                    </div>

                    <div className="space-y-3 mb-8 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
                        {denominations.map(den => (
                            <div key={den} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-500 transition-all">
                                <div className="w-16 text-right">
                                    <span className="text-xs font-black text-slate-400">$</span>
                                    <span className="text-lg font-black text-slate-800 dark:text-slate-100 ml-1">{den.toLocaleString()}</span>
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        placeholder="Cant."
                                        value={billetes[den] || ''}
                                        onChange={(e) => handleQtyChange(den, e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-center text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none group-hover:shadow-lg transition-all"
                                    />
                                </div>
                                <div className="w-24 text-right">
                                    <p className="text-[8px] font-black uppercase text-slate-400">Subtotal</p>
                                    <p className="text-xs font-black text-indigo-500">${((billetes[den] || 0) * den).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-indigo-500 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Efectivo</span>
                            <span className="text-2xl font-black">${total.toLocaleString()}</span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        Listo, Aplicar Total
                    </button>
                    <button
                        onClick={() => onChange({})}
                        className="w-full mt-2 py-2 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-rose-500 transition-all"
                    >
                        Limpiar Todo
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

function PartialDeliveryEditor({ order, products, onClose, onSave }: any) {
    const [items, setItems] = useState(JSON.parse(JSON.stringify(order.items)));

    const handleQtyChange = (idx: number, newQty: number) => {
        const next = [...items];
        next[idx].cantidad = Math.max(0, newQty);
        next[idx].subtotal = next[idx].cantidad * next[idx].precio;
        setItems(next);
    };

    const newTotal = items.reduce((acc: number, item: any) => acc + item.subtotal, 0);

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl"
            >
                <div className="p-6 border-b border-[var(--border)] bg-indigo-600 text-white flex justify-between items-center">
                    <h5 className="text-sm font-black uppercase tracking-widest">Ajuste de Entrega Parcial</h5>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-auto">
                    {items.map((item: any, idx: number) => {
                        const originalItem = order.items_originales.find((oi: any) => oi.id_prod === item.id_prod);
                        const maxQty = originalItem?.cantidad || 9999;
                        const p = products.find((prod: any) => prod.ID_Producto === item.id_prod);
                        const isKg = (p?.Unidad || '').toLowerCase() === 'kg';

                        return (
                            <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-800">
                                <div className="flex-1 pr-4">
                                    <p className="font-black text-xs text-slate-800 dark:text-slate-100">{item.nombre}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Máx original: {maxQty} {isKg ? 'KG' : 'UNID'}</p>
                                </div>
                                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <button onClick={() => handleQtyChange(idx, item.cantidad - 1)} className="p-1 text-indigo-500 hover:bg-slate-50 rounded"><Minus size={14} /></button>
                                    <input
                                        type="number"
                                        value={item.cantidad}
                                        onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                                        className="w-12 text-center text-sm font-black bg-transparent border-none p-0 focus:ring-0"
                                    />
                                    <button onClick={() => handleQtyChange(idx, item.cantidad + 1)} className="p-1 text-indigo-500 hover:bg-slate-50 rounded"><Plus size={14} /></button>
                                    <span className="text-[10px] font-black text-slate-400 mr-1">{isKg ? 'KG' : 'UNID'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center border-t border-[var(--border)]">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Nuevo Total</p>
                        <p className="font-black text-xl text-indigo-600">${newTotal.toLocaleString()}</p>
                    </div>
                    <button
                        onClick={() => onSave({ ...order, items, total: newTotal, total_final: newTotal })}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                        Confirmar Ajuste
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function OrderDetailModal({ order, products, clients, config, onClose, onPrint, onUpdateOrder, onNavigatePrev, onNavigateNext }: any) {
    const [localOrder, setLocalOrder] = useState<any>(null);
    const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
    const [clientSearch, setClientSearch] = useState("");
    const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
    const [productSearch, setProductSearch] = useState("");
    const [productDropdownOpen, setProductDropdownOpen] = useState(false);

    useEffect(() => {
        if (order) setLocalOrder(JSON.parse(JSON.stringify(order)));
    }, [order]);

    if (!localOrder) return null;

    const recalculatedOrder = (next: any) => {
        const itemsTotal = next.items.reduce((acc: number, item: any) => {
            const qty = parseFloat(String(item.cantidad).replace(',', '.')) || 0;
            const price = parseFloat(String(item.precio).replace(',', '.')) || 0;
            const discPercent = parseFloat(String(item.descuento || 0).replace(',', '.')) || 0;
            const subtotalGross = qty * price;
            const sub = subtotalGross * (1 - discPercent / 100);
            item.subtotal = sub; // Crucial para el backend
            return acc + sub;
        }, 0);
        const globalDiscPercent = parseFloat(String(next.descuento_general || 0).replace(',', '.')) || 0;
        next.total = itemsTotal * (1 - globalDiscPercent / 100);
        return next;
    };

    const handleItemChange = (idx: number, updates: any) => {
        const next = { ...localOrder };
        next.items[idx] = { ...next.items[idx], ...updates };
        setLocalOrder(recalculatedOrder(next));
    };

    const handleGlobalDiscountChange = (val: number) => {
        const next = { ...localOrder };
        next.descuento_general = val;
        setLocalOrder(recalculatedOrder(next));
    };

    const handleToggleFormato = (idx: number) => {
        const next = { ...localOrder };
        const item = next.items[idx];
        let product = products.find((p: any) => String(p.ID_Producto) === String(item.id_prod));
        if (!product && item.nombre) {
            product = products.find((p: any) => String(p.Nombre || '').trim().toLowerCase() === String(item.nombre).trim().toLowerCase());
        }
        if (!product) return;

        const rawUb = product.UB || product.Unidades_Bulto || "1";
        const ub = parseFloat(String(rawUb).replace(',', '.'));
        const isKg = (product.Unidad || '').toLowerCase() === 'kg';

        const isDetalleBulto = String(item.detalle || '').toUpperCase().includes('BULTO');
        const formatVal = String(item._formato || item.formato || (isDetalleBulto ? 'BULTO' : '')).toUpperCase();
        const iB = formatVal === 'BULTO';

        // Usamos el precio actual del item en lugar del catálogo para no perder ediciones del usuario
        const currentPrice = parseFloat(String(item.precio).replace(',', '.')) || 0;
        const currentQty = parseFloat(String(item.cantidad).replace(',', '.')) || 0;

        if (iB) {
            // Cambiar de BULTO a UNID (multiplicamos cantidad, dividimos precio)
            next.items[idx] = {
                ...item,
                _formato: isKg ? 'KG' : 'UNID',
                precio: currentPrice / (ub || 1),
                cantidad: currentQty * (ub || 1)
            };
        } else {
            // Cambiar de UNID a BULTO (dividimos cantidad, multiplicamos precio)
            next.items[idx] = {
                ...item,
                _formato: 'BULTO',
                precio: currentPrice * (ub || 1),
                cantidad: currentQty / (ub || 1)
            };
        }
        setLocalOrder(recalculatedOrder(next));
    };

    const handleDeleteItem = (idx: number) => {
        if (!confirm("¿Eliminar este producto del pedido?")) return;
        const next = { ...localOrder };
        next.items.splice(idx, 1);
        setLocalOrder(recalculatedOrder(next));
    };

    const applyAutoPromotions = () => {
        if (!config?.SYSTEM_PROMOTIONS) return;
        let promos = [];
        try {
            promos = JSON.parse(config.SYSTEM_PROMOTIONS);
        } catch (e) { return; }

        const next = { ...localOrder };
        let count = 0;
        next.items = next.items.map((item: any) => {
            const applicable = promos.filter((p: any) =>
                p.active &&
                (p.target === 'ALL' || p.target === item.id_prod)
            );

            let bestDiscount = parseFloat(item.descuento || 0);
            applicable.forEach((p: any) => {
                if (p.type === 'BOX' && item._formato === 'BULTO' && item.cantidad >= p.threshold) {
                    bestDiscount = Math.max(bestDiscount, p.discount);
                } else if (p.type === 'QTY' && item.cantidad >= p.threshold) {
                    bestDiscount = Math.max(bestDiscount, p.discount);
                }
            });

            if (bestDiscount !== parseFloat(item.descuento || 0)) count++;
            return { ...item, descuento: bestDiscount };
        });

        if (count > 0) {
            setLocalOrder(recalculatedOrder(next));
            alert(`Se aplicaron ${count} promociones por reglas de negocio.`);
        } else {
            alert("No se cumplen condiciones para nuevas promociones.");
        }
    };

    const isEditable = !!onUpdateOrder;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
                <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-indigo-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                            <Package size={24} />
                        </div>
                        <div>
                            <h4 className="text-xl font-black">Detalle del Pedido</h4>
                            {isEditable && clients ? (
                                <div className="relative mt-1">
                                    <div
                                        className="bg-white/20 border-none rounded-lg text-xs font-black px-3 py-1.5 outline-none text-white truncate max-w-[250px] cursor-pointer hover:bg-white/30 transition-colors flex justify-between items-center"
                                        onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                                    >
                                        <span className="truncate">{localOrder.cliente_nombre || 'Seleccionar cliente...'}</span>
                                        <ChevronDown size={14} className="ml-2 shrink-0 opacity-70" />
                                    </div>
                                    {clientDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-[280px] sm:w-[350px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                            <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                                <input
                                                    type="text"
                                                    placeholder="Escriba para buscar cliente..."
                                                    value={clientSearch}
                                                    onChange={(e) => setClientSearch(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="max-h-[200px] overflow-auto py-1">
                                                {clients.filter((c: any) => smartSearch(c.Nombre_Negocio, clientSearch)).length === 0 ? (
                                                    <div className="p-3 text-center text-xs text-slate-400 font-bold">Sin resultados</div>
                                                ) : clients.filter((c: any) => smartSearch(c.Nombre_Negocio, clientSearch)).map((c: any) => (
                                                    <div
                                                        key={c.ID_Cliente}
                                                        className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer flex flex-col"
                                                        onClick={() => {
                                                            const next = { ...localOrder, id_cliente: c.ID_Cliente, cliente_nombre: c.Nombre_Negocio, direccion: c.Direccion, telefono: c.Telefono };
                                                            setLocalOrder(recalculatedOrder(next));
                                                            setClientDropdownOpen(false);
                                                            setClientSearch("");
                                                        }}
                                                    >
                                                        <span>{c.Nombre_Negocio}</span>
                                                        {c.Direccion && <span className="text-[9px] font-normal text-slate-400 truncate mt-0.5">{c.Direccion}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs opacity-80 font-bold uppercase tracking-widest">{localOrder.cliente_nombre}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onNavigatePrev && (
                            <button onClick={onNavigatePrev} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Pedido Anterior">
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        {onNavigateNext && (
                            <button onClick={onNavigateNext} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Pedido Siguiente">
                                <ChevronRight size={20} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Cerrar">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-auto space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-[var(--border)]">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                                <Info size={10} /> ID Pedido
                            </p>
                            <p className="font-mono text-xs font-black">{localOrder.id}</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-[var(--border)]">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Preventista</p>
                            <p className="font-black text-xs">{localOrder.vendedor || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-[var(--border)]">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Estado</p>
                            <span className="text-xs font-black text-indigo-500 uppercase">{localOrder.estado}</span>
                        </div>
                        {localOrder.notas && (
                            <div className="col-span-full p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl border border-orange-100 dark:border-orange-500/20">
                                <p className="text-[10px] text-orange-400 font-bold uppercase mb-1">Notas del Pedido</p>
                                <p className="text-xs font-bold text-orange-600 dark:text-orange-400">{localOrder.notas}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-[var(--border)]">
                            <span className="flex items-center gap-2 pt-0.5"><ShoppingCart size={12} className="text-indigo-500" /> Items del Pedido</span>
                            <div className="flex gap-3 items-center">
                                {isEditable && config?.SYSTEM_PROMOTIONS && (
                                    <button
                                        onClick={applyAutoPromotions}
                                        className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-500/10 text-rose-600 rounded-full hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-500/20"
                                    >
                                        <Tag size={10} /> Escanear Promos
                                    </button>
                                )}
                                <span className="bg-white dark:bg-slate-900 border border-[var(--border)] px-3 py-1.5 rounded-full">{localOrder.items?.length || 0} productos</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {localOrder.items?.map((item: any, idx: number) => {
                                let p = products.find((prod: any) => String(prod.ID_Producto) === String(item.id_prod));
                                if (!p && item.nombre) {
                                    p = products.find((prod: any) => String(prod.Nombre || '').trim().toLowerCase() === String(item.nombre).trim().toLowerCase());
                                }
                                const isKg = (p?.Unidad || '').toLowerCase() === 'kg';
                                const baseUnit = String(p?.Unidad || 'UNID').toUpperCase();
                                const rawUb = p?.UB ?? p?.Unidades_Bulto;
                                const parsedUb = parseFloat(String(rawUb).replace(',', '.'));
                                const ub = (!rawUb || String(rawUb).trim() === '' || isNaN(parsedUb) || parsedUb === 0) ? 1 : parsedUb;
                                const itemPrice = parseFloat(item.precio) || 0;
                                const itemQty = parseFloat(item.cantidad) || 0;
                                const isDetalleBulto = String(item.detalle || '').toUpperCase().includes('BULTO');
                                const currentFormat = String(item._formato || item.formato || (isDetalleBulto ? 'BULTO' : '')).toUpperCase();
                                const itemDiscPercent = parseFloat(item.descuento || 0);
                                const itemSubtotalGross = itemQty * itemPrice;
                                const itemDiscAmount = itemSubtotalGross * (itemDiscPercent / 100);
                                const itemSubtotal = itemSubtotalGross - itemDiscAmount;

                                return (
                                    <div key={idx} className="group p-4 bg-white dark:bg-slate-800 border border-[var(--border)] rounded-2xl hover:border-indigo-500/50 hover:shadow-lg transition-all">
                                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                            {isEditable ? (
                                                <div className="flex flex-col sm:flex-row gap-4 flex-1 items-start sm:items-center">
                                                    <div className="flex-1 w-full sm:w-auto">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-black text-sm text-slate-800 dark:text-slate-100">{item.nombre}</p>
                                                        </div>
                                                        <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 px-1.5 py-0.5 rounded">ID: {item.id_producto || item.id_prod || p?.ID_Producto}</span>
                                                    </div>
                                                    <div className="w-full sm:w-auto grid grid-cols-3 gap-3">
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center ml-1">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase">Cant.</label>
                                                                <button
                                                                    onClick={() => handleToggleFormato(idx)}
                                                                    className={`text-[8px] font-black px-1 rounded ${(currentFormat === 'BULTO' && ub > 1) ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}
                                                                    disabled={ub <= 1}
                                                                >
                                                                    {(currentFormat === 'BULTO' && ub > 1) ? 'BUL' : (isKg ? 'KG' : baseUnit)}
                                                                </button>
                                                            </div>

                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={rawInputs[`${idx}_qty`] ?? item.cantidad}
                                                                onFocus={(e) => setRawInputs(prev => ({ ...prev, [`${idx}_qty`]: e.target.value }))}
                                                                onBlur={() => setRawInputs(prev => {
                                                                    const next = { ...prev };
                                                                    delete next[`${idx}_qty`];
                                                                    return next;
                                                                })}
                                                                onChange={(e) => {
                                                                    const valStr = e.target.value;
                                                                    setRawInputs(prev => ({ ...prev, [`${idx}_qty`]: valStr }));
                                                                    const valNum = parseFloat(valStr.replace(',', '.'));
                                                                    if (!isNaN(valNum)) handleItemChange(idx, { cantidad: valNum });
                                                                }}
                                                                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-center"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Precio</label>
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={rawInputs[`${idx}_price`] ?? item.precio}
                                                                onFocus={(e) => setRawInputs(prev => ({ ...prev, [`${idx}_price`]: e.target.value }))}
                                                                onBlur={() => setRawInputs(prev => {
                                                                    const next = { ...prev };
                                                                    delete next[`${idx}_price`];
                                                                    return next;
                                                                })}
                                                                onChange={(e) => {
                                                                    const valStr = e.target.value;
                                                                    setRawInputs(prev => ({ ...prev, [`${idx}_price`]: valStr }));
                                                                    const valNum = parseFloat(valStr.replace(',', '.'));
                                                                    if (!isNaN(valNum)) handleItemChange(idx, { precio: valNum });
                                                                }}
                                                                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-center"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Desc. (%)</label>
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={rawInputs[`${idx}_disc`] ?? item.descuento}
                                                                onFocus={(e) => setRawInputs(prev => ({ ...prev, [`${idx}_disc`]: e.target.value }))}
                                                                onBlur={() => setRawInputs(prev => {
                                                                    const next = { ...prev };
                                                                    delete next[`${idx}_disc`];
                                                                    return next;
                                                                })}
                                                                onChange={(e) => {
                                                                    const valStr = e.target.value;
                                                                    setRawInputs(prev => ({ ...prev, [`${idx}_disc`]: valStr }));
                                                                    const valNum = parseFloat(valStr.replace(',', '.'));
                                                                    if (!isNaN(valNum)) handleItemChange(idx, { descuento: valNum });
                                                                }}
                                                                className="w-full h-9 px-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs font-black text-center text-rose-600"
                                                            />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteItem(idx)}
                                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl self-end sm:self-center transition-colors"
                                                        title="Eliminar producto"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center w-full">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="font-black text-sm text-slate-800 dark:text-slate-100">{item.nombre}</p>
                                                        </div>
                                                        <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 px-1.5 py-0.5 rounded">ID: {item.id_producto || item.id_prod || p?.ID_Producto}</span>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                                            {item.cantidad} {item._formato || 'UNID'} x ${itemPrice.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-sm text-slate-800 dark:text-slate-100">${itemSubtotal.toLocaleString()}</p>
                                                        {itemDiscPercent > 0 && <p className="text-[9px] font-black text-rose-500">Desc: {itemDiscPercent}% (-${itemDiscAmount.toLocaleString()})</p>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {isEditable && (
                            <div className="mt-4 p-4 border border-dashed border-indigo-200 dark:border-indigo-500/30 rounded-2xl flex flex-col gap-3 relative">
                                <div
                                    className="flex-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold outline-none cursor-pointer flex justify-between items-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                                >
                                    <span>+ Agregar Producto al Pedido...</span>
                                    <Search size={14} className="opacity-50" />
                                </div>

                                {productDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[250px] mb-4">
                                        <div className="p-2 border-b border-slate-100 dark:border-slate-700 shrink-0 bg-slate-50 dark:bg-slate-800/50">
                                            <input
                                                type="text"
                                                placeholder="Buscar producto por nombre..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="overflow-auto flex-1 p-1">
                                            {(() => {
                                                const filtered = products.filter((p: any) => smartSearch(`${p.Nombre} ${p.ID_Producto}`, productSearch));
                                                if (filtered.length === 0) return <div className="p-4 text-center text-xs text-slate-400 font-bold">No se encontraron productos</div>;
                                                return filtered.slice(0, 30).map((p: any) => (
                                                    <div
                                                        key={p.ID_Producto}
                                                        className="px-3 py-3 md:py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer rounded-lg mb-1 flex flex-col md:flex-row justify-between md:items-center transition-colors"
                                                        onClick={() => {
                                                            const exists = localOrder.items.find((item: any) => String(item.id_prod) === String(p.ID_Producto));
                                                            if (!exists) {
                                                                const isKg = (p?.Unidad || '').toLowerCase() === 'kg';
                                                                const weightAvg = parseFloat(String(p.Peso || p.Peso_Promedio || "1").replace(',', '.'));
                                                                const unitPrice = parseFloat(String(p.Precio_Unitario || "0").replace(',', '.'));
                                                                const finalPrice = unitPrice * (isKg ? weightAvg : 1);

                                                                const newItem = {
                                                                    id: p.ID_Producto,
                                                                    id_prod: p.ID_Producto,
                                                                    nombre: p.Nombre,
                                                                    cantidad: 1,
                                                                    _formato: isKg ? 'KG' : 'UNID',
                                                                    precio: finalPrice,
                                                                    descuento: 0,
                                                                    subtotal: finalPrice,
                                                                    _pesableTratado: isKg
                                                                };
                                                                const next = { ...localOrder, items: [...localOrder.items, newItem] };
                                                                setLocalOrder(recalculatedOrder(next));
                                                            } else {
                                                                alert("Ese producto ya está en el pedido. Por favor, edita la cantidad existente.");
                                                            }
                                                            setProductDropdownOpen(false);
                                                            setProductSearch("");
                                                        }}
                                                    >
                                                        <span className="truncate pr-2 mb-1 md:mb-0">{p.Nombre}</span>
                                                        <span className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 px-2 py-0.5 rounded-full shrink-0 self-start md:self-auto">${parseFloat(String(p.Precio_Unitario || "0").replace(',', '.')).toLocaleString()}</span>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {isEditable && (
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 flex justify-between items-center mt-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <DollarSign size={16} />
                                    </div>
                                    <span className="text-xs font-black text-indigo-800 dark:text-indigo-400 uppercase tracking-widest">Descuento General (%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-indigo-500">%</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={rawInputs[`global_disc`] ?? (localOrder.descuento_general || 0)}
                                        onFocus={(e) => setRawInputs(prev => ({ ...prev, [`global_disc`]: e.target.value }))}
                                        onBlur={() => setRawInputs(prev => {
                                            const next = { ...prev };
                                            delete next[`global_disc`];
                                            return next;
                                        })}
                                        onChange={(e) => {
                                            const valStr = e.target.value;
                                            setRawInputs(prev => ({ ...prev, [`global_disc`]: valStr }));
                                            const valNum = parseFloat(valStr.replace(',', '.'));
                                            if (!isNaN(valNum)) handleGlobalDiscountChange(valNum);
                                        }}
                                        className="w-24 h-9 px-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-xs font-black text-center text-indigo-600 focus:ring-2 ring-indigo-500"
                                    />
                                </div>
                            </div>
                        )}

                        {!isEditable && parseFloat(localOrder.descuento_general || 0) > 0 && (() => {
                            const itemsSubAfterDisc = localOrder.items.reduce((acc: number, it: any) => {
                                const sub = (parseFloat(it.cantidad) || 0) * (parseFloat(it.precio) || 0);
                                const discP = parseFloat(it.descuento || 0);
                                return acc + (sub * (1 - discP / 100));
                            }, 0);
                            const globalDiscAmount = itemsSubAfterDisc * (parseFloat(localOrder.descuento_general) / 100);
                            return (
                                <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl flex justify-between items-center text-rose-600">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Descuento Global ({localOrder.descuento_general}%)</span>
                                    <span className="font-black text-sm">-${globalDiscAmount.toLocaleString()}</span>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div className="p-6 border-t border-[var(--border)] bg-slate-50 dark:bg-slate-800/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total a Pagar</p>
                        <p className="text-3xl font-black text-indigo-600 leading-none">${parseFloat(localOrder.total).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {isEditable ? (
                            <button
                                onClick={() => onUpdateOrder(localOrder)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                            >
                                <Save size={18} /> Guardar Cambios
                            </button>
                        ) : (
                            <button
                                onClick={onPrint}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                            >
                                <Printer size={18} /> Remito
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                        >
                            {isEditable ? 'Cancelar' : 'Cerrar'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

function OrderCard({ order, isSelected, onSelect, onViewDetail, onPrint }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`tech-card p-4 flex gap-4 cursor-pointer transition-all border-2 ${isSelected ? 'border-indigo-500 bg-indigo-500/5 shadow-2xl shadow-indigo-500/5' : 'border-transparent'}`}
            onClick={onSelect}
        >
            <div className="flex-shrink-0 pt-1">
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300'}`}>
                    {isSelected && <CheckCircle2 size={16} />}
                </div>
            </div>

            <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-sm leading-tight">{order.cliente_nombre}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">#{order.id}</p>
                        {order.notas && (
                            <div className="mt-1 flex items-start gap-1 p-1 bg-amber-50 dark:bg-amber-500/10 rounded-md border border-amber-100 dark:border-amber-500/20">
                                <Info size={10} className="text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 line-clamp-1">{order.notas}</p>
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="font-black text-xs text-indigo-600">${parseFloat(order.total).toLocaleString()}</p>
                        <span className="text-[8px] font-bold uppercase py-0.5 px-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                            {order.estado}
                        </span>
                    </div>
                </div>

                <div className="pt-2 border-t border-dashed border-[var(--border)] flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-3">
                        <span className="text-slate-500 flex items-center gap-1 font-medium">
                            <Package size={12} /> {order.items?.length || 0} items
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onPrint(); }}
                            className="text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1 font-bold"
                        >
                            <Printer size={12} /> Imprimir
                        </button>
                    </div>
                    <span
                        className="text-indigo-500 font-bold flex items-center gap-1 hover:underline active:scale-95 transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail();
                        }}
                    >
                        Ver / Editar <ChevronRight size={12} />
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

function RouteCard({ name, orderCount, index, isReopened, onManage, onViewOrders, onDelete, onPrintRemitos, onPrintRouteSheet, onPrintPicking, onSettlement }: any) {
    const [showPrintOptions, setShowPrintOptions] = useState(false);

    return (
        <div className={`tech-card overflow-hidden group transition-all duration-300 ${isReopened ? 'ring-2 ring-amber-500/30' : ''}`}>
            {isReopened && (
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-black uppercase tracking-[0.2em] py-1 text-center shadow-sm">
                    Planilla Reabierta (Ya liquidada anteriormente)
                </div>
            )}
            <div className="p-5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${isReopened ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600' : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-500'}`}>
                        <div className="relative">
                            <Truck size={24} />
                            <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-[var(--border)] flex items-center justify-center text-[10px] font-black shadow-lg text-slate-800 dark:text-white">
                                {index}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className={`font-black text-lg group-hover:text-indigo-500 transition-colors ${isReopened ? 'text-amber-700 dark:text-amber-500' : ''}`}>{name}</h4>
                            {isReopened && (
                                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            )}
                        </div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{orderCount} entregas</p>
                    </div>
                </div>
                <div className="flex gap-2 relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); onViewOrders(); }}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500"
                        title="Ver Pedidos de esta ruta"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        onClick={() => setShowPrintOptions(!showPrintOptions)}
                        className={`p-2.5 rounded-xl transition-all ${showPrintOptions ? 'bg-indigo-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'}`}
                        title="Opciones de Impresión"
                    >
                        <Printer size={16} />
                    </button>

                    <AnimatePresence>
                        {showPrintOptions && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-10" onClick={() => setShowPrintOptions(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-900 border border-[var(--border)] rounded-2xl shadow-2xl z-20 p-2 overflow-hidden"
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowPrintOptions(false); onPrintRemitos(); }}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all text-left group/print"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover/print:bg-indigo-500 group-hover/print:text-white transition-all">
                                            <Printer size={14} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black">Remitos Masivos</p>
                                            <p className="text-[9px] text-slate-400">Todos los de la ruta</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowPrintOptions(false); onPrintPicking(); }}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all text-left group/print"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover/print:bg-emerald-500 group-hover/print:text-white transition-all">
                                            <Package size={14} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black">Picking List</p>
                                            <p className="text-[9px] text-slate-400">Consolidado pesables/otros</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowPrintOptions(false); onPrintRouteSheet(); }}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all text-left group/print"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 group-hover/print:bg-amber-500 group-hover/print:text-white transition-all">
                                            <MapPin size={14} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black">Hoja de Ruta</p>
                                            <p className="text-[9px] text-slate-400">Planilla de control</p>
                                        </div>
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 hover:bg-red-500 hover:text-white transition-all text-red-500"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-[var(--border)] flex justify-between items-center">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <MapPin size={12} /> Actualizado recientemente
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onManage}
                        className="p-2 px-4 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-indigo-500 hover:text-white transition-all"
                    >
                        Gestionar
                    </button>
                    <button
                        onClick={onSettlement}
                        className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg"
                    >
                        <Check size={14} /> Rendir Ruta
                    </button>
                </div>
            </div>
        </div>
    );
}

function RouteOrdersModal({ routeName, orders, onClose, onRemoveOrder }: any) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
                <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-indigo-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <Truck size={20} />
                        </div>
                        <div>
                            <h4 className="text-lg font-black">Pedidos: {routeName}</h4>
                            <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">{orders.length} pedidos asignados</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-auto divide-y divide-[var(--border)]">
                    {orders.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-bold">No hay pedidos en esta ruta</div>
                    ) : (
                        orders.map((order: any) => (
                            <div key={order.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-xl">
                                <div>
                                    <p className="font-bold text-sm">{order.cliente_nombre}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] text-slate-400 font-mono">#{order.id}</span>
                                        <span className="text-[9px] font-bold text-indigo-500 uppercase">{order.estado}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 italic line-clamp-1">{order.direccion || 'Sin dirección'}</p>
                                    {order.notas && (
                                        <div className="mt-2 flex items-start gap-1.5 p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-100 dark:border-amber-500/20 max-w-md">
                                            <Info size={12} className="text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 capitalize-first leading-tight">{order.notas}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="font-black text-sm text-slate-600 dark:text-slate-300">${parseFloat(order.total).toLocaleString()}</p>
                                    <button
                                        onClick={() => onRemoveOrder(order.id)}
                                        className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                        title="Quitar de esta ruta"
                                    >
                                        <ArrowLeft size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 border-t border-[var(--border)] bg-slate-50 dark:bg-slate-800/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                    >
                        Cerrar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function SettlementHistoryCard({ liquidacion, onRevert }: { liquidacion: any, onRevert: () => void }) {
    const affectedOrdersCount = useMemo(() => {
        try {
            const wrapper = JSON.parse(liquidacion.ORDENES_JSON || '{}');
            return wrapper.ordenes?.length || 0;
        } catch (e) { return 0; }
    }, [liquidacion.ORDENES_JSON]);

    const handlePrint = (mode: 'full' | 'audit' = 'full') => {
        let draft: any = {};
        try {
            draft = JSON.parse(liquidacion.DRAFT_JSON || '{}');
        } catch (e) { }

        let ordenes: any[] = [];
        try {
            const wrapper = JSON.parse(liquidacion.ORDENES_JSON || '{}');
            ordenes = wrapper.ordenes || [];
        } catch (e) { }

        // Recalcular métricas para el nuevo formato de reporte
        const stMethod = draft.settlementMethod || 'standard';
        const ordersForCalc = draft.localOrders || ordenes || [];

        const totalRendicion = ordersForCalc.reduce((acc: number, o: any) => {
            if (o.estado_rendicion === 'Rechazado' || o.estado === 'Rechazado') return acc;
            return acc + (o.total_final || o.total || 0);
        }, 0);

        const totalCargaRuta = ordersForCalc.reduce((acc: number, o: any) => acc + (parseFloat(o.total_original || o.total) || 0), 0);
        const totalDevVal = (draft.devoluciones || []).reduce((acc: number, d: any) => acc + (d.subtotal || 0), 0);

        const netoARendirVal = draft.localOrders ? (stMethod === 'standard' ? totalRendicion : totalCargaRuta) : parseFloat(liquidacion.TOTAL_NETO || 0);
        const gTotal = parseFloat(liquidacion.GASTOS || 0);
        const efecTotal = draft.billetes ? Object.entries(draft.billetes).reduce((acc, [den, qty]) => acc + (Number(den) * (qty as number)), 0) : parseFloat(liquidacion.EFECTIVO || 0);
        const transTotal = parseFloat(liquidacion.TRANSF || 0);

        const balDif = netoARendirVal - (
            (stMethod === 'alternative' ? totalDevVal : 0) +
            gTotal +
            efecTotal +
            transTotal
        );

        printSettlement({
            reparto: liquidacion.REPARTO,
            chofer: liquidacion.CHOFER,
            fecha: new Date(liquidacion.FECHA).toLocaleString(),
            id: liquidacion.ID_LIQ,
            efectivo: efecTotal,
            transf: transTotal,
            gastosTotal: gTotal,
            totalNeto: (efecTotal + transTotal) - gTotal,
            totalDevoluciones: stMethod === 'alternative' ? totalDevVal : 0,
            balanceDiferencia: balDif,
            netoARendir: netoARendirVal,
            billetes: draft.billetes,
            gastos: draft.gastos || [],
            ordenes: ordersForCalc.map((o: any) => ({
                id: o.id,
                cliente_nombre: o.cliente_nombre,
                estado: o.estado_rendicion || o.estado || 'Entregado',
                total: o.total_final || o.total,
                total_original: o.total_original || o.total,
                efectivo: o.pago_efectivo || 0,
                transf: o.pago_transferencia || 0
            }))
        }, mode);
    };

    return (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden p-6 gap-4 flex flex-col sm:flex-row sm:items-center justify-between transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-lg">{liquidacion.ID_LIQ}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(liquidacion.FECHA).toLocaleString()}</span>
                </div>
                <h4 className="font-black text-lg">{liquidacion.REPARTO} {liquidacion.CHOFER ? `- ${liquidacion.CHOFER}` : ''}</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mt-2">
                    <Package size={14} className="text-slate-400" />
                    {affectedOrdersCount} Registros afectados
                </div>
                {liquidacion.OBS && (
                    <div className="text-xs text-slate-500 mt-2 bg-orange-50 dark:bg-orange-500/10 p-2 rounded-lg inline-block text-orange-600 dark:text-orange-400">
                        <b>Obs:</b> {liquidacion.OBS}
                    </div>
                )}
            </div>

            <div className="flex flex-col items-end gap-2">
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] uppercase text-slate-400 font-bold mb-1 border-b border-[var(--border)] pb-1">Efectivo</p>
                        <p className="text-sm font-black text-emerald-600">${parseFloat(liquidacion.EFECTIVO || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase text-slate-400 font-bold mb-1 border-b border-[var(--border)] pb-1">Total Neto</p>
                        <p className="text-sm font-black text-indigo-600">${parseFloat(liquidacion.TOTAL_NETO || 0).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handlePrint('full')}
                        className="mt-2 px-4 py-2 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Printer size={14} /> Full
                    </button>
                    <button
                        onClick={() => handlePrint('audit')}
                        className="mt-2 px-4 py-2 bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Shield size={14} /> Auditoría
                    </button>
                    <button
                        onClick={onRevert}
                        className="mt-2 px-4 py-2 bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <RotateCcw size={14} /> Revertir
                    </button>
                </div>
            </div>
        </div>
    );
}
