"use client";

import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { wandaApi } from "@/lib/api";
import {
    Users,
    Plus,
    Search,
    Trash2,
    Edit2,
    CheckCircle2,
    XCircle,
    UserPlus,
    Phone,
    Mail,
    Calendar,
    ArrowLeft,
    Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function VendedoresPage() {
    const { data, refreshData } = useData();
    const sellers = data?.sellers || [];

    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSeller, setEditingSeller] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        Nombre: "",
        Telefono: "",
        Email: "",
        Activo: true,
        Zona: "",
        Password: ""
    });

    const filteredSellers = useMemo(() => {
        return sellers.filter((s: any) =>
            (s.Nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.ID_Preventista || "").toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sellers, searchTerm]);

    const handleOpenModal = (seller: any = null) => {
        if (seller) {
            setEditingSeller(seller);
            setFormData({
                Nombre: seller.Nombre || "",
                Telefono: seller.Telefono || "",
                Email: seller.Email || "",
                Activo: seller.Activo !== false,
                Zona: seller.Zona || "",
                Password: seller.Password || ""
            });
        } else {
            setEditingSeller(null);
            setFormData({
                Nombre: "",
                Telefono: "",
                Email: "",
                Activo: true,
                Zona: "",
                Password: ""
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                id: editingSeller?.id || null,
                ID_Preventista: editingSeller?.ID_Preventista || null,
                Ultima_Actualizacion: new Date().toISOString()
            };
            await wandaApi.saveSeller(payload);
            await refreshData(true);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving seller:", error);
            alert("No se pudo guardar el preventista");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar este preventista?")) return;
        try {
            await wandaApi.deleteSeller(id);
            await refreshData(true);
        } catch (error) {
            alert("Error al eliminar");
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <Users className="text-indigo-500" /> Preventistas
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Gestión y ABM de equipo de ventas</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
                >
                    <UserPlus size={20} /> Nuevo Preventista
                </button>
            </header>

            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Total: {filteredSellers.length} registrados
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50 dark:bg-slate-800/50">
                                <th className="px-6 py-4">Preventista</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4">Zona</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredSellers.map((seller: any) => (
                                <tr key={seller.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 font-bold">
                                                {seller.Nombre?.[0] || "P"}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-100">{seller.Nombre}</p>
                                                <p className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">{seller.ID_Preventista}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <Phone size={12} className="text-slate-400" /> {seller.Telefono || "S/T"}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <Mail size={12} className="text-slate-400" /> {seller.Email || "S/E"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                            {seller.Zona || "Global"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        {seller.Activo !== false ? (
                                            <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
                                                <CheckCircle2 size={12} /> Activo
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
                                                <XCircle size={12} /> Inactivo
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleOpenModal(seller)}
                                                className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(seller.id)}
                                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredSellers.length === 0 && (
                    <div className="p-20 text-center flex flex-col items-center gap-4 opacity-50">
                        <Users size={64} className="text-slate-300" />
                        <p className="font-bold text-slate-500">No se encontraron preventistas</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 pb-0 flex justify-between items-center">
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                                    {editingSeller ? "Editar Preventista" : "Nuevo Preventista"}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <XCircle className="text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.Nombre}
                                                onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                                                placeholder="Ej: Juan Pérez"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl py-3 px-4 font-bold outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Télefono</label>
                                            <input
                                                type="text"
                                                value={formData.Telefono}
                                                onChange={(e) => setFormData({ ...formData, Telefono: e.target.value })}
                                                placeholder="Ej: +54 9 11..."
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl py-3 px-4 font-bold outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.Email}
                                            onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                                            placeholder="preventista@wanda.com"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl py-3 px-4 font-bold outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Zona Asignada</label>
                                        <input
                                            type="text"
                                            value={formData.Zona}
                                            onChange={(e) => setFormData({ ...formData, Zona: e.target.value })}
                                            placeholder="Ej: Zona Norte, Centro..."
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl py-3 px-4 font-bold outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                                            <Lock size={10} /> Contraseña de Acceso
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={formData.Password}
                                            onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl py-3 px-4 font-bold outline-none transition-all"
                                        />
                                        <p className="text-[9px] text-slate-400 px-1 font-medium">Esta contraseña se usará en el selector de la sección Preventa.</p>
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                        <input
                                            type="checkbox"
                                            id="activo"
                                            checked={formData.Activo}
                                            onChange={(e) => setFormData({ ...formData, Activo: e.target.checked })}
                                            className="w-5 h-5 accent-indigo-500"
                                        />
                                        <label htmlFor="activo" className="text-sm font-bold text-slate-700 dark:text-slate-200 select-none">Cuenta Activa (Permitir ventas)</label>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-indigo-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? "Guardando..." : "Guardar Preventista"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
