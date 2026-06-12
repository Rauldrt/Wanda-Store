import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronRight, Star, MapPin, Play, Pause, X, Send, Monitor, Smartphone, MonitorSmartphone, Layers, Tag, Box, ShoppingBag, ArrowRight, Sparkles, Gift, ShieldCheck, Heart, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShopProductCard } from './ShopProductCard';

interface CategoryItem {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  product?: any;
}

const DEFAULT_CATEGORY_IMAGES: { [key: string]: string } = {
  "Almacén": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000",
  "Bebidas": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&q=80&w=1000",
  "Limpieza": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1000",
  "Perfumería": "https://images.unsplash.com/photo-1616948648211-0969542a7422?auto=format&fit=crop&q=80&w=1000",
  "Frutas y Verduras": "https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&q=80&w=1000",
  "Carnicería": "https://images.unsplash.com/photo-1607623273573-2a9d72f53225?auto=format&fit=crop&q=80&w=1000",
  "Lácteos": "https://images.unsplash.com/photo-1550583724-1255818c0533?auto=format&fit=crop&q=80&w=1000",
  "Fiambrería": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=1000",
  "Panadería": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1000",
};

const GENERIC_IMAGE = "https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=1000";

interface CategoryCarouselProps {
  categories: string[];
  onSelectCategory: (category: string) => void;
  activeCategory: string;
  // Props para el modal de productos
  allProducts: any[];
  carrito: any;
  onInitialAdd: (id: string) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onSetQtyExact: (id: string, qty: number) => void;
  onToggleBulto: (id: string) => void;
  onSelectImage: (url: string) => void;
  carouselConfig?: any[];
  config?: any;
}

export default function CategoryCarousel({ 
  categories, 
  onSelectCategory, 
  activeCategory,
  allProducts,
  carrito,
  onInitialAdd,
  onUpdateQty,
  onSetQtyExact,
  onToggleBulto,
  onSelectImage,
  carouselConfig,
  config = {}
}: CategoryCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedModalCategory, setSelectedModalCategory] = useState<CategoryItem | null>(null);
  
  const actualOrientation = 'horizontal';

  const touchStart = useRef({ x: 0, y: 0 });
  const touchEnd = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const minSwipeDistance = 40;

  const carouselItems = useMemo(() => {
    // Si el modo es características/valor agregado
    if (config.CAROUSEL_MODE === 'features') {
      const customFeaturesRaw = config.SYSTEM_CAROUSEL_FEATURES;
      if (customFeaturesRaw) {
        try {
          const parsed = JSON.parse(customFeaturesRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter((item: any) => item.active).map((item: any) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              image: item.image || GENERIC_IMAGE,
              category: item.category,
              details: item.details || item.description,
              type: 'feature'
            }));
          }
        } catch (e) {
          console.error("Error parsing carousel features", e);
        }
      }
      return [
        {
          id: 'feat-arabes',
          title: 'Perfumes Árabes',
          description: 'Aromas intensos y de gran duración inspirados en Oriente.',
          image: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=1000',
          category: 'features_arabes',
          type: 'feature',
          details: 'Los perfumes árabes son tendencia mundial por su fijación extrema y estela única (vainilla, oud, flores y maderas preciosas).'
        },
        {
          id: 'feat-decants',
          title: 'Decants de 10ml',
          description: 'Tu perfume favorito en formato práctico y económico.',
          image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=1000',
          category: 'features_decants',
          type: 'feature',
          details: 'Los decants son versiones fraccionadas del frasco original. Ideales para llevar en el bolso, probar nuevos aromas o usar a diario sin gastar de más.'
        },
        {
          id: 'feat-armado',
          title: 'Cómo lo armamos',
          description: 'Extracción estéril y directa para conservar el 100% de la pureza.',
          image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=1000',
          category: 'features_armado',
          type: 'feature',
          details: 'Utilizamos jeringas exclusivas adaptadas para cada perfume, trasvasando el líquido de forma directa sin alterar la composición ni la estela original.'
        },
        {
          id: 'feat-exclusivo',
          title: 'Servicio Sorpresa',
          description: 'Entregas discretas y planificadas si tu compra es para regalar.',
          image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=1000',
          category: 'features_exclusivo',
          type: 'feature',
          details: 'Nos encargamos de que la experiencia sea perfecta. Coordinamos fecha, hora y dedicatoria personalizada para sorprender a quien más quieras.'
        },
        {
          id: 'feat-comunidad',
          title: 'Grupo Exclusivo',
          description: 'Unite a nuestra comunidad de WhatsApp para ofertas flash.',
          image: 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?auto=format&fit=crop&q=80&w=1000',
          category: 'features_comunidad',
          type: 'feature',
          details: 'Participá de liquidaciones flash, enterate de los ingresos antes que nadie y chateá directamente con asesoras de fragancias.'
        }
      ];
    }

    // Si el modo es productos destacados
    if (config.CAROUSEL_MODE === 'featured') {
      const featured = allProducts.filter(p => p.Destacado === true || p.Destacado === 'true');
      return featured.map((p: any) => ({
        id: p.id || p.ID_Producto,
        title: p.Nombre,
        description: p.Descripcion || `Precio: $${p.Precio_Unitario}`,
        image: p.Imagen_URL || GENERIC_IMAGE,
        category: p.Categoria || 'Destacado',
        product: p
      }));
    }

    // Si hay configuración dinámica y tiene items activos, usarlos
    if (carouselConfig && carouselConfig.length > 0) {
      const activeItems = carouselConfig.filter((item: any) => item.active);
      if (activeItems.length > 0) {
        return activeItems.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          image: item.image || (DEFAULT_CATEGORY_IMAGES[item.category] || GENERIC_IMAGE),
          category: item.category
        }));
      }
    }

    // Fallback al comportamiento por defecto (categorías existentes)
    return categories
      .filter(cat => cat !== "ALL")
      .map((cat, index) => ({
        id: `cat-${index}`,
        title: cat,
        description: `Explora nuestra selección premium de ${cat.toLowerCase()}.`,
        image: DEFAULT_CATEGORY_IMAGES[cat] || GENERIC_IMAGE,
        category: cat
      }));
  }, [categories, carouselConfig, config.CAROUSEL_MODE, allProducts]);

  const nextSlide = useCallback(() => {
    if (carouselItems.length === 0) return;
    setActiveIndex((prev) => (prev === carouselItems.length - 1 ? 0 : prev + 1));
  }, [carouselItems.length]);

  const prevSlide = useCallback(() => {
    if (carouselItems.length === 0) return;
    setActiveIndex((prev) => (prev === 0 ? carouselItems.length - 1 : prev - 1));
  }, [carouselItems.length]);

  const handleStart = (e: any) => {
    if (selectedModalCategory) return;
    isDragging.current = false;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    touchStart.current = { x: clientX, y: clientY };
    touchEnd.current = { x: clientX, y: clientY };
  };

  const handleMove = (e: any) => {
    if (selectedModalCategory) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    touchEnd.current = { x: clientX, y: clientY };

    if (Math.abs(touchStart.current.x - clientX) > 10 || Math.abs(touchStart.current.y - clientY) > 10) {
      isDragging.current = true;
    }
  };

  const handleEnd = () => {
    if (selectedModalCategory) return;
    const distX = touchStart.current.x - touchEnd.current.x;
    if (Math.abs(distX) > minSwipeDistance) distX > 0 ? nextSlide() : prevSlide();
  };

  useEffect(() => {
    if (isPaused || selectedModalCategory || carouselItems.length === 0) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide, activeIndex, selectedModalCategory, carouselItems.length]);

  // Filtrar productos para el modal
  const modalProducts = useMemo(() => {
    if (!selectedModalCategory) return [];
    if (config.CAROUSEL_MODE === 'featured') {
      return [selectedModalCategory.product].filter(Boolean);
    }
    if (selectedModalCategory.category === 'ALL') return allProducts;
    return allProducts.filter(p => p.Categoria === selectedModalCategory.category);
  }, [selectedModalCategory, allProducts, config.CAROUSEL_MODE]);

  const renderFeatureContent = (item: any) => {
    const { id, title, description, details, category } = item;

    if (id === 'feat-arabes') {
      const arabicProducts = allProducts.filter((p: any) => 
        p.Nombre?.toLowerCase().includes('árabe') || 
        p.Nombre?.toLowerCase().includes('arabe') || 
        p.Descripcion?.toLowerCase().includes('árabe') ||
        p.Descripcion?.toLowerCase().includes('arabe') ||
        p.Nombre?.toLowerCase().includes('lattafa') ||
        p.Nombre?.toLowerCase().includes('armaf') ||
        p.Nombre?.toLowerCase().includes('haramein') ||
        p.Nombre?.toLowerCase().includes('afnan') ||
        p.Nombre?.toLowerCase().includes('al haramain')
      );

      return (
        <div className="space-y-6">
          <div className="p-6 bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-500/5 dark:to-amber-950/20 border border-amber-500/10 rounded-[32px] space-y-4 text-left">
            <h4 className="text-base font-black text-amber-600 dark:text-amber-400 flex items-center gap-2 uppercase tracking-wide">
              <Sparkles size={18} /> El Secreto de las Fragancias Orientales
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Los perfumes árabes son reconocidos mundialmente por sus aromas intensos, elegantes y de <strong>larga duración</strong>. Se elaboran con ingredientes nobles como el <em>Oud</em> (madera resinosa preciosa), el almizcle, el sándalo, ámbar y notas de vainilla. Al estar altamente concentrados, se fijan profundamente en la piel, creando una estela inconfundible que te acompañará todo el día.
            </p>
          </div>

          <div className="space-y-4 text-left">
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              ✨ Fragancias Árabes Disponibles ({arabicProducts.length})
            </h4>

            {arabicProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {arabicProducts.map(p => {
                  const pid = String(p.ID_Producto);
                  const itemCarrito = carrito[pid];
                  const qty = itemCarrito?.cantidad || 0;
                  const isBulto = itemCarrito?.modoBulto || false;

                  return (
                    <ShopProductCard 
                      key={pid}
                      product={p}
                      qty={qty}
                      isBulto={isBulto}
                      onInitialAdd={onInitialAdd}
                      onUpdateQty={onUpdateQty}
                      onSetQtyExact={onSetQtyExact}
                      onToggleBulto={onToggleBulto}
                      onSelectImage={onSelectImage}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-[28px] border border-dashed dark:border-slate-800 space-y-3">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No se encontraron productos árabes etiquetados en el catálogo</p>
                <button
                  onClick={() => {
                    onSelectCategory("Perfumería");
                    setSelectedModalCategory(null);
                  }}
                  className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto"
                >
                  Ver Toda la Perfumería <ArrowRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (id === 'feat-decants') {
      const decantProducts = allProducts.filter((p: any) => 
        p.Nombre?.toLowerCase().includes('decant') ||
        p.Descripcion?.toLowerCase().includes('decant') ||
        p.Categoria?.toLowerCase().includes('perfumería') ||
        p.Categoria?.toLowerCase().includes('perfumeria')
      ).slice(0, 4);

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-[28px] space-y-2">
              <span className="text-xs font-black text-rose-500 uppercase tracking-widest">Frasco Original (100ml)</span>
              <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 font-medium list-disc list-inside">
                <li>Costo de inversión inicial muy elevado.</li>
                <li>Riesgo de aburrirse antes de terminarlo.</li>
                <li>Incómodo y pesado para llevar de viaje o en la cartera.</li>
                <li>Difícil probar fragancias nuevas frecuentemente.</li>
              </ul>
            </div>
            <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-[28px] space-y-2 ring-2 ring-indigo-500/20">
              <span className="text-xs font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">Decant de 10ml ⭐ Recomendado</span>
              <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 font-medium list-disc list-inside">
                <li>Solo pagás el 10% del precio de la botella.</li>
                <li>Atomizadores de vidrio premium reutilizables.</li>
                <li>Llevalo a la facultad, trabajo, boliche o viaje.</li>
                <li>Coleccioná más perfumes por el mismo dinero.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                🧪 Decants y Perfumes en Tendencia
              </h4>
              <button 
                onClick={() => {
                  onSelectCategory("Perfumería");
                  setSelectedModalCategory(null);
                }}
                className="text-[10px] font-black text-indigo-500 uppercase hover:underline"
              >
                Ver todos
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {decantProducts.map(p => {
                const pid = String(p.ID_Producto);
                const itemCarrito = carrito[pid];
                const qty = itemCarrito?.cantidad || 0;
                const isBulto = itemCarrito?.modoBulto || false;

                return (
                  <ShopProductCard 
                    key={pid}
                    product={p}
                    qty={qty}
                    isBulto={isBulto}
                    onInitialAdd={onInitialAdd}
                    onUpdateQty={onUpdateQty}
                    onSetQtyExact={onSetQtyExact}
                    onToggleBulto={onToggleBulto}
                    onSelectImage={onSelectImage}
                  />
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (id === 'feat-armado') {
      const steps = [
        { num: '01', title: 'Sanitización Estéril', desc: 'Desinfectamos los atomizadores de vidrio y jeringas de precisión.' },
        { num: '02', title: 'Extracción Sellada', desc: 'Extraemos el líquido directamente del frasco madre sin contacto con el exterior.' },
        { num: '03', title: 'Trasvase Directo', desc: 'Inyectamos la fragancia en el decant de 10ml cuidando de no alterar sus notas.' },
        { num: '04', title: 'Sellado y Rotulado', desc: 'Sellamos el pulverizador y colocamos la etiqueta identificadora del perfume.' }
      ];

      return (
        <div className="space-y-6 text-left">
          <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] space-y-4">
            <h4 className="text-base font-black text-indigo-500 uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck size={18} /> Garantía de Autenticidad y Pureza
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              No diluimos, no mezclamos y no alteramos los perfumes. Cada decant es <strong>100% perfume puro original</strong>, fraccionado higiénicamente bajo estrictas medidas para asegurar que recibas el mismo aroma, duración y proyección que la botella cerrada.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {steps.map((st, idx) => (
              <div key={idx} className="flex gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px]">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 font-black flex items-center justify-center text-sm shrink-0">
                  {st.num}
                </div>
                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{st.title}</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-normal">{st.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (id === 'feat-exclusivo') {
      const handleContactWhatsApp = (message: string) => {
        const waVal = config.CONTACT_WHATSAPP || '';
        const cleaned = waVal.replace(/[^0-9]/g, '');
        const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      };

      return (
        <div className="space-y-6 text-left">
          <div className="p-6 bg-gradient-to-br from-pink-500/10 to-rose-500/5 dark:from-pink-500/5 dark:to-rose-950/20 border border-pink-500/10 rounded-[32px] space-y-4">
            <h4 className="text-base font-black text-pink-600 dark:text-pink-400 flex items-center gap-2 uppercase tracking-wide">
              <Gift size={18} /> ¿Querés hacer un regalo sorpresa?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Nosotros nos encargamos de que sea inolvidable. Realizamos envíos sorpresas con un packaging de lujo, tarjetones dedicados con tu texto personalizado y la máxima discreción. Coordinamos día, horario y ubicación exacta directamente con el agasajado o con vos.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] text-center space-y-4">
            <Heart className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
            <div className="space-y-1">
              <h5 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Agregá Dedicatoria y Envoltura Gratis</h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Consultanos ahora y coordiná tu regalo especial a través de nuestro WhatsApp oficial.</p>
            </div>
            <button
              onClick={() => handleContactWhatsApp("¡Hola! Me interesa coordinar un envío sorpresa de regalo con dedicatoria.")}
              className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-full font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto shadow-lg shadow-rose-500/20 active:scale-95 transition-transform"
            >
              Coordinar Regalo Sorpresa <Send size={14} />
            </button>
          </div>
        </div>
      );
    }

    if (id === 'feat-comunidad') {
      const handleJoinGroup = () => {
        const waVal = config.CONTACT_WHATSAPP || '';
        const cleaned = waVal.replace(/[^0-9]/g, '');
        const url = `https://wa.me/${cleaned}?text=${encodeURIComponent("¡Hola! Quiero unirme al grupo exclusivo de ofertas VIP de Wanda Essence.")}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      };

      return (
        <div className="space-y-6 text-left">
          <div className="p-6 bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-[32px] space-y-4">
            <h4 className="text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2 uppercase tracking-wide">
              💬 Comunidad Exclusiva Wanda
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Al formar parte de nuestro grupo de difusión y ofertas en WhatsApp, accedés a beneficios que no se publican en ningún otro lado:
            </p>
            <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-2 font-medium list-inside">
              <li>🚀 <strong>Ingresos Anticipados</strong>: Reservá las fragancias más virales antes de que aparezcan en el catálogo general.</li>
              <li>⚡ <strong>Liquidaciones Flash</strong>: Descuentos por tiempo limitado de hasta un 30% en fragancias seleccionadas.</li>
              <li>💡 <strong>Asesoramiento VIP</strong>: Respuestas directas a consultas sobre notas, familias olfativas y recomendaciones.</li>
            </ul>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] text-center space-y-4 ring-2 ring-emerald-500/15">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">Acceso Directo</span>
            <div className="space-y-1">
              <h5 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Unite a nuestro WhatsApp VIP</h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Hacé clic abajo para solicitar tu acceso instantáneo a la comunidad.</p>
            </div>
            <button
              onClick={handleJoinGroup}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
            >
              Quiero Unirme a la Comunidad <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      );
    }

    const whatsappMessage = `¡Hola! Me interesa saber más sobre: ${title}.`;
    const waVal = config.CONTACT_WHATSAPP || '';
    const cleaned = waVal.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(whatsappMessage)}`;
    
    const linkedProducts = category && category !== 'ALL' 
      ? allProducts.filter((p: any) => p.Categoria === category)
      : [];

    return (
      <div className="space-y-6 text-left">
        <div className="p-6 bg-indigo-500/5 dark:bg-indigo-950/15 border border-indigo-500/10 rounded-[32px] space-y-4">
          <h4 className="text-base font-black text-indigo-500 uppercase tracking-wide flex items-center gap-2">
            <Sparkles size={18} /> {title}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            {details || description}
          </p>
        </div>

        {linkedProducts.length > 0 ? (
          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              🛍️ Productos en {category} ({linkedProducts.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {linkedProducts.slice(0, 4).map(p => {
                const pid = String(p.ID_Producto);
                const itemCarrito = carrito[pid];
                const qty = itemCarrito?.cantidad || 0;
                const isBulto = itemCarrito?.modoBulto || false;

                return (
                  <ShopProductCard 
                    key={pid}
                    product={p}
                    qty={qty}
                    isBulto={isBulto}
                    onInitialAdd={onInitialAdd}
                    onUpdateQty={onUpdateQty}
                    onSetQtyExact={onSetQtyExact}
                    onToggleBulto={onToggleBulto}
                    onSelectImage={onSelectImage}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] text-center space-y-4">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
              <Send size={20} className="animate-bounce" />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">¿Querés más información?</h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Consultanos ahora y sacate todas las dudas que tengas con una de nuestras asesoras.</p>
            </div>
            {config.CONTACT_WHATSAPP && (
              <button
                onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
              >
                Chateá con nosotros <Send size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (carouselItems.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Layers className="text-indigo-500" size={24} />
          {config.CAROUSEL_MODE === 'featured' 
            ? 'Selección Destacada' 
            : config.CAROUSEL_MODE === 'features'
            ? '¿Por qué elegirnos?'
            : 'Categorías Destacadas'}
        </h2>
        <div className="flex gap-2">
           <button 
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-indigo-500 transition-colors"
              title={isPaused ? "Reanudar" : "Pausar"}
            >
              {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
            </button>
        </div>
      </div>

      <div 
        className="flex w-full overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] gap-3 flex-row h-[220px] sm:h-[280px] snap-x snap-mandatory px-1"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => { setIsPaused(false); isDragging.current = false; }}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
      >
        {carouselItems.map((item, index) => {
          const isActive = activeIndex === index;
          const isSelected = activeCategory === item.category;
          
          return (
            <motion.div
              key={item.id}
              layoutId={`card-${item.id}`}
              className={`
                relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[40px] group shrink-0 snap-center
                ${isActive ? 'w-[80%] sm:flex-[6] shadow-2xl z-10 cursor-pointer' : 'w-[15%] sm:flex-[1] shadow-md grayscale-[40%] hover:grayscale-0 cursor-pointer'}
                ${isSelected ? 'ring-4 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950' : ''}
              `}
              onClick={() => {
                if (isDragging.current) return;
                if (isActive) {
                  setSelectedModalCategory(item);
                } else {
                  setActiveIndex(index);
                }
              }}
            >
              {/* IMAGEN */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.img
                  layoutId={`image-${item.id}`}
                  src={item.image}
                  alt={item.title}
                  draggable="false"
                  className={`w-full h-full object-cover transition-transform duration-[2000ms] ${isActive ? 'scale-110' : 'scale-100'}`}
                />
                <div className={`absolute inset-0 transition-opacity duration-300 ${isActive ? 'bg-gradient-to-t from-black/80 via-black/20 to-transparent' : 'bg-black/50'}`} />
              </div>

              {/* Barra de progreso */}
              {isActive && !isPaused && !selectedModalCategory && (
                <div className="absolute top-0 left-0 bg-white/20 z-40 w-full h-1">
                  <div 
                    key={activeIndex} 
                    className="bg-indigo-400 h-full animate-[progressX_6s_linear_forwards]" 
                  />
                </div>
              )}

              {/* CONTENIDO CONTRAÍDO */}
              <div className={`absolute inset-0 p-6 flex flex-col justify-end transition-all ease-in-out pointer-events-none ${isActive ? 'opacity-100 translate-y-0 duration-300 delay-200' : 'opacity-0'}`}>
                <motion.h3 layoutId={`title-${item.id}`} className="text-xl md:text-2xl font-black text-white mb-2 uppercase">{item.title}</motion.h3>
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2 bg-indigo-500/90 text-white rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-1 backdrop-blur-md">
                    Explorar <ChevronRight size={12} />
                  </div>
                </div>
              </div>

              {/* Título Vertical (Inactivas) */}
              <div className={`absolute inset-0 flex items-center justify-center transition-all ease-in-out pointer-events-none ${isActive ? 'opacity-0' : 'opacity-100'}`}>
                <p className="text-white/50 font-black uppercase tracking-[0.2em] transition-all group-hover:text-white group-hover:tracking-[0.3em] drop-shadow-lg text-center text-[8px] sm:text-xs sm:[writing-mode:vertical-lr] sm:rotate-180">
                  {item.title}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* MODAL DE CATEGORÍA */}
      <AnimatePresence>
        {selectedModalCategory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedModalCategory(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" 
            />
            
            <motion.div
              layoutId={`card-${selectedModalCategory.id}`}
              className="relative w-full max-w-6xl h-full max-h-[90vh] bg-slate-50 dark:bg-slate-950 rounded-[48px] overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
              {/* Lado Izquierdo: Hero/Info */}
              <div className="relative w-full md:w-[35%] h-[200px] md:h-auto overflow-hidden">
                <motion.img
                  layoutId={`image-${selectedModalCategory.id}`}
                  src={selectedModalCategory.image}
                  className="w-full h-full object-cover"
                  alt={selectedModalCategory.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent md:bg-gradient-to-r" />
                
                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <motion.h2 
                    layoutId={`title-${selectedModalCategory.id}`}
                    className="text-3xl md:text-5xl font-black text-white uppercase mb-2 leading-tight"
                  >
                    {selectedModalCategory.title}
                  </motion.h2>
                  <p className="text-white/70 text-sm md:text-base font-medium max-w-xs">
                    {selectedModalCategory.description}
                  </p>
                  
                  <div className="mt-6 flex flex-wrap gap-2 text-left">
                    {config.CAROUSEL_MODE !== 'features' ? (
                      <>
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-wider">
                          {modalProducts.length} Productos
                        </span>
                        <button 
                          onClick={() => {
                            onSelectCategory(selectedModalCategory.category);
                            setSelectedModalCategory(null);
                          }}
                          className="px-4 py-1 bg-indigo-500 rounded-full text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-indigo-400 transition-colors"
                        >
                          Ver en tienda <ArrowRight size={12} />
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-wider">
                        ✨ Información
                      </span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedModalCategory(null)}
                  className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl transition-all active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Lado Derecho: Grid de Productos o Detalle de Característica */}
              <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
                {config.CAROUSEL_MODE === 'features' ? (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="p-6 md:p-8 border-b dark:border-slate-800 flex items-center justify-between shrink-0">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                        Detalles Especiales
                      </h3>
                      <button onClick={() => setSelectedModalCategory(null)} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"><X size={24} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                      {renderFeatureContent(selectedModalCategory)}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-6 md:p-8 border-b dark:border-slate-800 flex items-center justify-between shrink-0">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Selección Exclusiva</h3>
                      <button onClick={() => setSelectedModalCategory(null)} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"><X size={24} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                      {modalProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                          {modalProducts.map(p => {
                            const pid = String(p.ID_Producto);
                            const itemCarrito = carrito[pid];
                            const qty = itemCarrito?.cantidad || 0;
                            const isBulto = itemCarrito?.modoBulto || false;

                            return (
                              <ShopProductCard 
                                key={pid}
                                product={p}
                                qty={qty}
                                isBulto={isBulto}
                                onInitialAdd={onInitialAdd}
                                onUpdateQty={onUpdateQty}
                                onSetQtyExact={onSetQtyExact}
                                onToggleBulto={onToggleBulto}
                                onSelectImage={onSelectImage}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-10">
                          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[32px] flex items-center justify-center text-slate-300 mb-4">
                            <ShoppingBag size={40} />
                          </div>
                          <h4 className="text-xl font-black text-slate-800 dark:text-white">Sin stock disponible</h4>
                          <p className="text-slate-500 text-sm mt-2">Estamos trabajando para reponer estos productos pronto.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progressX { from { width: 0%; } to { width: 100%; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
      `}} />
    </div>
  );
}
