"use client";

import Script from "next/script";
import { useState } from "react";

type PaddlePaymentLinkApi = {
  Environment?: { set: (environment: "sandbox") => void };
  Initialize: (options: {
    token: string;
    checkout?: { settings?: { theme?: "light"; displayMode?: "overlay" } };
  }) => void;
};

type PaddlePaymentLinkWindow = Window & {
  Paddle?: PaddlePaymentLinkApi;
  __revscalePaymentLinkPaddleInitialized?: boolean;
};

export function PaddlePaymentLinkLoader({
  clientToken,
  environment,
}: {
  clientToken?: string;
  environment: "sandbox" | "production";
}) {
  const [error, setError] = useState("");

  function initialize() {
    const paddleWindow = window as PaddlePaymentLinkWindow;
    const paddle = paddleWindow.Paddle;
    if (!paddle || !clientToken || paddleWindow.__revscalePaymentLinkPaddleInitialized) return;
    try {
      if (environment === "sandbox") paddle.Environment?.set("sandbox");
      paddle.Initialize({
        token: clientToken,
        checkout: { settings: { theme: "light", displayMode: "overlay" } },
      });
      paddleWindow.__revscalePaymentLinkPaddleInitialized = true;
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
