"use client";

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
    MessageCircle,
    Copy,
    Save,
    RotateCcw,
    Check,
    CreditCard,
    DollarSign,
    Loader2,
    Settings,
    Clock,
    Edit2,
    Minus,
    Layers,
    Eye,
    ShoppingCart,
    Tag
} from "lucide-react";
import { wandaApi } from "@/lib/api";
import { useData } from "@/context/DataContext";
import { increment } from "firebase/firestore";

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
                const product = products.find(p => String(p.ID_Producto) === String(id));
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
    const [activeTab, setActiveTab] = useState<'pendientes' | 'rutas' | 'historial'>('pendientes');
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

    const allPendingOrders = useMemo(() => {
        return orders.filter(o => !o.reparto || o.reparto === '' || o.reparto === 'null');
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

    const routeNames = useMemo(() => {
        const set = new Set(orders.map(o => o.reparto).filter(r => r && r !== 'null' && r !== ''));
        return Array.from(set);
    }, [orders]);

    const groupedPendingOrders = useMemo(() => {
        const groups: Record<string, Record<string, any[]>> = {};
        filteredPendingOrders.forEach(o => {
            const date = o.fecha || 'Sin Fecha';
            const seller = o.vendedor || 'Sin Vendedor';
            if (!groups[date]) groups[date] = {};
            if (!groups[date][seller]) groups[date][seller] = [];
            groups[date][seller].push(o);
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

    const handleAssignToRoute = async () => {
        const routeName = prompt("Ingrese el nombre de la ruta (Chofer/Vehículo):");
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


    const printOrders = (orderList: any[]) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

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
                ${orderList.map(order => {
            const isLong = order.items && order.items.length > 14;
            const copies = ['ORIGINAL', 'DUPLICADO'].map((type) => `
                            <div class="remito ${isLong ? 'long-format' : ''}">
                                <div class="copy-type">${type}</div>
                                <div class="header">
                                        <div style="width: 45%;">
                                            <div class="company">${data?.config?.EMPRESA || 'WANDA DISTRIBUCIONES'}</div>
                                            <div class="company-details">${data?.config?.REMITO_DIRECCION || ''}</div>
                                            <div class="company-details">Tel: ${data?.config?.REMITO_TELEFONO || ''}</div>
                                        </div>
                                        <div style="display: flex; gap: 15px; align-items: center; width: 25%;">
                                            <div class="x-box">
                                                <span class="x-mark">X</span>
                                                <span class="x-sub">Doc. no válido<br>como factura</span>
                                            </div>
                                            <div>
                                                <div style="font-weight: 900; font-size: 12px;">PEDIDO</div>
                                                <div style="font-weight: 900; font-size: 14px;">${order.id.slice(-8)}</div>
                                            </div>
                                        </div>
                                        <div style="width: 30%; text-align: right; font-size: 10px; font-weight: bold;">
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
                                                    <th width="48%">DESCRIPCIÓN</th>
                                                    <th width="15%">P. UNIT.</th>
                                                    <th width="10%">BONIF.</th>
                                                    <th width="15%">TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${order.items?.filter((item: any) => (parseFloat(String(item.cantidad).replace(',', '.')) || 0) > 0).map((item: any) => {
                let prod = products.find(p => String(p.ID_Producto) === String(item.id_prod));
                if (!prod && item.nombre) {
                    prod = products.find(p => String(p.Nombre || '').trim().toLowerCase() === String(item.nombre).trim().toLowerCase());
                }
                const isKg = (prod?.Unidad || '').toLowerCase() === 'kg';
                const rawUb = prod?.UB ?? prod?.Unidades_Bulto;
                const parsedUb = parseFloat(String(rawUb).replace(',', '.'));
                const ub = (!rawUb || String(rawUb).trim() === '' || isNaN(parsedUb) || parsedUb === 0) ? 1 : parsedUb;
                const qty = parseFloat(String(item.cantidad).replace(',', '.')) || 0;
                const price = parseFloat(String(item.precio).replace(',', '.')) || 0;
                const disc = parseFloat(String(item.descuento || 0).replace(',', '.')) || 0;
                const subtotal = (qty * price) * (1 - disc / 100);

                let displayQty = "";
                const isDetalleBulto = String(item.detalle || item.nombre || '').toUpperCase().includes('BULTO');
                const formatVal = String(item._formato || item.formato || (isDetalleBulto ? 'BULTO' : '')).toUpperCase();
                const baseUnit = String(prod?.Unidad || 'UNID').toUpperCase();
                const unitLabel = baseUnit.startsWith('UNID') || baseUnit === 'U' || baseUnit === '' ? 'U' : baseUnit;

                if (isKg) {
                    displayQty = `${qty.toFixed(2)} KG`;
                } else if (ub > 1) {
                    const bul = Math.floor(qty / ub);
                    const uni = Math.round((qty % ub) * 100) / 100;
                    if (bul > 0 && uni === 0) {
                        displayQty = `${bul} BUL <span style="font-size: 8px; font-weight: bold; color: #333;">(x${ub} ${unitLabel})</span>`;
                    } else if (bul > 0) {
                        displayQty = `${bul} BUL + ${uni} ${unitLabel}`;
                    } else {
                        displayQty = `${qty} ${unitLabel}`;
                    }
                } else {
                    displayQty = `${qty} ${unitLabel}`;
                }

                return `
                                                        <tr class="item-row">
                                                            <td class="cen" style="font-weight: bold">${displayQty}</td>
                                                            <td style="font-weight: bold">${item.nombre}</td>
                                                            <td class="num">$ ${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                            <td class="cen">${disc > 0 ? `${disc}%` : '-'}</td>
                                                            <td class="num" style="font-weight: bold">$ ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    `;
            }).join('')}
                                                <!-- Empty row to stretch borders to bottom -->
                                                <tr>
                                                    <td></td><td></td><td></td><td></td><td></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <div class="footer">
                                        <div class="obs">Obs: ................................................................................</div>
                                        <div class="totals-box">
                                            <div class="subtotal-row">
                                                <span>Subtotal:</span>
                                                <span>$ ${parseFloat(String(order.items?.reduce((acc: number, val: any) => acc + (parseFloat(String(val.subtotal).replace(',', '.')) || 0), 0) || order.total).replace(',', '.')).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            ${parseFloat(String(order.descuento_general || 0).replace(',', '.')) > 0 ? `
                                            <div class="subtotal-row" style="color: #444;">
                                                <span>Desc. General:</span>
                                                <span>-${order.descuento_general}%</span>
                                            </div>
                                            ` : ''}
                                            <div class="total-row">
                                                <span>Total:</span>
                                                <span>$ ${parseFloat(String(order.total).replace(',', '.')).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
                let prod = products.find(p => String(p.ID_Producto) === String(id));
                if (!prod && item.nombre) {
                    prod = products.find(p => String(p.Nombre || '').trim().toLowerCase() === String(item.nombre).trim().toLowerCase());
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
            if (ub <= 1) return `${qty} ${unitLabel}`;
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
                    .client-list { margin-top: 2px; font-size: 9px; color: #555; border-top: 1px dashed #eee; padding-top: 2px; }
                    .client-item { display: flex; justify-content: space-between; margin-bottom: 0px; }
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
                                                        <span>\u2022 ${c.nombre}</span>
                                                        <span style="font-weight: bold;">${c.cantidad.toFixed(2)} KG</span>
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

    const printRouteSheet = (orderList: any[], routeName: string) => {
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
                    .footer { margin-top: 15px; display: grid; grid-template-cols: 1fr 1fr; gap: 15px; }
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
                            <th width="30">#</th>
                            <th>CLIENTE</th>
                            <th width="120">FORMA PAGO</th>
                            <th width="120">A COBRAR</th>
                            <th width="150">ESTADO / FIRMA</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orderList.map((order, i) => `
                            <tr>
                                <td style="color: #94a3b8; font-weight: bold; font-size: 10px;">${i + 1}</td>
                                <td>
                                    <div style="font-weight: 900; font-size: 11px; line-height: 1.1;">${order.cliente_nombre}</div>
                                    ${order.notas ? `<div style="color: #d97706; font-size: 8px; margin-top: 1px; font-weight: bold;">${order.notas}</div>` : ''}
                                </td>
                                <td style="font-weight: bold; text-transform: uppercase; color: #475569; font-size: 9px;"></td>
                                <td style="font-weight: 900; font-size: 12px;">$${(parseFloat(String(order.total).replace(',', '.')) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td align="center" style="color: #ccc; font-size: 10px;">________________</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="summary">
                    <div class="summary-item">BULTOS TOTALES: <b>${Math.round(orderList.reduce((acc, o) => {
            return acc + (o.items?.reduce((iAcc: number, it: any) => {
                const p = products.find(prod => String(prod.ID_Producto) === String(it.id_prod || it.id_producto || it.id));
                const rawUb = p?.UB || p?.Unidades_Bulto || "1";
                const ub = parseFloat(String(rawUb).replace(',', '.')) || 1;
                const isKg = (p?.Unidad || '').toLowerCase() === 'kg';
                if (isKg) return iAcc;
                return iAcc + (parseFloat(String(it.cantidad).replace(',', '.')) / ub);
            }, 0) || 0);
        }, 0))}</b></div>
                    <div class="summary-item">VALOR TOTAL CARGA: <b>$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></div>
                    <div class="summary-item">TOTAL ENTREGAS: <b>${orderList.length}</b></div>
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
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black">Logística</h2>
                    <p className="text-slate-500 text-sm">Organiza entregas y optimiza tus rutas.</p>
                </div>

                <div className="flex bg-[var(--card)] border border-[var(--border)] p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('pendientes')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'pendientes' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500'}`}
                    >
                        Pendientes ({allPendingOrders.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('rutas')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'rutas' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500'}`}
                    >
                        Hojas de Ruta ({routeNames.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('historial')}
                        className={`px-4 py-2 flex items-center gap-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'historial' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500'}`}
                    >
                        Historial ({liquidaciones.length})
                    </button>
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
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Vista Grilla"
                                        >
                                            <LayoutGrid size={16} />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Vista Lista"
                                        >
                                            <List size={16} />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('grouped')}
                                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grouped' ? 'bg-white dark:bg-slate-700 text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Vista Agrupada"
                                        >
                                            <Layers size={16} />
                                        </button>
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
                                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${selectedOrders.size === filteredPendingOrders.length && filteredPendingOrders.length > 0 ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300'}`}
                                                    >
                                                        {selectedOrders.size === filteredPendingOrders.length && filteredPendingOrders.length > 0 && <CheckCircle2 size={12} />}
                                                        {selectedOrders.size > 0 && selectedOrders.size < filteredPendingOrders.length && <div className="w-2 h-0.5 bg-slate-400" />}
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
                                                    className={`hover:bg-indigo-500/5 transition-colors cursor-pointer ${selectedOrders.has(order.id) ? 'bg-indigo-500/5' : ''}`}
                                                    onClick={() => toggleOrderSelection(order.id)}
                                                >
                                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                                        <div
                                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedOrders.has(order.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300'}`}
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
                                                            Pendiente
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
                                    {Object.keys(groupedPendingOrders).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => {
                                        const dateKey = `date_${date}`;
                                        const isDateExpanded = expandedGroups.has(dateKey);
                                        const sellersInDate = Object.keys(groupedPendingOrders[date]).sort();
                                        const totalOrdersInDate = sellersInDate.reduce((acc, s) => acc + groupedPendingOrders[date][s].length, 0);

                                        return (
                                            <div key={date} className="space-y-4">
                                                <div
                                                    onClick={() => toggleGroup(dateKey)}
                                                    className="flex items-center justify-between group cursor-pointer bg-slate-100 dark:bg-slate-800/50 p-3 rounded-2xl border border-[var(--border)] sticky top-0 z-10 backdrop-blur-md"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                            <Calendar size={14} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-100">{date}</h4>
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase">{totalOrdersInDate} pedidos en total</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="hidden sm:flex gap-2">
                                                            <span className="text-[10px] font-black bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-[var(--border)]">{sellersInDate.length} vendedores</span>
                                                        </div>
                                                        {isDateExpanded ? <ChevronUp size={16} className="text-indigo-500" /> : <ChevronDown size={16} className="text-slate-400" />}
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {isDateExpanded && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 p-1">
                                                                {sellersInDate.map(seller => {
                                                                    const groupOrders = groupedPendingOrders[date][seller];
                                                                    const totalGroup = groupOrders.reduce((acc, o) => acc + parseFloat(o.total), 0);
                                                                    const allGroupSelected = groupOrders.every(o => selectedOrders.has(o.id));
                                                                    const sellerKey = `seller_${date}_${seller}`;
                                                                    const isSellerExpanded = expandedGroups.has(sellerKey);

                                                                    return (
                                                                        <div key={seller} className={`tech-card border transition-all overflow-hidden ${isSellerExpanded ? 'border-indigo-500/50 ring-4 ring-indigo-500/5' : 'border-[var(--border)]'}`}>
                                                                            <div
                                                                                onClick={() => toggleGroup(sellerKey)}
                                                                                className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${isSellerExpanded ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                                                                            >
                                                                                <div className="flex items-center gap-4">
                                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSellerExpanded ? 'bg-indigo-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                                                        <User size={18} />
                                                                                    </div>
                                                                                    <div>
                                                                                        <h5 className="font-bold text-sm">{seller}</h5>
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
                                                                                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${allGroupSelected ? 'bg-indigo-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                                                                                    >
                                                                                        <Check size={12} strokeWidth={4} />
                                                                                        {allGroupSelected ? 'Todos' : 'Marcar'}
                                                                                    </button>
                                                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors">
                                                                                        {isSellerExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <AnimatePresence>
                                                                                {isSellerExpanded && (
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
                                                                                                            className={`p-3 flex items-center gap-3 transition-colors hover:bg-indigo-500/5 cursor-pointer ${isSelected ? 'bg-indigo-500/10' : ''}`}
                                                                                                            onClick={(e) => {
                                                                                                                if ((e.target as HTMLElement).closest('.collapse-btn')) return;
                                                                                                                toggleOrderSelection(order.id);
                                                                                                            }}
                                                                                                        >
                                                                                                            <div
                                                                                                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'}`}
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
                                                                                            <span>Total Vendedor</span>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {routeNames.map(routeName => (
                                <RouteCard
                                    key={routeName as string}
                                    name={routeName as string}
                                    orderCount={orders.filter(o => o.reparto === routeName).length}
                                    onManage={() => setEditingRoute(routeName as string)}
                                    onViewOrders={() => setViewingOrdersRoute(routeName as string)}
                                    onDelete={() => handleLiberarReparto(routeName as string)}
                                    onPrintRemitos={() => printOrders(orders.filter(o => o.reparto === routeName))}
                                    onPrintRouteSheet={() => printRouteSheet(orders.filter(o => o.reparto === routeName), routeName as string)}
                                    onPrintPicking={() => printPickingList(orders.filter(o => o.reparto === routeName), routeName as string)}
                                    onSettlement={() => setSettlingRoute(routeName as string)}
                                />
                            ))}
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
                                        key={liq.id_liq}
                                        liquidacion={liq}
                                        onRevert={async () => {
                                            if (!confirm(`¿Estás seguro de REVERTIR la liquidación ${liq.id_liq}? Esto restaurará los estados de los pedidos y borrará este registro.`)) return;
                                            try {
                                                const res = await wandaApi.revertLiquidacion(liq.id_liq);
                                                if (res.result === 'OK') {
                                                    alert("Liquidación revertida con éxito.");
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
                        key={`${editingRoute}_${refreshCounter}`}
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
        return consolidated.filter((prod: any) =>
            smartSearch(prod.nombre, searchTerm) ||
            prod.deliveries.some((d: any) => smartSearch(d.cliente, searchTerm))
        );
    }, [consolidated, searchTerm]);

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
        if (ub <= 1) return `${qty} ${unitLabel}`;
        const bul = Math.floor(qty / ub);
        const uni = Math.round((qty % ub) * 100) / 100;
        if (bul === 0) return `${uni} ${unitLabel}`;
        if (uni === 0) return `${bul} BUL`;
        return `${bul} BUL + ${uni} ${unitLabel}`;
    };

    const totalRuta = useMemo(() => {
        return localOrders.reduce((acc: number, o: any) => acc + (parseFloat(o.total) || 0), 0);
    }, [localOrders]);

    const toggleProduct = (id: string) => {
        setExpandedProduct(prev => (prev === id ? null : id));
    };

    const handleShareWhatsApp = () => {
        let msg = `🚚 *HOJA DE RUTA: ${routeName}*\n🗓️ ${new Date().toLocaleDateString()}\n\n`;
        const uniqueClients = [...new Set(localOrders.map((o: any) => o.cliente_nombre))];

        uniqueClients.forEach((cn, i) => {
            const client = clients.find((c: any) => c.Nombre_Negocio === cn) || {};
            const dir = client.Direccion ? `${client.Direccion}, ${client.Zona || ''}`.trim() : 'Sin dirección';
            msg += `*${i + 1}. ${cn}*\n🏠 ${dir}\n📞 ${client.Telefono || 'N/A'}\n\n`;
        });

        const stops = localOrders.map((o: any) => {
            const c = clients.find((cl: any) => cl.Nombre_Negocio === o.cliente_nombre) || {};
            return c.Direccion ? encodeURIComponent(c.Direccion) : null;
        }).filter(Boolean);

        if (stops.length > 0) {
            msg += `🗺️ *Recorrido Google Maps:*\nhttps://www.google.com/maps/dir//${stops.join('/')}\n`;
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
            className="fixed md:left-64 inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
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
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">
                                                                    {idx + 1}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-xs">{delivery.cliente}</p>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">#{delivery.orderId}</p>
                                                                </div>
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
                                                                            onPrintOrder(delivery.orderId);
                                                                        }}
                                                                        className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:bg-slate-200 transition-all"
                                                                        title="Imprimir Remito"
                                                                    >
                                                                        <Printer size={14} />
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
            pago_efectivo: 0,
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
    const [devoluciones, setDevoluciones] = useState<{ id_prod: string, nombre: string, qty: number, precio: number, subtotal: number }[]>([]);
    const [returnSearch, setReturnSearch] = useState("");
    const [showReturnDropdown, setShowReturnDropdown] = useState(false);

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
    const totalCaja = settlementMethod === 'standard'
        ? (pagos.efectivo + pagos.transferencia)
        : totalPagosPedidos;

    const handleSave = async () => {
        try {
            setIsSyncing(true);

            // Si es método alternativo, pre-procesamos los estados basados en pagos o marcándolos como entregados
            // y procesamos el stock de las devoluciones manuales.
            let finalOrders = JSON.parse(JSON.stringify(localOrders));

            if (settlementMethod === 'alternative') {
                // En el método alternativo, asumimos que todo se entregó menos lo que ingresamos como devolución manual
                // El stock de devoluciones manuales lo manejamos aparte.
                finalOrders = finalOrders.map((o: any) => ({
                    ...o,
                    estado: 'Entregado', // Por defecto en Alt, se marca entregado
                    total: o.total_original // Mantiene su total original
                }));

                // Actualizar stock de devoluciones manuales
                if (devoluciones.length > 0) {
                    await wandaApi.bulkUpdateProducts(devoluciones.map(d => ({
                        id: d.id_prod,
                        Stock: increment(d.qty)
                    })));
                }
            }

            const payload = {
                reparto: routeName,
                chofer,
                ordenes: finalOrders.map((o: any) => ({
                    id: o.id,
                    estado: o.estado_rendicion || 'Entregado',
                    total: o.total_final || o.total_original,
                    items: o.items
                })),
                pagos: settlementMethod === 'alternative' ? {
                    efectivo: localOrders.reduce((acc: number, o: any) => acc + (o.pago_efectivo || 0), 0),
                    transferencia: localOrders.reduce((acc: number, o: any) => acc + (o.pago_transferencia || 0), 0)
                } : pagos,
                gastos,
                notas: `Liquidación de ruta ${routeName}${settlementMethod === 'alternative' ? ' (Método Alternativo)' : ''}`
            };

            const res = await wandaApi.liquidarRuta(payload);
            if (res.result === 'OK' || !res.error) {
                alert("Ruta liquidada con éxito");
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
            className="fixed md:left-64 inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[95vh] sm:h-[90vh] rounded-[30px] sm:rounded-[40px] overflow-hidden shadow-2xl flex flex-col border border-white/20"
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-[var(--border)] flex justify-between items-center bg-gradient-to-r from-slate-900 to-indigo-950 text-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10 shadow-inner">
                            <Check size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-black tracking-tight leading-none">Rendición de Ruta</h3>
                                <div className="flex bg-white/10 p-1 rounded-xl">
                                    <button
                                        onClick={() => setSettlementMethod('standard')}
                                        className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${settlementMethod === 'standard' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white/60'}`}
                                    >
                                        Estándar
                                    </button>
                                    <button
                                        onClick={() => setSettlementMethod('alternative')}
                                        className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${settlementMethod === 'alternative' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white/60'}`}
                                    >
                                        Alternativo
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                                <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">{routeName}</p>
                                <span className="text-slate-500 text-[10px] opacity-30">|</span>
                                <input
                                    type="text"
                                    placeholder="NOMBRE CHOFER"
                                    value={chofer}
                                    onChange={e => setChofer(e.target.value)}
                                    className="bg-white/10 border-none rounded-lg px-2 py-1 text-[10px] font-black text-white placeholder:text-white/30 focus:ring-1 ring-white/20 w-32 sm:w-48"
                                />
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    <div className="flex-[1.5] overflow-auto p-6 space-y-4 border-r border-[var(--border)]">
                        {settlementMethod === 'standard' ? (
                            <>
                                <div className="flex flex-col gap-3 mb-6 px-2">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <LayoutGrid size={14} className="text-indigo-500" /> Detalle de Entregas
                                    </h4>
                                    <div className="flex items-center gap-3">
                                        <div className="relative group flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Buscar por cliente, ID o ruta..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2 pl-9 pr-4 text-[11px] font-bold focus:ring-2 ring-indigo-500/20 transition-all shadow-sm"
                                            />
                                        </div>
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
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowReturnDropdown(!showReturnDropdown)}
                                                className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                                            >
                                                <Plus size={14} /> Agregar Devolución
                                            </button>

                                            {showReturnDropdown && (
                                                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 border border-[var(--border)] rounded-2xl shadow-2xl z-[60] overflow-hidden p-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar producto..."
                                                        autoFocus
                                                        value={returnSearch}
                                                        onChange={(e) => setReturnSearch(e.target.value)}
                                                        className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs font-bold mb-2 outline-none"
                                                    />
                                                    <div className="max-h-48 overflow-auto space-y-1">
                                                        {products.filter((p: any) => smartSearch(p.Nombre, returnSearch)).slice(0, 10).map((p: any) => (
                                                            <button
                                                                key={p.ID_Producto}
                                                                onClick={() => {
                                                                    const exists = devoluciones.find(d => d.id_prod === p.ID_Producto);
                                                                    const price = parseFloat(String(p.Precio_Unitario || 0).replace(',', '.'));
                                                                    if (exists) {
                                                                        setDevoluciones(prev => prev.map(d => d.id_prod === p.ID_Producto ? { ...d, qty: d.qty + 1, subtotal: (d.qty + 1) * d.precio } : d));
                                                                    } else {
                                                                        setDevoluciones([...devoluciones, { id_prod: p.ID_Producto, nombre: p.Nombre, qty: 1, precio: price, subtotal: price }]);
                                                                    }
                                                                    setShowReturnDropdown(false);
                                                                    setReturnSearch("");
                                                                }}
                                                                className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-bold"
                                                            >
                                                                {p.Nombre}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] overflow-hidden">
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
                                                            <div className="flex items-center justify-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    value={dev.qty}
                                                                    onChange={(e) => {
                                                                        const n = parseFloat(e.target.value) || 0;
                                                                        setDevoluciones(prev => prev.map((d, i) => i === idx ? { ...d, qty: n, subtotal: n * d.precio } : d));
                                                                    }}
                                                                    className="w-12 text-center bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1 text-xs font-black"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex justify-center">
                                                                <input
                                                                    type="number"
                                                                    value={dev.precio}
                                                                    onChange={(e) => {
                                                                        const p = parseFloat(e.target.value) || 0;
                                                                        setDevoluciones(prev => prev.map((d, i) => i === idx ? { ...d, precio: p, subtotal: d.qty * p } : d));
                                                                    }}
                                                                    className="w-16 text-center bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1 text-xs font-black"
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
                                                {localOrders.map((order: any, idx) => (
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
                                                                        setLocalOrders(prev => prev.map((o, i) => i === idx ? { ...o, pago_efectivo: val } : o));
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
                                                                        setLocalOrders(prev => prev.map((o, i) => i === idx ? { ...o, pago_transferencia: val } : o));
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
                                                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-xl font-black text-slate-800 dark:text-slate-100"
                                                    placeholder="0.00"
                                                />
                                            </div>
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
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <RotateCcw size={14} className="text-rose-500" /> Gastos de Ruta
                                </h4>
                                <button
                                    onClick={() => setGastos([...gastos, { desc: '', monto: 0 }])}
                                    className="p-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

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

                            <div className="p-6 bg-slate-900 dark:bg-white rounded-[32px] text-white dark:text-slate-900 shadow-2xl shadow-indigo-500/10">
                                <div className="flex justify-between items-end mb-1">
                                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Saldo Neto a Rendir</p>
                                    <div className="text-right">
                                        {settlementMethod === 'standard' ? (
                                            <p className={`text-[10px] font-black px-2 py-0.5 rounded-full ${Math.abs(totalCaja - (totalRendicion - totalGastos)) < 10 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                {Math.abs(totalCaja - (totalRendicion - totalGastos)) < 10
                                                    ? 'BALANCEADO'
                                                    : `${totalCaja - (totalRendicion - totalGastos) > 0 ? 'SOBRANTE' : 'FALTANTE'}: $${Math.abs(totalCaja - (totalRendicion - totalGastos)).toLocaleString()}`
                                                }
                                            </p>
                                        ) : (
                                            <p className={`text-[10px] font-black px-2 py-0.5 rounded-full ${Math.abs(totalCaja - (totalCargaRuta - totalDevolucionesVal - totalGastos)) < 10 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                {Math.abs(totalCaja - (totalCargaRuta - totalDevolucionesVal - totalGastos)) < 10
                                                    ? 'BALANCEADO'
                                                    : `${totalCaja - (totalCargaRuta - totalDevolucionesVal - totalGastos) > 0 ? 'SOBRANTE' : 'FALTANTE'}: $${Math.abs(totalCaja - (totalCargaRuta - totalDevolucionesVal - totalGastos)).toLocaleString()}`
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black mb-4">
                                    ${(settlementMethod === 'standard'
                                        ? (totalRendicion - totalGastos)
                                        : (totalCargaRuta - totalDevolucionesVal - totalGastos)
                                    ).toLocaleString()}
                                </h3>

                                <div className="flex justify-between items-center">
                                    <div className="text-[9px] font-black uppercase opacity-60 tracking-tighter">Entregado por Chofer</div>
                                    <div className="text-lg font-black">${totalCaja.toLocaleString()}</div>
                                </div>
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
        </motion.div>
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
            className="fixed md:left-64 inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl"
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
            className="fixed md:left-64 inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
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
                                            {products.filter((p: any) => smartSearch(p.Nombre, productSearch)).length === 0 ? (
                                                <div className="p-4 text-center text-xs text-slate-400 font-bold">No se encontraron productos</div>
                                            ) : products.filter((p: any) => smartSearch(p.Nombre, productSearch)).map((p: any) => (
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
                                            ))}
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

function RouteCard({ name, orderCount, onManage, onViewOrders, onDelete, onPrintRemitos, onPrintRouteSheet, onPrintPicking, onSettlement }: any) {
    const [showPrintOptions, setShowPrintOptions] = useState(false);

    return (
        <div className="tech-card overflow-hidden group">
            <div className="p-5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
                        <Truck size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-lg group-hover:text-indigo-500 transition-colors">{name}</h4>
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
            className="fixed md:left-64 inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
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
    return (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden p-6 gap-4 flex flex-col sm:flex-row sm:items-center justify-between transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-lg">{liquidacion.id_liq}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(liquidacion.fecha).toLocaleString()}</span>
                </div>
                <h4 className="font-black text-lg">{liquidacion.reparto} {liquidacion.chofer ? `- ${liquidacion.chofer}` : ''}</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mt-2">
                    <Package size={14} className="text-slate-400" />
                    {liquidacion.ordenes?.length || 0} Registros afectados
                </div>
                {liquidacion.obs && (
                    <div className="text-xs text-slate-500 mt-2 bg-orange-50 dark:bg-orange-500/10 p-2 rounded-lg inline-block text-orange-600 dark:text-orange-400">
                        <b>Obs:</b> {liquidacion.obs}
                    </div>
                )}
            </div>

            <div className="flex flex-col items-end gap-2">
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] uppercase text-slate-400 font-bold mb-1 border-b border-[var(--border)] pb-1">Efectivo</p>
                        <p className="text-sm font-black text-emerald-600">${parseFloat(liquidacion.efectivo || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase text-slate-400 font-bold mb-1 border-b border-[var(--border)] pb-1">Total Neto</p>
                        <p className="text-sm font-black text-indigo-600">${parseFloat(liquidacion.total_neto || 0).toLocaleString()}</p>
                    </div>
                </div>
                <button
                    onClick={onRevert}
                    className="mt-2 px-4 py-2 bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                >
                    <RotateCcw size={14} /> Revertir Liquidación
                </button>
            </div>
        </div>
    );
}
