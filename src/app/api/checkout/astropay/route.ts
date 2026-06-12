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

        // Obtener credenciales de AstroPay desde Firestore
        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        if (!settingsSnap.exists()) {
            return NextResponse.json({ error: "Configuración global no encontrada." }, { status: 500 });
        }

        const config = settingsSnap.data();
        const clientId = config.ASTROPAY_CLIENT_ID;
        const clientSecret = config.ASTROPAY_CLIENT_SECRET;
        const isSandbox = config.ASTROPAY_SANDBOX === "true";
        const currency = config.ASTROPAY_CURRENCY || "ARS";

        const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;

        // Calcular el total
        const totalAmount = items.reduce((acc: number, item: any) => {
            const unitPrice = parseFloat(item.precio || item.Precio_Unitario || 0);
            const qty = parseInt(String(item.cantidad), 10) || 1;
            return acc + (unitPrice * qty);
        }, 0);

        // Si no hay credenciales configuradas, simular el flujo en sandbox para pruebas locales/staging
        if (!clientId || !clientSecret) {
            console.log("AstroPay: No se detectaron credenciales. Utilizando flujo de Sandbox Mock.");
            // Retornamos un link de simulación local
            const mockUrl = `${origin}/tienda?astropay_status=approved&order_id=${orderId}`;
            return NextResponse.json({
                isMock: true,
                initPoint: mockUrl
            });
        }

        // Definir Base URLs
        const baseAuthUrl = isSandbox 
            ? "https://partners-api-sandbox.astropay.com" 
            : "https://partners-api.astropay.com";

        const basePaymentsUrl = isSandbox
            ? "https://partners-api-sandbox.astropay.com"
            : "https://partners-api.astropay.com";

        // 1. Obtener Token de Acceso (OAuth 2.0)
        let accessToken = "";
        try {
            const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
            const tokenRes = await fetch(`${baseAuthUrl}/v1/partners/oauth/token`, {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${authHeader}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: "grant_type=client_credentials"
            });

            if (!tokenRes.ok) {
                const errText = await tokenRes.text();
                throw new Error(`Error en auth AstroPay: ${errText}`);
            }

            const tokenData = await tokenRes.json();
            accessToken = tokenData.access_token;
        } catch (authError: any) {
            console.error("AstroPay Auth Error:", authError);
            // Fallback a simulación si estamos en sandbox y falló la auth por credenciales incorrectas
            if (isSandbox) {
                console.log("AstroPay Auth falló en Sandbox. Retornando Mock URL de pruebas.");
                const mockUrl = `${origin}/tienda?astropay_status=approved&order_id=${orderId}`;
                return NextResponse.json({
                    isMock: true,
                    initPoint: mockUrl
                });
            }
            return NextResponse.json({ error: "Error de autenticación con AstroPay", details: authError.message }, { status: 500 });
        }

        // 2. Crear transacción/depósito en AstroPay
        // Enviamos múltiples campos identificadores comunes y redirecciones defensivas para compatibilidad
        const paymentPayload = {
            amount: parseFloat(totalAmount.toFixed(2)),
            currency: currency,
            merchant_payment_id: orderId,
            pos_external_id: orderId,
            merchant_deposit_id: orderId,
            type: "STATIC_ASTROPAY",
            callback_url: `${origin}/api/checkout/astropay/callback`,
            redirect_url: `${origin}/tienda?astropay_status=approved&order_id=${orderId}`,
            return_url: `${origin}/tienda?astropay_status=approved&order_id=${orderId}`,
            user: {
                merchant_user_id: cliente.email || "guest",
                email: cliente.email || "noreply@wanda-store.com",
                phone: cliente.telefono || ""
            },
            product: {
                description: `Compra en Wanda Store - Orden #${orderId}`
            }
        };

        const paymentRes = await fetch(`${basePaymentsUrl}/v1/payments`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(paymentPayload)
        });

        if (!paymentRes.ok) {
            const errText = await paymentRes.text();
            console.error("AstroPay Payments API Error:", errText);
            
            // Fallback defensivo para desarrollo
            if (isSandbox) {
                console.log("AstroPay Payments falló en Sandbox. Retornando Mock URL de pruebas.");
                const mockUrl = `${origin}/tienda?astropay_status=approved&order_id=${orderId}`;
                return NextResponse.json({
                    isMock: true,
                    initPoint: mockUrl
                });
            }

            return NextResponse.json({ error: "Error al crear pago en AstroPay", details: errText }, { status: 500 });
        }

        const paymentData = await paymentRes.json();

        // Extraer URL de pago de manera sumamente defensiva
        const checkoutUrl = paymentData.redirect_data?.url || paymentData.redirect_url || paymentData.init_point || paymentData.url;

        if (!checkoutUrl) {
            console.error("AstroPay Response missing redirect URL:", paymentData);
            return NextResponse.json({ error: "AstroPay no retornó una URL de redirección válida." }, { status: 500 });
        }

        return NextResponse.json({
            depositId: paymentData.deposit_external_id || paymentData.payment_id || "",
            initPoint: checkoutUrl
        });

    } catch (error: any) {
        console.error("AstroPay Checkout Route Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
