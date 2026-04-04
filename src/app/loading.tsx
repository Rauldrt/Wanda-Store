export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
                </div>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest animate-pulse">
                    Sincronizando Datos...
                </p>
            </div>
        </div>
    );
}
