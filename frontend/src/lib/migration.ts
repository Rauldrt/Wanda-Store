import { wandaApi } from "./api";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

/**
 * Migra datos locales (localStorage) heredados de la versión anterior a Firebase Firestore.
 */
export async function migrateLocalStorageToFirebase() {
    if (typeof window === 'undefined') return;

    const migrationLog: string[] = [];

    // 1. Migrar Clientes Locales (local_clients)
    const localClientsRaw = localStorage.getItem("local_clients");
    if (localClientsRaw) {
        try {
            const localClients = JSON.parse(localClientsRaw);
            if (Array.isArray(localClients) && localClients.length > 0) {
                console.log(`Migrando ${localClients.length} clientes locales...`);
                for (const client of localClients) {
                    // Los guardamos como solicitudes de clientes nuevos
                    await wandaApi.saveClientRequest({
                        ...client,
                        id: client.ID_Cliente || client.id,
                        origen: "Migración LocalStorage",
                        migrado: true,
                        fecha_migracion: new Date().toISOString()
                    });
                }
                migrationLog.push(`${localClients.length} clientes migrados.`);
                localStorage.removeItem("local_clients");
            }
        } catch (e) {
            console.error("Error migrando clientes locales:", e);
        }
    }

    // 2. Migrar Historial de Pedidos (order_history)
    // Nota: El historial de pedidos suele ser redundante si ya se sincronizaron,
    // pero lo movemos a una colección de "legacy_orders" si el usuario lo desea.
    // Por ahora, solo nos aseguramos de que los pedidos PENDIENTES se sincronicen.
    const pendingOrdersRaw = localStorage.getItem("pending_orders");
    if (pendingOrdersRaw) {
        try {
            const pendingOrders = JSON.parse(pendingOrdersRaw);
            if (Array.isArray(pendingOrders) && pendingOrders.length > 0) {
                console.log(`Migrando ${pendingOrders.length} pedidos pendientes...`);
                for (const order of pendingOrders) {
                    await wandaApi.createOrder(order);
                }
                migrationLog.push(`${pendingOrders.length} pedidos pendientes sincronizados.`);
                localStorage.removeItem("pending_orders");
            }
        } catch (e) {
            console.error("Error migrando pedidos pendientes:", e);
        }
    }

    // 3. Migrar Historial de Tienda Online (order_history_online)
    const onlineHistoryRaw = localStorage.getItem("order_history_online");
    if (onlineHistoryRaw) {
        try {
            const onlineHistory = JSON.parse(onlineHistoryRaw);
            if (Array.isArray(onlineHistory) && onlineHistory.length > 0) {
                console.log(`Migrando ${onlineHistory.length} pedidos online...`);
                for (const order of onlineHistory) {
                    // Nos aseguramos de que tengan la marca de online
                    await wandaApi.submitOrder({
                        ...order,
                        vendedor: "Venta Online",
                        migrado: true
                    });
                }
                migrationLog.push(`${onlineHistory.length} pedidos online migrados.`);
                localStorage.removeItem("order_history_online");
            }
        } catch (e) {
            console.error("Error migrando historial online:", e);
        }
    }

    // 4. Otros datos (vendedor_name)
    // Si hay un nombre de vendedor en local storage, podríamos intentar crear el perfil si no existe.
    const sellerName = localStorage.getItem("vendedor_name") || localStorage.getItem("user_name");
    if (sellerName && sellerName !== "Admin" && sellerName !== "Preventista") {
        // Opcionalmente crear el perfil del vendedor automáticamente
        const sellers = await wandaApi.getSellers();
        const exists = sellers.some((s: any) => s.Nombre === sellerName);
        if (!exists) {
            await wandaApi.saveSeller({
                Nombre: sellerName,
                Activo: true,
                Fecha_Registro: new Date().toISOString(),
                Origen: "Auto-Migración"
            });
            migrationLog.push(`Perfil de preventista '${sellerName}' creado.`);
        }
    }

    // --- RESPALDO DE SEGURIDAD (LEGACY) ---
    // Guardamos una copia de todo el localStorage actual en Firebase para resguardo
    try {
        const fullBackup: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) fullBackup[key] = localStorage.getItem(key) || "";
        }

        if (Object.keys(fullBackup).length > 0) {
            const backupId = `legacy_${new Date().getTime()}`;
            const dataString = JSON.stringify(fullBackup);

            // Si el backup es mayor a 1MB (límite de Firestore), no lo guardamos como un solo doc
            if (dataString.length > 1000000) {
                console.warn("El backup de LocalStorage es demasiado grande para Firestore (>1MB). Se omite el respaldo automático.");
                return;
            }

            await setDoc(doc(db, "legacy_storage_backups", backupId), {
                dataString: dataString,
                fecha: new Date().toISOString(),
                user: sellerName || "default"
            });
        }
    } catch (e) {
        console.error("Error creando respaldo legacy:", e);
    }

    // --- LIMPIEZA DE DATOS MIGRADOS ---
    localStorage.removeItem("local_clients");
    localStorage.removeItem("pending_orders");
    localStorage.removeItem("order_history_online");

    if (migrationLog.length > 0) {
        console.log("Migración completada:", migrationLog.join(" | "));
        return migrationLog;
    }
    return null;
}
