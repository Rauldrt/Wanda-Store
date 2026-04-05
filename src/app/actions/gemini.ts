"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function analyzeProductImage(base64Image: string) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Analiza esta imagen de un producto y extrae la siguiente información en formato JSON:
            - nombre: Nombre comercial del producto (claro y conciso).
            - categoria: Categoría a la que pertenece (limpieza, fiambrería, lácteos, etc.).
            - precio_costo: Un valor numérico estimado de costo (si no hay, pon 0).
            - precio_venta: Un valor numérico estimado de venta (si no hay, pon 0).
            - unidad: Unidad de medida (ej: Unidad, Kg, Pack de 6, etc.).
            - descripcion: Una descripción breve del producto.
            - stock_minimo: Sugerir un stock mínimo (ej: 10).
            
            Responde ÚNICAMENTE con el objeto JSON, sin markdown ni explicaciones.
        `;

        // Remove prefix if present (data:image/jpeg;base64,)
        const base64Data = base64Image.split(",")[1] || base64Image;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg"
                }
            }
        ]);

        const response = result.response;
        const text = response.text();
        
        // Clean up text if Gemini adds markdown
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        return JSON.parse(text);
    } catch (error: any) {
        console.error("Gemini analysis error:", error);
        throw new Error(error.message);
    }
}
