import Link from "next/link";

export const metadata = {
  title: "Derechos y eliminación de datos | RevScale Systems",
  description: "Instrucciones para ejercer derechos de privacidad y solicitar eliminación de datos en RevScale Systems.",
};

const updatedAt = "1 de septiembre de 2026";

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-12 text-[#302d28] md:px-8 md:py-16">
      <article className="mx-auto max-w-4xl rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 shadow-[0_24px_70px_rgba(70,58,42,.08)] md:p-10">
        <header className="border-b border-[#ddd1c1] pb-7">
          <Link href="/" className="text-sm font-semibold text-[#6d5c45] hover:text-[#302d28]">RevScale Systems</Link>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Privacidad · versión 2026-09-01</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Derechos y eliminación de datos</h1>
          <p className="mt-4 text-sm leading-6 text-[#6d665d]">Última actualización: {updatedAt}</p>
        </header>

        <div className="mt-8 space-y-8 text-[15px] leading-7 text-[#554f47]">
          <Section title="Cómo presentar una solicitud"><p>Para solicitar acceso, rectificación, actualización, eliminación o retiro de un consentimiento relacionado con datos personales tratados mediante RevScale, enviá un correo a <a href="mailto:rominamendez456@gmail.com" className="font-semibold text-[#6d5c45] underline underline-offset-4">rominamendez456@gmail.com</a> con el asunto <strong>Solicitud de privacidad</strong>.</p><p className="mt-3">Incluí únicamente la información necesaria para localizar los datos, por ejemplo nombre, teléfono o correo utilizado con la inmobiliaria o cuenta correspondiente. No envíes contraseñas, tokens ni documentación innecesariamente sensible.</p></Section>
          <Section title="Datos gestionados por una inmobiliaria"><p>Cuando tus datos forman parte de los leads o clientes de una organización que utiliza PropertyOS, esa organización determina normalmente los fines comerciales principales y RevScale actúa como proveedor tecnológico. Podemos remitir o coordinar la solicitud con esa organización para que sea atendida correctamente.</p></Section>
          <Section title="WhatsApp y retiro de consentimiento"><p>Si contactaste por WhatsApp, indicá el número desde el que escribiste y, si lo conocés, el nombre de la inmobiliaria. Si querés dejar de recibir comunicaciones iniciadas por la empresa, podés indicarlo expresamente en la conversación o mediante una solicitud de privacidad. Registraremos la revocación cuando el flujo correspondiente esté gestionado por RevScale.</p></Section>
          <Section title="Verificación de identidad"><p>Podemos pedir información razonable para confirmar que la solicitud corresponde a la persona afectada o a un representante autorizado. El objetivo es evitar que terceros accedan, modifiquen o eliminen información de otra persona.</p></Section>
          <Section title="Qué puede comprender la eliminación"><p>Según el caso, puede comprender datos de perfil y contacto, leads, consultas, conversaciones, mensajes, interacciones comerciales y otros registros directamente vinculados a la persona. La eliminación de una cuenta empresarial completa puede requerir un proceso distinto por afectar datos de múltiples usuarios y obligaciones de facturación.</p></Section>
          <Section title="Excepciones y conservación limitada"><p>Determinada información puede conservarse cuando resulte necesaria para seguridad, prevención de fraude, facturación, resolución de disputas, cumplimiento de obligaciones, defensa de derechos o ciclos técnicos de respaldo. Cuando no sea necesario conservar identificación directa, procuraremos eliminarla o anonimizarla.</p></Section>
          <Section title="Respuesta"><p>Confirmaremos la recepción y tramitaremos la solicitud dentro del plazo que corresponda conforme a la normativa aplicable, considerando la verificación de identidad y la complejidad del caso.</p></Section>
          <Section title="Más información"><p>Consultá nuestra <Link href="/privacy" className="font-semibold text-[#6d5c45] underline underline-offset-4">Política de privacidad</Link> para conocer roles, finalidades, proveedores, transferencias y conservación.</p></Section>
        </div>

        <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#ddd1c1] pt-6 text-sm text-[#6d665d]">
          <Link href="/privacy" className="hover:text-[#302d28]">Política de privacidad</Link>
          <Link href="/cookies" className="hover:text-[#302d28]">Política de cookies</Link>
          <Link href="/terms" className="hover:text-[#302d28]">Condiciones del servicio</Link>
          <Link href="/" className="hover:text-[#302d28]">Volver a RevScale</Link>
        </footer>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-serif text-2xl font-medium text-[#37322b]">{title}</h2><div className="mt-3">{children}</div></section>;
}
