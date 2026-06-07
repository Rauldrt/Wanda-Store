import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/context/DataContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ClientLayout from "@/components/ClientLayout";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  let title = "Wanda Store";
  let description = "Sistema de gestión inteligente para Wanda Lácteos";
  let logoUrl = "/icon.png";

  try {
    const cfgRef = await getDoc(doc(db, "settings", "global"));
    if (cfgRef.exists()) {
      const config = cfgRef.data();
      if (config.EMPRESA) {
        title = config.EMPRESA;
      }
      if (config.APP_LOGO) {
        logoUrl = config.APP_LOGO;
      }
    }
  } catch (e) {
    console.error("Error generating metadata in root layout:", e);
  }

  return {
    title,
    description,
    manifest: "/manifest.json",
    icons: {
      icon: logoUrl,
      apple: logoUrl,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: title,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  };
}

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="antialiased">
      <body suppressHydrationWarning className={`${inter.className} min-h-screen bg-[var(--background)]`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DataProvider>
            <ClientLayout>{children}</ClientLayout>
          </DataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
