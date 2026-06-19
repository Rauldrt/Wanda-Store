"use client";

import { useState, useMemo, useEffect, useRef, useDeferredValue } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    ShoppingCart,
    User,
    Clock,
    Plus,
    Minus,
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
    LogOut,
    ShoppingBag,
    MapPin,
    Settings,
    LocateFixed,
    Instagram,
    Facebook
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { wandaApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { getImageUrl, normalizeText, smartSearch } from "@/lib/utils";
import CategoryCarousel from "@/components/CategoryCarousel";
import { ShopProductCard } from "@/components/ShopProductCard";

const CATEGORY_DESCRIPTIONS: Record<string, { title: string, desc: string }> = {
    "MASCULINOS": {
        title: "Fragancias Masculinas",
        desc: "Fragancias con presencia, carácter y elegancia. Descubrí aromas únicos para cada estilo y ocasión."
    },
    "FEMENINOS": {
        title: "Fragancias Femeninas",
        desc: "Fragancias llenas de elegancia, dulzura y sofisticación. Descubrí aromas irresistibles que resaltan tu esencia en cada momento."
    },
    "UNISEX": {
        title: "Perfumes Unisex",
        desc: "Perfumes unisex diseñados para quienes buscan destacar sin límites. Aromas modernos, versátiles y envolventes que se adaptan a cada personalidad."
    },
    "INFANTILES": {
        title: "Fragancias Infantiles",
        desc: "Perfumes infantiles suaves, divertidos y encantadores. Aromas delicados pensados para acompañar cada momento con ternura y frescura."
    },
    "CUIDADO PERSONAL": {
        title: "Cuidado Personal",
        desc: "Productos de cuidado personal pensados para tu bienestar diario. Opciones que combinan frescura, cuidado y una experiencia única para tu piel y rutina."
    },
    "PARA EL HOGAR": {
        title: "Aromas para el Hogar",
        desc: "Fragancias delicadas pensadas para ambientar tus espacios con calidez, armonía y frescura."
    }
};

export default function TiendaOnlinePage() {
    const { data } = useData();
    const router = useRouter();
    const config = data?.config || {};
    const products: any[] = useMemo(() => {
        let prods = data?.products || [];
        const config = data?.config || {};
        const hideLowPrice = config.HIDE_LOW_PRICE === 'true' || config.HIDE_LOW_PRICE === true;
        const hideNoStock = config.HIDE_NO_STOCK === 'true' || config.HIDE_NO_STOCK === true;

        if (hideLowPrice) prods = prods.filter((p: any) => parseFloat(p.Precio_Unitario || 0) >= 1);
        if (hideNoStock) prods = prods.filter((p: any) => parseFloat(p.Stock_Actual || 0) > 0);
        return prods;
    }, [data]);

    const carouselConfig = useMemo(() => {
        const conf = data?.config?.SYSTEM_CAROUSEL;
        if (!conf) return [];
        try {
            return JSON.parse(conf);
        } catch (e) {
            console.error("Error parsing carousel config", e);
            return [];
        }
    }, [data?.config?.SYSTEM_CAROUSEL]);

    const [searchTerm, setSearchTerm] = useState("");
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const [carrito, setCarrito] = useState<{ [key: string]: number }>({});
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modoBulto, setModoBulto] = useState<{ [key: string]: boolean }>({});
    const [isListening, setIsListening] = useState<null | 'product'>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [searchOnlyByCode, setSearchOnlyByCode] = useState(false);
    const [expandedBanner, setExpandedBanner] = useState<string | null>(null);
    const [isDeliveryFormOpen, setIsDeliveryFormOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [showStickySearch, setShowStickySearch] = useState(false);
    const [viewportOffset, setViewportOffset] = useState(0);
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'mercadopago' | 'astropay'>('efectivo');
    const [isCartLoaded, setIsCartLoaded] = useState(false);
    const productInputRef = useRef<HTMLInputElement>(null);
    const stickyInputRef = useRef<HTMLInputElement>(null);

    const [userInfo, setUserInfo] = useState({
        name: "",
        email: "",
        photo: ""
    });

    const [checkoutData, setCheckoutData] = useState({
        telefono: "",
        direccion: "",
        ubicacion: ""
    });

    const [isLocating, setIsLocating] = useState(false);
    const [isRegalo, setIsRegalo] = useState(false);
    const [regaloNombre, setRegaloNombre] = useState("");
    const [regaloMensaje, setRegaloMensaje] = useState("");
    const [regaloInstrucciones, setRegaloInstrucciones] = useState("");

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("Tu navegador no soporta geolocalización.");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
                setCheckoutData(prev => ({ ...prev, ubicacion: mapsLink }));
                localStorage.setItem("user_location", mapsLink);
                setIsLocating(false);
            },
            (error) => {
                console.error(error);
                alert("No pudimos obtener tu ubicación. Asegúrate de permitir el acceso en tu navegador.");
                setIsLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    useEffect(() => {
        const role = localStorage.getItem("user_role");
        if (role !== "cliente" && role !== "admin") {
            router.push("/login");
            return;
        }

        const email = localStorage.getItem("user_email") || "";
        const name = localStorage.getItem("user_name") || "Cliente Online";
        const photo = localStorage.getItem("user_photo") || "";

        setUserInfo({ name, email, photo });

        // Cargar perfil desde Firestore (Sincronización total)
        const loadProfile = async () => {
            if (email) {
                try {
                    const profile = await wandaApi.getClientProfile(email);
                    if (profile) {
                        setCheckoutData({
                            telefono: profile.telefono || "",
                            direccion: profile.direccion || "",
                            ubicacion: profile.ubicacion || ""
                        });
                    } else {
                        throw new Error("No profile");
                    }
                } catch (e) {
                    // Fallback a localStorage si es la primera vez o no hay internet
                    setCheckoutData({
                        telefono: localStorage.getItem("user_phone") || "",
                        direccion: localStorage.getItem("user_address") || "",
                        ubicacion: localStorage.getItem("user_location") || ""
                    });
                }
            }
        };
        loadProfile();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const threshold = 200;
            if (window.scrollY > threshold) {
                setShowStickySearch(true);
            } else {
                setShowStickySearch(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !window.visualViewport) return;

        const handleResize = () => {
            const offset = window.innerHeight - (window.visualViewport?.height || window.innerHeight);
            setViewportOffset(offset > 50 ? offset : 0);
        };

        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);

        handleResize();

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
        };
    }, []);

    // Persistir carrito en localStorage
    useEffect(() => {
        const saved = localStorage.getItem("wanda_shopping_cart");
        if (saved) {
            try {
                setCarrito(JSON.parse(saved));
            } catch (e) {}
        }
        setIsCartLoaded(true);
    }, []);

    useEffect(() => {
        if (!isCartLoaded) return;
        localStorage.setItem("wanda_shopping_cart", JSON.stringify(carrito));
    }, [carrito, isCartLoaded]);

    // Escuchar parámetros de retorno de pago de Mercado Pago y AstroPay
    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const mpStatus = params.get("mp_status");
        const astropayStatus = params.get("astropay_status");
        const orderId = params.get("order_id");

        if ((mpStatus || astropayStatus) && orderId) {
            const processPayment = async () => {
                const isApproved = mpStatus === "approved" || astropayStatus === "approved";
                const isPending = mpStatus === "pending" || astropayStatus === "pending";
                const isFailure = mpStatus === "failure" || astropayStatus === "failure";

                if (isApproved) {
                    try {
                        const gatewayName = mpStatus ? "Mercado Pago" : "AstroPay";
                        // Actualizar estado del pedido en base de datos a Pendiente
                        await wandaApi.updateStatus(orderId, "Pendiente", `Pago aprobado por ${gatewayName}`);
                        
                        // Limpiar carrito
                        setCarrito({});
                        localStorage.removeItem("wanda_shopping_cart");
                        
                        alert("🎉 ¡Pago aprobado con éxito! Tu pedido ya está siendo procesado.");
                    } catch (e) {
                        console.error("Error al actualizar estado tras el pago:", e);
                        alert("Ocurrió un error al procesar el pago. Por favor contacta soporte.");
                    }
                } else if (isPending) {
                    alert("⏳ Tu pago está pendiente. Procesaremos el pedido una vez aprobado.");
                } else if (isFailure) {
                    alert("❌ El pago fue rechazado o cancelado. Puedes intentar nuevamente.");
                }
                
                // Limpiar la URL para evitar reprocesamiento
                router.replace("/tienda");
            };
            processPayment();
        }
    }, [isCartLoaded]);

    // Sincronizar Historial desde Firestore + Local (Offline)
    const combinedHistory = useMemo(() => {
        const fromFirebase = data?.orders
            ? data.orders.filter((o: any) => o.cliente_id === userInfo.email)
            : [];

        let fromLocal = [];
        try {
            const saved = localStorage.getItem("order_history_online");
            fromLocal = saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error cargando historial local", e);
        }

        const combined = [...fromFirebase, ...fromLocal];
        return combined.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }, [data?.orders, userInfo.email]);

    const carouselBanners = useMemo(() => {
        const banners: any[] = [];
        const config = data?.config || {};
        const systemNotifsRaw = config.SYSTEM_NOTIFICATIONS;

        if (systemNotifsRaw) {
            try {
                const parsedNotifs = JSON.parse(systemNotifsRaw);
                if (Array.isArray(parsedNotifs)) {
                    parsedNotifs
                        .filter((n: any) => n.active && (n.audiencia === 'tienda' || n.audiencia === 'todos'))
                        .forEach((n: any) => {
                            banners.push({
                                id: `sys-${n.id}`,
                                type: 'info',
                                title: n.title || 'Aviso Sistema',
                                subtitle: n.text,
                                icon: '📢',
                                color: 'bg-amber-600',
                                details: 'Comunicado oficial para clientes.'
                            });
                        });
                }
            } catch (e) { console.error(e); }
        }

        products.filter((p: any) => p.Es_Oferta === true || p.es_oferta === true || String(p.Es_Oferta).toLowerCase() === 'true').forEach((p: any) => {
            banners.push({
                id: `offer-${p.ID_Producto}`,
                type: 'offer',
                title: 'Oferta Especial',
                subtitle: p.Nombre,
                icon: '🔥',
                color: 'bg-rose-500',
                details: p.Nota_Oferta || 'Precio especial por tiempo limitado.'
            });
        });

        return banners;
    }, [data, products]);

    const categories = useMemo(() => ["ALL", ...new Set(products.map((p: any) => p.Categoria).filter(Boolean).sort() as string[])], [products]);

    const filteredProducts = useMemo(() => {
        let result = products;
        
        // Filter by Category
        if (categoryFilter !== "ALL") {
            result = result.filter(p => p.Categoria === categoryFilter);
        }

        // Filter by Search Term
        if (deferredSearchTerm) {
            const query = normalizeText(deferredSearchTerm);
            result = result.filter(p => {
                if (searchOnlyByCode) {
                    return normalizeText(p.ID_Producto).includes(query);
                }
                const searchPayload = `${p.Nombre} ${p.Categoria || ''} ${p.Nota_Oferta || ''}`;
                return smartSearch(searchPayload, deferredSearchTerm);
            });
        }

        return result;
    }, [products, deferredSearchTerm, searchOnlyByCode, categoryFilter]);

    const addToCart = (id: string, qty: number = 1) => {
        setCarrito(prev => ({ ...prev, [id]: (prev[id] || 0) + qty }));
    };

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
        if (window.confirm('¿Seguro que deseas vaciar tu carrito?')) {
            setCarrito({});
            setModoBulto({});
            setIsCartOpen(false);
        }
    };

    const handleInitialAdd = (id: string) => {
        addToCart(id, 1);
        setTimeout(() => {
            const input = document.getElementById(`qty-input-${id}`) as HTMLInputElement;
            if (input) {
                input.focus();
                input.select();
            }
        }, 50);
    };

    const toggleBulto = (id: string) => {
        setModoBulto(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const cartCount = Object.values(carrito).reduce((a, b) => a + b, 0);

    const cartTotal = useMemo(() => {
        return Object.entries(carrito).reduce((acc, [id, qty]) => {
            const isDecant = id.endsWith("-decant");
            const baseId = isDecant ? id.replace("-decant", "") : id;
            const p = products.find(prod => String(prod.ID_Producto) === baseId);
            if (!p) return acc;

            const isKg = isDecant ? false : (p.Unidad || "").toLowerCase() === 'kg';
            const isBulto = isDecant ? false : !!modoBulto[id];

            const pr = isDecant 
                ? parseFloat(String(p.Precio_Decant || "0").replace(',', '.'))
                : parseFloat(String(p.Precio_Unitario || "0").replace(',', '.'));
            const pe = parseFloat(String(p.Peso_Promedio || "1").replace(',', '.'));
            const ub = parseFloat(String(p.Unidades_Bulto || "1").replace(',', '.'));

            const piecePrice = isKg ? pr * pe : pr;
            const finalPrice = isBulto ? piecePrice * ub : piecePrice;

            return acc + (finalPrice * qty);
        }, 0);
    }, [carrito, modoBulto, products]);

    const handleConfirmOrder = async () => {
        if (Object.keys(carrito).length === 0) return;

        if (!checkoutData.telefono || !checkoutData.direccion || !checkoutData.ubicacion) {
            alert("Por favor, completa tu teléfono, dirección y ubicación para el envío.");
            return;
        }

        setIsSubmitting(true);

        const orderData = {
            cliente: {
                ID_Cliente: "ONLINE",
                Nombre_Negocio: userInfo.name || "Cliente Web",
                Email: userInfo.email || "",
                Telefono: checkoutData.telefono || "",
                Direccion: checkoutData.direccion || "",
                Ubicacion: checkoutData.ubicacion || "",
                Es_Online: true
            },
            items: Object.entries(carrito).map(([id, qty]) => {
                const isDecant = id.endsWith("-decant");
                const baseId = isDecant ? id.replace("-decant", "") : id;
                const p = products.find(prod => String(prod.ID_Producto) === baseId);
                const isB = isDecant ? false : !!modoBulto[id];
                const isKg = isDecant ? false : (p?.Unidad || "").toLowerCase() === 'kg';

                const pr = isDecant
                    ? parseFloat(String(p?.Precio_Decant || "0").replace(',', '.'))
                    : parseFloat(String(p?.Precio_Unitario || "0").replace(',', '.'));
                const pe = parseFloat(String(p?.Peso_Promedio || "1").replace(',', '.'));
                const ub = parseFloat(String(p?.Unidades_Bulto || "1").replace(',', '.'));

                const piecePrice = isKg ? pr * pe : pr;
                const finalItemPrice = isB ? piecePrice * ub : piecePrice;
                const subtotal = finalItemPrice * qty;

                const total_unidades = isB ? qty * ub : qty;
                const total_bultos = ub > 0 ? (total_unidades / ub) : 0;
                const stringBulto = (Math.floor(total_bultos * 100) / 100).toString().replace('.', ',');
                const rep_bultos = Math.floor(total_bultos);
                const rep_unidades = Math.round((total_unidades % ub) * 100) / 100;
                
                let desc = "";
                let picking_format = "";
                if (isDecant) {
                    desc = `${qty} Decant (${p?.Volumen_Decant || '10ml'})`;
                    picking_format = `${qty} Decant (${p?.Volumen_Decant || '10ml'})`;
                } else if (isB) {
                    desc = `${qty} Bulto${qty > 1 ? 's' : ''} (${ub}u)`;
                } else if (isKg) {
                    desc = `${qty} Pieza${qty > 1 ? 's' : ''} (~${pe}kg)`;
                } else {
                    desc = `${qty} Unidad${qty > 1 ? 'es' : ''}`;
                }

                if (!isDecant) {
                    if (isKg) {
                        picking_format = `${total_unidades} Pieza${total_unidades > 1 ? 's' : ''} (~${(total_unidades*pe).toFixed(2)}kg)`;
                    } else if (ub > 1) {
                        if (rep_bultos > 0 && rep_unidades > 0) {
                            picking_format = `${rep_bultos} Bulto${rep_bultos > 1 ? 's' : ''} y ${rep_unidades} Unid.`;
                        } else if (rep_bultos > 0) {
                            picking_format = `${rep_bultos} Bulto${rep_bultos > 1 ? 's' : ''}`;
                        } else {
                            picking_format = `${rep_unidades} Unid.`;
                        }
                    } else {
                         picking_format = desc;
                    }
                }

                return {
                    id_producto: baseId,
                    nombre: p?.Nombre || "Producto",
                    cantidad: qty,
                    precio: finalItemPrice,
                    subtotal: subtotal,
                    descripcion: desc,
                    esBulto: isB,
                    picking_format: picking_format,
                    total_unidades: total_unidades,
                    total_bultos: total_bultos,
                    fracciones_bulto: stringBulto,
                    esDecant: isDecant,
                    decantVolumen: isDecant ? (p?.Volumen_Decant || '10ml') : null
                };
            }),
            total: cartTotal,
            vendedor: "Venta Online",
            notas: (() => {
                let note = `Pedido realizado desde la tienda online. Método de Pago: ${
                    metodoPago === 'mercadopago' ? 'Mercado Pago' : metodoPago === 'astropay' ? 'AstroPay' : 'Efectivo/Transferencia'
                }.`;
                if (isRegalo) {
                    note += `\n\n🎁 [REGALO SORPRESA - SERVICIO CONFIDENCIAL]`;
                    note += `\n• Homenajeado: ${regaloNombre || 'No especificado'}`;
                    note += `\n• Mensaje Dedicado: ${regaloMensaje || 'Sin mensaje'}`;
                    note += `\n• Instrucciones Entrega: ${regaloInstrucciones || 'Sin instrucciones'}`;
                }
                return note;
            })(),
            id_interno: Date.now().toString(),
            estado: (metodoPago === 'mercadopago' || metodoPago === 'astropay') ? 'Pendiente de Pago' : 'Pendiente'
        };

        try {
            // Sincronizar perfil
            if (userInfo.email) {
                try {
                    await wandaApi.saveClientProfile(userInfo.email, {
                        telefono: checkoutData.telefono,
                        direccion: checkoutData.direccion,
                        ubicacion: checkoutData.ubicacion
                    });
                } catch (e) {
                    console.log("No se pudo sincronizar el perfil (offline)");
                }
            }

            // Guardar pedido
            const res = await wandaApi.submitOrder(orderData);
            if (res.error) throw new Error(res.error);

            const createdOrderId = res.id; // Obtenemos el ID de orden generado por el servidor

            if (metodoPago === 'mercadopago') {
                // Flujo Mercado Pago
                const checkoutRes = await fetch("/api/checkout", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        items: orderData.items,
                        cliente: {
                            name: userInfo.name,
                            email: userInfo.email,
                            telefono: checkoutData.telefono,
                            direccion: checkoutData.direccion
                        },
                        orderId: createdOrderId
                    })
                });

                const checkoutJson = await checkoutRes.json();
                if (checkoutJson.error) {
                    throw new Error(checkoutJson.error);
                }

                if (checkoutJson.initPoint) {
                    // Redirigir a Mercado Pago
                    window.location.href = checkoutJson.initPoint;
                } else {
                    throw new Error("No se pudo generar la pasarela de pagos de Mercado Pago.");
                }
            } else if (metodoPago === 'astropay') {
                // Flujo AstroPay
                const checkoutRes = await fetch("/api/checkout/astropay", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        items: orderData.items,
                        cliente: {
                            name: userInfo.name,
                            email: userInfo.email,
                            telefono: checkoutData.telefono,
                            direccion: checkoutData.direccion
                        },
                        orderId: createdOrderId
                    })
                });

                const checkoutJson = await checkoutRes.json();
                if (checkoutJson.error) {
                    throw new Error(checkoutJson.error);
                }

                if (checkoutJson.initPoint) {
                    // Redirigir a AstroPay
                    window.location.href = checkoutJson.initPoint;
                } else {
                    throw new Error("No se pudo generar la pasarela de pagos de AstroPay.");
                }
            } else {
                // Flujo tradicional Efectivo/Transferencia
                try {
                    const waVal = config.CONTACT_WHATSAPP;
                    if (waVal) {
                        const cleaned = waVal.replace(/\D/g, '');
                        if (cleaned) {
                            const itemsText = orderData.items.map((item: any) => {
                                return `• ${item.nombre} ${item.esDecant ? `(Decant ${item.decantVolumen})` : ''} x ${item.cantidad} - $${item.subtotal.toLocaleString()}`;
                            }).join('\n');

                            const message = `¡Hola Wanda Essence! 🌸\nAcabo de realizar un pedido desde la tienda online.\n\n📋 *Detalles de la Entrega:*\n• Cliente: ${orderData.cliente.Nombre_Negocio}\n• Teléfono: ${orderData.cliente.Telefono}\n• Dirección: ${orderData.cliente.Direccion}\n• Ubicación GPS: ${orderData.cliente.Ubicacion}\n\n🛍️ *Productos:*\n${itemsText}\n\n💰 *Total a pagar:* $${orderData.total.toLocaleString()}\n💵 *Método de Pago:* Efectivo / Transferencia${
                                isRegalo ? `\n\n🎁 *[REGALO SORPRESA - SERVICIO CONFIDENCIAL]*\n• Recibe: ${regaloNombre || 'No especificado'}\n• Dedicatoria: ${regaloMensaje || 'Sin dedicatoria'}\n• Instrucciones: ${regaloInstrucciones || 'Sin instrucciones'}` : ''
                            }`;

                            const whatsappUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
                            window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                        }
                    }
                } catch (waErr) {
                    console.error("No se pudo abrir WhatsApp:", waErr);
                }

                alert("✅ ¡Pedido enviado con éxito!");
                setCarrito({});
                setIsCartOpen(false);
                if (typeof window !== 'undefined') window.location.reload();
            }
        } catch (err: any) {
            console.error("Error al enviar pedido:", err);

            // Si es flujo de pago y falló la API local/red, informamos
            if (metodoPago === 'mercadopago') {
                alert(`❌ Error al iniciar el pago con Mercado Pago: ${err.message || err}.`);
            } else if (metodoPago === 'astropay') {
                alert(`❌ Error al iniciar el pago con AstroPay: ${err.message || err}.`);
            } else {
                // Verificar si realmente estamos offline o es otro tipo de error de Firebase/permisos/sintaxis
                const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

                if (isOffline) {
                    // LÓGICA OFFLINE tradicional
                    try {
                        const savedPending = localStorage.getItem("order_history_online");
                        const pendingOrders = savedPending ? JSON.parse(savedPending) : [];
                        const offlineOrder = {
                            ...orderData,
                            fecha: new Date().toISOString(),
                            isOffline: true
                        };
                        pendingOrders.push(offlineOrder);
                        localStorage.setItem("order_history_online", JSON.stringify(pendingOrders));
                        alert("📡 Sin conexión. Tu pedido se guardó en el dispositivo y se enviará automáticamente cuando recuperes internet.");
                        setCarrito({});
                        setIsCartOpen(false);
                    } catch (localErr) {
                        alert("❌ Error al guardar el pedido localmente.");
                    }
                } else {
                    // Es un error del servidor/código/permisos a pesar de tener conexión
                    alert(`❌ Error al procesar tu pedido: ${err.message || err}`);
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const saveProfileChanges = async () => {
        if (!userInfo.email) return;
        setIsSubmitting(true);
        try {
            await wandaApi.saveClientProfile(userInfo.email, {
                telefono: checkoutData.telefono,
                direccion: checkoutData.direccion,
                ubicacion: checkoutData.ubicacion
            });
            alert("✅ Perfil actualizado correctamente.");
        } catch (e) {
            alert("❌ Error al guardar perfil.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const logout = () => {
        localStorage.clear();
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-transparent font-sans pb-24 transition-colors">
            {/* Header Rediseñado */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 h-[72px]">
                <div className="flex items-center gap-3 shrink-0">
                    <AnimatePresence mode="wait">
                        {!showStickySearch ? (
                            <motion.div 
                                key="user-info"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex items-center gap-3"
                            >
                                {userInfo.photo ? (
                                    <img src={userInfo.photo} className="w-9 h-9 rounded-full border-2 border-indigo-500/20 shadow-sm" alt="User" />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                        <User size={18} />
                                    </div>
                                )}
                                <div className="hidden xs:block">
                                    <h1 className="text-xs font-black text-slate-800 dark:text-white leading-none mb-0.5">{userInfo.name}</h1>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Wanda Store</span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="sticky-search"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="flex-1 max-w-[280px] sm:max-w-md relative"
                            >
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Search size={16} />
                                </div>
                                <input
                                    ref={stickyInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar..."
                                    className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-full py-2.5 pl-10 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                <div className="flex gap-1 items-center shrink-0">
                    <ThemeToggle />
                    <button onClick={() => setIsProfileOpen(true)} className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-500 transition-colors">
                        <Settings size={16} />
                    </button>
                    <button onClick={() => setIsHistoryOpen(true)} className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        <Clock size={16} />
                    </button>
                    <button onClick={logout} className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-900/10 flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-colors">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            <main className="px-6 py-6 space-y-8">
                {/* Buscador MD3 */}
                <motion.div 
                    animate={{ 
                        opacity: showStickySearch ? 0 : 1,
                        y: showStickySearch ? -20 : 0,
                        scale: showStickySearch ? 0.95 : 1
                    }}
                    transition={{ duration: 0.2 }}
                    className={`relative group ${showStickySearch ? 'pointer-events-none' : ''}`}
                >
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Search size={22} />
                    </div>
                    <input
                        ref={productInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={searchOnlyByCode ? "Buscar por código..." : "Buscar productos o categorías..."}
                        className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-[28px] py-5 px-14 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden xs:block">Código</span>
                            <div className="relative flex items-center">
                                <input type="checkbox" className="sr-only" checked={searchOnlyByCode} onChange={(e) => setSearchOnlyByCode(e.target.checked)} />
                                <div className={`block w-9 h-5 rounded-full transition-colors ${searchOnlyByCode ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                <div className={`absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform ${searchOnlyByCode ? 'translate-x-[16px]' : 'translate-x-0'}`}></div>
                            </div>
                        </label>
                    </div>
                </motion.div>

                {/* Carousel de Categorías Particular */}
                <CategoryCarousel 
                    categories={categories} 
                    activeCategory={categoryFilter}
                    onSelectCategory={(cat) => setCategoryFilter(cat === categoryFilter ? "ALL" : cat)}
                    allProducts={products}
                    carrito={carrito}
                    onInitialAdd={handleInitialAdd}
                    onUpdateQty={updateQty}
                    onSetQtyExact={setQtyExact}
                    onToggleBulto={toggleBulto}
                    onSelectImage={setSelectedImage}
                    carouselConfig={carouselConfig}
                    config={data?.config || {}}
                />

                {/* Filtros Rápidos de Categoría (Chips) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-slate-50 dark:border-slate-900">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`shrink-0 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                categoryFilter === cat 
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                                : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {cat === "ALL" ? "Todos" : cat}
                        </button>
                    ))}
                </div>

                {/* Banner Carrusel */}
                {carouselBanners.length > 0 && (
                    <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar">
                        {carouselBanners.map(banner => (
                            <motion.div
                                key={banner.id}
                                layout
                                onClick={() => setExpandedBanner(expandedBanner === banner.id ? null : banner.id)}
                                animate={{ width: expandedBanner === banner.id ? 300 : 160 }}
                                className={`flex-shrink-0 p-4 rounded-[28px] ${banner.color} text-white space-y-2 cursor-pointer relative min-h-[128px] h-auto flex flex-col justify-end overflow-hidden`}
                            >
                                <div className="absolute top-4 right-4 text-2xl opacity-40">{banner.icon}</div>
                                <div className="z-10">
                                    <span className="text-[10px] font-black uppercase opacity-80">{banner.title}</span>
                                    <h3 className={`text-sm font-black leading-tight ${expandedBanner === banner.id ? '' : 'line-clamp-1'}`}>{banner.subtitle}</h3>
                                    {expandedBanner === banner.id && (
                                        <p className="text-[10px] font-bold mt-2 opacity-90 leading-tight">{banner.details}</p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Descripción Contextual de Categoría */}
                {categoryFilter !== "ALL" && CATEGORY_DESCRIPTIONS[categoryFilter.toUpperCase()] && (
                    <motion.div 
                        initial={{ opacity: 0, y: -5 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="py-6 px-1 mb-6 flex flex-col gap-2 items-center text-center"
                    >
                        <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-[0.15em] leading-tight">
                            {CATEGORY_DESCRIPTIONS[categoryFilter.toUpperCase()].title}
                        </h3>
                        <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-4xl mx-auto">
                            {CATEGORY_DESCRIPTIONS[categoryFilter.toUpperCase()].desc}
                        </p>
                    </motion.div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredProducts.map((p: any) => {
                        const pid = String(p.ID_Producto);
                        const qty = carrito[pid] || 0;
                        const qtyDecant = carrito[pid + "-decant"] || 0;
                        const isBulto = !!modoBulto[pid];

                        return (
                            <ShopProductCard
                                key={pid}
                                product={p}
                                qty={qty}
                                qtyDecant={qtyDecant}
                                isBulto={isBulto}
                                onInitialAdd={handleInitialAdd}
                                onUpdateQty={updateQty}
                                onSetQtyExact={setQtyExact}
                                onToggleBulto={toggleBulto}
                                onSelectImage={setSelectedImage}
                            />
                        );
                    })}
                </div>
            </main>

            {/* Footer Premium */}
            <footer className="mt-auto border-t border-slate-100/50 dark:border-slate-800/50 bg-white/45 dark:bg-slate-900/45 backdrop-blur-md py-12 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left space-y-2">
                        <h3 className="text-sm font-black tracking-tight text-slate-800 dark:text-slate-100 uppercase">
                            {config.EMPRESA || "WANDA DISTRIBUCIONES"}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {config.APP_TAGLINE || "Online Tendence"}
                        </p>
                        {(config.REMITO_DIRECCION || config.REMITO_TELEFONO) && (
                            <div className="text-[10px] text-slate-500 font-medium space-y-0.5 mt-2">
                                {config.REMITO_DIRECCION && <p>📍 {config.REMITO_DIRECCION}</p>}
                                {config.REMITO_TELEFONO && <p>📞 {config.REMITO_TELEFONO}</p>}
                            </div>
                        )}
                    </div>

                    {/* Enlaces de Redes Sociales */}
                    {(config.SOCIAL_INSTAGRAM || config.SOCIAL_FACEBOOK || config.SOCIAL_TIKTOK) && (
                        <div className="flex items-center gap-4">
                            {config.SOCIAL_INSTAGRAM && (
                                <a
                                    href={config.SOCIAL_INSTAGRAM}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-pink-500 hover:text-white dark:hover:bg-pink-600 dark:hover:text-white transition-all hover:scale-110 active:scale-95"
                                    title="Instagram"
                                >
                                    <Instagram size={18} />
                                </a>
                            )}
                            {config.SOCIAL_FACEBOOK && (
                                <a
                                    href={config.SOCIAL_FACEBOOK}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all hover:scale-110 active:scale-95"
                                    title="Facebook"
                                >
                                    <Facebook size={18} />
                                </a>
                            )}
                            {config.SOCIAL_TIKTOK && (
                                <a
                                    href={config.SOCIAL_TIKTOK}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-black dark:hover:text-white transition-all hover:scale-110 active:scale-95"
                                    title="TikTok"
                                >
                                    <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current">
                                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.74-3.95-1.72-.01 2.92 0 5.85-.01 8.78-.02 1.75-.46 3.48-1.45 4.91-1.24 1.8-3.36 2.92-5.54 3.02-2.33.11-4.71-.78-6.13-2.65-1.53-2.02-1.74-4.9-1.02-7.27.76-2.52 2.92-4.52 5.54-4.96v4.09c-1.25.2-2.43 1.05-2.88 2.25-.49 1.3-.19 2.86.74 3.84 1.01 1.06 2.72 1.34 3.99.65 1.02-.55 1.62-1.62 1.63-2.78-.01-5.18-.01-10.36-.02-15.54z"/>
                                    </svg>
                                </a>
                            )}
                        </div>
                    )}
                </div>
                <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-slate-100/50 dark:border-slate-800/50 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        &copy; {new Date().getFullYear()} {config.EMPRESA || "WANDA DISTRIBUCIONES"}. Todos los derechos reservados.
                    </p>
                </div>
            </footer>
            
            {/* WhatsApp Floating Button */}
            {config.CONTACT_WHATSAPP && (
                <div
                    className="fixed right-6 z-40 flex items-center justify-center"
                    style={{
                        bottom: `${cartCount > 0 ? (viewportOffset > 0 ? viewportOffset + 68 : 108) : (viewportOffset > 0 ? Math.max(12, viewportOffset - 16) : 24)}px`,
                        transition: 'bottom 0.15s cubic-bezier(0.1, 0.8, 0.3, 1)'
                    }}
                >
                    <button
                        onClick={() => {
                            const waVal = config.CONTACT_WHATSAPP;
                            if (waVal.startsWith('http')) {
                                window.open(waVal, '_blank', 'noopener,noreferrer');
                            } else {
                                const cleaned = waVal.replace(/[^0-9]/g, '');
                                window.open(`https://wa.me/${cleaned}?text=Hola!%20Quisiera%20hacer%20una%20consulta.`, '_blank', 'noopener,noreferrer');
                            }
                        }}
                        className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/20 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        title="Contacto directo por WhatsApp"
                    >
                        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Cart Floating Button */}
            <AnimatePresence>
                {cartCount > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed left-6 right-6 z-50"
                        style={{
                            bottom: `${viewportOffset > 0 ? Math.max(12, viewportOffset - 16) : 24}px`,
                            transition: 'bottom 0.15s cubic-bezier(0.1, 0.8, 0.3, 1)'
                        }}
                    >
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-5 rounded-[32px] flex items-center justify-between px-8 shadow-2xl"
                        >
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <ShoppingBag size={24} />
                                    <span className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest">Mi Carrito</span>
                            </div>
                            <span className="text-xl font-black">${cartTotal.toLocaleString()}</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart Modal */}
            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="fixed inset-x-0 bottom-0 bg-white dark:bg-slate-900 rounded-t-[40px] z-[70] h-[95vh] md:h-[90vh] flex flex-col p-6 md:p-8"
                        >
                            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                                    <ShoppingCart size={28} className="text-indigo-500" /> Tu Pedido
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button onClick={emptyCart} title="Vaciar Carrito" className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"><Trash2 size={24} /></button>
                                    <button onClick={() => setIsCartOpen(false)} className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><X size={24} /></button>
                                </div>
                            </div>

                            {/* Cuerpo del Modal (Grid responsivo) */}
                            <div className="flex-1 overflow-y-auto md:overflow-hidden md:grid md:grid-cols-12 md:gap-8 pb-6 min-h-0">
                                
                                {/* Columna de Productos */}
                                <div className="md:col-span-7 flex flex-col md:overflow-hidden mb-6 md:mb-0 min-h-0">
                                    <h3 className="text-xs font-black uppercase text-slate-450 dark:text-slate-400 tracking-widest mb-4">Productos en tu carrito</h3>
                                    <div className="flex-1 md:overflow-y-auto space-y-4 md:pr-4">
                                        {Object.entries(carrito).map(([id, qty]) => {
                                            const isDecant = id.endsWith("-decant");
                                            const baseId = isDecant ? id.replace("-decant", "") : id;
                                            const p = products.find(prod => String(prod.ID_Producto) === baseId);
                                            if (!p) return null;

                                            const isB = isDecant ? false : !!modoBulto[id];
                                            const isKg = isDecant ? false : (p?.Unidad || "").toLowerCase() === 'kg';
                                            const pr = isDecant 
                                                ? parseFloat(String(p?.Precio_Decant || "0").replace(',', '.'))
                                                : parseFloat(String(p?.Precio_Unitario || "0").replace(',', '.'));
                                            const pe = parseFloat(String(p?.Peso_Promedio || "1").replace(',', '.'));
                                            const ub = parseFloat(String(p?.Unidades_Bulto || "1").replace(',', '.'));

                                            const piecePrice = isKg ? pr * pe : pr;
                                            const finalItemPrice = isB ? piecePrice * ub : piecePrice;

                                            return (
                                                <div key={id} className="bg-slate-50 dark:bg-slate-800 p-5 rounded-[28px] flex flex-col gap-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 bg-white dark:bg-slate-700 rounded-2xl overflow-hidden flex-shrink-0">
                                                                {p.Imagen_URL && <img src={getImageUrl(p.Imagen_URL) || ""} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                                                            </div>
                                                            <div>
                                                                <h3 className="text-sm font-black leading-tight text-slate-800 dark:text-white">
                                                                    {p.Nombre} {isDecant && <span className="text-amber-500 font-bold">({p.Volumen_Decant || '10ml'})</span>}
                                                                </h3>
                                                                <div className="flex flex-col mt-0.5">
                                                                    <span className="text-[10px] font-bold text-slate-400">
                                                                        Precio: ${finalItemPrice.toLocaleString()} {isDecant ? 'Decant' : (isB ? 'Bulto' : (isKg ? 'Pieza' : 'Unid.'))}
                                                                    </span>
                                                                    <div className="flex items-center gap-3 mt-1.5">
                                                                        <div className="flex items-center gap-2 bg-white dark:bg-slate-700 rounded-full px-2 py-1 shadow-sm border border-slate-100 dark:border-slate-600">
                                                                            <button onClick={() => updateQty(id, -1)} className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500">-</button>
                                                                            <input type="number" min="0" value={qty || ""} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) setQtyExact(id, v); else setQtyExact(id, 0); }} className="w-8 text-center text-[10px] font-black bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-500/50 rounded" onFocus={(e) => e.target.select()} />
                                                                            <button onClick={() => updateQty(id, 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-500">+</button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Subtotal</div>
                                                            <div className="text-lg font-black text-indigo-500 leading-tight">${(finalItemPrice * qty).toLocaleString()}</div>
                                                            <button onClick={() => setCarrito(prev => { const n = { ...prev }; delete n[id]; return n; })} className="text-rose-500 p-1 mt-1"><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                    {ub > 1 && !isDecant && (
                                                        <div className="flex bg-white dark:bg-slate-700/50 p-1 rounded-2xl self-end">
                                                            <button
                                                                onClick={() => isB && toggleBulto(id)}
                                                                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${!isB ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                                            >
                                                                {isKg ? 'Pieza' : 'Unidad'}
                                                            </button>
                                                            <button
                                                                onClick={() => !isB && toggleBulto(id)}
                                                                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${isB ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400'}`}
                                                            >
                                                                Bulto
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Columna de Datos de Envío y Pago (Checkout) */}
                                <div className="md:col-span-5 flex flex-col md:overflow-y-auto md:border-l md:border-slate-100 md:dark:border-slate-800 md:pl-8 space-y-6 md:pr-2 min-h-0">
                                    <h3 className="text-xs font-black uppercase text-slate-450 dark:text-slate-400 tracking-widest hidden md:block mb-1">Detalles del Pedido</h3>
                                    
                                    {/* Acordeón Datos de Envío */}
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-[28px] overflow-hidden">
                                        <button
                                            onClick={() => setIsDeliveryFormOpen(!isDeliveryFormOpen)}
                                            className="w-full p-5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                                    <MapPin size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-xs font-black uppercase text-indigo-500 tracking-widest">Datos de Entrega</h3>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                                        {(checkoutData.telefono && checkoutData.direccion) ? '✅ Información completa' : '⚠️ Pendiente de completar'}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronDown
                                                size={20}
                                                className={`text-slate-400 transition-transform duration-300 ${isDeliveryFormOpen ? 'rotate-180' : ''}`}
                                            />
                                        </button>

                                        <AnimatePresence>
                                            {isDeliveryFormOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                                >
                                                    <div className="px-5 pb-5 pt-2 space-y-4 border-t border-slate-100 dark:border-slate-700/50">
                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Teléfono / WhatsApp</label>
                                                                <input type="tel" value={checkoutData.telefono} onChange={e => setCheckoutData({ ...checkoutData, telefono: e.target.value })} placeholder="Ej. 3764 123456" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Dirección de Entrega</label>
                                                                <input type="text" value={checkoutData.direccion} onChange={e => setCheckoutData({ ...checkoutData, direccion: e.target.value })} placeholder="Calle y Número, Barrio" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Ubicación Geográfica (GPS)</label>
                                                                <div className="flex gap-2">
                                                                    <input type="text" value={checkoutData.ubicacion} readOnly placeholder="Ubicación no establecida" className="flex-1 bg-slate-100 dark:bg-slate-900 border border-transparent rounded-xl px-4 py-3 text-sm font-bold text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap outline-none cursor-default" />
                                                                    <button onClick={handleGetLocation} disabled={isLocating} className="bg-indigo-500 text-white p-3 rounded-xl flex items-center justify-center hover:bg-indigo-600 disabled:opacity-50 min-w-[3rem] transition-colors">
                                                                        {isLocating ? <Loader2 className="animate-spin" size={20} /> : <LocateFixed size={20} />}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Módulo de Regalo Sorpresa */}
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-[28px] overflow-hidden border border-slate-100/50 dark:border-slate-700/50">
                                        <div className="p-5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-sm">
                                                    🎁
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-xs font-black uppercase text-indigo-500 tracking-widest">¿Es un regalo sorpresa?</h3>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                                        Servicio Confidencial y Exclusivo
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsRegalo(!isRegalo)}
                                                className={`w-12 h-6 rounded-full transition-all relative ${isRegalo ? 'bg-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isRegalo ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        <AnimatePresence>
                                            {isRegalo && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                                >
                                                    <div className="px-5 pb-5 pt-2 space-y-4 border-t border-slate-100 dark:border-slate-700/50 bg-indigo-500/[0.02]">
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed mb-2">
                                                            Realizaremos una entrega discreta y planificada respetando cada detalle.
                                                        </p>
                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">¿Quién lo recibe?</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={regaloNombre} 
                                                                    onChange={e => setRegaloNombre(e.target.value)} 
                                                                    placeholder="Nombre de la persona homenajeada" 
                                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors" 
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Mensaje de Dedicatoria</label>
                                                                <textarea 
                                                                    value={regaloMensaje} 
                                                                    onChange={e => setRegaloMensaje(e.target.value)} 
                                                                    placeholder="Escribe el mensaje que quieras dedicarle..." 
                                                                    rows={3}
                                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors resize-none" 
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Instrucciones de entrega discreta</label>
                                                                <textarea 
                                                                    value={regaloInstrucciones} 
                                                                    onChange={e => setRegaloInstrucciones(e.target.value)} 
                                                                    placeholder="Ej: Entregar de 15 a 17 hs. No decir que es de Wanda Essence. Llamar antes al llegar..." 
                                                                    rows={2}
                                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors resize-none" 
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Selección de Método de Pago */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                        <div className="p-4 bg-slate-100/50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                                <ShoppingCart size={18} />
                                            </div>
                                            <h3 className="text-xs font-black uppercase text-indigo-500 tracking-widest">Método de Pago</h3>
                                        </div>
                                        <div className="p-4 flex flex-col sm:flex-row gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setMetodoPago('efectivo')}
                                                className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex flex-col items-center justify-center gap-2 ${
                                                    metodoPago === 'efectivo'
                                                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                <span className="text-lg">💵</span>
                                                <span className="text-center">Efectivo / Transf.</span>
                                            </button>

                                            {config.ENABLE_MERCADOPAGO !== 'false' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setMetodoPago('mercadopago')}
                                                    className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex flex-col items-center justify-center gap-2 ${
                                                        metodoPago === 'mercadopago'
                                                            ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700'
                                                    }`}
                                                >
                                                    <span className="text-lg">💳</span>
                                                    <span className="text-center">Mercado Pago</span>
                                                </button>
                                            )}

                                            {config.ENABLE_ASTROPAY === 'true' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setMetodoPago('astropay')}
                                                    className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex flex-col items-center justify-center gap-2 ${
                                                        metodoPago === 'astropay'
                                                            ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700'
                                                    }`}
                                                >
                                                    <span className="text-lg">🪙</span>
                                                    <span className="text-center">AstroPay</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Footer del Modal (Fijo abajo) */}
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4 flex-shrink-0">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-sm font-black uppercase text-slate-400 tracking-widest">Total a pagar</span>
                                    <span className="text-4xl font-black text-slate-900 dark:text-white">${cartTotal.toLocaleString()}</span>
                                </div>
                                <button
                                    onClick={handleConfirmOrder}
                                    disabled={isSubmitting}
                                    className="w-full py-6 bg-indigo-600 dark:bg-indigo-500 text-white rounded-[28px] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-indigo-500/30 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                    {isSubmitting ? "Procesando..." : "Confirmar mi Pedido"}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Profile Sliding Panel */}
            <AnimatePresence>
                {isProfileOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProfileOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            className="fixed inset-y-0 right-0 w-full max-w-sm bg-slate-50 dark:bg-slate-950 z-[90] shadow-2xl flex flex-col"
                        >
                            <div className="p-8 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                <h2 className="text-xl font-black flex items-center gap-3"><Settings size={24} className="text-indigo-500" /> Mi Perfil</h2>
                                <button onClick={() => setIsProfileOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                <div className="flex flex-col items-center gap-4 text-center">
                                    {userInfo.photo ? (
                                        <img src={userInfo.photo} className="w-24 h-24 rounded-full border-4 border-indigo-500/20 shadow-md" alt="User" />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                            <User size={40} />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white">{userInfo.name}</h3>
                                        <p className="text-sm font-bold text-slate-400">{userInfo.email}</p>
                                    </div>
                                </div>
                                <div className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-[28px] shadow-sm border border-slate-100 dark:border-slate-800">
                                    <h3 className="text-xs font-black uppercase text-indigo-500 tracking-widest flex items-center gap-2 mb-4"><MapPin size={16} /> Mis Datos Frecuentes</h3>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Teléfono / WhatsApp</label>
                                        <input type="tel" value={checkoutData.telefono} onChange={e => {
                                            const newVal = e.target.value;
                                            setCheckoutData(prev => ({ ...prev, telefono: newVal }));
                                            localStorage.setItem("user_phone", newVal);
                                        }} placeholder="Ej. 3764 123456" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Dirección de Entrega</label>
                                        <input type="text" value={checkoutData.direccion} onChange={e => {
                                            const newVal = e.target.value;
                                            setCheckoutData(prev => ({ ...prev, direccion: newVal }));
                                            localStorage.setItem("user_address", newVal);
                                        }} placeholder="Calle y Número, Barrio" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Ubicación Geográfica (GPS)</label>
                                        <div className="flex gap-2">
                                            <input type="text" value={checkoutData.ubicacion} readOnly placeholder="Ubicación no establecida" className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap outline-none cursor-default" />
                                            <button onClick={handleGetLocation} disabled={isLocating} className="bg-indigo-500 text-white p-3 rounded-xl flex items-center justify-center hover:bg-indigo-600 disabled:opacity-50 min-w-[3rem] transition-colors">
                                                {isLocating ? <Loader2 className="animate-spin" size={20} /> : <LocateFixed size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-center font-bold mt-4 leading-relaxed">
                                        Estos datos se guardan en la nube y se usarán para autocompletar tus próximos pedidos.
                                    </p>
                                    <button
                                        onClick={saveProfileChanges}
                                        disabled={isSubmitting}
                                        className="w-full mt-4 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                                    >
                                        {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* History Sliding Panel */}
            <AnimatePresence>
                {isHistoryOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsHistoryOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            className="fixed inset-y-0 right-0 w-full max-w-sm bg-slate-50 dark:bg-slate-950 z-[90] shadow-2xl flex flex-col"
                        >
                            <div className="p-8 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                <h2 className="text-xl font-black flex items-center gap-3"><Clock size={24} className="text-indigo-500" /> Mis Pedidos</h2>
                                <button onClick={() => setIsHistoryOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {combinedHistory.length === 0 && (
                                    <div className="text-center py-20 opacity-30">
                                        <ShoppingBag size={48} className="mx-auto mb-4" />
                                        <p className="text-sm font-bold">No tienes pedidos aún</p>
                                    </div>
                                )}
                                {combinedHistory.map((h: any, i: number) => (
                                    <div key={h.id || i} className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {new Date(h.fecha).toLocaleString()}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {h.isOffline && (
                                                    <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                                        <Clock size={8} /> Pendiente Sincro
                                                    </span>
                                                )}
                                                <span className="bg-emerald-100 text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                                                    {h.isOffline ? 'Guardado Local' : 'Recibido'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-1 mb-4">
                                            {h.items.map((it: any, j: number) => (
                                                <div key={j} className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex justify-between">
                                                    <span>{it.nombre} x{it.cantidad}</span>
                                                    <span>${it.subtotal.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                            <span className="text-sm font-black text-indigo-600">Total: ${h.total.toLocaleString()}</span>
                                            <button onClick={() => {
                                                const text = `Hola! Soy ${userInfo.name}. Acabo de realizar un pedido online de $${h.total.toLocaleString()}.\n\nDetalle:\n${h.items.map((it: any) => `- ${it.nombre} (x${it.cantidad}): $${it.subtotal}`).join('\n')}`;
                                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
                                            }} className="p-3 bg-emerald-500 text-white rounded-2xl"><MessageCircle size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Subcomponent: Image View */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedImage(null)} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} src={getImageUrl(selectedImage) || ""} className="max-w-full max-h-full rounded-3xl" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Loader2({ className, size }: { className?: string, size?: number }) {
    return <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className={className}><Clock size={size} /></motion.div>;
}
