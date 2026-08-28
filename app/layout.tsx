import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { PwaRegister } from "./pwa-register";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "RevScale PropertyOS | Inteligencia comercial inmobiliaria",
  description: "RevScale PropertyOS prioriza oportunidades, organiza seguimientos, conecta demanda con propiedades y da visibilidad comercial a equipos inmobiliarios.",
  keywords: ["RevScale", "inteligencia comercial inmobiliaria", "CRM inmobiliario", "software inmobiliario", "seguimiento de leads", "matching inmobiliario"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RevScale",
  },
  openGraph: {
    title: "RevScale PropertyOS | Inteligencia comercial inmobiliaria",
    description: "Menos leads perdidos. Más operaciones avanzando. Priorizá qué oportunidad mover ahora y qué hacer después.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#302d28",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <PwaRegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
