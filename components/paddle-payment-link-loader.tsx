"use client";

import Script from "next/script";
import { useState } from "react";

type PaddleCheckout = {
  Environment?: { set: (environment: "sandbox") => void };
  Initialize: (options: {
    token: string;
    checkout?: { settings?: { theme?: "light"; displayMode?: "overlay" } };
  }) => void;
};

declare global {
  interface Window {
    Paddle?: PaddleCheckout;
    __revscalePaymentLinkPaddleInitialized?: boolean;
  }
}

export function PaddlePaymentLinkLoader({
  clientToken,
  environment,
}: {
  clientToken?: string;
  environment: "sandbox" | "production";
}) {
  const [error, setError] = useState("");

  function initialize() {
    if (!window.Paddle || !clientToken || window.__revscalePaymentLinkPaddleInitialized) return;
    try {
      if (environment === "sandbox") window.Paddle.Environment?.set("sandbox");
      window.Paddle.Initialize({
        token: clientToken,
        checkout: { settings: { theme: "light", displayMode: "overlay" } },
      });
      window.__revscalePaymentLinkPaddleInitialized = true;
    } catch {
      setError("No se pudo inicializar el checkout. Volvé a intentar desde RevScale.");
    }
  }

  if (!clientToken) {
    return <p className="text-sm text-[#8b4c43]">El checkout todavía no está configurado.</p>;
  }

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={initialize}
        onError={() => setError("No se pudo cargar el checkout. Probá nuevamente.")}
      />
      {error ? (
        <p className="text-sm text-[#8b4c43]">{error}</p>
      ) : (
        <p className="text-sm leading-6 text-[#716a61]">
          Estamos preparando el checkout seguro. Si llegaste desde un enlace de pago de Paddle, se abrirá automáticamente.
        </p>
      )}
    </>
  );
}
