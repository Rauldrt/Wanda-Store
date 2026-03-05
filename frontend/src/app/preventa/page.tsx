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
    CheckCircle2,
    Package,
    Store,
    ImageIcon,
    Trash2,
    MessageCircle,
    LayoutList,
    FolderTree
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { wandaApi } from "@/lib/api";

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
    const { data } = useData();
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
    const [vendedorName, setVendedorName] = useState("");
    const [modoBulto, setModoBulto] = useState<{ [key: string]: boolean }>({});
    const [isListening, setIsListening] = useState<'client' | null | 'product'>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [searchOnlyByCode, setSearchOnlyByCode] = useState(false);
    const [viewingOrder, setViewingOrder] = useState<any>(null);
    const [activeSearch, setActiveSearch] = useState<'client' | 'product' | null>(null);
    const [expandedBanner, setExpandedBanner] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
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
    const [orderNotes, setOrderNotes] = useState("");

    const carouselBanners = useMemo(() => {
        const banners: any[] = [];

        // 1. Notificaciones del Sistema (Prioridad 1)
        const config = data?.config || {};
        const systemNotifsRaw = config.SYSTEM_NOTIFICATIONS;

        if (systemNotifsRaw) {
            try {
                const parsedNotifs = JSON.parse(systemNotifsRaw);
                if (Array.isArray(parsedNotifs)) {
                    parsedNotifs.filter((n: any) => n.active).forEach((n: any) => {
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

        // 2. Productos en Oferta (Prioridad 2)
        products.filter((p: any) => p.Es_Oferta === true || p.es_oferta === true || String(p.Es_Oferta).toLowerCase() === 'true').forEach((p: any) => {
            banners.push({
                id: `offer-${p.ID_Producto}`,
                type: 'offer',
                title: 'Oferta Especial',
                subtitle: p.Nombre,
                icon: '🔥',
                color: 'bg-rose-500',
                details: p.Nota_Oferta || p.nota_oferta || 'Aprovecha este precio especial hoy.'
            });
        });

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

    const allClients = useMemo(() => [...localClients, ...clients], [localClients, clients]);

    useEffect(() => {
        const savedName = localStorage.getItem("vendedor_name");
        if (savedName) setVendedorName(savedName);

        const savedLocalClients = localStorage.getItem("local_clients");
        if (savedLocalClients) setLocalClients(JSON.parse(savedLocalClients));

        const savedHistory = localStorage.getItem("order_history");
        if (savedHistory) setHistory(JSON.parse(savedHistory));

        const savedPending = localStorage.getItem("pending_orders");
        if (savedPending) setPendingOrders(JSON.parse(savedPending));
    }, []);

    const normalizeText = (text: any) =>
        String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const smartSearch = (text: string, query: string) => {
        if (!query) return true;
        const normText = normalizeText(text);
        const terms = normalizeText(query).split(/\s+/).filter(t => t.length > 0);
        return terms.every(t => normText.includes(t));
    };

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
            const query = normalizeText(deferredSearchTerm);
            return products.filter(p => normalizeText(p.ID_Producto).includes(query));
        }
        const terms = normalizeText(deferredSearchTerm).split(/\s+/).filter(t => t.length > 0);
        return searchableProducts
            .filter(p => terms.every(t => p.searchKey.includes(t)))
            .map(p => p.item);
    }, [searchableProducts, deferredSearchTerm, searchOnlyByCode, products]);

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

    const getImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.includes('drive.google.com')) {
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                return `https://drive.google.com/uc?export=view&id=${match[1]}`;
            }
        }
        return url;
    };

    const syncPendingOrders = async () => {
        if (pendingOrders.length === 0 || isSyncing) return;
        setIsSyncing(true);
        const stillPending = [];
        let successCount = 0;

        for (const order of pendingOrders) {
            try {
                await wandaApi.createOrder(order);
                successCount++;
            } catch (e) {
                stillPending.push(order);
            }
        }

        setPendingOrders(stillPending);
        localStorage.setItem("pending_orders", JSON.stringify(stillPending));
        setIsSyncing(false);
        if (successCount > 0) alert(`✅ Se sincronizaron ${successCount} pedidos.`);
    };

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

    const handleCreateClient = (e: React.FormEvent) => {
        e.preventDefault();
        const newClient: Client = {
            ...newClientData,
            ID_Cliente: `LOCAL-${Date.now()}`,
            EsLocal: true
        };
        const updatedLocal = [newClient, ...localClients];
        setLocalClients(updatedLocal);
        localStorage.setItem("local_clients", JSON.stringify(updatedLocal));
        setSelectedClient(newClient);
        setClientSearch(newClient.Nombre_Negocio);
        setIsNewClientModalOpen(false);
        setNewClientData({ Nombre_Negocio: "", Dueño: "", Telefono: "", Direccion: "", Latitud: "", Longitud: "" });
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
            id_interno: Date.now(),
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
            await wandaApi.createOrder(orderData);

            // Guardar en historial
            const updatedHistory = [orderData, ...history].slice(0, 50);
            setHistory(updatedHistory);
            localStorage.setItem("order_history", JSON.stringify(updatedHistory));

            const share = confirm("✅ Pedido enviado. ¿Deseas compartir el comprobante por WhatsApp?");
            if (share) {
                shareToWhatsApp(orderData);
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

            alert("📡 Sin conexión. El pedido se guardó localmente y se enviará cuando recuperes internet.");

            setCarrito({});
            setSelectedClient(null);
            setClientSearch("");
            setOrderNotes("");
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

    const filteredHistory = useMemo(() => {
        return history.filter(h => {
            const payload = [h.cliente?.Nombre_Negocio || "", h.id_interno, h.total].join(" ");
            const matchesText = smartSearch(payload, historySearch);
            const matchesDate = historyDate ? h.fecha.startsWith(historyDate) : true;
            return matchesText && matchesDate;
        });
    }, [history, historySearch, historyDate]);

    // --- RENDER HELPERS ---

    const clientList = filteredClients.length > 0 ? filteredClients.map(c => (
        <button
            key={c.ID_Cliente}
            onClick={() => { setSelectedClient(c); setClientSearch(c.Nombre_Negocio); setIsClientDropdownOpen(false); }}
            className="w-full p-4 text-left border-b border-slate-50 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex justify-between items-center group"
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
        </button>
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

    const renderProductCard = (p: any) => {
        const pid = String(p.ID_Producto);
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
                className={`p-4 rounded-[28px] bg-white dark:bg-slate-900 border transition-all duration-300 ${qty > 0
                    ? 'border-indigo-200 bg-indigo-50/10 dark:border-indigo-500/30'
                    : 'border-slate-100 dark:border-slate-800'
                    }`}
            >
                <div className="flex gap-4">
                    <div
                        onClick={() => p.Imagen_URL && setSelectedImage(getImageUrl(p.Imagen_URL))}
                        className="w-24 h-24 rounded-[24px] bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 cursor-zoom-in hover:scale-105 transition-transform"
                    >
                        {p.Imagen_URL ? (
                            <img src={getImageUrl(p.Imagen_URL) || ""} alt={p.Nombre} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <ImageIcon size={28} />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">{p.Categoria || 'S/C'}</span>
                                {isKg && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase">Pesable</span>}
                                {parseFloat(p.Stock_Actual || "0") < 1 ? (
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 uppercase">Sin Stock</span>
                                ) : (
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${parseFloat(p.Stock_Actual || "0") <= 10 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                        Stock: {p.Stock_Actual}
                                    </span>
                                )}
                                {getPromoDiscount(pid, qty, isBulto) > 0 && (
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white uppercase animate-pulse">
                                        PROMO -{getPromoDiscount(pid, qty, isBulto)}%
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-[15px] leading-tight text-slate-800 dark:text-slate-100 line-clamp-2">{p.Nombre}</h3>
                            {isKg && (
                                <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-tighter">
                                    ${pureUnitPrice.toLocaleString()}/kg • {avgWeight}kg prom
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-3 gap-2">
                            <div className="flex flex-col min-w-0 max-w-[40%]">
                                {getPromoDiscount(pid, qty, isBulto) > 0 ? (
                                    <>
                                        <span className="text-[17px] xs:text-xl font-black text-rose-500 dark:text-rose-400 truncate">
                                            ${(finalPrice * (1 - getPromoDiscount(pid, qty, isBulto) / 100)).toLocaleString()}
                                        </span>
                                        <span className="text-[9px] xs:text-[10px] font-bold text-slate-400 line-through decoration-rose-500/50">
                                            ${finalPrice.toLocaleString()}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-[17px] xs:text-xl font-black text-indigo-600 dark:text-indigo-400 truncate">${finalPrice.toLocaleString()}</span>
                                )}
                                <span className="text-[9px] font-bold text-slate-400 uppercase truncate">{isBulto ? `Bulto (${unitsPerBulk}u)` : unitLabel}</span>
                            </div>

                            <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800 p-1 rounded-2xl shrink-0">
                                {qty > 0 ? (
                                    <>
                                        <button onClick={() => updateQty(pid, -1)} className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                                        <input id={`qty-input-${pid}`} type="number" min="0" value={qty || ""} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) setQtyExact(pid, v); else setQtyExact(pid, 0) }} className="w-10 text-center text-sm font-black bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-lg" onFocus={(e) => e.target.select()} />
                                        <button onClick={() => updateQty(pid, 1)} className="w-8 h-8 xs:w-9 xs:h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"><Plus size={16} /></button>
                                    </>
                                ) : (
                                    <button onClick={() => handleInitialAdd(pid)} className="px-3 xs:px-5 py-2 xs:py-2.5 rounded-2xl bg-indigo-600 text-white text-[9px] xs:text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-indigo-500/10 whitespace-nowrap">Agregar</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {unitsPerBulk > 1 && (
                    <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modalidad</span>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-[16px] gap-1 shadow-inner">
                            <button
                                onClick={() => isBulto && toggleBulto(pid)}
                                className={`px-4 py-1.5 rounded-[12px] text-[9px] font-black uppercase transition-all ${!isBulto ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                            >
                                {unitLabel}
                            </button>
                            <button
                                onClick={() => !isBulto && toggleBulto(pid)}
                                className={`px-4 py-1.5 rounded-[12px] text-[9px] font-black uppercase transition-all ${isBulto ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400'}`}
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
            const isExpanded = expandedCategories.includes(cat);
            return (
                <div key={cat} className="mb-4">
                    <button
                        onClick={() => toggleCategory(cat)}
                        className="w-full bg-white dark:bg-slate-900 py-3 px-4 mb-2 text-[12px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-[0.2em] border border-indigo-100 dark:border-indigo-900/30 shadow-sm rounded-[20px] flex justify-between items-center transition-all active:scale-95"
                    >
                        <div className="flex items-center gap-2">
                            <FolderTree size={16} className="text-indigo-400" />
                            {cat}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="opacity-80 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[10px] tracking-widest">{prods.length}</span>
                            <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                    </button>
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-1 gap-4 pt-2 pb-4">
                                    {prods.map(renderProductCard)}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )
        });

    const cartItemList = Object.entries(carrito).map(([id, qty]) => {
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
            <div key={id} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-500"><Package size={20} /></div>
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
        );
    });

    return (
        <div className="min-h-screen bg-[#F4FBF9] dark:bg-[#101413] flex flex-col text-[#191C1B] dark:text-[#E1E3DF]">
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            <AnimatePresence>
                {pendingOrders.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest py-3 px-4 flex items-center justify-between cursor-pointer"
                        onClick={syncPendingOrders}
                    >
                        <div className="flex items-center gap-2">
                            <Clock size={12} className={isSyncing ? "animate-spin" : ""} />
                            {isSyncing ? "Sincronizando..." : `Tienes ${pendingOrders.length} pedidos pendientes de envío`}
                        </div>
                        <span className="bg-white/20 px-2 py-1 rounded">Reintentar</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="bg-white dark:bg-slate-900 pt-4 px-4 pb-0">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative group/logo">
                            <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-40 group-hover:opacity-100 transition-opacity" />
                            <div className="relative w-10 h-10 rounded-xl bg-slate-900 border border-indigo-500/50 flex items-center justify-center text-indigo-400 font-black shadow-2xl">
                                <span className="text-lg tracking-tighter drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]">&lt;/&gt;</span>
                            </div>
                        </div>
                        <div>
                            <h1 className="font-black text-lg leading-none uppercase italic">Wanda <span className="text-indigo-500">Cloud</span></h1>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{vendedorName || 'Sin Vendedor'}</span>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => setIsCartOpen(true)} className="p-2 rounded-full hover:bg-black/5 relative text-indigo-500">
                            <ShoppingCart size={20} />
                            {totalItems > 0 && (
                                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                    {totalItems}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setIsHistoryOpen(true)} className="p-2 rounded-full hover:bg-black/5 text-slate-400"><Clock size={20} /></button>
                        <button onClick={() => setIsConfigOpen(true)} className="p-2 rounded-full hover:bg-black/5 text-slate-400"><Settings size={20} /></button>
                    </div>
                </div>
            </header>

            <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 px-4 pt-4 pb-4 border-b border-black/5 shadow-sm">
                <div className="flex items-center gap-2">
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

            {carouselBanners.length > 0 && (
                <div className="pt-4 px-4 max-w-full overflow-hidden">
                    <div className="px-1">
                        <div className="flex overflow-x-auto gap-3 pb-3 no-scrollbar snap-x snap-mandatory">
                            {carouselBanners.map((banner) => (
                                <motion.div
                                    key={banner.id}
                                    layout
                                    onClick={() => setExpandedBanner(expandedBanner === banner.id ? null : banner.id)}
                                    initial={false}
                                    animate={{
                                        width: expandedBanner === banner.id ? '300px' : '140px',
                                        height: expandedBanner === banner.id ? 'auto' : '64px'
                                    }}
                                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                    className={`snap-start flex-shrink-0 flex items-center gap-3 p-3 rounded-[28px] ${banner.color} text-white cursor-pointer shadow-lg shadow-black/5 relative overflow-hidden`}
                                >
                                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0">
                                        {banner.icon}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-black uppercase tracking-tighter leading-none opacity-90">{banner.title}</span>
                                        <span className={`text-[13px] font-black leading-tight ${expandedBanner === banner.id ? '' : 'truncate'}`}>{banner.subtitle}</span>

                                        {expandedBanner === banner.id && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mt-2 text-[10px] font-bold opacity-80"
                                            >
                                                {banner.details}
                                            </motion.div>
                                        )}
                                    </div>
                                    {expandedBanner === banner.id && (
                                        <div className="absolute top-2 right-2">
                                            <X size={12} className="opacity-50" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 p-4 pb-32">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {filteredProducts.length} Productos
                    </h2>
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
                                <button
                                    onClick={handleConfirmOrder}
                                    disabled={isSubmitting}
                                    className={`w-full py-5 rounded-[24px] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${isSubmitting ? 'bg-slate-100 text-slate-400' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95'}`}
                                >
                                    {isSubmitting ? (
                                        <>Procesando <Plus className="animate-spin" size={18} /></>
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

                            <div className="flex-1 overflow-y-auto space-y-3">
                                {filteredHistory.length > 0 ? filteredHistory.map((h: any) => (
                                    <div
                                        key={h.id_interno}
                                        onClick={() => setViewingOrder(h)}
                                        className="bg-slate-50 dark:bg-slate-800 p-4 rounded-[28px] border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-indigo-500/30 active:scale-[0.98] transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-black text-sm">{h.cliente?.Nombre_Negocio || "Cliente Desconocido"}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{h.fechaLocal}</p>
                                            </div>
                                            <span className="bg-emerald-100 text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Enviado</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 line-clamp-1 mb-3 italic">
                                            Haz clic para ver {h.items.length} producto{h.items.length > 1 ? 's' : ''}
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                                            <span className="text-lg font-black text-indigo-600">${h.total.toLocaleString()}</span>
                                            <div className="flex gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); shareToWhatsApp(h); }} className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20"><MessageCircle size={16} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); repeatOrder(h); }} className="px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-indigo-500/20 flex items-center gap-2 pr-5">Repetir <Clock size={12} /></button>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
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
                                <button onClick={() => {
                                    localStorage.removeItem("user_role");
                                    localStorage.removeItem("is_logged_in");
                                    localStorage.removeItem("user_name");
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
            </AnimatePresence>
        </div >
    );
}
