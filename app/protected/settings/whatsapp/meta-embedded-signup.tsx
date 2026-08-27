"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, LoaderCircle, MessageCircle } from "lucide-react";
import { completeWhatsAppEmbeddedSignup } from "./actions";

type FacebookLoginResponse = {
  authResponse?: { code?: string };
  status?: string;
  error?: string;
  error_reason?: string;
  error_code?: number | string;
  error_message?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (options: Record<string, unknown>) => void;
      login: (callback: (response: FacebookLoginResponse) => void, options: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
  }
}

type SessionInfo = {
  type?: string;
  event?: string;
  data?: {
    waba_id?: string;
    phone_number_id?: string;
    business_id?: string;
    current_step?: string;
  };
};

function loginFailureMessage(response: FacebookLoginResponse) {
  const providerMessage = String(response.error_message || response.error_reason || response.error || "").trim();
  const code = response.error_code ? ` (Meta ${response.error_code})` : "";
  if (providerMessage) return `Meta no completó la autorización${code}: ${providerMessage}`;
  if (response.status === "not_authorized") return "La cuenta de Facebook no autorizó RevScale para administrar WhatsApp.";
  if (response.status === "unknown") return "Meta no pudo completar el inicio de sesión. Revisá la cuenta y los permisos de la app.";
  return "No se completó la autorización de Meta. Si cerraste la ventana, volvé a intentarlo.";
}

export function MetaEmbeddedSignup({ appId, configId, connectedPhone }: { appId: string; configId: string; connectedPhone?: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [successPhone, setSuccessPhone] = useState<string | null>(null);
  const codeRef = useRef<string | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);
  const submittedRef = useRef(false);

  const finishIfReady = () => {
    const code = codeRef.current;
    const session = sessionRef.current;
    const wabaId = String(session?.data?.waba_id || "");
    if (!code || !wabaId || submittedRef.current) return;
    submittedRef.current = true;
    setStatus("Protegiendo credenciales y vinculando el número…");
    startTransition(async () => {
      const result = await completeWhatsAppEmbeddedSignup({
        code,
        wabaId,
        phoneNumberId: session?.data?.phone_number_id || null,
      });
      if (!result.ok) {
        submittedRef.current = false;
        setStatus(result.error || "No se pudo completar la conexión con Meta.");
        return;
      }
      setSuccessPhone(result.phone || connectedPhone || "WhatsApp Business");
      setStatus("Cuenta conectada. RevScale está esperando el primer evento de Meta para verificar el webhook.");
      window.setTimeout(() => window.location.reload(), 1200);
    });
  };

  useEffect(() => {
    const init = () => {
      if (!window.FB) return;
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version: "v24.0" });
      setSdkReady(true);
    };

    window.fbAsyncInit = init;
    const existing = document.getElementById("facebook-jssdk");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      document.body.appendChild(script);
    } else if (window.FB) {
      init();
    }

    const onMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith("facebook.com")) return;
      let data: SessionInfo | null = null;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (data?.data?.current_step) {
        setStatus("Conexión cancelada antes de finalizar.");
        return;
      }
      sessionRef.current = data;
      finishIfReady();
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // Meta SDK is initialized once for the fixed RevScale app/config pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const connect = () => {
    if (!window.FB || !sdkReady || isPending) return;
    codeRef.current = null;
    sessionRef.current = null;
    submittedRef.current = false;
    setSuccessPhone(null);
    setStatus("Abrimos Meta para que autorices tu cuenta de WhatsApp Business…");
    window.FB.login(
      (response) => {
        const code = String(response?.authResponse?.code || "");
        if (!code) {
          setStatus(loginFailureMessage(response || {}));
          return;
        }
        codeRef.current = code;
        finishIfReady();
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          sessionInfoVersion: "3",
          version: "v4",
          features: [],
        },
      }
    );
  };

  return (
    <section className="rounded-xl border border-[#cdbfa9] bg-[#f7f0e6] p-6 shadow-[0_18px_45px_rgba(72,58,40,0.05)]">
      <div className="flex items-start gap-4">
        <div className="rounded-lg border border-[#cdbfa9] bg-[#eee4d5] p-2.5 text-[#705f47]"><MessageCircle size={20} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#806d50]">Conexión administrada</p>
          <h2 className="mt-2 font-serif text-xl font-medium text-[#37332d]">Conectar WhatsApp con Meta</h2>
          <p className="mt-2 text-sm leading-6 text-[#665f56]">La inmobiliaria autoriza su cuenta en Meta y RevScale configura el canal automáticamente. No necesita copiar tokens, abrir Supabase ni usar herramientas de desarrollador.</p>
          <button type="button" onClick={connect} disabled={!sdkReady || isPending} className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#302d28] px-5 py-2.5 text-sm font-semibold !text-[#fffaf2] disabled:cursor-not-allowed disabled:opacity-55">
            {isPending ? <LoaderCircle size={16} className="animate-spin" /> : successPhone ? <CheckCircle2 size={16} /> : <ExternalLink size={16} />}
            {connectedPhone ? "Reconectar con Meta" : "Conectar con Meta"}
          </button>
          {status && <p className={`mt-3 text-xs leading-5 ${successPhone ? "text-[#536048]" : "text-[#716a60]"}`}>{status}</p>}
        </div>
      </div>
    </section>
  );
}
