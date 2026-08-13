import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";



const defaultUrl =
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";





export const metadata: Metadata = {

  metadataBase:
    new URL(defaultUrl),


  title:
    "RevScale Systems",


  description:
    "Plataforma de inteligencia comercial con IA para inmobiliarias.",


  keywords:[
    "RevScale",
    "inteligencia artificial",
    "CRM inmobiliario",
    "ventas inmobiliarias",
    "matching IA"
  ],


  openGraph:{
    title:
      "RevScale Systems",

    description:
      "Transformá tu inmobiliaria con inteligencia artificial.",

    type:
      "website"
  }

};







const geistSans = Geist({

  variable:
    "--font-geist-sans",

  display:
    "swap",

  subsets:[
    "latin"
  ],

});








export default function RootLayout({

  children,

}: Readonly<{

  children:
    React.ReactNode;

}>) {


  return (

    <html
      lang="es"
      suppressHydrationWarning
    >


      <body
        className={`
        ${geistSans.className}
        antialiased
        `}
      >


        <ThemeProvider

          attribute="class"

          defaultTheme="system"

          enableSystem

          disableTransitionOnChange

        >


          {children}


        </ThemeProvider>


      </body>


    </html>

  );

}