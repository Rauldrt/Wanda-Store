import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronRight, Star, MapPin, Play, Pause, X, Send, Monitor, Smartphone, MonitorSmartphone, Layers, Tag, Box, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
}

export default function CategoryCarousel({ categories, onSelectCategory, activeCategory }: CategoryCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // Determinar la orientación final a renderizar (Siempre horizontal por pedido del usuario)
  const actualOrientation = 'horizontal';

  // Refs Táctiles
  const touchStart = useRef({ x: 0, y: 0 });
  const touchEnd = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const minSwipeDistance = 40;

  // Preparar items del carrusel (Solo los que no son "ALL")
  const carouselItems = useMemo(() => {
    return categories
      .filter(cat => cat !== "ALL")
      .map((cat, index) => ({
        id: `cat-${index}`,
        title: cat,
        description: `Explora nuestra selección de ${cat.toLowerCase()}.`,
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

  // Lógica de Swipe con prevención de click accidental
  const handleStart = (e: any) => {
    if (expandedCard) return;
    isDragging.current = false;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    touchStart.current = { x: clientX, y: clientY };
    touchEnd.current = { x: clientX, y: clientY }; // Inicializar touchEnd para evitar saltos
  };

  const handleMove = (e: any) => {
    if (expandedCard) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    touchEnd.current = { x: clientX, y: clientY };

    if (Math.abs(touchStart.current.x - clientX) > 10 || Math.abs(touchStart.current.y - clientY) > 10) {
      isDragging.current = true;
    }
  };

  const handleEnd = () => {
    if (expandedCard) return;
    const distX = touchStart.current.x - touchEnd.current.x;
    const distY = touchStart.current.y - touchEnd.current.y;

    if (actualOrientation === 'horizontal') {
      if (Math.abs(distX) > minSwipeDistance) distX > 0 ? nextSlide() : prevSlide();
    } else {
      if (Math.abs(distY) > minSwipeDistance) distY > 0 ? nextSlide() : prevSlide();
    }
  };

  // Autoplay Inteligente
  useEffect(() => {
    if (isPaused || expandedCard !== null || carouselItems.length === 0) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide, activeIndex, expandedCard, carouselItems.length]);

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
        className={`flex w-full cursor-grab active:cursor-grabbing select-none transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${expandedCard !== null ? 'gap-0' : 'gap-3'}
          ${actualOrientation === 'horizontal' 
            ? 'flex-row h-[220px] sm:h-[280px]' 
            : 'flex-col h-[500px]'
          }
        `}
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
          const isExpanded = expandedCard === item.id;
          const isOtherExpanded = expandedCard !== null && expandedCard !== item.id;
          const isSelected = activeCategory === item.category;
          
          return (
            <div
              key={item.id}
              className={`
                relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[24px] group
                ${isExpanded ? 'flex-[10] shadow-2xl bg-white dark:bg-slate-900 cursor-default' : ''}
                ${isOtherExpanded ? 'flex-[0] opacity-0 max-w-0 p-0 m-0 border-0 pointer-events-none' : ''}
                ${isActive && !expandedCard ? 'flex-[6] shadow-xl z-10 cursor-pointer' : ''}
                ${!isExpanded && !isActive && !isOtherExpanded ? 'flex-[1] shadow-md grayscale-[40%] hover:grayscale-0 cursor-pointer' : ''}
                ${isSelected && !isExpanded ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950' : ''}
              `}
              onClick={() => {
                if (isDragging.current) return;
                if (isExpanded || isOtherExpanded) return;

                if (isActive) {
                  setExpandedCard(item.id);
                } else {
                  setActiveIndex(index);
                }
              }}
            >
              
              {/* IMAGEN */}
              <div className={`absolute top-0 left-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden
                ${isExpanded 
                  ? (actualOrientation === 'horizontal' ? 'w-[45%] h-full' : 'w-full h-[40%]') 
                  : 'w-full h-full'
                }
              `}>
                <img
                  src={item.image}
                  alt={item.title}
                  draggable="false"
                  className={`w-full h-full object-cover transition-transform duration-[2000ms] ${isActive && !isExpanded ? 'scale-110' : 'scale-100'}`}
                />
                <div className={`absolute inset-0 transition-opacity duration-300 ${isExpanded ? 'opacity-0' : (isActive ? 'bg-gradient-to-t from-black/80 via-black/20 to-transparent' : 'bg-black/50')}`} />
              </div>

              {/* Barra de progreso */}
              {isActive && !isPaused && !expandedCard && (
                <div className={`absolute top-0 left-0 bg-white/20 z-40 ${actualOrientation === 'horizontal' ? 'w-full h-1' : 'w-1 h-full'}`}>
                  <div 
                    key={activeIndex} 
                    className={`bg-indigo-400 ${actualOrientation === 'horizontal' ? 'h-full animate-[progressX_6s_linear_forwards]' : 'w-full animate-[progressY_6s_linear_forwards]'}`} 
                  />
                </div>
              )}

              {/* ESTADO CONTRAÍDO */}
              <div className={`absolute inset-0 p-6 flex flex-col justify-end transition-all ease-in-out pointer-events-none
                ${isExpanded 
                  ? 'opacity-0 translate-y-4 duration-150 delay-0' 
                  : (isActive ? 'opacity-100 translate-y-0 duration-300 delay-[200ms]' : 'opacity-0')
                }
              `}>
                <h3 className="text-xl md:text-2xl font-black text-white mb-2 leading-tight tracking-tight uppercase">{item.title}</h3>
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2 bg-indigo-500/90 text-white rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-1 backdrop-blur-md">
                    Explorar <ChevronRight size={12} />
                  </div>
                </div>
              </div>

              {/* ESTADO EXPANDIDO */}
              <div className={`absolute bottom-0 right-0 transition-all ease-in-out bg-white dark:bg-slate-900 flex flex-col
                ${isExpanded 
                  ? `opacity-100 duration-500 delay-[150ms] ${actualOrientation === 'horizontal' ? 'w-[55%] h-full translate-x-0' : 'w-full h-[60%] translate-y-0'}` 
                  : `opacity-0 duration-150 delay-0 pointer-events-none ${actualOrientation === 'horizontal' ? 'w-[55%] h-full translate-x-8' : 'w-full h-[60%] translate-y-8'}`
                }
              `}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedCard(null);
                  }}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition-colors z-20"
                >
                  <X size={20} />
                </button>

                <div className="p-6 md:p-8 overflow-y-auto h-full w-full custom-scrollbar flex flex-col">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider mb-2">
                    Categoría
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mb-2">{item.title}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">
                    {item.description}
                  </p>

                  <div className="space-y-3 mt-auto">
                    <button 
                      onClick={() => {
                        onSelectCategory(item.category);
                        setExpandedCard(null);
                      }}
                      className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-indigo-500/20"
                    >
                      Ver Productos
                      <ShoppingBag size={14} />
                    </button>
                    <button 
                      onClick={() => setExpandedCard(null)}
                      className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>

              {/* Título Vertical (Inactivas) */}
              <div className={`absolute inset-0 flex items-center justify-center transition-all ease-in-out pointer-events-none
                ${(isActive || expandedCard !== null) ? 'opacity-0 duration-150 delay-0' : 'opacity-100 duration-300 delay-[200ms]'}
              `}>
                <p className={`text-white/50 font-black uppercase tracking-[0.2em] transition-all group-hover:text-white group-hover:tracking-[0.3em] drop-shadow-lg text-center
                  ${actualOrientation === 'horizontal' ? 'text-xs [writing-mode:vertical-lr] rotate-180' : 'text-xs px-2'}
                `}>
                  {item.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progressX { from { width: 0%; } to { width: 100%; } }
        @keyframes progressY { from { height: 0%; } to { height: 100%; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
      `}} />
    </div>
  );
}
