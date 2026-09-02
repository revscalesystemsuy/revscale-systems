"use client";

import Link from "next/link";

const CONSENT_KEY = "revscale_marketing_consent_v1";

export default function CookiesPage() {
  function managePreferences() {
    window.localStorage.removeItem(CONSENT_KEY);
    window.dispatchEvent(new Event("revscale:cookie-preferences"));
  }

  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-12 text-[#302d28] md:px-8 md:py-16">
      <article className="mx-auto max-w-4xl rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 shadow-[0_24px_70px_rgba(70,58,42,.08)] md:p-10">
        <header className="border-b border-[#ddd1c1] pb-7">
          <Link href="/" className="text-sm font-semibold text-[#6d5c45] hover:text-[#302d28]">RevScale Systems</Link>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Privacidad · versión 2026-09-01</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Política de cookies y medición</h1>
          <p className="mt-4 text-sm leading-6 text-[#6d665d]">Última actualización: 1 de septiembre de 2026</p>
        </header>

        <div className="mt-8 space-y-8 text-[15px] leading-7 text-[#554f47]">
          <Section title="1. Qué utiliza RevScale"><p>PropertyOS y los sitios de RevScale pueden utilizar cookies, almacenamiento local u otras tecnologías equivalentes para mantener sesiones, seguridad, preferencias de interfaz y decisiones de privacidad. Algunos de estos elementos son necesarios para que el servicio funcione correctamente.</p></Section>
          <Section title="2. Medición opcional"><p>En páginas públicas podemos utilizar Meta Pixel u otras herramientas de medición publicitaria únicamente después de que la persona elija “Aceptar”. Estas herramientas pueden registrar eventos como una visita de página para ayudarnos a medir campañas o crear audiencias de retargeting.</p><p className="mt-3">La medición publicitaria no se carga en rutas autenticadas de PropertyOS y no utilizamos conversaciones privadas de WhatsApp ni bases de leads de organizaciones clientes para construir audiencias publicitarias de RevScale.</p></Section>
          <Section title="3. Rechazar"><p>Podés rechazar la medición opcional y seguir utilizando las páginas públicas. Rechazar no afecta las funciones estrictamente necesarias del sitio ni el acceso a PropertyOS.</p></Section>
          <Section title="4. Cambiar tu decisión"><p>Podés volver a abrir el selector en cualquier momento. Al modificar la preferencia, la nueva decisión se aplica a futuras cargas de la herramienta. Es posible que datos ya enviados legítimamente antes del cambio no puedan retirarse de forma retroactiva desde el navegador.</p><button type="button" onClick={managePreferences} className="mt-4 rounded-xl bg-[#302d28] px-5 py-3 text-sm font-semibold text-[#fffaf2]">Gestionar preferencias de cookies</button></Section>
          <Section title="5. Proveedores"><p>Cuando se habilita medición opcional, Meta puede recibir información técnica conforme a sus propias condiciones y políticas. RevScale describe el tratamiento general y los proveedores relevantes en su <Link href="/privacy" className="font-semibold text-[#6d5c45] underline underline-offset-4">Política de privacidad</Link>.</p></Section>
          <Section title="6. Contacto"><p>Para consultas sobre estas preferencias podés escribir temporalmente a <a href="mailto:rominamendez456@gmail.com" className="font-semibold text-[#6d5c45] underline underline-offset-4">rominamendez456@gmail.com</a>, hasta que quede habilitado el correo corporativo.</p></Section>
        </div>

        <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#ddd1c1] pt-6 text-sm text-[#6d665d]">
          <Link href="/privacy" className="hover:text-[#302d28]">Política de privacidad</Link>
          <Link href="/terms" className="hover:text-[#302d28]">Condiciones del servicio</Link>
          <Link href="/data-deletion" className="hover:text-[#302d28]">Derechos y eliminación</Link>
        </footer>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-serif text-2xl font-medium text-[#37322b]">{title}</h2><div className="mt-3">{children}</div></section>;
}
