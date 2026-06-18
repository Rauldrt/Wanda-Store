export interface Product {
    id: string;
    ID_Producto: string;
    Nombre: string;
    Categoria?: string;
    Precio_Unitario: number | string;
    Stock_Actual: number | string;
    Unidad?: string;
    Peso_Promedio?: number | string;
    Unidades_Bulto?: number | string;
    Es_Oferta?: boolean | string;
    Nota_Oferta?: string;
    Precio_Decant?: number | string;
    Stock_Decant?: number | string;
    Volumen_Decant?: string;
    [key: string]: unknown;
}

export interface Client {
    id: string;
    ID_Cliente: string;
    Nombre_Negocio: string;
    Direccion?: string;
    Telefono?: string;
    Ubicacion?: string;
    Es_Online?: boolean;
    Email?: string;
    Zona?: string;
    Vendedor_Asignado?: string;
    [key: string]: unknown;
}

export interface OrderItem {
    id_producto: string;
    id?: string;
    id_prod?: string;
    nombre: string;
    cantidad: number;
    precio: number;
    subtotal: number;
    descripcion?: string;
    esBulto?: boolean;
    picking_format?: string;
    total_unidades?: number;
    total_bultos?: number;
    fracciones_bulto?: string;
    esDecant?: boolean;
    decantVolumen?: string;
}

export interface Order {
    id: string;
    fecha: string;
    cliente_id: string;
    cliente_nombre: string;
    vendedor: string;
    total: number;
    estado: string;
    reparto: string;
    notas?: string;
    notas_logistica?: string;
    gps?: string;
    descuento_general?: number;
    items: OrderItem[];
    [key: string]: unknown;
}

export interface Seller {
    id: string;
    ID_Preventista: string;
    Nombre: string;
    Zona?: string;
    [key: string]: unknown;
}

export interface Liquidation {
    id: string;
    ID_LIQ: string;
    FECHA: string;
    REPARTO: string;
    CHOFER?: string;
    EFECTIVO: number;
    TRANSF: number;
    GASTOS: number;
    CUENTAS_CORRIENTES: number;
    DEVOLUCIONES: number;
    TOTAL_NETO: number;
    OBS?: string;
    ORDENES_JSON: string;
    DRAFT_JSON: string;
    [key: string]: unknown;
}

export interface ClientRequest {
    id: string;
    Nombre_Negocio: string;
    Email?: string;
    Telefono?: string;
    Direccion?: string;
    Ubicacion?: string;
    origen?: string;
    fecha_pedido?: string;
    id_pedido?: string;
    [key: string]: unknown;
}

export interface WandaConfig {
    EMPRESA?: string;
    REMITO_TITULO?: string;
    REMITO_DIRECCION?: string;
    REMITO_TELEFONO?: string;
    AUTH_ADMIN_PASSWORD?: string;
    AUTH_PREVENTA_PASSWORD?: string;
    SHOW_DASHBOARD?: string | boolean;
    SHOW_LOGISTICS?: string | boolean;
    APP_LOGO?: string;
    APP_TAGLINE?: string;
    CAROUSEL_MODE?: string;
    MP_ACCESS_TOKEN?: string;
    MP_PUBLIC_KEY?: string;
    MP_SANDBOX?: string | boolean;
    ASTROPAY_CLIENT_ID?: string;
    ASTROPAY_CLIENT_SECRET?: string;
    ASTROPAY_SANDBOX?: string | boolean;
    ASTROPAY_CURRENCY?: string;
    ENABLE_MERCADOPAGO?: string | boolean;
    ENABLE_ASTROPAY?: string | boolean;
    CONTACT_WHATSAPP?: string;
    SOCIAL_INSTAGRAM?: string;
    SOCIAL_FACEBOOK?: string;
    SOCIAL_TIKTOK?: string;
    SYSTEM_NOTIFICATIONS?: string;
    SYSTEM_PROMOTIONS?: string;
    SYSTEM_CAROUSEL?: string;
    SYSTEM_CAROUSEL_FEATURES?: string;
    [key: string]: unknown;
}
