import React from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Minus, Plus } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

interface ShopProductCardProps {
  product: any;
  qty: number;
  qtyDecant?: number;
  isBulto: boolean;
  onInitialAdd: (id: string) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onSetQtyExact: (id: string, qty: number) => void;
  onToggleBulto: (id: string) => void;
  onSelectImage: (url: string) => void;
}

export const ShopProductCard: React.FC<ShopProductCardProps> = ({
  product: p,
  qty,
  qtyDecant = 0,
  isBulto,
  onInitialAdd,
  onUpdateQty,
  onSetQtyExact,
  onToggleBulto,
  onSelectImage
}) => {
  const [activeFormat, setActiveFormat] = React.useState<'original' | 'decant'>('original');
  const hasDecant = parseFloat(String(p.Precio_Decant || "0")) > 0;

  const pid = String(p.ID_Producto);
  const isKg = activeFormat === 'decant' ? false : (p.Unidad || "").toLowerCase() === 'kg';

  const pureUnitPrice = parseFloat(String(p.Precio_Unitario || "0").replace(',', '.'));
  const avgWeight = parseFloat(String(p.Peso_Promedio || "1").replace(',', '.'));
  const unitsPerBulk = parseFloat(String(p.Unidades_Bulto || "1").replace(',', '.'));

  const decantPrice = parseFloat(String(p.Precio_Decant || "0").replace(',', '.'));

  const piecePrice = isKg ? pureUnitPrice * avgWeight : pureUnitPrice;
  const originalFinalPrice = isBulto ? piecePrice * unitsPerBulk : piecePrice;

  const finalPrice = activeFormat === 'decant' ? decantPrice : originalFinalPrice;
  const unitLabel = isKg ? "Pieza" : "Unid.";

  const currentQty = activeFormat === 'decant' ? qtyDecant : qty;
  const currentId = activeFormat === 'decant' ? `${pid}-decant` : pid;

  return (
    <motion.div
      layout
      onClick={() => { if (currentQty === 0) onInitialAdd(currentId) }}
      className={`bg-white dark:bg-slate-900 rounded-[32px] p-4 border transition-all duration-300 shadow-xl shadow-black/5 flex flex-col ${currentQty === 0 ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-1' : ''} ${currentQty > 0 ? 'border-indigo-200 dark:border-indigo-500/30' : 'border-slate-100 dark:border-slate-800'}`}
    >
      <div
        className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden cursor-pointer relative group z-20"
        onClick={(e) => {
          e.stopPropagation();
          if (p.Imagen_URL) onSelectImage(p.Imagen_URL);
        }}
      >
        {p.Imagen_URL ? (
          <img 
            src={getImageUrl(p.Imagen_URL) || ""} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
            alt={p.Nombre} 
            loading="lazy"
          />
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
            {activeFormat === 'decant' 
              ? `Decant (${p.Volumen_Decant || '10ml'})` 
              : (isBulto ? `Bulto (${unitsPerBulk}u)` : (isKg ? `Pieza (~${avgWeight}kg)` : 'Unidad'))
            }
          </span>
        </div>
      </div>

      {hasDecant && (
        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl gap-0.5 mt-2 mb-1 relative z-20">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setActiveFormat('original'); }}
            className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${activeFormat === 'original' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
          >
            Botella
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setActiveFormat('decant'); }}
            className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${activeFormat === 'decant' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400'}`}
          >
            Decant ({p.Volumen_Decant || "10ml"})
          </button>
        </div>
      )}

      {unitsPerBulk > 1 && activeFormat === 'original' && (
        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl gap-0.5 my-2">
          <button
            onClick={(e) => { e.stopPropagation(); isBulto && onToggleBulto(pid); }}
            className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all relative z-20 ${!isBulto ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
          >
            {unitLabel}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); !isBulto && onToggleBulto(pid); }}
            className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all relative z-20 ${isBulto ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400'}`}
          >
            Bulto
          </button>
        </div>
      )}

      {currentQty > 0 ? (
        <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800 p-1 rounded-2xl mt-auto py-1 shadow-inner relative z-20">
          <button onClick={(e) => { e.stopPropagation(); onUpdateQty(currentId, -1); }} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm text-slate-400 hover:text-rose-500 transition-colors shrink-0"><Minus size={16} /></button>
          <input 
            id={`qty-input-${currentId}`} 
            type="number" 
            min="0" 
            value={currentQty || ""} 
            onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) onSetQtyExact(currentId, v); else onSetQtyExact(currentId, 0); }} 
            className="flex-1 w-10 text-center text-sm font-black bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-lg" 
            onFocus={(e) => e.target.select()} 
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={(e) => { e.stopPropagation(); onUpdateQty(currentId, 1); }} className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0"><Plus size={16} /></button>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onInitialAdd(currentId);
          }}
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 mt-auto bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 relative z-20"
        >
          <Plus size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Comprar</span>
        </button>
      )}
    </motion.div>
  );
};
