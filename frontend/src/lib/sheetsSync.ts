import { wandaApi } from "./api";

/**
 * Utilidades para exportar e importar datos en formato compatible con Google Sheets (CSV / JSON)
 */

export const sheetsSync = {
    // --- EXPORTAR ---

    exportToCSV: (data: any[], headers: string[], filename: string) => {
        const csvContent = [
            headers.join(";"),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] === undefined || row[header] === null ? "" : row[header];
                    // Escapar comillas dobles y envolver en ellas si es necesario
                    const escaped = String(value).replace(/"/g, '""');
                    return `"${escaped}"`;
                }).join(";")
            )
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    exportProducts: (products: any[]) => {
        const headers = [
            "ID_Producto", "Nombre", "Categoria", "Unidad", 
            "Precio_Unitario", "Costo", "Stock_Actual", 
            "Peso_Promedio", "Unidades_Bulto", "Imagen_URL", 
            "Es_Oferta", "Nota_Oferta"
        ];
        sheetsSync.exportToCSV(products, headers, "wanda_productos");
    },

    exportClients: (clients: any[]) => {
        const headers = [
            "ID_Cliente", "Nombre_Negocio", "Email", "Telefono", 
            "Direccion", "Ubicacion", "Saldo", "Categoria", "Vendedor_Asignado"
        ];
        sheetsSync.exportToCSV(clients, headers, "wanda_clientes");
    },

    exportOrders: (orders: any[]) => {
        const headers = [
            "id", "fecha", "cliente_id", "cliente_nombre", 
            "vendedor", "total", "estado", "reparto", "notas", "gps"
        ];
        sheetsSync.exportToCSV(orders, headers, "wanda_pedidos");
    },

    exportOrderDetails: (orders: any[]) => {
        const details: any[] = [];
        orders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach((item: any) => {
                    details.push({
                        Pedido_ID: order.id,
                        Fecha: new Date(order.fecha).toLocaleDateString(),
                        Cliente: order.cliente_nombre,
                        Vendedor: order.vendedor,
                        Producto_ID: item.id_producto || item.id || item.id_prod,
                        Producto_Nombre: item.nombre || item.producto,
                        Cantidad: item.cantidad,
                        Precio: item.precio || item.precio_unitario,
                        Subtotal: (item.cantidad * (item.precio || item.precio_unitario || 0)).toFixed(2),
                        Estado: order.estado
                    });
                });
            }
        });

        const headers = [
            "Pedido_ID", "Fecha", "Cliente", "Vendedor", 
            "Producto_ID", "Producto_Nombre", "Cantidad", 
            "Precio", "Subtotal", "Estado"
        ];
        sheetsSync.exportToCSV(details, headers, "wanda_detalles_pedidos");
    },

    // --- IMPORTAR ---

    parseCSV: (csvText: string): any[] => {
        const rows = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
        if (rows.length < 2) return [];

        const headers = rows[0].split(";").map(h => h.replace(/^"|"$/g, '').trim());
        return rows.slice(1).map(row => {
            const values = row.split(";").map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
            const obj: any = {};
            headers.forEach((header, i) => {
                obj[header] = values[i];
            });
            return obj;
        });
    },

    importProducts: async (csvText: string) => {
        const data = sheetsSync.parseCSV(csvText);
        if (data.length === 0) return { success: false, message: "No se encontraron datos" };

        const formatted = data.map(item => {
            const cleanItem: any = {};
            // Solo incluimos campos que tengan valor para no sobreescribir con vacíos
            Object.keys(item).forEach(key => {
                if (item[key] !== "" && item[key] !== undefined && item[key] !== null) {
                    let value = item[key];
                    // Conversiones de tipos
                    if (["Precio_Unitario", "Costo", "Stock_Actual", "Peso_Promedio"].includes(key)) {
                        value = parseFloat(value.toString().replace(",", "."));
                    } else if (key === "Unidades_Bulto") {
                        value = parseInt(value);
                    } else if (key === "Es_Oferta") {
                        value = value === "true" || value === "TRUE" || value === "1";
                    }
                    cleanItem[key] = value;
                }
            });
            return cleanItem;
        });

        await wandaApi.bulkUpdateProducts(formatted);
        return { success: true, count: formatted.length };
    },

    importClients: async (csvText: string) => {
        const data = sheetsSync.parseCSV(csvText);
        if (data.length === 0) return { success: false, message: "No se encontraron datos" };

        const formatted = data.map(item => {
            const cleanItem: any = {};
            Object.keys(item).forEach(key => {
                if (item[key] !== "" && item[key] !== undefined && item[key] !== null) {
                    let value = item[key];
                    if (key === "Saldo") {
                        value = parseFloat(value.toString().replace(",", "."));
                    }
                    cleanItem[key] = value;
                }
            });
            return cleanItem;
        });

        await wandaApi.bulkUpdateClients(formatted);
        return { success: true, count: formatted.length };
    }
};
