import { db, storage } from "./firebase";
import {
    collection, getDocs, doc, setDoc, deleteDoc, getDoc,
    writeBatch, query, where, increment, updateDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Product, Client, Order, OrderItem, Seller, Liquidation, ClientRequest, WandaConfig } from "@/types/wanda";

// --- CONFIGURACIÓN DE APIS (FIREBASE ONLY) ---
// El backend de Google Sheets ha sido desactivado a petición del usuario.

export interface WandaApiResponse {
    result?: string;
    error?: string;
    id?: string;
    [key: string]: unknown;
}

export const wandaApi = {
    // ---------------- LECTURAS ----------------

    getCatalog: async (): Promise<Product[]> => {
        const snap = await getDocs(collection(db, "products"));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
    },
    getClients: async (): Promise<Client[]> => {
        const snap = await getDocs(collection(db, "clients"));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[];
    },
    getOrders: async (): Promise<Order[]> => {
        const snap = await getDocs(collection(db, "orders"));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as Order[];
    },
    getAll: async () => {
        const [prodSnap, cliSnap, ordSnap, liqSnap, cfgSnap, reqSnap, sellSnap] = await Promise.all([
            getDocs(collection(db, "products")),
            getDocs(collection(db, "clients")),
            getDocs(collection(db, "orders")),
            getDocs(collection(db, "liquidations")),
            getDoc(doc(db, "settings", "global")),
            getDocs(collection(db, "client_requests")),
            getDocs(collection(db, "sellers"))
        ]);

        return {
            products: prodSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[],
            clients: cliSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Client[],
            orders: ordSnap.docs.map(d => ({ id: d.id, ...d.data() })) as unknown as Order[],
            liquidaciones: liqSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Liquidation[],
            config: (cfgSnap.exists() ? cfgSnap.data() : {}) as WandaConfig,
            client_requests: reqSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ClientRequest[],
            sellers: sellSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Seller[],
            result: "OK"
        };
    },
    getConfig: async (): Promise<WandaConfig> => {
        const cfgRef = await getDoc(doc(db, "settings", "global"));
        return (cfgRef.exists() ? cfgRef.data() : {}) as WandaConfig;
    },
    getSellers: async (): Promise<Seller[]> => {
        const snap = await getDocs(collection(db, "sellers"));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Seller[];
    },

    // ---------------- ESCRITURAS SIMPLES ----------------

    saveProduct: async (product: Partial<Product>): Promise<{ result: string }> => {
        let reqId = product.ID_Producto || product.id;
        if (!reqId || String(reqId).trim().toLowerCase() === 'auto') {
            reqId = `PROD-${new Date().getTime().toString().slice(-6)}`;
        }
        const id = String(reqId).replace(/\//g, "-").trim();
        product.id = id;
        product.ID_Producto = id;
        await setDoc(doc(db, "products", id), product, { merge: true });
        return { result: "OK" };
    },
    saveClient: async (client: Partial<Client>): Promise<{ result: string, id: string }> => {
        const id = String(client.ID_Cliente || client.id || `CLI-${new Date().getTime().toString().slice(-4)}`).replace(/\//g, "-").trim();
        client.id = id;
        client.ID_Cliente = id;
        await setDoc(doc(db, "clients", id), client, { merge: true });
        return { result: "OK", id: id };
    },
    saveSeller: async (seller: Partial<Seller>): Promise<{ result: string, id: string }> => {
        const id = String(seller.id || seller.ID_Preventista || `PREV-${new Date().getTime().toString().slice(-4)}`).replace(/\//g, "-").trim();
        seller.id = id;
        seller.ID_Preventista = id;
        await setDoc(doc(db, "sellers", id), seller, { merge: true });
        return { result: "OK", id: id };
    },
    saveClientRequest: async (client: Partial<ClientRequest>): Promise<{ result: string, id: string }> => {
        const id = String(client.id || `REQ-${new Date().getTime().toString().slice(-4)}`).replace(/\//g, "-").trim();
        client.id = id;
        client.fecha_solicitud = new Date().toISOString();
        await setDoc(doc(db, "client_requests", id), client, { merge: true });
        return { result: "OK", id: id };
    },
    approveClientRequest: async (requestId: string, clientData: Partial<Client>): Promise<{ result: string, id: string }> => {
        const res = await wandaApi.saveClient(clientData);
        await deleteDoc(doc(db, "client_requests", requestId));
        return res;
    },
    rejectClientRequest: async (requestId: string): Promise<{ result: string }> => {
        await deleteDoc(doc(db, "client_requests", requestId));
        return { result: "OK" };
    },
    deleteProduct: async (id: string): Promise<{ result: string }> => {
        await deleteDoc(doc(db, "products", String(id)));
        return { result: "OK" };
    },
    deleteClient: async (id: string): Promise<{ result: string }> => {
        await deleteDoc(doc(db, "clients", String(id)));
        return { result: "OK" };
    },
    deleteSeller: async (id: string): Promise<{ result: string }> => {
        await deleteDoc(doc(db, "sellers", String(id)));
        return { result: "OK" };
    },
    deleteOrder: async (id: string): Promise<{ result: string }> => {
        await deleteDoc(doc(db, "orders", String(id)));
        return { result: "OK" };
    },
    saveConfig: async (config: Partial<WandaConfig>): Promise<{ result: string }> => {
        await setDoc(doc(db, "settings", "global"), config, { merge: true });
        return { result: "OK" };
    },
    saveClientProfile: async (email: string, profile: Record<string, string | number | boolean>): Promise<{ result: string } | undefined> => {
        if (!email) return;
        await setDoc(doc(db, "profiles", email), profile, { merge: true });
        return { result: "OK" };
    },
    getClientProfile: async (email: string): Promise<Record<string, unknown> | null> => {
        if (!email) return null;
        const snap = await getDoc(doc(db, "profiles", email));
        return snap.exists() ? snap.data() : null;
    },
    bulkUpdateProducts: async (changes: Partial<Product>[]): Promise<{ result: string }> => {
        const batch = writeBatch(db);
        changes.forEach(change => {
            const id = change.ID_Producto || change.id;
            const docRef = id ? doc(db, "products", String(id)) : doc(collection(db, "products"));
            
            const finalData = { ...change };
            if (!id) {
                finalData.ID_Producto = docRef.id;
            }
            // Limpiamos campos temporales
            delete finalData.id;
            
            batch.set(docRef, finalData, { merge: true });
        });
        await batch.commit();
        return { result: "OK" };
    },
    bulkUpdateClients: async (changes: Partial<Client>[]): Promise<{ result: string }> => {
        const batch = writeBatch(db);
        changes.forEach(change => {
            const id = change.ID_Cliente || change.id;
            const docRef = id ? doc(db, "clients", String(id)) : doc(collection(db, "clients"));
            
            const finalData = { ...change };
            if (!id) {
                finalData.ID_Cliente = docRef.id;
            }
            delete finalData.id;
            
            batch.set(docRef, finalData, { merge: true });
        });
        await batch.commit();
        return { result: "OK" };
    },

    backfillZonas: async (sellersObj: Record<string, string>, orders: Order[], clients: Client[]): Promise<{ result: string, count: number }> => {
        const batch = writeBatch(db);
        let changes = 0;
        
        // 1. Deducir vendedor para cada cliente a partir de su historial de pedidos
        const clientSellerMap: Record<string, string> = {};
        for (const o of orders) {
            const vNameStr = o.vendedor || o.Vendedor_Asignado;
            const cId = String(o.cliente_id || o.cliente?.ID_Cliente || o.cliente?.id || "");
            if (vNameStr && cId) {
                // Siempre sobreescribimos con el último pedido, de esa forma vinculamos con su preventista actual
                clientSellerMap[cId] = vNameStr.trim().toUpperCase();
            }
        }
        
        // 2. Actualizar Clientes usando el historial de pedidos
        for (const c of clients) {
            const cId = String(c.ID_Cliente || c.id);
            // Tomar el asignado directo en DB o deducir del mapa
            const rawVName = c.Vendedor_Asignado || c.vendedor;
            const vName = rawVName ? rawVName.trim().toUpperCase() : (clientSellerMap[cId] || "GLOBAL");
            
            const correct = sellersObj[vName] || sellersObj["GLOBAL"] || "Global";
            
            if (c.Zona !== correct) {
                if (cId && cId !== "undefined") {
                    batch.update(doc(db, "clients", cId), { Zona: correct });
                    changes++;
                }
            }
        }
        
        // 3. Actualizar Pedidos
        for (const o of orders) {
            const vName = (o.vendedor || o.Vendedor_Asignado || "Global").trim().toUpperCase();
            const correct = sellersObj[vName] || sellersObj["GLOBAL"] || "Global";
            
            if (o.zona !== correct) {
                const oId = String(o.id);
                if (oId && oId !== "undefined") {
                    batch.update(doc(db, "orders", oId), { zona: correct });
                    changes++;
                }
            }
        }
        
        if (changes > 0) {
            await batch.commit();
        }
        return { result: "OK", count: changes };
    },

    // ---------------- LOGÍSTICA Y PEDIDOS (RÁPIDOS CON BATCH) ----------------

    createOrder: async (orderData: Partial<Order> & { cliente?: Partial<Client> }): Promise<{ result: string, id: string }> => {
        const vendPrefix = (orderData.vendedor || "WEB").substring(0, 3).toUpperCase();
        const randSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const idPedido = `${vendPrefix}-${new Date().getTime()}-${randSuffix}`;

        let clienteId = orderData.cliente?.ID_Cliente || orderData.cliente?.id || "";
        const clienteNombre = orderData.cliente?.Nombre_Negocio || orderData.cliente?.nombre || "Cliente Sin Nombre";
        let notas = orderData.notas || "";

        // Si es venta directa (Online)
        if (orderData.cliente?.Es_Online) {
            clienteId = orderData.cliente?.Email || `ONL-${new Date().getTime()}`;
            notas = `[ONLINE] Tel: ${orderData.cliente.Telefono || "-"} | Dir: ${orderData.cliente.Direccion || "-"} | GPS: ${orderData.cliente.Ubicacion || "-"} | Notas: ${notas}`;
        }

        // Verificación de existencia del cliente para flujo de aprobación
        if (clienteId) {
            const cliRef = await getDoc(doc(db, "clients", String(clienteId)));
            if (!cliRef.exists()) {
                // El cliente no existe en DB, generar solicitud de aprobación
                await wandaApi.saveClientRequest({
                    ...orderData.cliente,
                    id: String(clienteId),
                    Nombre_Negocio: clienteNombre,
                    origen: orderData.cliente?.Es_Online ? "Tienda Online" : (orderData.vendedor || "Preventa"),
                    fecha_pedido: new Date().toISOString(),
                    id_pedido: idPedido
                });
                notas = `[SOLICITUD PENDIENTE] ${notas}`;
            }
        } else {
            // No tiene ID, es un cliente nuevo absoluto
            const tempId = `NEW-${new Date().getTime()}`;
            await wandaApi.saveClientRequest({
                ...orderData.cliente,
                id: tempId,
                Nombre_Negocio: clienteNombre,
                origen: orderData.vendedor || "Preventa",
                fecha_pedido: new Date().toISOString(),
                id_pedido: idPedido
            });
            clienteId = tempId;
            notas = `[NUEVO CLIENTE] ${notas}`;
        }

        const finalOrder = {
            id: idPedido,
            fecha: new Date().toISOString(),
            cliente_id: clienteId,
            cliente_nombre: clienteNombre,
            vendedor: orderData.vendedor || "Web",
            total: orderData.total,
            estado: orderData.estado || "Pendiente",
            reparto: "",
            notas: notas,
            gps: orderData.gps || orderData.cliente?.Ubicacion || "",
            descuento_general: orderData.descuento_general || 0,
            items: orderData.items || []
        };

        const batch = writeBatch(db);
        batch.set(doc(db, "orders", idPedido), finalOrder);

        // Descontar stock
        if (orderData.items && orderData.items.length > 0) {
            orderData.items.forEach((item: OrderItem) => {
                const idProd = String(item.id_producto || item.id || item.id_prod).replace(/\//g, "-").trim();
                const stockField = item.esDecant ? "Stock_Decant" : "Stock_Actual";
                batch.update(doc(db, "products", idProd), {
                    [stockField]: increment(-item.cantidad)
                });
            });
        }

        await batch.commit();
        return { result: "success", id: idPedido };
    },

    submitOrder: async (orderData: Partial<Order> & { cliente?: Partial<Client> }): Promise<{ result: string, id: string }> => {
        return await wandaApi.createOrder(orderData);
    },
    updateStatus: async (orderId: string, status: string, notes: string = ""): Promise<{ result: string }> => {
        await updateDoc(doc(db, "orders", String(orderId)), { estado: status, notas_logistica: notes });
        return { result: "OK" };
    },

    asignarRepartoMasivo: async (ids: string[], reparto: string): Promise<{ result: string }> => {
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

    updateBulkOrders: async (orders: Partial<Order>[]): Promise<{ result: string }> => {
        const batch = writeBatch(db);
        orders.forEach(order => {
            const orderRef = doc(db, "orders", String(order.id));
            batch.update(orderRef, order);
        });
        await batch.commit();
        return { result: "OK" };
    },

    liberarReparto: async (reparto: string): Promise<{ result: string }> => {
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

    saveOrderCorrection: async (pedidoEditado: Partial<Order> & { cliente?: Partial<Client>, cliente_nombre?: string }): Promise<{ result: string }> => {
        const batch = writeBatch(db);
        const orderRef = doc(db, "orders", String(pedidoEditado.id));

        const updateData: Record<string, unknown> = {
            items: pedidoEditado.items,
            total: pedidoEditado.total,
            descuento_general: pedidoEditado.descuento_general || 0,
            cliente_id: pedidoEditado.cliente_id || pedidoEditado.cliente?.ID_Cliente || pedidoEditado.cliente?.id || "",
            cliente_nombre: pedidoEditado.cliente_nombre || pedidoEditado.cliente?.Nombre_Negocio || ""
        };

        if (pedidoEditado.notas !== undefined) updateData.notas = pedidoEditado.notas;
        if (pedidoEditado.gps !== undefined) updateData.gps = pedidoEditado.gps;
        if (pedidoEditado.cliente !== undefined) updateData.cliente = pedidoEditado.cliente;

        batch.update(orderRef, updateData);

        await batch.commit();
        return { result: "OK" };
    },

    markOrderAsTest: async (order: Order): Promise<{ result: string }> => {
        const batch = writeBatch(db);
        const orderRef = doc(db, "orders", String(order.id));
        
        // 1. Marcar como prueba
        batch.update(orderRef, { 
            estado: "PRUEBA",
            notas: `[PEDIDO DE PRUEBA] ${order.notas || ""}`.trim()
        });

        // 2. Revertir stock
        if (order.items && order.items.length > 0) {
            order.items.forEach((item: OrderItem) => {
                const idProd = String(item.id_producto || item.id || item.id_prod).replace(/\//g, "-").trim();
                const stockField = item.esDecant ? "Stock_Decant" : "Stock_Actual";
                batch.update(doc(db, "products", idProd), {
                    [stockField]: increment(item.cantidad)
                });
            });
        }

        await batch.commit();
        return { result: "OK" };
    },

    deleteSettlementDraft: async (routeName: string): Promise<{ result: string }> => {
        const id = `DRAFT-${routeName}`.replace(/\//g, "-").trim();
        await deleteDoc(doc(db, "settlement_drafts", id));
        return { result: "OK" };
    },

    saveSettlementDraft: async (routeName: string, draftData: Record<string, unknown>): Promise<{ result: string }> => {
        const id = `DRAFT-${routeName}`.replace(/\//g, "-").trim();
        await setDoc(doc(db, "settlement_drafts", id), {
            id,
            routeName,
            data: draftData,
            updatedAt: new Date().toISOString()
        });
        return { result: "OK" };
    },

    getSettlementDraft: async (routeName: string): Promise<Record<string, unknown> | null> => {
        const id = `DRAFT-${routeName}`.replace(/\//g, "-").trim();
        const snap = await getDoc(doc(db, "settlement_drafts", id));
        return snap.exists() ? snap.data().data : null;
    },

    liquidarRuta: async (data: {
        ordenes: Partial<Order>[],
        stockAdjustments?: Record<string, unknown>[],
        gastos?: { monto: string | number }[],
        pagos: { efectivo: string | number, transferencia: string | number },
        reparto: string,
        chofer?: string,
        total_cuentas_corrientes?: string | number,
        total_devoluciones?: string | number,
        notas?: string,
        _full_draft?: unknown
    }): Promise<{ result: string }> => {
        const batch = writeBatch(db);
        const liqId = `LIQ-${new Date().getTime()}`;

        // Procesar cambios en los pedidos
        data.ordenes.forEach((ord: Partial<Order>) => {
            const orderRef = doc(db, "orders", String(ord.id));
            if (ord.estado === 'Entregado') {
                batch.update(orderRef, { estado: "Entregado" });
            } else if (ord.estado === 'Rechazado') {
                batch.update(orderRef, { estado: "Rechazado" });
                // Sumar al stock
                (ord.items || []).forEach((item: OrderItem) => {
                    const idProd = String(item.id_producto || item.id || item.id_prod);
                    // Seguridad: Solo actualizar stock si el ID es válido y no es una fecha accidental
                    if (idProd && idProd !== "undefined" && !/^\d{4}-\d{2}-\d{2}T/.test(idProd)) {
                        const stockField = item.esDecant ? "Stock_Decant" : "Stock_Actual";
                        batch.set(doc(db, "products", idProd), { [stockField]: increment(item.cantidad) }, { merge: true });
                    }
                });
            } else if (ord.estado === 'Parcial') {
                batch.update(orderRef, {
                    estado: "Entregado Parcial",
                    items: ord.items,
                    total: ord.total
                });
            }
        });

        // Procesar ajustes de stock explícitos (devoluciones manuales o deltas de parciales)
        if (data.stockAdjustments && Array.isArray(data.stockAdjustments)) {
            data.stockAdjustments.forEach((adj: Record<string, unknown>) => {
                const id = String(adj.id || adj.id_prod || "");
                // Seguridad: Validar ID de producto antes de actualizar stock
                if (id && id !== "undefined" && !/^\d{4}-\d{2}-\d{2}T/.test(id)) {
                    const isDecant = id.endsWith("-decant") || !!adj.esDecant;
                    const baseId = id.endsWith("-decant") ? id.replace("-decant", "") : id;
                    const stockField = isDecant ? "Stock_Decant" : "Stock_Actual";
                    const amt = (adj.Stock_Actual as number) || (adj.Stock as number) || (adj.cantidad as number) || 0;
                    batch.set(doc(db, "products", baseId), {
                        [stockField]: increment(amt)
                    }, { merge: true });
                }
            });
        }

        const gastosTotal = (data.gastos || []).reduce((acc: number, g: { monto: string | number }) => acc + (parseFloat(String(g.monto)) || 0), 0);
        const efectivo = parseFloat(String(data.pagos.efectivo)) || 0;
        const transferencia = parseFloat(String(data.pagos.transferencia)) || 0;

        const liquidacionData = {
            id: liqId,
            ID_LIQ: liqId,
            FECHA: new Date().toISOString(),
            REPARTO: data.reparto,
            CHOFER: data.chofer || "",
            EFECTIVO: efectivo,
            TRANSF: transferencia,
            GASTOS: gastosTotal,
            CUENTAS_CORRIENTES: parseFloat(String(data.total_cuentas_corrientes || 0)),
            DEVOLUCIONES: parseFloat(String(data.total_devoluciones || 0)),
            TOTAL_NETO: (efectivo + transferencia) - gastosTotal,
            OBS: data.notas || "",
            ORDENES_JSON: JSON.stringify({ ordenes: data.ordenes || [] }), // Retro-compatibilidad visual
            DRAFT_JSON: JSON.stringify(data._full_draft || {}) // Para recuperación al revertir
        };

        batch.set(doc(db, "liquidations", liqId), liquidacionData);
        await batch.commit();

        return { result: "OK" };
    },

    revertLiquidacion: async (id: string): Promise<{ result: string }> => {
        const liqSnap = await getDoc(doc(db, "liquidations", String(id)));
        if (!liqSnap.exists()) return { result: "Error" };

        const liqData = liqSnap.data();
        const batch = writeBatch(db);

        try {
            const ordWrapper = JSON.parse(liqData.ORDENES_JSON);
            const routeName = liqData.REPARTO;

            if (ordWrapper && ordWrapper.ordenes) {
                ordWrapper.ordenes.forEach((ord: Partial<Order>) => {
                    const orderRef = doc(db, "orders", String(ord.id));
                    // Regresar a estado en preparación
                    batch.update(orderRef, { estado: "En Preparación", reparto: routeName });

                    if (ord.estado === 'Rechazado') {
                        // Des-sumar stock
                        (ord.items || []).forEach((item: OrderItem) => {
                            const idProd = String(item.id_producto || item.id || item.id_prod);
                            const stockField = item.esDecant ? "Stock_Decant" : "Stock_Actual";
                            batch.update(doc(db, "products", idProd), { [stockField]: increment(-item.cantidad) });
                        });
                    }
                });
            }
        } catch { }

        batch.delete(doc(db, "liquidations", String(id)));
        await batch.commit();

        return { result: "OK" };
    },

    verifyLogin: async (role: string, password: string): Promise<{ success: boolean, role?: string, displayName?: string, error?: string }> => {
        let config: Partial<WandaConfig> = {};
        try {
            const cfgRef = await getDoc(doc(db, "settings", "global"));
            config = (cfgRef.exists() ? cfgRef.data() : {}) as WandaConfig;
        } catch {
            console.log("Offline mode: Using cached config for login verification");
            const cachedData = localStorage.getItem("wanda_cloud_data_cache");
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                config = (parsed.config || {}) as WandaConfig;
            }
        }

        let key = "";
        let defaultPass = "";

        if (role === 'admin') {
            key = "AUTH_ADMIN_PASSWORD";
            defaultPass = "admin3376";
        } else if (role === 'preventista') {
            key = "AUTH_PREVENTA_PASSWORD";
            defaultPass = "wanda333";
        } else {
            return { success: false, error: "Rol no válido" };
        }

        const savedPassword = (config as Record<string, string>)[key] || defaultPass;

        if (String(password) === String(savedPassword)) {
            return {
                success: true,
                role: role,
                displayName: role === 'admin' ? "Administrador Wanda" : "Preventista Wanda"
            };
        }

        return { success: false, error: "Contraseña incorrecta" };
    },

    uploadImage: async (file: File, path: string): Promise<{ result: string, url: string } | { error: string }> => {
        try {
            const storageRef = ref(storage, path);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return { result: "OK", url: downloadURL };
        } catch (error: unknown) {
            console.error("Error uploading image:", error);
            const errMsg = error instanceof Error ? error.message : "Unknown error";
            return { error: errMsg };
        }
    },
};

