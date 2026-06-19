import { NextResponse } from "next/server";

const CATEGORY_MAP: Record<string, string> = {
    "MASCULINOS": "https://sites.google.com/view/wandaessence-catalogo-virtual/masculinos",
    "FEMENINOS": "https://sites.google.com/view/wandaessence-catalogo-virtual/femeninos",
    "UNISEX": "https://sites.google.com/view/wandaessence-catalogo-virtual/unisex",
    "INFANTILES": "https://sites.google.com/view/wandaessence-catalogo-virtual/infantiles",
    "CUIDADO PERSONAL": "https://sites.google.com/view/wandaessence-catalogo-virtual/cuidado-personal",
    "PARA EL HOGAR": "https://sites.google.com/view/wandaessence-catalogo-virtual/hogar"
};

function cleanProductName(text: string): string {
    let name = text.trim();
    const prefixRegex = /^hola\s+quiero\s+el\s+(?:perfume\s+o\s+decants?|perfumes?|decants?)\s+(?:del?\s+perfume\s+|del?\s+|de\s+la\s+|de\s+)/i;
    name = name.replace(prefixRegex, "");
    name = name.replace(/\.+$/, "").trim();
    return name;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { categories } = body;

        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            return NextResponse.json({ error: "Faltan categorías a extraer." }, { status: 400 });
        }

        const allProducts: any[] = [];
        const seenNames = new Set<string>();

        for (const category of categories) {
            const url = CATEGORY_MAP[category.toUpperCase()];
            if (!url) continue;

            try {
                const response = await fetch(url, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }
                });

                if (!response.ok) {
                    console.error(`Error fetching category ${category}: ${response.statusText}`);
                    continue;
                }

                const html = await response.text();
                const sections = html.split(/<section\b/i);

                for (let i = 1; i < sections.length; i++) {
                    const section = sections[i];

                    // Extraer imagen src
                    const imgMatch = section.match(/<img\b[^>]*src="([^"]+)"/i);
                    if (!imgMatch) continue;
                    const imgSrc = imgMatch[1];

                    // Extraer WhatsApp link
                    const linkRegex = /href="https:\/\/www\.google\.com\/url\?q=([^"&]+)/gi;
                    let match;
                    let waText = "";

                    while ((match = linkRegex.exec(section)) !== null) {
                        const decodedUrl = decodeURIComponent(match[1]);
                        if (decodedUrl.includes("wa.me") && decodedUrl.includes("text=")) {
                            try {
                                const urlObj = new URL(decodedUrl);
                                const textParam = urlObj.searchParams.get("text");
                                if (textParam) {
                                    waText = textParam;
                                    break;
                                }
                            } catch (e) {
                                // Fallback manual parsing if URL constructor fails
                                const textMatch = decodedUrl.match(/[?&]text=([^&]+)/);
                                if (textMatch) {
                                    waText = decodeURIComponent(textMatch[1]);
                                    break;
                                }
                            }
                        }
                    }

                    if (imgSrc && waText) {
                        const cleanedName = cleanProductName(waText);
                        if (!cleanedName) continue;

                        const nameKey = cleanedName.toLowerCase();
                        if (seenNames.has(nameKey)) continue;
                        seenNames.add(nameKey);

                        // Generar SKU determinista basado en el nombre
                        const slug = cleanedName
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/(^-|-$)/g, "")
                            .substring(0, 25);
                        
                        const rand = Math.floor(1000 + Math.random() * 9000);
                        const id = `PROD-${slug.toUpperCase()}-${rand}`;

                        allProducts.push({
                            ID_Producto: id,
                            Nombre: cleanedName,
                            Categoria: category.toUpperCase(),
                            Precio_Unitario: 0,
                            Costo: 0,
                            Stock_Actual: 0,
                            Imagen_URL: imgSrc,
                            Unidad: "Unid"
                        });
                    }
                }
            } catch (err) {
                console.error(`Error scraping category ${category}:`, err);
            }
        }

        return NextResponse.json({ products: allProducts });
    } catch (error: any) {
        console.error("Error general en API de scraping:", error);
        return NextResponse.json({ error: error.message || "Error al realizar scraping." }, { status: 500 });
    }
}
