"use client";

import Script from "next/script";
import { useState } from "react";

type PaddleCheckout = {
  Environment?: { set: (environment: "sandbox") => void };
  Initialize: (options: { token: string }) => void;
  Checkout: {
    open: (options: {
      items: Array<{ priceId: string; quantity: number }>;
      customData: Record<string, string>;
      settings: { theme: "light"; displayMode: "overlay"; successUrl: string };
    }) => void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleCheckout;
    __revscalePaddleInitialized?: boolean;
  }
}

export function PaddleCheckoutButton({
  requestId,
  plan,
  billingCycle,
  priceId,
  clientToken,
  environment,
}: {
  requestId: string;
  plan: string;
  billingCycle: "MONTHLY" | "ANNUAL";
  priceId?: string;
  clientToken?: string;
  environment: "sandbox" | "production";
}) {
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState("");
  const enabled = Boolean(priceId && clientToken);

  function initialize() {
    if (!window.Paddle || !clientToken || window.__revscalePaddleInitialized) return;
    if (environment === "sandbox") window.Paddle.Environment?.set("sandbox");
    window.Paddle.Initialize({ token: clientToken });
    window.__revscalePaddleInitialized = true;
  }

  function openCheckout() {
    setError("");
    if (!enabled) {
      setError("El checkout está preparado, pero todavía falta activar la cuenta de cobro de RevScale.");
      return;
    }
    if (!window.Paddle || !scriptReady) {
      setError("El checkout todavía se está cargando. Probá nuevamente.");
      return;
    }

    initialize();
    const successUrl = `${window.location.origin}/request/success?payment=processing&plan=${encodeURIComponent(plan)}&cycle=${billingCycle}`;
    window.Paddle.Checkout.open({
      items: [{ priceId: priceId!, quantity: 1 }],
      customData: {
        revscale_plan_request_id: requestId,
        revscale_plan: plan,
        revscale_billing_cycle: billingCycle,
      },
      settings: { theme: "light", displayMode: "overlay", successUrl },
    });
  }

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptReady(true);
          initialize();
        }}
      />
      <button
        type="button"
        onClick={openCheckout}
        className="w-full rounded-xl bg-[#2f2b25] px-5 py-3 font-semibold text-[#fffaf2] transition hover:bg-[#1f1c18] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {enabled ? "Pagar y activar suscripción" : "Checkout preparado · pendiente de activación"}
      </button>
      {error && <p className="mt-3 text-sm leading-6 text-[#9a4f45]">{error}</p>}
    </>
  );
}
