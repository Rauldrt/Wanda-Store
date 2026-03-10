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
            products: prodSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            clients: cliSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            orders: ordSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            liquidaciones: liqSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            config: cfgSnap.exists() ? cfgSnap.data() : {},
            client_requests: reqSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            sellers: sellSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        };
    },
    getConfig: async () => {
        const cfgRef = await getDoc(doc(db, "settings", "global"));
        return cfgRef.exists() ? cfgRef.data() : {};
    },
    getSellers: async () => {
        const snap = await getDocs(collection(db, "sellers"));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        return { result: "OK", id: id };
    },
    saveSeller: async (seller: any) => {
        const id = String(seller.id || seller.ID_Preventista || `PREV-${new Date().getTime().toString().slice(-4)}`).replace(/\//g, "-").trim();
        seller.id = id;
        seller.ID_Preventista = id;
        await setDoc(doc(db, "sellers", id), seller, { merge: true });
        return { result: "OK", id: id };
    },
    saveClientRequest: async (client: any) => {
        const id = String(client.id || `REQ-${new Date().getTime().toString().slice(-4)}`).replace(/\//g, "-").trim();
        client.id = id;
        client.fecha_solicitud = new Date().toISOString();
        await setDoc(doc(db, "client_requests", id), client, { merge: true });
        return { result: "OK", id: id };
    },
    approveClientRequest: async (requestId: string, clientData: any) => {
        // Guardar como cliente real con nuevo ID si es necesario
        const res = await wandaApi.saveClient(clientData);
        // Borrar solicitud
        await deleteDoc(doc(db, "client_requests", requestId));
        return res;
    },
    rejectClientRequest: async (requestId: string) => {
        await deleteDoc(doc(db, "client_requests", requestId));
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
    deleteSeller: async (id: string) => {
        await deleteDoc(doc(db, "sellers", String(id)));
        return { result: "OK" };
    },
    deleteOrder: async (id: string) => {
        await deleteDoc(doc(db, "orders", String(id)));
        return { result: "OK" };
    },
    saveConfig: async (config: any) => {
        await setDoc(doc(db, "settings", "global"), config, { merge: true });
        return { result: "OK" };
    },
    saveClientProfile: async (email: string, profile: any) => {
        if (!email) return;
        await setDoc(doc(db, "profiles", email), profile, { merge: true });
        return { result: "OK" };
    },
    getClientProfile: async (email: string) => {
        if (!email) return null;
        const snap = await getDoc(doc(db, "profiles", email));
        return snap.exists() ? snap.data() : null;
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
                    id: clienteId,
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
                batch.update(doc(db, "products", idProd), {
                    Stock: increment(-item.cantidad)
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

    updateBulkOrders: async (orders: any[]) => {
        const batch = writeBatch(db);
        orders.forEach(order => {
            const orderRef = doc(db, "orders", String(order.id));
            batch.update(orderRef, order);
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

    deleteSettlementDraft: async (routeName: string) => {
        const id = `DRAFT-${routeName}`.replace(/\//g, "-").trim();
        await deleteDoc(doc(db, "settlement_drafts", id));
        return { result: "OK" };
    },

    saveSettlementDraft: async (routeName: string, draftData: any) => {
        const id = `DRAFT-${routeName}`.replace(/\//g, "-").trim();
        await setDoc(doc(db, "settlement_drafts", id), {
            id,
            routeName,
            data: draftData,
            updatedAt: new Date().toISOString()
        });
        return { result: "OK" };
    },

    getSettlementDraft: async (routeName: string) => {
        const id = `DRAFT-${routeName}`.replace(/\//g, "-").trim();
        const snap = await getDoc(doc(db, "settlement_drafts", id));
        return snap.exists() ? snap.data().data : null;
    },

    liquidarRuta: async (data: any) => {
        const batch = writeBatch(db);
        const liqId = `LIQ-${new Date().getTime()}`;

        // Procesar cambios en los pedidos
        data.ordenes.forEach((ord: any) => {
            const orderRef = doc(db, "orders", String(ord.id));
            if (ord.estado === 'Entregado') {
                batch.update(orderRef, { estado: "Entregado" });
            } else if (ord.estado === 'Rechazado') {
                batch.update(orderRef, { estado: "Rechazado" });
                // Sumar al stock
                (ord.items || []).forEach((item: any) => {
                    const idProd = String(item.id_producto || item.id || item.id_prod);
                    batch.update(doc(db, "products", idProd), { Stock: increment(item.cantidad) });
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
            data.stockAdjustments.forEach((adj: any) => {
                const id = adj.id || adj.id_prod;
                if (id) {
                    batch.update(doc(db, "products", String(id)), {
                        Stock: increment(adj.Stock || 0)
                    });
                }
            });
        }

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
            CUENTAS_CORRIENTES: parseFloat(data.total_cuentas_corrientes || 0),
            DEVOLUCIONES: parseFloat(data.total_devoluciones || 0),
            TOTAL_NETO: (efectivo + transferencia) - gastosTotal,
            OBS: data.notas || "",
            ORDENES_JSON: JSON.stringify({ ordenes: data.ordenes || [] }), // Retro-compatibilidad visual
            DRAFT_JSON: JSON.stringify(data._full_draft || {}) // Para recuperación al revertir
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
        let config: any = {};
        try {
            const cfgRef = await getDoc(doc(db, "settings", "global"));
            config = cfgRef.exists() ? cfgRef.data() : {};
        } catch (e) {
            console.log("Offline mode: Using cached config for login verification");
            const cachedData = localStorage.getItem("wanda_cloud_data_cache");
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                config = parsed.config || {};
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
