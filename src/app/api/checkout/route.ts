import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { items, cliente, orderId } = body;

        if (!items || !cliente || !orderId) {
            return NextResponse.json({ error: "Faltan datos obligatorios (items, cliente, orderId)" }, { status: 400 });
        }

        // Obtener credenciales de Mercado Pago desde Firestore
        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        if (!settingsSnap.exists()) {
            return NextResponse.json({ error: "Configuración global no encontrada en la base de datos." }, { status: 500 });
        }

        const config = settingsSnap.data();
        const accessToken = config.MP_ACCESS_TOKEN;
        const isSandbox = config.MP_SANDBOX === "true";

        if (!accessToken) {
            return NextResponse.json({ error: "Mercado Pago no está configurado (Access Token faltante)." }, { status: 500 });
        }

        const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;

        // Mapear items al formato requerido por Mercado Pago
        const mpItems = items.map((item: any) => {
            const unitPrice = parseFloat(item.precio || item.Precio_Unitario || 0);
            return {
                id: String(item.id || item.ID_Producto || ""),
                title: String(item.nombre || item.Nombre || "Producto"),
                quantity: parseInt(String(item.cantidad), 10) || 1,
                unit_price: unitPrice,
                currency_id: "ARS"
            };
        });

        // Crear preferencia en Mercado Pago
        const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                items: mpItems,
                payer: {
                    name: cliente.name || cliente.cliente_nombre || "",
                    email: cliente.email || ""
                },
                back_urls: {
                    success: `${origin}/tienda?mp_status=approved&order_id=${orderId}`,
                    pending: `${origin}/tienda?mp_status=pending&order_id=${orderId}`,
                    failure: `${origin}/tienda?mp_status=failure&order_id=${orderId}`
                },
                auto_return: "all",
                external_reference: orderId
            })
        });

        if (!mpResponse.ok) {
            const errText = await mpResponse.text();
            console.error("Mercado Pago API error:", errText);
            return NextResponse.json({ error: "Error al comunicarse con Mercado Pago", details: errText }, { status: 500 });
        }

        const preference = await mpResponse.json();

        // Elegir init_point según el modo sandbox
        const checkoutUrl = isSandbox ? preference.sandbox_init_point : preference.init_point;

        return NextResponse.json({
            preferenceId: preference.id,
            initPoint: checkoutUrl
        });

    } catch (error: any) {
        console.error("Checkout API error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
