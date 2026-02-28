"use client";

import { useState, useMemo, useEffect, useRef, useDeferredValue } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    ShoppingCart,
    User,
    Clock,
    Plus,
    Mic,
    X,
    ChevronUp,
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
    LocateFixed
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { wandaApi } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function TiendaOnlinePage() {
    const { data } = useData();
    const router = useRouter();
    const products: any[] = useMemo(() => {
        let prods = data?.products || [];
        const config = data?.config || {};
        const hideLowPrice = config.HIDE_LOW_PRICE === 'true' || config.HIDE_LOW_PRICE === true;
        const hideNoStock = config.HIDE_NO_STOCK === 'true' || config.HIDE_NO_STOCK === true;

        if (hideLowPrice) prods = prods.filter((p: any) => parseFloat(p.Precio_Unitario || 0) >= 1);
        if (hideNoStock) prods = prods.filter((p: any) => parseFloat(p.Stock_Actual || 0) > 0);
        return prods;
    }, [data]);

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
    const [expandedBanner, setExpandedBanner] = useState<string | null>(null);
    const productInputRef = useRef<HTMLInputElement>(null);

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
        if (role !== "cliente") {
            router.push("/login");
            return;
        }

        setUserInfo({
            name: localStorage.getItem("user_name") || "Cliente Online",
            email: localStorage.getItem("user_email") || "",
            photo: localStorage.getItem("user_photo") || ""
        });

        setCheckoutData({
            telefono: localStorage.getItem("user_phone") || "",
            direccion: localStorage.getItem("user_address") || "",
            ubicacion: localStorage.getItem("user_location") || ""
        });

        const savedHistory = localStorage.getItem("order_history_online");
        if (savedHistory) setHistory(JSON.parse(savedHistory));
    }, []);

    const carouselBanners = useMemo(() => {
        const banners = [];
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

        if (banners.length === 0) {
            banners.push({
                id: 'welcome',
                type: 'info',
                title: 'Wanda Store',
                subtitle: '¡Bienvenido!',
                icon: '🛍️',
                color: 'bg-indigo-500',
                details: 'Explora nuestros productos y realiza tu pedido online.'
            });
        }
        return banners;
    }, [data, products]);

    const normalizeText = (text: string) => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const smartSearch = (text: string, query: string) => {
        if (!query) return true;
        const normText = normalizeText(text);
        const terms = normalizeText(query).split(/\s+/).filter(t => t.length > 0);
        return terms.every(t => normText.includes(t));
    };

    const filteredProducts = useMemo(() => {
        if (!deferredSearchTerm) return products;
        return products.filter(p => {
            const searchPayload = `${p.Nombre} ${p.Categoria || ''} ${p.Nota_Oferta || ''}`;
            return smartSearch(searchPayload, deferredSearchTerm);
        });
    }, [products, deferredSearchTerm]);

    const addToCart = (id: string, qty: number = 1) => {
        setCarrito(prev => ({ ...prev, [id]: (prev[id] || 0) + qty }));
    };

    const toggleBulto = (id: string) => {
        setModoBulto(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const cartCount = Object.values(carrito).reduce((a, b) => a + b, 0);

    const cartTotal = useMemo(() => {
        return Object.entries(carrito).reduce((acc, [id, qty]) => {
            const p = products.find(prod => String(prod.ID_Producto) === id);
            if (!p) return acc;

            const isKg = (p.Unidad || "").toLowerCase() === 'kg';
            const isBulto = !!modoBulto[id];

            const pureUnitPrice = parseFloat(String(p.Precio_Unitario || "0").replace(',', '.'));
            const avgWeight = parseFloat(String(p.Peso_Promedio || "1").replace(',', '.'));
            const unitsPerBulk = parseFloat(String(p.Unidades_Bulto || "1").replace(',', '.'));

            const piecePrice = isKg ? pureUnitPrice * avgWeight : pureUnitPrice;
            const finalPrice = isBulto ? piecePrice * unitsPerBulk : piecePrice;

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

        // Guardar para futuros pedidos
        localStorage.setItem("user_phone", checkoutData.telefono);
        localStorage.setItem("user_address", checkoutData.direccion);
        localStorage.setItem("user_location", checkoutData.ubicacion);

        const orderData = {
            cliente: {
                ID_Cliente: "ONLINE",
                Nombre_Negocio: userInfo.name,
                Email: userInfo.email,
                Telefono: checkoutData.telefono,
                Direccion: checkoutData.direccion,
                Ubicacion: checkoutData.ubicacion,
                Es_Online: true
            },
            items: Object.entries(carrito).map(([id, qty]) => {
                const p = products.find(prod => String(prod.ID_Producto) === id);
                const isB = !!modoBulto[id];
                const isKg = (p?.Unidad || "").toLowerCase() === 'kg';

                const pr = parseFloat(String(p?.Precio_Unitario || "0").replace(',', '.'));
                const pe = parseFloat(String(p?.Peso_Promedio || "1").replace(',', '.'));
                const ub = parseFloat(String(p?.Unidades_Bulto || "1").replace(',', '.'));

                const piecePrice = isKg ? pr * pe : pr;
                const finalItemPrice = isB ? piecePrice * ub : piecePrice;
                const subtotal = finalItemPrice * qty;

                let desc = "";
                if (isB) {
                    desc = `${qty} Bulto${qty > 1 ? 's' : ''} (${ub}u)`;
                } else if (isKg) {
                    desc = `${qty} Pieza${qty > 1 ? 's' : ''} (~${pe}kg)`;
                } else {
                    desc = `${qty} Unidad${qty > 1 ? 'es' : ''}`;
                }

                return {
                    id_producto: id,
                    nombre: p?.Nombre,
                    cantidad: qty,
                    precio: finalItemPrice,
                    subtotal: subtotal,
                    descripcion: desc,
                    esBulto: isB
                };
            }),
            total: cartTotal,
            vendedor: "Venta Online",
            notas: "Pedido realizado desde la tienda online",
            id_interno: Date.now().toString()
        };

        try {
            const res = await wandaApi.submitOrder(orderData);
            if (res.error) throw new Error(res.error);

            // Guardar en historial local
            const newHistory = [{ ...orderData, fechaLocal: new Date().toLocaleString() }, ...history];
            setHistory(newHistory);
            localStorage.setItem("order_history_online", JSON.stringify(newHistory.slice(0, 50)));

            setCarrito({});
            setIsCartOpen(false);
            alert("¡Pedido enviado con éxito!");
        } catch (err) {
            console.error(err);
            alert("Error al enviar el pedido. Por favor intenta de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const logout = () => {
        localStorage.clear();
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans pb-24 transition-colors">
            {/* Header Rediseñado */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    {userInfo.photo ? (
                        <img src={userInfo.photo} className="w-10 h-10 rounded-full border-2 border-indigo-500/20 shadow-sm" alt="User" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <User size={20} />
                        </div>
                    )}
                    <div>
                        <h1 className="text-sm font-black text-slate-800 dark:text-white leading-none mb-1">{userInfo.name}</h1>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tienda Online</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsProfileOpen(true)} className="w-11 h-11 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-500 transition-colors">
                        <Settings size={20} />
                    </button>
                    <button onClick={() => setIsHistoryOpen(true)} className="w-11 h-11 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        <Clock size={20} />
                    </button>
                    <button onClick={logout} className="w-11 h-11 rounded-full bg-rose-50 dark:bg-rose-900/10 flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            <main className="px-6 py-6 space-y-8">
                {/* Buscador MD3 */}
                <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Search size={22} />
                    </div>
                    <input
                        ref={productInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar productos o categorías..."
                        className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-[28px] py-5 px-14 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                </div>

                {/* Banner Carrusel */}
                <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar">
                    {carouselBanners.map(banner => (
                        <motion.div
                            key={banner.id}
                            layout
                            onClick={() => setExpandedBanner(expandedBanner === banner.id ? null : banner.id)}
                            animate={{ width: expandedBanner === banner.id ? 280 : 160 }}
                            className={`flex-shrink-0 p-4 rounded-[28px] ${banner.color} text-white space-y-2 cursor-pointer relative overflow-hidden h-32 flex flex-col justify-end`}
                        >
                            <div className="absolute top-4 right-4 text-2xl opacity-40">{banner.icon}</div>
                            <div className="z-10">
                                <span className="text-[10px] font-black uppercase opacity-80">{banner.title}</span>
                                <h3 className="text-sm font-black leading-tight line-clamp-1">{banner.subtitle}</h3>
                                {expandedBanner === banner.id && (
                                    <p className="text-[10px] font-bold mt-2 opacity-90 leading-tight">{banner.details}</p>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredProducts.map((p: any) => {
                        const pid = String(p.ID_Producto);
                        const qty = carrito[pid] || 0;
                        const isBulto = !!modoBulto[pid];
                        const isKg = (p.Unidad || "").toLowerCase() === 'kg';

                        const pureUnitPrice = parseFloat(String(p.Precio_Unitario || "0").replace(',', '.'));
                        const avgWeight = parseFloat(String(p.Peso_Promedio || "1").replace(',', '.'));
                        const unitsPerBulk = parseFloat(String(p.Unidades_Bulto || "1").replace(',', '.'));

                        const piecePrice = isKg ? pureUnitPrice * avgWeight : pureUnitPrice;
                        const finalPrice = isBulto ? piecePrice * unitsPerBulk : piecePrice;
                        const unitLabel = isKg ? "Pieza" : "Unid.";

                        return (
                            <motion.div
                                key={pid}
                                layout
                                className={`bg-white dark:bg-slate-900 rounded-[32px] p-4 border transition-all duration-300 shadow-xl shadow-black/5 flex flex-col ${qty > 0 ? 'border-indigo-200 dark:border-indigo-500/30' : 'border-slate-100 dark:border-slate-800'}`}
                            >
                                <div
                                    className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden cursor-pointer relative group"
                                    onClick={() => p.Imagen_URL && setSelectedImage(p.Imagen_URL)}
                                >
                                    {p.Imagen_URL ? (
                                        <img src={p.Imagen_URL} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.Nombre} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={32} /></div>
                                    )}
                                    {(p.Es_Oferta === true || p.es_oferta === true) && (
                                        <div className="absolute top-2 right-2 bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg">OFERTA</div>
                                    )}
                                    {isKg && (
                                        <div className="absolute top-2 left-2 bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg">PESABLE</div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-1 mt-3">
                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{p.Categoria}</span>
                                    <h4 className="text-xs font-black text-slate-800 dark:text-white line-clamp-2 leading-tight h-8">{p.Nombre}</h4>

                                    <div className="flex flex-col">
                                        <div className="text-lg font-black text-slate-900 dark:text-white">${finalPrice.toLocaleString()}</div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                                            {isBulto ? `Bulto (${unitsPerBulk}u)` : (isKg ? `Pieza (~${avgWeight}kg)` : 'Unidad')}
                                        </span>
                                    </div>
                                </div>

                                {unitsPerBulk > 1 && (
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl gap-0.5 my-2">
                                        <button
                                            onClick={() => isBulto && toggleBulto(pid)}
                                            className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${!isBulto ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            {unitLabel}
                                        </button>
                                        <button
                                            onClick={() => !isBulto && toggleBulto(pid)}
                                            className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${isBulto ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400'}`}
                                        >
                                            Bulto
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={() => addToCart(pid)}
                                    className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 mt-auto ${qty > 0 ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white'}`}
                                >
                                    {qty > 0 ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                                    <span className="text-[10px] font-black uppercase tracking-widest">{qty > 0 ? `En Carrito (${qty})` : 'Comprar'}</span>
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            </main>

            {/* Cart Floating Button */}
            <AnimatePresence>
                {cartCount > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-6 right-6 z-50"
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
                            className="fixed inset-x-0 bottom-0 bg-white dark:bg-slate-900 rounded-t-[40px] z-[70] max-h-[90vh] flex flex-col p-8"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                                    <ShoppingCart size={28} className="text-indigo-500" /> Confirmar Pedido
                                </h2>
                                <button onClick={() => setIsCartOpen(false)} className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><X size={24} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pb-8">
                                {Object.entries(carrito).map(([id, qty]) => {
                                    const p = products.find(prod => String(prod.ID_Producto) === id);
                                    if (!p) return null;

                                    const isB = !!modoBulto[id];
                                    const isKg = (p?.Unidad || "").toLowerCase() === 'kg';
                                    const pr = parseFloat(String(p?.Precio_Unitario || "0").replace(',', '.'));
                                    const pe = parseFloat(String(p?.Peso_Promedio || "1").replace(',', '.'));
                                    const ub = parseFloat(String(p?.Unidades_Bulto || "1").replace(',', '.'));

                                    const piecePrice = isKg ? pr * pe : pr;
                                    const finalItemPrice = isB ? piecePrice * ub : piecePrice;

                                    return (
                                        <div key={id} className="bg-slate-50 dark:bg-slate-800 p-5 rounded-[28px] flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-white dark:bg-slate-700 rounded-2xl overflow-hidden flex-shrink-0">
                                                    {p.Imagen_URL && <img src={p.Imagen_URL} className="w-full h-full object-cover" />}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black leading-tight text-slate-800 dark:text-white">{p.Nombre}</h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <div className="flex items-center gap-2 bg-white dark:bg-slate-700 rounded-full px-2 py-1 shadow-sm border border-slate-100 dark:border-slate-600">
                                                            <button onClick={() => setCarrito(prev => {
                                                                const newVal = Math.max(0, prev[id] - 1);
                                                                if (newVal === 0) {
                                                                    const { [id]: _, ...rest } = prev;
                                                                    return rest;
                                                                }
                                                                return { ...prev, [id]: newVal };
                                                            })} className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400">-</button>
                                                            <span className="text-[10px] font-black w-4 text-center">{qty}</span>
                                                            <button onClick={() => setCarrito(prev => ({ ...prev, [id]: prev[id] + 1 }))} className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400">+</button>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                            {isB ? 'Bulto' : (isKg ? 'Pieza' : 'Unid.')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black text-indigo-500">${(finalItemPrice * qty).toLocaleString()}</div>
                                                <button onClick={() => setCarrito(prev => { const n = { ...prev }; delete n[id]; return n; })} className="text-rose-500 p-1"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
                                {/* Datos de envío */}
                                <div className="space-y-4 bg-slate-50 dark:bg-slate-800 p-5 rounded-[28px]">
                                    <h3 className="text-xs font-black uppercase text-indigo-500 tracking-widest flex items-center gap-2 mb-4"><MapPin size={16} /> Datos de Entrega</h3>

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
                                        Estos datos se guardan en tu dispositivo y se usarán para autocompletar tus próximos pedidos.
                                    </p>
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
                                {history.map((h, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h.fechaLocal}</span>
                                            <span className="bg-emerald-100 text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Enviado</span>
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
                        <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} src={selectedImage} className="max-w-full max-h-full rounded-3xl" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Loader2({ className, size }: { className?: string, size?: number }) {
    return <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className={className}><Clock size={size} /></motion.div>;
}
