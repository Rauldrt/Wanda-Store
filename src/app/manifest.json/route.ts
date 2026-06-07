import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  let name = "Wanda Store";
  let shortName = "Wanda Store";
  let logoUrl = "/icon-192.png";
  let logo512Url = "/icon-512.png";
  let appleIconUrl = "/apple-icon.png";

  try {
    const cfgRef = await getDoc(doc(db, "settings", "global"));
    if (cfgRef.exists()) {
      const config = cfgRef.data();
      if (config.EMPRESA) {
        name = config.EMPRESA;
        shortName = config.EMPRESA;
      }
      if (config.APP_LOGO) {
        logoUrl = config.APP_LOGO;
        logo512Url = config.APP_LOGO;
        appleIconUrl = config.APP_LOGO;
      }
    }
  } catch (e) {
    console.error("Error generating dynamic manifest:", e);
  }

  const manifest = {
    name: name,
    short_name: shortName,
    description: "Panel de Administración y Aplicación de Preventa",
    start_url: "/login",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#6366f1",
    icons: [
      {
        src: logoUrl,
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: logo512Url,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: appleIconUrl,
        sizes: "512x512",
        type: "image/png"
      }
    ],
    orientation: "portrait",
    scope: "/"
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=0, must-revalidate"
    }
  });
}
