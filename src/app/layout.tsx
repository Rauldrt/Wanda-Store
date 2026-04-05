import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/context/DataContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wanda Store",
  description: "Sistema de gestión inteligente para Wanda Lácteos",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png?v=2",
    apple: "/apple-icon.png?v=2",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Wanda Store",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

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
