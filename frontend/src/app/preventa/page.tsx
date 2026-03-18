"use client";

import { useState, useMemo, useEffect, useRef, useDeferredValue } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    ShoppingCart,
    User,
    Clock,
    Settings,
    Plus,
    Mic,
    X,
    ChevronUp,
    ChevronDown,
    MoreHorizontal,
    CheckCircle2,
    Package,
    Store,
    ImageIcon,
    Trash2,
    MessageCircle,
    LayoutList,
    FolderTree,
    ArrowRight,
    Lock,
    Key,
    UserCheck,
    AlertCircle,
    LogOut,
    ArrowLeft,
    Bell,
    FileText,
    EyeOff,
    Trash,
    FileEdit,
    Edit3
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { wandaApi } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getImageUrl, normalizeText, smartSearch } from "@/lib/utils";

type Product = {
    ID_Producto: string;
    Nombre: string;
    Categoria: string;
    Precio_Unitario: string;
    Unidades_Bulto: string;
    Peso_Promedio: string;
    Unidad: string;
    Imagen_URL?: string;
};

type Client = {
    ID_Cliente: string;
    Nombre_Negocio: string;
    Dueño: string;
    Direccion: string;
    Telefono?: string;
    Latitud?: string;
    Longitud?: string;
    EsLocal?: boolean;
};

export default function PreventaPage() {
    const { data, refreshData } = useData();
    const products: Product[] = useMemo(() => {
        let prods = data?.products || [];
        const config = data?.config || {};
        const hideLowPrice = config.HIDE_LOW_PRICE === 'true' || config.HIDE_LOW_PRICE === true;
        const hideNoStock = config.HIDE_NO_STOCK === 'true' || config.HIDE_NO_STOCK === true;

        if (hideLowPrice) prods = prods.filter((p: any) => parseFloat(p.Precio_Unitario || 0) >= 1);
        if (hideNoStock) prods = prods.filter((p: any) => parseFloat(p.Stock_Actual || 0) > 0);
        return prods;
    }, [data]);
    const clients: Client[] = data?.clients || [];

    const [searchTerm, setSearchTerm] = useState("");
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const [clientSearch, setClientSearch] = useState("");
    const deferredClientSearch = useDeferredValue(clientSearch);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [carrito, setCarrito] = useState<{ [key: string]: number }>({});
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [historySearch, setHistorySearch] = useState("");
    const [historyDate, setHistoryDate] = useState("");
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vendedorName, setVendedorName] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem("vendedor_name") || "";
        }
        return "";
    });
    const [selectedSellerToVerify, setSelectedSellerToVerify] = useState<any>(null);
    const [tempPassword, setTempPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [modoBulto, setModoBulto] = useState<{ [key: string]: boolean }>({});
    const [isListening, setIsListening] = useState<'client' | null | 'product'>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [searchOnlyByCode, setSearchOnlyByCode] = useState(false);
    const [viewingOrder, setViewingOrder] = useState<any>(null);
    const [editingOrder, setEditingOrder] = useState<any>(null);
    const [activeSearch, setActiveSearch] = useState<'client' | 'product' | null>(null);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [expandedBanner, setExpandedBanner] = useState<string | null>(null);
    const [seenBannerIds, setSeenBannerIds] = useState<Set<string>>(new Set());
    const [openHistoryDates, setOpenHistoryDates] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [navLayout, setNavLayout] = useState<'header' | 'fab'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem("nav_layout") as 'header' | 'fab') || 'header';
        }
        return 'header';
    });
    const [isFABOpen, setIsFABOpen] = useState(false);
    const [hiddenOrderIds, setHiddenOrderIds] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem("hidden_orders");
            return saved ? new Set(JSON.parse(saved)) : new Set();
        }
        return new Set();
    });

    useEffect(() => {
        localStorage.setItem("hidden_orders", JSON.stringify(Array.from(hiddenOrderIds)));
    }, [hiddenOrderIds]);
    const clientInputRef = useRef<HTMLInputElement>(null);
    const productInputRef = useRef<HTMLInputElement>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
                setIsClientDropdownOpen(false);
                if (activeSearch === 'client') setActiveSearch(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeSearch]);

    // Nuevos estados para funcionalidades faltantes
    const [localClients, setLocalClients] = useState<Client[]>([]);
    const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
    const [isClientDetailOpen, setIsClientDetailOpen] = useState(false);
    const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
    const [quickNotice, setQuickNotice] = useState<{ message: string, color: string } | null>(null);
    const [orderNotes, setOrderNotes] = useState("");
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [lastOrderData, setLastOrderData] = useState<any>(null);

    const carouselBanners = useMemo(() => {
        const banners: any[] = [];

        // 1. Notificaciones del Sistema — solo las dirigidas a Preventistas
        const config = data?.config || {};
        const systemNotifsRaw = config.SYSTEM_NOTIFICATIONS;

        if (systemNotifsRaw) {
            try {
                const parsedNotifs = JSON.parse(systemNotifsRaw);
                if (Array.isArray(parsedNotifs)) {
                    parsedNotifs
                        .filter((n: any) => n.active && (n.audiencia === 'preventista' || n.audiencia === 'todos' || !n.audiencia))
                        .forEach((n: any) => {
                            banners.push({
                                id: `sys-${n.id}`,
                                type: 'info',
                                title: n.title || 'Aviso Sistema',
                                subtitle: n.text,
                                icon: '📢',
                                color: 'bg-amber-600',
                                details: 'Comunicado oficial para preventistas.'
                            });
                        });
                }
            } catch (e) {
                console.error("Error parsing system notifications", e);
            }
        }

        return banners;
    }, [data, products]);

    const [newClientData, setNewClientData] = useState({
        Nombre_Negocio: "",
        Dueño: "",
        Telefono: "",
        Direccion: "",
        Latitud: "",
        Longitud: ""
    });
    const [isLocating, setIsLocating] = useState(false);

    const allClients = useMemo(() => {
        const baseClients = clients || [];
        const requestClients = (data?.client_requests || [])
            .filter((cr: any) => cr.vendedor === vendedorName || cr.origen === vendedorName)
            .map((cr: any) => ({
                ...cr,
                ID_Cliente: cr.id,
                Nombre_Negocio: cr.Nombre_Negocio,
                EsLocal: true, // Marcamos como local/pendiente para UI
            }));
        return [...requestClients, ...baseClients];
    }, [data?.client_requests, clients, vendedorName]);

    useEffect(() => {
        // Cargar pedidos pendientes desde localStorage al montar
        const savedPending = localStorage.getItem("pending_orders");
        if (savedPending) {
            try {
                setPendingOrders(JSON.parse(savedPending));
            } catch (e) {
                console.error("Error loading pending orders", e);
            }
        }
    }, []);

    useEffect(() => {
        if (data?.orders) {
            const myOrders = data.orders
                .filter((o: any) => o.vendedor === vendedorName || !vendedorName)
                .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                .slice(0, 50)
                .map((o: any) => {
                    // Si ya tiene el objeto cliente anidado, usarlo directamente
                    if (o.cliente?.Nombre_Negocio) return o;
                    // Si no, construirlo desde campos planos (estructura de Firebase)
                    const clienteEncontrado = data.clients?.find(
                        (c: any) => c.ID_Cliente === o.cliente_id || c.id === o.cliente_id
                    );
                    return {
                        ...o,
                        cliente: clienteEncontrado || {
                            Nombre_Negocio: o.cliente_nombre || o.cliente_id || "Cliente Desconocido",
                            ID_Cliente: o.cliente_id || "",
                            Direccion: "",
                            Telefono: ""
                        },
                        fechaLocal: o.fechaLocal || (o.fecha ? new Date(o.fecha).toLocaleString('es-AR') : "")
                    };
                });
            setHistory(myOrders);
        }
    }, [data?.orders, data?.clients, vendedorName]);

    const myPendingOrders = useMemo(() => {
        return pendingOrders.filter(o => o.vendedor === vendedorName || !o.vendedor);
    }, [pendingOrders, vendedorName]);




    const startVoiceSearch = (target: 'client' | 'product') => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            alert("❌ Tu navegador no soporta búsqueda por voz.");
            return;
        }
        const recognition = new SR();
        recognition.lang = 'es-ES';
        recognition.onstart = () => setIsListening(target);
        recognition.onend = () => setIsListening(null);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            if (target === 'client') {
                setClientSearch(transcript);
                setIsClientDropdownOpen(true);
            } else {
                setSearchTerm(transcript);
            }
        };
        recognition.onerror = () => setIsListening(null);
        recognition.start();
    };

    const searchableProducts = useMemo(() => {
        return products.map(p => ({
            item: p,
            searchKey: normalizeText(`${p.Nombre} ${p.Categoria} ${p.ID_Producto}`)
        }));
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (!deferredSearchTerm) return products;
        if (searchOnlyByCode) {
            const query = normalizeText(deferredSearchTerm).trim();
            return products.filter(p => normalizeText(p.ID_Producto) === query);
        }
        const terms = normalizeText(deferredSearchTerm).split(/\s+/).filter(t => t.length > 0);
        return searchableProducts
            .filter(p => terms.every(t => p.searchKey.includes(t)))
            .map(p => p.item);
    }, [searchableProducts, deferredSearchTerm, searchOnlyByCode, products]);

    // --- LÓGICA DE BÚSQUEDA AVANZADA [CANTIDAD]*[ID] ---
    useEffect(() => {
        if (!searchOnlyByCode || !searchTerm.includes('*')) return;

        // Patrón: [cantidad][b|u?]*[id]  e.g. 4*1.1, 4b*1.1, 4u*1.1
        const match = searchTerm.match(/^(\d+)([bBuU])?\*([\w\.]+)$/);
        if (match) {
            const qty = parseInt(match[1]);
            const specifier = (match[2] || "").toLowerCase();
            const isBulto = specifier === 'b';
            const productCode = match[3];

            const product = products.find(p => 
                normalizeText(p.ID_Producto) === normalizeText(productCode)
            );

            if (product) {
                const id = product.ID_Producto;
                
                // Si especificó 'b' o 'u', forzamos ese modo. Si no, mantenemos el actual o default a unid.
                if (specifier === 'b') {
                    setModoBulto(prev => ({ ...prev, [id]: true }));
                } else if (specifier === 'u') {
                    setModoBulto(prev => ({ ...prev, [id]: false }));
                } else if (modoBulto[id] === undefined) {
                    setModoBulto(prev => ({ ...prev, [id]: false }));
                }
                
                updateQty(id, qty);
                setSearchTerm("");
                
                // Feedback visual
                const unitLabel = isBulto ? 'Bulto' : 'Unid';
                setQuickNotice({ 
                    message: `+${qty} ${unitLabel}${qty > 1 ? (unitLabel === 'Unid' ? 'ades' : 's') : ''} de ${product.Nombre}`, 
                    color: isBulto ? 'bg-amber-500' : 'bg-indigo-500' 
                });
                setTimeout(() => setQuickNotice(null), 2500);
            }
        }
    }, [searchTerm, searchOnlyByCode, products, modoBulto]);

    const searchableClients = useMemo(() => {
        return allClients.map(c => ({
            item: c,
            searchKey: normalizeText(`${c.Nombre_Negocio} ${c.Dueño} ${c.Direccion} ${c.ID_Cliente}`)
        }));
    }, [allClients]);

    const filteredClients = useMemo(() => {
        if (!deferredClientSearch && !isClientDropdownOpen) return [];
        let results = allClients;
        if (deferredClientSearch) {
            const terms = normalizeText(deferredClientSearch).split(/\s+/).filter(t => t.length > 0);
            results = searchableClients
                .filter(c => terms.every(t => c.searchKey.includes(t)))
                .map(c => c.item);
        }
        return results.slice(0, 50); // Limitar a 50 para evitar lag en el renderizado inicial
    }, [searchableClients, deferredClientSearch, isClientDropdownOpen, allClients]);

    const updateQty = (id: string, delta: number) => {
        setCarrito(prev => {
            const next = (prev[id] || 0) + delta;
            if (next <= 0) {
                const { [id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [id]: next };
        });
    };

    const setQtyExact = (id: string, qty: number) => {
        setCarrito(prev => {
            if (qty <= 0) {
                const { [id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [id]: qty };
        });
    };

    const emptyCart = () => {
        if (window.confirm('¿Seguro que deseas vaciar todo el carrito?')) {
            setCarrito({});
            setModoBulto({});
            setIsCartOpen(false);
        }
    };

    const handleInitialAdd = (id: string) => {
        updateQty(id, 1);
        // Evitar auto-focus en pantallas pequeñas para no disparar el teclado virtual
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
            setTimeout(() => {
                const input = document.getElementById(`qty-input-${id}`) as HTMLInputElement;
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 50);
        }
    };

    const toggleBulto = (id: string) => {
        setModoBulto(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const totalItems = Object.values(carrito).reduce((a, b) => a + b, 0);

    const getPromoDiscount = (productId: string, qty: number, isBulto: boolean) => {
        if (!data?.config?.SYSTEM_PROMOTIONS) return 0;
        let promos = [];
        try {
            promos = JSON.parse(data.config.SYSTEM_PROMOTIONS);
        } catch (e) { return 0; }

        const applicable = promos.filter((p: any) =>
            p.active && (p.target === 'ALL' || p.target === productId)
        );

        let bestDiscount = 0;
        applicable.forEach((p: any) => {
            if (p.type === 'BOX' && isBulto && qty >= p.threshold) {
                bestDiscount = Math.max(bestDiscount, p.discount);
            } else if (p.type === 'QTY' && qty >= p.threshold) {
                bestDiscount = Math.max(bestDiscount, p.discount);
            }
        });
        return bestDiscount;
    };

    const calculateTotal = () => {
        return Object.entries(carrito).reduce((acc, [id, qty]) => {
            const p = products.find(prod => String(prod.ID_Producto) === String(id));
            if (!p) return acc;
            const isBulto = !!modoBulto[id];

            const cleanPrice = String(p.Precio_Unitario || "0").replace(',', '.');
            const price = parseFloat(cleanPrice);
            const ub = parseFloat(String(p.Unidades_Bulto || "1").replace(',', '.'));
            const peso = parseFloat(String(p.Peso_Promedio || "1").replace(',', '.'));

            const isKg = (p.Unidad || "").toLowerCase() === 'kg';
            const unitPrice = isKg ? price * peso : price;
            const grossItemTotal = isBulto ? unitPrice * ub * qty : unitPrice * qty;

            const disc = getPromoDiscount(id, qty, isBulto);
            return acc + (grossItemTotal * (1 - disc / 100));
        }, 0);
    };


    const syncPendingOrders = async () => {
        if (myPendingOrders.length === 0 || isSyncing) return;
        setIsSyncing(true);

        const othersPending = pendingOrders.filter(o => o.vendedor !== vendedorName && !!o.vendedor);
        const newlyPending = [];
        let successCount = 0;

        for (const order of myPendingOrders) {
            try {
                await wandaApi.createOrder(order);
                successCount++;
            } catch (e) {
                newlyPending.push(order);
            }
        }

        const finalPending = [...othersPending, ...newlyPending];
        setPendingOrders(finalPending);
        localStorage.setItem("pending_orders", JSON.stringify(finalPending));
        setIsSyncing(false);
        if (successCount > 0) {
            alert(`✅ Se sincronizaron ${successCount} pedidos.`);
            refreshData(true);
        }
    };

    // Auto-sincronización: cuando el vendedor inicia sesión y hay pedidos pendientes, los sincroniza
    useEffect(() => {
        if (vendedorName && myPendingOrders.length > 0 && !isSyncing) {
            syncPendingOrders();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vendedorName, myPendingOrders.length]);

    const getGPSLocation = () => {
        if (!navigator.geolocation) {
            alert("Tu dispositivo no soporta geolocalización");
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setNewClientData(prev => ({
                    ...prev,
                    Latitud: pos.coords.latitude.toString(),
                    Longitud: pos.coords.longitude.toString()
                }));
                setIsLocating(false);
            },
            (err) => {
                alert("Error al obtener ubicación: " + err.message);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        const tempId = `NEW-${Date.now()}`;
        const newClient: Client = {
            ...newClientData,
            ID_Cliente: tempId,
            EsLocal: true
        };

        try {
            // Guardar directamente en Firebase como solicitud
            await wandaApi.saveClientRequest({
                ...newClient,
                id: tempId,
                origen: vendedorName || "Preventa",
                Nombre_Negocio: newClient.Nombre_Negocio,
                timestamp: new Date().toISOString()
            });

            // Actualizar UI localmente para feedback inmediato
            setSelectedClient(newClient);
            setClientSearch(newClient.Nombre_Negocio);
            setIsNewClientModalOpen(false);
            setNewClientData({ Nombre_Negocio: "", Dueño: "", Telefono: "", Direccion: "", Latitud: "", Longitud: "" });

            // Recargar datos globales para que aparezca en la lista sincronizada
            refreshData(true);
        } catch (error) {
            console.error("Error creating client request:", error);
            alert("Error al guardar cliente. Se guardará localmente.");
            // Fallback a local storage si falla la red (opcional, pero mejor evitarlo por inestabilidad)
        }
    };

    const handleEditOrder = (order: any) => {
        if (order.reparto && order.reparto !== "null" && order.reparto.trim() !== "") {
            alert("No puedes editar este pedido porque ya ha sido asignado a un reparto.");
            return;
        }

        setEditingOrder(order);

        const newCarrito: { [key: string]: number } = {};
        const newModoBulto: { [key: string]: boolean } = {};

        (order.items || []).forEach((item: any) => {
            const id = item.id_prod || item.id_producto || item.id;
            newCarrito[id] = item.cantidad;
            newModoBulto[id] = !!item.esBulto;
        });

        setCarrito(newCarrito);
        setModoBulto(newModoBulto);

        const client = order.cliente || { Nombre_Negocio: order.cliente_nombre, ID_Cliente: order.cliente_id };
        setSelectedClient(client);
        setClientSearch(client.Nombre_Negocio);
        setOrderNotes(order.notas || "");

        setIsHistoryOpen(false);
        setIsCartOpen(true);
    };

    const cancelEditOrder = () => {
        setEditingOrder(null);
        setCarrito({});
        setSelectedClient(null);
        setClientSearch("");
        setOrderNotes("");
    };

    const handleConfirmOrder = async () => {
        if (!selectedClient) {
            alert("❌ Debes seleccionar un cliente");
            setIsCartOpen(false);
            setIsClientDropdownOpen(true);
            setTimeout(() => {
                clientInputRef.current?.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
            return;
        }
        setIsSubmitting(true);

        let silentGps = "";
        try {
            if (navigator.geolocation) {
                silentGps = await new Promise<string>((resolve) => {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
                        () => resolve(""),
                        { enableHighAccuracy: true, timeout: 5000 } // timeout para no bloquear
                    );
                });
            }
        } catch (e) {
            console.log("No se pudo obtener GPS silencioso", e);
        }

        const orderData = {
            id_interno: editingOrder ? editingOrder.id_interno : Date.now(),
            id: editingOrder ? editingOrder.id : `PREV-${Date.now()}`,
            cliente: selectedClient,
            vendedor: vendedorName,
            items: Object.entries(carrito).map(([id, qty]) => {
                const p = products.find(prod => String(prod.ID_Producto) === String(id));
                const isB = !!modoBulto[id];
                const isKg = (p?.Unidad || "").toLowerCase() === 'kg';

                // Parsing de valores para cálculo de subtotal
                const pr = parseFloat(String(p?.Precio_Unitario || "0").replace(',', '.'));
                const pe = parseFloat(String(p?.Peso_Promedio || "1").replace(',', '.'));
                const ub = parseFloat(String(p?.Unidades_Bulto || "1").replace(',', '.'));

                const piecePrice = isKg ? pr * pe : pr;
                const finalItemPrice = isB ? piecePrice * ub : piecePrice;
                const disc = getPromoDiscount(id, qty, isB);
                const subtotal = (finalItemPrice * qty) * (1 - disc / 100);

                // Generación de descripción estilo original
                let desc = "";
                if (isB) {
                    desc = `${qty} Bulto${qty > 1 ? 's' : ''} (${ub}u)`;
                } else if (isKg) {
                    desc = `${qty} Pieza${qty > 1 ? 's' : ''} (~${pe}kg)`;
                } else {
                    desc = `${qty} Unidad${qty > 1 ? 'es' : ''}`;
                }

                return {
                    id,
                    id_prod: id,
                    id_producto: id,
                    nombre: p?.Nombre || "Producto",
                    cantidad: qty,
                    precio: finalItemPrice,
                    esBulto: isB,
                    detalle: isB ? 'BULTO' : 'UNIDAD',
                    descripcion: desc,
                    descuento: disc,
                    subtotal: subtotal
                };
            }),
            total: calculateTotal(),
            notas: orderNotes,
            gps: silentGps,
            fecha: new Date().toISOString(),
            fechaLocal: new Date().toLocaleString()
        };

        try {
            if (editingOrder) {
                await wandaApi.saveOrderCorrection(orderData);
                alert("✅ Pedido actualizado con éxito");
                setEditingOrder(null);
                refreshData(true);
            } else {
                await wandaApi.createOrder(orderData);
                refreshData(true);
                setLastOrderData(orderData);
                setIsSuccessModalOpen(true);
            }

            setCarrito({});
            setSelectedClient(null);
            setClientSearch("");
            setOrderNotes("");
            setIsCartOpen(false);
        } catch (error) {
            // Error de red, guardar como pendiente
            const updatedPending = [...pendingOrders, orderData];
            setPendingOrders(updatedPending);
            localStorage.setItem("pending_orders", JSON.stringify(updatedPending));

            alert("⚠️ Sin conexión. El pedido se guardó localmente y se sincronizará cuando vuelvas a tener señal.");

            setCarrito({});
            setSelectedClient(null);
            setClientSearch("");
            setOrderNotes("");
            setEditingOrder(null);
            setIsCartOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const shareClientInfo = (client: Client) => {
        const message = `📋 *Ficha de Cliente*\n\n🏪 *Negocio:* ${client.Nombre_Negocio}\n👤 *Dueño:* ${client.Dueño || 'No especificado'}\n📍 *Dirección:* ${client.Direccion || 'No especificada'}\n📞 *Teléfono:* ${client.Telefono || 'Sin teléfono'}\n\n${client.Latitud ? `📍 *Ubicación:* https://www.google.com/maps?q=${client.Latitud},${client.Longitud}` : ''}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const shareClientLocation = (client: Client) => {
        if (!client.Latitud) {
            alert("❌ Este cliente no tiene coordenadas registradas.");
            return;
        }
        const message = `📍 *Ubicación de Entrega*\n🏪 *Cliente:* ${client.Nombre_Negocio}\n\nhttps://www.google.com/maps?q=${client.Latitud},${client.Longitud}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const shareToWhatsApp = (order: any) => {
        const itemsList = order.items.map((i: any) => `- ${i.cantidad} ${i.descripcion || i.detalle || 'Unidad'} ${i.nombre}`).join('\n');
        const message = `📋 *Resumen de Pedido*\n\n👤 *Cliente:* ${order.cliente.Nombre_Negocio}\n\n${itemsList}\n\n*Total Estimado: $${order.total.toLocaleString()}*\n\n📝 *Notas:* ${order.notas || 'Sin notas'}\n\n_Enviado por: ${order.vendedor || vendedorName}_`;
        const rawTel = order.cliente.Telefono || order.cliente.telefono || "";
        const tel = String(rawTel).replace(/[^0-9]/g, '');
        const url = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const generatePDFCatalog = async () => {
        if (products.length === 0) {
            alert("No hay productos para generar el catálogo.");
            return;
        }
        setIsGeneratingPDF(true);

        // Helper para convertir imagen a base64
        const getBase64 = (url: string): Promise<string | null> => {
            return new Promise((resolve) => {
                const img = new Image();
                img.setAttribute('crossOrigin', 'anonymous');
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg', 0.8));
                    } catch (e) {
                        resolve(null);
                    }
                };
                img.onerror = () => resolve(null);
                img.src = url;
                // Si la imagen tarda mucho, resolve null
                setTimeout(() => resolve(null), 5000);
            });
        };

        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Configuración del grid
            const margin = 12;
            const columns = 4;
            const gap = 4;
            const availableWidth = pageWidth - (margin * 2);
            const cardWidth = (availableWidth - (gap * (columns - 1))) / columns;
            const cardHeight = 55;

            // Header
            doc.setFillColor(79, 70, 229); // Indigo-600
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("CATÁLOGO DE VENTAS", margin, 20);

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`CATÁLOGO DIGITAL - WANDA CLOUD`, margin, 28);
            doc.text(`${new Date().toLocaleDateString()}`, pageWidth - margin, 20, { align: "right" });
            doc.text(`Vendedor: ${vendedorName || 'N/A'}`, pageWidth - margin, 28, { align: "right" });

            let x = margin;
            let y = 50;
            const sortedProducts = [...products].sort((a, b) => (a.Categoria || '').localeCompare(b.Categoria || ''));

            for (let i = 0; i < sortedProducts.length; i++) {
                const p = sortedProducts[i];

                // Draw Elevation Shadow (Simulated)
                doc.setDrawColor(245, 245, 245);
                doc.setFillColor(245, 245, 245);
                doc.roundedRect(x + 0.5, y + 0.5, cardWidth, cardHeight, 3, 3, 'F');

                // Draw Card Container
                doc.setDrawColor(230, 231, 235);
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');

                // Image logic
                const finalUrl = p.Imagen_URL ? getImageUrl(p.Imagen_URL) : null;
                const photoY = y + 1.5;
                const photoH = 26;
                if (finalUrl) {
                    const b64 = await getBase64(finalUrl);
                    if (b64) {
                        try {
                            doc.addImage(b64, 'JPEG', x + 1.5, photoY, cardWidth - 3, photoH, undefined, 'FAST');
                        } catch (e) {
                            console.log("Error adding image to PDF", e);
                        }
                    } else {
                        // Placeholder icon if image fails
                        doc.setFillColor(248, 250, 252);
                        doc.rect(x + 1.5, photoY, cardWidth - 3, photoH, 'F');
                        doc.setTextColor(203, 213, 225);
                        doc.setFontSize(7);
                        doc.text("Sin imagen", x + cardWidth / 2, photoY + photoH / 2, { align: 'center' });
                    }
                } else {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(x + 1.5, photoY, cardWidth - 3, photoH, 'F');
                    doc.setTextColor(203, 213, 225);
                    doc.setFontSize(7);
                    doc.text("Sin imagen", x + cardWidth / 2, photoY + photoH / 2, { align: 'center' });
                }

                // Info: ID y Categoría
                doc.setTextColor(148, 163, 184);
                doc.setFontSize(5.5);
                doc.setFont("helvetica", "bold");
                doc.text(`COD: ${p.ID_Producto}`, x + 3, y + 32);
                doc.setFont("helvetica", "normal");
                const cat = (p.Categoria || 'Sin Cat').toUpperCase();
                doc.text(cat.length > 20 ? cat.substring(0, 18) + '...' : cat, x + 3, y + 35);

                // Name
                doc.setTextColor(15, 23, 42);
                doc.setFontSize(7);
                doc.setFont("helvetica", "bold");
                const nameLines = doc.splitTextToSize(p.Nombre, cardWidth - 6);
                doc.text(nameLines.slice(0, 2), x + 3, y + 40);

                // Price
                doc.setTextColor(79, 70, 229);
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                doc.text(`$${parseFloat(p.Precio_Unitario).toLocaleString()}`, x + 3, y + 50);

                doc.setTextColor(148, 163, 184);
                doc.setFontSize(5.5);
                doc.setFont("helvetica", "normal");
                doc.text(`x ${p.Unidad || 'Unid'}`, x + 3, y + 53);

                // Grid Logic
                if ((i + 1) % columns === 0) {
                    x = margin;
                    y += cardHeight + gap;
                } else {
                    x += cardWidth + gap;
                }

                // Page Break Logic
                if (y + cardHeight > pageHeight - 20 && i < sortedProducts.length - 1) {
                    // Footer before page break
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(`Página ${(doc as any).internal.getNumberOfPages()}`, pageWidth / 2, pageHeight - 10, { align: "center" });

                    doc.addPage();
                    y = 15;
                    x = margin;
                }
            }

            // Final Footer
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${(doc as any).internal.getNumberOfPages()}`, pageWidth / 2, pageHeight - 10, { align: "center" });

            const fileName = `Catalogo_${vendedorName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error("Error generating PDF", error);
            alert("Ocurrió un error al generar el PDF.");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const repeatOrder = (order: any) => {
        if (!confirm(`¿Cargar el pedido de ${order.cliente.Nombre_Negocio} al carrito actual?`)) return;

        const newCarrito: { [key: string]: number } = {};
        const newModoBulto: { [key: string]: boolean } = {};

        order.items.forEach((i: any) => {
            newCarrito[i.id] = i.cantidad;
            newModoBulto[i.id] = !!i.esBulto;
        });

        setCarrito(newCarrito);
        setModoBulto(newModoBulto);
        setSelectedClient(order.cliente);
        setClientSearch(order.cliente.Nombre_Negocio);
        setIsHistoryOpen(false);
    };

    const toggleHideOrder = (id: string) => {
        console.log("Hiding order:", id);
        if (!id) {
            alert("No se pudo ocultar: ID faltante");
            return;
        }
        setHiddenOrderIds(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    };

    const handleDeleteOrder = async (id: string) => {
        console.log("Attempting to delete order:", id);
        if (!id) {
            alert("No se pudo eliminar: ID faltante");
            return;
        }

        const ok = window.confirm("¿Segur@ que quieres ELIMINAR PERMANENTEMENTE este pedido? Esta acción no se puede deshacer.");
        console.log("Confirm result:", ok);
        if (!ok) return;

        try {
            console.log("Calling API deleteOrder...");
            const res = await wandaApi.deleteOrder(String(id));
            console.log("Delete result:", res);

            setHistory(prev => prev.filter(h => {
                const hId = String(h.id || h.id_interno || h.id_pedido);
                return hId !== String(id);
            }));

            console.log("Refreshing global data...");
            await refreshData?.();

            alert("Pedido eliminado definitivamente.");
        } catch (error: any) {
            console.error("Delete error:", error);
            alert("Error al eliminar el pedido: " + (error.message || error));
        }
    };

    const filteredHistory = useMemo(() => {
        return history.filter(h => {
            const hId = h.id || h.id_interno || h.id_pedido;
            if (hId && hiddenOrderIds.has(String(hId))) return false;

            const payload = [h.cliente?.Nombre_Negocio || "", hId || "", h.total].join(" ");
            const matchesText = smartSearch(payload, historySearch);
            const matchesDate = historyDate ? h.fecha.startsWith(historyDate) : true;
            return matchesText && matchesDate;
        });
    }, [history, historySearch, historyDate, hiddenOrderIds]);

    // --- RENDER HELPERS ---

    const clientList = filteredClients.length > 0 ? filteredClients.map((c, cidx) => (
        <div
            key={c.ID_Cliente || c.id || c.Nombre_Negocio || `cli-${cidx}`}
            role="option"
            aria-selected={false}
            onClick={() => { setSelectedClient(c); setClientSearch(c.Nombre_Negocio); setIsClientDropdownOpen(false); }}
            className="w-full p-4 text-left border-b border-slate-50 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex justify-between items-center group cursor-pointer"
        >
            <div className="flex flex-col flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{c.Nombre_Negocio}</span>
                    {c.EsLocal && <span className="text-[7px] font-black bg-indigo-100 text-indigo-600 px-1 rounded">NUEVO</span>}
                </div>
                <span className="text-[10px] text-slate-400">{c.Dueño} • {c.Direccion}</span>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); setSelectedClient(c); setIsClientDetailOpen(true); }}
                className="p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800 text-indigo-500 transition-opacity"
            >
                <Store size={16} />
            </button>
        </div>
    )) : (
        <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
            <User size={32} className="opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">No se encontraron clientes</p>
        </div>
    );

    const groupedProducts = useMemo(() => {
        const groups: { [key: string]: typeof filteredProducts } = {};
        filteredProducts.forEach(p => {
            const cat = p.Categoria || 'SIN CATEGORIA';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(p);
        });
        return Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {} as typeof groups);
    }, [filteredProducts]);

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    };

    const renderProductCard = (p: any, idx: number) => {
        const pid = String(p.ID_Producto || p.id || `prod-${idx}`);
        const qty = carrito[pid] || 0;
        const isBulto = !!modoBulto[pid];
        const isKg = (p.Unidad || "").toLowerCase() === 'kg';

        // Sanitización de valores numéricos
        const pureUnitPrice = parseFloat(String(p.Precio_Unitario || "0").replace(',', '.'));
        const avgWeight = parseFloat(String(p.Peso_Promedio || "1").replace(',', '.'));
        const unitsPerBulk = parseFloat(String(p.Unidades_Bulto || "1").replace(',', '.'));

        // El "Precio de la Pieza" (o unidad si no es pesable)
        const piecePrice = isKg ? pureUnitPrice * avgWeight : pureUnitPrice;

        // Precio final según modo (Bulto o Individual)
        const finalPrice = isBulto ? piecePrice * unitsPerBulk : piecePrice;

        // Etiqueta de unidad de venta
        const unitLabel = isKg ? "Pieza" : "Unidad";

        return (
            <div
                key={pid}
                className={`p-2.5 rounded-[24px] bg-white dark:bg-slate-900 border transition-all duration-500 ${qty > 0
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 dark:border-indigo-500 ring-4 ring-indigo-500/10 shadow-2xl shadow-indigo-500/20 scale-[1.01] z-10'
                    : 'border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-300/30 dark:shadow-none hover:shadow-xl hover:shadow-slate-400/20'
                    }`}
            >
                <div className="flex gap-2.5">
                    {/* Imagen del producto */}
                    <div
                        className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 cursor-pointer"
                        onClick={() => p.Imagen_URL && setSelectedImage(getImageUrl(p.Imagen_URL))}
                    >
                        {p.Imagen_URL ? (
                            <img src={getImageUrl(p.Imagen_URL) || ""} alt={p.Nombre} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                <Package size={24} />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-1 mb-1 flex-wrap">
                                <span className="text-[8px] font-black px-1.5 py-0 rounded-full bg-indigo-500/10 text-indigo-600 uppercase tracking-wider">ID: {p.ID_Producto}</span>
                                <span className="text-[8px] font-black px-1.5 py-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">{p.Categoria || 'S/C'}</span>
                                {isKg && <span className="text-[8px] font-black px-1.5 py-0 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase">Pesable</span>}
                                {parseFloat(p.Stock_Actual || "0") < 1 ? (
                                    <span className="text-[8px] font-black px-1.5 py-0 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 uppercase">Sin Stock</span>
                                ) : (
                                    <span className={`text-[8px] font-black px-1.5 py-0 rounded-full uppercase ${parseFloat(p.Stock_Actual || "0") <= 10 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                        Stock: {p.Stock_Actual}
                                    </span>
                                )}
                                {getPromoDiscount(pid, qty, isBulto) > 0 && (
                                    <span className="text-[8px] font-black px-1.5 py-0 rounded-full bg-rose-500 text-white uppercase animate-pulse">
                                        PROMO -{getPromoDiscount(pid, qty, isBulto)}%
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-[13px] leading-tight text-slate-800 dark:text-slate-100 line-clamp-2">{p.Nombre}</h3>
                            {isKg && (
                                <p className="text-[9px] font-medium text-slate-500 mt-0.5 uppercase tracking-tighter">
                                    ${pureUnitPrice.toLocaleString()}/kg • {avgWeight}kg prom
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-2 gap-1.5">
                            <div className="flex flex-col min-w-0 max-w-[45%]">
                                {getPromoDiscount(pid, qty, isBulto) > 0 ? (
                                    <>
                                        <span className="text-sm xs:text-base font-black text-rose-500 dark:text-rose-400 truncate">
                                            ${(finalPrice * (1 - getPromoDiscount(pid, qty, isBulto) / 100)).toLocaleString()}
                                        </span>
                                        <span className="text-[8px] xs:text-[9px] font-bold text-slate-400 line-through decoration-rose-500/50">
                                            ${finalPrice.toLocaleString()}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-sm xs:text-base font-black text-indigo-600 dark:text-indigo-400 truncate">${finalPrice.toLocaleString()}</span>
                                )}
                                <span className="text-[8px] font-bold text-slate-400 uppercase truncate">{isBulto ? `Bulto (${unitsPerBulk}u)` : unitLabel}</span>
                            </div>

                            <div className="flex items-center gap-0.5 bg-slate-100/50 dark:bg-slate-800 p-0.5 rounded-xl shrink-0">
                                {qty > 0 ? (
                                    <>
                                        <button onClick={() => updateQty(pid, -1)} className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                                        <input id={`qty-input-${pid}`} type="number" min="0" value={qty || ""} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) setQtyExact(pid, v); else setQtyExact(pid, 0) }} className="w-8 text-center text-[11px] font-black bg-transparent border-none outline-none focus:ring-0 rounded-md" onFocus={(e) => e.target.select()} />
                                        <button onClick={() => updateQty(pid, 1)} className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"><Plus size={14} /></button>
                                    </>
                                ) : (
                                    <button onClick={() => handleInitialAdd(pid)} className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-[8px] xs:text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-indigo-500/10 whitespace-nowrap">Agregar</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {unitsPerBulk > 1 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Modalidad</span>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-[12px] gap-0.5 shadow-inner">
                            <button
                                onClick={() => isBulto && toggleBulto(pid)}
                                className={`px-2.5 py-1 rounded-[10px] text-[8px] font-black uppercase transition-all ${!isBulto ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                            >
                                {unitLabel}
                            </button>
                            <button
                                onClick={() => !isBulto && toggleBulto(pid)}
                                className={`px-2.5 py-1 rounded-[10px] text-[8px] font-black uppercase transition-all ${isBulto ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400'}`}
                            >
                                Bulto
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const contentToRender = viewMode === 'list'
        ? filteredProducts.map(renderProductCard)
        : Object.entries(groupedProducts).map(([cat, prods]) => {
            return (
                <div key={cat} className="mb-3">
                    <button
                        onClick={() => setSelectedCategory(cat)}
                        className="w-full bg-white dark:bg-slate-900/40 backdrop-blur-md py-5 px-6 text-[13px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-[0.25em] border border-white/20 dark:border-indigo-500/10 shadow-xl shadow-indigo-500/5 rounded-[32px] flex justify-between items-center transition-all active:scale-[0.97] hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/10 group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                <FolderTree size={18} />
                            </div>
                            <span className="truncate max-w-[180px] xs:max-w-none">{cat}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest shadow-lg shadow-indigo-500/20">{prods.length}</span>
                            <ArrowRight size={18} className="text-indigo-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                    </button>
                </div>
            );
        });

    const cartItemList = Object.entries(carrito).map(([id, qty], cartIdx) => {
        const p = products.find(prod => String(prod.ID_Producto) === String(id));
        if (!p) return null;
        const isB = !!modoBulto[id];
        const isKg = (p.Unidad || "").toLowerCase() === 'kg';

        const pr = parseFloat(String(p.Precio_Unitario || "0").replace(',', '.'));
        const pe = parseFloat(String(p.Peso_Promedio || "1").replace(',', '.'));
        const ub = parseFloat(String(p.Unidades_Bulto || "1").replace(',', '.'));

        const piecePrice = isKg ? pr * pe : pr;
        const finalItemPrice = isB ? piecePrice * ub : piecePrice;
        const disc = getPromoDiscount(id, qty, isB);
        const label = isB ? 'Bulto' : (isKg ? 'Pieza' : 'Unidad');

        return (
            <div key={id || `cart-${cartIdx}`} className="flex flex-col bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{p.Nombre}</h4>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <p className={`text-[10px] font-bold uppercase ${disc > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                    {label} • ${(finalItemPrice * (1 - disc / 100)).toLocaleString()}
                                </p>
                                {disc > 0 && <span className="text-[7px] font-black bg-rose-100 text-rose-600 px-1 rounded">-{disc}%</span>}
                            </div>
                            <div className="text-xs font-black text-indigo-600 mt-0.5">
                                Subtotal: ${(finalItemPrice * (1 - disc / 100) * qty).toLocaleString()}
                            </div>
                        </div>
                        {isKg && <p className="text-[8px] text-slate-400 font-medium">${pr.toLocaleString()}/kg ({pe}kg prom.)</p>}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => updateQty(id, -1)} className="text-rose-500"><Trash2 size={16} /></button>
                        <input type="number" min="0" value={qty || ""} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) setQtyExact(id, v); else setQtyExact(id, 0) }} className="w-10 text-center text-sm font-black bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-lg" onFocus={(e) => e.target.select()} />
                        <button onClick={() => updateQty(id, 1)} className="text-indigo-500"><Plus size={16} /></button>
                    </div>
                </div>
                {ub > 1 && (
                    <div className="flex bg-white/50 dark:bg-slate-900/50 p-1 rounded-2xl self-end">
                        <button
                            onClick={() => isB && toggleBulto(id)}
                            className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase transition-all ${!isB ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                        >
                            {isKg ? 'Pieza' : 'Unidad'}
                        </button>
                        <button
                            onClick={() => !isB && toggleBulto(id)}
                            className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase transition-all ${isB ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400'}`}
                        >
                            Bulto
                        </button>
                    </div>
                )}
            </div>
        );
    });

    const renderFAB = () => {
        if (navLayout !== 'fab') return null;

        const fabActions = [
            { id: 'cart', icon: <ShoppingCart size={20} />, color: 'bg-indigo-600', label: 'Carrito', onClick: () => setIsCartOpen(true), badge: totalItems },
            { id: 'history', icon: <Clock size={20} />, color: 'bg-emerald-600', label: 'Historial', onClick: () => setIsHistoryOpen(true) },
            { id: 'catalog', icon: <FileText size={20} />, color: 'bg-amber-600', label: 'Catálogo', onClick: generatePDFCatalog },
        ];

        return (
            <>
                <AnimatePresence>
                    {isFABOpen && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFABOpen(false)}
                            className="fixed inset-0 z-[95] bg-slate-900/10 dark:bg-black/20 backdrop-blur-md sm:hidden"
                        />
                    )}
                </AnimatePresence>
                <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-3 sm:hidden">
                    <AnimatePresence>
                        {isFABOpen && (
                            <div className="flex flex-col items-end gap-3 mb-3">
                                {fabActions.map((action, idx) => (
                                    <motion.div
                                        key={action.id}
                                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.5, y: 20 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="flex items-center gap-3"
                                    >
                                        <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-lg text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                                            {action.label}
                                        </span>
                                        <button
                                            onClick={() => { action.onClick(); setIsFABOpen(false); }}
                                            className={`w-12 h-12 rounded-2xl ${action.color} text-white shadow-xl flex items-center justify-center relative active:scale-90 transition-transform`}
                                        >
                                            {action.icon}
                                            {action.badge ? (
                                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                                    {action.badge}
                                                </span>
                                            ) : null}
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={() => setIsFABOpen(!isFABOpen)}
                        className={`w-14 h-14 rounded-[24px] shadow-2xl flex items-center justify-center transition-all duration-300 z-50 ${isFABOpen ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 rotate-45' : 'bg-indigo-600 text-white'}`}
                    >
                        <Plus size={32} />
                    </button>
                </div>
            </>
        );
    };

    return (
        <div className="min-h-screen bg-[#F4FBF9] dark:bg-[#101413] flex flex-col text-[#191C1B] dark:text-[#E1E3DF]">
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            <AnimatePresence>
                {myPendingOrders.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest py-3 px-4 flex items-center justify-between cursor-pointer"
                        onClick={syncPendingOrders}
                    >
                        <div className="flex items-center gap-2">
                            <Clock size={12} className={isSyncing ? "animate-spin" : ""} />
                            {isSyncing ? "Sincronizando..." : `Tienes ${myPendingOrders.length} pedidos pendientes de envío`}
                        </div>
                        <span className="bg-white/20 px-2 py-1 rounded">Reintentar</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="bg-white dark:bg-slate-900 pt-4 px-4 pb-0">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="relative group/logo shrink-0">
                            <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-40 group-hover:opacity-100 transition-opacity" />
                            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border border-indigo-500/50 flex items-center justify-center text-indigo-400 font-black shadow-2xl">
                                <span className="text-base sm:text-lg tracking-tighter drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]">&lt;/&gt;</span>
                            </div>
                        </div>
                        <div className="min-w-0 overflow-hidden">
                            <h1 className="font-black text-base sm:text-lg leading-none uppercase italic truncate">Wanda <span className="text-indigo-500">Cloud</span></h1>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate block">{vendedorName || 'Sin Vendedor'}</span>
                        </div>
                    </div>
                    <div className="flex gap-1 items-center shrink-0">
                        <ThemeToggle />
                        {navLayout === 'header' && (
                            <>
                                <button onClick={() => setIsCartOpen(true)} className="p-2 rounded-full hover:bg-black/5 relative text-indigo-500">
                                    <ShoppingCart size={20} />
                                    {totalItems > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                            {totalItems}
                                        </span>
                                    )}
                                </button>
                                <div className="hidden sm:flex gap-1">
                                    <button
                                        onClick={generatePDFCatalog}
                                        disabled={isGeneratingPDF}
                                        className={`p-2 rounded-full hover:bg-black/5 ${isGeneratingPDF ? 'animate-pulse text-indigo-400' : 'text-indigo-500'}`}
                                        title="Descargar Catálogo PDF"
                                    >
                                        {isGeneratingPDF ? <FileText className="animate-bounce" size={20} /> : <FileText size={20} />}
                                    </button>
                                    <button onClick={() => setIsHistoryOpen(true)} className="p-2 rounded-full hover:bg-black/5 text-slate-400"><Clock size={20} /></button>
                                    <button onClick={() => setIsConfigOpen(true)} className="p-2 rounded-full hover:bg-black/5 text-slate-400"><Settings size={20} /></button>
                                </div>
                                <div className="sm:hidden flex gap-1">
                                    <button 
                                        onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)} 
                                        className={`p-2 rounded-full transition-all duration-300 ${isQuickMenuOpen ? 'bg-indigo-500 text-white' : 'hover:bg-black/5 text-slate-400'}`}
                                    >
                                        {isQuickMenuOpen ? <X size={20} className="rotate-90" /> : <MoreHorizontal size={20} />}
                                    </button>
                                </div>
                            </>
                        )}
                        {navLayout === 'fab' && (
                             <button onClick={() => setIsConfigOpen(true)} className="p-2 rounded-full hover:bg-black/5 text-slate-400"><Settings size={20} /></button>
                        )}
                        <button
                            onClick={() => {
                                if (confirm("¿Estás seguro de que deseas cerrar sesión? Al salir deberás ingresar las credenciales de perfil y vendedor nuevamente.")) {
                                    // Limpiar barrera 2 (Vendedor)
                                    setVendedorName("");
                                    localStorage.removeItem("vendedor_name");
                                    setSelectedSellerToVerify(null);
                                    setTempPassword("");

                                    // Limpiar barrera 1 (Perfil Preventista)
                                    localStorage.removeItem("user_role");
                                    localStorage.removeItem("is_logged_in");
                                    localStorage.removeItem("user_name");

                                    // Redirigir al inicio total
                                    window.location.href = '/login';
                                }
                            }}
                            className="p-2 rounded-full hover:bg-rose-50 text-rose-400 ml-2"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {isQuickMenuOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden sm:hidden"
                        >
                            <div className="grid grid-cols-3 gap-3 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-4 border border-black/5">
                                <button
                                    onClick={() => { generatePDFCatalog(); setIsQuickMenuOpen(false); }}
                                    className="flex flex-col items-center gap-1.5"
                                >
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-black/5 text-indigo-500 active:scale-95 transition-transform">
                                        <FileText size={20} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Catálogo</span>
                                </button>
                                <button
                                    onClick={() => { setIsHistoryOpen(true); setIsQuickMenuOpen(false); }}
                                    className="flex flex-col items-center gap-1.5"
                                >
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-black/5 text-emerald-500 active:scale-95 transition-transform">
                                        <Clock size={20} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Historia</span>
                                </button>
                                <button
                                    onClick={() => { setIsConfigOpen(true); setIsQuickMenuOpen(false); }}
                                    className="flex flex-col items-center gap-1.5"
                                >
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-black/5 text-slate-500 active:scale-95 transition-transform">
                                        <Settings size={20} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Ajustes</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 px-4 pt-4 pb-4 border-b border-black/5 shadow-sm">
                <div className="flex items-center gap-2">
                    {/* Floating Toast Notice */}
                    <AnimatePresence>
                        {quickNotice && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                className={`absolute left-1/2 -translate-x-1/2 top-full mt-4 px-6 py-3 rounded-2xl text-white font-bold shadow-xl z-[60] flex items-center gap-2 whitespace-nowrap ${quickNotice.color}`}
                            >
                                <CheckCircle2 size={18} />
                                {quickNotice.message}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.div
                        layout
                        initial={false}
                        animate={{ flex: activeSearch === 'client' ? 3 : (activeSearch === 'product' ? 0.3 : 1) }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        onAnimationComplete={() => {
                            if (activeSearch === 'client') {
                                setIsClientDropdownOpen(true);
                            }
                        }}
                        className="relative"
                        ref={clientDropdownRef}
                    >
                        <div
                            onClick={() => { setActiveSearch('client'); clientInputRef.current?.focus(); }}
                            className={`flex items-center gap-2 p-3.5 rounded-[28px] border transition-all cursor-pointer ${activeSearch === 'client' ? 'border-indigo-500 bg-indigo-50/30' : (selectedClient ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-slate-50 dark:bg-slate-800 shadow-sm')}`}
                        >
                            <User size={20} className={selectedClient || activeSearch === 'client' ? 'text-indigo-500' : 'text-slate-400'} />
                            <input
                                ref={clientInputRef}
                                type="text"
                                placeholder={activeSearch === 'client' ? "Buscar cliente..." : ""}
                                value={clientSearch}
                                onChange={(e) => { setClientSearch(e.target.value); if (!isClientDropdownOpen) setIsClientDropdownOpen(true); }}
                                onFocus={() => { setActiveSearch('client'); }}
                                className={`flex-1 bg-transparent text-[15px] font-medium outline-none transition-all ${activeSearch !== 'client' && !selectedClient ? 'w-0 opacity-0' : 'w-full opacity-100'}`}
                            />
                            {activeSearch === 'client' && clientSearch && !selectedClient && (
                                <button onClick={(e) => { e.stopPropagation(); setClientSearch(""); }} className="text-slate-400 p-1"><X size={16} /></button>
                            )}
                            {selectedClient && activeSearch === 'client' && (
                                <button onClick={(e) => { e.stopPropagation(); setIsClientDetailOpen(true); }} className="p-2 rounded-2xl text-indigo-500 bg-white dark:bg-slate-700 shadow-sm hover:bg-indigo-50 transition-colors"><Store size={18} /></button>
                            )}
                            {activeSearch === 'client' && (
                                <button onClick={(e) => { e.stopPropagation(); startVoiceSearch('client'); }} className={`p-2 rounded-2xl ${isListening === 'client' ? 'bg-rose-500 text-white animate-pulse' : 'bg-white dark:bg-slate-700 text-indigo-500 shadow-sm'}`}><Mic size={18} /></button>
                            )}
                            {selectedClient && activeSearch === 'client' ? (
                                <button onClick={(e) => { e.stopPropagation(); setSelectedClient(null); setClientSearch(""); }} className="text-rose-500"><X size={18} /></button>
                            ) : (
                                activeSearch === 'client' && <button onClick={(e) => { e.stopPropagation(); setIsNewClientModalOpen(true); }} className="p-2 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20"><Plus size={18} /></button>
                            )}
                        </div>
                        <AnimatePresence>
                            {(isClientDropdownOpen && (clientSearch || allClients.length > 0)) && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 w-full mt-3 bg-white dark:bg-slate-900 shadow-2xl rounded-[32px] overflow-hidden border border-slate-100 dark:border-slate-800 z-50 max-h-[350px] overflow-y-auto">
                                    {clientList}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <motion.div
                        layout
                        initial={false}
                        animate={{ flex: activeSearch === 'product' ? 3 : (activeSearch === 'client' ? 0.3 : 1) }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        onClick={() => { setActiveSearch('product'); productInputRef.current?.focus(); }}
                        className={`flex items-center gap-2 p-3.5 rounded-[28px] border transition-all cursor-pointer ${activeSearch === 'product' ? 'border-indigo-500 bg-indigo-50/50' : 'bg-slate-100 dark:bg-slate-800 border-transparent shadow-sm'}`}
                    >
                        <Search size={20} className={activeSearch === 'product' ? 'text-indigo-500' : 'text-slate-400'} />
                        <input
                            ref={productInputRef}
                            type="text"
                            placeholder={activeSearch === 'product' ? (searchOnlyByCode ? "ID exacto..." : "Buscar productos...") : ""}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setActiveSearch('product')}
                            className={`flex-1 bg-transparent text-[15px] font-medium outline-none transition-all ${activeSearch !== 'product' ? 'w-0 opacity-0' : 'w-full opacity-100'}`}
                        />
                        {activeSearch === 'product' && (
                            <div className="flex items-center gap-1 shrink-0">
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight hidden xs:block">ID</span>
                                    <div className="relative flex items-center">
                                        <input type="checkbox" className="sr-only" checked={searchOnlyByCode} onChange={(e) => setSearchOnlyByCode(e.target.checked)} />
                                        <div className={`block w-7 h-4 rounded-full transition-colors ${searchOnlyByCode ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                        <div className={`absolute left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${searchOnlyByCode ? 'translate-x-[12px]' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>
                            </div>
                        )}
                        {activeSearch === 'product' && searchTerm && (
                            <button onClick={(e) => { e.stopPropagation(); setSearchTerm(""); }} className="text-slate-400 p-1"><X size={16} /></button>
                        )}
                        {activeSearch === 'product' && (
                            <button onClick={(e) => { e.stopPropagation(); startVoiceSearch('product'); }} className={`p-2 rounded-2xl ${isListening === 'product' ? 'bg-rose-500 text-white animate-pulse' : 'bg-white dark:bg-slate-700 text-indigo-500 shadow-sm'}`}><Mic size={18} /></button>
                        )}
                    </motion.div>
                </div>
            </div>



            <main className="flex-1 p-4 pb-32">
                <div className="flex justify-between items-center mb-2 px-2">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {filteredProducts.length} Productos
                    </h2>
                    <div className="flex items-center gap-2">
                        {/* Botón de notificaciones */}
                        {carouselBanners.length > 0 && (() => {
                            const hasUnseen = carouselBanners.some(
                                (b, i) => !seenBannerIds.has(b.id || `banner-${i}`)
                            );
                            return (
                                <button
                                    onClick={() => {
                                        setIsNotifOpen(v => !v);
                                        // Marcar todos los banners actuales como vistos
                                        setSeenBannerIds(new Set(
                                            carouselBanners.map((b, i) => b.id || `banner-${i}`)
                                        ));
                                    }}
                                    className="relative p-2 rounded-[12px] transition-all text-amber-500"
                                    title="Ver avisos"
                                >
                                    <Bell size={16} />
                                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                                        {carouselBanners.length}
                                    </span>
                                    {/* Pulse solo si hay avisos no vistos */}
                                    {hasUnseen && (
                                        <span className="absolute inset-0 rounded-[12px] bg-amber-400/30 animate-ping" />
                                    )}
                                </button>
                            );
                        })()}
                        {/* Selector vista */}
                        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-[16px] flex gap-1 shadow-inner">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-[12px] transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}
                            >
                                <LayoutList size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('grouped')}
                                className={`p-2 rounded-[12px] transition-all ${viewMode === 'grouped' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}
                            >
                                <FolderTree size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Acordeón con carousel horizontal MD3 */}
                <AnimatePresence>
                    {isNotifOpen && carouselBanners.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="overflow-hidden mb-3"
                        >
                            {/* Rail horizontal con snap */}
                            <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar px-2 py-3 snap-x snap-mandatory">
                                {carouselBanners.map((banner, bannerIdx) => {
                                    const isExp = expandedBanner === (banner.id || `banner-${bannerIdx}`);
                                    const bid = banner.id || `banner-${bannerIdx}`;
                                    return (
                                        <motion.div
                                            key={bid}
                                            layout
                                            onClick={() => setExpandedBanner(isExp ? null : bid)}
                                            animate={{ width: isExp ? 280 : 112 }}
                                            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                                            className={`snap-start flex-shrink-0 flex items-center gap-3 p-3 rounded-[24px] ${banner.color} text-white cursor-pointer shadow-lg overflow-hidden relative`}
                                            style={{ minHeight: 72 }}
                                        >
                                            {/* Ícono siempre visible */}
                                            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0">
                                                {banner.icon}
                                            </div>

                                            {/* Contenido — visible solo cuando expandido */}
                                            <AnimatePresence>
                                                {isExp && (
                                                    <motion.div
                                                        initial={{ opacity: 0, x: 10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 10 }}
                                                        transition={{ duration: 0.18 }}
                                                        className="flex flex-col flex-1 min-w-0"
                                                    >
                                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-70 leading-none">{banner.title}</span>
                                                        <span className="text-[13px] font-black leading-tight mt-0.5">{banner.subtitle}</span>
                                                        {banner.details && (
                                                            <span className="text-[9px] font-bold opacity-60 mt-1 leading-tight line-clamp-2">{banner.details}</span>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* X solo cuando expandido */}
                                            {isExp && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setExpandedBanner(null); }}
                                                    className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                                                >
                                                    <X size={11} />
                                                </button>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className={viewMode === 'list' ? "grid grid-cols-1 gap-4" : ""}>
                    {contentToRender.length > 0 ? contentToRender : (
                        <div className="p-10 text-center text-slate-400 flex flex-col items-center gap-2">
                            <Search size={32} className="opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest mt-2 justify-center">No se encontraron productos</p>
                        </div>
                    )}
                </div>
            </main>

            <AnimatePresence>
                {totalItems > 0 && (
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 w-full p-4 z-50">
                        <div onClick={() => setIsCartOpen(true)} className="bg-white dark:bg-slate-900 rounded-[32px] p-4 shadow-xl border border-black/5 flex items-center justify-between cursor-pointer active:scale-95 transition-all text-left">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="bg-indigo-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg">{totalItems}</span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Ver Detalle <ChevronUp size={12} /></span>
                                </div>
                                <div className="text-2xl font-black text-indigo-600">${calculateTotal().toLocaleString()}</div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleConfirmOrder(); }}
                                disabled={isSubmitting}
                                className={`px-8 py-4 rounded-[24px] font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 ${isSubmitting ? 'bg-slate-200 text-slate-400' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95'}`}
                            >
                                {isSubmitting ? (
                                    <>Enviando <Plus className="animate-spin" size={16} /></>
                                ) : 'Confirmar'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCartOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-6 flex flex-col max-h-[90vh] text-left">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">Tu Pedido</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">{selectedClient?.Nombre_Negocio || 'Sin Cliente'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={emptyCart} title="Vaciar Carrito" className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"><Trash2 size={20} /></button>
                                    <button onClick={() => setIsCartOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><X size={20} /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                                {cartItemList}

                                <div className="mt-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Notas del Pedido</label>
                                    <textarea
                                        value={orderNotes}
                                        onChange={(e) => setOrderNotes(e.target.value)}
                                        placeholder="Instrucciones especiales..."
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-3xl py-4 px-5 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[100px] resize-none"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-sm font-bold text-slate-400 uppercase">Total</span>
                                    <span className="text-3xl font-black text-indigo-600">${calculateTotal().toLocaleString()}</span>
                                </div>
                                {editingOrder && (
                                    <button
                                        onClick={cancelEditOrder}
                                        className="w-full py-3 mb-2 rounded-[24px] font-black uppercase text-[10px] tracking-widest text-rose-500 bg-rose-50 dark:bg-rose-900/30 transition-all hover:bg-rose-100 dark:hover:bg-rose-900/50"
                                    >
                                        Cancelar Edición
                                    </button>
                                )}
                                <button
                                    onClick={handleConfirmOrder}
                                    disabled={isSubmitting}
                                    className={`w-full py-5 rounded-[24px] font-black uppercase text-[11px] sm:text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${isSubmitting ? 'bg-slate-100 text-slate-400' : (editingOrder ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-95' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95')}`}
                                >
                                    {isSubmitting ? (
                                        <>Procesando <Plus className="animate-spin" size={18} /></>
                                    ) : editingOrder ? (
                                        <>Actualizar Pedido <FileEdit size={18} /></>
                                    ) : (
                                        <>Enviar Pedido <CheckCircle2 size={18} /></>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {isNewClientModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[40px] p-8 shadow-2xl flex flex-col text-left">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-black tracking-tight">Nuevo Cliente</h2>
                                <button onClick={() => setIsNewClientModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleCreateClient} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nombre Negocio *</label>
                                    <input required type="text" value={newClientData.Nombre_Negocio} onChange={e => setNewClientData(prev => ({ ...prev, Nombre_Negocio: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Dueño</label>
                                        <input type="text" value={newClientData.Dueño} onChange={e => setNewClientData(prev => ({ ...prev, Dueño: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Teléfono</label>
                                        <input type="tel" value={newClientData.Telefono} onChange={e => setNewClientData(prev => ({ ...prev, Telefono: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Dirección</label>
                                    <input type="text" value={newClientData.Direccion} onChange={e => setNewClientData(prev => ({ ...prev, Direccion: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Ubicación GPS</label>
                                    <button type="button" onClick={getGPSLocation} disabled={isLocating} className="w-full bg-slate-100 dark:bg-slate-800 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all outline-none">
                                        {isLocating ? (
                                            <span className="flex items-center gap-2"><Plus className="animate-spin" size={14} /> Localizando...</span>
                                        ) : newClientData.Latitud ? (
                                            <span className="text-emerald-500 flex items-center gap-2"><CheckCircle2 size={14} /> Ubicación Capturada</span>
                                        ) : (
                                            <span className="flex items-center gap-2"><Store size={14} /> Obtener Ubicación</span>
                                        )}
                                    </button>
                                </div>
                                <button type="submit" className="w-full bg-indigo-500 text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-500/20 mt-4 outline-none">Guardar Cliente</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {isClientDetailOpen && selectedClient && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 shadow-2xl flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 mb-6">
                                <Store size={40} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight mb-1">{selectedClient.Nombre_Negocio}</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{selectedClient.Dueño || 'Sin Dueño'}</p>

                            <div className="w-full space-y-4 mb-8">
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl flex items-center gap-4 text-left">
                                    <User className="text-slate-400" size={18} />
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Dirección</p>
                                        <p className="text-sm font-bold">{selectedClient.Direccion || 'No registrada'}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl flex items-center gap-4 text-left">
                                    <Clock className="text-slate-400" size={18} />
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Teléfono</p>
                                        <p className="text-sm font-bold">{selectedClient.Telefono || 'Sin teléfono'}</p>
                                    </div>
                                </div>
                                {selectedClient.Latitud && (
                                    <button
                                        onClick={() => window.open(`https://www.google.com/maps?q=${selectedClient.Latitud},${selectedClient.Longitud}`, '_blank')}
                                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-4 text-left text-indigo-500">
                                            <Store size={18} />
                                            <div>
                                                <p className="text-[8px] font-black opacity-60 uppercase tracking-widest">Coordenadas</p>
                                                <p className="text-sm font-bold">Ver en Google Maps</p>
                                            </div>
                                        </div>
                                        <CheckCircle2 size={18} className="text-emerald-500" />
                                    </button>
                                )}
                            </div>

                            <div className="w-full grid grid-cols-2 gap-3 mb-6">
                                <button
                                    onClick={() => shareClientInfo(selectedClient)}
                                    className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 p-4 rounded-3xl flex flex-col items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                >
                                    <ShoppingCart size={20} />
                                    Ficha Completa
                                </button>
                                <button
                                    onClick={() => shareClientLocation(selectedClient)}
                                    className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 p-4 rounded-3xl flex flex-col items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                >
                                    <Store size={20} />
                                    Solo Ubicación
                                </button>
                            </div>

                            <button onClick={() => setIsClientDetailOpen(false)} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest outline-none">Cerrar</button>
                        </motion.div>
                    </motion.div>
                )}

                {isHistoryOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-6 flex flex-col h-[85vh] text-left text-[#191C1B] dark:text-[#E1E3DF]">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">Historial</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Últimos 50 pedidos</p>
                                </div>
                                <button onClick={() => setIsHistoryOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><X size={20} /></button>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-transparent focus-within:border-indigo-500/30">
                                    <Search size={18} className="text-slate-400" />
                                    <input type="text" placeholder="Buscar en historial..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="flex-1 bg-transparent text-sm font-bold outline-none" />
                                </div>
                                <input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 p-2.5 rounded-2xl text-xs font-bold outline-none border border-transparent focus:border-indigo-500/30 text-[#191C1B] dark:text-[#E1E3DF]" />
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {filteredHistory.length > 0 ? (() => {
                                    // Agrupar por fecha
                                    const groups: { [date: string]: any[] } = {};
                                    filteredHistory.forEach((h: any) => {
                                        const dateKey = h.fechaLocal
                                            ? h.fechaLocal.split(' ')[0]   // ej. "08/03/2026"
                                            : h.fecha
                                                ? new Date(h.fecha).toLocaleDateString('es-AR')
                                                : 'Sin fecha';
                                        if (!groups[dateKey]) groups[dateKey] = [];
                                        groups[dateKey].push(h);
                                    });

                                    const sortedDates = Object.keys(groups).sort((a, b) => {
                                        // Parsear dd/mm/yyyy
                                        const parse = (d: string) => {
                                            const [day, mon, yr] = d.split('/');
                                            return new Date(`${yr}-${mon}-${day}`).getTime();
                                        };
                                        return parse(b) - parse(a); // desc
                                    });

                                    // Accordions closed by default by removing auto-open logic
                                    /* if (openHistoryDates.size === 0 && sortedDates.length > 0) {
                                        setTimeout(() => setOpenHistoryDates(new Set([sortedDates[0]])), 0);
                                    } */

                                    const toggleDate = (date: string) => {
                                        setOpenHistoryDates(prev => {
                                            const next = new Set(prev);
                                            next.has(date) ? next.delete(date) : next.add(date);
                                            return next;
                                        });
                                    };

                                    return (
                                        <div className="space-y-2 pb-4">
                                            {sortedDates.map(date => {
                                                const orders = groups[date];
                                                const isOpen = openHistoryDates.has(date);
                                                const dayTotal = orders.reduce((s: number, o: any) => s + (parseFloat(o.total) || 0), 0);
                                                // Etiqueta amigable
                                                const today = new Date().toLocaleDateString('es-AR');
                                                const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('es-AR');
                                                const label = date === today ? 'Hoy'
                                                    : date === yesterday ? 'Ayer'
                                                        : date;

                                                return (
                                                    <div key={date}>
                                                        {/* Cabecera del acordeon */}
                                                        <button
                                                            onClick={() => toggleDate(date)}
                                                            className="w-full flex items-center justify-between px-2 py-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <ChevronDown
                                                                    size={14}
                                                                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                                                />
                                                                <span className={`text-[11px] font-black uppercase tracking-widest ${label === 'Hoy' ? 'text-indigo-500'
                                                                    : label === 'Ayer' ? 'text-emerald-600'
                                                                        : 'text-slate-400'
                                                                    }`}>{label}</span>
                                                                <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                                                                    {orders.length} pedido{orders.length > 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                            <span className="text-[11px] font-black text-slate-500">
                                                                ${dayTotal.toLocaleString()}
                                                            </span>
                                                        </button>

                                                        {/* Contenido del acordeon */}
                                                        <AnimatePresence>
                                                            {isOpen && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="space-y-2 pl-2 pt-1 pb-2">
                                                                        {orders.map((h: any, idx: number) => {
                                                                            const hId = h.id || h.id_interno || h.id_pedido || `temp-${idx}`;
                                                                            return (
                                                                                <div
                                                                                    key={`${hId}-${idx}`}
                                                                                    onClick={() => setViewingOrder(h)}
                                                                                    className="bg-white dark:bg-slate-900 rounded-[20px] border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-indigo-500/30 active:scale-[0.99] transition-all overflow-x-auto no-scrollbar"
                                                                                >
                                                                                    <div className="flex items-center justify-between gap-6 p-3 min-w-max">
                                                                                        {/* Cliente e Info Principal */}
                                                                                        <div className="flex items-center gap-3 shrink-0">
                                                                                            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                                                                <User size={18} />
                                                                                            </div>
                                                                                            <div className="flex flex-col">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <p className="font-black text-[13px] tracking-tight text-slate-700 dark:text-slate-200">{h.cliente?.Nombre_Negocio || 'Cliente Desconocido'}</p>
                                                                                                    <span className="bg-emerald-500/10 text-emerald-600 text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap">Enviado</span>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                                                                                                        {h.fechaLocal?.split(' ').slice(1).join(' ') || ''}
                                                                                                    </p>
                                                                                                    <span className="text-[9px] text-slate-300 dark:text-slate-600">•</span>
                                                                                                    <p className="text-[9px] font-medium text-slate-400 italic">
                                                                                                        {h.items.length} prod.
                                                                                                    </p>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Controles de Acción */}
                                                                                        <div className="flex items-center gap-1.5 px-4 border-x border-slate-50 dark:border-slate-800 shrink-0">
                                                                                            <button onClick={(e) => { e.stopPropagation(); toggleHideOrder(String(hId)); }} className="h-9 w-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500 transition-all flex items-center justify-center" title="Ocultar"><EyeOff size={14} /></button>
                                                                                            {(!h.reparto || String(h.reparto) === "null" || String(h.reparto).trim() === "") && (
                                                                                                <button onClick={(e) => { e.stopPropagation(); handleEditOrder(h); }} className="h-9 w-9 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center" title="Editar"><Edit3 size={14} /></button>
                                                                                            )}
                                                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(String(hId)); }} className="h-9 w-9 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center" title="Eliminar"><Trash2 size={14} /></button>
                                                                                            <button onClick={(e) => { e.stopPropagation(); shareToWhatsApp(h); }} className="h-9 w-9 rounded-xl bg-emerald-500 text-white shadow-sm flex items-center justify-center" title="Compartir"><MessageCircle size={14} /></button>
                                                                                            <button onClick={(e) => { e.stopPropagation(); repeatOrder(h); }} className="h-9 px-3 rounded-xl bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5">Repetir <Clock size={11} /></button>
                                                                                        </div>

                                                                                        {/* Importe Total */}
                                                                                        <div className="shrink-0 text-right pr-2">
                                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Total</p>
                                                                                            <span className="text-base font-black text-indigo-600 dark:text-indigo-400">${h.total.toLocaleString()}</span>
                                                                                        </div>
                                                                                    </div>
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
                                        </div>
                                    );
                                })() : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                                        <Clock size={64} />
                                        <p className="text-sm font-black uppercase tracking-widest">Sin resultados</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {viewingOrder && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-6 flex flex-col h-[70vh] text-left text-[#191C1B] dark:text-[#E1E3DF]">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-black">{viewingOrder.cliente?.Nombre_Negocio}</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{viewingOrder.fechaLocal}</p>
                                </div>
                                <button onClick={() => setViewingOrder(null)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pb-6">
                                {viewingOrder.notas && (
                                    <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-500/10 rounded-3xl border border-orange-100 dark:border-orange-500/20">
                                        <p className="text-[10px] text-orange-400 font-bold uppercase mb-1">Notas / Detalles Delivery</p>
                                        <p className="text-sm font-black text-orange-600 dark:text-orange-400">{viewingOrder.notas}</p>
                                    </div>
                                )}
                                {viewingOrder.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-bold text-sm tracking-tight leading-tight">{item.nombre}</span>
                                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{item.descripcion || item.detalle}</span>
                                        </div>
                                        <div className="text-right flex flex-col">
                                            <span className="font-black text-indigo-600">${(item.subtotal || 0).toLocaleString()}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Cant: {item.cantidad}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex justify-between items-center mb-6 px-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Pedido</span>
                                    <span className="text-3xl font-black text-indigo-600">${viewingOrder.total.toLocaleString()}</span>
                                </div>
                                <button onClick={() => setViewingOrder(null)} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest outline-none">Volver al Historial</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {isConfigOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 text-center">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl overflow-hidden">
                            <h2 className="text-xl font-black mb-6">Configuración</h2>
                            <div className="space-y-4">
                                <div className="text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nombre del Vendedor</label>
                                    <input type="text" value={vendedorName} onChange={(e) => { setVendedorName(e.target.value); localStorage.setItem("vendedor_name", e.target.value); }} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Ej: Juan Pérez" />
                                </div>
                                <div className="text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Disposición de Menú</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => { setNavLayout('header'); localStorage.setItem("nav_layout", 'header'); }}
                                            className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all border-2 ${navLayout === 'header' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent'}`}
                                        >
                                            Encabezado
                                        </button>
                                        <button 
                                            onClick={() => { setNavLayout('fab'); localStorage.setItem("nav_layout", 'fab'); }}
                                            className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all border-2 ${navLayout === 'fab' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent'}`}
                                        >
                                            Flotante (FAB)
                                        </button>
                                    </div>
                                </div>
                                <button onClick={() => {
                                    localStorage.removeItem("user_role");
                                    localStorage.removeItem("is_logged_in");
                                    // No limpiamos vendedor_name aquí para que si el preventista vuelve, siga logueado
                                    localStorage.removeItem("vendedor_id");
                                    window.location.href = '/login';
                                }} className="w-full bg-rose-50 text-rose-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest mb-2">Cerrar Sesión</button>
                                <button onClick={() => setIsConfigOpen(false)} className="w-full bg-indigo-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest">Aceptar</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedImage(null)}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
                    >
                        <motion.img
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            src={selectedImage}
                            alt="Vista ampliada"
                            className="max-w-full max-h-full rounded-2xl shadow-2xl"
                        />
                        <button className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                            <X size={24} />
                        </button>
                    </motion.div>
                )}

                {/* MODAL DE CATEGORÍA SELECCIONADA */}
                {selectedCategory && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-[65] bg-slate-900/40 dark:bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-6"
                    >
                        {/* Overlay para cerrar al hacer click fuera en desktop */}
                        <div className="absolute inset-0" onClick={() => setSelectedCategory(null)} />
                        
                        <motion.div 
                            initial={{ y: "100%", opacity: 0 }} 
                            animate={{ y: 0, opacity: 1 }} 
                            exit={{ y: "100%", opacity: 0 }} 
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-[#F8FAFC] dark:bg-[#0F172A] w-full max-w-2xl rounded-t-[48px] sm:rounded-[48px] shadow-2xl flex flex-col max-h-[92vh] relative z-10 border-t border-white/20 dark:border-slate-800"
                        >
                            {/* Handle para mobile */}
                            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
                            
                            <div className="p-6 pb-4 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-[#0F172A]/80 backdrop-blur-md z-20 rounded-t-[48px]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-[20px] bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <FolderTree size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-white uppercase truncate max-w-[180px] xs:max-w-none">{selectedCategory}</h2>
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{groupedProducts[selectedCategory]?.length || 0} Productos</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedCategory(null)} 
                                    className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all active:scale-90"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4 no-scrollbar">
                                {groupedProducts[selectedCategory]?.map((p, idx) => renderProductCard(p, idx))}
                                <div className="h-20 sm:h-4 w-full" /> {/* Spacer extra para el botón del carrito en mobile */}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Selector de Vendedor con Contraseña */}
            <AnimatePresence>

                {isSuccessModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 shadow-2xl overflow-hidden relative border border-white/20">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />

                            <div className="relative text-center">
                                <div className="w-20 h-20 bg-emerald-500 text-white rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30 rotate-3">
                                    <CheckCircle2 size={40} />
                                </div>

                                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">¡Pedido Recibido!</h2>
                                <p className="text-slate-500 font-medium mb-8 text-sm">El pedido ha sido procesado correctamente y ya se encuentra en el sistema.</p>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => setIsSuccessModalOpen(false)}
                                        className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                    >
                                        Continuar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* FAB Menu */}
                {renderFAB()}

                {!vendedorName && (
                    <div className="fixed inset-0 z-[300] bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6 backdrop-blur-md bg-opacity-80">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-[40px] p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800"
                        >
                            {!selectedSellerToVerify ? (
                                <>
                                    <div className="w-20 h-20 bg-indigo-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-indigo-500/20">
                                        <User size={40} />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Panel Preventa</h2>
                                    <p className="text-slate-500 font-medium mb-8 text-sm">Selecciona tu perfil para continuar.</p>

                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scroll">
                                        {(data?.sellers || []).filter((s: any) => s.Activo !== false).map((seller: any, idx: number) => (
                                            <button
                                                key={seller.id || seller.Nombre || idx}
                                                onClick={() => setSelectedSellerToVerify(seller)}
                                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-2 border-transparent hover:border-indigo-500/20 rounded-2xl transition-all font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex justify-between items-center group text-left"
                                            >
                                                {seller.Nombre}
                                                <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-6"
                                >
                                    <button
                                        onClick={() => {
                                            setSelectedSellerToVerify(null);
                                            setTempPassword("");
                                            setLoginError("");
                                        }}
                                        className="text-indigo-500 text-xs font-black uppercase flex items-center gap-1 hover:underline"
                                    >
                                        <ArrowLeft size={14} /> Volver a la lista
                                    </button>

                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <Lock size={32} />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white">{selectedSellerToVerify.Nombre}</h3>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Ingresa tu contraseña</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="password"
                                                autoFocus
                                                placeholder="Contraseña"
                                                value={tempPassword}
                                                onChange={(e) => setTempPassword(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const pass = selectedSellerToVerify.Password || "";
                                                        if (tempPassword === pass) {
                                                            setVendedorName(selectedSellerToVerify.Nombre);
                                                            localStorage.setItem("vendedor_name", selectedSellerToVerify.Nombre);
                                                            localStorage.setItem("vendedor_id", selectedSellerToVerify.id || "");
                                                            localStorage.setItem("is_logged_in", "true");
                                                            localStorage.setItem("user_role", "preventista");
                                                            localStorage.setItem("user_name", selectedSellerToVerify.Nombre);
                                                            // Forzar sincronización con Firebase al entrar
                                                            refreshData(true);
                                                        } else {
                                                            setLoginError("Contraseña incorrecta");
                                                        }
                                                    }
                                                }}
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold outline-none transition-all"
                                            />
                                        </div>

                                        {loginError && (
                                            <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 justify-center">
                                                <AlertCircle size={12} /> {loginError}
                                            </p>
                                        )}

                                        <button
                                            onClick={() => {
                                                const pass = selectedSellerToVerify.Password || "";
                                                if (tempPassword === pass) {
                                                    setVendedorName(selectedSellerToVerify.Nombre);
                                                    localStorage.setItem("vendedor_name", selectedSellerToVerify.Nombre);
                                                    localStorage.setItem("vendedor_id", selectedSellerToVerify.id || "");
                                                    localStorage.setItem("is_logged_in", "true");
                                                    localStorage.setItem("user_role", "preventista");
                                                    localStorage.setItem("user_name", selectedSellerToVerify.Nombre);
                                                    // Forzar sincronización con Firebase al entrar
                                                    refreshData(true);
                                                } else {
                                                    setLoginError("Contraseña incorrecta");
                                                }
                                            }}
                                            className="w-full bg-indigo-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <UserCheck size={18} /> Validar Acceso
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}
