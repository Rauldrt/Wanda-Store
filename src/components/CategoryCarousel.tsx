import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronRight, Star, MapPin, Play, Pause, X, Send, Monitor, Smartphone, MonitorSmartphone, Layers, Tag, Box, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShopProductCard } from './ShopProductCard';

interface CategoryItem {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
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
  onSelectImage
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
    return categories
      .filter(cat => cat !== "ALL")
      .map((cat, index) => ({
        id: `cat-${index}`,
        title: cat,
        description: `Explora nuestra selección premium de ${cat.toLowerCase()}.`,
        image: DEFAULT_CATEGORY_IMAGES[cat] || GENERIC_IMAGE,
        category: cat
      }));
  }, [categories]);

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
    return allProducts.filter(p => p.Categoria === selectedModalCategory.category);
  }, [selectedModalCategory, allProducts]);

  if (carouselItems.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Layers className="text-indigo-500" size={24} />
          Categorías Destacadas
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
        className="flex w-full cursor-grab active:cursor-grabbing select-none transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] gap-3 flex-row h-[220px] sm:h-[280px]"
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
                relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[40px] group
                ${isActive ? 'flex-[6] shadow-2xl z-10 cursor-pointer' : 'flex-[1] shadow-md grayscale-[40%] hover:grayscale-0 cursor-pointer'}
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
                <p className="text-white/50 font-black uppercase tracking-[0.2em] transition-all group-hover:text-white group-hover:tracking-[0.3em] drop-shadow-lg text-center text-xs [writing-mode:vertical-lr] rotate-180">
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
                  
                  <div className="mt-6 flex flex-wrap gap-2">
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
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedModalCategory(null)}
                  className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl transition-all active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Lado Derecho: Grid de Productos */}
              <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900">
                <div className="p-6 md:p-8 border-b dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Selección Exclusiva</h3>
                  <button onClick={() => setSelectedModalCategory(null)} className="md:hidden p-2 text-slate-400"><X size={24} /></button>
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
