import { db } from "./firebase";
import {
    collection, getDocs, doc, setDoc, deleteDoc, getDoc,
    writeBatch, query, where, increment, updateDoc
} from "firebase/firestore";

export const wandaApi: Record<string, any> = {
    // ---------------- LECTURAS ----------------

    getCatalog: async () => {
        const snap = await getDocs(collection(db, "products"));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    getClients: async () => {
        const snap = await getDocs(collection(db, "clients"));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    getOrders: async () => {
        const snap = await getDocs(collection(db, "orders"));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    getAll: async () => {
        const [prodSnap, cliSnap, ordSnap, liqSnap, cfgSnap] = await Promise.all([
            getDocs(collection(db, "products")),
            getDocs(collection(db, "clients")),
            getDocs(collection(db, "orders")),
            getDocs(collection(db, "liquidations")),
            getDoc(doc(db, "settings", "global"))
        ]);

        return {
            products: prodSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            clients: cliSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            orders: ordSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            liquidaciones: liqSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            config: cfgSnap.exists() ? cfgSnap.data() : {}
        };
    },
    getConfig: async () => {
        const cfgRef = await getDoc(doc(db, "settings", "global"));
        return cfgRef.exists() ? cfgRef.data() : {};
    },

    // ---------------- ESCRITURAS SIMPLES ----------------

    saveProduct: async (product: any) => {
        const id = String(product.ID_Producto || product.id || `PROD-${new Date().getTime().toString().slice(-6)}`).replace(/\//g, "-").trim();
        product.id = id;
        product.ID_Producto = id;
        await setDoc(doc(db, "products", id), product, { merge: true });
        return { result: "OK" };
    },
    saveClient: async (client: any) => {
        const id = String(client.ID_Cliente || client.id || `CLI-${new Date().getTime().toString().slice(-4)}`).replace(/\//g, "-").trim();
        client.id = id;
        client.ID_Cliente = id;
        await setDoc(doc(db, "clients", id), client, { merge: true });
        return { result: "OK" };
    },
    deleteProduct: async (id: string) => {
        await deleteDoc(doc(db, "products", String(id)));
        return { result: "OK" };
    },
    deleteClient: async (id: string) => {
        await deleteDoc(doc(db, "clients", String(id)));
        return { result: "OK" };
    },
    saveConfig: async (config: any) => {
        await setDoc(doc(db, "settings", "global"), config, { merge: true });
        return { result: "OK" };
    },
    bulkUpdateProducts: async (changes: any[]) => {
        const batch = writeBatch(db);
        changes.forEach(change => {
            const id = change.ID_Producto || change.id;
            if (id) {
                batch.update(doc(db, "products", String(id)), change);
            }
        });
        await batch.commit();
        return { result: "OK" };
    },

    // ---------------- LOGÍSTICA Y PEDIDOS (RÁPIDOS CON BATCH) ----------------

    createOrder: async (orderData: any) => {
        const vendPrefix = (orderData.vendedor || "WEB").substring(0, 3).toUpperCase();
        const randSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const idPedido = `${vendPrefix}-${new Date().getTime()}-${randSuffix}`;

        let clienteId = orderData.cliente?.ID_Cliente || orderData.cliente?.id || "";
        const clienteNombre = orderData.cliente?.Nombre_Negocio || orderData.cliente?.nombre || "Cliente Sin Nombre";
        let notas = orderData.notas || "";

        // Si es venta directa (Online) sin registrar, crear un dummy-id
        if (orderData.cliente?.Es_Online) {
            clienteId = orderData.cliente?.Email || `ONL-${new Date().getTime()}`;
            notas = `[ONLINE] Tel: ${orderData.cliente.Telefono || "-"} | Dir: ${orderData.cliente.Direccion || "-"} | GPS: ${orderData.cliente.Ubicacion || "-"} | Notas: ${notas}`;

            // Si el cliente no existía, crearlo
            if (orderData.cliente?.Email) {
                await wandaApi.saveClient({
                    ...orderData.cliente,
                    ID_Cliente: clienteId,
                    Nombre_Negocio: clienteNombre,
                    tipo: "Online"
                });
            }
        }

        const finalOrder = {
            id: idPedido,
            fecha: new Date().toISOString(),
            cliente_id: clienteId,
            cliente_nombre: clienteNombre,
            vendedor: orderData.vendedor || "Web",
            total: orderData.total,
            estado: "Pendiente",
            reparto: "",
            notas: notas,
            gps: orderData.gps || "",
            descuento_general: orderData.descuento_general || 0,
            items: orderData.items || []
        };

        const batch = writeBatch(db);
        batch.set(doc(db, "orders", idPedido), finalOrder);

        // Descontar stock
        if (orderData.items && orderData.items.length > 0) {
            orderData.items.forEach((item: any) => {
                const idProd = String(item.id_producto || item.id || item.id_prod).replace(/\//g, "-").trim();
                const stockField = Object.keys(item).find(k => k.toLowerCase().includes("stock")) || "Stock"; // Firebase usaba el CSV original
                batch.update(doc(db, "products", idProd), {
                    Stock: increment(-item.cantidad) // Asumimos que la propiedad se llama Stock en FS principal
                });
            });
        }

        await batch.commit();
        return { result: "success", id: idPedido };
    },

    submitOrder: async (order: any) => {
        return await wandaApi.createOrder(order);
    },

    updateStatus: async (id: string, status: string) => {
        await updateDoc(doc(db, "orders", String(id)), { estado: status });
        return { result: "OK" };
    },

    asignarRepartoMasivo: async (ids: string[], reparto: string) => {
        const batch = writeBatch(db);
        ids.forEach((id: string) => {
            const orderStatus = (reparto && reparto !== "") ? "En Preparación" : "Pendiente";
            batch.update(doc(db, "orders", String(id)), {
                estado: orderStatus,
                reparto: reparto || ""
            });
        });
        await batch.commit();
        return { result: "OK" };
    },

    liberarReparto: async (reparto: string) => {
        const snap = await getDocs(query(collection(db, "orders"), where("reparto", "==", reparto)));
        const batch = writeBatch(db);
        snap.forEach(document => {
            batch.update(doc(db, "orders", document.id), {
                estado: "Pendiente",
                reparto: ""
            });
        });
        await batch.commit();
        return { result: "OK" };
    },

    saveOrderCorrection: async (pedidoEditado: any) => {
        const batch = writeBatch(db);
        const orderRef = doc(db, "orders", String(pedidoEditado.id));

        // En Firestore toda la estructura está junta (no como en SQL). 
        // Actualizamos de golpe el array de items, el total y otras variables.
        batch.update(orderRef, {
            items: pedidoEditado.items,
            total: pedidoEditado.total,
            descuento_general: pedidoEditado.descuento_general || 0,
            cliente_id: pedidoEditado.id_cliente || pedidoEditado.cliente_id,
            cliente_nombre: pedidoEditado.cliente_nombre
        });

        await batch.commit();
        return { result: "OK" };
    },

    liquidarRuta: async (data: any) => {
        const batch = writeBatch(db);
        const liqId = `LIQ-${new Date().getTime()}`;

        // Procesar cambios en los pedidos
        data.ordenes.forEach((ord: any) => {
            const orderRef = doc(db, "orders", String(ord.id));
            if (ord.estado === 'Entregado') {
                batch.update(orderRef, { estado: "Entregado", reparto: "" });
            } else if (ord.estado === 'Rechazado') {
                batch.update(orderRef, { estado: "Rechazado", reparto: "" });
                // Sumar al stock
                (ord.items || []).forEach((item: any) => {
                    const idProd = String(item.id_producto || item.id || item.id_prod);
                    batch.update(doc(db, "products", idProd), { Stock: increment(item.cantidad) });
                });
            } else if (ord.estado === 'Parcial') {
                batch.update(orderRef, {
                    estado: "Entregado Parcial",
                    reparto: "",
                    items: ord.items,
                    total: ord.total
                });
            }
        });

        const gastosTotal = (data.gastos || []).reduce((acc: any, g: any) => acc + (parseFloat(g.monto) || 0), 0);
        const efectivo = parseFloat(data.pagos.efectivo) || 0;
        const transferencia = parseFloat(data.pagos.transferencia) || 0;

        const liquidacionData = {
            id: liqId,
            ID_LIQ: liqId,
            FECHA: new Date().toISOString(),
            REPARTO: data.reparto,
            CHOFER: data.chofer || "",
            EFECTIVO: efectivo,
            TRANSF: transferencia,
            GASTOS: gastosTotal,
            TOTAL_NETO: (efectivo + transferencia) - gastosTotal,
            OBS: data.notas || "",
            ORDENES_JSON: JSON.stringify({ ordenes: data.ordenes || [] }) // Retro-compatibilidad visual
        };

        batch.set(doc(db, "liquidations", liqId), liquidacionData);
        await batch.commit();

        return { result: "OK" };
    },

    revertLiquidacion: async (id: string) => {
        const liqSnap = await getDoc(doc(db, "liquidations", String(id)));
        if (!liqSnap.exists()) return { result: "Error" };

        const liqData = liqSnap.data();
        const batch = writeBatch(db);

        try {
            const ordWrapper = JSON.parse(liqData.ORDENES_JSON);
            const routeName = liqData.REPARTO;

            if (ordWrapper && ordWrapper.ordenes) {
                ordWrapper.ordenes.forEach((ord: any) => {
                    const orderRef = doc(db, "orders", String(ord.id));
                    // Regresar a estado en preparación
                    batch.update(orderRef, { estado: "En Preparación", reparto: routeName });

                    if (ord.estado === 'Rechazado') {
                        // Des-sumar stock
                        (ord.items || []).forEach((item: any) => {
                            const idProd = String(item.id_producto || item.id || item.id_prod);
                            batch.update(doc(db, "products", idProd), { Stock: increment(-item.cantidad) });
                        });
                    }
                });
            }
        } catch (e) { }

        batch.delete(doc(db, "liquidations", String(id)));
        await batch.commit();

        return { result: "OK" };
    },

    verifyLogin: async (role: string, password: string) => {
        const cfgRef = await getDoc(doc(db, "settings", "global"));
        const config = cfgRef.exists() ? cfgRef.data() : {};

        let key = "";
        let defaultPass = "";

        if (role === 'admin') {
            key = "AUTH_ADMIN_PASSWORD";
            defaultPass = "admin123";
        } else if (role === 'preventista') {
            key = "AUTH_PREVENTA_PASSWORD";
            defaultPass = "wanda2024";
        } else {
            return { success: false, error: "Rol no válido" };
        }

        const savedPassword = config[key] || defaultPass;

        if (String(password) === String(savedPassword)) {
            return {
                success: true,
                role: role,
                displayName: role === 'admin' ? "Administrador Wanda" : "Preventista Wanda"
            };
        }

        return { success: false, error: "Contraseña incorrecta" };
    },
};
