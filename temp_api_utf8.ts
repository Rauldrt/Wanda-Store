const API_URL = "https://script.google.com/macros/s/AKfycbxBuAYYQM5brzMeDJRh-vPu5L91F6GQfqyeogEE97g4ELO_J4R8ZLLCfJ67SXimDOIS_g/exec"; // El usuario debe reemplazar esto
const API_KEY = "WANDA_SECRET_KEY_2024";

export async function fetchGS(action: string, data?: any) {
    const url = `${API_URL}?action=${action}&key=${API_KEY}`;

    if (data) {
        // POST request
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                key: API_KEY,
                action,
                data
            })
        });
        return response.json();
    } else {
        // GET request
        const response = await fetch(url);
        return response.json();
    }
}

export const wandaApi = {
    getCatalog: () => fetchGS('get_catalog'),
    getClients: () => fetchGS('get_clients'),
    getOrders: () => fetchGS('get_orders'),
    getAll: () => fetchGS('get_all'),
    createOrder: (order: any) => fetchGS('create_order', order),
    submitOrder: (order: any) => fetchGS('create_order', order),
    updateStatus: (id: string, status: string) => fetchGS('update_order_status', { id, status }),
    saveProduct: (product: any) => fetchGS('save_product', product),
    saveClient: (client: any) => fetchGS('save_client', client),
    deleteProduct: (id: string) => fetchGS('delete_product', { id }),
    bulkUpdateProducts: (changes: any[]) => fetchGS('bulk_update_products', changes),
    getConfig: () => fetchGS('get_config'),
    saveConfig: (config: any) => fetchGS('save_config', config),
    deleteClient: (id: string) => fetchGS('delete_client', { id }),
    // Log├¡stica
    asignarRepartoMasivo: (ids: string[], reparto: string) => fetchGS('asignar_reparto_masivo', { ids, reparto }),
    liberarReparto: (reparto: string) => fetchGS('liberar_reparto', { reparto }),
    saveOrderCorrection: (order: any) => fetchGS('guardar_correccion_pedido', order),
    liquidarRuta: (data: any) => fetchGS('liquidar_ruta', data),
    revertLiquidacion: (id: string) => fetchGS('revert_liquidacion', { id }),
    verifyLogin: (role: string, password: string) => fetchGS('verify_login', { role, password }),
};
