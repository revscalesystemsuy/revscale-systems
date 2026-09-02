"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const CONSENT_KEY = "revscale_marketing_consent_v1";

export function MetaPixelConsent() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<"accepted" | "rejected" | null>(null);
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const privateRoute = pathname?.startsWith("/protected") || pathname?.startsWith("/auth");

  useEffect(() => {
    const sync = () => {
      const stored = window.localStorage.getItem(CONSENT_KEY);
      if (stored === "accepted" || stored === "rejected") setConsent(stored);
      else setConsent(null);
    };
    sync();
    window.addEventListener("revscale:cookie-preferences", sync);
    return () => window.removeEventListener("revscale:cookie-preferences", sync);
  }, []);

  if (privateRoute || !pixelId) return null;

  function accept() {
    window.localStorage.setItem(CONSENT_KEY, "accepted");
    setConsent("accepted");
  }

  function reject() {
    window.localStorage.setItem(CONSENT_KEY, "rejected");
    setConsent("rejected");
    // Reload removes a Pixel that may already have been loaded under prior consent.
    window.location.reload();
  }

  function reopen() {
    window.localStorage.removeItem(CONSENT_KEY);
    setConsent(null);
  }

  return (
    <>
      {consent === "accepted" ? (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
          </Script>
          <noscript><img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`} alt="" /></noscript>
        </>
      ) : null}

      {consent === null ? (
        <div className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-[#c9baa4] bg-[#fffaf2] p-4 shadow-2xl md:flex md:items-center md:justify-between md:gap-6">
          <p className="text-sm leading-6 text-[#5e574e]">Usamos medición publicitaria opcional para saber si nuestras páginas y demos ayudan a generar conversaciones. Solo se activa si aceptás. <Link href="/cookies" className="font-semibold underline underline-offset-2">Ver detalles</Link>.</p>
          <div className="mt-3 flex shrink-0 gap-2 md:mt-0">
            <button onClick={reject} className="rounded-xl border border-[#c9baa4] px-4 py-2 text-sm font-semibold text-[#4e4942]">Rechazar</button>
            <button onClick={accept} className="rounded-xl bg-[#302d28] px-4 py-2 text-sm font-semibold text-white">Aceptar</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={reopen} className="fixed bottom-3 left-3 z-[90] rounded-full border border-[#c9baa4] bg-[#fffaf2]/95 px-3 py-2 text-[11px] font-semibold text-[#5e574e] shadow-lg backdrop-blur">Cookies</button>
      )}
    </>
  );
}
